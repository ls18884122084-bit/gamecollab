import { body, validationResult } from 'express-validator';

// 处理验证结果
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '参数验证失败',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// 注册验证规则
export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度应为 3-50 个字符')
    .isAlphanumeric()
    .withMessage('用户名只能包含字母和数字'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少为 6 个字符')
];

// 登录验证规则
export const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
];

// 修改密码验证规则
export const changePasswordValidation = [
  body('oldPassword')
    .notEmpty()
    .withMessage('请输入原密码'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少为 6 个字符')
];

// 更新资料验证规则
export const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度应为 3-50 个字符')
    .isAlphanumeric()
    .withMessage('用户名只能包含字母和数字'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('头像必须是有效的 URL')
];
