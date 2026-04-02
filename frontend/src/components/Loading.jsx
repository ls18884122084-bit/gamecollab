import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ text = '加载中...', fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{content}</div>;
}
