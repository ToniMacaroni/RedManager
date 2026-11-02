import type { BaseInstaller } from "./baseInstaller";
import { getDirectoryPath, processName } from "./store";
import { BaseUninstaller } from "./baseUninstaller";
import { GithubInstaller } from "./githubInstaller";
import { redLoaderInfo, unityExplorerInfo } from "./githubInfo";
import { fs, invoke, path } from "@tauri-apps/api";
import semver from "semver";

export enum InstallMode {
    Install,
    Uninstall,
    Update
}

export enum VersionResult {
    Equal,
    Greater,
    Lesser,
}

export class FeatureInstaller {
    private _installer: BaseInstaller | null;
    private _uninstaller: BaseUninstaller;
    private _versionCheckPath: string | null = null;

    public currentMode: InstallMode = InstallMode.Install;
    public currentModeState: string = "Install";
    public description: string | null = null;
    public uninstallWarning: string | null = null;
    public localVersion: string | null = null;

    public expectedMode: InstallMode | null = null;
    public additionalFoldersToCreate: string[] | null = null;

    constructor(installer: BaseInstaller | null, uninstaller: BaseUninstaller, versionCheckPath: string | null = null) {
        this._installer = installer;
        this._uninstaller = uninstaller;
        this._versionCheckPath = versionCheckPath;
    }

    public async install(): Promise<void> {
        if(!this._installer)
        {
            return;
        }

        await this.uninstall();
        processName.set("Installing " + this.getName() + "...");
        await this._installer.install();

        if(this.additionalFoldersToCreate)
        {
            for (const folder of this.additionalFoldersToCreate) {
                let dir = await path.join(await getDirectoryPath(), folder);
                if(!await fs.exists(dir)) {
                    await fs.createDir(dir, { recursive: true });
                }
            }
        }
    }

    public async uninstall(): Promise<void> {
        processName.set("Removing " + this.getName() + "...");
        await this._uninstaller.uninstall();
    }

    public async handle(mode: InstallMode): Promise<void> {
        try {
            switch (mode) {
                case InstallMode.Install:
                case InstallMode.Update:
                    await this.install();
                    break;
                case InstallMode.Uninstall:
                    await this.uninstall();
                    break;
            }
        } finally {
            await this.refreshMode();
        }
    }

    public async handleCurrentMode(): Promise<void> {
        await this.handle(this.getMode());
    }

    public getName(): string {
        if(this._installer)
        {
            return this._installer.getName();
        }

        return this._uninstaller.getName();
    }

    public hasInstaller(): boolean {
        return this._installer !== null;
    }

    public getMode(): InstallMode {
        return this.currentMode;
    }

    private setMode(mode: InstallMode){
        this.currentMode = mode;
        this.currentModeState = this.getModeString();
    }

    public getModeString(): string {
        switch (this.getMode()) {
            case InstallMode.Install:
                return "Install";
            case InstallMode.Update:
                return "Update";
            case InstallMode.Uninstall:
                return "Uninstall";
        }
    }

    public async refreshMode() : Promise<void> {
        this.localVersion = await this.getLocalVersion();
        if(await this._uninstaller.isInstalled()){
            if(await this.checkRemoteVersion() === VersionResult.Greater) {
                this.setMode(InstallMode.Update);
            }else {
                this.setMode(InstallMode.Uninstall);
            }
        }else {
            this.setMode(InstallMode.Install);
        }
    }

    public async checkRemoteVersion(): Promise<VersionResult | null> {
        if(!this._versionCheckPath || !this.localVersion)
        {
            return null;
        }

        let remoteVersion = await this._installer?.getTargetVersion();
        if(!remoteVersion)
        {
            return null;
        }

        const remote = semver.coerce(remoteVersion);
        const local = semver.coerce(this.localVersion);
        if(!remote || !local)
        {
            return null;
        }

        if(semver.gt(remote, local)) {
            return VersionResult.Greater;
        }else if(semver.lt(remote, local)) {
            return VersionResult.Lesser;
        }else {
            return VersionResult.Equal;
        }
    }

    async getLocalVersion(): Promise<string | null> {
        if(!this._versionCheckPath)
        {
            return null;
        }

        try {
            const versionFile = await path.join(await getDirectoryPath(), this._versionCheckPath);
            if(!await fs.exists(versionFile))
            {
                return null;
            }
            return await invoke("get_file_version", { path: versionFile });
        } catch (error) {
            console.log(error);
        }

        return null;
    }

    public async canDoAction(): Promise<boolean>{
        if(this.expectedMode === null)
        {
            return true;
        }

        return this.expectedMode === this.getMode();
    }

    public async getRemoteVersionString(): Promise<string | null> {
        return await this._installer?.getTargetVersion() ?? null;
    }
}

let loaderUninstaller = new BaseUninstaller([
    "_RedLoader"
], [
    "dobby.dll",
    "version.dll",
], "RedLoader");

let loaderInstaller = new GithubInstaller(redLoaderInfo, "RedLoader");

let ueUninstaller = new BaseUninstaller([
    "Mods\\sinai-dev-UnityExplorer",
    "Mods\\UnityExplorer"
], [
    "Mods\\UnityExplorer.dll",
], "UnityExplorer");
let ueInstaller = new GithubInstaller(unityExplorerInfo, "UnityExplorer");

export let loaderFeature = new FeatureInstaller(loaderInstaller, loaderUninstaller, "_RedLoader\\net6\\RedLoader.dll");
loaderFeature.additionalFoldersToCreate = ["Mods", "Libs"];
loaderFeature.description = "The mod loader that powers every mod in the Mods tab.";
loaderFeature.uninstallWarning = "This removes the _RedLoader folder, dobby.dll and version.dll. Your Mods folder is kept.";

export let ueFeature = new FeatureInstaller(ueInstaller, ueUninstaller);
ueFeature.description = "UnityExplorer is a modding tool which lets you analyze and manipulate the game at runtime.";

let bieUninstaller = new BaseUninstaller([
    "BepInEx"
], [
    "winhttp.dll"
], "BepInEx");
export let bieFeature = new FeatureInstaller(null, bieUninstaller);
bieFeature.expectedMode = InstallMode.Uninstall;
bieFeature.description = "An old BepInEx install was found. It conflicts with RedLoader and should be removed.";
bieFeature.uninstallWarning = "This removes the BepInEx folder and winhttp.dll.";

let melonUninstaller = new BaseUninstaller([
    "MelonLoader",
    "Mods",
    "UserData",
    "UserLibs"
], [
    "dobby.dll",
    "version.dll",
], "MelonLoader");
melonUninstaller.overrideCheckFiles = ["MelonLoader"];
export let melonFeature = new FeatureInstaller(null, melonUninstaller);
melonFeature.expectedMode = InstallMode.Uninstall;
melonFeature.description = "An old MelonLoader install was found. It conflicts with RedLoader and should be removed.";
melonFeature.uninstallWarning = "This removes the MelonLoader, Mods, UserData and UserLibs folders plus dobby.dll and version.dll. Back up any mods you want to keep first.";
