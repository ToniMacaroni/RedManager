import { invoke } from '@tauri-apps/api/tauri';
import { exists } from '@tauri-apps/api/fs';
import { dialog } from '@tauri-apps/api';
import { processName, processProgress } from './store';
import { TempFileCache } from './tempFileCache';
import { listen } from '@tauri-apps/api/event';

export async function unzip(sourcePath: string, destinationPath: string) {
    try {
        const src = sourcePath.replace(/\\/g, '/');
        const dest = destinationPath.replace(/\\/g, '/');
        if(!exists(src)) throw new Error('Source file does not exist!');
        if(!exists(dest)) throw new Error('Destination folder does not exist!');
        await invoke('unzip_handler', { source: src, destination: dest });
    } catch (error) {
        console.error('Failed to unzip:', error);
    }
}

export async function downloadAndInstall(destination: string, downloadUrl: string, downloadName: string): Promise<void> {
    processName.set(`Downloading ${downloadName}...`);

    if (!downloadUrl) {
      console.log(`Couldn't find download url for ${downloadName}!`);
      return;
    }

    const tempPath = await TempFileCache.createFile();
    console.log(`Downloading ${downloadUrl} to ${tempPath}`);

    try {
      // Set up progress listener
      const unlisten = await listen('download-progress', (event) => {
        const { progress } = event.payload as { progress: number };
        processProgress.set(progress);
      });

      // Start the download
      await invoke('download_with_progress', {
        url: downloadUrl,
        filePath: tempPath
      });

      // Clean up listener
      unlisten();
    } catch (error) {
      console.log(error);
      return;
    }

    processName.set(`Extracting ${downloadName}...`);

    try {
      await unzip(tempPath, destination);
    } catch (error) {
      console.log(error);
      return;
    }

    await TempFileCache.clearCache();
  }

  export async function showMessageBox(title: string, message: string): Promise<void> {
    await dialog.message(message, { title: title});
  }