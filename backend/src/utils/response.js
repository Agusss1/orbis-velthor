const success = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data, message = 'Created') =>
  success(res, data, message, 201);

const error = (res, message = 'Internal server error', statusCode = 500, details = null) =>
  res.status(statusCode).json({ success: false, error: message, ...(details && { details }) });

const paginated = (res, data, total, page, limit) =>
  res.json({
    success: true,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });

module.exports = { success, created, error, paginated };
