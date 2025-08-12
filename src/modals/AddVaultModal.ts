import { App, Modal, Setting, Notice, TextComponent, ButtonComponent } from "obsidian";
import { VaultConfig, VAULT_COLORS } from "../types";
import { VaultManager } from "../VaultManager";

export class AddVaultModal extends Modal {
	private vaultManager: VaultManager;
	private vault: VaultConfig | null;
	private onSave: (vault: VaultConfig) => void;
	private pathInput: TextComponent;
	private nameInput: TextComponent;
	private descriptionInput: any; // TextAreaComponent not exported, using any
	private selectedColor: string;
	private isEditMode: boolean;
	private validationMessage: HTMLElement;

	constructor(
		app: App,
		vaultManager: VaultManager,
		onSave: (vault: VaultConfig) => void,
		existingVault?: VaultConfig,
	) {
		super(app);
		this.vaultManager = vaultManager;
		this.onSave = onSave;
		this.vault = existingVault || null;
		this.isEditMode = !!existingVault;
		this.selectedColor = existingVault?.color || VAULT_COLORS[0];
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: this.isEditMode ? "Edit Vault Configuration" : "Add New Vault",
		});

		// Vault Path
		new Setting(contentEl)
			.setName("Vault Path")
			.setDesc("The full path to the Obsidian vault folder")
			.addText((text) => {
				this.pathInput = text;
				text.setPlaceholder("/path/to/vault")
					.setValue(this.vault?.path || "")
					.onChange(async (value) => {
						await this.validatePath(value);
					});

				// Disable path editing in edit mode
				if (this.isEditMode) {
					text.setDisabled(true);
				}

				return text;
			})
			.addButton((button) => {
				button
					.setButtonText("Browse")
					.setCta()
					.onClick(async () => {
						// Use Electron's dialog if available
						if ((window as any).require) {
							try {
								const { remote } = (window as any).require("electron");
								const result = await remote.dialog.showOpenDialog({
									properties: ["openDirectory"],
									title: "Select Obsidian Vault",
								});

								if (!result.canceled && result.filePaths[0]) {
									this.pathInput.setValue(result.filePaths[0]);
									await this.validatePath(result.filePaths[0]);

									// Auto-fill name if empty
									if (!this.nameInput.getValue()) {
										const path = (window as any).require("path");
										this.nameInput.setValue(path.basename(result.filePaths[0]));
									}
								}
							} catch (error) {
								// Fallback to manual entry
								console.error("Browse failed:", error);
								new Notice("Please enter the vault path manually");
							}
						} else {
							new Notice("Browse is not available. Please enter the path manually.");
						}
					});

				// Hide browse button in edit mode
				if (this.isEditMode) {
					button.buttonEl.style.display = "none";
				}
			});

		// Validation message area
		this.validationMessage = contentEl.createDiv("validation-message");
		this.validationMessage.style.marginTop = "-10px";
		this.validationMessage.style.marginBottom = "10px";
		this.validationMessage.style.fontSize = "0.85em";

		// Vault Name
		new Setting(contentEl)
			.setName("Vault Name")
			.setDesc("A friendly name for this vault")
			.addText((text) => {
				this.nameInput = text;
				text.setPlaceholder("My Vault").setValue(this.vault?.name || "");
				return text;
			});

		// Description (optional)
		new Setting(contentEl)
			.setName("Description")
			.setDesc("Optional description for this vault")
			.addTextArea((text) => {
				this.descriptionInput = text;
				text.setPlaceholder("Work notes, personal journal, etc.").setValue(
					this.vault?.description || "",
				);
				text.inputEl.rows = 2;
				return text;
			});

		// Color selection
		const colorSetting = new Setting(contentEl)
			.setName("Color")
			.setDesc("Choose a color to identify this vault");

		const colorContainer = colorSetting.controlEl.createDiv("color-picker-container");
		colorContainer.style.display = "flex";
		colorContainer.style.gap = "8px";
		colorContainer.style.flexWrap = "wrap";

		VAULT_COLORS.forEach((color) => {
			const colorButton = colorContainer.createEl("button", {
				cls: "color-picker-button",
			});
			colorButton.style.width = "30px";
			colorButton.style.height = "30px";
			colorButton.style.backgroundColor = color;
			colorButton.style.border =
				this.selectedColor === color
					? "2px solid var(--interactive-accent)"
					: "1px solid var(--background-modifier-border)";
			colorButton.style.borderRadius = "4px";
			colorButton.style.cursor = "pointer";

			colorButton.onclick = () => {
				// Update all color buttons
				colorContainer.querySelectorAll(".color-picker-button").forEach((btn) => {
					(btn as HTMLElement).style.border =
						"1px solid var(--background-modifier-border)";
				});
				colorButton.style.border = "2px solid var(--interactive-accent)";
				this.selectedColor = color;
			};
		});

		// Buttons
		const buttonContainer = contentEl.createDiv("modal-button-container");
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";
		buttonContainer.style.marginTop = "20px";

		// Cancel button
		const cancelButton = new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => {
				this.close();
			});

		// Save button
		const saveButton = new ButtonComponent(buttonContainer)
			.setButtonText(this.isEditMode ? "Save Changes" : "Add Vault")
			.setCta()
			.onClick(async () => {
				await this.saveVault();
			});

		// Auto-validate if editing
		if (this.isEditMode && this.vault?.path) {
			this.validatePath(this.vault.path);
		}
	}

	private async validatePath(path: string): Promise<boolean> {
		if (!path) {
			this.showValidationMessage("", "normal");
			return false;
		}

		const result = await this.vaultManager.validateVault(path);

		if (result.isValid) {
			this.showValidationMessage("✓ Valid Obsidian vault detected", "success");
			return true;
		} else {
			this.showValidationMessage(
				`⚠ ${result.error || "Not a valid Obsidian vault"}`,
				"error",
			);
			return false;
		}
	}

	private showValidationMessage(message: string, type: "success" | "error" | "normal") {
		this.validationMessage.empty();
		if (!message) return;

		this.validationMessage.textContent = message;

		switch (type) {
			case "success":
				this.validationMessage.style.color = "var(--text-success)";
				break;
			case "error":
				this.validationMessage.style.color = "var(--text-error)";
				break;
			default:
				this.validationMessage.style.color = "var(--text-muted)";
		}
	}

	private async saveVault() {
		const path = this.pathInput.getValue();
		const name = this.nameInput.getValue();
		const description = this.descriptionInput.getValue();

		// Validate inputs
		if (!path) {
			new Notice("Please enter a vault path");
			return;
		}

		if (!name) {
			new Notice("Please enter a vault name");
			return;
		}

		// Validate the vault path
		const isValid = await this.validatePath(path);
		if (!isValid && !this.isEditMode) {
			const confirmAdd = confirm(
				"This doesn't appear to be a valid Obsidian vault. " +
					"Do you want to add it anyway?",
			);
			if (!confirmAdd) {
				return;
			}
		}

		// Create or update vault config
		let vaultConfig: VaultConfig;

		if (this.isEditMode && this.vault) {
			// Update existing vault
			vaultConfig = {
				...this.vault,
				name,
				description,
				color: this.selectedColor,
				lastAccessed: Date.now(),
			};
		} else {
			// Create new vault
			vaultConfig = {
				id: this.vaultManager.generateVaultId(),
				name,
				path,
				description,
				color: this.selectedColor,
				isValid,
				lastAccessed: Date.now(),
			};
		}

		// Save and close
		this.onSave(vaultConfig);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
