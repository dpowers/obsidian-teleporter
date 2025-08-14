import { TFile } from "obsidian";

export interface TeleporterSettings {
	vaults: VaultConfig[];
	deleteOriginalAfterMove: boolean;
	preserveFileHistory: boolean;
	showConfirmation: boolean;
	lastUsedVaultId?: string;
	recentDestinations?: RecentDestination[];
}

export interface VaultConfig {
	id: string;
	name: string;
	path: string;
	isValid: boolean;
	lastAccessed?: number;
	description?: string;
	color?: string;
}

export interface MoveOperation {
	sourceFile: TFile;
	sourceVault: string;
	targetVault: VaultConfig;
	targetPath: string;
	timestamp: number;
	status: "pending" | "success" | "failed";
	error?: string;
}

export interface RecentDestination {
	vaultId: string;
	path: string;
	timestamp: number;
}

export interface VaultValidationResult {
	isValid: boolean;
	hasConfigFile: boolean;
	hasPluginsFolder: boolean;
	hasDataFile: boolean;
	error?: string;
}

export interface FileSystemStats {
	created: Date;
	modified: Date;
	size: number;
}

export const DEFAULT_SETTINGS: TeleporterSettings = {
	vaults: [],
	deleteOriginalAfterMove: true,
	preserveFileHistory: false,
	showConfirmation: true,
	recentDestinations: [],
};

export const VAULT_COLORS = [
	"#e74c3c", // red
	"#3498db", // blue
	"#2ecc71", // green
	"#f39c12", // orange
	"#9b59b6", // purple
	"#1abc9c", // turquoise
	"#34495e", // dark gray
	"#e67e22", // dark orange
	"#16a085", // dark turquoise
	"#8e44ad", // dark purple
];
