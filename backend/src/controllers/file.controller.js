import Repository from '../models/Repository.js';
import gitService from '../services/git.service.js';
import logger from '../config/logger.js';

// 获取文件树
export const getFileTree = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { ref = 'HEAD', path = '' } = req.query;
    const userId = req.userId;

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 获取文件树
    const files = await gitService.getFileTree(repoId, ref, path);

    res.json({ files });
  } catch (error) {
    logger.error('获取文件树失败:', error);
    res.status(500).json({ error: '获取文件树失败' });
  }
};

// 获取文件内容
export const getFileContent = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { filePath, ref = 'HEAD' } = req.query;
    const userId = req.userId;

    if (!filePath) {
      return res.status(400).json({ error: '缺少文件路径参数' });
    }

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 获取文件内容
    const content = await gitService.getFileContent(repoId, filePath, ref);

    if (content === null) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.json({ 
      filePath,
      content,
      ref
    });
  } catch (error) {
    logger.error('获取文件内容失败:', error);
    res.status(500).json({ error: '获取文件内容失败' });
  }
};

// 保存文件
export const saveFile = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { filePath, content, message } = req.body;
    const userId = req.userId;

    if (!filePath || content === undefined || !message) {
      return res.status(400).json({ 
        error: '缺少必要参数：filePath, content, message' 
      });
    }

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 保存文件并提交
    const result = await gitService.writeFileAndCommit(
      repoId,
      filePath,
      content,
      message,
      {
        username: req.user.username,
        email: req.user.email
      }
    );

    // 更新仓库的更新时间
    repo.changed('updatedAt', true);
    await repo.save();

    logger.info(`文件保存成功: ${repoId}/${filePath}`);

    res.json({
      message: '文件保存成功',
      commit: result.commit
    });
  } catch (error) {
    logger.error('保存文件失败:', error);
    res.status(500).json({ error: '保存文件失败' });
  }
};

// 删除文件
export const deleteFile = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { filePath, message } = req.body;
    const userId = req.userId;

    if (!filePath || !message) {
      return res.status(400).json({ 
        error: '缺少必要参数：filePath, message' 
      });
    }

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 删除文件并提交
    const result = await gitService.deleteFileAndCommit(
      repoId,
      filePath,
      message,
      {
        username: req.user.username,
        email: req.user.email
      }
    );

    // 更新仓库的更新时间
    repo.changed('updatedAt', true);
    await repo.save();

    logger.info(`文件删除成功: ${repoId}/${filePath}`);

    res.json({
      message: '文件删除成功',
      commit: result.commit
    });
  } catch (error) {
    logger.error('删除文件失败:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
};

// 获取提交历史
export const getCommitHistory = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { limit = 50, filePath } = req.query;
    const userId = req.userId;

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 获取提交历史
    const commits = await gitService.getCommitHistory(
      repoId,
      parseInt(limit),
      filePath
    );

    res.json({ commits });
  } catch (error) {
    logger.error('获取提交历史失败:', error);
    res.status(500).json({ error: '获取提交历史失败' });
  }
};

// 获取提交详情
export const getCommitDiff = async (req, res) => {
  try {
    const { repoId, commitHash } = req.params;
    const userId = req.userId;

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 获取提交详情
    const diff = await gitService.getCommitDiff(repoId, commitHash);

    res.json({ diff });
  } catch (error) {
    logger.error('获取提交详情失败:', error);
    res.status(500).json({ error: '获取提交详情失败' });
  }
};

// 获取分支列表
export const getBranches = async (req, res) => {
  try {
    const { repoId } = req.params;
    const userId = req.userId;

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 获取分支列表
    const branches = await gitService.getBranches(repoId);

    res.json(branches);
  } catch (error) {
    logger.error('获取分支列表失败:', error);
    res.status(500).json({ error: '获取分支列表失败' });
  }
};

// 创建分支
export const createBranch = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { branchName, startPoint = 'HEAD' } = req.body;
    const userId = req.userId;

    if (!branchName) {
      return res.status(400).json({ error: '缺少分支名称' });
    }

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 创建分支
    const result = await gitService.createBranch(repoId, branchName, startPoint);

    res.json({
      message: '分支创建成功',
      ...result
    });
  } catch (error) {
    logger.error('创建分支失败:', error);
    res.status(500).json({ error: '创建分支失败' });
  }
};

// 切换分支
export const checkoutBranch = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { branchName } = req.body;
    const userId = req.userId;

    if (!branchName) {
      return res.status(400).json({ error: '缺少分支名称' });
    }

    // 验证权限
    const repo = await Repository.findOne({
      where: { id: repoId, ownerId: userId }
    });

    if (!repo) {
      return res.status(404).json({ error: '仓库不存在' });
    }

    // 切换分支
    const result = await gitService.checkoutBranch(repoId, branchName);

    res.json({
      message: '切换分支成功',
      ...result
    });
  } catch (error) {
    logger.error('切换分支失败:', error);
    res.status(500).json({ error: '切换分支失败' });
  }
};
