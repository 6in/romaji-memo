use serde::Serialize;

/// Return value sent to the frontend after a successful conversion.
#[derive(Debug, Clone, Serialize)]
pub struct ConvertResult {
    pub converted: String,
    pub intent: String,
    pub typo: String,
    pub history_id: i64,
}

/// Convert romaji input to the requested style using the specified provider.
///
/// # IPC contract
/// Frontend calls: `invoke("convert", { input, style_id, provider_id })`
///
/// # Security (T-01-08, T-01-09, T-01-10)
/// - style_id is validated via build_system_prompt default fallback (unknown → standard)
/// - provider_id validated by map lookup (unknown → error returned to frontend)
/// - All DB writes use parameterized queries in db::conversions module
/// - RwLock read guard is dropped before the async provider.complete() call
///   to avoid holding the lock across an await point
#[tauri::command]
pub async fn convert(
    state: tauri::State<'_, crate::state::AppState>,
    input: String,
    style_id: String,
    provider_id: String,
) -> Result<ConvertResult, String> {
    // 1. Get provider Arc from RwLock map (drop lock before await)
    let provider = {
        let providers = state.providers.read().await;
        providers
            .get(&provider_id)
            .cloned()
            .ok_or_else(|| format!("Provider '{}' not found or not configured", provider_id))?
    };
    // Lock is dropped here — safe to await below

    // 2. Build system prompt on Rust side (style_id validated; unknown → standard fallback)
    let system = crate::providers::prompts::build_system_prompt(&style_id);

    // 3. Create CompletionRequest using the adapter's model
    let model = provider.model_id().to_string();
    let req = crate::providers::CompletionRequest {
        system,
        user_message: input.clone(),
        model: model.clone(),
        max_tokens: 1024,
    };

    // 4. Call provider (async — no locks held during network I/O)
    let response = provider.complete(req).await.map_err(|e| e.to_string())?;

    // 5. Parse AI response JSON (defensive: extract_json strips markdown fences)
    let output = crate::providers::extract_json(&response.content).map_err(|e| e.to_string())?;

    // 6. Save to history via spawn_blocking — NEVER block async runtime with rusqlite
    let db = state.db.clone();
    let input_clone = input.clone();
    let style_clone = style_id.clone();
    let provider_clone = provider_id.clone();
    let model_clone = response.model.clone();
    let converted_clone = output.converted.clone();
    let intent_clone = output.intent.clone();
    let typo_clone = output.typo.clone();
    let history_id = tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        crate::db::conversions::insert_conversion(
            &conn,
            &input_clone,
            &converted_clone,
            &style_clone,
            if intent_clone.is_empty() {
                None
            } else {
                Some(intent_clone.as_str())
            },
            if typo_clone.is_empty() {
                None
            } else {
                Some(typo_clone.as_str())
            },
            &provider_clone,
            &model_clone,
        )
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    // 7. Return result to frontend
    Ok(ConvertResult {
        converted: output.converted,
        intent: output.intent,
        typo: output.typo,
        history_id,
    })
}
