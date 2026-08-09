-- Offene Schwerpunkte: häufigste Kombinationen zuerst.
SELECT item_id, item_name, reason, report_count, latest_report_at
FROM feedback_summary
ORDER BY report_count DESC, latest_report_at DESC;

-- Neueste noch ungeprüfte Meldungen.
SELECT id, created_at, content_version, item_id, item_name, reason,
       search_query, comment, language, result_url
FROM feedback_reports
WHERE review_state = 'new'
ORDER BY created_at DESC
LIMIT 100;

-- Beispiel zum Abschließen einer geprüften Meldung:
-- UPDATE feedback_reports
-- SET review_state = 'resolved', review_notes = 'In Inhaltsversion … korrigiert', reviewed_at = datetime('now')
-- WHERE id = '…';
