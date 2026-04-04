import { Pin, Sun, Moon, Minus, X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { toggleAlwaysOnTop } from '../lib/tauri';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const { alwaysOnTop, setAlwaysOnTop, theme, toggleTheme } = useSettingsStore();

  const handleTogglePin = async () => {
    try {
      const newState = await toggleAlwaysOnTop();
      setAlwaysOnTop(newState);
    } catch (err) {
      console.error('Failed to toggle always-on-top:', err);
    }
  };

  const handleMinimize = async () => {
    const win = getCurrentWindow();
    await win.minimize();
  };

  const handleClose = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between px-3 select-none cursor-move bg-background/80 backdrop-blur-sm border-b border-border"
    >
      <span data-tauri-drag-region className="text-xs font-medium text-muted-foreground">
        Romaji Memo
      </span>
      <div className="flex items-center gap-1">
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
        <button
          onClick={handleMinimize}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <Minus size={12} className="text-muted-foreground" />
        </button>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-destructive transition-colors"
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
