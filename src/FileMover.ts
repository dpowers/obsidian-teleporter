import { TFile, Notice, normalizePath, TAbstractFile } from "obsidian";
import { VaultConfig, MoveOperation, FileSystemStats } from "./types";
import { VaultManager } from "./VaultManager";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface MoveOptions {
	deleteOriginal: boolean;
	preserveMetadata: boolean;
	showProgress: boolean;
	conflictStrategy: "skip" | "overwrite" | "rename" | "ask";
}

export interface MoveResult {
	success: boolean;
	newPath?: string;
	error?: string;
	backupPath?: string;
	duration?: number;
}

export interface MoveProgress {
	stage: "preparing" | "reading" | "writing" | "verifying" | "cleaning" | "complete";
	percentage: number;
	message: string;
}

export class FileMover {
	private vaultManager: VaultManager;
	private activeOperations: Map<string, MoveOperation>;
	private tempDir: string;

	constructor(vaultManager: VaultManager) {
		this.vaultManager = vaultManager;
		this.activeOperations = new Map();
		this.tempDir = this.getTempDirectory();
	}

	/**
	 * Move a file from the current vault to a target vault
	 */
	async moveFile(
		file: TFile,
		sourceVaultPath: string,
		targetVault: VaultConfig,
		targetFolderPath: string,
		options: MoveOptions,
		onProgress?: (progress: MoveProgress) => void,
	): Promise<MoveResult> {
		const startTime = Date.now();
		const operationId = this.generateOperationId();

		// Create move operation record
		const operation: MoveOperation = {
			sourceFile: file,
			sourceVault: sourceVaultPath,
			targetVault: targetVault,
			targetPath: targetFolderPath,
			timestamp: Date.now(),
			status: "pending",
		};

		this.activeOperations.set(operationId, operation);

		try {
			// Stage 1: Preparing
			this.reportProgress(onProgress, "preparing", 0, "Preparing file move...");

			// Build full paths
			const sourcePath = path.join(sourceVaultPath, file.path);
			const targetFileName = path.basename(file.path);
			let targetRelativePath = normalizePath(path.join(targetFolderPath, targetFileName));

			// Handle conflicts
			if (this.vaultManager.fileExists(targetVault, targetRelativePath)) {
				const resolvedPath = await this.handleConflict(
					targetVault,
					targetRelativePath,
					options.conflictStrategy,
				);

				if (!resolvedPath) {
					throw new Error("File move cancelled due to conflict");
				}
				targetRelativePath = resolvedPath;
			}

			const targetFullPath = path.join(targetVault.path, targetRelativePath);

			// Stage 2: Reading source file
			this.reportProgress(onProgress, "reading", 20, "Reading source file...");

			const fileContent = await this.readFileContent(sourcePath);
			const fileStats = await this.getFileStats(sourcePath);

			// Create backup if we're deleting the original
			let backupPath: string | undefined;
			if (options.deleteOriginal) {
				backupPath = await this.createBackup(sourcePath, operationId);
				this.reportProgress(onProgress, "reading", 30, "Created backup...");
			}

			// Stage 3: Writing to target
			this.reportProgress(onProgress, "writing", 40, "Writing to target vault...");

			// Ensure target directory exists
			const targetDir = path.dirname(targetFullPath);
			await this.ensureDirectory(targetDir);

			// Write the file
			await this.writeFileContent(targetFullPath, fileContent);
			this.reportProgress(onProgress, "writing", 60, "File written successfully...");

			// Preserve metadata if requested
			if (options.preserveMetadata && fileStats) {
				await this.preserveFileMetadata(targetFullPath, fileStats);
				this.reportProgress(onProgress, "writing", 70, "Metadata preserved...");
			}

			// Stage 4: Verifying
			this.reportProgress(onProgress, "verifying", 80, "Verifying file integrity...");

			// Verify the file was written correctly
			const verified = await this.verifyFileCopy(sourcePath, targetFullPath);
			if (!verified) {
				throw new Error("File verification failed - content mismatch");
			}

			// Stage 5: Cleaning up
			if (options.deleteOriginal) {
				this.reportProgress(onProgress, "cleaning", 90, "Removing original file...");
				await this.deleteFile(sourcePath);

				// Clean up backup after successful deletion
				if (backupPath) {
					await this.deleteFile(backupPath);
				}
			}

			// Stage 6: Complete
			this.reportProgress(onProgress, "complete", 100, "File move completed!");

			// Update operation status
			operation.status = "success";

			return {
				success: true,
				newPath: targetRelativePath,
				duration: Date.now() - startTime,
			};
		} catch (error) {
			// Update operation status
			operation.status = "failed";
			operation.error = error.message;

			// Attempt rollback
			await this.rollback(operationId, operation);

			return {
				success: false,
				error: error.message,
				duration: Date.now() - startTime,
			};
		} finally {
			// Clean up operation record
			this.activeOperations.delete(operationId);
		}
	}

	/**
	 * Move multiple files in batch
	 */
	async moveFiles(
		files: TFile[],
		sourceVaultPath: string,
		targetVault: VaultConfig,
		targetFolderPath: string,
		options: MoveOptions,
		onProgress?: (current: number, total: number, currentFile: string) => void,
	): Promise<Map<string, MoveResult>> {
		const results = new Map<string, MoveResult>();

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			if (onProgress) {
				onProgress(i + 1, files.length, file.name);
			}

			const result = await this.moveFile(
				file,
				sourceVaultPath,
				targetVault,
				targetFolderPath,
				options,
			);

			results.set(file.path, result);

			// Stop on error if not in batch mode
			if (!result.success && options.conflictStrategy === "ask") {
				break;
			}
		}

		return results;
	}

	/**
	 * Handle file conflicts based on strategy
	 */
	private async handleConflict(
		targetVault: VaultConfig,
		targetPath: string,
		strategy: "skip" | "overwrite" | "rename" | "ask",
	): Promise<string | null> {
		switch (strategy) {
			case "skip":
				return null;

			case "overwrite":
				return targetPath;

			case "rename":
				return this.vaultManager.getAvailableFilename(targetVault, targetPath);

			case "ask":
				// This would need to be handled by the UI layer
				// For now, default to rename
				return this.vaultManager.getAvailableFilename(targetVault, targetPath);

			default:
				return null;
		}
	}

	/**
	 * Read file content as buffer
	 */
	private async readFileContent(filePath: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			fs.readFile(filePath, (err, data) => {
				if (err) {
					reject(new Error(`Failed to read file: ${err.message}`));
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * Write file content from buffer
	 */
	private async writeFileContent(filePath: string, content: Buffer): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.writeFile(filePath, content, (err) => {
				if (err) {
					reject(new Error(`Failed to write file: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Get file statistics
	 */
	private async getFileStats(filePath: string): Promise<FileSystemStats | null> {
		return new Promise((resolve) => {
			fs.stat(filePath, (err, stats) => {
				if (err) {
					resolve(null);
				} else {
					resolve({
						created: stats.birthtime,
						modified: stats.mtime,
						size: stats.size,
					});
				}
			});
		});
	}

	/**
	 * Preserve file metadata (timestamps)
	 */
	private async preserveFileMetadata(filePath: string, stats: FileSystemStats): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.utimes(filePath, stats.created, stats.modified, (err) => {
				if (err) {
					// Non-critical error, just log it
					console.warn(`Could not preserve file metadata: ${err.message}`);
				}
				resolve();
			});
		});
	}

	/**
	 * Verify file copy by comparing checksums
	 */
	private async verifyFileCopy(sourcePath: string, targetPath: string): Promise<boolean> {
		try {
			const sourceHash = await this.calculateFileHash(sourcePath);
			const targetHash = await this.calculateFileHash(targetPath);
			return sourceHash === targetHash;
		} catch (error) {
			console.error("File verification failed:", error);
			return false;
		}
	}

	/**
	 * Calculate file hash for verification
	 */
	private async calculateFileHash(filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const hash = crypto.createHash("sha256");
			const stream = fs.createReadStream(filePath);

			stream.on("error", reject);
			stream.on("data", (chunk) => hash.update(chunk));
			stream.on("end", () => resolve(hash.digest("hex")));
		});
	}

	/**
	 * Create a backup of the source file
	 */
	private async createBackup(filePath: string, operationId: string): Promise<string> {
		const backupPath = path.join(
			this.tempDir,
			`teleporter_backup_${operationId}${path.extname(filePath)}`,
		);

		return new Promise((resolve, reject) => {
			fs.copyFile(filePath, backupPath, (err) => {
				if (err) {
					reject(new Error(`Failed to create backup: ${err.message}`));
				} else {
					resolve(backupPath);
				}
			});
		});
	}

	/**
	 * Delete a file
	 */
	private async deleteFile(filePath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.unlink(filePath, (err) => {
				if (err && err.code !== "ENOENT") {
					reject(new Error(`Failed to delete file: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Ensure directory exists, create if it doesn't
	 */
	private async ensureDirectory(dirPath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.mkdir(dirPath, { recursive: true }, (err) => {
				if (err) {
					reject(new Error(`Failed to create directory: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Rollback a failed operation
	 */
	private async rollback(operationId: string, operation: MoveOperation): Promise<void> {
		try {
			// If we created a new file in the target, try to remove it
			if (operation.targetPath && operation.targetVault) {
				const targetFullPath = path.join(operation.targetVault.path, operation.targetPath);
				if (fs.existsSync(targetFullPath)) {
					await this.deleteFile(targetFullPath);
				}
			}

			// If we have a backup and deleted the original, restore it
			const backupPath = path.join(
				this.tempDir,
				`teleporter_backup_${operationId}${path.extname(operation.sourceFile.path)}`,
			);
			if (fs.existsSync(backupPath)) {
				const sourcePath = path.join(operation.sourceVault, operation.sourceFile.path);
				if (!fs.existsSync(sourcePath)) {
					await new Promise((resolve, reject) => {
						fs.copyFile(backupPath, sourcePath, (err) => {
							if (err) reject(err);
							else resolve(undefined);
						});
					});
				}
				// Clean up backup
				await this.deleteFile(backupPath);
			}
		} catch (error) {
			console.error("Rollback failed:", error);
			// Don't throw, as we're already in error handling
		}
	}

	/**
	 * Report progress to callback
	 */
	private reportProgress(
		callback: ((progress: MoveProgress) => void) | undefined,
		stage: MoveProgress["stage"],
		percentage: number,
		message: string,
	): void {
		if (callback) {
			callback({ stage, percentage, message });
		}
	}

	/**
	 * Generate unique operation ID
	 */
	private generateOperationId(): string {
		return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get temporary directory for backups
	 */
	private getTempDirectory(): string {
		const os = require("os");
		const tempDir = path.join(os.tmpdir(), "obsidian-teleporter");

		// Ensure temp directory exists
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		return tempDir;
	}

	/**
	 * Clean up old backup files
	 */
	async cleanupOldBackups(): Promise<void> {
		try {
			const files = fs.readdirSync(this.tempDir);
			const now = Date.now();
			const maxAge = 24 * 60 * 60 * 1000; // 24 hours

			for (const file of files) {
				if (file.startsWith("teleporter_backup_")) {
					const filePath = path.join(this.tempDir, file);
					const stats = fs.statSync(filePath);

					if (now - stats.mtime.getTime() > maxAge) {
						await this.deleteFile(filePath);
					}
				}
			}
		} catch (error) {
			console.error("Failed to clean up old backups:", error);
		}
	}

	/**
	 * Check if a move operation is in progress
	 */
	isOperationActive(filePath: string): boolean {
		for (const operation of this.activeOperations.values()) {
			if (operation.sourceFile.path === filePath) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Cancel an active operation
	 */
	cancelOperation(filePath: string): boolean {
		for (const [id, operation] of this.activeOperations.entries()) {
			if (operation.sourceFile.path === filePath) {
				operation.status = "failed";
				operation.error = "Operation cancelled by user";
				this.activeOperations.delete(id);
				return true;
			}
		}
		return false;
	}

	/**
	 * Get statistics about move operations
	 */
	getStatistics(): { active: number; completed: number; failed: number } {
		const active = this.activeOperations.size;
		let completed = 0;
		let failed = 0;

		for (const operation of this.activeOperations.values()) {
			if (operation.status === "success") completed++;
			if (operation.status === "failed") failed++;
		}

		return { active, completed, failed };
	}
}
