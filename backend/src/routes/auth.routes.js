import express from 'express';
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  handleValidationErrors
} from '../middleware/validation.js';

const router = express.Router();

// 公开路由
router.post(
  '/register',
  registerValidation,
  handleValidationErrors,
  register
);

router.post(
  '/login',
  loginValidation,
  handleValidationErrors,
  login
);

// 需要认证的路由
router.get('/me', authenticate, getCurrentUser);

router.put(
  '/profile',
  authenticate,
  updateProfileValidation,
  handleValidationErrors,
  updateProfile
);

router.put(
  '/password',
  authenticate,
  changePasswordValidation,
  handleValidationErrors,
  changePassword
);

export default router;
