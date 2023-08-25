import { BaseInstaller } from "./baseInstaller";
import { unzip } from "./utils";

export class BaseZipInstaller extends BaseInstaller {

    constructor(name: string) {
        super(name);
    }

    protected async unzip(zipFile: string, destination: string) {
        console.log(`Unzipping ${zipFile} to ${destination}`);
        await unzip(zipFile, destination);
    }
}