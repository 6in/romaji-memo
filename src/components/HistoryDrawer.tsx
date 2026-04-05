import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Search, Pin, Trash2 } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { useQueryClient } from '@tanstack/react-query';
import { useHistoryStore } from '../store/historyStore';
import { useConversionStore } from '../store/conversionStore';
import { useHistory } from '../hooks/useHistory';
import { BUILT_IN_STYLES } from '../lib/styles';
import { pinHistory, deleteHistory } from '../lib/tauri';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const DRAWER_HEIGHT = 280; // px
const BASE_HEIGHT = 600;   // matches tauri.conf.json default
const MIN_HEIGHT = 400;    // minimum window height guard (RESEARCH.md Q3)

export function HistoryDrawer() {
  const { isDrawerOpen, toggleDrawer } = useHistoryStore();
  const { setInput, setSelectedStyleId } = useConversionStore();
  const queryClient = useQueryClient();
  const windowWidthRef = useRef(420);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState<string | null>(null);

  // 300ms debounce for search (HIST-04, T-02-08: trim on frontend)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: history, isLoading } = useHistory({
    enabled: isDrawerOpen,
    search: debouncedSearch,
    styleFilter,
  });

  // D-12: Resize window when drawer opens/closes (NOT overlay)
  // Minimum height guard ensures window never shrinks below MIN_HEIGHT
  // (addresses RESEARCH.md Q3 — Windows setSize() minimum constraints)
  useEffect(() => {
    (async () => {
      const win = getCurrentWindow();
      const scale = await win.scaleFactor();
      const physSize = await win.outerSize();
      const logWidth = physSize.width / scale;
      windowWidthRef.current = logWidth;
      const targetHeight = isDrawerOpen ? BASE_HEIGHT + DRAWER_HEIGHT : BASE_HEIGHT;
      const newHeight = Math.max(targetHeight, MIN_HEIGHT);
      await win.setSize(new LogicalSize(logWidth, newHeight));
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

  // HIST-06: Pin toggle with optimistic invalidation
  const handlePin = async (id: number, pinned: boolean) => {
    await pinHistory(id, pinned);
    queryClient.invalidateQueries({ queryKey: ['history'] });
  };

  // HIST-07: Delete without confirmation, immediate
  const handleDelete = async (id: number) => {
    await deleteHistory(id);
    queryClient.invalidateQueries({ queryKey: ['history'] });
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

  const hasHistory = history && history.length > 0;
  const isSearching = debouncedSearch.length > 0 || styleFilter !== null;

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
          className="overflow-y-auto bg-background flex flex-col"
          style={{ height: `${DRAWER_HEIGHT - 32}px` }}
        >
          {/* Search bar (HIST-04) */}
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="キーワード検索..."
                className="h-8 pl-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isLoading && debouncedSearch && (
              <span className="text-xs text-muted-foreground mt-1 block">検索中...</span>
            )}
          </div>

          {/* Style filter chips (HIST-05) */}
          <div className="flex gap-1 px-3 py-1.5 overflow-x-auto shrink-0">
            {/* "すべて" chip */}
            <Badge
              className={cn(
                'cursor-pointer text-[10px] px-1.5 py-0.5 whitespace-nowrap',
                styleFilter === null
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : ''
              )}
              variant={styleFilter === null ? 'default' : 'secondary'}
              onClick={() => setStyleFilter(null)}
            >
              すべて
            </Badge>
            {BUILT_IN_STYLES.map((style) => (
              <Badge
                key={style.id}
                className={cn(
                  'cursor-pointer text-[10px] px-1.5 py-0.5 whitespace-nowrap',
                  styleFilter === style.id
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : ''
                )}
                variant={styleFilter === style.id ? 'default' : 'secondary'}
                onClick={() => setStyleFilter(styleFilter === style.id ? null : style.id)}
              >
                {style.label}
              </Badge>
            ))}
          </div>

          {/* Loading state */}
          {isLoading && !debouncedSearch && (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              Loading...
            </div>
          )}

          {/* Empty state — no history at all */}
          {!isLoading && !hasHistory && !isSearching && (
            <div className="flex flex-col items-center justify-center py-8 gap-1">
              <span className="text-xs font-medium text-foreground">履歴がありません</span>
              <span className="text-[10px] text-muted-foreground">変換すると、ここに表示されます。</span>
            </div>
          )}

          {/* Empty state — search/filter returned nothing */}
          {!isLoading && !hasHistory && isSearching && (
            <div className="flex flex-col items-center justify-center py-8 gap-1">
              <span className="text-xs font-medium text-foreground">見つかりませんでした</span>
              <span className="text-[10px] text-muted-foreground">別のキーワードで試してください。</span>
            </div>
          )}

          {/* History list */}
          {hasHistory && (
            <div className="divide-y divide-border flex-1 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-primary truncate flex-1">
                      {getStyleLabel(item.styleId)}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Pin icon (HIST-06) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePin(item.id, !item.pinned);
                        }}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                        title={item.pinned ? 'ピン解除' : 'ピン留め'}
                      >
                        <Pin
                          size={12}
                          className={item.pinned ? 'text-primary fill-primary' : 'text-muted-foreground'}
                        />
                      </button>
                      {/* Timestamp */}
                      <span className="text-[10px] text-muted-foreground ml-0.5">
                        {formatTime(item.createdAt)}
                      </span>
                      {/* Delete button (HIST-07) — hover only */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-muted ml-0.5"
                        title="削除"
                      >
                        <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground mt-0.5 truncate">
                    {item.output}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
