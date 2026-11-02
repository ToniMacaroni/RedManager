import { writable, get } from 'svelte/store';
import { path, fs } from '@tauri-apps/api'

const GAME_PATH_KEY = "gameExePath";

export const gameExePath = writable('');
export const isPathValid = writable(false);
export const isDotnetInstalled = writable(true);

export const processing = writable(false);
export const processName = writable('');
export const processProgress = writable(0);

export type ToastKind = "info" | "success" | "error";
export type Toast = { id: number; kind: ToastKind; message: string };

export const toasts = writable<Toast[]>([]);
let nextToastId = 0;

export function notify(message: string, kind: ToastKind = "info", timeout = 5000) {
    const id = nextToastId++;
    toasts.update(t => [...t, { id, kind, message }]);
    if (timeout > 0) {
        setTimeout(() => dismissToast(id), kind === "error" ? timeout * 2 : timeout);
    }
}

export function dismissToast(id: number) {
    toasts.update(t => t.filter(toast => toast.id !== id));
}

export function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// Runs a long operation behind the loading overlay and reports failures as a toast.
// Returns true if the task completed without throwing.
export async function runTask(name: string, task: () => Promise<void>, successMessage?: string): Promise<boolean> {
    processing.set(true);
    processName.set(name);
    processProgress.set(0);

    try {
        await task();
        if (successMessage) notify(successMessage, "success");
        return true;
    } catch (error) {
        console.error(error);
        notify(errorMessage(error), "error");
        return false;
    } finally {
        processing.set(false);
    }
}

export async function setGamePath(exePath: string): Promise<boolean> {
    const valid = exePath.toLowerCase().endsWith("sonsoftheforest.exe") && await fs.exists(exePath);
    gameExePath.set(exePath);
    isPathValid.set(valid);

    if (valid) {
        try { localStorage.setItem(GAME_PATH_KEY, exePath); } catch { }
    }

    return valid;
}

export function getSavedGamePath(): string | null {
    try { return localStorage.getItem(GAME_PATH_KEY); } catch { return null; }
}

export async function getDirectoryPath(): Promise<string> {
    const exe = get(gameExePath);
    return await path.dirname(exe);
}

export async function getModsDir(): Promise<string> {
    let modsDir = await path.join(await getDirectoryPath(), "Mods");
    if(!await fs.exists(modsDir)) {
        await fs.createDir(modsDir, { recursive: true });
    }

    return modsDir;
}

export async function getLibsDir(): Promise<string> {
    let libsDir = await path.join(await getDirectoryPath(), "Libs");
    if(!await fs.exists(libsDir)) {
        await fs.createDir(libsDir, { recursive: true });
    }

    return libsDir;
}
