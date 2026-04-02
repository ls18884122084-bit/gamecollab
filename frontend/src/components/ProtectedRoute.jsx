import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Loading from './Loading';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user, fetchUser, token } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (token && !user) {
        try {
          await fetchUser();
        } catch {
          // fetchUser 失败会自动清除 token
        }
      }
      setChecking(false);
    };
    check();
  }, []);

  if (checking) {
    return <Loading fullScreen text="验证登录状态..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
