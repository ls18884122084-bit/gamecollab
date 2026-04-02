import express from 'express';
import {
  createRepository,
  getRepositories,
  getRepository,
  updateRepository,
  deleteRepository
} from '../controllers/repo.controller.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 创建仓库
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('仓库名长度应为 1-100 个字符'),
    body('description')
      .optional()
      .trim(),
    body('isPrivate')
      .optional()
      .isBoolean()
      .withMessage('isPrivate 必须是布尔值')
  ],
  handleValidationErrors,
  createRepository
);

// 获取仓库列表
router.get('/', getRepositories);

// 获取仓库详情
router.get('/:id', getRepository);

// 更新仓库
router.put('/:id', updateRepository);

// 删除仓库
router.delete('/:id', deleteRepository);

export default router;
