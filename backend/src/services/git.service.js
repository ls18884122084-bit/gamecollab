/**
 * Git Service - GitHub API + 本地文件系统双模式
 *
 * 优先使用 GitHub REST API（需要 GITHUB_TOKEN）。
 * 当 GitHub API 不可达时自动降级为本地文件系统模式。
 *
 * 环境变量:
 *   GITHUB_TOKEN - GitHub Personal Access Token (需要 repo 权限)
 *   GITHUB_USERNAME - GitHub 用户名
 *   GIT_LOCAL_MODE - 设为 "1" 强制使用本地文件系统模式
 *   LOCAL_REPO_ROOT - 本地模式下的根目录 (默认: /tmp/chaohai-repos)
 */

import logger from '../config/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || '';
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_PREFIX = 'chaohai-';

// 本地模式配置
const FORCE_LOCAL = process.env.GIT_LOCAL_MODE === '1' || !GITHUB_TOKEN;
// 向上两级到 backend/，再进入 data/repos/
const LOCAL_REPO_ROOT = process.env.LOCAL_REPO_ROOT ||
  path.resolve(__dirname, '..', '..', '..', 'data', 'repos');

class GitService {
  // ========== 模式检测 ==========

  constructor() {
    this._localMode = false;  // 延迟检测
    this._githubAvailable = null;  // 缓存检测结果
  }

  /**
   * 检测是否应使用本地模式
   */
  async _isLocalMode() {
    if (FORCE_LOCAL) return true;
    if (this._githubAvailable === false) return true;
    if (this._githubAvailable === true) return false;

    // 探测 GitHub API 是否可达（3秒超时）
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(GITHUB_API_BASE, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Chaohai-Workbench' }
      });
      clearTimeout(timeout);
      this._githubAvailable = res.ok;
      if (!res.ok) {
        logger.warn('GitHub API 返回异常 (' + res.status + ')，切换到本地文件系统模式');
      }
      return !res.ok;
    } catch (e) {
      logger.warn('GitHub API 不可达 (' + e.message.slice(0, 60) + '), 切换到本地文件系统模式');
      this._githubAvailable = false;
      return true;
    }
  }

  /**
   * 获取仓库的本地目录路径
   */
  _getLocalRepoDir(repoId) {
    return path.join(LOCAL_REPO_ROOT, repoId);
  }

  /**
   * 确保仓库目录存在
   */
  async _ensureLocalRepo(repoId) {
    const dir = this._getLocalRepoDir(repoId);
    await fs.mkdir(dir, { recursive: true });
    // 写入 .gitkeep 保持目录被 git 跟踪（如果需要）
    return dir;
  }

  // ========== 内部工具方法 ==========

  /**
   * 获取 GitHub API 请求头
   */
  _getHeaders() {
    return {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Chaohai-Workbench'
    };
  }

  /**
   * GitHub API 请求封装
   */
  async _githubApi(path, options = {}) {
    const url = `${GITHUB_API_BASE}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this._getHeaders(), ...options.headers }
    });

    if (response.status === 204) return null; // No Content
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`GitHub API Error [${response.status}]: ${data.message || JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * 根据 repoId 推算 GitHub 仓库名
   * 格式: chaohai-{uuid短格式}
   */
  _getRepoName(repoId) {
    return `${REPO_PREFIX}${repoId.replace(/-/g, '')}`;
  }

  /**
   * 获取完整的 GitHub 仓库路径 (owner/repo)
   */
  _getFullRepoName(repoId) {
    return `${GITHUB_USERNAME}/${this._getRepoName(repoId)}`;
  }

  /**
   * Base64 编码文件内容
   */
  _encodeContent(content) {
    return Buffer.from(content, 'utf-8').toString('base64');
  }

  /**
   * Base64 解码文件内容
   */
  _decodeContent(base64Content) {
    return Buffer.from(base64Content, 'base64').toString('utf-8');
  }

  // ========== 公共 API（与原版接口保持一致）==========

  /**
   * 初始化新仓库
   */
  async initRepository(repoId, defaultBranch = 'main') {
    if (await this._isLocalMode()) {
      return this._localInitRepo(repoId, defaultBranch);
    }
    try {
      const repoName = this._getRepoName(repoId);

      // 在 GitHub 创建私有仓库
      const ghRepo = await this._githubApi('/user/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName,
          description: '超核AI工作台 项目',
          private: true,
          auto_init: false,
          has_issues: false,
          has_wiki: false,
          has_projects: false,
          default_branch: defaultBranch
        })
      });

      // 写入初始 README
      const readmeContent = this._encodeContent('# 新建仓库\n\n开始你的项目吧！\n');
      await this._githubApi(
        `/repos/${GITHUB_USERNAME}/${repoName}/contents/README.md`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Initial commit',
            content: readmeContent,
            branch: defaultBranch
          })
        }
      );

      logger.info(`GitHub 仓库初始化成功: ${repoId} -> ${ghRepo.html_url}`);
      return { success: true, path: ghRepo.full_name, url: ghRepo.html_url };
    } catch (error) {
      logger.error(`GitHub 仓库初始化失败: ${repoId}`, error);
      throw error;
    }
  }

  /**
   * 获取仓库路径（兼容旧接口，返回 GitHub full name）
   */
  async getRepoPath(repoId) {
    if (await this._isLocalMode()) { return this._getLocalRepoDir(repoId); }
    return this._getFullRepoName(repoId);
  }

  /**
   * 检查仓库是否存在
   */
  async repoExists(repoId) {
    if (await this._isLocalMode()) {
      try { await fs.access(this._getLocalRepoDir(repoId)); return true; }
      catch(e) { return false; }
    }
    try {
      const fullName = this._getFullRepoName(repoId);
      await this._githubApi(`/repos/${fullName}`);
      return true;
    } catch (e) {
      if (e.message.includes('404')) return false;
      throw e;
    }
  }

  /**
   * 获取文件树 - 通过 GitHub API 获取目录内容
   */
  async getFileTree(repoId, ref = 'HEAD', dirPath = '') {
    if (await this._isLocalMode()) {
      return this._localGetFileTree(repoId, dirPath);
    }
    try {
      const fullName = this._getFullRepoName(repoId);
      
      // 如果指定了目录路径，获取该目录的内容
      let apiUrl;
      if (dirPath && dirPath !== '.') {
        apiUrl = `/repos/${fullName}/contents/${dirPath}?ref=${ref === 'HEAD' ? '' : ref}`;
      } else {
        // 获取根目录
        apiUrl = `/repos/${fullName}/contents?${ref === 'HEAD' ? '' : 'ref=' + ref}`;
      }

      const contents = await this._githubApi(apiUrl);

      // 递归获取子目录中的文件
      const files = [];
      const collectFiles = async (items, prefix = '') => {
        for (const item of items) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.type === 'dir') {
            try {
              const subContents = await this._githubApi(
                `/repos/${fullName}/contents/${fullPath}?ref=${ref === 'HEAD' ? '' : ref}`
              );
              await collectFiles(subContents, fullPath);
            } catch {
              // 子目录可能为空或无权限
              files.push(fullPath + '/');
            }
          } else if (item.type === 'file') {
            files.push(fullPath);
          }
        }
      };

      // 处理返回值（可能是数组或单个对象）
      const items = Array.isArray(contents) ? contents : [contents];
      await collectFiles(items);

      return files;
    } catch (error) {
      logger.error(`获取文件树失败: ${repoId}`, error);
      throw error;
    }
  }

  /**
   * 获取文件内容 - GitHub Contents API
   */
  async getFileContent(repoId, filePath, ref = 'HEAD') {
    if (await this._isLocalMode()) {
      return this._localGetFileContent(repoId, filePath);
    }
    try {
      const fullName = this._getFullRepoName(repoId);
      let apiUrl = `/repos/${fullName}/contents/${filePath}`;
      if (ref && ref !== 'HEAD') {
        apiUrl += `?ref=${ref}`;
      }

      const data = await this._githubApi(apiUrl);

      if (!data.content) {
        return null;
      }

      return this._decodeContent(data.content);
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        return null;
      }
      logger.error(`获取文件内容失败: ${repoId}/${filePath}`, error);
      throw error;
    }
  }

  /**
   * 写入文件并提交 - GitHub API PUT contents
   */
  async writeFileAndCommit(repoId, filePath, content, message, author) {
    if (await this._isLocalMode()) {
      return this._localWriteFile(repoId, filePath, content, message);
    }
    try {
      const fullName = this._getFullRepoName(repoId);
      const encodedContent = this._encodeContent(content);

      // 先检查文件是否已存在（需要 sha 来更新）
      let bodyData;
      try {
        const existingFile = await this._githubApi(`/repos/${fullName}/contents/${filePath}`);
        bodyData = {
          message,
          content: encodedContent,
          sha: existingFile.sha,
          committer: {
            name: author.username,
            email: author.email
          }
        };
      } catch (e) {
        // 文件不存在，创建新文件
        bodyData = {
          message,
          content: encodedContent,
          committer: {
            name: author.username,
            email: author.email
          }
        };
      }

      const result = await this._githubApi(
        `/repos/${fullName}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        }
      );

      logger.info(`文件提交成功: ${repoId}/${filePath}`);
      return {
        success: true,
        commit: result.commit.sha,
        summary: {
          changes: 1,
          insertions: content.split('\n').length,
          deletions: 0
        }
      };
    } catch (error) {
      logger.error(`文件提交失败: ${repoId}/${filePath}`, error);
      throw error;
    }
  }

  /**
   * 删除文件并提交 - GitHub API DELETE contents
   */
  async deleteFileAndCommit(repoId, filePath, message, author) {
    if (await this._isLocalMode()) {
      return this._localDeleteFile(repoId, filePath);
    }
    try {
      const fullName = this._getFullRepoName(repoId);

      // 获取文件的当前 sha
      const existingFile = await this._githubApi(`/repos/${fullName}/contents/${filePath}`);

      const result = await this._githubApi(
        `/repos/${fullName}/contents/${filePath}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sha: existingFile.sha,
            committer: {
              name: author.username,
              email: author.email
            }
          })
        }
      );

      logger.info(`文件删除成功: ${repoId}/${filePath}`);
      return {
        success: true,
        commit: result.commit.sha
      };
    } catch (error) {
      logger.error(`文件删除失败: ${repoId}/${filePath}`, error);
      throw error;
    }
  }

  /**
   * 获取提交历史 - GitHub Commits API
   */
  async getCommitHistory(repoId, limit = 50, filePath = null) {
    if (await this._isLocalMode()) {
      return [{ hash: 'local-0001', date: new Date().toISOString(), message: 'Local mode commits not tracked', author_name: 'system', author_email: 'system@localhost' }];
    }
    try {
      const fullName = this._getFullRepoName(repoId);
      let apiUrl = `/repos/${fullName}/commits?per_page=${limit}`;

      if (filePath) {
        apiUrl += `&path=${encodeURIComponent(filePath)}`;
      }

      const commits = await this._githubApi(apiUrl);

      // 转换为与 simple-git 兼容的格式
      return commits.map(commit => ({
        hash: commit.sha,
        date: commit.commit.author.date,
        message: commit.commit.message,
        author_name: commit.commit.author.name,
        author_email: commit.commit.author.email
      }));
    } catch (error) {
      logger.error(`获取提交历史失败: ${repoId}`, error);
      throw error;
    }
  }

  /**
   * 获取提交详情（diff）- GitHub Commits API
   */
  async getCommitDiff(repoId, commitHash) {
    if (await this._isLocalMode()) { return 'Local mode: commit diff not available'; }
    try {
      const fullName = this._getFullRepoName(repoId);
      const commit = await this._githubApi(`/repos/${fullName}/commits/${commitHash}`);

      // 格式化 diff 输出
      const files = commit.files || [];
      let diffStr = `Commit: ${commitHash}\n`;
      diffStr += `Author: ${commit.commit?.author?.name} <${commit.commit?.author?.email}>\n`;
      diffStr += `Date: ${commit.commit?.author?.date}\n\n`;
      diffStr += `${commit.commit?.message}\n\n`;

      for (const file of files) {
        diffStr += `--- a/${file.filename}\n+++ b/${file.filename}\n`;
        diffStr += file.patch || '';
        diffStr += '\n';
      }

      return diffStr;
    } catch (error) {
      logger.error(`获取提交详情失败: ${repoId}/${commitHash}`, error);
      throw error;
    }
  }

  /**
   * 获取分支列表 - GitHub Branches API
   */
  async getBranches(repoId) {
    if (await this._isLocalMode()) { return { all: ['main'], current: 'main' }; }
    try {
      const fullName = this._getFullRepoName(repoId);
      const branches = await this._githubApi(`/repos/${fullName}/branches`);

      const branchNames = branches.map(b => b.name);
      // 尝试获取默认分支作为当前分支
      const defaultBranch = branches.length > 0 ? branches[0].name : 'main';

      return {
        all: branchNames,
        current: defaultBranch
      };
    } catch (error) {
      logger.error(`获取分支列表失败: ${repoId}`, error);
      throw error;
    }
  }

  /**
   * 创建分支 - GitHub Git References API
   */
  async createBranch(repoId, branchName, startPoint = 'HEAD') {
    if (await this._isLocalMode()) { return { success: true, branch: branchName }; }
    try {
      const fullName = this._getFullRepoName(repoId);

      // 获取起始点的 SHA
      let startSha;
      if (startPoint === 'HEAD') {
        const repoInfo = await this._githubApi(`/repos/${fullName}`);
        startSha = repoInfo.default_branch_sha || (await this._githubApi(`/repos/${fullName}/git/ref/heads/main`)).object.sha;
      } else {
        startSha = (await this._githubApi(`/repos/${fullName}/git/refs/heads/${startPoint}`)).object.sha;
      }

      // 创建分支引用
      await this._githubApi(`/repos/${fullName}/git/refs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: startSha
        })
      });

      logger.info(`分支创建成功: ${repoId}/${branchName}`);
      return { success: true, branch: branchName };
    } catch (error) {
      logger.error(`创建分支失败: ${repoId}/${branchName}`, error);
      throw error;
    }
  }

  /**
   * 切换分支（概念性操作 - 记录当前工作分支）
   * 注：GitHub API 没有"切换"概念，这里仅验证分支存在性
   */
  async checkoutBranch(repoId, branchName) {
    if (await this._isLocalMode()) { return { success: true, branch: branchName }; }
    try {
      const fullName = this._getFullRepoName(repoId);
      
      // 验证分支存在
      await this._githubApi(`/repos/${fullName}/branches/${branchName}`);

      logger.info(`切换分支成功: ${repoId}/${branchName}`);
      return { success: true, branch: branchName };
    } catch (error) {
      logger.error(`切换分支失败: ${repoId}/${branchName}`, error);
      throw error;
    }
  }

  /**
   * 删除仓库 - GitHub API 删除
   */
  async deleteRepository(repoId) {
    if (await this._isLocalMode()) {
      try { await fs.rm(this._getLocalRepoDir(repoId), { recursive: true, force: true }); } catch(e) {}
      return { success: true };
    }
    try {
      const fullName = this._getFullRepoName(repoId);

      try {
        await this._githubApi(`/repos/${fullName}`, { method: 'DELETE' });
        logger.info(`GitHub 仓库删除成功: ${repoId}`);
      } catch (e) {
        // 仓库可能已不存在，不算错误
        if (!e.message.includes('404')) {
          throw e;
        }
        logger.info(`GitHub 仓库不存在，跳过删除: ${repoId}`);
      }

      return { success: true };
    } catch (error) {
      logger.error(`删除仓库失败: ${repoId}`, error);
      throw error;
    }
  }
  // ========== 本地文件系统模式实现 ==========

  async _localInitRepo(repoId, defaultBranch) {
    const dir = await this._ensureLocalRepo(repoId);
    // 写入 README
    const readmePath = path.join(dir, 'README.md');
    await fs.writeFile(readmePath, '# 新建仓库\n\n开始你的项目吧！\n', 'utf-8');
    logger.info('本地仓库初始化成功: ' + repoId + ' -> ' + dir);
    return { success: true, path: dir, url: 'local://' + dir };
  }

  async _localGetFileTree(repoId, dirPath) {
    const dir = this._getLocalRepoDir(repoId);
    const targetDir = dirPath ? path.join(dir, dirPath) : dir;
    const files = [];

    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      for (const entry of entries) {
        // 跳过隐藏文件
        if (entry.name.startsWith('.')) continue;
        const relPath = dirPath ? dirPath + '/' + entry.name : entry.name;
        if (entry.isDirectory()) {
          files.push(relPath + '/');
          // 递归子目录（只一层）
          try {
            const subEntries = await fs.readdir(path.join(targetDir, entry.name), { withFileTypes: true });
            for (const sub of subEntries) {
              if (!sub.name.startsWith('.')) {
                files.push(relPath + '/' + sub.name);
              }
            }
          } catch (e) {
            // 子目录读取失败，忽略
          }
        } else {
          files.push(relPath);
        }
      }
    } catch (e) {
      logger.warn('读取本地文件树失败: ' + e.message);
    }

    return files;
  }

  async _localGetFileContent(repoId, filePath) {
    const fullPath = path.join(this._getLocalRepoDir(repoId), filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  async _localWriteFile(repoId, filePath, content, message) {
    const dir = await this._ensureLocalRepo(repoId);
    const fullPath = path.join(dir, filePath);

    // 确保子目录存在
    const fileDir = path.dirname(fullPath);
    await fs.mkdir(fileDir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
    logger.info('本地文件写入成功: ' + repoId + '/' + filePath + ' (' + content.length + ' bytes)');
    return {
      success: true,
      commit: 'local-' + Date.now(),
      summary: { changes: 1, insertions: content.split('\n').length, deletions: 0 }
    };
  }

  async _localDeleteFile(repoId, filePath) {
    const fullPath = path.join(this._getLocalRepoDir(repoId), filePath);
    try {
      await fs.unlink(fullPath);
      logger.info('本地文件删除成功: ' + repoId + '/' + filePath);
      return { success: true, commit: 'local-' + Date.now() };
    } catch (e) {
      if (e.code === 'ENOENT') return { success: true };
      throw e;
    }
  }

  /**
   * 本地模式下 getCommitHistory 返回模拟数据
   */
  async getCommitHistory(repoId, limit, filePath) {
    if (await this._isLocalMode()) {
      return [{ hash: 'local-0001', date: new Date().toISOString(), message: 'Local mode commits not tracked', author_name: 'system', author_email: 'system@localhost' }];
    }
    // ... original GitHub code follows
  }
}

export default new GitService();
