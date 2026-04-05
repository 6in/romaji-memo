import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, FileText, GripVertical, X, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import {
  DndContext,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBufferStore, type BufferItem } from '../store/bufferStore';
import { toast } from 'sonner';

const BUFFER_HEIGHT = 200; // px, UI-SPEC: 200px fixed

function SortableBufferItem({
  item,
  onRemove,
}: {
  item: BufferItem;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center px-3 py-2 h-9 ${
        isDragging ? 'shadow-lg scale-[1.02]' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mr-2 text-muted-foreground"
        aria-label="並び替え"
      >
        <GripVertical size={14} />
      </button>
      <span className="text-xs text-foreground truncate flex-1">{item.text}</span>
      <button
        onClick={() => onRemove(item.id)}
        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="削除"
      >
        <X size={12} className="text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

export function DraftBuffer() {
  const [isOpen, setIsOpen] = useState(false);
  const { items, removeItem, reorder, copyAll } = useBufferStore();
  const windowWidthRef = useRef(420);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
  );

  // Resize window when buffer opens/closes (same pattern as HistoryDrawer)
  useEffect(() => {
    (async () => {
      const win = getCurrentWindow();
      const size = await win.outerSize();
      windowWidthRef.current = size.width;
      const currentHeight = size.height;
      const newHeight = isOpen ? currentHeight + BUFFER_HEIGHT : currentHeight - BUFFER_HEIGHT;
      await win.setSize(new LogicalSize(size.width, Math.max(newHeight, 400)));
    })();
  }, [isOpen]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    reorder(oldIndex, newIndex);
  };

  const handleCopyAll = async () => {
    const text = copyAll();
    await writeText(text);
    toast.success(`${items.length}件コピーしました`);
  };

  return (
    <div className="border-t border-border">
      {/* トグルボタン — UI-SPEC: HistoryDrawer と同じスタイル */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <FileText size={12} />
        <span>バッファ ({items.length})</span>
        {isOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {isOpen && (
        <div className="bg-background" style={{ height: `${BUFFER_HEIGHT - 32}px` }}>
          {items.length === 0 ? (
            /* 空状態 — UI-SPEC Copywriting */
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-xs font-semibold text-muted-foreground">バッファは空です</p>
              <p className="text-xs text-muted-foreground mt-1">
                変換結果の「バッファに追加」でストックできます。
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item) => (
                      <SortableBufferItem key={item.id} item={item} onRemove={removeItem} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              {/* 全コピーボタン — UI-SPEC */}
              <button
                onClick={handleCopyAll}
                className="w-full flex items-center justify-center gap-1 py-1.5 bg-secondary text-secondary-foreground hover:bg-muted text-xs transition-colors"
              >
                <Copy size={12} />
                全コピー ({items.length}件)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
