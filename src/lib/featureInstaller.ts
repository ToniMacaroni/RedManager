import { DebugInstaller } from "./debugInstaller";
import type { BaseInstaller } from "./baseInstaller";
import { processName } from "./store";
import { BaseUninstaller } from "./baseUninstaller";
import { writable } from "svelte/store";
import { GithubInstaller } from "./GithubInstaller";
import { redLoaderInfo, unityExplorerInfo } from "./githubInfo";

export enum InstallMode {
    Install,
    Uninstall,
    Update
}

export class FeatureInstaller {
    private _installer: BaseInstaller | null;
    private _uninstaller: BaseUninstaller;

    public currentMode: InstallMode = InstallMode.Install;
    public currentModeState: string = "Install";

    public expectedMode: InstallMode | null = null;

    constructor(installer: BaseInstaller | null, uninstaller: BaseUninstaller) {
        this._installer = installer;
        this._uninstaller = uninstaller;
    }

    public async install(): Promise<void> {
        if(!this._installer)
        {
            return;
        }

        await this.uninstall();
        processName.set("Installing " + this.getName() + "...");
        await this._installer.install();
    }

    public async uninstall(): Promise<void> {
        processName.set("Removing " + this.getName() + "...");
        await this._uninstaller.uninstall();
    }

    public async handle(mode: InstallMode): Promise<void> {
        switch (mode) {
            case InstallMode.Install:
                await this.install();
                break;
            case InstallMode.Uninstall:
                await this.uninstall();
                break;
        }

        await this.refreshMode();
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
            case InstallMode.Uninstall:
                return "Uninstall";
            case InstallMode.Update:
                return "Update";
        }
    }

    public async refreshMode() : Promise<void>{
        if(await this._uninstaller.isInstalled()){
            this.setMode(InstallMode.Uninstall);
        }else {
            this.setMode(InstallMode.Install);
        }
    }

    public async canDoAction(): Promise<Boolean>{
        if(!this.expectedMode)
        {
            return true;
        }

        if(this.expectedMode !== this.getMode()){
            return false;
        }

        return true;
    }
}

let loaderUninstaller = new BaseUninstaller([
    "_RedLoader"
], [
    "dobby.dll",
    "version.dll",
], "RedLoader");

let loaderDebugInstaller = new DebugInstaller("I:\\repos\\MelonLoader\\RedLoader.zip", "RedLoader");
let loaderInstaller = new GithubInstaller(redLoaderInfo, "RedLoader");

let ueUninstaller = new BaseUninstaller([
    "Mods\\sinai-dev-UnityExplorer",
    "Mods\\UnityExplorer"
], [
    "Mods\\UnityExplorer.dll",
], "UnityExplorer");
let ueInstaller = new GithubInstaller(unityExplorerInfo, "UnityExplorer");

export let debugInstaller = new FeatureInstaller(loaderDebugInstaller, loaderUninstaller);
export let loaderFeature = new FeatureInstaller(loaderInstaller, loaderUninstaller);
export let ueFeature = new FeatureInstaller(ueInstaller, ueUninstaller);

let bieUninstaller = new BaseUninstaller([
    "BepInEx"
], [
    "winhttp.dll"
], "BepInEx");
export let bieFeature = new FeatureInstaller(null, bieUninstaller);
bieFeature.expectedMode = InstallMode.Uninstall;

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