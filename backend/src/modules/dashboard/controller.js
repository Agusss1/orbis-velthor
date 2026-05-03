const { query } = require('../../config/database');
const { success, error } = require('../../utils/response');

exports.stats = async (req, res) => {
  try {
    const [users, areas, expedientes, surveys, pins, messages] = await Promise.all([
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM users'),
      query('SELECT COUNT(*) as total FROM areas WHERE is_active = TRUE'),
      query(`SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'draft') as draft,
              COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
              COUNT(*) FILTER (WHERE status = 'approved') as approved,
              COUNT(*) FILTER (WHERE status = 'rejected') as rejected
             FROM expedientes`),
      query(`SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'active') as active,
              SUM((SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id)) as total_responses
             FROM surveys s`),
      query('SELECT COUNT(*) as total FROM pins WHERE is_active = TRUE'),
      query("SELECT COUNT(*) as total FROM messages WHERE created_at > NOW() - INTERVAL '24 hours'"),
    ]);

    const areaActivity = await query(
      `SELECT a.id, a.name, a.color,
              (SELECT COUNT(*) FROM area_members WHERE area_id = a.id) as members,
              (SELECT COUNT(*) FROM expedientes WHERE area_id = a.id) as expedientes,
              (SELECT COUNT(*) FROM documents WHERE area_id = a.id AND is_active = TRUE) as documents,
              (SELECT MAX(created_at) FROM audit_logs WHERE metadata->>'area_id' = a.id::text) as last_activity
       FROM areas a WHERE a.is_active = TRUE
       ORDER BY a.created_at DESC LIMIT 6`
    );

    const surveyTrend = await query(
      `SELECT DATE_TRUNC('day', submitted_at) as day, COUNT(*) as count
       FROM survey_responses
       WHERE submitted_at > NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day`
    );

    return success(res, {
      users: users.rows[0],
      areas: areas.rows[0],
      expedientes: expedientes.rows[0],
      surveys: surveys.rows[0],
      pins: pins.rows[0],
      messages_today: messages.rows[0],
      area_activity: areaActivity.rows,
      survey_trend: surveyTrend.rows,
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to load dashboard stats');
  }
};

exports.recentActivity = async (req, res) => {
  const { limit = 20 } = req.query;
  try {
    const result = await query(
      `SELECT al.*, u.full_name, u.role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to get activity');
  }
};

exports.alerts = async (req, res) => {
  const alerts = [];

  try {
    // Inactive areas (no activity in 7+ days)
    const inactiveAreas = await query(
      `SELECT a.id, a.name FROM areas a
       WHERE a.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM audit_logs al
         WHERE al.entity_type IN ('expedientes','documents')
         AND al.created_at > NOW() - INTERVAL '7 days'
         AND al.metadata->>'area_id' = a.id::text
       )
       AND a.created_at < NOW() - INTERVAL '7 days'
       LIMIT 5`
    );

    for (const area of inactiveAreas.rows) {
      alerts.push({ type: 'warning', entity: 'area', id: area.id, message: `Area "${area.name}" has had no activity in 7+ days` });
    }

    // Surveys closing soon
    const closingSurveys = await query(
      `SELECT id, title, closes_at FROM surveys
       WHERE status = 'active' AND closes_at IS NOT NULL AND closes_at < NOW() + INTERVAL '2 days' AND closes_at > NOW()
       LIMIT 3`
    );
    for (const s of closingSurveys.rows) {
      alerts.push({ type: 'info', entity: 'survey', id: s.id, message: `Survey "${s.title}" closes soon` });
    }

    // High engagement zones
    const activeZones = await query(
      `SELECT t.id, t.name, COUNT(p.id) as pin_count
       FROM territories t
       JOIN pins p ON p.territory_id = t.id AND p.is_active = TRUE
       GROUP BY t.id, t.name HAVING COUNT(p.id) > 5
       LIMIT 3`
    );
    for (const z of activeZones.rows) {
      alerts.push({ type: 'success', entity: 'territory', id: z.id, message: `High engagement detected in "${z.name}" (${z.pin_count} pins)` });
    }

    // Expedientes with no update in 14 days
    const staleExpedientes = await query(
      `SELECT id, title FROM expedientes
       WHERE status = 'in_progress' AND updated_at < NOW() - INTERVAL '14 days'
       LIMIT 3`
    );
    for (const e of staleExpedientes.rows) {
      alerts.push({ type: 'error', entity: 'expediente', id: e.id, message: `Expediente "${e.title}" has had no update in 14+ days` });
    }

    return success(res, alerts);
  } catch {
    return error(res, 'Failed to get alerts');
  }
};
