import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { GitBranch, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('请填写完整的登录信息');
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('登录成功！');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4">
            <GitBranch className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GameColla</h1>
          <p className="text-gray-400 mt-2">游戏协作平台</p>
        </div>

        {/* 登录表单 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/10"
        >
          <h2 className="text-xl font-semibold text-white mb-6">登录</h2>

          {/* 邮箱 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1.5">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          {/* 密码 */}
          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-1.5">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>登录中...</span>
              </span>
            ) : (
              '登 录'
            )}
          </button>

          {/* 切换到注册 */}
          <p className="mt-6 text-center text-sm text-gray-400">
            还没有账号？{' '}
            <Link
              to="/register"
              className="text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              立即注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
