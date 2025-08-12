import { Notice } from "obsidian";
import { VaultConfig, VaultValidationResult } from "./types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export class VaultManager {
	private vaultCache: Map<string, VaultConfig>;
	private commonVaultPaths: string[];

	constructor() {
		this.vaultCache = new Map();
		this.commonVaultPaths = this.getCommonVaultPaths();
	}

	/**
	 * Generate a unique ID for a vault
	 */
	generateVaultId(): string {
		return `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get common vault paths based on the operating system
	 */
	private getCommonVaultPaths(): string[] {
		const homedir = os.homedir();
		const paths: string[] = [];

		// Common Obsidian vault locations
		if (process.platform === "win32") {
			paths.push(
				path.join(homedir, "Documents", "Obsidian"),
				path.join(homedir, "Documents", "Obsidian Vaults"),
				path.join(homedir, "OneDrive", "Documents", "Obsidian"),
				path.join(homedir, "Obsidian"),
				"C:\\Obsidian",
				"D:\\Obsidian",
			);
		} else if (process.platform === "darwin") {
			paths.push(
				path.join(homedir, "Documents", "Obsidian"),
				path.join(homedir, "Documents", "Obsidian Vaults"),
				path.join(
					homedir,
					"Library",
					"Mobile Documents",
					"iCloud~md~obsidian",
					"Documents",
				),
				path.join(homedir, "Obsidian"),
				path.join(homedir, "iCloud Drive", "Obsidian"),
			);
		} else {
			// Linux
			paths.push(
				path.join(homedir, "Documents", "Obsidian"),
				path.join(homedir, "Documents", "Obsidian Vaults"),
				path.join(homedir, "Obsidian"),
				path.join(homedir, ".obsidian"),
			);
		}

		return paths;
	}

	/**
	 * Validate if a path is an Obsidian vault
	 */
	async validateVault(vaultPath: string): Promise<VaultValidationResult> {
		const result: VaultValidationResult = {
			isValid: false,
			hasConfigFile: false,
			hasPluginsFolder: false,
			hasDataFile: false,
		};

		try {
			// Check if path exists
			if (!fs.existsSync(vaultPath)) {
				result.error = "Path does not exist";
				return result;
			}

			// Check if it's a directory
			const stats = fs.statSync(vaultPath);
			if (!stats.isDirectory()) {
				result.error = "Path is not a directory";
				return result;
			}

			// Check for .obsidian folder
			const obsidianPath = path.join(vaultPath, ".obsidian");
			if (fs.existsSync(obsidianPath)) {
				result.hasConfigFile = true;

				// Check for plugins folder
				const pluginsPath = path.join(obsidianPath, "plugins");
				if (fs.existsSync(pluginsPath)) {
					result.hasPluginsFolder = true;
				}

				// Check for app.json or workspace.json (common Obsidian files)
				const appJsonPath = path.join(obsidianPath, "app.json");
				const workspacePath = path.join(obsidianPath, "workspace.json");
				if (fs.existsSync(appJsonPath) || fs.existsSync(workspacePath)) {
					result.hasDataFile = true;
				}
			}

			// A vault is valid if it has the .obsidian folder
			// Even new vaults might not have all files yet
			result.isValid = result.hasConfigFile;

			if (!result.isValid && !result.error) {
				result.error = "No .obsidian folder found. This might not be an Obsidian vault.";
			}
		} catch (error) {
			result.error = `Error validating vault: ${error.message}`;
		}

		return result;
	}

	/**
	 * Discover Obsidian vaults on the system
	 */
	async discoverVaults(): Promise<VaultConfig[]> {
		const discoveredVaults: VaultConfig[] = [];
		const processedPaths = new Set<string>();

		for (const basePath of this.commonVaultPaths) {
			if (!fs.existsSync(basePath)) {
				continue;
			}

			try {
				// Check if the base path itself is a vault
				const baseValidation = await this.validateVault(basePath);
				if (baseValidation.isValid && !processedPaths.has(basePath)) {
					processedPaths.add(basePath);
					discoveredVaults.push(this.createVaultConfig(basePath));
				}

				// Check subdirectories (one level deep)
				const entries = fs.readdirSync(basePath, { withFileTypes: true });
				for (const entry of entries) {
					if (entry.isDirectory() && !entry.name.startsWith(".")) {
						const vaultPath = path.join(basePath, entry.name);
						if (processedPaths.has(vaultPath)) {
							continue;
						}

						const validation = await this.validateVault(vaultPath);
						if (validation.isValid) {
							processedPaths.add(vaultPath);
							discoveredVaults.push(this.createVaultConfig(vaultPath));
						}
					}
				}
			} catch (error) {
				// Silently skip paths we can't read
				console.error(`Error scanning ${basePath}:`, error);
			}
		}

		return discoveredVaults;
	}

	/**
	 * Create a VaultConfig from a path
	 */
	private createVaultConfig(vaultPath: string): VaultConfig {
		const vaultName = path.basename(vaultPath);
		return {
			id: this.generateVaultId(),
			name: vaultName,
			path: vaultPath,
			isValid: true,
			lastAccessed: Date.now(),
		};
	}

	/**
	 * Add a vault manually by path
	 */
	async addVault(vaultPath: string, customName?: string): Promise<VaultConfig | null> {
		// Normalize the path
		const normalizedPath = path.resolve(vaultPath);

		// Validate the vault
		const validation = await this.validateVault(normalizedPath);
		if (!validation.isValid) {
			new Notice(`Invalid vault: ${validation.error || "Unknown error"}`);
			return null;
		}

		// Create vault config
		const vaultConfig: VaultConfig = {
			id: this.generateVaultId(),
			name: customName || path.basename(normalizedPath),
			path: normalizedPath,
			isValid: true,
			lastAccessed: Date.now(),
		};

		// Add to cache
		this.vaultCache.set(vaultConfig.id, vaultConfig);

		return vaultConfig;
	}

	/**
	 * Update vault configuration
	 */
	updateVault(vaultId: string, updates: Partial<VaultConfig>): VaultConfig | null {
		const vault = this.vaultCache.get(vaultId);
		if (!vault) {
			return null;
		}

		const updatedVault = {
			...vault,
			...updates,
			id: vault.id, // Ensure ID cannot be changed
		};

		this.vaultCache.set(vaultId, updatedVault);
		return updatedVault;
	}

	/**
	 * Remove a vault from configuration
	 */
	removeVault(vaultId: string): boolean {
		return this.vaultCache.delete(vaultId);
	}

	/**
	 * Get all configured vaults
	 */
	getAllVaults(): VaultConfig[] {
		return Array.from(this.vaultCache.values());
	}

	/**
	 * Get a specific vault by ID
	 */
	getVault(vaultId: string): VaultConfig | undefined {
		return this.vaultCache.get(vaultId);
	}

	/**
	 * Load vaults into cache
	 */
	loadVaults(vaults: VaultConfig[]): void {
		this.vaultCache.clear();
		for (const vault of vaults) {
			this.vaultCache.set(vault.id, vault);
		}
	}

	/**
	 * Validate all cached vaults and update their status
	 */
	async revalidateAllVaults(): Promise<void> {
		for (const vault of this.vaultCache.values()) {
			const validation = await this.validateVault(vault.path);
			vault.isValid = validation.isValid;
		}
	}

	/**
	 * Get the path to a file within a vault
	 */
	getFilePath(vault: VaultConfig, relativePath: string): string {
		return path.join(vault.path, relativePath);
	}

	/**
	 * Check if a file exists in a vault
	 */
	fileExists(vault: VaultConfig, relativePath: string): boolean {
		const fullPath = this.getFilePath(vault, relativePath);
		return fs.existsSync(fullPath);
	}

	/**
	 * Get folder structure of a vault
	 */
	async getVaultFolders(vault: VaultConfig): Promise<string[]> {
		const folders: string[] = ["/"];

		const scanDirectory = (dirPath: string, relativePath: string = "") => {
			try {
				const entries = fs.readdirSync(dirPath, { withFileTypes: true });

				for (const entry of entries) {
					if (entry.isDirectory() && !entry.name.startsWith(".")) {
						const folderRelativePath = relativePath
							? `${relativePath}/${entry.name}`
							: entry.name;
						folders.push(`/${folderRelativePath}`);

						// Recursively scan subdirectories
						scanDirectory(path.join(dirPath, entry.name), folderRelativePath);
					}
				}
			} catch (error) {
				console.error(`Error scanning directory ${dirPath}:`, error);
			}
		};

		scanDirectory(vault.path);
		return folders.sort();
	}

	/**
	 * Get available filename if file already exists
	 */
	getAvailableFilename(vault: VaultConfig, filePath: string): string {
		if (!this.fileExists(vault, filePath)) {
			return filePath;
		}

		const dir = path.dirname(filePath);
		const ext = path.extname(filePath);
		const baseName = path.basename(filePath, ext);

		let counter = 1;
		let newPath = filePath;

		while (this.fileExists(vault, newPath)) {
			const newName = `${baseName} ${counter}${ext}`;
			newPath = path.join(dir, newName);
			counter++;
		}

		return newPath;
	}

	/**
	 * Ensure directory exists, create if it doesn't
	 */
	async ensureDirectory(dirPath: string): Promise<void> {
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
}
