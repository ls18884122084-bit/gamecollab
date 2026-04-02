import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import logger from '../config/logger.js';

const REPO_BASE_PATH = process.env.REPO_STORAGE_PATH || './repositories';

class GitService {
  // 初始化新仓库
  async initRepository(repoId, defaultBranch = 'main') {
    try {
      const repoPath = this.getRepoPath(repoId);

      // 创建目录
      await fs.mkdir(repoPath, { recursive: true });

      // 初始化 Git
      const git = simpleGit(repoPath);
      await git.init();

      // 配置默认分支
      await git.checkoutLocalBranch(defaultBranch);

      // 创建初始 README
      const readmePath = path.join(repoPath, 'README.md');
      await fs.writeFile(readmePath, '# 新建仓库\n\n开始你的项目吧！\n');

      // 初始提交
      await git.add('.');
      await git.commit('Initial commit');

      logger.info(`仓库初始化成功: ${repoId}`);
      return { success: true, path: repoPath };
    } catch (error) {
      logger.error(`仓库初始化失败: ${repoId}`, error);
      throw error;
    }
  }

  // 获取仓库路径
  getRepoPath(repoId) {
    return path.join(REPO_BASE_PATH, repoId);
  }

  // 检查仓库是否存在
  async repoExists(repoId) {
    const repoPath = this.getRepoPath(repoId);
    return existsSync(repoPath);
  }

  // 获取文件树
  async getFileTree(repoId, ref = 'HEAD', dirPath = '') {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      // 列出文件
      const files = await git.raw([
        'ls-tree',
        '-r',
        '--name-only',
        ref,
        dirPath
      ]);

      return files.trim().split('\n').filter(f => f);
    } catch (error) {
      logger.error(`获取文件树失败: ${repoId}`, error);
      throw error;
    }
  }

  // 获取文件内容
  async getFileContent(repoId, filePath, ref = 'HEAD') {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      const content = await git.show([`${ref}:${filePath}`]);
      return content;
    } catch (error) {
      if (error.message.includes('does not exist')) {
        return null;
      }
      logger.error(`获取文件内容失败: ${repoId}/${filePath}`, error);
      throw error;
    }
  }

  // 写入文件并提交
  async writeFileAndCommit(repoId, filePath, content, message, author) {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      // 写入文件
      const fullPath = path.join(repoPath, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      // 添加到暂存区
      await git.add(filePath);

      // 提交
      const commitResult = await git.commit(message, filePath, {
        '--author': `${author.username} <${author.email}>`
      });

      logger.info(`文件提交成功: ${repoId}/${filePath}`);
      return {
        success: true,
        commit: commitResult.commit,
        summary: commitResult.summary
      };
    } catch (error) {
      logger.error(`文件提交失败: ${repoId}/${filePath}`, error);
      throw error;
    }
  }

  // 删除文件并提交
  async deleteFileAndCommit(repoId, filePath, message, author) {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      // 删除文件
      await git.rm(filePath);

      // 提交
      const commitResult = await git.commit(message, filePath, {
        '--author': `${author.username} <${author.email}>`
      });

      logger.info(`文件删除成功: ${repoId}/${filePath}`);
      return {
        success: true,
        commit: commitResult.commit
      };
    } catch (error) {
      logger.error(`文件删除失败: ${repoId}/${filePath}`, error);
      throw error;
    }
  }

  // 获取提交历史
  async getCommitHistory(repoId, limit = 50, filePath = null) {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      const options = {
        maxCount: limit,
        format: {
          hash: '%H',
          date: '%ai',
          message: '%s',
          author_name: '%an',
          author_email: '%ae'
        }
      };

      if (filePath) {
        options.file = filePath;
      }

      const log = await git.log(options);
      return log.all;
    } catch (error) {
      logger.error(`获取提交历史失败: ${repoId}`, error);
      throw error;
    }
  }

  // 获取提交详情
  async getCommitDiff(repoId, commitHash) {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      const diff = await git.show([commitHash]);
      return diff;
    } catch (error) {
      logger.error(`获取提交详情失败: ${repoId}/${commitHash}`, error);
      throw error;
    }
  }

  // 获取分支列表
  async getBranches(repoId) {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      const branches = await git.branch();
      return {
        all: branches.all,
        current: branches.current
      };
    } catch (error) {
      logger.error(`获取分支列表失败: ${repoId}`, error);
      throw error;
    }
  }

  // 创建分支
  async createBranch(repoId, branchName, startPoint = 'HEAD') {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      await git.checkoutBranch(branchName, startPoint);

      logger.info(`分支创建成功: ${repoId}/${branchName}`);
      return { success: true, branch: branchName };
    } catch (error) {
      logger.error(`分支创建失败: ${repoId}/${branchName}`, error);
      throw error;
    }
  }

  // 切换分支
  async checkoutBranch(repoId, branchName) {
    try {
      const repoPath = this.getRepoPath(repoId);
      const git = simpleGit(repoPath);

      await git.checkout(branchName);

      logger.info(`切换分支成功: ${repoId}/${branchName}`);
      return { success: true, branch: branchName };
    } catch (error) {
      logger.error(`切换分支失败: ${repoId}/${branchName}`, error);
      throw error;
    }
  }

  // 删除仓库
  async deleteRepository(repoId) {
    try {
      const repoPath = this.getRepoPath(repoId);

      if (existsSync(repoPath)) {
        await fs.rm(repoPath, { recursive: true, force: true });
        logger.info(`仓库删除成功: ${repoId}`);
      }

      return { success: true };
    } catch (error) {
      logger.error(`仓库删除失败: ${repoId}`, error);
      throw error;
    }
  }
}

export default new GitService();
