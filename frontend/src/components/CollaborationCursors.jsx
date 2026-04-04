import React, { useEffect, useRef, useMemo } from 'react';
import * as Y from 'yjs';

/**
 * Monaco Editor 协作光标/选区渲染组件
 * 
 * 在编辑器上方叠加显示其他协作者的：
 * - 光标位置（彩色竖线 + 名字标签）
 * - 选区高亮（半透明背景）
 */

export default function CollaborationCursors({ editor, cursors }) {
  const decorationsRef = useRef([]);
  const editorRef = useRef(editor);

  // 同步 editor 引用
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // 渲染所有协作者光标和选区
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !cursors || cursors.size === 0) return;

    const decorations = [];

    cursors.forEach((data, userId) => {
      // 光标
      if (data.position) {
        try {
          const pos = ed.getModel().getPositionAt(data.position.offset);
          if (pos) {
            decorations.push({
              range: {
                startLineNumber: pos.lineNumber,
                startColumn: pos.column,
                endLineNumber: pos.lineNumber,
                endColumn: pos.column + 1,
              },
              options: {
                isWholeLine: false,
                className: 'collab-cursor',
                hoverMessage: { value: `**${data.username}**` },
                beforeContentClassName: 'collab-cursor-line',
                after: {
                  content: data.username,
                  inlineClassName: `collab-cursor-label collab-cursor-${userId.replace(/-/g, '_')}`,
                  cursorStops: 0, // 不影响 Tab 导航
                },
              },
            });
          }
        } catch (e) {
          // 忽略无效位置
        }
      }

      // 选区高亮
      if (data.selection && data.selection.start !== data.selection.end) {
        try {
          const start = ed.getModel().getPositionAt(data.selection.start);
          const end = ed.getModel().getPositionAt(data.selection.end);
          if (start && end) {
            decorations.push({
              range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
              },
              options: {
                isWholeLine: false,
                inlineClassName: `collab-selection-${userId.replace(/-/g, '_')}`,
                hoverMessage: { value: `**${data.username}** 的选区` },
              },
            });
          }
        } catch (e) {
          // 忽略无效选区
        }
      }
    });

    // 应用装饰
    const ids = ed.deltaDecorations(decorationsRef.current, decorations);
    decorationsRef.current = ids;

    return () => {
      // 清理：保留引用以便下次 deltaDecorations 使用
    };
  }, [editor, cursors]);

  return null; // 这个组件不渲染任何 DOM，只操作 Monaco 装饰 API
}

/**
 * 注入协作光标的 CSS 样式到文档
 */
export function injectCollaborationCSS() {
  if (typeof document === 'undefined') return;
  
  if (!document.getElementById('collaboration-cursors-css')) {
    const style = document.createElement('style');
    style.id = 'collaboration-cursors-css';
    style.textContent = `
      /* 协作者光标竖线 */
      .collab-cursor-line::before {
        content: '';
        position: absolute;
        left: -2px;
        top: 0;
        bottom: 0;
        width: 2px;
        background-color: var(--cursor-color, #3b82f6);
        z-index: 5;
      }

      /* 协作者名字标签 */
      .collab-cursor-label {
        font-size: 11px;
        padding: 1px 4px;
        border-radius: 3px;
        color: white;
        margin-left: 4px;
        white-space: nowrap;
        z-index: 10;
        pointer-events: none;
        opacity: 0.9;
        transform: translateY(-100%);
      }

      /* 协作者选区高亮 */
      /* 动态颜色通过 JS 注入 */
    `;
    document.head.appendChild(style);
  }
}

/**
 * 根据用户 ID 和颜色动态注入 CSS 变量
 */
export function updateCursorColors(cursors) {
  if (typeof document === 'undefined') return;
  
  let css = '';
  cursors.forEach((data, userId) => {
    const safeId = userId.replace(/-/g, '_');
    const color = data.color || '#3b82f6';

    // 标签颜色
    css += `.collab-cursor-${safeId} { background-color: ${color}; }\n`;

    // 选区背景色（半透明）
    css += `.collab-selection-${safeId} { 
      background-color: ${color}22; 
      border-left: 2px solid ${color}88;
    }\n`;
  });

  let styleEl = document.getElementById('dynamic-cursor-colors');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-cursor-colors';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
