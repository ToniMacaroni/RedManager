import { BaseWebInstaller } from "./baseWebInstaller";
import type { GithubInfo } from "./githubInfo";

export class GithubInstaller extends BaseWebInstaller {
  private _repo: GithubInfo;

  constructor(repo: GithubInfo, name: string) {
    super(name);
    this._repo = repo;
  }

  protected async getDownloadUrl(version: string): Promise<string> {
    return this._repo.getDownloadLink(await this._repo.getLatest());
  }
}
