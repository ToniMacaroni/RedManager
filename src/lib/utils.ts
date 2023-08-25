import { invoke } from '@tauri-apps/api/tauri'
import { exists } from '@tauri-apps/api/fs'

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