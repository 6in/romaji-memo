import { useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi';
import { Toaster } from 'sonner';
import { TitleBar } from './components/TitleBar';
import { Converter } from './components/Converter';
import { DocumentMode } from './components/DocumentMode';
import { HistoryDrawer } from './components/HistoryDrawer';
import { DraftBuffer } from './components/DraftBuffer';
import { useSettingsStore } from './store/settingsStore';
import { useConversionStore } from './store/conversionStore';
import { saveWindowState, getWindowState } from './lib/tauri';
import { useClipboardWatch } from './hooks/useClipboardWatch';

const queryClient = new QueryClient();

function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

function App() {
  const theme = useSettingsStore((s) => s.theme);
  const { isMiniMode, isClipboardWatching, isDocumentMode, setInput } = useConversionStore();

  // Stable onText callback for clipboard watch
  const handleClipboardText = useCallback(
    (text: string) => {
      setInput(text);
    },
    [setInput],
  );

  // WINX-06: Clipboard watch — enabled when isClipboardWatching is true
  useClipboardWatch(isClipboardWatching, handleClipboardText);

  // Apply theme to document root (D-15)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Restore window state on mount (WINX-03, D-17)
  useEffect(() => {
    (async () => {
      try {
        const state = await getWindowState();
        if (state) {
          const win = getCurrentWindow();
          await win.setPosition(new LogicalPosition(state.x, state.y));
          await win.setSize(new LogicalSize(state.width, state.height));
        }
      } catch (err) {
        console.error('Failed to restore window state:', err);
      }
    })();
  }, []);

  // Save window state on move/resize (debounced 500ms)
  // Skip save when in mini-mode to avoid persisting the reduced size
  useEffect(() => {
    const win = getCurrentWindow();
    const save = debounce(async () => {
      // Do not overwrite saved size while in mini-mode (WINX-05)
      if (useConversionStore.getState().isMiniMode) return;
      try {
        const pos = await win.outerPosition();
        const size = await win.outerSize();
        await saveWindowState(pos.x, pos.y, size.width, size.height);
      } catch (err) {
        console.error('Failed to save window state:', err);
      }
    }, 500);

    let unlistenMove: (() => void) | null = null;
    let unlistenResize: (() => void) | null = null;

    (async () => {
      unlistenMove = await win.onMoved(save);
      unlistenResize = await win.onResized(save);
    })();

    return () => {
      unlistenMove?.();
      unlistenResize?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden rounded-lg">
        <TitleBar />
        <main className="flex-1 overflow-y-auto">
          {/* CONV-08: long-document mode replaces Converter */}
          {isDocumentMode ? <DocumentMode /> : <Converter />}
        </main>
        {/* Hide DraftBuffer and HistoryDrawer in mini-mode (WINX-05) or document mode (CONV-08) */}
        {!isMiniMode && !isDocumentMode && <DraftBuffer />}
        {!isMiniMode && !isDocumentMode && <HistoryDrawer />}
      </div>
      <Toaster position="bottom-center" richColors theme={theme} />
    </QueryClientProvider>
  );
}

export default App;
