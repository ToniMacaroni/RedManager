import { BaseZipInstaller } from "./baseZipInstaller";
import { redLoaderInfo } from "./githubInfo";
import { getDirectoryPath, gameExePath, processName, processProgress } from "./store"
import { get } from 'svelte/store'
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { TempFileCache } from "./tempFileCache";


export abstract class BaseWebInstaller extends BaseZipInstaller {
  protected constructor(name: string) {
    super(name);
  }

  public getLocalVersion(): string | null {
    return null;
  }

  public async install(): Promise<void> {
    const exePath = get(gameExePath);
    const exeDir = await getDirectoryPath();

    const selectedVersion = await redLoaderInfo.getLatest();
    if (selectedVersion) {
      await this.newInstall(exeDir, selectedVersion);
    }
  }

  protected abstract getDownloadUrl(version: string): Promise<string>;

  private async newInstall(gamePath: string, version: string): Promise<void> {
    await this.downloadAndInstall(gamePath, version);
  }

  private async downloadAndInstall(destination: string, selectedVersion: string): Promise<void> {
    processName.set(`Downloading ${this.getName()}...`);
    const downloadUrl = await this.getDownloadUrl(selectedVersion);

    if (!downloadUrl) {
      console.log(`Couldn't find download url for ${this.getName()}!`);
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

    //processProgress.set(50);

    processName.set(`Extracting ${this.getName()}...`);

    try {
      await this.unzip(tempPath, destination);
    } catch (error) {
      console.log(error);
      return;
    }

    await TempFileCache.clearCache();
  }
}

