mod commands;
mod db;
pub mod keychain;
pub mod providers;
mod state;

use std::collections::HashMap;
use std::sync::Arc;
use tauri::Manager;
use std::sync::Mutex;
use tokio::sync::RwLock;

use providers::ProviderAdapter;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::convert::convert,
            commands::history::get_history,
            commands::providers::list_providers,
            commands::window::quit_app,
            commands::window::toggle_always_on_top,
            commands::window::save_window_state,
            commands::window::get_window_state,
        ])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app data directory");

            // Open SQLite database with WAL mode + migrations
            let conn = db::open_db(&app_data_dir).expect("failed to open database");

            // Load providers config from app_data_dir/providers.json (or embedded default)
            let providers_config = providers::load_providers_config(&app_data_dir)
                .expect("failed to load providers config");

            // Initialize provider adapters — fetch API keys from OS Keychain
            // Keychain access must happen synchronously here (setup hook is not async).
            let keychain_lock: Mutex<()> = Mutex::new(());
            let mut providers_map: HashMap<String, Arc<dyn ProviderAdapter + Send + Sync>> =
                HashMap::new();

            for p in &providers_config.providers {
                if !p.enabled {
                    continue;
                }

                // Resolve API key: "<encrypted>" → Keychain lookup; other values → use as-is
                let api_key: Option<String> = if p.api_key.as_deref() == Some("<encrypted>") {
                    match keychain::get_api_key(&keychain_lock, &p.id) {
                        Ok(key) => key,
                        Err(e) => {
                            eprintln!(
                                "[romaji-memo] Warning: Keychain read failed for provider '{}': {}",
                                p.id, e
                            );
                            None
                        }
                    }
                } else {
                    // Non-encrypted value (e.g. "ollama" for no-auth local providers)
                    p.api_key.clone().filter(|k| !k.is_empty())
                };

                // If API key is required but missing, skip adapter creation.
                // The convert command will return ProviderError::NoApiKey at call time (D-09).
                let adapter: Arc<dyn ProviderAdapter + Send + Sync> = match p.adapter.as_str() {
                    "anthropic" => {
                        let key = match api_key {
                            Some(k) => k,
                            None => {
                                eprintln!(
                                    "[romaji-memo] Warning: No API key for Anthropic provider '{}'. \
                                     Configure with: security add-generic-password -s \"romaji-memo\" -a \"{}\" -w \"<API_KEY>\"",
                                    p.id, p.id
                                );
                                continue;
                            }
                        };
                        Arc::new(providers::anthropic::AnthropicAdapter::new(
                            key,
                            p.model.clone(),
                        ))
                    }
                    "openai" => {
                        let base_url = p.base_url.clone().unwrap_or_else(|| {
                            "https://api.openai.com/v1".to_string()
                        });
                        // For Ollama/LM Studio: no API key needed; use empty string
                        let key = api_key.unwrap_or_default();
                        Arc::new(providers::openai::OpenAIAdapter::new(
                            base_url,
                            key,
                            p.model.clone(),
                        ))
                    }
                    other => {
                        eprintln!(
                            "[romaji-memo] Warning: Unknown adapter type '{}' for provider '{}', skipping.",
                            other, p.id
                        );
                        continue;
                    }
                };

                providers_map.insert(p.id.clone(), adapter);
            }

            let app_state = AppState {
                db: Arc::new(tokio::sync::Mutex::new(conn)),
                providers: RwLock::new(providers_map),
                keychain_lock,
            };

            app.manage(app_state);

            // Restore window position/size from saved settings
            if let Some(window) = app.get_webview_window("main") {
                let state = app.state::<AppState>();
                let db = state.db.blocking_lock();
                if let Ok(Some(json_str)) = db::settings::get_setting(&db, "window_state") {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                        let x = val["x"].as_i64().unwrap_or(0) as i32;
                        let y = val["y"].as_i64().unwrap_or(0) as i32;
                        let width = val["width"].as_u64().unwrap_or(420) as u32;
                        let height = val["height"].as_u64().unwrap_or(600) as u32;

                        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                        let _ = window.set_size(tauri::PhysicalSize::new(width, height));
                    }
                }

                // Set visible on all workspaces (macOS: show on every Space)
                let _ = window.set_visible_on_all_workspaces(true);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
