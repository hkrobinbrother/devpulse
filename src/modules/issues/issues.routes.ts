import { Router } from 'express';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from './issues.controller';
import { authenticate, requireMaintainer } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllIssues);
router.get('/:id', getIssueById);

// Authenticated routes
router.post('/', authenticate, createIssue);
router.patch('/:id', authenticate, updateIssue);

// Maintainer only
router.delete('/:id', authenticate, requireMaintainer, deleteIssue);

export default router;
