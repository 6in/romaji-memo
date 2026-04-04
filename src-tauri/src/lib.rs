mod db;
mod providers;
mod state;

use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{Mutex, RwLock};
use tauri::Manager;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("failed to resolve app data directory");
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app data directory");

            let conn = db::open_db(&app_data_dir)
                .expect("failed to open database");

            let app_state = AppState {
                db: Arc::new(Mutex::new(conn)),
                providers: RwLock::new(HashMap::new()),
                keychain_lock: Mutex::new(()),
            };

            app.manage(app_state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
