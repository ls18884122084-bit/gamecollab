import Repository from '../models/Repository.js';
import User from '../models/User.js';
import Collaborator from '../models/Collaborator.js';
import gitService from '../services/git.service.js';
import logger from '../config/logger.js';
import { Op } from 'sequelize';

// 创建仓库
export const createRepository = async (req, res) => {
  try {
    const { name, description, isPrivate = true } = req.body;
    const userId = req.userId;

    // 检查仓库名是否已存在
    const existing = await Repository.findOne({
      where: { ownerId: userId, name }
    });

    if (existing) {
      return res.status(400).json({ error: '仓库名已存在' });
    }

    // 创建数据库记录
    const repo = await Repository.create({
      name,
      description,
      isPrivate,
      ownerId: userId,
      gitPath: '',
      defaultBranch: 'main'
    });

    // 初始化 Git 仓库
    const gitPath = `${userId}/${repo.id}`;
    await gitService.initRepository(repo.id);

    // 更新 gitPath
    repo.gitPath = gitPath;
    await repo.save();

    // 自动创建 owner 角色的协作者记录
    await Collaborator.create({
      userId: userId,
      repositoryId: repo.id,
      role: 'owner',
      status: 'accepted',
      invitedBy: null
    });

    logger.info(`仓库创建成功: ${name} (${repo.id})`);

    res.status(201).json({
      message: '仓库创建成功',
      repository: repo
    });
  } catch (error) {
    logger.error('创建仓库失败:', error);
    res.status(500).json({ error: '创建仓库失败，请稍后重试' });
  }
};

// 获取仓库列表（包含自己拥有的 + 作为协作者加入的）
export const getRepositories = async (req, res) => {
  try {
    const userId = req.userId;
    const { search, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    // 查找用户拥有或参与的仓库
    const collabRecords = await Collaborator.findAll({
      where: {
        userId,
        status: 'accepted'
      },
      attributes: ['repositoryId', 'role'],
      raw: true
    });

    const repoIds = collabRecords.map(c => c.repositoryId);

    let where = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    if (repoIds.length > 0) {
      where.id = { [Op.in]: repoIds };
    } else {
      // 没有任何协作者关系，返回空结果
      return res.json({
        repositories: [],
        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
      });
    }

    const { count, rows } = await Repository.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updatedAt', 'DESC']]
    });

    // 标注用户在每个仓库中的角色
    const reposWithRole = rows.map(repo => {
      const roleMap = {};
      collabRecords.forEach(c => { roleMap[c.repositoryId] = c.role; });
      const plainRepo = repo.toJSON();
      plainRepo.myRole = roleMap[repo.id] || null;
      return plainRepo;
    });

    res.json({
      repositories: reposWithRole,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('获取仓库列表失败:', error);
    res.status(500).json({ error: '获取仓库列表失败' });
  }
};

// 获取仓库详情（支持 owner 和协作者查看）
export const getRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 查找仓库（不限制 ownerId）
    const repo = await Repository.findByPk(id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 权限检查：owner 或已接受的协作者
    const isOwner = repo.ownerId === userId;

    if (!isOwner && repo.isPrivate) {
      const collab = await Collaborator.findOne({
        where: {
          userId,
          repositoryId: id,
          status: 'accepted'
        }
      });
      if (!collab) {
        return res.status(403).json({ error: '你没有该仓库的访问权限' });
      }
    }

    // 获取当前用户角色
    let myRole = isOwner ? 'owner' : null;
    if (!myRole) {
      const myCollab = await Collaborator.findOne({
        where: { userId, repositoryId: id, status: 'accepted' },
        attributes: ['role']
      });
      myRole = myCollab ? myCollab.role : null;
    }

    const plainRepo = repo.toJSON();
    plainRepo.myRole = myRole;

    res.json({ repository: plainRepo });
  } catch (error) {
    logger.error('获取仓库详情失败:', error);
    res.status(500).json({ error: '获取仓库详情失败' });
  }
};

// 更新仓库信息（需要 admin 权限，但只有 owner 能修改核心设置）
export const updateRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPrivate } = req.body;
    const userId = req.userId;

    const repo = await Repository.findByPk(id);

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 只有 owner 可以修改仓库名、可见性等核心设置
    // admin/write/read 不能修改这些
    if (repo.ownerId !== userId) {
      // 检查是否是 admin（admin 只能修改描述）
      const collab = await Collaborator.findOne({
        where: {
          userId,
          repositoryId: id,
          status: 'accepted',
          role: { [Op.in]: ['admin'] }
        }
      });

      if (!collab) {
        return res.status(403).json({ error: '只有仓库所有者可以修改仓库信息' });
      }

      // Admin 只能修改描述
      if (name || isPrivate !== undefined) {
        return res.status(403).json({ error: '只有仓库所有者可以修改名称和可见性' });
      }

      if (description !== undefined) {
        repo.description = description;
        await repo.save();

        logger.info(`仓库描述更新成功: ${repo.name} (by admin)`);

        return res.json({
          message: '仓库更新成功',
          repository: repo
        });
      }
    }

    // Owner 的完整权限
    if (name && name !== repo.name) {
      const existing = await Repository.findOne({
        where: { ownerId: userId, name, id: { [Op.ne]: id } }
      });

      if (existing) {
        return res.status(400).json({ error: '仓库名已存在' });
      }
      repo.name = name;
    }

    if (description !== undefined) repo.description = description;
    if (isPrivate !== undefined) repo.isPrivate = isPrivate;

    await repo.save();

    logger.info(`仓库更新成功: ${repo.name}`);

    res.json({
      message: '仓库更新成功',
      repository: repo
    });
  } catch (error) {
    logger.error('更新仓库失败:', error);
    res.status(500).json({ error: '更新仓库失败' });
  }
};

// 删除仓库（仅 owner）
export const deleteRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const repo = await Repository.findOne({
      where: { id, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在或无权删除' });
    }

    // 删除 Git 仓库
    await gitService.deleteRepository(repo.id);

    // 删除数据库记录
    await repo.destroy();

    logger.info(`仓库删除成功: ${repo.name}`);

    res.json({ message: '仓库删除成功' });
  } catch (error) {
    logger.error('删除仓库失败:', error);
    res.status(500).json({ error: '删除仓库失败' });
  }
};
