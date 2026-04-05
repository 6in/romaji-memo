/// Quit the application entirely.
/// More reliable than frontend window.close() for Accessory-policy apps on macOS.
#[tauri::command]
pub async fn quit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
    std::process::exit(0);
}

/// Toggle the always-on-top state of the main window.
/// Returns the new state (true = always on top, false = normal).
///
/// # IPC contract
/// Frontend calls: `invoke("toggle_always_on_top")`
#[tauri::command]
pub async fn toggle_always_on_top(window: tauri::WebviewWindow) -> Result<bool, String> {
    let current = window.is_always_on_top().map_err(|e| e.to_string())?;
    let new_state = !current;
    window
        .set_always_on_top(new_state)
        .map_err(|e| e.to_string())?;
    Ok(new_state)
}

/// Persist window geometry (position + size) to SQLite settings.
/// Called by frontend when the window is moved or resized.
///
/// # IPC contract
/// Frontend calls: `invoke("save_window_state", { x, y, width, height })`
#[tauri::command]
pub async fn save_window_state(
    state: tauri::State<'_, crate::state::AppState>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let json = serde_json::json!({ "x": x, "y": y, "width": width, "height": height });
    let json_str = json.to_string();
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::settings::set_setting(&conn, "window_state", &json_str)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

/// Retrieve the last saved window geometry from SQLite settings.
/// Returns the JSON string `{"x":…,"y":…,"width":…,"height":…}` or None if not set.
///
/// # IPC contract
/// Frontend calls: `invoke("get_window_state")`
#[tauri::command]
pub async fn get_window_state(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<Option<String>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::settings::get_setting(&conn, "window_state")
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}
