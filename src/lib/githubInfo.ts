export class GithubInfo {
    private readonly _repo: string;
    private readonly _githubFileName: string;
    private _releases: string[] = [];

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

        const headers = new Headers();
        headers.append("User-Agent", "Tauri App");

        let response;
        try {
            response = await fetch(this.apiPath, { headers: headers });
            if (!response.ok) {
                throw new Error('Failed to fetch data from GitHub');
            }
        } catch (error) {
            console.error(error);
            return;
        }

        const data = await response.json();

        if (data.length <= 0) return;

        this._releases = [];

        data.forEach((release: any) => {
            const assets = release.assets;
            if (assets.length <= 0) return;

            const version = release.tag_name;

            this._releases.push(version);
        });

        this._releases.sort().reverse();
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