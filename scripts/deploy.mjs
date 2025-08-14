#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configuration
const TEST_VAULT_NAME = 'test-vault';
const TEST_VAULT_PATH = path.join(rootDir, TEST_VAULT_NAME);
const PLUGIN_NAME = 'obsidian-teleporter';
const PLUGIN_DIR = path.join(TEST_VAULT_PATH, '.obsidian', 'plugins', PLUGIN_NAME);

// Files to copy to the plugin directory
const PLUGIN_FILES = ['main.js', 'manifest.json', 'styles.css'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
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

// Ensure directory exists (recursive)
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

// Remove directory recursively
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

// Copy file
function copyFile(src, dest) {
  const srcPath = path.join(rootDir, src);
  const destPath = path.join(dest, src);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    return true;
  }
  return false;
}

// Create a sample note in the vault
function createSampleNote() {
  const notePath = path.join(TEST_VAULT_PATH, 'Test Note.md');
  const noteContent = `# Test Note for Teleporter Plugin

This is a test note created for testing the Obsidian Teleporter plugin.

## Test Content

- You can use this note to test the teleport functionality
- Try moving this note to another vault
- Test the various plugin features

## Plugin Information

- **Plugin**: Obsidian Teleporter
- **Version**: 0.1.0
- **Created**: ${new Date().toISOString()}

## Testing Checklist

- [ ] Open this note
- [ ] Use the configured hotkey to trigger teleport
- [ ] Select a destination vault
- [ ] Choose a target folder
- [ ] Verify the file was moved successfully

---

*This note was automatically generated for testing purposes.*
`;

  fs.writeFileSync(notePath, noteContent);
  return notePath;
}

// Create Obsidian configuration files
function createObsidianConfig() {
  const configDir = path.join(TEST_VAULT_PATH, '.obsidian');
  const corePluginsPath = path.join(configDir, 'core-plugins.json');
  const corePluginsConfig = [
    "file-explorer",
    "global-search",
    "switcher",
    "command-palette",
    "editor-status",
    "markdown-importer",
    "word-count",
    "file-recovery"
  ];

  const communityPluginsPath = path.join(configDir, 'community-plugins.json');
  const communityPluginsConfig = [PLUGIN_NAME];

  const appConfigPath = path.join(configDir, 'app.json');
  const appConfig = {
    "legacyEditor": false,
    "livePreview": true,
    "strictLineBreaks": false,
    "showFrontmatter": true,
    "foldHeading": true,
    "foldIndent": true,
    "showLineNumber": true,
    "showIndentGuide": true
  };

  fs.writeFileSync(corePluginsPath, JSON.stringify(corePluginsConfig, null, 2));
  fs.writeFileSync(communityPluginsPath, JSON.stringify(communityPluginsConfig, null, 2));
  fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2));
}

// Main deployment function
async function deploy() {
  log('\n🚀 Deploying Obsidian Teleporter Plugin to Test Vault', 'cyan');

  try {
    // Step 1: Create test vault structure
    logStep('Creating test vault structure');

    if (ensureDir(TEST_VAULT_PATH)) {
      logSuccess(`Created test vault at: ${TEST_VAULT_PATH}`);
    } else {
      logWarning('Test vault already exists');
    }

    if (ensureDir(path.join(TEST_VAULT_PATH, '.obsidian'))) {
      logSuccess('Created .obsidian directory');
    }

    if (ensureDir(path.join(TEST_VAULT_PATH, '.obsidian', 'plugins'))) {
      logSuccess('Created plugins directory');
    }

    if (ensureDir(PLUGIN_DIR)) {
      logSuccess(`Created plugin directory: ${PLUGIN_NAME}`);
    }

    // Step 2: Create Obsidian configuration
    logStep('Setting up Obsidian configuration');
    createObsidianConfig();
    logSuccess('Created Obsidian configuration files');

    // Step 3: Build the plugin
    logStep('Building plugin');
    log('  Running build command...', 'blue');

    try {
      const { stdout } = await execAsync('npm run build', { cwd: rootDir });
      logSuccess('Plugin built successfully');
    } catch (error) {
      logWarning('Build had warnings or non-critical errors');
      if (error.stdout) console.log(error.stdout);
    }

    // Step 4: Copy plugin files
    logStep('Copying plugin files');

    let copiedCount = 0;
    for (const file of PLUGIN_FILES) {
      if (copyFile(file, PLUGIN_DIR)) {
        logSuccess(`Copied ${file}`);
        copiedCount++;
      } else {
        logWarning(`${file} not found (may not be required)`);
      }
    }

    if (copiedCount === 0) {
      throw new Error('No plugin files were copied. Build may have failed.');
    }

    // Step 5: Create sample content
    logStep('Creating sample content');
    const notePath = createSampleNote();
    logSuccess('Created sample note: Test Note.md');

    // Step 6: Create additional test folders
    const testFolders = ['Archive', 'Projects', 'Daily Notes', 'Templates'];
    for (const folder of testFolders) {
      ensureDir(path.join(TEST_VAULT_PATH, folder));
    }
    logSuccess(`Created ${testFolders.length} test folders`);

    // Success message
    log('\n✨ Deployment completed successfully!', 'green');
    log('\nTest vault location:', 'bright');
    log(`  ${TEST_VAULT_PATH}`, 'cyan');
    log('\nTo test the plugin:', 'bright');
    log('  1. Open Obsidian', 'reset');
    log('  2. Click "Open folder as vault"', 'reset');
    log(`  3. Select: ${TEST_VAULT_NAME}`, 'reset');
    log('  4. The Teleporter plugin should be enabled automatically', 'reset');
    log('\nAlternatively, run:', 'bright');
    log('  npm run open-vault', 'cyan');

  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Clean function - removes test vault
async function clean() {
  log('\n🧹 Cleaning test vault', 'yellow');

  logStep('Removing test vault');

  if (removeDir(TEST_VAULT_PATH)) {
    logSuccess(`Removed test vault: ${TEST_VAULT_PATH}`);
  } else {
    logWarning('Test vault does not exist');
  }

  log('\n✨ Cleanup completed!', 'green');
}

// Clean plugin directory only
async function cleanPlugin() {
  log('\n🧹 Cleaning plugin from test vault', 'yellow');

  logStep('Removing plugin directory');

  if (removeDir(PLUGIN_DIR)) {
    logSuccess(`Removed plugin directory: ${PLUGIN_DIR}`);
  } else {
    logWarning('Plugin directory does not exist');
  }

  log('\n✨ Plugin cleanup completed!', 'green');
}

// Watch mode - rebuild and redeploy on changes
async function watch() {
  log('\n👁  Starting watch mode', 'cyan');
  log('  Watching for changes and auto-deploying...', 'blue');

  // Initial deploy
  await deploy();

  // Set up file watcher
  const watchFiles = ['main.ts', 'manifest.json', 'styles.css'];
  const srcDir = path.join(rootDir, 'src');

  // Watch main files
  watchFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      fs.watchFile(filePath, { interval: 1000 }, async () => {
        log(`\n📝 ${file} changed, rebuilding...`, 'yellow');
        await deploy();
      });
    }
  });

  // Watch src directory
  if (fs.existsSync(srcDir)) {
    fs.watch(srcDir, { recursive: true }, async (eventType, filename) => {
      if (filename && filename.endsWith('.ts')) {
        log(`\n📝 ${filename} changed, rebuilding...`, 'yellow');
        await deploy();
      }
    });
  }

  log('\nPress Ctrl+C to stop watching', 'reset');
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'clean':
    clean();
    break;
  case 'clean-plugin':
    cleanPlugin();
    break;
  case 'watch':
    watch();
    break;
  case 'deploy':
  default:
    deploy();
    break;
}
