import semver from "semver";

export class GithubInfo {
    private readonly _repo: string;
    private readonly _githubFileName: string;
    private _releases: string[] = [];
    private _pending: Promise<void> | null = null;

    constructor(repo: string, githubFileName: string) {
        this._repo = repo;
        this._githubFileName = githubFileName;
    }

    get apiPath(): string {
        return `https://api.github.com/repos/${this._repo}/releases`;
    }

    get downloadPath(): string {
        return `https://github.com/${this._repo}/releases/download`;
    }

    public getDownloadLink(version: string): string {
        return `${this.downloadPath}/${version}/${this._githubFileName}`;
    }

    public async fetch(): Promise<void> {
        if (this.isInitialised()) return;

        // several components ask for the latest version at once, share a single request
        this._pending ??= this.fetchReleases().finally(() => this._pending = null);
        await this._pending;
    }

    private async fetchReleases(): Promise<void> {
        let data: any[];
        try {
            const response = await fetch(this.apiPath, { headers: { Accept: "application/vnd.github+json" } });
            if (!response.ok) {
                throw new Error(`GitHub responded with ${response.status}`);
            }
            data = await response.json();
        } catch (error) {
            console.error(`Failed to fetch releases for ${this._repo}`, error);
            return;
        }

        this._releases = data
            .filter((release: any) => !release.draft && release.assets?.some((a: any) => a.name === this._githubFileName))
            .map((release: any) => release.tag_name as string);

        // tags are compared as versions so that e.g. 0.10.0 sorts above 0.9.0
        this._releases.sort((a, b) => {
            const va = semver.coerce(a), vb = semver.coerce(b);
            if (va && vb) return semver.rcompare(va, vb);
            return b.localeCompare(a);
        });
    }

    public async getLatest(): Promise<string | null> {
        await this.fetch();
        if (this._releases.length <= 0) return null;
        return this._releases[0];
    }

    public async getReleases(): Promise<string[]> {
        await this.fetch();
        return this._releases;
    }

    public isInitialised(): boolean {
        return this._releases && this._releases.length > 0;
    }
}

export let redLoaderInfo = new GithubInfo("ToniMacaroni/RedLoader", "RedLoader.zip");
export let unityExplorerInfo = new GithubInfo("ToniMacaroni/UnityExplorer_Sons", "UnityExplorer.zip");
