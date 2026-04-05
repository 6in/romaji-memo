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
            "SELECT id, input, output, style_id, intent, typo, provider_id, model, pinned, created_at FROM conversions WHERE style_id = ?1 ORDER BY pinned DESC, created_at DESC LIMIT ?2 OFFSET ?3",
        )?;
        let rows = stmt.query_map(rusqlite::params![style, limit, offset], map_row)?;
        rows.collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, input, output, style_id, intent, typo, provider_id, model, pinned, created_at FROM conversions ORDER BY pinned DESC, created_at DESC LIMIT ?1 OFFSET ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![limit, offset], map_row)?;
        rows.collect()
    }
}

pub fn search_history(
    conn: &Connection,
    query: &str,
    style_filter: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<ConversionRecord>, rusqlite::Error> {
    // trigram は 3 文字未満にマッチしないので LIKE フォールバック
    if query.chars().count() < 3 {
        let like_pattern = format!("%{}%", query);
        if let Some(style) = style_filter {
            let mut stmt = conn.prepare(
                "SELECT id, input, output, style_id, intent, typo, provider_id, model, pinned, created_at
                 FROM conversions
                 WHERE (input LIKE ?1 OR output LIKE ?1) AND style_id = ?2
                 ORDER BY pinned DESC, created_at DESC
                 LIMIT ?3 OFFSET ?4"
            )?;
            stmt.query_map(rusqlite::params![like_pattern, style, limit, offset], map_row)?.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, input, output, style_id, intent, typo, provider_id, model, pinned, created_at
                 FROM conversions
                 WHERE input LIKE ?1 OR output LIKE ?1
                 ORDER BY pinned DESC, created_at DESC
                 LIMIT ?2 OFFSET ?3"
            )?;
            stmt.query_map(rusqlite::params![like_pattern, limit, offset], map_row)?.collect()
        }
    } else {
        let fts_query = format!("\"{}\"", query.replace('"', ""));
        if let Some(style) = style_filter {
            let mut stmt = conn.prepare(
                "SELECT c.id, c.input, c.output, c.style_id, c.intent, c.typo,
                        c.provider_id, c.model, c.pinned, c.created_at
                 FROM conversions c
                 JOIN conversions_fts f ON f.rowid = c.id
                 WHERE f.conversions_fts MATCH ?1 AND c.style_id = ?2
                 ORDER BY c.pinned DESC, c.created_at DESC
                 LIMIT ?3 OFFSET ?4"
            )?;
            stmt.query_map(rusqlite::params![fts_query, style, limit, offset], map_row)?.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT c.id, c.input, c.output, c.style_id, c.intent, c.typo,
                        c.provider_id, c.model, c.pinned, c.created_at
                 FROM conversions c
                 JOIN conversions_fts f ON f.rowid = c.id
                 WHERE f.conversions_fts MATCH ?1
                 ORDER BY c.pinned DESC, c.created_at DESC
                 LIMIT ?2 OFFSET ?3"
            )?;
            stmt.query_map(rusqlite::params![fts_query, limit, offset], map_row)?.collect()
        }
    }
}

pub fn pin_conversion(conn: &Connection, id: i64, pinned: bool) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE conversions SET pinned = ?1 WHERE id = ?2",
        rusqlite::params![pinned as i64, id],
    )?;
    Ok(())
}

pub fn delete_conversion(conn: &Connection, id: i64) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM conversions WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

pub fn enforce_history_limit(conn: &Connection, limit: i64) -> Result<u64, rusqlite::Error> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM conversions", [], |r| r.get(0))?;
    if count > limit {
        let excess = count - limit;
        let deleted = conn.execute(
            "DELETE FROM conversions WHERE id IN (
                SELECT id FROM conversions WHERE pinned = 0 ORDER BY created_at ASC LIMIT ?1
            )",
            rusqlite::params![excess],
        )?;
        Ok(deleted as u64)
    } else {
        Ok(0)
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
