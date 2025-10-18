// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::fs;
use zip::read::ZipArchive;

use std::io::{BufReader, BufRead};
use winreg::{RegKey, enums::*};
use regex::Regex;

use std::{env, error::Error, path::Path, path::PathBuf, ptr::null_mut};
use windows::{
    core,
    Win32::Storage::FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW, VS_FIXEDFILEINFO},
};

use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use image::ImageFormat;
use tokio::sync::Semaphore;
use std::sync::Arc;

// Global semaphore to limit concurrent background image checks (max 3 at a time)
static BACKGROUND_CHECK_SEMAPHORE: once_cell::sync::Lazy<Arc<Semaphore>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Semaphore::new(3)));

const SOTF_APP_ID: &str = "1326470";

#[derive(serde::Serialize)]
pub struct ModFileEntry {
    pub name: String,
    pub path: String,
    pub is_symlink: bool,
    pub target: Option<String>,
}

#[tauri::command]
fn scan_mods_directory(dir_path: String) -> Result<Vec<ModFileEntry>, String> {
    let mut entries = Vec::new();
    let dir = std::path::Path::new(&dir_path);
    let read_dir_iter = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    
    for entry in read_dir_iter {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let metadata = std::fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
        let is_symlink = metadata.file_type().is_symlink();
        let target = if is_symlink {
            std::fs::read_link(&path).ok().map(|p| p.to_string_lossy().to_string())
        } else {
            None
        };
        
        entries.push(ModFileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_symlink,
            target,
        });
    }
    
    Ok(entries)
}

#[tauri::command]
fn is_dotnet6_installed() -> Result<bool, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm.open_subkey_with_flags(
        r"SOFTWARE\WOW6432Node\dotnet\Setup\InstalledVersions\x64\sharedfx\Microsoft.NETCore.App", 
        KEY_READ
    ).map_err(|op| op.to_string())?;

    let contains_dotnet_6 = key
        .enum_values()
        .filter_map(Result::ok)
        .any(|(name, _)| name.starts_with("6."));

    Ok(contains_dotnet_6)
}

#[tauri::command]
fn get_file_version(path: String) -> Result<String, String> {
    let desc = get_file_description(path).map_err(|e| e.to_string())?;
    Ok(desc)
}

fn get_file_description(path: impl AsRef<Path>) -> Result<String, Box<dyn Error>> {
    let size = unsafe { GetFileVersionInfoSizeW(path.as_ref().as_os_str(), null_mut()) };
    if size == 0 {
        return Err(core::Error::from_win32().into());
    }

    let mut buffer = vec![0u8; size as usize];
    unsafe {
        GetFileVersionInfoW(
            path.as_ref().as_os_str(),
            0,
            size,
            buffer.as_mut_ptr() as *mut std::ffi::c_void,
        )
    }
    .ok()?;

    let mut ptr = null_mut();
    let mut len = 0;
    let success = unsafe {
        VerQueryValueW(
            buffer.as_ptr() as *const std::ffi::c_void,
            "\\",
            &mut ptr,
            &mut len,
        )
    }.as_bool();

    if !success {
        return Err("Failed to query file description".into());
    }

    let info = ptr as *const VS_FIXEDFILEINFO;
    unsafe{
        if (*info).dwSignature != 0xfeef04bd {
            return Err("Invalid fixed file info signature".into());
        }

        let description = *info;
        
        Ok(format!("{}.{}.{}", 
            description.dwFileVersionMS >> 16,
            description.dwFileVersionMS & 0xffff,
            description.dwFileVersionLS >> 16,
        ))
    }

}

#[tauri::command]
async fn get_steam_path() -> Option<String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let steam_install: PathBuf = hklm.open_subkey_with_flags(r"SOFTWARE\WOW6432Node\Valve\Steam", KEY_READ)
    .and_then(|key| key.get_value::<String, _>("InstallPath"))
    .or_else(|_| {
        hklm.open_subkey_with_flags(r"SOFTWARE\Valve\Steam", KEY_READ)
            .and_then(|key| key.get_value::<String, _>("InstallPath"))
    }).ok()?
    .into();

    let vdf = steam_install.join(r"steamapps\libraryfolders.vdf");
    if !vdf.exists() {
        return None;
    }

    let re = Regex::new(r#"\s"(?:\d|path)"\s+"(.+)""#).unwrap();
    let mut steam_paths = vec![steam_install.join(r"steamapps")];

    let file = File::open(vdf).ok()?;
    let reader = BufReader::new(file);
    for line in reader.lines() {
        if let Ok(text) = line {
            if let Some(cap) = re.captures(&text) {
                steam_paths.push(PathBuf::from(cap[1].replace(r"\\", r"\")).join(r"steamapps"));
            }
        }
    }

    let install_re = Regex::new(r#"\s"installdir"\s+"(.+)""#).unwrap();
    for path in steam_paths {
        let manifest = path.join(format!(r"appmanifest_{}.acf", SOTF_APP_ID));
        if manifest.exists() {
            let file = File::open(manifest).ok()?;
            let reader = BufReader::new(file);
            for line in reader.lines() {
                if let Ok(text) = line {
                    if let Some(cap) = install_re.captures(&text) {
                        let file_path = path.join("common").join(&cap[1]).join("SonsOfTheForest.exe");
                        if file_path.exists() {
                            return file_path.to_str().map(|s| s.to_string());
                        }
                    }
                }
            }
        }
    }

    None
}


fn unzip_file(source: &str, destination: &str) -> Result<(), String> {
    let reader = File::open(source).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(reader).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = file.mangled_name();
        let outpath = format!("{}/{}", destination, outpath.to_str().ok_or("Invalid path")?);

        if file.is_dir() {
            if !std::path::Path::new(&outpath).exists() {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            }
            continue; // Skip to the next iteration since it's a directory.
        }

        if let Some(parent_dir) = std::path::Path::new(&outpath).parent() {
            fs::create_dir_all(parent_dir).map_err(|e| e.to_string())?;
        }

        if std::path::Path::new(&outpath).exists() {
            fs::remove_file(&outpath).map_err(|e| e.to_string())?;
        }
        
        let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
        std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_cached_image(
    url: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    println!("get_cached_image: Processing URL: {}", url);
    
    // Create hash from URL for filename
    let mut hasher = DefaultHasher::new();
    url.hash(&mut hasher);
    let hash = hasher.finish();
    
    // Get cache directory
    let cache_dir = app_handle.path_resolver()
        .app_cache_dir()
        .ok_or("Could not get cache directory")?;
        
    let cache_dir = cache_dir.join("images");
    if !cache_dir.exists() {
        std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    }
    
    println!("get_cached_image: Cache directory: {:?}", cache_dir);
    
    // Determine file extension from URL
    let extension = if url.contains(".png") { "png" }
                   else if url.contains(".jpg") || url.contains(".jpeg") { "jpg" }
                   else if url.contains(".gif") { "gif" }
                   else if url.contains(".webp") { "webp" }
                   else { "jpg" }; // default
    
    let cached_file = cache_dir.join(format!("{}.{}", hash, extension));
    
    // If file exists, return the path
    if cached_file.exists() {
        println!("get_cached_image: Found cached file: {:?}", cached_file);
        return Ok(cached_file.to_string_lossy().to_string());
    }
    
    println!("get_cached_image: Downloading image from: {}", url);
    
    // Download and cache the image
    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(response) => {
            println!("get_cached_image: HTTP response status: {}", response.status());
            match response.bytes().await {
                Ok(bytes) => {
                    println!("get_cached_image: Downloaded {} bytes", bytes.len());
                    match tokio::fs::File::create(&cached_file).await {
                        Ok(mut file) => {
                            match file.write_all(&bytes).await {
                                Ok(_) => {
                                    match file.flush().await {
                                        Ok(_) => {
                                            println!("get_cached_image: Successfully cached to: {:?}", cached_file);
                                            Ok(cached_file.to_string_lossy().to_string())
                                        }
                                        Err(e) => Err(format!("Failed to flush file: {}", e))
                                    }
                                }
                                Err(e) => Err(format!("Failed to write to file: {}", e))
                            }
                        }
                        Err(e) => Err(format!("Failed to create file: {}", e))
                    }
                }
                Err(e) => Err(format!("Failed to read response bytes: {}", e))
            }
        }
        Err(e) => Err(format!("Failed to download image: {}", e))
    }
}

// Helper function to optimize images
fn optimize_image(bytes: &[u8]) -> Result<Vec<u8>, String> {
    // Load image from bytes
    let img = image::load_from_memory(bytes)
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    
    // Resize to maximum 300x200 for faster loading and lower memory usage
    // This matches the 140px height we set in CSS
    let resized = img.thumbnail(300, 200);
    
    // Convert to WebP for better compression
    let mut output = Vec::new();
    resized.write_to(&mut std::io::Cursor::new(&mut output), ImageFormat::WebP)
        .map_err(|e| format!("Failed to encode image as WebP: {}", e))?;
    
    Ok(output)
}

// Helper function to check if server file has changed
async fn check_server_file_changed(url: &str, metadata_file: &std::path::Path) -> Result<bool, String> {
    // Read stored metadata if it exists
    let stored_metadata = match std::fs::read_to_string(metadata_file) {
        Ok(content) => content,
        Err(_) => return Ok(true), // No metadata means we should download
    };
    
    // Create HTTP client with short timeout for HEAD request
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3)) // Shorter timeout
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Make HEAD request to check metadata
    let response = client.head(url).send().await
        .map_err(|e| format!("Failed to check server: {}", e))?;
    
    // Check ETag header
    if stored_metadata.starts_with("etag:") {
        let stored_etag = &stored_metadata[5..];
        if let Some(server_etag) = response.headers().get("etag") {
            if let Ok(server_etag_str) = server_etag.to_str() {
                return Ok(stored_etag != server_etag_str);
            }
        }
    }
    
    // Check Last-Modified header
    if stored_metadata.starts_with("last-modified:") {
        let stored_last_modified = &stored_metadata[14..];
        if let Some(server_last_modified) = response.headers().get("last-modified") {
            if let Ok(server_last_modified_str) = server_last_modified.to_str() {
                return Ok(stored_last_modified != server_last_modified_str);
            }
        }
    }
    
    // If we can't determine, assume it changed
    Ok(true)
}

// Helper function to download and cache an image
async fn download_and_cache_image(
    url: &str,
    cached_file: &std::path::Path,
    metadata_file: &std::path::Path,
    show_progress: bool,
) -> Result<Vec<u8>, String> {
    // Download and cache the image
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10)) // 10 second timeout
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        
    match client.get(url).send().await {
        Ok(response) => {
            if !response.status().is_success() {
                return Err(format!("HTTP error: {}", response.status()));
            }
            
            // Store server metadata for future comparisons
            if let Some(etag) = response.headers().get("etag") {
                if let Ok(etag_str) = etag.to_str() {
                    let _ = std::fs::write(metadata_file, format!("etag:{}", etag_str));
                }
            } else if let Some(last_modified) = response.headers().get("last-modified") {
                if let Ok(last_modified_str) = last_modified.to_str() {
                    let _ = std::fs::write(metadata_file, format!("last-modified:{}", last_modified_str));
                }
            } else {
                // Store current timestamp as fallback
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap().as_secs();
                let _ = std::fs::write(metadata_file, format!("timestamp:{}", timestamp));
            }
            
            match response.bytes().await {
                Ok(bytes) => {
                    if show_progress {
                        println!("📦 Downloaded {} KB", bytes.len() / 1024);
                    }
                    
                    // Process and optimize the image
                    match optimize_image(&bytes) {
                        Ok(optimized_bytes) => {
                            if show_progress {
                                let reduction = if bytes.len() > 0 {
                                    100u64.saturating_sub((optimized_bytes.len() as u64 * 100) / bytes.len() as u64)
                                } else {
                                    0
                                };
                                println!("✨ Optimized to {} KB ({}% smaller)", 
                                         optimized_bytes.len() / 1024, reduction);
                            }
                            
                            // Save optimized version to cache
                            match std::fs::write(cached_file, &optimized_bytes) {
                                Ok(_) => {
                                    if show_progress {
                                        println!("💾 Cached successfully!");
                                    }
                                    Ok(optimized_bytes)
                                }
                                Err(e) => {
                                    if show_progress {
                                        println!("⚠️  Cache write failed: {}", e);
                                    }
                                    Ok(optimized_bytes)
                                }
                            }
                        }
                        Err(e) => {
                            if show_progress {
                                println!("⚠️  Optimization failed, using original: {}", e);
                            }
                            // Fallback to original bytes if optimization fails
                            Ok(bytes.to_vec())
                        }
                    }
                }
                Err(e) => Err(format!("Failed to read response bytes: {}", e))
            }
        }
        Err(e) => Err(format!("Failed to download image: {}", e))
    }
}

#[tauri::command]
async fn get_cached_image_data(
    url: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<u8>, String> {
    // Create hash from URL for filename
    let mut hasher = DefaultHasher::new();
    url.hash(&mut hasher);
    let hash = hasher.finish();
    
    // Get cache directory
    let cache_dir = app_handle.path_resolver()
        .app_cache_dir()
        .ok_or("Could not get cache directory")?;
        
    let cache_dir = cache_dir.join("images");
    if !cache_dir.exists() {
        std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    }
    
    // Use webp for optimized cached files
    let cached_file = cache_dir.join(format!("{}_optimized.webp", hash));
    let metadata_file = cache_dir.join(format!("{}_metadata.txt", hash));
    
    // Check if cached file exists and validate against server
    if cached_file.exists() {
        // Fast path: just read and return the cached file
        // Avoid expensive metadata checks on every load
        match std::fs::read(&cached_file) {
            Ok(cached_data) => {
                // Opportunistically spawn background check (non-blocking)
                // Use try_acquire so we never block - if semaphore is full, skip this check
                let url_clone = url.clone();
                let cached_file_clone = cached_file.clone();
                let metadata_file_clone = metadata_file.clone();
                let semaphore = BACKGROUND_CHECK_SEMAPHORE.clone();
                
                tokio::spawn(async move {
                    // Check when we last verified with server (using metadata file timestamp)
                    let should_check = if metadata_file_clone.exists() {
                        if let Ok(meta) = std::fs::metadata(&metadata_file_clone) {
                            if let Ok(modified) = meta.modified() {
                                let check_age = std::time::SystemTime::now()
                                    .duration_since(modified)
                                    .unwrap_or(std::time::Duration::from_secs(0));
                                // Only check server if last check was more than 5 minutes ago
                                check_age.as_secs() >= 5 * 60
                            } else {
                                false // Can't read timestamp, skip
                            }
                        } else {
                            false // Can't read metadata, skip
                        }
                    } else {
                        true // No metadata file, first check
                    };
                    
                    if should_check {
                        // Acquire semaphore permit (waits in queue if max 3 are already running)
                        // This happens in the background, so it doesn't block returning the cached image
                        let _permit = semaphore.acquire().await.unwrap();
                        
                        if let Ok(true) = check_server_file_changed(&url_clone, &metadata_file_clone).await {
                            // Server file changed, update cache in background (silently)
                            let _ = download_and_cache_image(&url_clone, &cached_file_clone, &metadata_file_clone, false).await;
                        }
                        // Permit is automatically released when _permit is dropped
                    }
                });
                
                return Ok(cached_data);
            }
            Err(_) => {
                // Cache file exists but can't read - fall through to re-download
            }
        }
    }
    
    println!("⬇️  Downloading new image...");
    
    // Use helper function to download and cache (show progress for initial downloads)
    download_and_cache_image(&url, &cached_file, &metadata_file, true).await
}

#[tauri::command]
async fn clear_image_cache(app_handle: tauri::AppHandle) -> Result<String, String> {
    let cache_dir = app_handle.path_resolver()
        .app_cache_dir()
        .ok_or("Could not get cache directory")?
        .join("images");
    
    if cache_dir.exists() {
        match std::fs::remove_dir_all(&cache_dir) {
            Ok(_) => {
                // Recreate the directory
                std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
                Ok("Cache cleared".to_string())
            }
            Err(e) => Err(format!("Failed to clear cache: {}", e))
        }
    } else {
        Ok("Cache directory doesn't exist".to_string())
    }
}

#[tauri::command]
async fn download_with_progress(
    url: String,
    file_path: String,
    window: tauri::Window,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    let total_size = response.content_length().unwrap_or(0);
    
    // Create the file
    let mut file = tokio::fs::File::create(&file_path).await.map_err(|e| e.to_string())?;
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        
        downloaded += chunk.len() as u64;
        let progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64 * 100.0) as u32
        } else {
            0
        };
        
        // Emit progress event
        let _ = window.emit("download-progress", serde_json::json!({
            "downloaded": downloaded,
            "total": total_size,
            "progress": progress
        }));
    }
    
    file.flush().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn unzip_handler(source: String, destination: String) -> Result<(), String> {
    unzip_file(&source, &destination)
}

fn main() {
    // Startup check for _Redloader\dotnet in current directory
    let cwd = std::env::current_dir().unwrap_or_default();
    let dotnet_path = cwd.join("_Redloader").join("dotnet");
    if dotnet_path.exists() {
        println!("[WARNING] _Redloader\\dotnet detected in current directory. This may cause DLL conflicts or crashes. It is recommended to run RedModManager from its own folder.");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_cached_image, get_cached_image_data, clear_image_cache, download_with_progress, unzip_handler, get_steam_path, is_dotnet6_installed, get_file_version, scan_mods_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
