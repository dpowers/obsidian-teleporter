import { App, Modal, Setting, TextComponent, ButtonComponent, Notice } from "obsidian";
import { VaultConfig, RecentDestination } from "../types";
import { VaultManager } from "../VaultManager";
import TeleporterPlugin from "../../main";
import * as path from "path";

interface FolderNode {
	path: string;
	name: string;
	level: number;
	isExpanded: boolean;
	hasChildren: boolean;
	children: FolderNode[];
}

export class FolderSelectorModal extends Modal {
	private plugin: TeleporterPlugin;
	private vaultManager: VaultManager;
	private vault: VaultConfig;
	private onSelect: (folderPath: string) => void;
	private searchInput: TextComponent;
	private folderTreeContainer: HTMLElement;
	private selectedFolder: string = "/";
	private allFolders: string[] = [];
	private filteredFolders: string[] = [];
	private folderTree: FolderNode;
	private expandedFolders: Set<string> = new Set(["/"]); // Root expanded by default
	private recentFolders: string[] = [];
	private newFolderInput: TextComponent;
	private isCreatingFolder: boolean = false;

	constructor(
		app: App,
		plugin: TeleporterPlugin,
		vaultManager: VaultManager,
		vault: VaultConfig,
		onSelect: (folderPath: string) => void,
	) {
		super(app);
		this.plugin = plugin;
		this.vaultManager = vaultManager;
		this.vault = vault;
		this.onSelect = onSelect;

		// Get recent folders for this vault
		this.recentFolders = this.plugin.getRecentDestinations(vault.id);
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Modal styling
		contentEl.addClass("teleporter-folder-selector");
		contentEl.style.minHeight = "450px";
		contentEl.style.maxHeight = "650px";

		// Header
		contentEl.createEl("h2", { text: `Select Folder in ${this.vault.name}` });

		// Loading indicator
		const loadingEl = contentEl.createDiv("loading-indicator");
		loadingEl.style.textAlign = "center";
		loadingEl.style.padding = "20px";
		loadingEl.textContent = "Loading folder structure...";

		// Load folders
		try {
			this.allFolders = await this.vaultManager.getVaultFolders(this.vault);
			this.filteredFolders = [...this.allFolders];
			this.buildFolderTree();

			// Remove loading indicator and build UI
			loadingEl.remove();
			this.buildUI(contentEl);
		} catch (error) {
			loadingEl.textContent = "Failed to load folders";
			loadingEl.style.color = "var(--text-error)";
			console.error("Failed to load vault folders:", error);

			// Add retry button
			const retryButton = new ButtonComponent(loadingEl)
				.setButtonText("Retry")
				.onClick(async () => {
					await this.onOpen();
				});
		}
	}

	private buildUI(contentEl: HTMLElement): void {
		// Recent folders section (if any)
		if (this.recentFolders.length > 0) {
			this.createRecentFoldersSection(contentEl);
		}

		// Search box
		const searchContainer = contentEl.createDiv("folder-search-container");
		searchContainer.style.marginBottom = "10px";

		new Setting(searchContainer)
			.setName("Search folders")
			.addText((text) => {
				this.searchInput = text;
				text.setPlaceholder("Type to filter folders...")
					.onChange((value) => {
						this.filterFolders(value);
					});
				return text;
			});

		// New folder button
		const toolbarContainer = contentEl.createDiv("folder-toolbar");
		toolbarContainer.style.marginBottom = "10px";
		toolbarContainer.style.display = "flex";
		toolbarContainer.style.gap = "10px";

		new ButtonComponent(toolbarContainer)
			.setButtonText("New Folder")
			.setIcon("folder-plus")
			.onClick(() => {
				this.showNewFolderInput();
			});

		// New folder input (hidden by default)
		const newFolderContainer = contentEl.createDiv("new-folder-container");
		newFolderContainer.style.display = "none";
		newFolderContainer.style.marginBottom = "10px";
		newFolderContainer.style.padding = "10px";
		newFolderContainer.style.backgroundColor = "var(--background-secondary)";
		newFolderContainer.style.borderRadius = "5px";

		const newFolderSetting = new Setting(newFolderContainer)
			.setName("New folder name")
			.addText((text) => {
				this.newFolderInput = text;
				text.setPlaceholder("folder-name");
				text.inputEl.addEventListener("keydown", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						this.createNewFolder();
					} else if (event.key === "Escape") {
						event.preventDefault();
						this.hideNewFolderInput();
					}
				});
				return text;
			})
			.addButton((btn) =>
				btn
					.setButtonText("Create")
					.setCta()
					.onClick(() => {
						this.createNewFolder();
					})
			)
			.addButton((btn) =>
				btn
					.setButtonText("Cancel")
					.onClick(() => {
						this.hideNewFolderInput();
					})
			);

		// Store reference to container for show/hide
		this.newFolderContainer = newFolderContainer;

		// Folder tree container
		this.folderTreeContainer = contentEl.createDiv("folder-tree-container");
		this.folderTreeContainer.style.maxHeight = "300px";
		this.folderTreeContainer.style.overflowY = "auto";
		this.folderTreeContainer.style.marginBottom = "15px";
		this.folderTreeContainer.style.border = "1px solid var(--background-modifier-border)";
		this.folderTreeContainer.style.borderRadius = "5px";
		this.folderTreeContainer.style.padding = "5px";

		// Display folder tree
		this.displayFolderTree();

		// Selected folder display
		const selectedContainer = contentEl.createDiv("selected-folder-display");
		selectedContainer.style.marginBottom = "15px";
		selectedContainer.style.padding = "10px";
		selectedContainer.style.backgroundColor = "var(--background-secondary)";
		selectedContainer.style.borderRadius = "5px";

		const selectedLabel = selectedContainer.createEl("span", { text: "Selected: " });
		selectedLabel.style.fontWeight = "bold";

		this.selectedFolderDisplay = selectedContainer.createEl("code", {
			text: this.selectedFolder,
		});
		this.selectedFolderDisplay.style.marginLeft = "5px";

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
		new ButtonComponent(buttonContainer)
			.setButtonText("Select Folder")
			.setCta()
			.onClick(() => {
				this.onSelect(this.selectedFolder);
				// Add to recent destinations
				this.plugin.addRecentDestination(this.vault.id, this.selectedFolder);
				this.close();
			});

		// Setup keyboard navigation
		this.setupKeyboardNavigation();

		// Focus on search after a short delay
		setTimeout(() => {
			this.searchInput?.inputEl.focus();
		}, 100);
	}

	private createRecentFoldersSection(contentEl: HTMLElement): void {
		const recentContainer = contentEl.createDiv("recent-folders-section");
		recentContainer.style.marginBottom = "15px";

		const header = recentContainer.createEl("h3", { text: "Recent Folders" });
		header.style.fontSize = "0.9em";
		header.style.marginBottom = "5px";

		const recentList = recentContainer.createDiv("recent-folders-list");
		recentList.style.display = "flex";
		recentList.style.flexWrap = "wrap";
		recentList.style.gap = "5px";

		this.recentFolders.slice(0, 5).forEach((folderPath) => {
			const chip = recentList.createEl("button", {
				text: folderPath === "/" ? "Root" : path.basename(folderPath),
			});
			chip.className = "recent-folder-chip";
			chip.style.padding = "3px 8px";
			chip.style.fontSize = "0.85em";
			chip.style.borderRadius = "3px";
			chip.style.border = "1px solid var(--background-modifier-border)";
			chip.style.backgroundColor = "var(--background-secondary)";
			chip.style.cursor = "pointer";
			chip.title = folderPath;

			chip.addEventListener("click", () => {
				this.selectFolder(folderPath);
			});

			chip.addEventListener("mouseenter", () => {
				chip.style.backgroundColor = "var(--background-modifier-hover)";
			});

			chip.addEventListener("mouseleave", () => {
				chip.style.backgroundColor = "var(--background-secondary)";
			});
		});
	}

	private buildFolderTree(): void {
		// Build hierarchical structure from flat folder list
		this.folderTree = {
			path: "/",
			name: "Root",
			level: 0,
			isExpanded: true,
			hasChildren: false,
			children: [],
		};

		const folderMap = new Map<string, FolderNode>();
		folderMap.set("/", this.folderTree);

		// Sort folders to ensure parents come before children
		const sortedFolders = [...this.allFolders].sort();

		for (const folderPath of sortedFolders) {
			if (folderPath === "/") continue;

			const parts = folderPath.split("/").filter(p => p);
			let currentPath = "";
			let parentNode = this.folderTree;

			for (let i = 0; i < parts.length; i++) {
				currentPath = "/" + parts.slice(0, i + 1).join("/");

				if (!folderMap.has(currentPath)) {
					const node: FolderNode = {
						path: currentPath,
						name: parts[i],
						level: i + 1,
						isExpanded: this.expandedFolders.has(currentPath),
						hasChildren: false,
						children: [],
					};

					parentNode.children.push(node);
					parentNode.hasChildren = true;
					folderMap.set(currentPath, node);
					parentNode = node;
				} else {
					parentNode = folderMap.get(currentPath)!;
				}
			}
		}
	}

	private filterFolders(searchTerm: string): void {
		const term = searchTerm.toLowerCase().trim();

		if (!term) {
			this.filteredFolders = [...this.allFolders];
		} else {
			this.filteredFolders = this.allFolders.filter((folder) => {
				const folderName = path.basename(folder).toLowerCase();
				const fullPath = folder.toLowerCase();
				return folderName.includes(term) || fullPath.includes(term);
			});

			// Expand all folders when searching
			if (term) {
				this.allFolders.forEach(f => this.expandedFolders.add(f));
			}
		}

		this.buildFolderTree();
		this.displayFolderTree();
	}

	private displayFolderTree(): void {
		this.folderTreeContainer.empty();

		if (this.filteredFolders.length === 0) {
			const emptyMessage = this.folderTreeContainer.createDiv("empty-folder-message");
			emptyMessage.style.padding = "20px";
			emptyMessage.style.textAlign = "center";
			emptyMessage.style.color = "var(--text-muted)";
			emptyMessage.textContent = "No folders match your search";
			return;
		}

		// Display tree recursively
		this.displayFolderNode(this.folderTree, this.folderTreeContainer);
	}

	private displayFolderNode(node: FolderNode, container: HTMLElement): void {
		// Check if this folder should be displayed based on filter
		if (this.searchInput?.getValue() && !this.filteredFolders.includes(node.path)) {
			// But still show if it has filtered children
			let hasFilteredChildren = false;
			const checkChildren = (n: FolderNode): boolean => {
				for (const child of n.children) {
					if (this.filteredFolders.includes(child.path)) return true;
					if (checkChildren(child)) return true;
				}
				return false;
			};

			if (!checkChildren(node)) {
				return;
			}
		}

		const folderItem = container.createDiv("folder-tree-item");
		folderItem.style.paddingLeft = `${node.level * 20}px`;
		folderItem.style.padding = `5px 5px 5px ${node.level * 20 + 5}px`;
		folderItem.style.cursor = "pointer";
		folderItem.style.borderRadius = "3px";
		folderItem.style.userSelect = "none";

		// Create folder row
		const folderRow = folderItem.createDiv("folder-row");
		folderRow.style.display = "flex";
		folderRow.style.alignItems = "center";
		folderRow.style.gap = "5px";

		// Expand/collapse arrow for folders with children
		if (node.hasChildren) {
			const arrow = folderRow.createEl("span", {
				text: node.isExpanded ? "▼" : "▶",
			});
			arrow.style.fontSize = "0.8em";
			arrow.style.width = "10px";
			arrow.style.flexShrink = "0";
			arrow.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggleFolder(node);
			});
		} else {
			// Spacer for alignment
			const spacer = folderRow.createDiv();
			spacer.style.width = "10px";
			spacer.style.flexShrink = "0";
		}

		// Folder icon
		const icon = folderRow.createEl("span", { text: "📁" });
		icon.style.fontSize = "0.9em";
		icon.style.flexShrink = "0";

		// Folder name
		const name = folderRow.createEl("span", { text: node.name });
		name.style.flex = "1";

		// Highlight if selected
		if (node.path === this.selectedFolder) {
			folderItem.style.backgroundColor = "var(--interactive-accent)";
			folderItem.style.color = "var(--text-on-accent)";
		}

		// Hover effect
		folderItem.addEventListener("mouseenter", () => {
			if (node.path !== this.selectedFolder) {
				folderItem.style.backgroundColor = "var(--background-modifier-hover)";
			}
		});

		folderItem.addEventListener("mouseleave", () => {
			if (node.path !== this.selectedFolder) {
				folderItem.style.backgroundColor = "transparent";
			}
		});

		// Click to select
		folderItem.addEventListener("click", () => {
			this.selectFolder(node.path);
		});

		// Display children if expanded
		if (node.isExpanded && node.hasChildren) {
			for (const child of node.children) {
				this.displayFolderNode(child, container);
			}
		}
	}

	private toggleFolder(node: FolderNode): void {
		node.isExpanded = !node.isExpanded;
		if (node.isExpanded) {
			this.expandedFolders.add(node.path);
		} else {
			this.expandedFolders.delete(node.path);
		}
		this.displayFolderTree();
	}

	private selectFolder(folderPath: string): void {
		this.selectedFolder = folderPath;
		this.selectedFolderDisplay.textContent = folderPath;
		this.displayFolderTree();
	}

	private showNewFolderInput(): void {
		if (this.isCreatingFolder) return;

		this.isCreatingFolder = true;
		this.newFolderContainer.style.display = "block";

		// Pre-fill with selected folder as parent
		const parentPath = this.selectedFolder === "/" ? "" : this.selectedFolder;
		this.newFolderInput.setValue("");
		this.newFolderInput.setPlaceholder(`${parentPath}/new-folder`);

		setTimeout(() => {
			this.newFolderInput.inputEl.focus();
		}, 50);
	}

	private hideNewFolderInput(): void {
		this.isCreatingFolder = false;
		this.newFolderContainer.style.display = "none";
		this.newFolderInput.setValue("");
	}

	private async createNewFolder(): Promise<void> {
		const folderName = this.newFolderInput.getValue().trim();

		if (!folderName) {
			new Notice("Please enter a folder name");
			return;
		}

		// Validate folder name
		if (folderName.includes("\\") || folderName.includes(":")) {
			new Notice("Invalid folder name");
			return;
		}

		// Build full path
		const parentPath = this.selectedFolder === "/" ? "" : this.selectedFolder;
		const newFolderPath = `${parentPath}/${folderName}`.replace(/\/+/g, "/");

		// Check if folder already exists
		if (this.allFolders.includes(newFolderPath)) {
			new Notice("Folder already exists");
			return;
		}

		// Create the folder
		try {
			const fullPath = path.join(this.vault.path, newFolderPath);
			await this.vaultManager.ensureDirectory(fullPath);

			// Add to folder list
			this.allFolders.push(newFolderPath);
			this.filteredFolders.push(newFolderPath);

			// Rebuild tree
			this.buildFolderTree();
			this.displayFolderTree();

			// Select the new folder
			this.selectFolder(newFolderPath);

			// Hide input
			this.hideNewFolderInput();

			new Notice(`Created folder: ${folderName}`);
		} catch (error) {
			console.error("Failed to create folder:", error);
			new Notice("Failed to create folder");
		}
	}

	private setupKeyboardNavigation(): void {
		this.contentEl.addEventListener("keydown", (event) => {
			// Don't interfere with text input
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				this.close();
			}
		});
	}

	private newFolderContainer: HTMLElement;
	private selectedFolderDisplay: HTMLElement;

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
