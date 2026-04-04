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
import { requireRepoAccess } from '../middleware/rbac.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 文件操作（read 权限）
router.get('/:repoId/tree', requireRepoAccess('read'), getFileTree);
router.get('/:repoId/content', requireRepoAccess('read'), getFileContent);

// 文件写操作（write 权限）
router.post('/:repoId/save', requireRepoAccess('write'), saveFile);
router.delete('/:repoId/delete', requireRepoAccess('write'), deleteFile);

// 提交历史（read 权限）
router.get('/:repoId/commits', requireRepoAccess('read'), getCommitHistory);
router.get('/:repoId/commits/:commitHash', requireRepoAccess('read'), getCommitDiff);

// 分支读操作（read 权限）
router.get('/:repoId/branches', requireRepoAccess('read'), getBranches);

// 分支写操作（write 权限）
router.post('/:repoId/branches', requireRepoAccess('write'), createBranch);
router.put('/:repoId/branches/checkout', requireRepoAccess('write'), checkoutBranch);

export default router;
