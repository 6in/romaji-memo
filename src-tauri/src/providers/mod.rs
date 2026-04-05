pub mod anthropic;
pub mod copilot;
pub mod openai;
pub mod prompts;

use serde::{Deserialize, Serialize};

// ─── Request / Response types ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionRequest {
    pub system: String,
    pub user_message: String,
    pub model: String,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
}

/// JSON output from the AI conversion request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvertOutput {
    pub converted: String,
    pub intent: String,
    pub typo: String,
}

// ─── Provider configuration (from providers.json) ────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    /// "anthropic" | "openai"
    pub adapter: String,
    pub base_url: Option<String>,
    /// "<encrypted>" placeholder or "ollama" for no-auth local providers
    pub api_key: Option<String>,
    pub model: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvidersFile {
    pub providers: Vec<ProviderConfig>,
    pub default_provider: String,
}

// ─── Error type ────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("API error (status {status}): {body}")]
    Api { status: u16, body: String },
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("No API key configured for provider '{0}'. Run setup command in README.")]
    NoApiKey(String),
}

// ─── Adapter trait ─────────────────────────────────────────────────────────────

#[async_trait::async_trait]
pub trait ProviderAdapter: Send + Sync {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError>;
    fn name(&self) -> &str;
    fn provider_type(&self) -> &str;
    /// Return the model identifier used for CompletionRequest.model.
    fn model_id(&self) -> &str;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/// Strip markdown code fences from LLM output and parse as ConvertOutput JSON.
pub fn extract_json(raw: &str) -> Result<ConvertOutput, ProviderError> {
    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    serde_json::from_str(cleaned).map_err(|e| {
        ProviderError::Parse(format!(
            "JSON parse failed: {}. Raw: {}",
            e,
            &raw[..raw.len().min(200)]
        ))
    })
}

/// Embedded default providers config (used as fallback when providers.json is absent).
const DEFAULT_PROVIDERS_JSON: &str = include_str!("../../../providers.json");

/// Load providers config from `app_data_dir/providers.json`.
/// Falls back to the embedded default if the file is missing.
pub fn load_providers_config(
    app_data_dir: &std::path::Path,
) -> Result<ProvidersFile, String> {
    let path = app_data_dir.join("providers.json");
    let json = if path.exists() {
        std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read providers.json: {}", e))?
    } else {
        // Copy the default config to the app data dir on first run.
        std::fs::write(&path, DEFAULT_PROVIDERS_JSON)
            .map_err(|e| format!("Failed to write default providers.json: {}", e))?;
        DEFAULT_PROVIDERS_JSON.to_string()
    };
    serde_json::from_str(&json).map_err(|e| format!("Failed to parse providers.json: {}", e))
}
