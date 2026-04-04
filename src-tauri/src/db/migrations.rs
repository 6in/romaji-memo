pub const MIGRATION_001: &str = "
BEGIN;

CREATE TABLE IF NOT EXISTS conversions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  input       TEXT    NOT NULL,
  output      TEXT    NOT NULL,
  style_id    TEXT    NOT NULL,
  intent      TEXT,
  typo        TEXT,
  provider_id TEXT    NOT NULL,
  model       TEXT    NOT NULL,
  pinned      INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_styles (
  id          TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  emoji       TEXT    NOT NULL,
  prompt      TEXT    NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversions_created ON conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_style ON conversions(style_id);
CREATE INDEX IF NOT EXISTS idx_conversions_pinned ON conversions(pinned DESC, created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS conversions_fts USING fts5(input, output, content='conversions', content_rowid='id');

CREATE TRIGGER IF NOT EXISTS conversions_ai AFTER INSERT ON conversions BEGIN
  INSERT INTO conversions_fts(rowid, input, output) VALUES (new.id, new.input, new.output);
END;

CREATE TRIGGER IF NOT EXISTS conversions_ad AFTER DELETE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output) VALUES ('delete', old.id, old.input, old.output);
END;

CREATE TRIGGER IF NOT EXISTS conversions_au AFTER UPDATE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output) VALUES ('delete', old.id, old.input, old.output);
  INSERT INTO conversions_fts(rowid, input, output) VALUES (new.id, new.input, new.output);
END;

COMMIT;
";
