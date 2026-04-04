import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as collabController from '../controllers/collab.controller.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// ==================== 用户搜索 ====================
// 搜索用户（邀请时用）
router.get('/search-users', collabController.searchUsers);

// ==================== 我的邀请/申请 ====================
// 获取当前用户的待处理邀请和申请
router.get('/pending', collabController.getPendingInvitations);

// ==================== 仓库级操作 ====================
// 邀请用户加入仓库
router.post('/repositories/:repoId/invite', collabController.inviteCollaborator);
// 申请加入仓库
router.post('/repositories/:repoId/apply', collabController.applyToJoin);
// 离开仓库
router.post('/repositories/:repoId/leave', collabController.leaveRepository);

// 获取仓库的协作者列表
router.get('/repositories/:repoId/collaborators', collabController.getCollaborators);
// 获取仓库的待审批申请列表（owner/admin）
router.get('/repositories/:repoId/pending-applications', collabController.getPendingApplications);

// ==================== 单条记录操作 ====================
// 接受邀请/申请
router.post('/:id/accept', collabController.acceptInvitation);
// 拒绝邀请/申请
router.post('/:id/reject', collabController.rejectInvitation);
// 移除协作者
router.delete('/:id', collabController.removeCollaborator);
// 修改协作者角色
router.put('/:id/role', collabController.updateRole);

export default router;
