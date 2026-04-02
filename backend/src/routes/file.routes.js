import express from 'express';
import {
  getFileTree,
  getFileContent,
  saveFile,
  deleteFile,
  getCommitHistory,
  getCommitDiff,
  getBranches,
  createBranch,
  checkoutBranch
} from '../controllers/file.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 文件操作
router.get('/:repoId/tree', getFileTree);
router.get('/:repoId/content', getFileContent);
router.post('/:repoId/save', saveFile);
router.delete('/:repoId/delete', deleteFile);

// 提交历史
router.get('/:repoId/commits', getCommitHistory);
router.get('/:repoId/commits/:commitHash', getCommitDiff);

// 分支操作
router.get('/:repoId/branches', getBranches);
router.post('/:repoId/branches', createBranch);
router.put('/:repoId/branches/checkout', checkoutBranch);

export default router;
