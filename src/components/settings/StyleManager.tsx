import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { useCustomStyles, useCreateStyle, useUpdateStyle, useDeleteStyle } from '../../hooks/useCustomStyles';

interface StyleForm {
  label: string;
  emoji: string;
  prompt: string;
}

export function StyleManager() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<StyleForm>({ label: '', emoji: '', prompt: '' });

  const { data: styles, isLoading } = useCustomStyles();
  const createMutation = useCreateStyle();
  const updateMutation = useUpdateStyle();
  const deleteMutation = useDeleteStyle();

  const handleEditOpen = (id: string, label: string, emoji: string, prompt: string) => {
    setEditingId(id);
    setIsAdding(false);
    setConfirmDeleteId(null);
    setForm({ label, emoji, prompt });
  };

  const handleEditSave = () => {
    if (!editingId) return;
    updateMutation.mutate(
      { id: editingId, label: form.label, emoji: form.emoji, prompt: form.prompt },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleAddSave = () => {
    createMutation.mutate(
      {
        id: `custom-${Date.now()}`,
        label: form.label,
        emoji: form.emoji,
        prompt: form.prompt,
        sortOrder: (styles?.length ?? 0) + 1,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setForm({ label: '', emoji: '', prompt: '' });
        },
      },
    );
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div>
      {/* カスタムスタイルリスト */}
      {styles && styles.length > 0 ? (
        <div className="mb-4">
          {styles.map((style) => (
            <div key={style.id} className="bg-card border border-border rounded-md p-3 mb-2">
              {editingId === style.id ? (
                /* インライン編集フォーム */
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      className="text-sm flex-1"
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="スタイル名"
                    />
                    <Input
                      className="text-sm w-16"
                      value={form.emoji}
                      onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                      placeholder="絵文字"
                      maxLength={4}
                    />
                  </div>
                  <textarea
                    className="w-full text-xs font-mono border border-border rounded-md p-2 bg-muted resize-none"
                    rows={4}
                    value={form.prompt}
                    onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                    placeholder="変換プロンプト..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEditSave}
                      disabled={updateMutation.isPending || !form.label.trim()}
                      className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-md disabled:opacity-50"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                /* 通常表示 */
                <div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleEditOpen(style.id, style.label, style.emoji, style.prompt)}
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors flex-1 text-left"
                    >
                      <span>{style.emoji}</span>
                      <span>{style.label}</span>
                    </button>
                    {confirmDeleteId === style.id ? null : (
                      <button
                        onClick={() => setConfirmDeleteId(style.id)}
                        className="p-1"
                        title="削除"
                      >
                        <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                  {confirmDeleteId === style.id && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-destructive">本当に削除しますか？</span>
                      <button
                        onClick={() => {
                          deleteMutation.mutate(style.id);
                          setConfirmDeleteId(null);
                        }}
                        className="text-destructive font-medium hover:underline"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-muted-foreground hover:underline"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground mb-4">
          カスタムスタイルはまだありません。
        </div>
      )}

      {/* 追加フォーム */}
      {isAdding && (
        <div className="bg-card border border-border rounded-md p-3 mb-4 space-y-2">
          <div className="flex gap-2">
            <Input
              className="text-sm flex-1"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="スタイル名"
              autoFocus
            />
            <Input
              className="text-sm w-16"
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              placeholder="絵文字"
              maxLength={4}
            />
          </div>
          <textarea
            className="w-full text-xs font-mono border border-border rounded-md p-2 bg-muted resize-none"
            rows={4}
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            placeholder="変換プロンプト..."
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSave}
              disabled={createMutation.isPending || !form.label.trim()}
              className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-md disabled:opacity-50"
            >
              追加
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setForm({ label: '', emoji: '', prompt: '' });
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* スタイルを追加ボタン */}
      {!isAdding && (
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setConfirmDeleteId(null);
            setForm({ label: '', emoji: '✨', prompt: '' });
          }}
          className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-md flex items-center gap-1"
        >
          <Plus size={12} /> スタイルを追加
        </button>
      )}
    </div>
  );
}
