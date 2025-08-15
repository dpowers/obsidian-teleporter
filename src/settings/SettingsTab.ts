import {
	App,
	PluginSettingTab,
	Setting,
	Notice,
	ButtonComponent,
	ExtraButtonComponent,
} from "obsidian";
import TeleporterPlugin from "../../main";
import { VaultConfig, VAULT_COLORS } from "../types";
import { AddVaultModal } from "../modals/AddVaultModal";
import { VaultManager } from "../VaultManager";

export class TeleporterSettingTab extends PluginSettingTab {
	plugin: TeleporterPlugin;
	vaultManager: VaultManager;
	private vaultListContainer: HTMLElement;

	constructor(app: App, plugin: TeleporterPlugin, vaultManager: VaultManager) {
		super(app, plugin);
		this.plugin = plugin;
		this.vaultManager = vaultManager;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl("h2", { text: "Teleporter Settings" });

		// Quick Actions Section
		this.createQuickActionsSection(containerEl);

		// Hotkey reminder
		const hotkeyInfo = containerEl.createDiv("hotkey-info");
		hotkeyInfo.style.padding = "10px";
		hotkeyInfo.style.marginBottom = "15px";
		hotkeyInfo.style.borderRadius = "5px";
		hotkeyInfo.style.backgroundColor = "var(--background-secondary-alt)";
		hotkeyInfo.style.fontSize = "0.9em";

		const hotkeyText = hotkeyInfo.createDiv();
		hotkeyText.innerHTML = `<strong>Tip:</strong> Set a hotkey for "Teleport current file" in Settings → Hotkeys`;

		// Check if a hotkey is configured
		// @ts-ignore - Obsidian's internal API
		const customKeys = this.app.hotkeyManager.customKeys;
		const teleportCommand = "obsidian-teleporter:teleport-current-file";
		if (customKeys && customKeys[teleportCommand]) {
			const hotkeys = customKeys[teleportCommand];
			if (hotkeys && hotkeys.length > 0) {
				const key = hotkeys[0];
				const modifiers = key.modifiers.join("+");
				const keyCombo = modifiers ? `${modifiers}+${key.key}` : key.key;
				hotkeyText.innerHTML = `<strong>Current hotkey:</strong> <kbd>${keyCombo}</kbd> • Change in Settings → Hotkeys`;
			}
		}

		// Vault Configuration Section
		containerEl.createEl("h3", { text: "Configured Vaults" });

		// Vault management buttons
		const vaultButtonContainer = containerEl.createDiv("vault-button-container");
		vaultButtonContainer.style.display = "flex";
		vaultButtonContainer.style.gap = "10px";
		vaultButtonContainer.style.marginBottom = "15px";

		new ButtonComponent(vaultButtonContainer)
			.setButtonText("Add Vault")
			.setCta()
			.onClick(() => {
				this.openAddVaultModal();
			});

		new ButtonComponent(vaultButtonContainer)
			.setButtonText("Discover Vaults")
			.onClick(async () => {
				await this.discoverVaults();
			});

		new ButtonComponent(vaultButtonContainer)
			.setButtonText("Validate All")
			.onClick(async () => {
				await this.validateAllVaults();
			});

		// Vault list container
		this.vaultListContainer = containerEl.createDiv("vault-list-container");
		this.displayVaultList();

		// File Operation Settings
		containerEl.createEl("h3", { text: "File Operations" });

		new Setting(containerEl)
			.setName("Delete original after move")
			.setDesc("Remove the file from the source vault after successful teleport")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.deleteOriginalAfterMove)
					.onChange(async (value) => {
						this.plugin.settings.deleteOriginalAfterMove = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Preserve file history")
			.setDesc("Maintain file creation and modification dates when moving files")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.preserveFileHistory)
					.onChange(async (value) => {
						this.plugin.settings.preserveFileHistory = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show confirmation dialog")
			.setDesc("Ask for confirmation before teleporting files")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showConfirmation).onChange(async (value) => {
					this.plugin.settings.showConfirmation = value;
					await this.plugin.saveSettings();
				}),
			);

		// Footer with plugin info
		this.createFooter(containerEl);
	}

	private createQuickActionsSection(containerEl: HTMLElement): void {
		const infoBox = containerEl.createDiv("teleporter-info-box");
		infoBox.style.padding = "10px";
		infoBox.style.marginBottom = "20px";
		infoBox.style.borderRadius = "5px";
		infoBox.style.backgroundColor = "var(--background-secondary)";

		const statsContainer = infoBox.createDiv();
		statsContainer.style.display = "flex";
		statsContainer.style.justifyContent = "space-between";
		statsContainer.style.marginBottom = "10px";

		// Vault count
		const vaultCount = this.plugin.settings.vaults.length;
		const validVaultCount = this.plugin.settings.vaults.filter((v) => v.isValid).length;

		statsContainer.createEl("span", {
			text: `Vaults: ${validVaultCount}/${vaultCount} valid`,
		});

		// Last used vault
		if (this.plugin.settings.lastUsedVaultId) {
			const lastVault = this.vaultManager.getVault(this.plugin.settings.lastUsedVaultId);
			if (lastVault) {
				statsContainer.createEl("span", {
					text: `Last used: ${lastVault.name}`,
				});
			}
		}
	}

	private displayVaultList(): void {
		this.vaultListContainer.empty();

		if (this.plugin.settings.vaults.length === 0) {
			const emptyMessage = this.vaultListContainer.createDiv("empty-vault-message");
			emptyMessage.style.padding = "20px";
			emptyMessage.style.textAlign = "center";
			emptyMessage.style.color = "var(--text-muted)";
			emptyMessage.innerHTML = `
				<div>No vaults configured yet.</div>
				<div style="margin-top: 10px;">Click "Add Vault" or "Discover Vaults" to get started.</div>
			`;
			return;
		}

		// Display each vault
		this.plugin.settings.vaults.forEach((vault, index) => {
			this.createVaultItem(vault, index);
		});
	}

	private createVaultItem(vault: VaultConfig, index: number): void {
		const vaultItem = this.vaultListContainer.createDiv("vault-item");
		vaultItem.style.padding = "10px";
		vaultItem.style.marginBottom = "10px";
		vaultItem.style.borderRadius = "5px";
		vaultItem.style.backgroundColor = "var(--background-secondary)";
		vaultItem.style.border = "1px solid var(--background-modifier-border)";

		// Vault header
		const vaultHeader = vaultItem.createDiv("vault-header");
		vaultHeader.style.display = "flex";
		vaultHeader.style.alignItems = "center";
		vaultHeader.style.justifyContent = "space-between";
		vaultHeader.style.marginBottom = "5px";

		// Left side: Color indicator and name
		const leftSide = vaultHeader.createDiv();
		leftSide.style.display = "flex";
		leftSide.style.alignItems = "center";
		leftSide.style.gap = "10px";

		// Color indicator
		const colorIndicator = leftSide.createDiv();
		colorIndicator.style.width = "12px";
		colorIndicator.style.height = "12px";
		colorIndicator.style.borderRadius = "50%";
		colorIndicator.style.backgroundColor = vault.color || VAULT_COLORS[0];

		// Vault name
		const vaultName = leftSide.createEl("strong", { text: vault.name });

		// Validity indicator
		if (!vault.isValid) {
			const invalidBadge = leftSide.createEl("span", { text: "⚠ Invalid" });
			invalidBadge.style.fontSize = "0.85em";
			invalidBadge.style.color = "var(--text-error)";
			invalidBadge.style.marginLeft = "5px";
		}

		// Right side: Action buttons
		const buttonContainer = vaultHeader.createDiv("vault-actions");
		buttonContainer.style.display = "flex";
		buttonContainer.style.gap = "5px";

		// Edit button
		new ExtraButtonComponent(buttonContainer)
			.setIcon("pencil")
			.setTooltip("Edit vault")
			.onClick(() => {
				this.openEditVaultModal(vault, index);
			});

		// Move up button (if not first)
		if (index > 0) {
			new ExtraButtonComponent(buttonContainer)
				.setIcon("arrow-up")
				.setTooltip("Move up")
				.onClick(async () => {
					const vaults = [...this.plugin.settings.vaults];
					[vaults[index - 1], vaults[index]] = [vaults[index], vaults[index - 1]];
					this.plugin.settings.vaults = vaults;
					await this.plugin.saveSettings();
					this.vaultManager.loadVaults(vaults);
					this.displayVaultList();
				});
		}

		// Move down button (if not last)
		if (index < this.plugin.settings.vaults.length - 1) {
			new ExtraButtonComponent(buttonContainer)
				.setIcon("arrow-down")
				.setTooltip("Move down")
				.onClick(async () => {
					const vaults = [...this.plugin.settings.vaults];
					[vaults[index], vaults[index + 1]] = [vaults[index + 1], vaults[index]];
					this.plugin.settings.vaults = vaults;
					await this.plugin.saveSettings();
					this.vaultManager.loadVaults(vaults);
					this.displayVaultList();
				});
		}

		// Remove button
		new ExtraButtonComponent(buttonContainer)
			.setIcon("trash")
			.setTooltip("Remove vault")
			.onClick(async () => {
				const confirm = await this.confirmRemoval(vault.name);
				if (confirm) {
					this.plugin.settings.vaults.splice(index, 1);
					await this.plugin.saveSettings();
					this.vaultManager.removeVault(vault.id);
					this.displayVaultList();
					new Notice(`Removed vault: ${vault.name}`);
				}
			});

		// Vault details
		const vaultDetails = vaultItem.createDiv("vault-details");
		vaultDetails.style.fontSize = "0.85em";
		vaultDetails.style.color = "var(--text-muted)";

		// Path
		const pathDiv = vaultDetails.createDiv();
		pathDiv.createEl("span", { text: "Path: " });
		const pathCode = pathDiv.createEl("code", { text: vault.path });
		pathCode.style.fontSize = "0.9em";

		// Description
		if (vault.description) {
			vaultDetails.createDiv({ text: `Description: ${vault.description}` });
		}

		// Last accessed
		if (vault.lastAccessed) {
			const lastAccessed = new Date(vault.lastAccessed).toLocaleDateString();
			vaultDetails.createDiv({ text: `Last accessed: ${lastAccessed}` });
		}
	}

	private async openAddVaultModal(): Promise<void> {
		new AddVaultModal(this.app, this.vaultManager, async (vault: VaultConfig) => {
			// Add the vault to settings
			this.plugin.settings.vaults.push(vault);
			await this.plugin.saveSettings();

			// Update vault manager
			this.vaultManager.loadVaults(this.plugin.settings.vaults);

			// Refresh display
			this.displayVaultList();

			new Notice(`Added vault: ${vault.name}`);
		}).open();
	}

	private async openEditVaultModal(vault: VaultConfig, index: number): Promise<void> {
		new AddVaultModal(
			this.app,
			this.vaultManager,
			async (updatedVault: VaultConfig) => {
				// Update the vault in settings
				this.plugin.settings.vaults[index] = updatedVault;
				await this.plugin.saveSettings();

				// Update vault manager
				this.vaultManager.loadVaults(this.plugin.settings.vaults);

				// Refresh display
				this.displayVaultList();

				new Notice(`Updated vault: ${updatedVault.name}`);
			},
			vault,
		).open();
	}

	private async discoverVaults(): Promise<void> {
		const notice = new Notice("Discovering vaults...", 0);

		try {
			const discoveredVaults = await this.vaultManager.discoverVaults();

			if (discoveredVaults.length === 0) {
				notice.setMessage("No vaults found in common locations");
				setTimeout(() => notice.hide(), 3000);
				return;
			}

			// Filter out already configured vaults
			const existingPaths = new Set(this.plugin.settings.vaults.map((v) => v.path));
			const newVaults = discoveredVaults.filter((v) => !existingPaths.has(v.path));

			if (newVaults.length === 0) {
				notice.setMessage("All discovered vaults are already configured");
				setTimeout(() => notice.hide(), 3000);
				return;
			}

			// Ask user which vaults to add
			notice.hide();

			// For now, add all new vaults automatically
			// TODO: Create a modal to let user select which vaults to add
			this.plugin.settings.vaults.push(...newVaults);
			await this.plugin.saveSettings();
			this.vaultManager.loadVaults(this.plugin.settings.vaults);
			this.displayVaultList();

			new Notice(`Added ${newVaults.length} vault(s)`);
		} catch (error) {
			notice.setMessage("Error discovering vaults");
			console.error("Vault discovery error:", error);
			setTimeout(() => notice.hide(), 3000);
		}
	}

	private async validateAllVaults(): Promise<void> {
		const notice = new Notice("Validating vaults...", 0);

		try {
			for (const vault of this.plugin.settings.vaults) {
				const validation = await this.vaultManager.validateVault(vault.path);
				vault.isValid = validation.isValid;
			}

			await this.plugin.saveSettings();
			this.displayVaultList();

			const validCount = this.plugin.settings.vaults.filter((v) => v.isValid).length;
			notice.setMessage(
				`Validation complete: ${validCount}/${this.plugin.settings.vaults.length} valid`,
			);
			setTimeout(() => notice.hide(), 3000);
		} catch (error) {
			notice.setMessage("Error validating vaults");
			console.error("Validation error:", error);
			setTimeout(() => notice.hide(), 3000);
		}
	}

	private async confirmRemoval(vaultName: string): Promise<boolean> {
		return confirm(
			`Are you sure you want to remove the vault "${vaultName}"?\n\nThis will only remove it from the Teleporter configuration. The vault itself will not be deleted.`,
		);
	}

	private createFooter(containerEl: HTMLElement): void {
		const footer = containerEl.createDiv("teleporter-footer");
		footer.style.marginTop = "40px";
		footer.style.paddingTop = "20px";
		footer.style.borderTop = "1px solid var(--background-modifier-border)";
		footer.style.fontSize = "0.85em";
		footer.style.color = "var(--text-muted)";
		footer.style.textAlign = "center";

		footer.createEl("div", { text: "Teleporter v0.1.0" });

		const links = footer.createDiv();
		links.style.marginTop = "5px";

		const githubLink = links.createEl("a", {
			text: "GitHub",
			href: "https://github.com/yourusername/obsidian-teleporter",
		});
		githubLink.style.marginRight = "10px";

		const docsLink = links.createEl("a", {
			text: "Documentation",
			href: "https://github.com/yourusername/obsidian-teleporter/wiki",
		});
	}
}
