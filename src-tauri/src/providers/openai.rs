use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::{CompletionRequest, CompletionResponse, ProviderAdapter, ProviderError, TokenUsage};

pub struct OpenAIAdapter {
    client: Client,
    base_url: String,
    api_key: String,
    model: String,
}

impl OpenAIAdapter {
    pub fn new(base_url: String, api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            api_key,
            model,
        }
    }

    /// Validate that base_url uses http or https scheme (T-01-05 mitigation).
    fn validated_completions_url(&self) -> Result<String, ProviderError> {
        let url = self.base_url.trim();
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err(ProviderError::Parse(format!(
                "base_url '{}' must start with http:// or https://. Other schemes are not permitted.",
                url
            )));
        }
        Ok(format!("{}/chat/completions", url.trim_end_matches('/')))
    }
}

// ─── OpenAI API shapes ─────────────────────────────────────────────────────────

#[derive(Serialize)]
struct OpenAIRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    messages: Vec<OpenAIMessage<'a>>,
}

#[derive(Serialize)]
struct OpenAIMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    model: String,
    usage: Option<OpenAIUsage>,
}

#[derive(Deserialize)]
struct OpenAIChoice {
    message: OpenAIChoiceMessage,
}

#[derive(Deserialize)]
struct OpenAIChoiceMessage {
    content: Option<String>,
}

#[derive(Deserialize)]
struct OpenAIUsage {
    prompt_tokens: Option<u32>,
    completion_tokens: Option<u32>,
}

// ─── ProviderAdapter impl ──────────────────────────────────────────────────────

#[async_trait::async_trait]
impl ProviderAdapter for OpenAIAdapter {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let url = self.validated_completions_url()?;

        let body = OpenAIRequest {
            model: &req.model,
            max_tokens: req.max_tokens,
            messages: vec![
                OpenAIMessage {
                    role: "system",
                    content: &req.system,
                },
                OpenAIMessage {
                    role: "user",
                    content: &req.user_message,
                },
            ],
        };

        let response = self
            .client
            .post(&url)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return Err(ProviderError::Api {
                status: status.as_u16(),
                body: body_text,
            });
        }

        let parsed: OpenAIResponse = response.json().await?;

        let text = parsed
            .choices
            .into_iter()
            .next()
            .and_then(|c| c.message.content)
            .ok_or_else(|| {
                ProviderError::Parse("No content in OpenAI response choices".to_string())
            })?;

        Ok(CompletionResponse {
            content: text,
            model: parsed.model,
            usage: parsed.usage.map(|u| TokenUsage {
                input_tokens: u.prompt_tokens,
                output_tokens: u.completion_tokens,
            }),
        })
    }

    fn name(&self) -> &str {
        "OpenAI Compatible"
    }

    fn provider_type(&self) -> &str {
        "openai"
    }

    fn model_id(&self) -> &str {
        &self.model
    }
}
