<script lang="ts">
  import ImageCache from './imageCache';
  
  let cacheInfo = { size: 0, entries: 0 };
  let isVisible = false;
  
  function togglePanel() {
    isVisible = !isVisible;
    if (isVisible) {
      updateCacheInfo();
    }
  }
  
  function updateCacheInfo() {
    cacheInfo = ImageCache.getCacheInfo();
  }
  
  async function clearMemoryCache() {
    ImageCache.clearMemoryCache();
    updateCacheInfo();
    console.log('🧹 Memory cache cleared');
  }
  
  async function clearAllCache() {
    await ImageCache.clearAllCache();
    updateCacheInfo();
    console.log('🧹 All caches cleared');
  }
  
  // Keyboard shortcut to toggle panel (Ctrl+Shift+C)
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
      togglePanel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Floating debug button -->
<button class="debug-toggle" on:click={togglePanel} title="Cache Debug (Ctrl+Shift+C)">
  🧹
</button>

{#if isVisible}
  <div class="debug-panel">
    <div class="debug-header">
      <h3>Image Cache Debug</h3>
      <button class="close-btn" on:click={togglePanel}>×</button>
    </div>
    
    <div class="cache-stats">
      <p><strong>Memory Cache:</strong></p>
      <p>Entries: {cacheInfo.entries}</p>
      <p>Size: {(cacheInfo.size / 1024 / 1024).toFixed(2)} MB</p>
    </div>
    
    <div class="debug-actions">
      <button class="cache-btn" on:click={updateCacheInfo}>📊 Refresh Stats</button>
      <button class="cache-btn" on:click={clearMemoryCache}>🧹 Clear Memory</button>
      <button class="cache-btn danger" on:click={clearAllCache}>🗑️ Clear All Cache</button>
    </div>
    
    <div class="debug-info">
      <p><strong>Server Change Detection:</strong> ✅ Active</p>
      <p><strong>Fallback:</strong> 24h time-based</p>
      <p><strong>Cache Location:</strong> AppData/Local</p>
    </div>
  </div>
{/if}

<style>
  .debug-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #333;
    color: white;
    border: 2px solid #555;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s ease;
  }
  
  .debug-toggle:hover {
    background: #555;
    transform: scale(1.1);
  }
  
  .debug-panel {
    position: fixed;
    top: 50px;
    right: 20px;
    width: 300px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 20px;
    z-index: 999;
    color: white;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  
  .debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
  }
  
  .debug-header h3 {
    margin: 0;
    color: #fff;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: #999;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
  }
  
  .close-btn:hover {
    color: #fff;
  }
  
  .cache-stats {
    margin-bottom: 15px;
    padding: 10px;
    background: #333;
    border-radius: 4px;
  }
  
  .cache-stats p {
    margin: 5px 0;
    font-size: 14px;
  }
  
  .debug-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
  }
  
  .cache-btn {
    padding: 8px 12px;
    background: #444;
    border: 1px solid #666;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;
  }
  
  .cache-btn:hover {
    background: #555;
  }
  
  .cache-btn.danger {
    background: #662222;
    border-color: #884444;
  }
  
  .cache-btn.danger:hover {
    background: #883333;
  }
  
  .debug-info {
    font-size: 12px;
    color: #aaa;
    padding-top: 10px;
    border-top: 1px solid #444;
  }
  
  .debug-info p {
    margin: 5px 0;
  }
</style>