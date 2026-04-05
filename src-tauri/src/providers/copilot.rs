use crate::providers::{
    CompletionRequest, CompletionResponse, ProviderAdapter, ProviderError, TokenUsage,
};
use serde::{Deserialize, Serialize};

const GITHUB_CLIENT_ID: &str = "Iv1.b507a08c87ecfe98"; // VS Code Copilot client ID
const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const COPILOT_TOKEN_URL: &str = "https://api.github.com/copilot_internal/v2/token";
const COPILOT_CHAT_URL: &str = "https://api.githubcopilot.com/chat/completions";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct OAuthTokenResponse {
    access_token: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct CopilotTokenResponse {
    token: String,
    #[allow(dead_code)]
    expires_at: u64,
}

pub struct CopilotAdapter {
    oauth_token: String,
    model: String,
    client: reqwest::Client,
}

impl CopilotAdapter {
    pub fn new(oauth_token: String, model: String) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to build reqwest client");
        Self { oauth_token, model, client }
    }

    async fn get_copilot_token(&self) -> Result<String, ProviderError> {
        let resp = self.client
            .get(COPILOT_TOKEN_URL)
            .header("Authorization", format!("token {}", self.oauth_token))
            .header("User-Agent", "romaji-memo/0.1.0")
            .send()
            .await?;
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Api { status, body });
        }
        let token_resp: CopilotTokenResponse = resp.json().await
            .map_err(|e| ProviderError::Parse(format!("Copilot token parse error: {}", e)))?;
        Ok(token_resp.token)
    }
}

#[async_trait::async_trait]
impl ProviderAdapter for CopilotAdapter {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let copilot_token = self.get_copilot_token().await?;
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": req.system },
                { "role": "user", "content": req.user_message },
            ],
            "max_tokens": req.max_tokens,
            "temperature": 0.3,
        });
        let resp = self.client
            .post(COPILOT_CHAT_URL)
            .header("Authorization", format!("Bearer {}", copilot_token))
            .header("Content-Type", "application/json")
            .header("User-Agent", "romaji-memo/0.1.0")
            .header("Editor-Version", "vscode/1.90.0")
            .header("Copilot-Integration-Id", "vscode-chat")
            .json(&body)
            .send()
            .await?;
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Api { status, body });
        }
        let json: serde_json::Value = resp.json().await
            .map_err(|e| ProviderError::Parse(e.to_string()))?;
        let content = json["choices"][0]["message"]["content"]
            .as_str().unwrap_or("").to_string();
        let model = json["model"].as_str().unwrap_or(&self.model).to_string();
        Ok(CompletionResponse {
            content, model,
            usage: Some(TokenUsage {
                input_tokens: json["usage"]["prompt_tokens"].as_u64().map(|v| v as u32),
                output_tokens: json["usage"]["completion_tokens"].as_u64().map(|v| v as u32),
            }),
        })
    }
    fn name(&self) -> &str { "GitHub Copilot" }
    fn provider_type(&self) -> &str { "copilot" }
    fn model_id(&self) -> &str { &self.model }
}

/// Start GitHub Device Flow OAuth — returns device code info for the UI to display.
pub async fn start_device_flow() -> Result<DeviceCodeResponse, ProviderError> {
    let client = reqwest::Client::new();
    let body = format!(
        "client_id={}&scope=read:user",
        GITHUB_CLIENT_ID
    );
    let resp = client.post(DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await?;
    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        return Err(ProviderError::Api { status, body });
    }
    let result: DeviceCodeResponse = resp.json().await
        .map_err(|e| ProviderError::Parse(e.to_string()))?;
    Ok(result)
}

/// Poll GitHub token endpoint until authorization is granted or an error occurs.
/// Returns the OAuth access token on success.
pub async fn poll_for_token(device_code: &str, interval: u64) -> Result<String, ProviderError> {
    let client = reqwest::Client::new();
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(interval)).await;
        let body = format!(
            "client_id={}&device_code={}&grant_type=urn:ietf:params:oauth:grant-type:device_code",
            GITHUB_CLIENT_ID, device_code
        );
        let resp = client.post(TOKEN_URL)
            .header("Accept", "application/json")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(body)
            .send()
            .await?;
        let token_resp: OAuthTokenResponse = resp.json().await
            .map_err(|e| ProviderError::Parse(e.to_string()))?;
        if let Some(token) = token_resp.access_token { return Ok(token); }
        match token_resp.error.as_deref() {
            Some("authorization_pending") => continue,
            Some("slow_down") => {
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            }
            Some(e) => return Err(ProviderError::Parse(format!("OAuth error: {}", e))),
            None => continue,
        }
    }
}
