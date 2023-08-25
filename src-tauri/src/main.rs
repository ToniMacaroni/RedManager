// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::fs;
use zip::read::ZipArchive;

use std::io::{BufReader, BufRead};
use std::path::PathBuf;
use winreg::RegKey;
use winreg::enums::*;
use regex::Regex;

const SOTF_APP_ID: &str = "1326470";

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
        let outpath = file.sanitized_name();
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
fn unzip_handler(source: String, destination: String) -> Result<(), String> {
    unzip_file(&source, &destination)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![unzip_handler, get_steam_path])
        .plugin(tauri_plugin_upload::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
