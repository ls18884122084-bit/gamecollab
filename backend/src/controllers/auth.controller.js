import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import logger from '../config/logger.js';

// 生成 JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// 用户注册
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email 
          ? '邮箱已被注册' 
          : '用户名已被使用'
      });
    }

    // 创建用户
    const user = await User.create({
      username,
      email,
      password
    });

    // 生成 Token
    const token = generateToken(user.id);

    logger.info(`新用户注册: ${username}`);

    res.status(201).json({
      message: '注册成功',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    logger.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
};

// 用户登录
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 检查账号是否激活
    if (!user.isActive) {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    // 生成 Token
    const token = generateToken(user.id);

    logger.info(`用户登录: ${user.username}`);

    res.json({
      message: '登录成功',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    logger.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

// 获取当前用户信息
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

// 更新用户信息
export const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查用户名是否被占用
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: '用户名已被使用' });
      }
      user.username = username;
    }

    if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    logger.info(`用户更新资料: ${user.username}`);

    res.json({
      message: '更新成功',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新失败，请稍后重试' });
  }
};

// 修改密码
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证旧密码
    const isValidPassword = await user.validatePassword(oldPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: '原密码错误' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    logger.info(`用户修改密码: ${user.username}`);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    logger.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败，请稍后重试' });
  }
};
