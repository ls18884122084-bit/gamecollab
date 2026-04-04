/**
 * Git Service - GitHub API 版本
 * 
 * 将原来的 simple-git + 本地文件系统替换为 GitHub REST API。
 * 所有 Git 操作通过 HTTP API 完成，可在任何 Serverless/云平台运行。
 * 
 * 环境变量:
 *   GITHUB_TOKEN - GitHub Personal Access Token (需要 repo 权限)
 *   GITHUB_USERNAME - GitHub 用户名（用于创建仓库时的 owner）
 */

import logger from '../config/logger.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || '';
const GITHUB_API_BASE = 'https://api.github.com';

// 仓库名前缀：所有 GameColla 创建的仓库都以此前缀命名
const REPO_PREFIX = 'gamecolla-';

class GitService {
  // ========== 内部工具方法 ==========

  /**
   * 获取 GitHub API 请求头
   */
  _getHeaders() {
    return {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GameColla-Backend'
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
   * 格式: gamecolla-{uuid短格式}
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
   * 初始化新仓库 - 在 GitHub 上创建私有仓库并写入初始 README
   */
  async initRepository(repoId, defaultBranch = 'main') {
    try {
      const repoName = this._getRepoName(repoId);

      // 在 GitHub 创建私有仓库
      const ghRepo = await this._githubApi('/user/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName,
          description: 'GameColla 项目仓库',
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
  getRepoPath(repoId) {
    return this._getFullRepoName(repoId);
  }

  /**
   * 检查仓库是否存在（通过 GitHub API 查询）
   */
  async repoExists(repoId) {
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
}

export default new GitService();
