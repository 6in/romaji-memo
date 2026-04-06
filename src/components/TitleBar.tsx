import { Pin, Sun, Moon, Minus, X, Minimize2, Maximize2, ClipboardCheck, ClipboardPaste, FileText, MessageSquarePlus } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { toggleAlwaysOnTop, quitApp, enterMiniMode, exitMiniMode, newConversation } from '../lib/tauri';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SettingsDialog } from './settings/SettingsDialog';
import { useConversionStore } from '../store/conversionStore';
import { useDocumentStore } from '../store/documentStore';

export function TitleBar() {
  const { alwaysOnTop, setAlwaysOnTop, theme, toggleTheme } = useSettingsStore();
  const {
    isMiniMode,
    savedSize,
    isClipboardWatching,
    isDocumentMode,
    setMiniMode,
    setSavedSize,
    setClipboardWatching,
    setDocumentMode,
    setInput,
    setResult,
    setEditedResult,
  } = useConversionStore();
  const clearDocument = useDocumentStore((s) => s.clearDocument);

  const handleDragStart = async (e: React.MouseEvent) => {
    // Only drag on left-click on the drag region itself (not buttons)
    if (e.button !== 0) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error('Failed to start dragging:', err);
    }
  };

  const handleTogglePin = async () => {
    try {
      const newState = await toggleAlwaysOnTop();
      setAlwaysOnTop(newState);
    } catch (err) {
      console.error('Failed to toggle always-on-top:', err);
    }
  };

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (err) {
      console.error('Failed to minimize:', err);
    }
  };

  const handleClose = async () => {
    try {
      await quitApp();
    } catch (err) {
      console.error('Failed to quit:', err);
      // Fallback
      await getCurrentWindow().close();
    }
  };

  const handleToggleMiniMode = async () => {
    try {
      if (isMiniMode) {
        // Exit mini mode: restore saved size
        if (savedSize) {
          await exitMiniMode(savedSize);
        }
        setSavedSize(null);
        setMiniMode(false);
      } else {
        // Enter mini mode: save current size first
        const size = await enterMiniMode();
        setSavedSize(size);
        setMiniMode(true);
      }
    } catch (err) {
      console.error('Failed to toggle mini mode:', err);
    }
  };

  const handleToggleClipboardWatch = () => {
    setClipboardWatching(!isClipboardWatching);
  };

  return (
    <div
      onMouseDown={handleDragStart}
      className="h-8 flex items-center justify-between px-3 select-none cursor-move bg-background/80 backdrop-blur-sm border-b border-border"
    >
      <span className="text-xs font-medium text-muted-foreground pointer-events-none">
        Romaji Memo
      </span>
      <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
        <button
          onClick={handleTogglePin}
          title={alwaysOnTop ? 'Always on Top: ON' : 'Always on Top: OFF'}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <Pin
            size={12}
            className={alwaysOnTop ? 'text-primary fill-primary' : 'text-muted-foreground'}
          />
        </button>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          {theme === 'dark' ? (
            <Sun size={12} className="text-muted-foreground" />
          ) : (
            <Moon size={12} className="text-muted-foreground" />
          )}
        </button>
        {/* Clipboard watch toggle (WINX-06) */}
        <button
          onClick={handleToggleClipboardWatch}
          title={isClipboardWatching ? 'クリップボード監視: ON' : 'クリップボード監視: OFF'}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          {isClipboardWatching ? (
            <ClipboardCheck size={12} className="text-primary fill-primary" />
          ) : (
            <ClipboardPaste size={12} className="text-muted-foreground" />
          )}
        </button>
        {/* 新しい会話ボタン — コンテキストリセット */}
        <button
          onClick={async () => {
            try {
              await newConversation();
              // フロントエンドのステートもクリア
              clearDocument();
              setInput('');
              setResult(null);
              setEditedResult(null);
            } catch (err) {
              console.error('Failed to start new conversation:', err);
            }
          }}
          title="新しい会話（コンテキストリセット）"
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <MessageSquarePlus size={12} className="text-muted-foreground" />
        </button>
        <SettingsDialog />
        {/* Document mode toggle (CONV-08) */}
        <button
          onClick={() => setDocumentMode(!isDocumentMode)}
          disabled={isMiniMode}
          title={isDocumentMode ? '長文書モード: ON' : '長文書モード: OFF'}
          className="p-1 rounded hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText
            size={12}
            className={isDocumentMode ? 'text-primary fill-primary' : 'text-muted-foreground'}
          />
        </button>
        {/* Mini mode toggle (WINX-05) */}
        <button
          onClick={handleToggleMiniMode}
          title={isMiniMode ? 'ミニモード解除' : 'ミニモードに切替'}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          {isMiniMode ? (
            <Maximize2 size={12} className="text-primary" />
          ) : (
            <Minimize2 size={12} className="text-muted-foreground" />
          )}
        </button>
        <button
          onClick={handleMinimize}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <Minus size={12} className="text-muted-foreground" />
        </button>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
