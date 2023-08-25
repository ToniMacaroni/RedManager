import { BaseZipInstaller } from "./baseZipInstaller";
import { getDirectoryPath } from "./store";

export class DebugInstaller extends BaseZipInstaller {
    private readonly _zipFile: string;

    constructor(zipFile: string, name: string) {
        super(name);
        this._zipFile = zipFile;
    }

    public async install(): Promise<void> {
        await this.unzip(this._zipFile, await getDirectoryPath());
    }
}
