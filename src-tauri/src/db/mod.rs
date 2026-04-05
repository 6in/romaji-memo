pub mod conversions;
pub mod migrations;
pub mod settings;

use rusqlite::Connection;

/// Open (or create) the SQLite database at `app_data_dir/romaji-memo.db`.
/// Sets WAL mode, synchronous=NORMAL, foreign_keys=ON, then runs migrations.
pub fn open_db(app_data_dir: &std::path::Path) -> Result<Connection, rusqlite::Error> {
    let db_path = app_data_dir.join("romaji-memo.db");
    let conn = Connection::open(&db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA synchronous=NORMAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    run_migrations(&conn)?;

    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(migrations::MIGRATION_001)?;
        conn.execute_batch("PRAGMA user_version = 1;")?;
    }

    if version < 2 {
        conn.execute_batch(migrations::MIGRATION_002)?;
        conn.execute_batch("PRAGMA user_version = 2;")?;
    }

    Ok(())
}
