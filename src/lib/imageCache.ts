import { invoke } from '@tauri-apps/api/tauri';

class ImageCache {
  private static cache = new Map<string, string>();
  private static loadingPromises = new Map<string, Promise<string>>();

  public static async getCachedImageUrl(url: string): Promise<string> {
    // Check memory cache first
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Check if we're already loading this URL
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Create loading promise
    const loadingPromise = this.loadImageData(url);
    this.loadingPromises.set(url, loadingPromise);

    try {
      const result = await loadingPromise;
      this.loadingPromises.delete(url);
      return result;
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  private static getShortUrl(url: string): string {
    return url.split('/').pop()?.replace('_thumbnail.png', '') || url;
  }

  private static async loadImageData(url: string): Promise<string> {
    try {
      // Get cached image data as bytes from Rust backend
      const imageBytes = await invoke<number[]>('get_cached_image_data', { url });
      
      // Convert to Uint8Array
      const uint8Array = new Uint8Array(imageBytes);
      
      // Use FileReader API for proper base64 conversion
      const blob = new Blob([uint8Array]);
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          
          // Store in memory cache
          this.cache.set(url, dataUrl);
          resolve(dataUrl);
        };
        reader.onerror = () => {
          reject(new Error('Failed to convert to data URL'));
        };
        
        // Use readAsDataURL for automatic MIME type detection and base64 encoding
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      console.error('ImageCache: Failed to process image:', error);
      
      // Don't cache error placeholders - let them retry next time
      throw error; // This will show the placeholder in the UI but allow retry
    }
  }

  public static clearMemoryCache(): void {
    this.cache.clear();
  }

  // Add method to clear both memory and disk cache
  public static async clearAllCache(): Promise<void> {
    this.cache.clear();
    this.loadingPromises.clear();
    
    try {
      const result = await invoke<string>('clear_image_cache');
    } catch (error) {
      console.error('ImageCache: Failed to clear disk cache:', error);
    }
  }

  // Add method to get cache size for debugging
  public static getCacheInfo(): { size: number, entries: number } {
    let totalSize = 0;
    for (const [url, dataUrl] of this.cache.entries()) {
      totalSize += dataUrl.length;
    }
    return { size: totalSize, entries: this.cache.size };
  }

  // Add method to force refresh a specific image
  public static async forceRefresh(url: string): Promise<string> {
    // Remove from both caches
    this.cache.delete(url);
    this.loadingPromises.delete(url);
    
    // Get fresh copy
    return this.getCachedImageUrl(url);
  }

  // Add method to preload images for better performance
  public static async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.slice(0, 10).map(url => 
      this.getCachedImageUrl(url).catch(error => {
        // Ignore individual failures during preload
      })
    );
    await Promise.all(promises);
  }
}

export default ImageCache;