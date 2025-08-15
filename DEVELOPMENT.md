# Development Guide

This guide explains how to set up a development environment for the Obsidian Teleporter plugin and test it locally.

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Obsidian installed on your system
- Git for version control

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dpowers/obsidian-teleporter.git
   cd obsidian-teleporter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

## Development Workflow

### Quick Start

The fastest way to start developing:

```bash
# Set up a test vault with the plugin installed
npm run test

# Or watch for changes and auto-rebuild
npm run test:watch
```

This creates a `test-vault` in your project directory with the plugin pre-installed.

### Available Commands

#### Basic Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Build in development mode |
| `npm run build` | Build for production |
| `npm run deploy` | Build and deploy to test vault |
| `npm run deploy:watch` | Auto-rebuild and deploy on file changes |
| `npm run test` | Alias for deploy (quick test) |
| `npm run test:watch` | Alias for deploy:watch |

#### Test Vault Management

| Command | Description |
|---------|-------------|
| `npm run clean` | Remove the test vault completely |
| `npm run clean:plugin` | Remove only the plugin from test vault |
| `npm run open-vault` | Open test vault in file explorer |

#### Multi-Vault Testing

For testing file movements between vaults:

| Command | Description |
|---------|-------------|
| `npm run setup-vaults` | Create 3 test vaults (personal, work, archive) |
| `npm run clean-vaults` | Remove all test vaults |
| `npm run list-vaults` | List existing test vaults |
| `npm run test:multi` | Set up vaults + deploy plugin |
| `npm run test:full` | Clean, setup, and deploy everything |

## Testing the Plugin

### Single Vault Testing

1. **Deploy the plugin**
   ```bash
   npm run deploy
   ```

2. **Open Obsidian**
   - Click "Open folder as vault"
   - Navigate to `obsidian-teleporter/test-vault`
   - The plugin will be enabled automatically

3. **Test basic functionality**
   - Open the test note created in the vault
   - Try the teleport command (set hotkey in settings)
   - Check plugin settings

### Multi-Vault Testing

1. **Set up multiple test vaults**
   ```bash
   npm run setup-vaults
   ```

   This creates three themed vaults:
   - `test-vault-personal` - Personal notes with journal entries
   - `test-vault-work` - Work projects and meetings
   - `test-vault-archive` - Archive for completed items

2. **Deploy plugin to main test vault**
   ```bash
   npm run deploy
   ```

3. **Configure vaults in plugin**
   - Open `test-vault` in Obsidian
   - Go to Settings → Teleporter
   - Add the other test vaults using paths from `test-vaults-config.json`
   - Or use "Discover Vaults" to auto-detect them

4. **Test file movements**
   - Open a note in any vault
   - Use the teleport hotkey
   - Select destination vault
   - Choose target folder
   - Verify file moved successfully

## Development Tips

### Watch Mode

For active development, use watch mode to automatically rebuild and deploy:

```bash
npm run test:watch
```

This will:
- Watch for changes in `.ts` files
- Automatically rebuild the plugin
- Deploy to test vault
- No need to manually rebuild

### File Structure

```
obsidian-teleporter/
├── scripts/                 # Build and deployment scripts
│   ├── deploy.mjs          # Main deployment script
│   └── setup-test-vaults.mjs # Multi-vault setup
├── src/                    # Source code
│   ├── modals/            # UI modal components
│   ├── settings/          # Settings tab
│   ├── types.ts           # TypeScript definitions
│   ├── VaultManager.ts    # Vault management
│   └── FileMover.ts       # File operations
├── test-vault/            # Auto-generated test vault
├── main.ts                # Plugin entry point
└── manifest.json          # Plugin metadata
```

### Testing Checklist

Before committing changes, test:

- [ ] Basic file movement between vaults
- [ ] Vault discovery and validation
- [ ] Settings persistence
- [ ] Keyboard shortcuts
- [ ] Error handling (invalid paths, permissions)
- [ ] File conflict resolution
- [ ] Large file handling
- [ ] Special characters in filenames

### Debugging

1. **Enable Debug Mode**
   - Open Obsidian Developer Console: `Ctrl/Cmd + Shift + I`
   - Check for errors in Console tab
   - Use `console.log()` in your code for debugging

2. **Common Issues**

   **Plugin not loading:**
   - Check `manifest.json` is valid JSON
   - Verify `main.js` exists after build
   - Ensure plugin is enabled in settings

   **Build errors:**
   - Run `npm run build` to see TypeScript errors
   - Check imports and exports
   - Verify all dependencies installed

   **File operation failures:**
   - Check file permissions
   - Verify vault paths are correct
   - Ensure `.obsidian` folder exists in vaults

### Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add JSDoc comments for public methods
- Use meaningful variable names
- Keep functions small and focused

Example:

```typescript
/**
 * Moves a file from source to destination vault
 * @param sourceFile - The file to move
 * @param targetVault - Destination vault configuration
 * @param targetPath - Path within destination vault
 * @returns Promise<boolean> - Success status
 */
async moveFile(
    sourceFile: TFile,
    targetVault: VaultConfig,
    targetPath: string
): Promise<boolean> {
    // Implementation
}
```

## Building for Release

1. **Update version**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Build production version**
   ```bash
   npm run build
   ```

3. **Required files for release**
   - `main.js` - Compiled plugin code
   - `manifest.json` - Plugin metadata
   - `styles.css` - Plugin styles (if any)

## Troubleshooting

### Permission Errors on macOS/Linux

If you get permission errors:

```bash
chmod +x scripts/*.mjs
```

### Vault Not Opening

If Obsidian doesn't recognize the test vault:
1. Ensure `.obsidian` folder exists
2. Try opening manually through Obsidian
3. Check vault path has no spaces or special characters

### Build Failures

If the build fails:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Check TypeScript version:
   ```bash
   npx tsc --version
   ```

3. Verify all imports resolve correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the test vaults
5. Submit a pull request

### Pre-commit Checklist

- [ ] Code builds without errors
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Follows code style guidelines
- [ ] Tested in multiple vaults

## Resources

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Node.js fs Documentation](https://nodejs.org/api/fs.html)

## Questions?

- Check existing [GitHub Issues](https://github.com/dpowers/obsidian-teleporter/issues)
- Join the discussion in [Obsidian Forums](https://forum.obsidian.md)
- Review the [README](README.md) for usage information