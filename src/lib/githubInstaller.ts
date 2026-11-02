import { BaseWebInstaller } from "./baseWebInstaller";
import type { GithubInfo } from "./githubInfo";

export class GithubInstaller extends BaseWebInstaller {
  private _repo: GithubInfo;

  constructor(repo: GithubInfo, name: string) {
    super(name);
    this._repo = repo;
  }

  protected async getDownloadUrl(): Promise<string | null> {
    const latest = await this._repo.getLatest();
    if (!latest) {
      throw new Error(`Couldn't reach GitHub to find the latest ${this.getName()} release.`);
    }
    return this._repo.getDownloadLink(latest);
  }

  public getTargetVersion(): Promise<string | null> {
    return this._repo.getLatest();
  }
}
