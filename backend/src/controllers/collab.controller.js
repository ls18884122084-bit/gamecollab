import Collaborator from '../models/Collaborator.js';
import Repository from '../models/Repository.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import logger from '../config/logger.js';

// ==================== 邀请相关 ====================

/**
 * 搜索用户（按用户名或邮箱模糊匹配）
 * GET /api/collab/search-users?q=xxx
 */
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.userId;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: '搜索关键词至少需要2个字符' });
    }

    // 搜索用户（排除自己）
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: currentUserId },
        isActive: true,
        [Op.or]: [
          { username: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%{q}%` } }
        ]
      },
      attributes: ['id', 'username', 'email', 'avatar', 'bio'],
      limit: 20
    });

    res.json({ users });
  } catch (error) {
    logger.error('搜索用户失败:', error);
    res.status(500).json({ error: '搜索用户失败' });
  }
};

/**
 * 邀请用户加入仓库
 * POST /api/collab/repositories/:repoId/invite
 * Body: { userId, role }
 */
export const inviteCollaborator = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { userId: targetUserId, role = 'read' } = req.body;
    const inviterId = req.userId;

    // 不能邀请自己
    if (targetUserId === inviterId) {
      return res.status(400).json({ error: '不能邀请自己' });
    }

    // 验证仓库存在且当前用户是 owner 或 admin
    const repo = await Repository.findByPk(repoId);

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 只有 owner 和 admin 可以邀请
    const inviterCollab = await Collaborator.findOne({
      where: {
        userId: inviterId,
        repositoryId: repoId,
        status: 'accepted'
      }
    });

    const isOwner = repo.ownerId === inviterId;
    const isAdmin = inviterCollab && (inviterCollab.role === 'admin' || inviterCollab.role === 'owner');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: '只有仓库所有者和管理员可以邀请协作者' });
    }

    // Admin 不能邀请其他 admin，只能 owner 可以
    if (!isOwner && role === 'admin') {
      return res.status(403).json({ error: '只有仓库所有者可以设置管理员角色' });
    }

    // 验证目标用户存在
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ error: '目标用户不存在' });
    }

    // 检查是否已经是协作者
    const existing = await Collaborator.findOne({
      where: {
        userId: targetUserId,
        repositoryId: repoId
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: '该用户已经是协作者' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: '该用户已有待处理的邀请' });
      }
      // 如果是 rejected，可以重新邀请
      existing.role = role;
      existing.invitedBy = inviterId;
      existing.status = 'pending';
      await existing.save();

      logger.info(`重新邀请用户 ${targetUser.username} 加入仓库 ${repo.name}`);
      return jsonWithUser(res, existing, '邀请已发送');
    }

    // 创建邀请
    const collaborator = await Collaborator.create({
      userId: targetUserId,
      repositoryId: repoId,
      role,
      status: 'pending',
      invitedBy: inviterId
    });

    logger.info(`${req.user.username} 邀请 ${targetUser.username} (${role}) 加入 ${repo.name}`);

    return jsonWithUser(res, collaborator, '邀请已发送');
  } catch (error) {
    logger.error('邀请协作者失败:', error);
    res.status(500).json({ error: '邀请协作者失败' });
  }
};

/**
 * 申请加入仓库
 * POST /api/collab/repositories/:repoId/apply
 */
export const applyToJoin = async (req, res) => {
  try {
    const { repoId } = req.params;
    const applicantId = req.userId;

    // 验证仓库存在
    const repo = await Repository.findByPk(repoId);
    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // Owner 不能申请自己的仓库
    if (repo.ownerId === applicantId) {
      return res.status(400).json({ error: '你是该仓库的所有者' });
    }

    // 检查是否已经有记录
    const existing = await Collaborator.findOne({
      where: {
        userId: applicantId,
        repositoryId: repoId
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: '你已经是协作者' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: '你已有待处理的申请/邀请' });
      }
      // rejected → 重新申请
      existing.status = 'pending';
      existing.invitedBy = null; // 申请模式，没有邀请人
      existing.role = 'read'; // 默认 read
      await existing.save();
      
      logger.info(`用户 ${req.user.username} 重新申请加入仓库 ${repo.name}`);
      return jsonWithUser(res, existing, '申请已提交');
    }

    // 创建申请
    const collaborator = await Collaborator.create({
      userId: applicantId,
      repositoryId: repoId,
      role: 'read',
      status: 'pending',
      invitedBy: null
    });

    logger.info(`${req.user.username} 申请加入仓库 ${repo.name}`);

    return jsonWithUser(res, collaborator, '申请已提交');
  } catch (error) {
    logger.error('申请加入仓库失败:', error);
    res.status(500).json({ error: '申请加入仓库失败' });
  }
};

// ==================== 审批相关 ====================

/**
 * 接受邀请/申请
 * POST /api/collab/:id/accept
 */
export const acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const collab = await Collaborator.findByPk(id, {
      include: [{ model: Repository, as: 'repository' }]
    });

    if (!collab) {
      return res.status(404).json({ error: '协作记录不存在' });
    }

    // 只能接受发给自己的邀请，或者 owner/admin 审批别人的申请
    const isRecipient = collab.userId === userId;
    const repoOwner = collab.repository.ownerId === userId;

    // 检查是否是管理员
    const adminCheck = await Collaborator.findOne({
      where: {
        userId,
        repositoryId: collab.repositoryId,
        status: 'accepted',
        role: { [Op.in]: ['owner', 'admin'] }
      }
    });

    if (!isRecipient && !repoOwner && !adminCheck) {
      return res.status(403).json({ error: '你没有权限执行此操作' });
    }

    if (collab.status !== 'pending') {
      return res.status(400).json({ error: `当前状态为 ${collab.status}，无法接受` });
    }

    collab.status = 'accepted';
    await collab.save();

    logger.info(`协作邀请被接受: user=${collab.userId}, repo=${collab.repositoryId}`);

    return jsonWithUser(res, collab, '已接受邀请');
  } catch (error) {
    logger.error('接受邀请失败:', error);
    res.status(500).json({ error: '接受邀请失败' });
  }
};

/**
 * 拒绝邀请/申请
 * POST /api/collab/:id/reject
 */
export const rejectInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const collab = await Collaborator.findByPk(id, {
      include: [{ model: Repository, as: 'repository' }]
    });

    if (!collab) {
      return res.status(404).json({ error: '协作记录不存在' });
    }

    // 接收者可以拒绝；owner/admin 也可以拒绝别人的申请
    const isRecipient = collab.userId === userId;
    const repoOwner = collab.repository.ownerId === userId;

    const adminCheck = await Collaborator.findOne({
      where: {
        userId,
        repositoryId: collab.repositoryId,
        status: 'accepted',
        role: { [Op.in]: ['owner', 'admin'] }
      }
    });

    if (!isRecipient && !repoOwner && !adminCheck) {
      return res.status(403).json({ error: '你没有权限执行此操作' });
    }

    if (collab.status !== 'pending') {
      return res.status(400).json({ error: `当前状态为 ${collab.status}，无法拒绝` });
    }

    collab.status = 'rejected';
    await collab.save();

    logger.info(`协作邀请被拒绝: user=${collab.userId}, repo=${collab.repositoryId}`);

    res.json({ message: '已拒绝', collaborator: formatCollab(collab) });
  } catch (error) {
    logger.error('拒绝邀请失败:', error);
    res.status(500).json({ error: '拒绝邀请失败' });
  }
};

// ==================== 管理相关 ====================

/**
 * 获取仓库的协作者列表
 * GET /api/collab/repositories/:repoId/collaborators
 */
export const getCollaborators = async (req, res) => {
  try {
    const { repoId } = req.params;

    // 验证仓库存在
    const repo = await Repository.findByPk(repoId);
    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    const collaborators = await Collaborator.findAll({
      where: { repositoryId: repoId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'avatar']
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      collaborators: collaborators.map(formatCollab)
    });
  } catch (error) {
    logger.error('获取协作者列表失败:', error);
    res.status(500).json({ error: '获取协作者列表失败' });
  }
};

/**
 * 移除协作者
 * DELETE /api/collab/:id
 */
export const removeCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const operatorId = req.userId;

    const collab = await Collaborator.findByPk(id, {
      include: [{ model: Repository, as: 'repository' }]
    });

    if (!collab) {
      return res.status(404).json({ error: '协作记录不存在' });
    }

    const { repositoryId } = collab;
    const repo = collab.repository;

    // 权限检查：owner 可以移除任何人（除自己）；admin 可以移除非 owner/write/read
    const isOwner = repo.ownerId === operatorId;

    // 不能移除 owner 角色
    if (collab.role === 'owner') {
      return res.status(400).json({ error: '不能移除仓库所有者' });
    }

    // 不能移除自己（用离开接口）
    if (collab.userId === operatorId) {
      return res.status(400).json({ error: '不能移除自己，请使用"离开仓库"功能' });
    }

    if (!isOwner) {
      // 检查操作者是否是 admin
      const operator = await Collaborator.findOne({
        where: {
          userId: operatorId,
          repositoryId,
          status: 'accepted'
        }
      });

      if (!operator || !(operator.role === 'admin' || operator.role === 'owner')) {
        return res.status(403).json({ error: '只有仓库所有者或管理员可以移除协作者' });
      }

      // admin 不能移除 admin
      if (collab.role === 'admin' && operator.role !== 'owner') {
        return res.status(403).json({ error: '只有仓库所有者可以移除管理员' });
      }
    }

    await collab.destroy();

    logger.info(`协作者被移除: user=${collab.userId}, repo=${repositoryId}, by=${operatorId}`);

    res.json({ message: '协作者已移除' });
  } catch (error) {
    logger.error('移除协作者失败:', error);
    res.status(500).json({ error: '移除协作者失败' });
  }
};

/**
 * 更新协作者角色
 * PUT /api/collab/:id/role
 * Body: { role }
 */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const operatorId = req.userId;

    if (!['admin', 'write', 'read'].includes(role)) {
      return res.status(400).json({ error: '无效的角色，可选值: admin, write, read' });
    }

    const collab = await Collaborator.findByPk(id, {
      include: [{ model: Repository, as: 'repository' }]
    });

    if (!collab) {
      return res.status(404).json({ error: '协作记录不存在' });
    }

    const { repositoryId } = collab;
    const repo = collab.repository;

    // 只有 owner 可以修改角色
    if (repo.ownerId !== operatorId) {
      return res.status(403).json({ error: '只有仓库所有者可以修改角色' });
    }

    if (collab.role === 'owner') {
      return res.status(400).json({ error: '不能修改所有者的角色' });
    }

    collab.role = role;
    await collab.save();

    logger.info(`协作者角色更新: user=${collab.userId}, repo=${repositoryId}, role=${role}`);

    return jsonWithUser(res, collab, '角色已更新');
  } catch (error) {
    logger.error('更新协作者角色失败:', error);
    res.status(500).json({ error: '更新角色失败' });
  }
};

/**
 * 离开仓库（自己移除自己）
 * POST /api/collab/repositories/:repoId/leave
 */
export const leaveRepository = async (req, res) => {
  try {
    const { repoId } = req.params;
    const userId = req.userId;

    const repo = await Repository.findByPk(repoId);
    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // Owner 不能离开自己的仓库
    if (repo.ownerId === userId) {
      return res.status(400).json({ 
        error: '仓库所有者不能离开。如需放弃仓库，请转移所有权或删除仓库。' 
      });
    }

    const collab = await Collaborator.findOne({
      where: { userId, repositoryId: repoId }
    });

    if (!collab) {
      return res.status(404).json({ error: '你不是该仓库的协作者' });
    }

    await collab.destroy();

    logger.info(`用户 ${req.user.username} 离开仓库 ${repo.name}`);

    res.json({ message: '已离开仓库' });
  } catch (error) {
    logger.error('离开仓库失败:', error);
    res.status(500).json({ error: '离开仓库失败' });
  }
};

// ==================== 我的协作 ====================

/**
 * 获取当前用户的待处理邀请/申请
 * GET /api/collab/pending
 */
export const getPendingInvitations = async (req, res) => {
  try {
    const userId = req.userId;

    const pending = await Collaborator.findAll({
      where: {
        userId,
        status: 'pending'
      },
      include: [
        {
          model: Repository,
          as: 'repository',
          attributes: ['id', 'name', 'description', 'isPrivate'],
          include: [{
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'avatar']
          }]
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ 
      invitations: pending.map(p => ({
        ...formatCollab(p),
        repository: p.repository,
        inviter: p.inviter ? {
          id: p.inviter.id,
          username: p.inviter.username
        } : null,
        // 判断是邀请还是申请：有 invitedBy 就是别人邀请我的，没有就是我主动申请的
        type: p.invitedBy ? 'invitation' : 'application'
      }))
    });
  } catch (error) {
    logger.error('获取待处理邀请失败:', error);
    res.status(500).json({ error: '获取待处理邀请失败' });
  }
};

/**
 * 获取我收到的待审批申请（作为 owner/admin）
 * GET /api/collab/repositories/:repoId/pending-applications
 */
export const getPendingApplications = async (req, res) => {
  try {
    const { repoId } = req.params;
    const userId = req.userId;

    // 验证操作者是 owner 或 admin
    const repo = await Repository.findByPk(repoId);
    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    const isOwner = repo.ownerId === userId;
    const adminCheck = await Collaborator.findOne({
      where: {
        userId,
        repositoryId: repoId,
        status: 'accepted',
        role: { [Op.in]: ['owner', 'admin'] }
      }
    });

    if (!isOwner && !adminCheck) {
      return res.status(403).json({ error: '只有仓库所有者或管理员可以查看申请列表' });
    }

    const applications = await Collaborator.findAll({
      where: {
        repositoryId: repoId,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'avatar']
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      applications: applications.map(app => ({
        ...formatCollab(app),
        user: app.user,
        inviter: app.inviter ? { id: app.inviter.id, username: app.inviter.username } : null,
        type: app.invitedBy ? 'invitation' : 'application'
      }))
    });
  } catch (error) {
    logger.error('获取待审批申请失败:', error);
    res.status(500).json({ error: '获取待审批申请失败' });
  }
};

// ==================== 工具函数 ====================

/**
 * 格式化协作者输出（包含用户信息）
 */
function formatCollab(collab) {
  const data = {
    id: collab.id,
    role: collab.role,
    status: collab.status,
    createdAt: collab.createdAt,
    updatedAt: collab.updatedAt
  };

  if (collab.user) {
    data.user = {
      id: collab.user.id,
      username: collab.user.username,
      email: collab.user.email,
      avatar: collab.user.avatar
    };
  }

  return data;
}

/**
 * 返回带用户信息的 JSON 响应
 */
async function jsonWithUser(res, collab, message) {
  // 重新加载关联的用户信息
  await collab.reload({
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email', 'avatar'] }
    ]
  });

  res.json({
    message,
    collaborator: formatCollab(collab)
  });
}
