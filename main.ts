import { App, Plugin, Notice, TFile } from "obsidian";
import { TeleporterSettings, VaultConfig, DEFAULT_SETTINGS } from "./src/types";
import { VaultManager } from "./src/VaultManager";
import { TeleporterSettingTab } from "./src/settings/SettingsTab";
import { FileMover, MoveOptions } from "./src/FileMover";
import { VaultSelectorModal } from "./src/modals/VaultSelectorModal";
import { FolderSelectorModal } from "./src/modals/FolderSelectorModal";

export default class TeleporterPlugin extends Plugin {
	settings: TeleporterSettings;
	vaultManager: VaultManager;
	fileMover: FileMover;

	async onload() {
		console.log("Loading Teleporter plugin");

		// Initialize vault manager
		this.vaultManager = new VaultManager();

		// Initialize file mover
		this.fileMover = new FileMover(this.vaultManager);

		// Load settings
		await this.loadSettings();

		// Load vaults into manager
		this.vaultManager.loadVaults(this.settings.vaults);

		// Register the main teleport command
		this.addCommand({
			id: "teleport-current-file",
			name: "Teleport current file to another vault",
			callback: () => {
				this.teleportCurrentFile();
			},
		});

		// Register command to open settings
		this.addCommand({
			id: "open-teleporter-settings",
			name: "Open Teleporter settings",
			callback: () => {
				// @ts-ignore - Obsidian's internal API
				this.app.setting.open();
				// @ts-ignore - Obsidian's internal API
				this.app.setting.openTabById(this.manifest.id);
			},
		});

		// Add ribbon icon
		const ribbonIconEl = this.addRibbonIcon(
			"send",
			"Teleport current file",
			(evt: MouseEvent) => {
				this.teleportCurrentFile();
			},
		);
		ribbonIconEl.addClass("teleporter-ribbon-icon");

		// Add settings tab
		this.addSettingTab(new TeleporterSettingTab(this.app, this, this.vaultManager));

		// Validate vaults on startup
		this.validateVaultsOnStartup();

		// Clean up old backups on startup
		setTimeout(() => {
			this.fileMover.cleanupOldBackups();
		}, 5000);

		console.log("Teleporter plugin loaded");
	}

	onunload() {
		console.log("Unloading Teleporter plugin");
		// Clean up any remaining backups
		this.fileMover.cleanupOldBackups();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Ensure all settings have default values
		if (!this.settings.vaults) {
			this.settings.vaults = [];
		}
		if (!this.settings.recentDestinations) {
			this.settings.recentDestinations = [];
		}

		if (this.settings.deleteOriginalAfterMove === undefined) {
			this.settings.deleteOriginalAfterMove = DEFAULT_SETTINGS.deleteOriginalAfterMove;
		}
		if (this.settings.preserveFileHistory === undefined) {
			this.settings.preserveFileHistory = DEFAULT_SETTINGS.preserveFileHistory;
		}
		if (this.settings.showConfirmation === undefined) {
			this.settings.showConfirmation = DEFAULT_SETTINGS.showConfirmation;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Validate all configured vaults on plugin startup
	 */
	private async validateVaultsOnStartup() {
		if (this.settings.vaults.length === 0) {
			return;
		}

		// Run validation in the background
		setTimeout(async () => {
			let invalidCount = 0;
			for (const vault of this.settings.vaults) {
				const validation = await this.vaultManager.validateVault(vault.path);
				if (!validation.isValid && vault.isValid) {
					vault.isValid = false;
					invalidCount++;
				} else if (validation.isValid && !vault.isValid) {
					vault.isValid = true;
				}
			}

			if (invalidCount > 0) {
				await this.saveSettings();
				new Notice(`${invalidCount} vault(s) are no longer accessible`);
			}
		}, 1000);
	}

	/**
	 * Main teleport functionality
	 */
	async teleportCurrentFile() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice("No active file to teleport");
			return;
		}

		// Check if we have configured vaults
		const validVaults = this.settings.vaults.filter((v) => v.isValid);
		if (validVaults.length === 0) {
			if (this.settings.vaults.length === 0) {
				new Notice("No vaults configured. Please configure vaults in settings.");
				// Open settings
				// @ts-ignore - Obsidian's internal API
				this.app.setting.open();
				// @ts-ignore - Obsidian's internal API
				this.app.setting.openTabById(this.manifest.id);
			} else {
				new Notice("No valid vaults available. Please check vault configuration.");
			}
			return;
		}

		// If only one vault is configured, warn the user
		if (validVaults.length === 1) {
			const currentVaultPath = (this.app.vault.adapter as any).basePath;
			if (validVaults[0].path === currentVaultPath) {
				new Notice(
					"The only configured vault is the current vault. Please add another vault.",
				);
				return;
			}
		}

		// Show vault selector modal
		new VaultSelectorModal(
			this.app,
			this,
			this.vaultManager,
			validVaults,
			this.getCurrentVaultPath(),
			async (selectedVault: VaultConfig) => {
				// Update last used vault
				this.settings.lastUsedVaultId = selectedVault.id;
				await this.saveSettings();

				// Show folder selector modal
				new FolderSelectorModal(
					this.app,
					this,
					this.vaultManager,
					selectedVault,
					async (selectedFolder: string) => {
						// Perform the file move
						await this.performFileMove(activeFile, selectedVault, selectedFolder);
					},
				).open();
			},
		).open();
	}

	/**
	 * Get the current vault's path
	 */
	getCurrentVaultPath(): string {
		// @ts-ignore - Accessing Obsidian's internal API
		return this.app.vault.adapter.basePath || "";
	}

	/**
	 * Check if a vault is the current vault
	 */
	isCurrentVault(vault: VaultConfig): boolean {
		const currentPath = this.getCurrentVaultPath();
		return vault.path === currentPath;
	}

	/**
	 * Get recent destination folders for a vault
	 */
	getRecentDestinations(vaultId: string): string[] {
		if (!this.settings.recentDestinations) {
			return [];
		}

		return this.settings.recentDestinations
			.filter((d) => d.vaultId === vaultId)
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 5)
			.map((d) => d.path);
	}

	/**
	 * Add a recent destination
	 */
	async addRecentDestination(vaultId: string, path: string) {
		if (!this.settings.recentDestinations) {
			this.settings.recentDestinations = [];
		}

		// Remove any existing entry for this vault/path combination
		this.settings.recentDestinations = this.settings.recentDestinations.filter(
			(d) => !(d.vaultId === vaultId && d.path === path),
		);

		// Add the new entry
		this.settings.recentDestinations.push({
			vaultId,
			path,
			timestamp: Date.now(),
		});

		// Keep only the last 20 entries total
		if (this.settings.recentDestinations.length > 20) {
			this.settings.recentDestinations = this.settings.recentDestinations
				.sort((a, b) => b.timestamp - a.timestamp)
				.slice(0, 20);
		}

		await this.saveSettings();
	}

	/**
	 * Get statistics about teleporter usage
	 */
	getStatistics() {
		return {
			totalVaults: this.settings.vaults.length,
			validVaults: this.settings.vaults.filter((v) => v.isValid).length,
			recentDestinations: this.settings.recentDestinations?.length || 0,
			lastUsedVault: this.settings.lastUsedVaultId
				? this.vaultManager.getVault(this.settings.lastUsedVaultId)?.name
				: null,
		};
	}

	/**
	 * Perform the actual file move operation
	 */
	private async performFileMove(
		file: TFile,
		targetVault: VaultConfig,
		targetFolder: string,
	): Promise<void> {
		// Check if operation is already in progress for this file
		if (this.fileMover.isOperationActive(file.path)) {
			new Notice("A move operation is already in progress for this file");
			return;
		}

		// Show confirmation if enabled
		if (this.settings.showConfirmation) {
			const confirmMessage = this.settings.deleteOriginalAfterMove
				? `Move "${file.name}" to ${targetVault.name}?\n\nThe original file will be deleted.`
				: `Copy "${file.name}" to ${targetVault.name}?\n\nThe original file will be kept.`;

			if (!confirm(confirmMessage)) {
				return;
			}
		}

		// Prepare move options
		const moveOptions: MoveOptions = {
			deleteOriginal: this.settings.deleteOriginalAfterMove,
			preserveMetadata: this.settings.preserveFileHistory,
			showProgress: true,
			conflictStrategy: "rename", // Default to rename for now
		};

		// Show progress notice
		const progressNotice = new Notice("", 0);

		try {
			const result = await this.fileMover.moveFile(
				file,
				this.getCurrentVaultPath(),
				targetVault,
				targetFolder,
				moveOptions,
				(progress) => {
					progressNotice.setMessage(progress.message);
				},
			);

			// Hide progress notice
			progressNotice.hide();

			if (result.success) {
				const action = this.settings.deleteOriginalAfterMove ? "moved" : "copied";
				new Notice(`Successfully ${action} "${file.name}" to ${targetVault.name}`, 5000);

				// If we deleted the original, close the file in the editor
				if (this.settings.deleteOriginalAfterMove) {
					const leaves = this.app.workspace.getLeavesOfType("markdown");
					for (const leaf of leaves) {
						const view = leaf.view as any;
						if (view.file?.path === file.path) {
							leaf.detach();
						}
					}
				}
			} else {
				new Notice(`Failed to move file: ${result.error}`, 5000);
			}
		} catch (error) {
			progressNotice.hide();
			console.error("File move error:", error);
			new Notice(`Error moving file: ${error.message}`, 5000);
		}
	}
}
