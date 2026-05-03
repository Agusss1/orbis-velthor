const { validationResult } = require('express-validator');
const { query } = require('../../config/database');
const { success, created, error, paginated } = require('../../utils/response');
const { auditLog } = require('../../middleware/logger');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, status, area_id, territory_id } = req.query;
  const offset = (page - 1) * limit;
  let conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (status) { conditions.push(`s.status = $${idx++}`); params.push(status); }
  if (area_id) { conditions.push(`s.area_id = $${idx++}`); params.push(area_id); }
  if (territory_id) { conditions.push(`s.territory_id = $${idx++}`); params.push(territory_id); }

  const where = conditions.join(' AND ');
  try {
    const countRes = await query(`SELECT COUNT(*) FROM surveys s WHERE ${where}`, params);
    const result = await query(
      `SELECT s.*, u.full_name as created_by_name, a.name as area_name,
              (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) as response_count,
              (SELECT COUNT(*) FROM survey_questions WHERE survey_id = s.id) as question_count
       FROM surveys s
       JOIN users u ON u.id = s.created_by
       LEFT JOIN areas a ON a.id = s.area_id
       WHERE ${where}
       ORDER BY s.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return paginated(res, result.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch {
    return error(res, 'Failed to list surveys');
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { title, description, area_id, territory_id, closes_at, questions = [] } = req.body;
  try {
    const result = await query(
      `INSERT INTO surveys (title, description, area_id, territory_id, closes_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || null, area_id || null, territory_id || null, closes_at || null, req.user.id]
    );
    const survey = result.rows[0];

    if (questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await query(
          `INSERT INTO survey_questions (survey_id, question_text, question_type, options, is_required, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [survey.id, q.question_text, q.question_type || 'text', JSON.stringify(q.options || []), q.is_required || false, i]
        );
      }
    }

    await auditLog(req.user.id, 'create', 'surveys', survey.id, `Created survey: ${title}`, {}, req);
    return created(res, { ...survey, access_link: `${process.env.CLIENT_URL}/s/${survey.access_token}` }, 'Survey created');
  } catch {
    return error(res, 'Failed to create survey');
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, u.full_name as created_by_name, a.name as area_name,
              (SELECT json_agg(sq ORDER BY sq.order_index) FROM survey_questions sq WHERE sq.survey_id = s.id) as questions
       FROM surveys s
       JOIN users u ON u.id = s.created_by
       LEFT JOIN areas a ON a.id = s.area_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'Survey not found', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch survey');
  }
};

exports.getPublic = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.title, s.description, s.status, s.closes_at,
              (SELECT json_agg(sq ORDER BY sq.order_index) FROM survey_questions sq WHERE sq.survey_id = s.id) as questions
       FROM surveys s
       WHERE s.access_token = $1 AND s.status = 'active'`,
      [req.params.token]
    );
    if (!result.rows[0]) return error(res, 'Survey not found or not active', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch survey');
  }
};

exports.submitResponse = async (req, res) => {
  const { answers, respondent_identifier } = req.body;
  if (!answers) return error(res, 'answers required', 400);

  try {
    const survey = await query(
      "SELECT id FROM surveys WHERE access_token = $1 AND status = 'active'",
      [req.params.token]
    );
    if (!survey.rows[0]) return error(res, 'Survey not available', 404);

    await query(
      `INSERT INTO survey_responses (survey_id, respondent_identifier, answers, metadata)
       VALUES ($1, $2, $3, $4)`,
      [survey.rows[0].id, respondent_identifier || null, JSON.stringify(answers), JSON.stringify({ ip: req.ip })]
    );

    return created(res, null, 'Response submitted successfully');
  } catch {
    return error(res, 'Failed to submit response');
  }
};

exports.update = async (req, res) => {
  const { title, description, closes_at, questions } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (title) { updates.push(`title = $${idx++}`); params.push(title); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
  if (closes_at !== undefined) { updates.push(`closes_at = $${idx++}`); params.push(closes_at); }

  if (updates.length) {
    updates.push('updated_at = NOW()');
    params.push(req.params.id);
    await query(`UPDATE surveys SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  }

  if (questions) {
    await query('DELETE FROM survey_questions WHERE survey_id = $1', [req.params.id]);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO survey_questions (survey_id, question_text, question_type, options, is_required, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.params.id, q.question_text, q.question_type || 'text', JSON.stringify(q.options || []), q.is_required || false, i]
      );
    }
  }

  return success(res, null, 'Survey updated');
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['draft', 'active', 'closed', 'archived'];
  if (!allowed.includes(status)) return error(res, 'Invalid status', 400);

  try {
    await query('UPDATE surveys SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    return success(res, null, `Survey ${status}`);
  } catch {
    return error(res, 'Failed to update status');
  }
};

exports.remove = async (req, res) => {
  try {
    await query("UPDATE surveys SET status = 'archived', updated_at = NOW() WHERE id = $1", [req.params.id]);
    return success(res, null, 'Survey archived');
  } catch {
    return error(res, 'Failed to archive survey');
  }
};

exports.listResponses = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const countRes = await query('SELECT COUNT(*) FROM survey_responses WHERE survey_id = $1', [req.params.id]);
    const result = await query(
      `SELECT * FROM survey_responses WHERE survey_id = $1
       ORDER BY submitted_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );
    return paginated(res, result.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch {
    return error(res, 'Failed to list responses');
  }
};

exports.analytics = async (req, res) => {
  try {
    const survey = await query(
      `SELECT s.*, (SELECT json_agg(sq ORDER BY sq.order_index) FROM survey_questions sq WHERE sq.survey_id = s.id) as questions
       FROM surveys s WHERE s.id = $1`,
      [req.params.id]
    );
    if (!survey.rows[0]) return error(res, 'Survey not found', 404);

    const responses = await query(
      'SELECT answers FROM survey_responses WHERE survey_id = $1',
      [req.params.id]
    );

    const totalResponses = responses.rows.length;
    const questions = survey.rows[0].questions || [];
    const analytics = {};

    for (const q of questions) {
      const qAnswers = responses.rows
        .map(r => r.answers[q.id])
        .filter(a => a !== undefined && a !== null && a !== '');

      analytics[q.id] = {
        question: q.question_text,
        type: q.question_type,
        total_answered: qAnswers.length,
        percentage_answered: totalResponses > 0 ? Math.round((qAnswers.length / totalResponses) * 100) : 0,
      };

      if (['multiple_choice', 'single_choice', 'yes_no'].includes(q.question_type)) {
        const counts = {};
        for (const ans of qAnswers) {
          const keys = Array.isArray(ans) ? ans : [ans];
          for (const k of keys) {
            counts[k] = (counts[k] || 0) + 1;
          }
        }
        analytics[q.id].counts = counts;
        analytics[q.id].percentages = Object.fromEntries(
          Object.entries(counts).map(([k, v]) => [k, Math.round((v / qAnswers.length) * 100)])
        );
      }

      if (q.question_type === 'rating') {
        const nums = qAnswers.map(Number).filter(n => !isNaN(n));
        analytics[q.id].average = nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : null;
      }
    }

    return success(res, { total_responses: totalResponses, questions: analytics });
  } catch {
    return error(res, 'Failed to compute analytics');
  }
};
