// Stub — full implementation in Task 2
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionRecord {
    pub id: i64,
    pub input: String,
    pub output: String,
    pub style_id: String,
    pub intent: Option<String>,
    pub typo: Option<String>,
    pub provider_id: String,
    pub model: String,
    pub pinned: bool,
    pub created_at: String,
}

pub fn insert_conversion(
    conn: &Connection,
    input: &str,
    output: &str,
    style_id: &str,
    intent: Option<&str>,
    typo: Option<&str>,
    provider_id: &str,
    model: &str,
) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO conversions (input, output, style_id, intent, typo, provider_id, model) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![input, output, style_id, intent, typo, provider_id, model],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_history(
    conn: &Connection,
    limit: i64,
    offset: i64,
    style_filter: Option<&str>,
) -> Result<Vec<ConversionRecord>, rusqlite::Error> {
    if let Some(style) = style_filter {
        let mut stmt = conn.prepare(
            "SELECT id, input, output, style_id, intent, typo, provider_id, model, pinned, created_at FROM conversions WHERE style_id = ?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3",
        )?;
        let rows = stmt.query_map(rusqlite::params![style, limit, offset], map_row)?;
        rows.collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, input, output, style_id, intent, typo, provider_id, model, pinned, created_at FROM conversions ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![limit, offset], map_row)?;
        rows.collect()
    }
}

fn map_row(row: &rusqlite::Row<'_>) -> Result<ConversionRecord, rusqlite::Error> {
    Ok(ConversionRecord {
        id: row.get(0)?,
        input: row.get(1)?,
        output: row.get(2)?,
        style_id: row.get(3)?,
        intent: row.get(4)?,
        typo: row.get(5)?,
        provider_id: row.get(6)?,
        model: row.get(7)?,
        pinned: row.get::<_, i64>(8)? != 0,
        created_at: row.get(9)?,
    })
}
