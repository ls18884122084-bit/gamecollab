import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, User, Brain } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-green-400" />
            <span className="text-xl font-bold">超核AI工作台</span>
          </Link>

          {/* 右侧操作区 */}
          {isAuthenticated && user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-medium">
                  {user.username?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                </div>
                <span className="text-sm text-gray-300">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">退出</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
