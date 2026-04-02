import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 占位路由（协作功能待实现）
router.get('/pending', (req, res) => {
  res.json({ collaborations: [] });
});

export default router;
