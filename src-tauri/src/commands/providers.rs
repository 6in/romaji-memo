use serde::Serialize;

/// Lightweight provider info returned to frontend.
#[derive(Debug, Clone, Serialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub provider_type: String,
}

/// List all configured and enabled providers.
///
/// # IPC contract
/// Frontend calls: `invoke("list_providers")`
#[tauri::command]
pub async fn list_providers(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<Vec<ProviderInfo>, String> {
    let providers = state.providers.read().await;
    let list: Vec<ProviderInfo> = providers
        .iter()
        .map(|(id, p)| ProviderInfo {
            id: id.clone(),
            name: p.name().to_string(),
            provider_type: p.provider_type().to_string(),
        })
        .collect();
    Ok(list)
}
