import { fs } from '@tauri-apps/api';
import { getDirectoryPath } from './store';

export class BaseUninstaller {
    private foldersToClear: string[];
    private filesToClear: string[];
    private name: string;

    public overrideCheckFiles: string[] | null;

    constructor(
        foldersToClear: string[],
        filesToClear: string[],
        name: string
    ) {
        this.foldersToClear = foldersToClear;
        this.filesToClear = filesToClear;
        this.name = name;
    }

    protected async getFilePath(fileName: string): Promise<string> {
        const directoryPath = await getDirectoryPath();
        return `${directoryPath}/${fileName}`;
    }

    public get needsDialog(): boolean {
        return true;
    }

    public get customMessage(): string | null {
        return null;
    }

    public async uninstall(): Promise<void> {
        for (const folder of this.foldersToClear) {
            const folderPath = await this.getFilePath(folder);
            if (await fs.exists(folderPath)) {
                await fs.removeDir(folderPath, { recursive: true });
            }
        }

        for (const file of this.filesToClear) {
            const filePath = await this.getFilePath(file);
            if (await fs.exists(filePath)) {
                await fs.removeFile(filePath);
            }
        }
    }

    public async isInstalled(): Promise<boolean> {

        if (this.overrideCheckFiles) {
            for (const file of this.overrideCheckFiles) {
                const filePath = await this.getFilePath(file);
                if (await fs.exists(filePath)) {
                    return true;
                }
            }
            return false;
        }

        for (const folder of this.foldersToClear) {
            const folderPath = await this.getFilePath(folder);
            if (await fs.exists(folderPath)) {
                return true;
            }
        }

        for (const file of this.filesToClear) {
            const filePath = await this.getFilePath(file);
            if (await fs.exists(filePath)) {
                return true;
            }
        }

        return false;
    }

    public getName(): string {
        return this.name;
    }
}