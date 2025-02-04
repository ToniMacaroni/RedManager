import { app, fs, path} from '@tauri-apps/api'
import { getDirectoryPath, getLibsDir, getModsDir, processName, processProgress } from './store';
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
    imageUrl: string;
    latest_version: string;
    lastReleasedAt: string;
    type: string;
    dependencies: string[];

    isInstalled: boolean;
    installedMod?: InstalledMod;
    hasUpdate: boolean;
}

type RequestMeta = {
    limit: number;
    next_page: number;
    page: number;
    pages: number;
    prev_page: number;
    total: number;
}

type EndpointResponse = {
    meta: RequestMeta;
    data: Mod[];
}

export type ModManifest = {
    id: string;
    author: string;
    version: string;
    type: string;
}

export type InstalledMod = {
    modName: string;
    isEnabled: boolean;
    manifest: ModManifest;
}

export type ModList = {
    mods: any[];
}

export enum Sorting {
    newest = "newest",
}

const ENDPOINT = "https://api.sotf-mods.com/api/";

export class ModDatabase {

    private static mods: Mod[] = [];
    private static unapprovedMods: Mod[] | null;
    private static nsfwMods: Mod[] | null;
    private static installedMods: InstalledMod[] = [];

    public static async fetchMods(
            page: number, 
            sorting: Sorting = Sorting.newest,
            approved: boolean = true, 
            nsfw: boolean = false,
            searchTerm: string | null = null): Promise<EndpointResponse> {

        let url = `${ENDPOINT}mods?&approved=${approved}&orderby=${sorting}&page=${page}&nsfw=${nsfw}`;
        if(searchTerm) searchTerm = searchTerm.trim();
        if(searchTerm && searchTerm !== "")
        {
            url += "&search=" + searchTerm;
        }

        let result = await fetch(url);
        return await result.json();
    }

    public static async fetchMod(id: string): Promise<Mod | null> {
        let result = await fetch("https://api.sotf-mods.com/api/mods/" + id);
        let resultData = await result.json();
        if(resultData.status === false){
            return null;
        }

        return resultData.data;
    }

    public static async fetchAllMods(sorting: Sorting = Sorting.newest, approved: boolean = true, nsfw: boolean = false): Promise<Mod[]> {
        processName.set("Getting initial mod page");
        processProgress.set(0);
        let result = await this.fetchMods(1, sorting, approved, nsfw);
        let meta = result.meta;
        let mods = result.data as Mod[];

        if(meta.pages > 1) {
            for(let i = 2; i <= meta.pages; i++) {
                try {
                    processName.set(`Getting mod page ${i}/${meta.pages}`);
                    let pageResult = await this.fetchMods(i, sorting, approved, nsfw);
                    mods = mods.concat(pageResult.data);
                    processProgress.set(i / meta.pages * 100);
                } catch (error) {
                    showMessageBox("Error", `Failed to load mods page ${i}: ${error}!`);
                    break;
                }
            }
        }

        return mods;
    }

    public static getMods(): Mod[] {
        return this.mods;
    }

    public static async getInstalledMods(): Promise<Mod[]> {
        return await Promise.all(this.installedMods.map(async m=>{
            let remoteMod = await this.fetchMod(m.modName);
            if( remoteMod ) {
                remoteMod.isInstalled = true;
                remoteMod.installedMod = m;
                return remoteMod;
            }


            return {
                name: m.modName,
                mod_id: m.manifest.id,
                user_name: m.manifest.author,
                latest_version: m.manifest.version,
                isInstalled: true,
                installedMod: m
            } as Mod
        }));
    }

    public static async getUnapprovedMods(force: boolean = false): Promise<Mod[]> {
        if(!this.unapprovedMods || this.unapprovedMods.length === 0 || force) {
            let mods = await this.fetchAllMods(Sorting.newest, false);
            this.unapprovedMods = mods;
        }

        return this.unapprovedMods;
    }

    public static async getNsfwMods(force: boolean = false): Promise<Mod[]> {
        if(!this.nsfwMods || this.nsfwMods.length === 0 || force) {
            let mods = await this.fetchAllMods(Sorting.newest, true, true);
            this.nsfwMods = mods;
        }

        return this.nsfwMods;
    }

    public static async loadMods(force: boolean = false): Promise<void> {
        if (!this.mods || this.mods.length === 0 || force) {
            this.mods = await this.fetchAllMods();
        }
    }

    public static openModPage(mod: Mod): void {
        window.open(`https://sotf-mods.com/mods/${mod.user_slug}/${mod.slug}`);
    }

    private static async initInstalledMod(folderPath: string, isEnabled: boolean): Promise<InstalledMod | null> {
        try {
            let modManifestPath = await path.join(folderPath, "manifest.json");
            let modManifest = await fs.readTextFile(modManifestPath);
            let manifest = JSON.parse(modManifest);
            return {
                manifest: manifest,
                isEnabled: isEnabled,
                modName: await path.basename(folderPath)
            }
        } catch (error) {
            console.log(`failed to load mod ${await path.basename(folderPath)}`, error);
            return null;
        }
    }

    public static async loadInstalledMods(): Promise<void> {
        this.installedMods = [];

        let modPath = await path.join(await getDirectoryPath(), "Mods");
        let libPath = await path.join(await getDirectoryPath(), "Libs");
        let files = await fs.readDir(modPath);
        files = files.concat(await fs.readDir(libPath));

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if(file.name?.endsWith(".dll") || file.name?.endsWith(".disabled")){
                let isEnabled = file.name?.endsWith(".dll");
                let folderName = file.name?.replace(".dll", "").replace(".disabled", "");
                let folderPath = await path.join(await path.dirname(file.path), folderName);

                if(!(await fs.exists(folderPath)))
                {
                    console.log("folder does not exist for mod", folderName);
                    continue;
                }

                let mod = await this.initInstalledMod(folderPath, isEnabled);
                if(mod)
                    this.installedMods.push(mod);
            }
        }
    }

    public static async refreshAll(forceRefresh: boolean): Promise<void> {

        // making sure the mods and libs directory exists
        processName.set("Checking mods directory");
        await getModsDir();
        await getLibsDir();

        processName.set("Retrieving mods");
        await this.loadMods(forceRefresh);
        
        processName.set("Checking installed mods");
        await this.loadInstalledMods();

        processName.set("Updating mod list");
        this.mods.forEach(mod => {
            let installedMod = this.installedMods.find(installedMod => installedMod.manifest.id === mod.mod_id);
            mod.isInstalled = installedMod !== undefined;
            mod.installedMod = installedMod;
            mod.hasUpdate = mod.isInstalled && installedMod?.manifest.version !== mod.latest_version;
        });
    }

    public static async initDatabase(): Promise<void> {
        if (this.installedMods.length !== 0) {
            return;
        }

        await this.loadInstalledMods();
    }

    public static initModList(modList: Mod[]): void {
        modList.forEach(mod => {
            let installedMod = this.installedMods.find(installedMod => installedMod.manifest.id === mod.mod_id);
            mod.isInstalled = installedMod !== undefined;
            mod.installedMod = installedMod;
            mod.hasUpdate = mod.isInstalled && installedMod?.manifest.version !== mod.latest_version;
        });
    }

    public static async loadPage(page: number): Promise<void> {
        await this.initDatabase();
        let res = await this.fetchMods(page);
        
    }

    public static getInstalledMod(modId: string): InstalledMod | undefined {
        return this.installedMods.find(mod => mod.modName === modId);
    }

    public static async installMod(mod: Mod): Promise<void> {
        let gamePath = await getDirectoryPath();
        let modUrl = `https://sotf-mods.com/mods/${mod.user_slug}/${mod.slug}/download/${mod.latest_version}`;
        await downloadAndInstall(gamePath, modUrl, mod.name);

        for (const dependency of mod.dependencies) {
            if(!dependency || dependency.length === 0) 
                continue;
            
            await showMessageBox("Installing dependency", `Installing dependency ${dependency} for mod ${mod.name} (a refresh may be needed to show the dependency as installed)`);

            let dependencyMod = await this.fetchMod(dependency);
            if(dependencyMod) {
                await this.installMod(dependencyMod);
            }
        }

        //await this.refreshAll(false);
    }

    private static async getPathsForMod(mod: InstalledMod): Promise<string[]> {
        let gamePath = await getDirectoryPath();

        let subFolder = mod.manifest.type == "Mod" ? "Mods" : "Libs";
        let modDllPath = await path.join(gamePath, subFolder, mod.modName + (mod.isEnabled ? ".dll" : ".disabled"));
        let modFolder = await path.join(gamePath, subFolder, mod.modName);

        return [modDllPath, modFolder];
    }

    public static async uninstallMod(mod: InstalledMod): Promise<void> {
        let [modDllPath, modFolder] = await this.getPathsForMod(mod);

        if(await fs.exists(modDllPath)) await fs.removeFile(modDllPath);
        if(await fs.exists(modFolder)) await fs.removeDir(modFolder, { recursive: true });

        //await this.refreshAll(false);
    }

    public static async toggleMod(mod: InstalledMod, shouldEnable: boolean): Promise<void> {
        let modPath = await getDirectoryPath();
        let modDllPath = await path.join(modPath, "Mods", `${mod.modName}.dll`);
        let modDisabledPath = await path.join(modPath, "Mods", `${mod.modName}.disabled`);

        if(shouldEnable && (await fs.exists(modDisabledPath))) {
            await fs.renameFile(modDisabledPath, modDllPath);
            mod.isEnabled = true;
        } else if(!shouldEnable && (await fs.exists(modDllPath))) {
            await fs.renameFile(modDllPath, modDisabledPath);
            mod.isEnabled = false;
        }
    }
}