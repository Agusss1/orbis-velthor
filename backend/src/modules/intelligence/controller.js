const { query } = require('../../config/database');
const { success, error } = require('../../utils/response');

exports.overview = async (req, res) => {
  try {
    const [totals, roleBreakdown, weeklyActivity, topUsers] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*) FROM users WHERE is_active) as active_users,
        (SELECT COUNT(*) FROM areas WHERE is_active) as active_areas,
        (SELECT COUNT(*) FROM expedientes) as total_expedientes,
        (SELECT COUNT(*) FROM surveys) as total_surveys,
        (SELECT COUNT(*) FROM survey_responses) as total_survey_responses,
        (SELECT COUNT(*) FROM documents WHERE is_active) as total_documents,
        (SELECT COUNT(*) FROM pins WHERE is_active) as total_pins,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24h') as actions_today
      `),
      query(`SELECT role, COUNT(*) as count FROM users WHERE is_active GROUP BY role ORDER BY count DESC`),
      query(`SELECT DATE_TRUNC('day', created_at) as day, action, COUNT(*) as count
             FROM audit_logs
             WHERE created_at > NOW() - INTERVAL '7 days'
             GROUP BY day, action ORDER BY day`),
      query(`SELECT u.id, u.full_name, u.role, COUNT(al.id) as action_count
             FROM users u LEFT JOIN audit_logs al ON al.user_id = u.id AND al.created_at > NOW() - INTERVAL '30 days'
             GROUP BY u.id ORDER BY action_count DESC LIMIT 10`),
    ]);

    return success(res, {
      totals: totals.rows[0],
      role_breakdown: roleBreakdown.rows,
      weekly_activity: weeklyActivity.rows,
      top_users: topUsers.rows,
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to load intelligence overview');
  }
};

exports.auditLogs = async (req, res) => {
  const { page = 1, limit = 50, action, entity_type, user_id, from, to } = req.query;
  const offset = (page - 1) * limit;
  let conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (action) { conditions.push(`al.action = $${idx++}`); params.push(action); }
  if (entity_type) { conditions.push(`al.entity_type = $${idx++}`); params.push(entity_type); }
  if (user_id) { conditions.push(`al.user_id = $${idx++}`); params.push(user_id); }
  if (from) { conditions.push(`al.created_at >= $${idx++}`); params.push(from); }
  if (to) { conditions.push(`al.created_at <= $${idx++}`); params.push(to); }

  const where = conditions.join(' AND ');
  try {
    const countRes = await query(`SELECT COUNT(*) FROM audit_logs al WHERE ${where}`, params);
    const result = await query(
      `SELECT al.*, u.full_name, u.role, u.email
       FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch {
    return error(res, 'Failed to get audit logs');
  }
};

exports.userActivity = async (req, res) => {
  const { period = '30' } = req.query;
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.last_login_at,
              COUNT(al.id) as total_actions,
              COUNT(al.id) FILTER (WHERE al.action = 'create') as creates,
              COUNT(al.id) FILTER (WHERE al.action = 'update') as updates,
              COUNT(al.id) FILTER (WHERE al.action = 'delete') as deletes,
              MAX(al.created_at) as last_action_at
       FROM users u
       LEFT JOIN audit_logs al ON al.user_id = u.id AND al.created_at > NOW() - ($1 || ' days')::INTERVAL
       WHERE u.is_active = TRUE
       GROUP BY u.id
       ORDER BY total_actions DESC`,
      [period]
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to get user activity');
  }
};

exports.territorialInsights = async (req, res) => {
  try {
    const [territories, pinCategories, hotspots] = await Promise.all([
      query(`SELECT t.id, t.name, a.name as area_name,
              COUNT(DISTINCT p.id) as pin_count,
              COUNT(DISTINCT s.id) as survey_count,
              COUNT(DISTINCT sr.id) as response_count
             FROM territories t
             LEFT JOIN areas a ON a.id = t.area_id
             LEFT JOIN pins p ON p.territory_id = t.id AND p.is_active = TRUE
             LEFT JOIN surveys s ON s.territory_id = t.id
             LEFT JOIN survey_responses sr ON sr.survey_id = s.id
             GROUP BY t.id, a.name ORDER BY pin_count DESC`),
      query(`SELECT category, COUNT(*) as count FROM pins WHERE is_active = TRUE GROUP BY category ORDER BY count DESC`),
      query(`SELECT p.territory_id, t.name as territory_name, COUNT(*) as pin_count
             FROM pins p JOIN territories t ON t.id = p.territory_id
             WHERE p.is_active = TRUE AND p.created_at > NOW() - INTERVAL '30 days'
             GROUP BY p.territory_id, t.name
             HAVING COUNT(*) >= 3
             ORDER BY pin_count DESC LIMIT 5`),
    ]);

    return success(res, {
      territories: territories.rows,
      pin_categories: pinCategories.rows,
      hotspots: hotspots.rows,
    });
  } catch {
    return error(res, 'Failed to get territorial insights');
  }
};

exports.engagement = async (req, res) => {
  try {
    const [chatActivity, surveyEngagement, expedienteActivity] = await Promise.all([
      query(`SELECT DATE_TRUNC('day', created_at) as day, COUNT(*) as messages
             FROM messages WHERE created_at > NOW() - INTERVAL '30 days'
             GROUP BY day ORDER BY day`),
      query(`SELECT s.id, s.title, COUNT(sr.id) as responses,
              s.created_at, s.status
             FROM surveys s LEFT JOIN survey_responses sr ON sr.survey_id = s.id
             GROUP BY s.id ORDER BY responses DESC LIMIT 10`),
      query(`SELECT e.id, e.title, e.status,
              COUNT(DISTINCT ea.user_id) as assignees,
              COUNT(em.id) as messages
             FROM expedientes e
             LEFT JOIN expediente_assignees ea ON ea.expediente_id = e.id
             LEFT JOIN expediente_messages em ON em.expediente_id = e.id
             GROUP BY e.id ORDER BY messages DESC LIMIT 10`),
    ]);

    return success(res, {
      chat_activity: chatActivity.rows,
      survey_engagement: surveyEngagement.rows,
      expediente_activity: expedienteActivity.rows,
    });
  } catch {
    return error(res, 'Failed to get engagement data');
  }
};

exports.exportData = async (req, res) => {
  const { type } = req.params;
  const { from, to } = req.query;
  const allowed = ['users', 'audit_logs', 'survey_responses', 'expedientes'];

  if (!allowed.includes(type)) return error(res, 'Invalid export type', 400);

  let sql;
  const params = [];
  let idx = 1;
  let dateField;

  switch (type) {
    case 'users':
      sql = `SELECT id, email, full_name, role, is_active, last_login_at, created_at FROM users WHERE 1=1`;
      dateField = 'created_at';
      break;
    case 'audit_logs':
      sql = `SELECT al.*, u.full_name, u.email FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE 1=1`;
      dateField = 'al.created_at';
      break;
    case 'survey_responses':
      sql = `SELECT sr.*, s.title as survey_title FROM survey_responses sr JOIN surveys s ON s.id = sr.survey_id WHERE 1=1`;
      dateField = 'sr.submitted_at';
      break;
    case 'expedientes':
      sql = `SELECT e.*, u.full_name as created_by_name FROM expedientes e JOIN users u ON u.id = e.created_by WHERE 1=1`;
      dateField = 'e.created_at';
      break;
  }

  if (from) { sql += ` AND ${dateField} >= $${idx++}`; params.push(from); }
  if (to) { sql += ` AND ${dateField} <= $${idx++}`; params.push(to); }
  sql += ` ORDER BY ${dateField} DESC`;

  try {
    const result = await query(sql, params);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="orbis_${type}_export_${Date.now()}.json"`);
    return res.json({ exported_at: new Date(), type, count: result.rows.length, data: result.rows });
  } catch {
    return error(res, 'Export failed');
  }
};
