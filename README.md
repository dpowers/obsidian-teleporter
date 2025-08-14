# Obsidian Teleporter

A plugin for [Obsidian](https://obsidian.md) that enables seamless file movement between vaults.

## Features

**Teleporter** allows you to quickly move files from one Obsidian vault to another with a simple hotkey command. Perfect for users who work with multiple vaults and need to reorganize their notes efficiently.

### Core Features (V0)
- 🚀 **Quick File Movement**: Move the current active file to another vault with a customizable hotkey
- 📁 **Vault Management**: Configure and manage multiple destination vaults
- 🎯 **Folder Selection**: Choose exactly where in the destination vault your file should go
- ⚙️ **Flexible Options**: Configure whether to delete the original file or keep it as a copy
- 🛡️ **Safe Operations**: Confirmation dialogs and error handling to prevent accidental data loss

## Installation

### Manual Installation
1. Download the latest release from the [Releases](https://github.com/yourusername/obsidian-teleporter/releases) page
2. Extract the files into your vault's plugins folder: `<vault>/.obsidian/plugins/obsidian-teleporter/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### From Community Plugins (Coming Soon)
Once approved, you'll be able to install Teleporter directly from Obsidian:
1. Open Settings → Community plugins
2. Click Browse and search for "Teleporter"
3. Click Install
4. Enable the plugin

## Usage

### Basic Workflow
1. Open the file you want to move in Obsidian
2. Press your configured hotkey (set in Settings → Hotkeys → search "Teleporter")
3. Select the destination vault from the modal (press 1-9 for quick selection)
4. Choose the target folder in the destination vault
5. Confirm the move operation

### Configuration
Access plugin settings via Settings → Plugin Options → Teleporter

#### Setting up the Hotkey:
1. Go to Settings → Hotkeys
2. Search for "Teleporter"
3. Click on "Teleport current file to another vault"
4. Set your preferred hotkey combination (e.g., `Ctrl/Cmd + Shift + M`)

#### Available Settings:
- **Vault Configuration**: Add and manage destination vaults
- **Delete Original**: Choose whether to delete or keep the original file after moving
- **Preserve File History**: Maintain creation and modification dates
- **Show Confirmation**: Enable/disable confirmation dialogs before moving files

#### Vault Selector Shortcuts:
- **Number keys (1-9)**: Quick select vaults 1-9
- **Arrow keys**: Navigate through vaults
- **Enter**: Confirm selection
- **Escape**: Cancel operation

## Requirements
- Obsidian v0.15.0 or higher
- Desktop only (Windows, macOS, Linux) - Mobile support planned for future versions

## Development Status

This plugin is currently in **V0 (Beta)** development. Core functionality is being implemented with a focus on reliability and user experience.

### Roadmap
- [x] Project setup and structure
- [ ] Vault discovery and configuration
- [ ] File movement operations
- [ ] User interface (modals and settings)
- [ ] Error handling and recovery
- [ ] Testing and bug fixes

### Future Enhancements (Post-V0)
- Batch file operations
- Folder movement support
- Mobile platform support
- Integration with other plugins
- Move history with undo/redo
- Cross-vault search capabilities

## Support

If you encounter any issues or have suggestions:
- Open an issue on [GitHub](https://github.com/yourusername/obsidian-teleporter/issues)
- Join the discussion in the Obsidian community forums

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built using the [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the need for better multi-vault workflows in Obsidian

---

**Note**: This plugin is in active development. Features and interfaces may change as we work towards a stable release.