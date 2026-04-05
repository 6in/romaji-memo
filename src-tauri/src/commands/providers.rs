use serde::Serialize;
use crate::providers::{ProviderConfig, ProvidersFile};

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

#[tauri::command]
pub async fn get_provider_config(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<ProvidersFile, String> {
    let app_data_dir = state.app_data_dir.clone();
    tokio::task::spawn_blocking(move || {
        crate::providers::load_providers_config(&app_data_dir)
    })
    .await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn upsert_provider(
    state: tauri::State<'_, crate::state::AppState>,
    config: ProviderConfig,
) -> Result<(), String> {
    let app_data_dir = state.app_data_dir.clone();
    // API キーが実値なら Keychain に保存
    if let Some(ref key) = config.api_key {
        if key != "<encrypted>" && !key.is_empty() && key != "ollama" {
            crate::keychain::set_api_key(&state.keychain_lock, &config.id, key)?;
        }
    }
    // providers.json を更新 (api_key は "<encrypted>" に置換)
    tokio::task::spawn_blocking(move || {
        let mut pf = crate::providers::load_providers_config(&app_data_dir)?;
        let mut save_config = config.clone();
        // "<encrypted>" に正規化 (ollama 等を除く)
        if save_config.api_key.as_deref() != Some("ollama") && save_config.api_key.as_deref() != Some("") {
            save_config.api_key = Some("<encrypted>".to_string());
        }
        if let Some(existing) = pf.providers.iter_mut().find(|p| p.id == save_config.id) {
            *existing = save_config;
        } else {
            pf.providers.push(save_config);
        }
        let json = serde_json::to_string_pretty(&pf).map_err(|e| e.to_string())?;
        let path = app_data_dir.join("providers.json");
        std::fs::write(&path, json).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })
    .await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_provider(
    state: tauri::State<'_, crate::state::AppState>,
    provider_id: String,
) -> Result<(), String> {
    let app_data_dir = state.app_data_dir.clone();
    // Keychain エントリ削除 (エラーは無視 — エントリがない場合もある)
    let _ = crate::keychain::delete_api_key(&state.keychain_lock, &provider_id);
    tokio::task::spawn_blocking(move || {
        let mut pf = crate::providers::load_providers_config(&app_data_dir)?;
        pf.providers.retain(|p| p.id != provider_id);
        let json = serde_json::to_string_pretty(&pf).map_err(|e| e.to_string())?;
        std::fs::write(app_data_dir.join("providers.json"), json).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })
    .await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ping_provider(
    base_url: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let url = format!("{}/models", base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;
    let mut req = client.get(&url);
    if let Some(ref key) = api_key {
        if !key.is_empty() && key != "ollama" {
            req = req.bearer_auth(key);
        }
    }
    match req.send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if status == 200 || status == 401 {
                Ok("ok".to_string())
            } else {
                Err(format!("HTTP {}", status))
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn set_active_provider(
    state: tauri::State<'_, crate::state::AppState>,
    provider_id: String,
) -> Result<(), String> {
    let app_data_dir = state.app_data_dir.clone();
    tokio::task::spawn_blocking(move || {
        let mut pf = crate::providers::load_providers_config(&app_data_dir)?;
        pf.default_provider = provider_id;
        let json = serde_json::to_string_pretty(&pf).map_err(|e| e.to_string())?;
        std::fs::write(app_data_dir.join("providers.json"), json).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })
    .await.map_err(|e| e.to_string())?
}
