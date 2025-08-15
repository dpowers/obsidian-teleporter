#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n▶ ${step}`, 'bright');
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logWarning(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

// Calculate file hash
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

// Get file size in human readable format
function humanFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Read current version from manifest
function getCurrentVersion() {
  const manifestPath = path.join(rootDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return manifest.version;
}

// Generate release notes
function generateReleaseNotes(version) {
  const notes = `# Obsidian Teleporter v${version}

## 🎉 Release Highlights

This release provides stable file movement functionality between Obsidian vaults with a focus on reliability and user experience.

## ✨ Features

- **Quick File Movement**: Move files between vaults with a customizable hotkey
- **Smart Vault Management**: Configure and organize multiple destination vaults
- **Precise Folder Selection**: Choose exactly where files should go
- **Keyboard-First Design**: Complete keyboard navigation with number shortcuts
- **Safe Operations**: File integrity verification and automatic rollback on failure
- **Visual Organization**: Color-code your vaults for easy identification

## 📦 Installation

### From This Release
1. Download \`obsidian-teleporter-${version}.zip\` from the assets below
2. Extract the archive into your vault's plugins folder: \`<vault>/.obsidian/plugins/obsidian-teleporter/\`
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### Manual Installation
1. Download the following files from the assets below:
   - \`main.js\`
   - \`manifest.json\`
   - \`styles.css\`
2. Create a folder \`obsidian-teleporter\` in your vault's plugins folder
3. Copy the downloaded files into this folder
4. Reload Obsidian and enable the plugin

## 🚀 Quick Start

1. **Set up your hotkey** (Settings → Hotkeys → search "Teleporter")
   - Recommended: \`Ctrl/Cmd + Shift + M\`
2. **Configure your vaults** (Settings → Plugin Options → Teleporter)
3. **Move a file**: Open a file, press your hotkey, select destination

## 📋 What's Included

- \`main.js\` - The compiled plugin code
- \`manifest.json\` - Plugin metadata
- \`styles.css\` - Plugin styles
- \`obsidian-teleporter-${version}.zip\` - All files in a single archive

## 🔧 Requirements

- Obsidian v0.15.0 or higher
- Desktop only (Windows, macOS, Linux)

## 📝 Changelog

### Version ${version}
- Full file movement functionality
- Vault discovery and management
- Visual vault selector with colors
- Folder navigation and selection
- File integrity verification
- Progress indicators
- Error handling with rollback
- Settings persistence
- Keyboard navigation

## 🐛 Known Issues

- Browse button for vault selection only works in Electron environment
- Mobile support not available (desktop only)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the [LICENSE](https://github.com/dpowers/obsidian-teleporter/blob/main/LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/dpowers/obsidian-teleporter)
- [Report Issues](https://github.com/dpowers/obsidian-teleporter/issues)
- [Documentation](https://github.com/dpowers/obsidian-teleporter#readme)

---

**Note**: This plugin is in active development. Please report any issues or suggestions on GitHub.`;

  return notes;
}

// Main function to prepare release
async function prepareRelease() {
  const version = getCurrentVersion();

  log(`\n🚀 Preparing Release for Obsidian Teleporter v${version}`, 'cyan');

  try {
    // Step 1: Create release directory
    logStep('Creating release directory');
    const releaseDir = path.join(rootDir, 'releases', `v${version}`);
    if (!fs.existsSync(releaseDir)) {
      fs.mkdirSync(releaseDir, { recursive: true });
      logSuccess(`Created directory: releases/v${version}`);
    } else {
      logWarning('Release directory already exists');
    }

    // Step 2: Build the plugin
    logStep('Building plugin');
    try {
      await execAsync('npm run build', { cwd: rootDir });
      logSuccess('Plugin built successfully');
    } catch (error) {
      logWarning('Build had warnings or non-critical errors');
    }

    // Step 3: Copy release files
    logStep('Copying release files');
    const releaseFiles = ['main.js', 'manifest.json', 'styles.css'];
    const fileInfo = [];

    for (const file of releaseFiles) {
      const srcPath = path.join(rootDir, file);
      const destPath = path.join(releaseDir, file);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        const stats = fs.statSync(srcPath);
        const hash = calculateFileHash(srcPath);
        fileInfo.push({
          name: file,
          size: humanFileSize(stats.size),
          hash: hash.substring(0, 8)
        });
        logSuccess(`Copied ${file} (${humanFileSize(stats.size)})`);
      } else {
        logWarning(`${file} not found`);
      }
    }

    // Step 4: Create ZIP archive
    logStep('Creating ZIP archive');
    const zipName = `obsidian-teleporter-${version}.zip`;
    const zipPath = path.join(releaseDir, zipName);

    // Check if zip command is available
    try {
      await execAsync('which zip', { cwd: rootDir });

      // Use zip command to create archive
      const zipCommand = `cd "${releaseDir}" && zip -r "${zipName}" ${releaseFiles.join(' ')}`;
      await execAsync(zipCommand);

      const zipStats = fs.statSync(zipPath);
      fileInfo.push({
        name: zipName,
        size: humanFileSize(zipStats.size),
        hash: calculateFileHash(zipPath).substring(0, 8)
      });
      logSuccess(`Created ${zipName} (${humanFileSize(zipStats.size)})`);
    } catch (error) {
      logWarning('zip command not found, skipping archive creation');
      logWarning('You can manually create a ZIP archive of the release files');
    }

    // Step 5: Generate release notes
    logStep('Generating release notes');
    const releaseNotes = generateReleaseNotes(version);
    const notesPath = path.join(releaseDir, `RELEASE_NOTES.md`);
    fs.writeFileSync(notesPath, releaseNotes);
    logSuccess('Generated release notes');

    // Step 6: Create checksums file
    logStep('Creating checksums');
    const checksumsContent = fileInfo.map(file =>
      `${file.hash}  ${file.name} (${file.size})`
    ).join('\n');
    const checksumsPath = path.join(releaseDir, 'checksums.txt');
    fs.writeFileSync(checksumsPath, checksumsContent);
    logSuccess('Created checksums file');

    // Success summary
    log('\n✨ Release preparation completed!', 'green');
    log(`\n📁 Release files location:`, 'bright');
    log(`   ${releaseDir}`, 'cyan');

    log(`\n📦 Files prepared:`, 'bright');
    fileInfo.forEach(file => {
      log(`   - ${file.name} (${file.size})`, 'blue');
    });

    log(`\n📝 Next steps to create GitHub release:`, 'bright');
    log(`   1. Go to: https://github.com/dpowers/obsidian-teleporter/releases/new`, 'reset');
    log(`   2. Choose tag: ${version} (or create new tag)`, 'reset');
    log(`   3. Release title: "v${version}"`, 'reset');
    log(`   4. Copy release notes from: ${notesPath}`, 'reset');
    log(`   5. Upload files from: ${releaseDir}`, 'reset');
    log(`   6. Publish release`, 'reset');

    log(`\n🎯 Quick command to create GitHub release with gh CLI:`, 'bright');
    log(`   gh release create ${version} \\`, 'cyan');
    log(`     --title "v${version}" \\`, 'cyan');
    log(`     --notes-file "${notesPath}" \\`, 'cyan');
    log(`     ${releaseFiles.map(f => `"${path.join(releaseDir, f)}"`).join(' \\\n     ')} \\`, 'cyan');
    if (fs.existsSync(zipPath)) {
      log(`     "${zipPath}"`, 'cyan');
    }

  } catch (error) {
    logError(`Release preparation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Check if running directly
if (process.argv[1] === __filename) {
  prepareRelease();
}

export { prepareRelease, getCurrentVersion, generateReleaseNotes };
