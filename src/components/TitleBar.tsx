import { Pin, Sun, Moon, Minus, X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { toggleAlwaysOnTop, quitApp } from '../lib/tauri';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SettingsDialog } from './settings/SettingsDialog';

export function TitleBar() {
  const { alwaysOnTop, setAlwaysOnTop, theme, toggleTheme } = useSettingsStore();

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
        <SettingsDialog />
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
