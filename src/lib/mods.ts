import { fs, path, shell } from '@tauri-apps/api'
import type { FileEntry } from '@tauri-apps/api/fs';
import semver from 'semver';
import { getDirectoryPath, getLibsDir, getModsDir, processName } from './store';
import { downloadArchive, unzip } from './utils';

export type ModCategory = {
    name: string;
    slug: string;
}

export type ModAuthor = {
    name: string;
    slug: string;
}

export type Mod = {
    name: string;
    slug: string;
    mod_id: string;
    shortDescription: string;
    isApproved: boolean;
    category: ModCategory;
    user: ModAuthor;
    imageUrl: string;
    latestVersion: string;
    lastReleasedAt: string;
    type: string;
    dependencies: string[];

    isInstalled: boolean;
    installedMod?: InstalledMod;
    hasUpdate: boolean;
    // true when the mod only exists locally and couldn't be found on sotf-mods
    isLocalOnly?: boolean;
}

type RequestMeta = {
    limit: number;
    next_page: number;
    page: number;
    pages: number;
    prev_page: number;
    total: number;
}

export type EndpointResponse = {
    meta: RequestMeta;
    data: Mod[];
}

export type ModManifest = {
    id: string;
    author: string;
    version: string;
    type: string;
}

export type LayoutIssue = "nested" | "dll-in-game-root";

export type InstalledMod = {
    modName: string;
    isEnabled: boolean;
    manifest: ModManifest;
    // directory containing the mod's data folder
    folder: string;
    // directory containing the mod's .dll / .disabled file
    dllFolder: string;
    // set when the files aren't where RedLoader looks for them (Mods/<name>.dll + Mods/<name>/)
    layoutIssue?: LayoutIssue;
    // the Mods or Libs directory the mod belongs in
    targetFolder: string;
}

export enum Sorting {
    newest = "newest",
}

const API_ENDPOINT = "https://api.sotf-mods.com/api/";
const SITE_ENDPOINT = "https://sotf-mods.com/mods/";

function isNewerVersion(remote: string | undefined, local: string | undefined): boolean {
    if (!remote || !local) return false;
    const r = semver.coerce(remote), l = semver.coerce(local);
    if (r && l) return semver.gt(r, l);
    return remote !== local;
}

export class ModDatabase {

    private static installedMods: InstalledMod[] = [];

    public static async fetchMods(
            page: number,
            sorting: Sorting = Sorting.newest,
            approved: boolean = true,
            nsfw: boolean = false,
            searchTerm: string | null = null): Promise<EndpointResponse> {

        const params = new URLSearchParams({
            approved: String(approved),
            orderby: sorting,
            page: String(page),
            nsfw: String(nsfw),
        });

        const term = searchTerm?.trim();
        if (term) params.set("search", term);

        const result = await fetch(`${API_ENDPOINT}mods?${params}`);
        if (!result.ok) {
            throw new Error(`sotf-mods.com responded with ${result.status}`);
        }
        return await result.json();
    }

    public static async fetchMod(id: string): Promise<Mod | null> {
        try {
            const result = await fetch(API_ENDPOINT + "mods/" + encodeURIComponent(id));
            if (!result.ok) return null;
            const resultData = await result.json();
            if (resultData.status === false) return null;
            return resultData.data ?? null;
        } catch (error) {
            console.log(`failed to fetch mod ${id}`, error);
            return null;
        }
    }

    public static async getInstalledMods(): Promise<Mod[]> {
        const mods = await Promise.all(this.installedMods.map(async m => {
            const remoteMod = await this.fetchMod(m.manifest.id ?? m.modName)
                ?? (m.manifest.id !== m.modName ? await this.fetchMod(m.modName) : null);

            if (remoteMod) {
                remoteMod.isInstalled = true;
                remoteMod.installedMod = m;
                remoteMod.hasUpdate = isNewerVersion(remoteMod.latestVersion, m.manifest.version);
                return remoteMod;
            }

            return {
                name: m.modName,
                slug: m.modName,
                mod_id: m.manifest.id,
                shortDescription: "",
                isApproved: false,
                category: { name: "", slug: "" },
                imageUrl: "",
                lastReleasedAt: "",
                user: {
                    name: m.manifest.author,
                    slug: m.manifest.author
                },
                latestVersion: m.manifest.version,
                type: m.manifest.type,
                dependencies: [],
                isInstalled: true,
                installedMod: m,
                hasUpdate: false,
                isLocalOnly: true,
            } satisfies Mod
        }));

        return mods.sort((a, b) => a.name.localeCompare(b.name));
    }

    public static async openModPage(mod: Mod): Promise<void> {
        await shell.open(`${SITE_ENDPOINT}${mod.user.slug}/${mod.slug}`);
    }

    private static async readManifest(folderPath: string): Promise<ModManifest | null> {
        try {
            const manifestPath = await path.join(folderPath, "manifest.json");
            if (!(await fs.exists(manifestPath))) return null;
            return JSON.parse(await fs.readTextFile(manifestPath));
        } catch (error) {
            console.log(`failed to read manifest in ${folderPath}`, error);
            return null;
        }
    }

    // finds "<name>.dll" or "<name>.disabled" in a directory listing
    private static findDll(files: FileEntry[], name: string): { file: FileEntry, isEnabled: boolean } | null {
        const lower = name.toLowerCase();
        for (const file of files) {
            const fileName = file.name?.toLowerCase();
            if (fileName === lower + ".dll") return { file, isEnabled: true };
            if (fileName === lower + ".disabled") return { file, isEnabled: false };
        }
        return null;
    }

    private static async scanDirectory(dir: string, gameDir: string, gameFiles: FileEntry[]): Promise<InstalledMod[]> {
        let files: FileEntry[];
        try {
            files = await fs.readDir(dir);
        } catch (error) {
            console.log(`failed to read ${dir}`, error);
            return [];
        }

        const result: InstalledMod[] = [];
        const add = async (modFolder: string, dllFolder: string, isEnabled: boolean, layoutIssue?: LayoutIssue) => {
            const manifest = await this.readManifest(modFolder);
            if (!manifest) return;
            result.push({
                manifest,
                isEnabled,
                modName: await path.basename(modFolder),
                folder: await path.dirname(modFolder),
                dllFolder,
                layoutIssue,
                targetFolder: dir,
            });
        };

        for (const entry of files) {
            if (!entry.children || !entry.name) continue;

            // correct layout: Mods/<name>.dll next to Mods/<name>/
            const dll = this.findDll(files, entry.name);
            if (dll) {
                await add(entry.path, dir, dll.isEnabled);
                continue;
            }

            // dll was dropped into the game folder instead of Mods
            if (await this.readManifest(entry.path)) {
                const rootDll = this.findDll(gameFiles, entry.name);
                if (rootDll) await add(entry.path, gameDir, rootDll.isEnabled, "dll-in-game-root");
                continue;
            }

            // zip was extracted into its own folder: Mods/<wrapper>/<name>.dll + Mods/<wrapper>/<name>/
            let inner: FileEntry[];
            try {
                inner = await fs.readDir(entry.path);
            } catch {
                continue;
            }
            for (const child of inner) {
                if (!child.children || !child.name) continue;
                const innerDll = this.findDll(inner, child.name);
                if (innerDll) await add(child.path, entry.path, innerDll.isEnabled, "nested");
            }
        }

        return result;
    }

    public static async loadInstalledMods(): Promise<void> {
        const gameDir = await getDirectoryPath();
        let gameFiles: FileEntry[] = [];
        try {
            gameFiles = await fs.readDir(gameDir);
        } catch (error) {
            console.log(`failed to read ${gameDir}`, error);
        }

        const installed: InstalledMod[] = [];
        for (const dir of [await getModsDir(), await getLibsDir()]) {
            installed.push(...await this.scanDirectory(dir, gameDir, gameFiles));
        }

        this.installedMods = installed;
    }

    // moves a mod's files to Mods/<name>.dll + Mods/<name>/ so RedLoader can load it
    public static async fixLayout(mod: InstalledMod): Promise<void> {
        if (!mod.layoutIssue) return;

        const dllName = mod.modName + (mod.isEnabled ? ".dll" : ".disabled");
        const targetDll = await path.join(mod.targetFolder, dllName);
        const targetFolder = await path.join(mod.targetFolder, mod.modName);
        const sourceDll = await path.join(mod.dllFolder, dllName);
        const sourceFolder = await path.join(mod.folder, mod.modName);

        if (await fs.exists(targetDll)) throw new Error(`${targetDll} already exists.`);
        if (sourceFolder !== targetFolder && await fs.exists(targetFolder)) throw new Error(`${targetFolder} already exists.`);

        await fs.renameFile(sourceDll, targetDll);
        if (sourceFolder !== targetFolder) await fs.renameFile(sourceFolder, targetFolder);

        if (mod.layoutIssue === "nested") await this.removeIfEmpty(mod.folder);

        await this.loadInstalledMods();
    }

    private static async removeIfEmpty(dir: string): Promise<void> {
        try {
            if ((await fs.readDir(dir)).length === 0) await fs.removeDir(dir);
        } catch (error) {
            console.log(`failed to clean up ${dir}`, error);
        }
    }

    public static initModList(modList: Mod[]): void {
        modList.forEach(mod => {
            const installedMod = this.installedMods.find(m => m.manifest.id === mod.mod_id);
            mod.isInstalled = installedMod !== undefined;
            mod.installedMod = installedMod;
            mod.hasUpdate = mod.isInstalled && isNewerVersion(mod.latestVersion, installedMod?.manifest.version);
        });
    }

    public static getInstalledMod(modId: string): InstalledMod | undefined {
        return this.installedMods.find(mod => mod.manifest.id === modId || mod.modName === modId);
    }

    public static async installMod(mod: Mod, visited: Set<string> = new Set()): Promise<void> {
        visited.add(mod.mod_id);

        const modUrl = `${SITE_ENDPOINT}${mod.user.slug}/${mod.slug}/download/${mod.latestVersion}`;
        await downloadArchive(modUrl, mod.name, zipPath => this.installArchive(zipPath));

        for (const dependency of mod.dependencies ?? []) {
            if (!dependency || visited.has(dependency) || this.getInstalledMod(dependency))
                continue;

            processName.set(`Installing dependency ${dependency}...`);
            const dependencyMod = await this.fetchMod(dependency);
            if (!dependencyMod) {
                throw new Error(`${mod.name} needs "${dependency}", which couldn't be found on sotf-mods.com.`);
            }
            await this.installMod(dependencyMod, visited);
        }

        await this.loadInstalledMods();
    }

    // Mod zips on sotf-mods.com aren't consistent: some contain Mods/<name>.dll, some just <name>.dll,
    // and some wrap everything in an extra folder. Extract to a staging folder, find each
    // <name>.dll + <name>/manifest.json pair and move it to where RedLoader expects it.
    private static async installArchive(zipPath: string): Promise<void> {
        const gameDir = await getDirectoryPath();
        // staging inside the game folder keeps the final move on the same drive
        const staging = await path.join(gameDir, `_RedManagerTemp_${Date.now()}`);
        await fs.createDir(staging, { recursive: true });

        try {
            await unzip(zipPath, staging);
            const tree = await fs.readDir(staging, { recursive: true });
            const pairs = await this.findModPairs(tree, false);

            if (pairs.length === 0) {
                await this.installUnrecognized(tree, zipPath, gameDir);
                return;
            }

            for (const pair of pairs) {
                const manifest = await this.readManifest(pair.folder);
                const isLibrary = pair.inLibs || manifest?.type === "Library";
                const targetDir = isLibrary ? await getLibsDir() : await getModsDir();
                const name = await path.basename(pair.folder);

                const targetDll = await path.join(targetDir, await path.basename(pair.dll));
                const targetFolder = await path.join(targetDir, name);
                for (const stale of [targetDll, await path.join(targetDir, name + ".disabled")]) {
                    if (await fs.exists(stale)) await fs.removeFile(stale);
                }
                if (await fs.exists(targetFolder)) await fs.removeDir(targetFolder, { recursive: true });

                await fs.renameFile(pair.dll, targetDll);
                await fs.renameFile(pair.folder, targetFolder);
            }
        } finally {
            await fs.removeDir(staging, { recursive: true }).catch(console.log);
        }
    }

    private static async findModPairs(entries: FileEntry[], inLibs: boolean): Promise<{ dll: string, folder: string, inLibs: boolean }[]> {
        const pairs: { dll: string, folder: string, inLibs: boolean }[] = [];
        for (const entry of entries) {
            if (!entry.children || !entry.name) continue;

            const dll = this.findDll(entries, entry.name);
            if (dll && entry.children.some(c => c.name?.toLowerCase() === "manifest.json")) {
                pairs.push({ dll: dll.file.path, folder: entry.path, inLibs });
                continue;
            }

            pairs.push(...await this.findModPairs(entry.children, inLibs || entry.name.toLowerCase() === "libs"));
        }
        return pairs;
    }

    // archives without a manifest: keep game-relative layouts as they are, put loose dlls into Mods
    private static async installUnrecognized(tree: FileEntry[], zipPath: string, gameDir: string): Promise<void> {
        const topLevel = tree.map(e => e.name?.toLowerCase());
        if (topLevel.includes("mods") || topLevel.includes("libs")) {
            await unzip(zipPath, gameDir);
            return;
        }

        const dlls = tree.filter(e => !e.children && e.name?.toLowerCase().endsWith(".dll"));
        if (dlls.length === 0) {
            throw new Error("This mod's archive has a layout RedManager doesn't recognize. Install it manually from the mod page.");
        }

        const modsDir = await getModsDir();
        for (const dll of dlls) {
            const target = await path.join(modsDir, dll.name!);
            if (await fs.exists(target)) await fs.removeFile(target);
            await fs.renameFile(dll.path, target);
        }
    }

    private static async getPathsForMod(mod: InstalledMod): Promise<string[]> {
        const modDllPath = await path.join(mod.dllFolder, mod.modName + (mod.isEnabled ? ".dll" : ".disabled"));
        const modFolder = await path.join(mod.folder, mod.modName);
        return [modDllPath, modFolder];
    }

    public static async uninstallMod(mod: InstalledMod): Promise<void> {
        const [modDllPath, modFolder] = await this.getPathsForMod(mod);

        if (await fs.exists(modDllPath)) await fs.removeFile(modDllPath);
        if (await fs.exists(modFolder)) await fs.removeDir(modFolder, { recursive: true });
        if (mod.layoutIssue === "nested") await this.removeIfEmpty(mod.folder);

        await this.loadInstalledMods();
    }

    public static async toggleMod(mod: InstalledMod, shouldEnable: boolean): Promise<void> {
        const modDllPath = await path.join(mod.dllFolder, `${mod.modName}.dll`);
        const modDisabledPath = await path.join(mod.dllFolder, `${mod.modName}.disabled`);

        if (shouldEnable && (await fs.exists(modDisabledPath))) {
            await fs.renameFile(modDisabledPath, modDllPath);
            mod.isEnabled = true;
        } else if (!shouldEnable && (await fs.exists(modDllPath))) {
            await fs.renameFile(modDllPath, modDisabledPath);
            mod.isEnabled = false;
        }
    }
}
