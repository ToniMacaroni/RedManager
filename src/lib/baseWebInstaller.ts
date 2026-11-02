import { BaseZipInstaller } from "./baseZipInstaller";
import { getDirectoryPath } from "./store"
import { downloadAndInstall } from "./utils";

export abstract class BaseWebInstaller extends BaseZipInstaller {
  protected constructor(name: string) {
    super(name);
  }

  public async install(): Promise<void> {
    const exeDir = await getDirectoryPath();
    const downloadUrl = await this.getDownloadUrl();
    await downloadAndInstall(exeDir, downloadUrl, this.getName());
  }

  protected abstract getDownloadUrl(): Promise<string | null>;
}
