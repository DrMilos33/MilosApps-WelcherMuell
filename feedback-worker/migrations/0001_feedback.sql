CREATE TABLE feedback_reports (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('DEV', 'PRODUCTION')),
  content_version TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('wrong', 'missing', 'unclear', 'other')),
  comment TEXT NOT NULL DEFAULT '',
  search_query TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL CHECK (language IN ('de', 'en')),
  result_url TEXT NOT NULL,
  review_state TEXT NOT NULL DEFAULT 'new' CHECK (review_state IN ('new', 'reviewing', 'resolved', 'rejected')),
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT
);

CREATE INDEX feedback_reports_created_at ON feedback_reports (created_at DESC);
CREATE INDEX feedback_reports_review_queue ON feedback_reports (review_state, created_at DESC);
CREATE INDEX feedback_reports_item_reason ON feedback_reports (item_id, reason, created_at DESC);

CREATE VIEW feedback_summary AS
SELECT
  item_id,
  item_name,
  reason,
  COUNT(*) AS report_count,
  MAX(created_at) AS latest_report_at
FROM feedback_reports
WHERE review_state IN ('new', 'reviewing')
GROUP BY item_id, item_name, reason;
