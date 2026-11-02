import { invoke } from '@tauri-apps/api/tauri';
import { exists } from '@tauri-apps/api/fs';
import { dialog } from '@tauri-apps/api';
import { processName, processProgress } from './store';
import { TempFileCache } from './tempFileCache';
import { download } from 'tauri-plugin-upload-api';

export async function unzip(sourcePath: string, destinationPath: string) {
    const src = sourcePath.replace(/\\/g, '/');
    const dest = destinationPath.replace(/\\/g, '/');
    if (!await exists(src)) throw new Error('Downloaded archive is missing.');
    if (!await exists(dest)) throw new Error(`Destination folder does not exist: ${destinationPath}`);
    try {
        await invoke('unzip_handler', { source: src, destination: dest });
    } catch (error) {
        throw new Error(`Failed to extract archive: ${error}`);
    }
}

export async function downloadAndInstall(destination: string, downloadUrl: string | null, downloadName: string): Promise<void> {
    await downloadArchive(downloadUrl, downloadName, zipPath => unzip(zipPath, destination));
}

// downloads an archive to a temp file, hands it to `handle`, then deletes it
export async function downloadArchive(downloadUrl: string | null, downloadName: string, handle: (zipPath: string) => Promise<void>): Promise<void> {
    if (!downloadUrl) {
        throw new Error(`Couldn't find a download for ${downloadName}.`);
    }

    processName.set(`Downloading ${downloadName}...`);
    processProgress.set(0);

    const tempPath = await TempFileCache.createFile();
    console.log(`Downloading ${downloadUrl} to ${tempPath}`);

    try {
        let downloadProgress = 0;
        await download(downloadUrl, tempPath, (progress, total) => {
            downloadProgress += progress;
            if (total > 0) {
                processProgress.set(Math.min(100, downloadProgress / total * 100));
            }
        });
    } catch (error) {
        await TempFileCache.clearCache();
        throw new Error(`Failed to download ${downloadName}: ${error}`);
    }

    processName.set(`Extracting ${downloadName}...`);
    processProgress.set(100);

    try {
        await handle(tempPath);
    } finally {
        await TempFileCache.clearCache();
    }
}

export async function showMessageBox(title: string, message: string): Promise<void> {
    await dialog.message(message, { title: title });
}

export async function confirmAction(title: string, message: string): Promise<boolean> {
    return await dialog.confirm(message, { title: title, type: "warning" });
}
