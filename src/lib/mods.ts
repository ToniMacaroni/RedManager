import { fs, path} from '@tauri-apps/api'
import { getDirectoryPath, getModsDir, processName, processProgress } from './store';
import { downloadAndInstall, showMessageBox } from './utils';

export type Mod = {
    name: string;
    slug: string;
    mod_id: string;
    short_description: string;
    isApproved: boolean;
    category_name: string;
    category_slug: string;
    user_name: string;
    user_slug: string;
    thumbnail_url: string;
    latest_version: string;
    time_ago: string;

    isInstalled: boolean;
    installedMod?: InstalledMod;
}

type RequestMeta = {
    limit: number;
    next_page: number;
    page: number;
    pages: number;
    prev_page: number;
    total: number;
}

export type ModManifest = {
    id: string;
    author: string;
    version: string;
}

export type InstalledMod = {
    dllName: string;
    isEnabled: boolean;
    manifest: ModManifest;
}

export type ModList = {
    mods: any[];
}

const ENDPOINT = "https://api.sotf-mods.com/api/";
const MODS_ENDPOINT = `${ENDPOINT}mods?&approved=true&orderby=newest`;

export class ModDatabase {

    private static mods: Mod[] = [];
    private static installedMods: InstalledMod[] = [];

    public static getMods(): Mod[] {
        return this.mods;
    }

    // public static getOnlyInstalledMods(): Mod[] {
    //     return this.mods.filter(mod => this.installedMods.find(installedMod => installedMod.manifest.id === mod.mod_id));
    // }

    // public static getOnlyOnlineMods(): Mod[] {
    //     return this.mods.filter(mod => !this.installedMods.find(installedMod => installedMod.manifest.id === mod.mod_id));
    // }

    public static async loadMods(): Promise<void> {
        processName.set("Getting initial mod page");
        processProgress.set(0);
        let result = await (await fetch(MODS_ENDPOINT)).json();
        let meta = result.meta;
        let mods = result.mods as Mod[];

        if(meta.pages > 1) {
            for(let i = 2; i <= meta.pages; i++) {
                try {
                    processName.set(`Getting mod page ${i}/${meta.pages}`);
                    let pageResult = await (await fetch(`${MODS_ENDPOINT}&page=${i}`)).json();
                    mods = mods.concat(pageResult.mods);
                    processProgress.set(i / meta.pages * 100);
                } catch (error) {
                    showMessageBox("Error", `Failed to load mods page ${i}: ${error}!`);
                    break;
                }
            }
        }

        this.mods = mods;
    }

    public static async loadModsIfEmpty(): Promise<void> {
        if (!this.mods || this.mods.length === 0) {
            await this.loadMods();
        }
    }

    public static openModPage(mod: Mod): void {
        window.open(`https://sotf-mods.com/mods/${mod.user_slug}/${mod.slug}`);
    }

    public static async initInstalledMod(dllPath: string, isEnabled: boolean): Promise<InstalledMod> {
        let modManifestPath = await path.join(dllPath, "manifest.json");
        let modManifest = await fs.readTextFile(modManifestPath);
        let manifest = JSON.parse(modManifest);
        return {
            manifest: manifest,
            isEnabled: isEnabled,
            dllName: await path.basename(dllPath)
        }
    }

    public static async loadInstalledMods(): Promise<void> {
        this.installedMods = [];

        let modPath = await path.join(await getDirectoryPath(), "Mods");
        let files = await fs.readDir(modPath);
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if(file.name?.endsWith(".dll") || file.name?.endsWith(".disabled")){
                let isEnabled = file.name?.endsWith(".dll");
                let mod = await this.initInstalledMod(file.path.replace(".dll", "").replace(".disabled", ""), isEnabled);
                this.installedMods.push(mod);
            }
        }
    }

    public static async refreshAll(forceRefresh: boolean): Promise<void> {

        // making sure the mods directory exists
        processName.set("Checking mods directory");
        await getModsDir();

        processName.set("Retrieving mods");
        if(forceRefresh) {
            await this.loadMods();
        } else {
            await this.loadModsIfEmpty();
        }
        
        processName.set("Checking installed mods");
        await this.loadInstalledMods();

        processName.set("Updating mod list");
        this.mods.forEach(mod => {
            let installedMod = this.installedMods.find(installedMod => installedMod.manifest.id === mod.mod_id);
            mod.isInstalled = installedMod !== undefined;
            mod.installedMod = installedMod;
        });
    }

    public static getInstalledMod(modId: string): InstalledMod | undefined {
        return this.installedMods.find(mod => mod.dllName === modId);
    }

    public static async installMod(mod: Mod): Promise<void> {
        let modPath = await getDirectoryPath();
        let modUrl = `https://sotf-mods.com/mods/${mod.user_slug}/${mod.slug}/download/${mod.latest_version}`;
        await downloadAndInstall(modPath, modUrl, mod.name);

        await this.refreshAll(false);
    }

    public static async uninstallMod(mod: InstalledMod): Promise<void> {
        let modPath = await getDirectoryPath();
        let modDllPath = await path.join(modPath, "Mods", mod.dllName + (mod.isEnabled ? ".dll" : ".disabled"));
        let modFolder = await path.join(modPath, "Mods", mod.dllName);
        if(await fs.exists(modDllPath)) await fs.removeFile(modDllPath);
        if(await fs.exists(modFolder)) await fs.removeDir(modFolder, { recursive: true });

        await this.refreshAll(false);
    }

    public static async toggleMod(mod: InstalledMod, shouldEnable: boolean): Promise<void> {
        let modPath = await getDirectoryPath();
        let modDllPath = await path.join(modPath, "Mods", `${mod.dllName}.dll`);
        let modDisabledPath = await path.join(modPath, "Mods", `${mod.dllName}.disabled`);

        if(shouldEnable && (await fs.exists(modDisabledPath))) {
            await fs.renameFile(modDisabledPath, modDllPath);
            mod.isEnabled = true;
        } else if(!shouldEnable && (await fs.exists(modDllPath))) {
            await fs.renameFile(modDllPath, modDisabledPath);
            mod.isEnabled = false;
        }
    }
}