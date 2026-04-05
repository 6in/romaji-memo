import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { useQueryClient } from '@tanstack/react-query';
import { useHistoryStore } from '../store/historyStore';
import { useConversionStore } from '../store/conversionStore';
import { useHistory } from '../hooks/useHistory';
import { BUILT_IN_STYLES } from '../lib/styles';

const DRAWER_HEIGHT = 280; // px
const BASE_HEIGHT = 600;   // matches tauri.conf.json default
const MIN_HEIGHT = 400;    // minimum window height guard (RESEARCH.md Q3)

export function HistoryDrawer() {
  const { isDrawerOpen, toggleDrawer } = useHistoryStore();
  const { setInput, setSelectedStyleId } = useConversionStore();
  const { data: history, isLoading } = useHistory({ enabled: isDrawerOpen });
  const queryClient = useQueryClient();
  const windowWidthRef = useRef(420);

  // D-12: Resize window when drawer opens/closes (NOT overlay)
  // Minimum height guard ensures window never shrinks below MIN_HEIGHT
  // (addresses RESEARCH.md Q3 — Windows setSize() minimum constraints)
  useEffect(() => {
    (async () => {
      const win = getCurrentWindow();
      const size = await win.outerSize();
      windowWidthRef.current = size.width;
      const targetHeight = isDrawerOpen ? BASE_HEIGHT + DRAWER_HEIGHT : BASE_HEIGHT;
      const newHeight = Math.max(targetHeight, MIN_HEIGHT);
      await win.setSize(new LogicalSize(size.width, newHeight));
    })();
  }, [isDrawerOpen]);

  // Refresh history when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    }
  }, [isDrawerOpen, queryClient]);

  // D-13: Click history item to reload input
  const handleItemClick = (item: { input: string; styleId: string }) => {
    setInput(item.input);
    setSelectedStyleId(item.styleId);
  };

  // Look up style label from BUILT_IN_STYLES
  const getStyleLabel = (styleId: string): string => {
    return BUILT_IN_STYLES.find((s) => s.id === styleId)?.label ?? styleId;
  };

  // Format timestamp
  const formatTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="border-t border-border">
      {/* Toggle button */}
      <button
        onClick={toggleDrawer}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Clock size={12} />
        <span>履歴</span>
        {isDrawerOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {/* Drawer content (D-11, D-14) */}
      {isDrawerOpen && (
        <div
          className="overflow-y-auto bg-background"
          style={{ height: `${DRAWER_HEIGHT - 32}px` }}
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              Loading...
            </div>
          )}

          {!isLoading && (!history || history.length === 0) && (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              履歴がありません
            </div>
          )}

          {history && history.length > 0 && (
            <div className="divide-y divide-border">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">
                      {getStyleLabel(item.styleId)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground mt-0.5 truncate">
                    {item.output}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
