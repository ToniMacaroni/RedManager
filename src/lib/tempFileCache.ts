import { fs, path } from "@tauri-apps/api";

export class TempFileCache {
  private static _cache: string[] = [];

  // This creates a temporary file and returns its path. It also keeps the path in an internal cache.
  public static async createFile(): Promise<string> {
    try {
      const tempFilePath = await path.join(await path.appCacheDir(), `${Date.now()}.tmp`);
      this._cache.push(tempFilePath);
      return tempFilePath;
    } catch (error) {
      console.error('Error creating temp file:', error);
      throw error;
    }
  }

  // This clears all temporary files that have been created by the createFile method.
  public static async clearCache(): Promise<void> {
    for (const filePath of this._cache) {
      try {
        if(await fs.exists(filePath))
        {
          await fs.removeFile(filePath);
        }
      } catch (error) {
        console.error(`Error deleting temp file ${filePath}:`, error);
      }
    }
    this._cache = []; // Empty the cache array
  }
}
