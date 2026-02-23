# Track2Do Software User Guide

## Getting Started

After opening Track2Do, you can use the app directly without logging in.

## Step 1: Check Project Information

On the main page, first check the connection status and basic information of your current Pro Tools project:

### Project Basic Information

- **Project Name**
- **Sample Rate**
- **Bit Depth**

### Project Track Information

- Display the list of all tracks in the current project
- Track type labels

After confirming the information is correct, click the green "Next: Manage Snapshots" button to proceed to the next step.

## Step 2: Manage Snapshots

### Preparations Before Creating a Snapshot

**Important**: Before creating a snapshot in Track2Do, you must first set the track status (Solo/Mute states) in the Pro Tools project.

### Steps to Create a Snapshot

1. Adjust the Solo/Mute states of tracks in Pro Tools to the desired mix state
2. Return to Track2Do and click the blue "+ Create Snapshot" button
3. Enter a snapshot name in the dialog box that appears (e.g., "Drum")
4. The system will display "Will save Solo/Mute status of current 29 tracks"
5. Click the green "Create" button to save the snapshot

### Create Multiple Snapshots

Follow the same steps to create snapshots for different mix states:

After setting up all snapshots, click "Next: Export Settings" to enter export settings.

### Modify Existing Snapshots

Click the Details button to enter the details page, then click Edit to modify.

After modification, click Save to save changes.

## Step 3: Export Settings

### Select Snapshots to Export

In the "Select snapshots to export" area, choose the snapshots to export:

### Export Preset Configuration

Click "⚙️ Export Presets" to select/save preset export configurations:

### Detailed Export Parameter Settings

**File Format**: WAV/AIFF

**Output Mix Source Name**: Export mix source name (must be exactly the same)

**Output Mix Source Type**: Export mix source type

**File Prefix**: Name prefix

**Output Path**: Choose the path to save the exported files

**Online Export**: Option to export online

### Start Export

Confirm all settings are correct, then click the green "⬇️ Start Export" button to start the export.

## Export Process Monitoring

During the export, you can see:

- Current progress display (e.g., 4/5 snapshots)
- Overall progress percentage (e.g., 60%)
- Name of the currently processing snapshot
- Task ID and creation time
- You can click the red "🛑 Stop Export" button at any time to stop the export

## Export Completion

Upon completion:

- ✅ "Export Completed! Successfully exported 5 files"
- Display the full path list of all exported files
- Click "📁 Open Folder" to directly open the folder containing the exported files
- Or click "Continue Export" to proceed with other export tasks

## Important Notes

1. **Ensure Pro Tools Connection**: Bottom status bar shows "✅ Pro Tools Connected"
2. **Snapshot Timing**: Tracks must be set in Pro Tools before creating snapshots in Track2Do
3. **Accuracy of Export Parameters**: All source-related settings must match the Pro Tools project to ensure accurate export results
4. **File Path**: Ensure the chosen export path has enough storage space
