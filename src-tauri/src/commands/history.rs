use crate::db::conversions::ConversionRecord;

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
