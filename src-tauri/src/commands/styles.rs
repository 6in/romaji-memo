use crate::db::custom_styles::CustomStyle;

#[tauri::command]
pub async fn list_styles(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<Vec<CustomStyle>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::custom_styles::get_custom_styles(&conn)
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_style(
    state: tauri::State<'_, crate::state::AppState>,
    id: String, label: String, emoji: String, prompt: String, sort_order: i64,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::custom_styles::insert_custom_style(&conn, &id, &label, &emoji, &prompt, sort_order)
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_style(
    state: tauri::State<'_, crate::state::AppState>,
    id: String, label: String, emoji: String, prompt: String,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::custom_styles::update_custom_style(&conn, &id, &label, &emoji, &prompt)
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_style(
    state: tauri::State<'_, crate::state::AppState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::custom_styles::delete_custom_style(&conn, &id)
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}
