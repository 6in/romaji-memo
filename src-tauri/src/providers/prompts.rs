/// Build the full system prompt for the given style_id.
/// Falls back to "standard" for unrecognised style IDs.
pub fn build_system_prompt(style_id: &str) -> String {
    let style_prompt = match style_id {
        "standard" => "自然な日本語に変換してください。",
        "polite" => "丁寧語・敬語。です・ます調で統一。",
        "osaka" => "大阪弁・関西弁。〜やん、〜ねん等を自然に使用。",
        "okama" => "おかまっぽい口調。〜わよ、〜かしら等。",
        "bushi" => "武士言葉・時代劇風。〜でござる等。",
        "gal" => "ギャル語・若者言葉。マジ、てか等。",
        "business" => "ビジネスメール敬語。〜かと存じます等。",
        "prompt" => "効果的な英語AIプロンプトに変換。意図を正確に英語で。",
        // Unknown styles fall back to standard
        _ => "自然な日本語に変換してください。",
    };

    format!(
        r#"あなたはローマ字入力を変換するエンジンです。

基本ルール：
- 入力はローマ字（ヘボン式・訓令式混在可）または英単語の混在テキストです
- スペースなしの連続ローマ字入力でも文節境界を文脈から推定して正しく変換すること（スペースは区切り記号ではなくオプション扱い）
- タイポ・打ち間違いも文脈から推測して正しく変換してください
- 大文字始まりの単語は固有名詞として英語のまま残してください
- 技術用語はカタカナ優先（saabu→サーバ等）
- 必ずJSONのみ返してください。説明・マークダウン・バッククォートは一切不要です

スタイル指示：{style_prompt}

出力形式（JSONのみ）：
{{"converted":"変換結果","intent":"この入力の意図を10文字程度で","typo":"タイポ修正内容。なければ空文字"}}"#,
        style_prompt = style_prompt
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_eight_styles_defined() {
        let styles = ["standard", "polite", "osaka", "okama", "bushi", "gal", "business", "prompt"];
        for style in &styles {
            let prompt = build_system_prompt(style);
            assert!(prompt.contains("converted"), "style '{}' missing 'converted' in prompt", style);
        }
    }

    #[test]
    fn test_unknown_style_fallback() {
        let prompt = build_system_prompt("nonexistent");
        assert!(prompt.contains("自然な日本語に変換してください。"));
    }
}
