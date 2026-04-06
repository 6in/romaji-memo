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
///
/// Handles two cases:
/// 1. Single object: `{"converted":"...","intent":"...","typo":"..."}`
/// 2. Array of objects: `[{"converted":"...","intent":"...","typo":""},...]`
///    — occurs when a long multi-paragraph text is passed to the convert command.
///    In this case the `converted` fields are joined with `\n\n` and the first
///    non-empty `intent` / `typo` values are used.
pub fn extract_json(raw: &str) -> Result<ConvertOutput, ProviderError> {
    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    // First, try parsing as a single ConvertOutput object (the common case).
    if let Ok(output) = serde_json::from_str::<ConvertOutput>(cleaned) {
        return Ok(output);
    }

    // If that fails, try parsing as an array and merge the results.
    if let Ok(items) = serde_json::from_str::<Vec<ConvertOutput>>(cleaned) {
        if !items.is_empty() {
            let converted = items
                .iter()
                .map(|i| i.converted.as_str())
                .collect::<Vec<_>>()
                .join("\n\n");
            let intent = items
                .iter()
                .find(|i| !i.intent.is_empty())
                .map(|i| i.intent.clone())
                .unwrap_or_default();
            let typo = items
                .iter()
                .find(|i| !i.typo.is_empty())
                .map(|i| i.typo.clone())
                .unwrap_or_default();
            return Ok(ConvertOutput { converted, intent, typo });
        }
    }

    // Neither worked — return the original parse error for diagnostics.
    Err(ProviderError::Parse(format!(
        "JSON parse failed: unexpected format. Raw: {}",
        &raw[..raw.len().min(200)]
    )))
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
