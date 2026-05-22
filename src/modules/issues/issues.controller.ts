import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { CreateIssueBody, UpdateIssueBody, IssueQueryParams, Issue } from '../../utils/types';

// Helper: fetch reporter info for a list of reporter_ids (no JOINs)
const getReporters = async (reporterIds: number[]): Promise<Map<number, object>> => {
  if (reporterIds.length === 0) return new Map();

  const uniqueIds = [...new Set(reporterIds)];
  const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(', ');

  const result = await pool.query(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    uniqueIds
  );

  const reporterMap = new Map<number, object>();
  result.rows.forEach((row) => reporterMap.set(row.id, row));
  return reporterMap;
};

// POST /api/issues
export const createIssue = async (
  req: Request<object, object, CreateIssueBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, type } = req.body;
    const reporterId = req.user!.id;

    // Validate required fields
    if (!title || !description || !type) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title, description, and type are required.');
      return;
    }

    // Validate title length
    if (title.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title must not exceed 150 characters.');
      return;
    }

    // Validate description length
    if (description.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'description must be at least 20 characters.');
      return;
    }

    // Validate type value
    if (!['bug', 'feature_request'].includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'type must be bug or feature_request.');
      return;
    }

    const result = await pool.query(
      `INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description, type, reporterId]
    );

    sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// GET /api/issues
export const getAllIssues = async (
  req: Request<object, object, object, IssueQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sort = 'newest', type, status } = req.query;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const values: string[] = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

    const issuesResult = await pool.query(
      `SELECT * FROM issues ${whereClause} ${orderClause}`,
      values
    );

    const issues: Issue[] = issuesResult.rows;

    // Fetch reporters separately (no JOINs allowed)
    const reporterIds = issues.map((issue) => issue.reporter_id);
    const reporterMap = await getReporters(reporterIds);

    // Attach reporter data to each issue
    const issuesWithReporters = issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporterMap.get(issue.reporter_id) || { id: issue.reporter_id },
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    }));

    sendSuccess(res, StatusCodes.OK, 'Issues fetched successfully', issuesWithReporters);
  } catch (error) {
    next(error);
  }
};

// GET /api/issues/:id
export const getIssueById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id);

    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID.');
      return;
    }

    const issueResult = await pool.query(
      'SELECT * FROM issues WHERE id = $1',
      [issueId]
    );

    if ((issueResult.rowCount ?? 0) === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const issue: Issue = issueResult.rows[0];

    // Fetch reporter separately
    const reporterResult = await pool.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [issue.reporter_id]
    );

    const reporter = reporterResult.rows[0] || { id: issue.reporter_id };

    sendSuccess(res, StatusCodes.OK, 'Issue fetched successfully', {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/issues/:id
export const updateIssue = async (
  req: Request<{ id: string }, object, UpdateIssueBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id);
    const currentUser = req.user!;

    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID.');
      return;
    }

    // Fetch the existing issue
    const issueResult = await pool.query(
      'SELECT * FROM issues WHERE id = $1',
      [issueId]
    );

    if ((issueResult.rowCount ?? 0) === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const issue: Issue = issueResult.rows[0];

    // Permission check:
    // - Maintainer can update any issue
    // - Contributor can only update their own issue if status is 'open'
    if (currentUser.role !== 'maintainer') {
      if (issue.reporter_id !== currentUser.id) {
        sendError(res, StatusCodes.FORBIDDEN, 'You can only update your own issues.');
        return;
      }
      if (issue.status !== 'open') {
        sendError(res, StatusCodes.CONFLICT, 'Contributors can only edit issues with open status.');
        return;
      }
    }

    const { title, description, type, status } = req.body;

    // Validate fields if provided
    if (title !== undefined && title.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title must not exceed 150 characters.');
      return;
    }

    if (description !== undefined && description.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'description must be at least 20 characters.');
      return;
    }

    if (type !== undefined && !['bug', 'feature_request'].includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'type must be bug or feature_request.');
      return;
    }

    if (status !== undefined && !['open', 'in_progress', 'resolved'].includes(status)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'status must be open, in_progress, or resolved.');
      return;
    }

    // Build dynamic SET clause
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (type !== undefined) { updates.push(`type = $${paramIndex++}`); values.push(type); }
    if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }

    if (updates.length === 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'No valid fields provided for update.');
      return;
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);
    values.push(issueId);

    const result = await pool.query(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/issues/:id  (Maintainer only)
export const deleteIssue = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id);

    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID.');
      return;
    }

    const result = await pool.query(
      'DELETE FROM issues WHERE id = $1 RETURNING id',
      [issueId]
    );

    if ((result.rowCount ?? 0) === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully', undefined);
  } catch (error) {
    next(error);
  }
};
