import Repository from '../models/Repository.js';
import User from '../models/User.js';
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
      gitPath: '', // 临时占位
      defaultBranch: 'main'
    });

    // 初始化 Git 仓库
    const gitPath = `${userId}/${repo.id}`;
    await gitService.initRepository(repo.id);

    // 更新 gitPath
    repo.gitPath = gitPath;
    await repo.save();

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

// 获取仓库列表
export const getRepositories = async (req, res) => {
  try {
    const userId = req.userId;
    const { search, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    
    const where = {
      ownerId: userId
    };

    if (search) {
      where.name = {
        [Op.iLike]: `%${search}%`
      };
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

    res.json({
      repositories: rows,
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

// 获取仓库详情
export const getRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const repo = await Repository.findOne({
      where: { id, ownerId: userId },
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

    res.json({ repository: repo });
  } catch (error) {
    logger.error('获取仓库详情失败:', error);
    res.status(500).json({ error: '获取仓库详情失败' });
  }
};

// 更新仓库信息
export const updateRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPrivate } = req.body;
    const userId = req.userId;

    const repo = await Repository.findOne({
      where: { id, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 检查新名称是否冲突
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

// 删除仓库
export const deleteRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const repo = await Repository.findOne({
      where: { id, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
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
