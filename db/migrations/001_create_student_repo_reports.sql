CREATE TABLE IF NOT EXISTS student_repo_reports (
  id                    SERIAL PRIMARY KEY,
  intern_name           VARCHAR(100) NOT NULL,
  repo                  TEXT NOT NULL,
  report_date           DATE NOT NULL,
  run_at                TIMESTAMPTZ NOT NULL,
  run_mode              VARCHAR(10) NOT NULL DEFAULT 'real',
  is_active             BOOLEAN NOT NULL DEFAULT false,
  commit_count          INTEGER NOT NULL DEFAULT 0,
  score_understanding   NUMERIC(4,1),
  score_implementation  NUMERIC(4,1),
  score_code_quality    NUMERIC(4,1),
  score_effort          NUMERIC(4,1),
  score_overall         NUMERIC(4,1),
  risk_flag             VARCHAR(50),
  summary               TEXT,
  strengths             JSONB,
  mistakes              JSONB,
  suggestions           JSONB,
  learning_feedback     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intern_name, report_date)
);

CREATE INDEX IF NOT EXISTS idx_srr_intern_date ON student_repo_reports (intern_name, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_srr_date ON student_repo_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_srr_risk ON student_repo_reports (risk_flag) WHERE risk_flag IS NOT NULL AND risk_flag <> 'none';
