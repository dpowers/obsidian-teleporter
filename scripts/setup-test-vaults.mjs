#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configuration for multiple test vaults
const TEST_VAULTS = [
  {
    name: 'test-vault-personal',
    description: 'Personal notes vault for testing',
    folders: ['Journal', 'Ideas', 'Reading Notes', 'Archive'],
    notes: [
      {
        name: 'Welcome to Personal Vault.md',
        content: `# Welcome to Personal Vault

This is your personal knowledge base for testing the Teleporter plugin.

## Vault Purpose
- Personal journal entries
- Book and article notes
- Creative ideas and projects
- Life goals and planning

## Test Scenarios
1. Move journal entries to archive
2. Transfer ideas to work vault
3. Copy reading notes between vaults

---
Created: ${new Date().toISOString()}
Tags: #personal #test #teleporter`
      },
      {
        name: 'Journal/2024-01-15.md',
        content: `# Daily Journal - January 15, 2024

## Today's Thoughts
Testing the Teleporter plugin with this journal entry.

## Gratitude
- Working plugin deployment
- Smooth testing workflow
- Clean code organization

## Tomorrow's Goals
- [ ] Test file movements
- [ ] Verify vault configurations
- [ ] Document findings

#journal #daily`
      },
      {
        name: 'Ideas/App Idea - Task Manager.md',
        content: `# App Idea: Smart Task Manager

## Concept
A task management app that learns from your habits.

## Features
- AI-powered prioritization
- Habit tracking integration
- Time blocking suggestions

## Technical Stack
- Frontend: React Native
- Backend: Node.js
- Database: PostgreSQL

#ideas #app #productivity`
      }
    ]
  },
  {
    name: 'test-vault-work',
    description: 'Work projects vault for testing',
    folders: ['Projects', 'Meetings', 'Documentation', 'Team', 'Archive'],
    notes: [
      {
        name: 'Welcome to Work Vault.md',
        content: `# Welcome to Work Vault

Professional workspace for testing the Teleporter plugin.

## Vault Structure
- **Projects**: Active project documentation
- **Meetings**: Meeting notes and agendas
- **Documentation**: Technical docs and guides
- **Team**: Team resources and contacts
- **Archive**: Completed projects

## Common Workflows
1. Archive completed projects
2. Move personal notes out
3. Import reference materials

---
Created: ${new Date().toISOString()}
Tags: #work #professional #teleporter`
      },
      {
        name: 'Projects/Teleporter Plugin Testing.md',
        content: `# Teleporter Plugin Testing Project

## Overview
Testing the Obsidian Teleporter plugin functionality.

## Test Cases
- [x] Basic file movement
- [ ] Folder structure preservation
- [ ] Metadata retention
- [ ] Conflict resolution

## Results
- File movements work as expected
- UI is intuitive
- Keyboard shortcuts are responsive

## Next Steps
1. Test edge cases
2. Performance testing with large files
3. Multi-vault workflow testing

#project #testing #plugin`
      },
      {
        name: 'Meetings/2024-01-15 Team Standup.md',
        content: `# Team Standup - January 15, 2024

## Attendees
- Project Manager
- Development Team
- QA Team

## Updates
### Yesterday
- Completed plugin setup
- Reviewed documentation

### Today
- Testing file movements
- Documenting workflows

### Blockers
- None currently

#meeting #standup #team`
      }
    ]
  },
  {
    name: 'test-vault-archive',
    description: 'Archive vault for completed items',
    folders: ['2023', '2024', 'Projects', 'Personal', 'Reference'],
    notes: [
      {
        name: 'Archive Index.md',
        content: `# Archive Vault Index

Central archive for completed work and reference materials.

## Organization
- **By Year**: Chronological organization
- **Projects**: Completed project archives
- **Personal**: Personal archive items
- **Reference**: Permanent reference materials

## Archive Policy
- Files moved here are considered complete
- Maintain original folder structure when possible
- Add archive date to metadata

## Quick Links
- [[2024/Q1 Summary]]
- [[Projects/Completed Projects Index]]
- [[Reference/Style Guide]]

---
Created: ${new Date().toISOString()}
Tags: #archive #index #teleporter`
      },
      {
        name: '2024/Q1 Summary.md',
        content: `# Q1 2024 Summary

## Completed Projects
1. Plugin Development
2. Testing Framework
3. Documentation Update

## Key Achievements
- Successful plugin deployment
- Improved testing workflow
- Better documentation structure

## Archived Items
- 15 project files
- 30 meeting notes
- 10 reference documents

#archive #quarterly #summary`
      }
    ]
  }
];

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

// Ensure directory exists
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

// Create Obsidian configuration for a vault
function createObsidianConfig(vaultPath, vaultName) {
  const configDir = path.join(vaultPath, '.obsidian');
  ensureDir(configDir);

  // Core plugins configuration
  const corePluginsPath = path.join(configDir, 'core-plugins.json');
  const corePlugins = [
    "file-explorer",
    "global-search",
    "switcher",
    "command-palette",
    "editor-status",
    "markdown-importer",
    "word-count",
    "file-recovery",
    "page-preview",
    "templates",
    "note-composer",
    "slash-command"
  ];

  // App configuration with theme variations
  const appConfigPath = path.join(configDir, 'app.json');
  const themes = ['moonstone', 'obsidian', 'minimal'];
  const theme = themes[TEST_VAULTS.findIndex(v => v.name === vaultName) % themes.length];

  const appConfig = {
    "legacyEditor": false,
    "livePreview": true,
    "theme": theme,
    "cssTheme": "",
    "showFrontmatter": true,
    "foldHeading": true,
    "foldIndent": true,
    "showLineNumber": false,
    "showIndentGuide": true,
    "attachmentFolderPath": "./attachments",
    "newFileLocation": "current",
    "alwaysUpdateLinks": true,
    "defaultViewMode": "preview"
  };

  // Appearance configuration
  const appearancePath = path.join(configDir, 'appearance.json');
  const appearanceConfig = {
    "baseFontSize": 16,
    "theme": theme,
    "translucency": false,
    "enabledCssSnippets": []
  };

  // Workspace configuration
  const workspacePath = path.join(configDir, 'workspace.json');
  const workspaceConfig = {
    "main": {
      "id": "workspace",
      "type": "split",
      "children": [
        {
          "id": "file-explorer",
          "type": "leaf",
          "state": {
            "type": "file-explorer",
            "state": {}
          }
        }
      ],
      "direction": "vertical"
    },
    "left": {
      "id": "sidebar-left",
      "type": "mobile-drawer",
      "children": [
        {
          "id": "file-explorer-tab",
          "type": "leaf",
          "state": {
            "type": "file-explorer",
            "state": {}
          }
        }
      ]
    },
    "active": "file-explorer"
  };

  // Write configuration files
  fs.writeFileSync(corePluginsPath, JSON.stringify(corePlugins, null, 2));
  fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2));
  fs.writeFileSync(appearancePath, JSON.stringify(appearanceConfig, null, 2));
  fs.writeFileSync(workspacePath, JSON.stringify(workspaceConfig, null, 2));
}

// Create a vault with its structure and content
function createVault(vaultConfig) {
  const vaultPath = path.join(rootDir, vaultConfig.name);

  logStep(`Creating ${vaultConfig.name}`);

  // Create vault directory
  if (ensureDir(vaultPath)) {
    logSuccess(`Created vault directory: ${vaultConfig.name}`);
  } else {
    logWarning(`Vault already exists: ${vaultConfig.name}`);
  }

  // Create folder structure
  for (const folder of vaultConfig.folders) {
    const folderPath = path.join(vaultPath, folder);
    ensureDir(folderPath);
  }
  logSuccess(`Created ${vaultConfig.folders.length} folders`);

  // Create notes
  for (const note of vaultConfig.notes) {
    const notePath = path.join(vaultPath, note.name);
    const noteDir = path.dirname(notePath);
    ensureDir(noteDir);
    fs.writeFileSync(notePath, note.content);
  }
  logSuccess(`Created ${vaultConfig.notes.length} notes`);

  // Create Obsidian configuration
  createObsidianConfig(vaultPath, vaultConfig.name);
  logSuccess('Created Obsidian configuration');

  // Create attachments folder
  ensureDir(path.join(vaultPath, 'attachments'));

  return vaultPath;
}

// Setup all test vaults
async function setupVaults() {
  log('\n🚀 Setting Up Multiple Test Vaults for Teleporter Testing', 'cyan');

  try {
    const createdVaults = [];

    for (const vaultConfig of TEST_VAULTS) {
      const vaultPath = createVault(vaultConfig);
      createdVaults.push({
        name: vaultConfig.name,
        path: vaultPath,
        description: vaultConfig.description
      });
    }

    // Create a configuration file for the teleporter plugin
    logStep('Creating Teleporter configuration helper');

    const configHelper = {
      vaults: createdVaults.map((v, index) => ({
        id: `vault-${index + 1}`,
        name: v.name.replace('test-vault-', '').charAt(0).toUpperCase() +
              v.name.replace('test-vault-', '').slice(1),
        path: v.path,
        description: v.description,
        color: ['blue', 'green', 'purple'][index] || 'gray'
      }))
    };

    const configPath = path.join(rootDir, 'test-vaults-config.json');
    fs.writeFileSync(configPath, JSON.stringify(configHelper, null, 2));
    logSuccess('Created test-vaults-config.json');

    // Success summary
    log('\n✨ Setup completed successfully!', 'green');
    log('\nCreated vaults:', 'bright');
    createdVaults.forEach(vault => {
      log(`  📁 ${vault.name}`, 'blue');
      log(`     ${vault.description}`, 'reset');
      log(`     Path: ${vault.path}`, 'cyan');
    });

    log('\nTo test the Teleporter plugin:', 'bright');
    log('  1. Open one of the test vaults in Obsidian', 'reset');
    log('  2. Install the Teleporter plugin using: npm run deploy', 'reset');
    log('  3. Configure the other vaults in Teleporter settings', 'reset');
    log('  4. Test moving files between vaults!', 'reset');

    log('\nQuick configuration:', 'bright');
    log('  The test-vaults-config.json file contains vault paths', 'reset');
    log('  that can be copied into the Teleporter plugin settings.', 'reset');

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Clean all test vaults
async function cleanVaults() {
  log('\n🧹 Cleaning all test vaults', 'yellow');

  let cleaned = 0;
  for (const vaultConfig of TEST_VAULTS) {
    const vaultPath = path.join(rootDir, vaultConfig.name);
    logStep(`Removing ${vaultConfig.name}`);

    if (removeDir(vaultPath)) {
      logSuccess(`Removed vault: ${vaultConfig.name}`);
      cleaned++;
    } else {
      logWarning(`Vault does not exist: ${vaultConfig.name}`);
    }
  }

  // Remove config file
  const configPath = path.join(rootDir, 'test-vaults-config.json');
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    logSuccess('Removed test-vaults-config.json');
  }

  log(`\n✨ Cleanup completed! Removed ${cleaned} vaults.`, 'green');
}

// List existing test vaults
async function listVaults() {
  log('\n📋 Existing Test Vaults', 'cyan');

  let found = 0;
  for (const vaultConfig of TEST_VAULTS) {
    const vaultPath = path.join(rootDir, vaultConfig.name);

    if (fs.existsSync(vaultPath)) {
      log(`\n  📁 ${vaultConfig.name}`, 'green');
      log(`     ${vaultConfig.description}`, 'reset');
      log(`     Path: ${vaultPath}`, 'cyan');

      // Count files
      const files = fs.readdirSync(vaultPath, { recursive: true })
        .filter(f => f.endsWith('.md'));
      log(`     Files: ${files.length} markdown files`, 'blue');
      found++;
    }
  }

  if (found === 0) {
    logWarning('No test vaults found. Run "npm run setup-vaults" to create them.');
  } else {
    log(`\n  Total: ${found} vault(s) found`, 'bright');
  }
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'clean':
    cleanVaults();
    break;
  case 'list':
    listVaults();
    break;
  case 'setup':
  default:
    setupVaults();
    break;
}
