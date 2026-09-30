CREATE TABLE IF NOT EXISTS scores (
 player_hash TEXT PRIMARY KEY,
 public_id TEXT NOT NULL UNIQUE,
 nickname TEXT NOT NULL,
 stage INTEGER NOT NULL CHECK(stage BETWEEN 0 AND 9999),
 waves INTEGER NOT NULL CHECK(waves BETWEEN 0 AND 9),
 achieved_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS score_order ON scores(stage DESC,waves DESC,achieved_at ASC,public_id ASC);
CREATE TABLE IF NOT EXISTS endless_scores (
 player_hash TEXT PRIMARY KEY,
 public_id TEXT NOT NULL UNIQUE,
 nickname TEXT NOT NULL,
 waves INTEGER NOT NULL CHECK(waves BETWEEN 1 AND 99999),
 achieved_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS endless_score_order ON endless_scores(waves DESC,achieved_at ASC,public_id ASC);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY,
 window_start INTEGER NOT NULL,
 count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(window_start);
