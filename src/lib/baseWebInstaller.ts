import { BaseZipInstaller } from "./baseZipInstaller";
import { redLoaderInfo } from "./githubInfo";
import { getDirectoryPath, gameExePath, processName, processProgress } from "./store"
import { get } from 'svelte/store'
import { fs, http } from "@tauri-apps/api";
import { TempFileCache } from "./TempFileCache";
import { download } from "tauri-plugin-upload-api";


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
    await this.newInstall(exeDir, selectedVersion);
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
      let downloadProgress = 0;
      
      await download(
        downloadUrl,
        tempPath,
        (progress, total) => {
          downloadProgress += progress;
          processProgress.set(downloadProgress / total * 100);
        }
      );

      // let client = await http.getClient();
      // const response = await client.get<Uint8Array>(downloadUrl, {
      //   timeout: 30,
      //   responseType: http.ResponseType.Binary,
      // });
    
      // const binaryData = response.data;
    
      // await fs.writeBinaryFile(tempPath, binaryData);
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

