use crate::db::conversions::ConversionRecord;
use crate::db::settings;

/// Return paginated conversion history records.
///
/// # IPC contract
/// Frontend calls: `invoke("get_history", { limit, offset, style_filter })`
///
/// style_filter is optional; when provided only records with matching style_id are returned.
/// All DB access via spawn_blocking — never blocks async runtime.
#[tauri::command]
pub async fn get_history(
    state: tauri::State<'_, crate::state::AppState>,
    limit: i64,
    offset: i64,
    style_filter: Option<String>,
) -> Result<Vec<ConversionRecord>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::conversions::get_history(&conn, limit, offset, style_filter.as_deref())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_history(
    state: tauri::State<'_, crate::state::AppState>,
    query: String,
    style_filter: Option<String>,
    limit: i64,
    offset: i64,
) -> Result<Vec<ConversionRecord>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::conversions::search_history(&conn, &query, style_filter.as_deref(), limit, offset)
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pin_history(
    state: tauri::State<'_, crate::state::AppState>,
    id: i64,
    pinned: bool,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::conversions::pin_conversion(&conn, id, pinned)
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_history(
    state: tauri::State<'_, crate::state::AppState>,
    id: i64,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::conversions::delete_conversion(&conn, id)
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_history_limit(
    state: tauri::State<'_, crate::state::AppState>,
    limit: i64,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        settings::set_setting(&conn, "history_limit", &limit.to_string())?;
        crate::db::conversions::enforce_history_limit(&conn, limit)?;
        Ok::<(), rusqlite::Error>(())
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_history_limit(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<i64, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        match settings::get_setting(&conn, "history_limit")? {
            Some(v) => v.parse::<i64>().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e))),
            None => Ok(1000), // default
        }
    })
    .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())
}
