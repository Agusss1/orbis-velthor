const path = require('path');
const { query } = require('../../config/database');
const { success, created, error, paginated } = require('../../utils/response');
const { auditLog } = require('../../middleware/logger');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, area_id, territory_id, tag, search } = req.query;
  const offset = (page - 1) * limit;

  let conditions = ['d.is_active = TRUE'];
  const params = [];
  let idx = 1;

  if (area_id) { conditions.push(`d.area_id = $${idx++}`); params.push(area_id); }
  if (territory_id) { conditions.push(`d.territory_id = $${idx++}`); params.push(territory_id); }
  if (tag) { conditions.push(`$${idx++} = ANY(d.tags)`); params.push(tag); }
  if (search) { conditions.push(`d.title ILIKE $${idx++}`); params.push(`%${search}%`); }

  const where = conditions.join(' AND ');
  try {
    const countRes = await query(`SELECT COUNT(*) FROM documents d WHERE ${where}`, params);
    const result = await query(
      `SELECT d.*, u.full_name as created_by_name,
              a.name as area_name,
              dv.file_name, dv.mime_type, dv.file_size,
              dv.created_at as last_updated
       FROM documents d
       JOIN users u ON u.id = d.created_by
       LEFT JOIN areas a ON a.id = d.area_id
       LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.version_number = d.current_version
       WHERE ${where}
       ORDER BY d.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return paginated(res, result.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch {
    return error(res, 'Failed to list documents');
  }
};

exports.create = async (req, res) => {
  const { title, description, area_id, territory_id, tags, change_summary } = req.body;
  if (!title) return error(res, 'Title required', 400);
  if (!req.file) return error(res, 'File required', 400);

  try {
    const docResult = await query(
      `INSERT INTO documents (title, description, area_id, territory_id, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description || null, area_id || null, territory_id || null,
       tags ? tags.split(',').map(t => t.trim()) : [], req.user.id]
    );

    const doc = docResult.rows[0];
    await query(
      `INSERT INTO document_versions (document_id, version_number, file_name, file_path, file_size, mime_type, uploaded_by, change_summary)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7)`,
      [doc.id, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, req.user.id, change_summary || 'Initial version']
    );

    await auditLog(req.user.id, 'upload', 'documents', doc.id, `Uploaded: ${title}`, {}, req);
    return created(res, doc, 'Document created');
  } catch (err) {
    return error(res, 'Failed to create document');
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, u.full_name as created_by_name, a.name as area_name,
              (SELECT json_agg(dv ORDER BY dv.version_number DESC) FROM document_versions dv WHERE dv.document_id = d.id) as versions
       FROM documents d
       JOIN users u ON u.id = d.created_by
       LEFT JOIN areas a ON a.id = d.area_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'Document not found', 404);
    await auditLog(req.user.id, 'read', 'documents', req.params.id, 'Viewed document', {}, req);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch document');
  }
};

exports.addVersion = async (req, res) => {
  if (!req.file) return error(res, 'File required', 400);
  const { change_summary } = req.body;

  try {
    const doc = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc.rows[0]) return error(res, 'Document not found', 404);

    const newVersion = doc.rows[0].current_version + 1;
    await query(
      `INSERT INTO document_versions (document_id, version_number, file_name, file_path, file_size, mime_type, uploaded_by, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.params.id, newVersion, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, req.user.id, change_summary || '']
    );
    await query('UPDATE documents SET current_version = $1, updated_at = NOW() WHERE id = $2', [newVersion, req.params.id]);

    await auditLog(req.user.id, 'update', 'documents', req.params.id, `Added version ${newVersion}`, {}, req);
    return success(res, { version: newVersion }, 'Version added');
  } catch {
    return error(res, 'Failed to add version');
  }
};

exports.update = async (req, res) => {
  const { title, description, tags } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (title) { updates.push(`title = $${idx++}`); params.push(title); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
  if (tags) { updates.push(`tags = $${idx++}`); params.push(tags.split(',').map(t => t.trim())); }

  if (!updates.length) return error(res, 'No fields to update', 400);
  updates.push('updated_at = NOW()');
  params.push(req.params.id);

  try {
    const result = await query(`UPDATE documents SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    return success(res, result.rows[0], 'Document updated');
  } catch {
    return error(res, 'Failed to update document');
  }
};

exports.remove = async (req, res) => {
  try {
    await query('UPDATE documents SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    await auditLog(req.user.id, 'delete', 'documents', req.params.id, 'Archived document', {}, req);
    return success(res, null, 'Document archived');
  } catch {
    return error(res, 'Failed to archive document');
  }
};

exports.download = async (req, res) => {
  try {
    const result = await query(
      `SELECT dv.file_path, dv.file_name FROM document_versions dv
       JOIN documents d ON d.id = dv.document_id
       WHERE d.id = $1 AND dv.version_number = d.current_version`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'File not found', 404);

    await auditLog(req.user.id, 'download', 'documents', req.params.id, 'Downloaded document', {}, req);
    res.download(result.rows[0].file_path, result.rows[0].file_name);
  } catch {
    return error(res, 'Failed to download document');
  }
};
