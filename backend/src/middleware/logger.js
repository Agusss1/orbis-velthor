const { query } = require('../config/database');

async function auditLog(userId, action, entityType, entityId, description, metadata = {}, req = null) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        action,
        entityType,
        entityId || null,
        description,
        JSON.stringify(metadata),
        req?.ip || null,
        req?.headers?.['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

function createAuditMiddleware(action, entityType, getEntityId = null, getDescription = null) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode < 400 && req.user) {
        const entityId = getEntityId ? getEntityId(req, data) : req.params?.id;
        const description = getDescription
          ? getDescription(req, data)
          : `${action} on ${entityType}`;
        auditLog(req.user.id, action, entityType, entityId, description, {}, req);
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { auditLog, createAuditMiddleware };
