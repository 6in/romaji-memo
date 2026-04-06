// Prompt validation: spike must be run manually before Wave 4 (Plans 05-06).
// Run: cargo test --test prompt_spike -- --nocapture
// See tests/prompt_spike.rs for full validation details and 15 test cases.
// Gate: >=80% (12/15) space-free romaji segmentation accuracy required.

/// Build the full system prompt for the given style_id.
/// Falls back to "standard" for unrecognised style IDs.
/// recent_history: 直近の変換履歴 (input, output) のスライス。空なら履歴セクションなし。
pub fn build_system_prompt(style_id: &str, recent_history: &[(&str, &str)]) -> String {
    // 英語モードは専用プロンプト（日本語ベースルールを使わない）
    if style_id == "prompt" {
        let history_section = if recent_history.is_empty() {
            String::new()
        } else {
            let entries: Vec<String> = recent_history
                .iter()
                .map(|(input, output)| format!("- \"{}\" → \"{}\"", input, output))
                .collect();
            format!(
                "\nRecent context (use for consistency):\n{}\n",
                entries.join("\n")
            )
        };
        return format!(
            r#"You are a romaji-to-English conversion engine.

Rules:
- Input is romaji (Japanese romanization) or mixed romaji/English text
- Convert the input to natural English
- Infer word boundaries even without spaces (e.g. "watashihanihongo" → "I speak Japanese")
- Correct typos based on context
- Proper nouns starting with uppercase remain as-is (e.g. Google, iPhone)
- Return JSON only. No explanations, no markdown, no backticks
{history_section}
Output format (JSON only):
{{"converted":"English result","intent":"brief intent in ~5 words","typo":"typo correction if any, else empty"}}"#,
            history_section = history_section,
        );
    }

    let style_prompt = match style_id {
        "standard" => "自然な日本語に変換してください。",
        "polite" => "丁寧語・敬語。です・ます調で統一。",
        "osaka" => "大阪弁・関西弁。〜やん、〜ねん等を自然に使用。",
        "okama" => "おかまっぽい口調。〜わよ、〜かしら等。",
        "bushi" => "武士言葉・時代劇風。〜でござる等。",
        "gal" => "ギャル語・若者言葉。マジ、てか等。",
        "business" => "ビジネスメール・ビジネス文書向けの正式な敬語表現に変換。\
「〜していただけますでしょうか」「〜かと存じます」「〜させていただきます」\
「お世話になっております」「ご確認のほどよろしくお願いいたします」等を適切に使用。\
主語・述語を明確にし、受動態を多用した丁寧な文体にすること。",
        // Unknown styles fall back to standard
        _ => "自然な日本語に変換してください。",
    };

    let history_section = if recent_history.is_empty() {
        String::new()
    } else {
        let entries: Vec<String> = recent_history
            .iter()
            .map(|(input, output)| format!("- 「{}」→「{}」", input, output))
            .collect();
        format!(
            "\n直近の変換文脈（参考にして一貫性を保ってください）：\n{}\n",
            entries.join("\n")
        )
    };

    format!(
        r#"あなたはローマ字入力を変換するエンジンです。

基本ルール：
- 入力はローマ字（ヘボン式・訓令式混在可）または英単語の混在テキストです
- 入力がすでに日本語（ひらがな・カタカナ・漢字を含む）の場合は、ローマ字変換は不要。スタイル指示に従って文体・口調を変換してください
- スペースなしの連続ローマ字入力でも文節境界を文脈から推定して正しく変換すること（スペースは区切り記号ではなくオプション扱い）
- タイポ・打ち間違いも文脈から推測して正しく変換してください
- 大文字始まりの単語は固有名詞として英語のまま残してください（例: Google, iPhone）
- 日本語で一般的にカタカナ表記される外来語・英語単語はカタカナに変換すること（例: meeting→ミーティング、server→サーバー、computer→コンピューター、project→プロジェクト、schedule→スケジュール、file→ファイル 等）
- 技術用語はカタカナ優先（saabu→サーバ等）
- 必ずJSONのみ返してください。説明・マークダウン・バッククォートは一切不要です

スタイル指示：{style_prompt}
{history_section}
出力形式（JSONのみ）：
{{"converted":"変換結果","intent":"この入力の意図を10文字程度で","typo":"タイポ修正内容。なければ空文字"}}"#,
        style_prompt = style_prompt,
        history_section = history_section,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_eight_styles_defined() {
        let styles = ["standard", "polite", "osaka", "okama", "bushi", "gal", "business", "prompt"];
        for style in &styles {
            let prompt = build_system_prompt(style, &[]);
            assert!(prompt.contains("converted"), "style '{}' missing 'converted' in prompt", style);
        }
    }

    #[test]
    fn test_unknown_style_fallback() {
        let prompt = build_system_prompt("nonexistent", &[]);
        assert!(prompt.contains("自然な日本語に変換してください。"));
    }

    #[test]
    fn test_with_recent_history() {
        let history = [("kaigi no jikan", "会議の時間"), ("sugu modoru", "すぐ戻る")];
        let prompt = build_system_prompt("standard", &history);
        assert!(prompt.contains("直近の変換文脈（参考にして一貫性を保ってください）："));
        assert!(prompt.contains("「kaigi no jikan」→「会議の時間」"));
        assert!(prompt.contains("「sugu modoru」→「すぐ戻る」"));
    }

    #[test]
    fn test_empty_history_no_section() {
        let prompt = build_system_prompt("standard", &[]);
        assert!(!prompt.contains("直近の変換文脈"));
    }
}
