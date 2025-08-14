# Obsidian Teleporter Plugin

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/yourusername/obsidian-teleporter/releases)
[![Obsidian](https://img.shields.io/badge/obsidian-%3E%3D0.15.0-purple)](https://obsidian.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Teleporter** is a powerful Obsidian plugin that enables seamless file movement between vaults with a simple hotkey. Perfect for users who work with multiple vaults and need to reorganize their notes efficiently.

## ✨ Features

- 🚀 **Quick File Movement** - Move files between vaults with a single hotkey
- 📁 **Smart Vault Management** - Configure and organize multiple destination vaults
- 🎯 **Precise Folder Selection** - Choose exactly where files should go
- ⌨️ **Keyboard-First Design** - Complete keyboard navigation with number shortcuts
- 🛡️ **Safe Operations** - File integrity verification and automatic rollback on failure
- 🎨 **Visual Organization** - Color-code your vaults for easy identification
- 📊 **Recent Destinations** - Quick access to frequently used locations
- ⚙️ **Flexible Configuration** - Customize behavior to match your workflow

## 📦 Installation

### From Community Plugins (Coming Soon)
Once approved, you'll be able to install directly from Obsidian:
1. Open Settings → Community plugins
2. Click Browse and search for "Teleporter"
3. Click Install, then Enable

### Manual Installation
1. Download the latest `obsidian-teleporter-[version].zip` from [Releases](https://github.com/yourusername/obsidian-teleporter/releases)
2. Extract the archive into your vault's plugins folder: `<vault>/.obsidian/plugins/obsidian-teleporter/`
3. Reload Obsidian (Ctrl/Cmd + R)
4. Enable the plugin in Settings → Community plugins

### Building from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-teleporter.git

# Navigate to the project directory
cd obsidian-teleporter

# Install dependencies
npm install

# Build the plugin
npm run build

# Copy files to your vault's plugins folder
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/obsidian-teleporter/
```

## 🚀 Quick Start

### Basic Usage
1. **Set up your hotkey** (Settings → Hotkeys → search "Teleporter")
   - Recommended: `Ctrl/Cmd + Shift + M`
2. **Configure your vaults** (Settings → Plugin Options → Teleporter)
   - Click "Add Vault" or use "Discover Vaults" for automatic detection
3. **Move a file**:
   - Open the file you want to move
   - Press your configured hotkey
   - Select destination vault (press 1-9 for quick selection)
   - Choose target folder
   - Confirm the move

## ⌨️ Keyboard Shortcuts

### Global Hotkey
Set your preferred hotkey in Settings → Hotkeys → search "Teleporter"

**Recommended combinations:**
- `Ctrl/Cmd + Shift + M` (Move)
- `Ctrl/Cmd + Shift + T` (Teleport)
- `Alt + M` (quick Move)

### Modal Navigation

#### Vault Selector
| Key | Action |
|-----|--------|
| `1-9` | Quick select vaults 1-9 |
| `↑` / `↓` | Navigate through vault list |
| `Enter` | Confirm selection |
| `Escape` | Cancel operation |
| Type text | Filter vaults by name |

#### Folder Selector
| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate folders |
| `→` | Expand folder |
| `←` | Collapse folder |
| `Enter` | Confirm selection |
| `Escape` | Cancel operation |

## ⚙️ Configuration

Access settings via: Settings → Plugin Options → Teleporter

### Vault Management
- **Add Vault**: Manually configure a vault with custom name, color, and description
- **Discover Vaults**: Automatically scan common locations for Obsidian vaults
- **Edit Vault**: Modify vault settings (name, color, path, description)
- **Validate**: Check if configured vaults are accessible
- **Reorder**: Arrange vaults in your preferred order

### File Operation Settings
- **Delete Original**: Remove file from source vault after successful move (default: on)
- **Preserve File History**: Maintain creation and modification dates (default: on)
- **Show Confirmation**: Display confirmation dialog before moving (default: on)

### Advanced Options
- **Recent Destinations**: Track frequently used folders
- **Last Used Vault**: Remember previous destination for quick access

## 🎯 Use Cases

### Academic Research
- Move completed research notes to an archive vault
- Organize papers by semester or project
- Separate active and reference materials

### Content Creation
- Move drafts to a publishing vault
- Organize content by status (ideas, drafts, published)
- Separate personal and professional notes

### Knowledge Management
- Archive completed projects
- Move notes between work and personal vaults
- Organize by topic or time period

## 🔧 Development

### Project Structure
```
obsidian-teleporter/
├── main.ts                 # Plugin entry point
├── src/
│   ├── types.ts           # TypeScript definitions
│   ├── VaultManager.ts    # Vault management logic
│   ├── FileMover.ts       # File operations
│   ├── modals/            # UI components
│   │   ├── AddVaultModal.ts
│   │   ├── VaultSelectorModal.ts
│   │   └── FolderSelectorModal.ts
│   └── settings/
│       └── SettingsTab.ts # Settings interface
├── manifest.json          # Plugin metadata
├── package.json          # Dependencies
└── README.md            # Documentation
```

### Development Setup

For detailed development instructions, testing workflows, and available commands, see the [Development Guide](DEVELOPMENT.md).

**Quick Start:**
```bash
# Install dependencies
npm install

# Set up test vault with plugin installed
npm run test

# Watch mode for active development
npm run test:watch

# Set up multiple vaults for testing file movements
npm run setup-vaults
```

**Key Commands:**
- `npm run deploy` - Build and deploy to test vault
- `npm run clean` - Remove test vault
- `npm run test:multi` - Set up multiple test vaults
- See [DEVELOPMENT.md](DEVELOPMENT.md) for complete command reference

### Technical Details
- Built with TypeScript for type safety
- Uses Obsidian's official API
- File operations use Node.js fs module (desktop only)
- SHA-256 checksums for file integrity verification
- Atomic operations with rollback capability

## 📊 Current Status

**Version**: 0.1.0 (Beta)  
**Platform Support**: Desktop only (Windows, macOS, Linux)  
**Obsidian Version**: 0.15.0+

### Implemented Features ✅
- Core file movement functionality
- Vault discovery and management
- Visual vault selector with colors
- Folder navigation and selection
- File integrity verification
- Progress indicators
- Error handling with rollback
- Settings persistence
- Keyboard navigation

### Planned Features 🚧
- Undo/redo functionality
- Batch file operations
- Folder movement support
- Mobile platform support
- Move history tracking
- Advanced conflict resolution
- Integration with other plugins

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### How to Contribute
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting PR
- Follow existing code style

## 🐛 Troubleshooting

### Common Issues

#### Hotkey Not Working
- Check for conflicts in Settings → Hotkeys
- Ensure plugin is enabled
- Verify a file is open in the editor

#### Vault Not Found
- Check vault path in settings
- Ensure `.obsidian` folder exists in vault
- Try "Validate All" button in settings

#### Permission Errors
- Ensure write permissions for both vaults
- Check if files are locked by other programs
- Verify disk space availability

### Getting Help
- Check [Issues](https://github.com/yourusername/obsidian-teleporter/issues) for known problems
- Join the discussion in [Obsidian Community Forums](https://forum.obsidian.md)
- Report bugs with detailed reproduction steps

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the Obsidian community's multi-vault workflows
- Thanks to all contributors and testers

## 📚 Resources

- [Plugin Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API Reference](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Note**: This plugin is in active development. Features and interfaces may change as we work towards a stable release. Please report any issues or suggestions on GitHub.