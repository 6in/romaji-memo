//! Prompt validation spike — CONV-03 space-free romaji segmentation
//!
//! Run with: cargo test --test prompt_spike -- --nocapture
//! Requires: API key in OS Keychain for at least one provider
//!   macOS: security add-generic-password -s "romaji-memo" -a "anthropic" -w "<API_KEY>"
//!
//! GATE: Wave 4 (Plans 05-06) should not start until this spike
//! documents >=80% correct segmentation across test cases.
//!
//! Validation result: Spike must be run with a real API key before Wave 4.
//! If no provider is available, test skips with a documented message.
//! Once run: update the header comment with date and accuracy.

use romaji_editor_lib::providers::{
    anthropic::AnthropicAdapter, extract_json, prompts::build_system_prompt, CompletionRequest,
    ProviderAdapter,
};

/// Test cases: (input_romaji, expected_substring_in_output, description)
/// expected is empty string for "any output acceptable" cases.
const TEST_CASES: &[(&str, &str, &str)] = &[
    // Basic segmentation
    ("korehadouda", "これはどうだ", "basic sentence boundary"),
    (
        "watashiwagenkinanoni",
        "私は元気なのに",
        "wa particle vs watashi boundary",
    ),
    (
        "konnichiwaogenkindesuka",
        "こんにちは",
        "greeting segmentation",
    ),
    (
        "kyouhaiitenkindesune",
        "今日はいい天気ですね",
        "multi-boundary",
    ),
    (
        "ashitaameshinpai",
        "明日",
        "no-particle compression (明日 expected)",
    ),
    // Mixed romaji + English
    (
        "korehaReactdeimplementshimasu",
        "React",
        "English proper noun preserved",
    ),
    (
        "TaurinoAPIwoyobimasuyo",
        "Tauri",
        "English tech term preserved",
    ),
    (
        "konokodohaJavaScriptgasukida",
        "JavaScript",
        "mixed language",
    ),
    // Ambiguous boundaries
    (
        "tokyoniikou",
        "東京に行こう",
        "place name + particle",
    ),
    (
        "nihongogahanasemasen",
        "日本語が話せません",
        "long compound",
    ),
    // Style variations (polite)
    (
        "sumimasengashitsumondesuga",
        "すみません",
        "polite prefix",
    ),
    // Edge cases
    ("aaa", "", "minimal input — any output acceptable"),
    (
        "saabanosettoapuwoshimasu",
        "サーバ",
        "katakana technical term",
    ),
    (
        "korehamondainashidesu",
        "問題なし",
        "compound adjective",
    ),
    (
        "emailwookurimashita",
        "メール",
        "English loanword as katakana",
    ),
];

/// Try to get an API key from OS Keychain for the given provider_id.
/// Returns None if no key is found (without OS Keychain operations in test threads,
/// we use direct keyring calls here since there's no AppState in tests).
fn get_test_api_key(provider_id: &str) -> Option<String> {
    use keyring::Entry;
    let entry = Entry::new("romaji-memo", provider_id).ok()?;
    entry.get_password().ok()
}

#[tokio::test]
async fn prompt_spike_segmentation() {
    // Try Anthropic first, then Ollama (no key needed for local)
    let provider: Option<Box<dyn ProviderAdapter>> = if let Some(key) =
        get_test_api_key("anthropic")
    {
        println!("[prompt_spike] Using AnthropicAdapter (key found in Keychain)");
        Some(Box::new(AnthropicAdapter::new(
            key,
            "claude-3-5-haiku-20241022".to_string(),
        )))
    } else {
        println!("[prompt_spike] No Anthropic API key found in Keychain.");
        println!("[prompt_spike] To run this spike:");
        println!(
            "[prompt_spike]   macOS: security add-generic-password -s \"romaji-memo\" -a \"anthropic\" -w \"<API_KEY>\""
        );
        println!("[prompt_spike]   Windows: cmdkey /add:romaji-memo-anthropic /user:api_key /pass:<API_KEY>");
        println!("[prompt_spike] GATE: Wave 4 (Plans 05-06) requires this spike to pass at >=80% before starting.");
        println!("[prompt_spike] Skipping spike — no provider available.");
        None
    };

    let Some(provider) = provider else {
        // No provider available — document that spike must be run manually
        // Do NOT panic: skip gracefully so CI without credentials still passes
        return;
    };

    let system = build_system_prompt("standard");
    let mut pass_count = 0usize;
    let mut results: Vec<(String, String, String, bool)> = Vec::new();

    for &(input, expected, _description) in TEST_CASES {
        let req = CompletionRequest {
            system: system.clone(),
            user_message: input.to_string(),
            model: provider.name().to_string(),
            max_tokens: 512,
        };

        let result = provider.complete(req).await;

        let (actual, passed) = match result {
            Err(e) => {
                let msg = format!("ERROR: {}", e);
                // Empty expected = any output acceptable
                let ok = expected.is_empty();
                (msg, ok)
            }
            Ok(response) => match extract_json(&response.content) {
                Err(e) => {
                    let msg = format!("PARSE_ERROR: {} | raw: {}", e, &response.content[..response.content.len().min(100)]);
                    (msg, expected.is_empty())
                }
                Ok(output) => {
                    let passed = expected.is_empty() || output.converted.contains(expected);
                    (output.converted.clone(), passed)
                }
            },
        };

        if passed {
            pass_count += 1;
        }

        results.push((
            input.to_string(),
            expected.to_string(),
            actual,
            passed,
        ));
    }

    // Print results table
    println!("\n{:-<90}", "");
    println!(
        "{:<35} {:<20} {:<25} {}",
        "Input", "Expected", "Actual", "Pass"
    );
    println!("{:-<90}", "");
    for (input, expected, actual, passed) in &results {
        let actual_display = if actual.chars().count() > 22 {
            format!("{}...", actual.chars().take(20).collect::<String>())
        } else {
            actual.clone()
        };
        let expected_display = if expected.is_empty() {
            "(any)".to_string()
        } else {
            expected.clone()
        };
        println!(
            "{:<35} {:<20} {:<25} {}",
            &input[..input.len().min(33)],
            expected_display,
            actual_display,
            if *passed { "PASS" } else { "FAIL" }
        );
    }
    println!("{:-<90}", "");

    let total = TEST_CASES.len();
    let accuracy = (pass_count as f64 / total as f64) * 100.0;
    println!(
        "\nResults: {}/{} passed ({:.1}%)",
        pass_count, total, accuracy
    );

    if pass_count < 12 {
        println!("\n[GATE FAILED] Accuracy {:.1}% < 80%. Prompt in prompts.rs needs iteration.", accuracy);
        println!("Suggestions:");
        println!("  1. Add example input/output pairs to the system prompt");
        println!("  2. Strengthen boundary inference instructions");
        println!("  3. Explicit instruction: 'statelessly infer word boundaries from romaji phonetics'");
        println!("  4. Re-run spike until >=80% passes");
    } else {
        println!("\n[GATE PASSED] Accuracy {:.1}% >= 80%. Wave 4 unblocked.", accuracy);
    }

    assert!(
        pass_count >= 12,
        "Prompt spike FAILED: {}/{} ({:.1}%) — Wave 4 gate requires >=80% (12/15). See output above for details.",
        pass_count,
        total,
        accuracy
    );
}
