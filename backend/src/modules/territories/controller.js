const { query } = require('../../config/database');
const { success, created, error } = require('../../utils/response');
const { auditLog } = require('../../middleware/logger');

exports.listTerritories = async (req, res) => {
  const { area_id } = req.query;
  let conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (area_id) { conditions.push(`t.area_id = $${idx++}`); params.push(area_id); }

  try {
    const result = await query(
      `SELECT t.*, u.full_name as created_by_name, a.name as area_name,
              (SELECT COUNT(*) FROM pins WHERE territory_id = t.id) as pin_count
       FROM territories t
       JOIN users u ON u.id = t.created_by
       LEFT JOIN areas a ON a.id = t.area_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.created_at DESC`,
      params
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to list territories');
  }
};

exports.createTerritory = async (req, res) => {
  const { name, description, area_id, boundary_data, metadata } = req.body;
  if (!name) return error(res, 'name required', 400);
  try {
    const result = await query(
      `INSERT INTO territories (name, description, area_id, boundary_data, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || null, area_id || null,
       boundary_data ? JSON.stringify(boundary_data) : null,
       metadata ? JSON.stringify(metadata) : '{}',
       req.user.id]
    );
    await auditLog(req.user.id, 'create', 'territories', result.rows[0].id, `Created territory: ${name}`, {}, req);
    return created(res, result.rows[0], 'Territory created');
  } catch {
    return error(res, 'Failed to create territory');
  }
};

exports.getTerritory = async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, u.full_name as created_by_name,
              (SELECT json_agg(jsonb_build_object('id', p.id, 'title', p.title, 'latitude', p.latitude, 'longitude', p.longitude, 'category', p.category, 'color', p.color))
               FROM pins p WHERE p.territory_id = t.id AND p.is_active = TRUE) as pins
       FROM territories t
       JOIN users u ON u.id = t.created_by
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'Territory not found', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch territory');
  }
};

exports.updateTerritory = async (req, res) => {
  const { name, description, boundary_data, metadata } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (name) { updates.push(`name = $${idx++}`); params.push(name); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
  if (boundary_data) { updates.push(`boundary_data = $${idx++}`); params.push(JSON.stringify(boundary_data)); }
  if (metadata) { updates.push(`metadata = $${idx++}`); params.push(JSON.stringify(metadata)); }

  if (!updates.length) return error(res, 'No fields to update', 400);
  updates.push('updated_at = NOW()');
  params.push(req.params.id);

  try {
    const result = await query(`UPDATE territories SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    return success(res, result.rows[0], 'Territory updated');
  } catch {
    return error(res, 'Failed to update territory');
  }
};

exports.deleteTerritory = async (req, res) => {
  try {
    await query('DELETE FROM territories WHERE id = $1', [req.params.id]);
    return success(res, null, 'Territory deleted');
  } catch {
    return error(res, 'Failed to delete territory');
  }
};

exports.listPins = async (req, res) => {
  const { territory_id, area_id, category, lat_min, lat_max, lng_min, lng_max } = req.query;
  let conditions = ['p.is_active = TRUE'];
  const params = [];
  let idx = 1;

  if (territory_id) { conditions.push(`p.territory_id = $${idx++}`); params.push(territory_id); }
  if (area_id) { conditions.push(`p.area_id = $${idx++}`); params.push(area_id); }
  if (category) { conditions.push(`p.category = $${idx++}`); params.push(category); }
  if (lat_min) { conditions.push(`p.latitude >= $${idx++}`); params.push(parseFloat(lat_min)); }
  if (lat_max) { conditions.push(`p.latitude <= $${idx++}`); params.push(parseFloat(lat_max)); }
  if (lng_min) { conditions.push(`p.longitude >= $${idx++}`); params.push(parseFloat(lng_min)); }
  if (lng_max) { conditions.push(`p.longitude <= $${idx++}`); params.push(parseFloat(lng_max)); }

  try {
    const result = await query(
      `SELECT p.*, u.full_name as created_by_name, t.name as territory_name,
              (SELECT COUNT(*) FROM pin_notes WHERE pin_id = p.id) as note_count,
              (SELECT json_agg(jsonb_build_object('id', u2.id, 'full_name', u2.full_name))
               FROM pin_assignees pa JOIN users u2 ON u2.id = pa.user_id
               WHERE pa.pin_id = p.id) as assignees
       FROM pins p
       JOIN users u ON u.id = p.created_by
       LEFT JOIN territories t ON t.id = p.territory_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.created_at DESC`,
      params
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to list pins');
  }
};

exports.createPin = async (req, res) => {
  const { title, description, latitude, longitude, territory_id, area_id, category, color, icon } = req.body;
  if (!title || latitude === undefined || longitude === undefined) {
    return error(res, 'title, latitude and longitude required', 400);
  }
  try {
    const result = await query(
      `INSERT INTO pins (title, description, latitude, longitude, territory_id, area_id, category, color, icon, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description || null, latitude, longitude,
       territory_id || null, area_id || null,
       category || 'general', color || '#EF4444', icon || 'map-pin',
       req.user.id]
    );
    await auditLog(req.user.id, 'create', 'pins', result.rows[0].id, `Created pin: ${title}`, {}, req);
    return created(res, result.rows[0], 'Pin created');
  } catch {
    return error(res, 'Failed to create pin');
  }
};

exports.getPin = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.full_name as created_by_name,
              (SELECT json_agg(pn ORDER BY pn.created_at DESC) FROM pin_notes pn WHERE pn.pin_id = p.id) as notes,
              (SELECT json_agg(jsonb_build_object('id', u2.id, 'full_name', u2.full_name))
               FROM pin_assignees pa JOIN users u2 ON u2.id = pa.user_id WHERE pa.pin_id = p.id) as assignees,
              (SELECT json_agg(s) FROM surveys s WHERE s.territory_id = p.territory_id) as linked_surveys
       FROM pins p
       JOIN users u ON u.id = p.created_by
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'Pin not found', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch pin');
  }
};

exports.updatePin = async (req, res) => {
  const { title, description, category, color, icon, activity_data } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (title) { updates.push(`title = $${idx++}`); params.push(title); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
  if (category) { updates.push(`category = $${idx++}`); params.push(category); }
  if (color) { updates.push(`color = $${idx++}`); params.push(color); }
  if (icon) { updates.push(`icon = $${idx++}`); params.push(icon); }
  if (activity_data) { updates.push(`activity_data = $${idx++}`); params.push(JSON.stringify(activity_data)); }

  if (!updates.length) return error(res, 'No fields to update', 400);
  updates.push('updated_at = NOW()');
  params.push(req.params.id);

  try {
    const result = await query(`UPDATE pins SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    return success(res, result.rows[0], 'Pin updated');
  } catch {
    return error(res, 'Failed to update pin');
  }
};

exports.deletePin = async (req, res) => {
  try {
    await query('UPDATE pins SET is_active = FALSE WHERE id = $1', [req.params.id]);
    return success(res, null, 'Pin removed');
  } catch {
    return error(res, 'Failed to delete pin');
  }
};

exports.addPinNote = async (req, res) => {
  const { content } = req.body;
  if (!content) return error(res, 'content required', 400);
  try {
    const result = await query(
      'INSERT INTO pin_notes (pin_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, content]
    );
    return created(res, result.rows[0], 'Note added');
  } catch {
    return error(res, 'Failed to add note');
  }
};

exports.addPinAssignee = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return error(res, 'user_id required', 400);
  try {
    await query('INSERT INTO pin_assignees (pin_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, user_id]);
    return success(res, null, 'Assignee added');
  } catch {
    return error(res, 'Failed to add assignee');
  }
};

exports.removePinAssignee = async (req, res) => {
  try {
    await query('DELETE FROM pin_assignees WHERE pin_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    return success(res, null, 'Assignee removed');
  } catch {
    return error(res, 'Failed to remove assignee');
  }
};
