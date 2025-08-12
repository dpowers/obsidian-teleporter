import { App, Modal, Setting, TextComponent, ButtonComponent, Notice } from "obsidian";
import { VaultConfig } from "../types";
import { VaultManager } from "../VaultManager";
import TeleporterPlugin from "../../main";

export class VaultSelectorModal extends Modal {
	private plugin: TeleporterPlugin;
	private vaultManager: VaultManager;
	private vaults: VaultConfig[];
	private filteredVaults: VaultConfig[];
	private onSelect: (vault: VaultConfig) => void;
	private searchInput: TextComponent;
	private vaultListContainer: HTMLElement;
	private selectedVault: VaultConfig | null = null;
	private currentVaultPath: string;

	constructor(
		app: App,
		plugin: TeleporterPlugin,
		vaultManager: VaultManager,
		vaults: VaultConfig[],
		currentVaultPath: string,
		onSelect: (vault: VaultConfig) => void,
	) {
		super(app);
		this.plugin = plugin;
		this.vaultManager = vaultManager;
		this.currentVaultPath = currentVaultPath;
		this.onSelect = onSelect;

		// Filter out current vault and invalid vaults
		this.vaults = vaults.filter(
			(v) => v.path !== currentVaultPath && v.isValid,
		);
		this.filteredVaults = [...this.vaults];

		// Sort vaults: recently used first, then alphabetically
		this.sortVaults();
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Modal styling
		contentEl.addClass("teleporter-vault-selector");
		contentEl.style.minHeight = "400px";
		contentEl.style.maxHeight = "600px";

		// Header
		contentEl.createEl("h2", { text: "Select Destination Vault" });

		// Check if there are no valid vaults
		if (this.vaults.length === 0) {
			this.showNoVaultsMessage();
			return;
		}

		// Search box
		const searchContainer = contentEl.createDiv("vault-search-container");
		searchContainer.style.marginBottom = "15px";

		new Setting(searchContainer)
			.setName("Search vaults")
			.addText((text) => {
				this.searchInput = text;
				text.setPlaceholder("Type to filter vaults...")
					.onChange((value) => {
						this.filterVaults(value);
					});

				// Focus on search box
				setTimeout(() => {
					text.inputEl.focus();
				}, 100);

				return text;
			});

		// Vault list container
		this.vaultListContainer = contentEl.createDiv("vault-list-container");
		this.vaultListContainer.style.maxHeight = "350px";
		this.vaultListContainer.style.overflowY = "auto";
		this.vaultListContainer.style.marginBottom = "15px";
		this.vaultListContainer.style.border = "1px solid var(--background-modifier-border)";
		this.vaultListContainer.style.borderRadius = "5px";
		this.vaultListContainer.style.padding = "5px";

		// Display vaults
		this.displayVaults();

		// Buttons
		const buttonContainer = contentEl.createDiv("modal-button-container");
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";

		// Cancel button
		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => {
				this.close();
			});

		// Select button
		const selectButton = new ButtonComponent(buttonContainer)
			.setButtonText("Select Vault")
			.setCta()
			.setDisabled(true)
			.onClick(() => {
				if (this.selectedVault) {
					this.onSelect(this.selectedVault);
					this.close();
				}
			});

		// Store select button reference for enabling/disabling
		this.selectButton = selectButton;

		// Add keyboard navigation
		this.setupKeyboardNavigation();
	}

	private showNoVaultsMessage(): void {
		const { contentEl } = this;

		const messageContainer = contentEl.createDiv("empty-vaults-message");
		messageContainer.style.padding = "40px 20px";
		messageContainer.style.textAlign = "center";
		messageContainer.style.color = "var(--text-muted)";

		messageContainer.createEl("div", {
			text: "No destination vaults available",
		});

		const reasonDiv = messageContainer.createDiv();
		reasonDiv.style.marginTop = "10px";
		reasonDiv.style.fontSize = "0.9em";

		if (this.plugin.settings.vaults.length <= 1) {
			reasonDiv.innerHTML = `
				Only the current vault is configured.<br>
				Please add more vaults in the settings.
			`;
		} else {
			reasonDiv.innerHTML = `
				All configured vaults are either invalid or the current vault.<br>
				Please check your vault configuration in settings.
			`;
		}

		// Add button to open settings
		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.marginTop = "20px";
		buttonContainer.style.textAlign = "center";

		new ButtonComponent(buttonContainer)
			.setButtonText("Open Settings")
			.setCta()
			.onClick(() => {
				this.close();
				// @ts-ignore - Obsidian's internal API
				this.app.setting.open();
				// @ts-ignore - Obsidian's internal API
				this.app.setting.openTabById(this.plugin.manifest.id);
			});
	}

	private sortVaults(): void {
		// Sort by last accessed (if available) then alphabetically
		this.vaults.sort((a, b) => {
			// Check if either is the last used vault
			if (a.id === this.plugin.settings.lastUsedVaultId) return -1;
			if (b.id === this.plugin.settings.lastUsedVaultId) return 1;

			// Sort by last accessed time if available
			if (a.lastAccessed && b.lastAccessed) {
				return b.lastAccessed - a.lastAccessed;
			}

			// Otherwise sort alphabetically
			return a.name.localeCompare(b.name);
		});
	}

	private filterVaults(searchTerm: string): void {
		const term = searchTerm.toLowerCase().trim();

		if (!term) {
			this.filteredVaults = [...this.vaults];
		} else {
			this.filteredVaults = this.vaults.filter(
				(vault) =>
					vault.name.toLowerCase().includes(term) ||
					vault.path.toLowerCase().includes(term) ||
					(vault.description && vault.description.toLowerCase().includes(term)),
			);
		}

		this.displayVaults();
	}

	private displayVaults(): void {
		this.vaultListContainer.empty();

		if (this.filteredVaults.length === 0) {
			const emptyMessage = this.vaultListContainer.createDiv("empty-search-message");
			emptyMessage.style.padding = "20px";
			emptyMessage.style.textAlign = "center";
			emptyMessage.style.color = "var(--text-muted)";
			emptyMessage.textContent = "No vaults match your search";
			return;
		}

		// Create vault items
		this.filteredVaults.forEach((vault, index) => {
			this.createVaultItem(vault, index);
		});
	}

	private createVaultItem(vault: VaultConfig, index: number): void {
		const vaultItem = this.vaultListContainer.createDiv("vault-selector-item");
		vaultItem.style.padding = "10px";
		vaultItem.style.marginBottom = "5px";
		vaultItem.style.borderRadius = "5px";
		vaultItem.style.cursor = "pointer";
		vaultItem.style.backgroundColor = "var(--background-secondary)";
		vaultItem.style.border = "2px solid transparent";
		vaultItem.style.transition = "all 0.2s ease";

		// Add data attribute for keyboard navigation
		vaultItem.setAttribute("data-vault-index", index.toString());

		// Header with color and name
		const header = vaultItem.createDiv("vault-item-header");
		header.style.display = "flex";
		header.style.alignItems = "center";
		header.style.gap = "10px";
		header.style.marginBottom = "5px";

		// Color indicator
		const colorIndicator = header.createDiv();
		colorIndicator.style.width = "12px";
		colorIndicator.style.height = "12px";
		colorIndicator.style.borderRadius = "50%";
		colorIndicator.style.backgroundColor = vault.color || "#7c3aed";
		colorIndicator.style.flexShrink = "0";

		// Vault name
		const nameEl = header.createEl("strong", { text: vault.name });
		nameEl.style.flex = "1";

		// Badges
		const badgeContainer = header.createDiv();
		badgeContainer.style.display = "flex";
		badgeContainer.style.gap = "5px";

		// Last used badge
		if (vault.id === this.plugin.settings.lastUsedVaultId) {
			const lastUsedBadge = badgeContainer.createEl("span", { text: "Recent" });
			lastUsedBadge.style.fontSize = "0.75em";
			lastUsedBadge.style.padding = "2px 6px";
			lastUsedBadge.style.borderRadius = "3px";
			lastUsedBadge.style.backgroundColor = "var(--interactive-accent)";
			lastUsedBadge.style.color = "var(--text-on-accent)";
		}

		// Path
		const pathEl = vaultItem.createDiv("vault-item-path");
		pathEl.style.fontSize = "0.85em";
		pathEl.style.color = "var(--text-muted)";
		pathEl.style.fontFamily = "monospace";
		pathEl.textContent = vault.path;

		// Description if available
		if (vault.description) {
			const descEl = vaultItem.createDiv("vault-item-description");
			descEl.style.fontSize = "0.85em";
			descEl.style.color = "var(--text-muted)";
			descEl.style.marginTop = "3px";
			descEl.textContent = vault.description;
		}

		// Hover effect
		vaultItem.addEventListener("mouseenter", () => {
			if (!this.isSelected(vault)) {
				vaultItem.style.backgroundColor = "var(--background-modifier-hover)";
			}
		});

		vaultItem.addEventListener("mouseleave", () => {
			if (!this.isSelected(vault)) {
				vaultItem.style.backgroundColor = "var(--background-secondary)";
			}
		});

		// Click to select
		vaultItem.addEventListener("click", () => {
			this.selectVault(vault, vaultItem);
		});

		// Double-click to select and confirm
		vaultItem.addEventListener("dblclick", () => {
			this.selectVault(vault, vaultItem);
			if (this.selectedVault) {
				this.onSelect(this.selectedVault);
				this.close();
			}
		});
	}

	private selectVault(vault: VaultConfig, element: HTMLElement): void {
		// Clear previous selection
		this.vaultListContainer.querySelectorAll(".vault-selector-item").forEach((item) => {
			(item as HTMLElement).style.backgroundColor = "var(--background-secondary)";
			(item as HTMLElement).style.border = "2px solid transparent";
		});

		// Set new selection
		this.selectedVault = vault;
		element.style.backgroundColor = "var(--background-modifier-hover)";
		element.style.border = "2px solid var(--interactive-accent)";

		// Enable select button
		if (this.selectButton) {
			this.selectButton.setDisabled(false);
		}
	}

	private isSelected(vault: VaultConfig): boolean {
		return this.selectedVault?.id === vault.id;
	}

	private setupKeyboardNavigation(): void {
		// Handle keyboard navigation
		this.contentEl.addEventListener("keydown", (event) => {
			const items = this.vaultListContainer.querySelectorAll(".vault-selector-item");
			if (items.length === 0) return;

			let currentIndex = -1;
			if (this.selectedVault) {
				currentIndex = this.filteredVaults.findIndex(
					(v) => v.id === this.selectedVault?.id,
				);
			}

			switch (event.key) {
				case "ArrowUp":
					event.preventDefault();
					if (currentIndex > 0) {
						const newVault = this.filteredVaults[currentIndex - 1];
						const newElement = items[currentIndex - 1] as HTMLElement;
						this.selectVault(newVault, newElement);
						newElement.scrollIntoView({ block: "nearest" });
					} else if (currentIndex === -1 && items.length > 0) {
						// Select last item if nothing selected
						const newVault = this.filteredVaults[items.length - 1];
						const newElement = items[items.length - 1] as HTMLElement;
						this.selectVault(newVault, newElement);
						newElement.scrollIntoView({ block: "nearest" });
					}
					break;

				case "ArrowDown":
					event.preventDefault();
					if (currentIndex < items.length - 1 && currentIndex !== -1) {
						const newVault = this.filteredVaults[currentIndex + 1];
						const newElement = items[currentIndex + 1] as HTMLElement;
						this.selectVault(newVault, newElement);
						newElement.scrollIntoView({ block: "nearest" });
					} else if (currentIndex === -1 && items.length > 0) {
						// Select first item if nothing selected
						const newVault = this.filteredVaults[0];
						const newElement = items[0] as HTMLElement;
						this.selectVault(newVault, newElement);
						newElement.scrollIntoView({ block: "nearest" });
					}
					break;

				case "Enter":
					event.preventDefault();
					if (this.selectedVault) {
						this.onSelect(this.selectedVault);
						this.close();
					}
					break;

				case "Escape":
					event.preventDefault();
					this.close();
					break;
			}
		});
	}

	private selectButton: ButtonComponent | undefined;

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
