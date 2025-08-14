# Teleporter Plugin - Hotkey Setup Guide

## Setting Up Your Main Hotkey

The Teleporter plugin integrates with Obsidian's built-in hotkey system, allowing you to configure your preferred keyboard shortcut.

### Step-by-Step Configuration

1. **Open Obsidian Settings**
   - Click the gear icon (⚙️) in the bottom-left corner
   - Or use `Ctrl/Cmd + ,`

2. **Navigate to Hotkeys**
   - In the Settings sidebar, click on "Hotkeys"
   - Or go to Settings → Options → Hotkeys

3. **Search for Teleporter**
   - In the search box, type "Teleporter" or "teleport"
   - You'll see: **"Teleport current file to another vault"**

4. **Set Your Hotkey**
   - Click the `+` button next to the command
   - Press your desired key combination
   - Recommended: `Ctrl/Cmd + Shift + M` (for "Move")
   - Alternative suggestions:
     - `Ctrl/Cmd + Shift + T` (for "Teleport")
     - `Alt + M` (for "Move")
     - `Ctrl/Cmd + Alt + V` (for "Vault")

5. **Confirm the Hotkey**
   - Click anywhere outside the input to save
   - The hotkey is now active!

### Checking Your Current Hotkey

You can see your configured hotkey in several places:

1. **In Teleporter Settings**
   - Go to Settings → Plugin Options → Teleporter
   - Your current hotkey is displayed at the top

2. **In Command Palette**
   - Open Command Palette (`Ctrl/Cmd + P`)
   - Search for "Teleport"
   - The hotkey is shown next to the command

## Modal Keyboard Shortcuts

Once you trigger the teleport command, you can use these keyboard shortcuts in the modals:

### Vault Selector Modal

| Key | Action |
|-----|--------|
| `1-9` | Quick select vaults 1-9 |
| `Ctrl/Cmd + 1-9` | Select and immediately confirm vault 1-9 |
| `↑` / `↓` | Navigate up/down through vault list |
| `Enter` | Confirm selected vault |
| `Escape` | Cancel operation |
| Type any text | Filter vaults by name/path |

### Folder Selector Modal

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate through folder tree |
| `→` | Expand folder |
| `←` | Collapse folder |
| `Enter` | Confirm selected folder |
| `Escape` | Cancel operation |
| Type any text | Filter folders |

## Tips & Tricks

### Quick Workflow
1. **Set up a memorable hotkey** - Choose something that feels natural to you
2. **Use number keys** - Press 1-9 in vault selector for lightning-fast selection
3. **Recent vaults appear first** - Your most-used vaults bubble to the top
4. **Double-click to confirm** - In vault selector, double-click to select and confirm instantly

### Avoiding Conflicts
- **Check existing hotkeys** - Make sure your chosen combination isn't already in use
- **System shortcuts** - Avoid combinations used by your OS (e.g., `Ctrl+Alt+Del` on Windows)
- **Common Obsidian shortcuts** - Don't override frequently used commands

### Multiple Hotkeys
You can set multiple hotkeys for the same command:
1. Click the `+` button again after setting your first hotkey
2. Add an alternative key combination
3. Both hotkeys will work!

## Troubleshooting

### Hotkey Not Working?

1. **Check for conflicts**
   - Go to Settings → Hotkeys
   - Look for a ⚠️ warning icon next to conflicting hotkeys
   - Change one of the conflicting hotkeys

2. **Ensure plugin is enabled**
   - Go to Settings → Community plugins
   - Make sure Teleporter is toggled ON

3. **File must be open**
   - The hotkey only works when you have a file open in the editor
   - It won't work from the file explorer or graph view

### Resetting Hotkeys

To remove or reset a hotkey:
1. Go to Settings → Hotkeys
2. Search for "Teleport"
3. Click the `x` next to the current hotkey to remove it
4. Add a new hotkey if desired

## Default Workflow Example

Here's a typical workflow with keyboard shortcuts:

1. Edit your file in Obsidian
2. Press `Ctrl/Cmd + Shift + M` (your configured hotkey)
3. Press `2` to select your second vault (or use arrows and Enter)
4. Navigate folders with arrow keys or click
5. Press `Enter` to confirm the destination
6. File is moved! 🎉

## Accessibility

The Teleporter plugin is designed with keyboard accessibility in mind:
- **Full keyboard navigation** - Never need to use the mouse
- **Clear visual indicators** - Selected items are highlighted
- **Number shortcuts** - Quick access to first 9 vaults
- **Standard navigation keys** - Arrow keys, Enter, and Escape work as expected

---

For more information, see the [main README](README.md) or report issues on [GitHub](https://github.com/yourusername/obsidian-teleporter).