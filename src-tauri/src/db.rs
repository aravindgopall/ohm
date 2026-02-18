use rusqlite::{params, Connection};
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct Clip {
  pub id: i64,
  pub content: String,
  pub created_at: i64,
}

pub fn init_db(db_path: &Path) -> rusqlite::Result<()> {
  let conn = Connection::open(db_path)?;
  conn.execute_batch(
    r#"
    CREATE TABLE IF NOT EXISTS clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      content_hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clips_hash ON clips(content_hash);
    "#,
  )?;
  Ok(())
}

pub fn insert_clip(db_path: &Path, content: &str, created_at: i64, content_hash: &str) -> rusqlite::Result<()> {
  let conn = Connection::open(db_path)?;
  conn.execute(
    "INSERT INTO clips (content, created_at, content_hash) VALUES (?1, ?2, ?3)",
    params![content, created_at, content_hash],
  )?;
  Ok(())
}

pub fn list_clips(db_path: &Path, limit: i64, query: Option<String>) -> rusqlite::Result<Vec<Clip>> {
  let conn = Connection::open(db_path)?;
  let mut clips: Vec<Clip> = vec![];

  if let Some(q) = query.filter(|s| !s.trim().is_empty()) {
    let like = format!("%{}%", q);
    let mut stmt = conn.prepare(
      "SELECT id, content, created_at
       FROM clips
       WHERE content LIKE ?1
       ORDER BY created_at DESC
       LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![like, limit], |row| {
      Ok(Clip {
        id: row.get(0)?,
        content: row.get(1)?,
        created_at: row.get(2)?,
      })
    })?;
    for r in rows {
      clips.push(r?);
    }
  } else {
    let mut stmt = conn.prepare(
      "SELECT id, content, created_at
       FROM clips
       ORDER BY created_at DESC
       LIMIT ?1",
    )?;
    let rows = stmt.query_map(params![limit], |row| {
      Ok(Clip {
        id: row.get(0)?,
        content: row.get(1)?,
        created_at: row.get(2)?,
      })
    })?;
    for r in rows {
      clips.push(r?);
    }
  }

  Ok(clips)
}

pub fn get_clip_content(db_path: &Path, id: i64) -> rusqlite::Result<String> {
  let conn = Connection::open(db_path)?;
  let mut stmt = conn.prepare("SELECT content FROM clips WHERE id = ?1")?;
  let content: String = stmt.query_row(params![id], |row| row.get(0))?;
  Ok(content)
}
