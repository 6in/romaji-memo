use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomStyle {
    pub id: String,
    pub label: String,
    pub emoji: String,
    pub prompt: String,
    pub sort_order: i64,
    pub created_at: String,
}

pub fn get_custom_styles(conn: &Connection) -> Result<Vec<CustomStyle>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, label, emoji, prompt, sort_order, created_at FROM custom_styles ORDER BY sort_order ASC, created_at ASC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(CustomStyle {
            id: row.get(0)?,
            label: row.get(1)?,
            emoji: row.get(2)?,
            prompt: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn insert_custom_style(
    conn: &Connection,
    id: &str, label: &str, emoji: &str, prompt: &str, sort_order: i64,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO custom_styles (id, label, emoji, prompt, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, label, emoji, prompt, sort_order],
    )?;
    Ok(())
}

pub fn update_custom_style(
    conn: &Connection,
    id: &str, label: &str, emoji: &str, prompt: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE custom_styles SET label = ?2, emoji = ?3, prompt = ?4 WHERE id = ?1",
        rusqlite::params![id, label, emoji, prompt],
    )?;
    Ok(())
}

pub fn delete_custom_style(conn: &Connection, id: &str) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM custom_styles WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}
