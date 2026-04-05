import { useState } from 'react';
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../ui/input';
import {
  useProviderConfig,
  useUpsertProvider,
  useDeleteProvider,
  usePingProvider,
  useSetActiveProvider,
} from '../../hooks/useProviders';
import { useSettingsStore } from '../../store/settingsStore';
import type { ProviderConfig } from '../../lib/tauri';

export function ProviderSettings() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProviderConfig>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: providerConfig, isLoading } = useProviderConfig();
  const { activeProviderId, setActiveProviderId } = useSettingsStore();
  const upsertMutation = useUpsertProvider();
  const deleteMutation = useDeleteProvider();
  const pingMutation = usePingProvider();
  const setActiveProviderMutation = useSetActiveProvider();

  const handleEdit = (provider: ProviderConfig) => {
    setEditingId(provider.id);
    setEditForm({ ...provider });
    setPingResult(null);
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setPingResult(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.id) return;
    // api_key が空文字なら送信しない (既存キーを維持)
    const formToSend = { ...editForm } as ProviderConfig;
    if (formToSend.apiKey === '') {
      formToSend.apiKey = null;
    }
    await upsertMutation.mutateAsync(formToSend);
    setEditingId(null);
    setEditForm({});
    setIsAdding(false);
    setPingResult(null);
  };

  const handleDelete = async (providerId: string) => {
    await deleteMutation.mutateAsync(providerId);
    setConfirmDeleteId(null);
    if (editingId === providerId) {
      setEditingId(null);
      setEditForm({});
    }
  };

  const handlePing = async () => {
    setPingResult(null);
    try {
      const result = await pingMutation.mutateAsync({
        baseUrl: editForm.baseUrl || '',
        apiKey: editForm.apiKey ?? null,
      });
      setPingResult({ success: true, message: result });
    } catch (err) {
      setPingResult({ success: false, message: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleSetActive = async (providerId: string) => {
    await setActiveProviderMutation.mutateAsync(providerId);
    setActiveProviderId(providerId);
  };

  const handleAddNew = () => {
    const newId = crypto.randomUUID().slice(0, 8);
    setIsAdding(true);
    setEditingId(newId);
    setEditForm({
      id: newId,
      name: '',
      adapter: 'openai',
      baseUrl: '',
      apiKey: '',
      model: '',
      enabled: true,
    });
    setPingResult(null);
    setConfirmDeleteId(null);
  };

  const isLocalProvider = (provider: Partial<ProviderConfig>) =>
    provider.adapter === 'openai' &&
    (provider.baseUrl?.includes('localhost') || provider.baseUrl?.includes('127.0.0.1'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const providers = providerConfig?.providers ?? [];

  return (
    <div className="space-y-2">
      {providers.map((provider) => {
        const isEditing = editingId === provider.id;
        const isActive = activeProviderId === provider.id;
        const isLocal = isLocalProvider(provider);

        return (
          <div key={provider.id} className="bg-card border border-border rounded-md overflow-hidden">
            {/* カードヘッダー */}
            <div
              className={`flex items-center gap-2 p-3 ${!isEditing ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
              onClick={() => !isEditing && handleEdit(provider)}
            >
              {/* アクティブインジケーター */}
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
              {!isActive && (
                <div className="w-2 h-2 rounded-full bg-transparent flex-shrink-0" />
              )}
              <span className="text-sm font-medium flex-1">{provider.name}</span>
              {isLocal && (
                <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                  ローカル
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{provider.adapter}</span>
              {!isActive && !isEditing && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSetActive(provider.id); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  title="アクティブに設定"
                >
                  設定
                </button>
              )}
              {isEditing ? (
                <ChevronUp size={14} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={14} className="text-muted-foreground" />
              )}
            </div>

            {/* インライン編集フォーム */}
            {isEditing && (
              <div className="border-t border-border p-3 space-y-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">名前</label>
                  <Input
                    className="text-sm h-7"
                    value={editForm.name ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="プロバイダー名"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">アダプター</label>
                  <select
                    className="w-full text-sm h-7 rounded-md border border-input bg-background px-2 py-0 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={editForm.adapter ?? 'openai'}
                    onChange={(e) => setEditForm({ ...editForm, adapter: e.target.value })}
                  >
                    <option value="anthropic">anthropic</option>
                    <option value="openai">openai</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Base URL</label>
                  <Input
                    className="text-xs font-mono h-7"
                    value={editForm.baseUrl ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">モデル</label>
                  <Input
                    className="text-sm h-7"
                    value={editForm.model ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                    placeholder="gpt-4o"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">API キー</label>
                  <Input
                    type="password"
                    className="text-xs font-mono h-7"
                    value={editForm.apiKey === '<encrypted>' ? '' : (editForm.apiKey ?? '')}
                    onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                    placeholder={
                      provider.apiKey === '<encrypted>'
                        ? '(変更する場合のみ入力)'
                        : 'sk-...'
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`enabled-${provider.id}`}
                    checked={editForm.enabled ?? true}
                    onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor={`enabled-${provider.id}`} className="text-xs text-muted-foreground">
                    有効
                  </label>
                </div>

                {/* 接続テスト */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handlePing}
                    disabled={pingMutation.isPending}
                    className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-md disabled:opacity-50 flex items-center gap-1"
                  >
                    {pingMutation.isPending ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        テスト中...
                      </>
                    ) : (
                      '接続テスト'
                    )}
                  </button>
                  {pingResult?.success && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      接続成功
                    </span>
                  )}
                  {pingResult && !pingResult.success && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                      接続失敗: {pingResult.message}
                    </span>
                  )}
                </div>

                {/* 保存/キャンセル/削除 */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={upsertMutation.isPending}
                      className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-md disabled:opacity-50"
                    >
                      {upsertMutation.isPending ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-md"
                    >
                      キャンセル
                    </button>
                  </div>

                  {/* 削除 */}
                  {!isAdding && (
                    <div>
                      {confirmDeleteId === provider.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-destructive">本当に削除しますか？</span>
                          <button
                            onClick={() => handleDelete(provider.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded hover:bg-destructive/20"
                          >
                            削除
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-muted-foreground px-2 py-0.5"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(provider.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 新規追加フォーム */}
      {isAdding && editingId && !providers.find((p) => p.id === editingId) && (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="p-3 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">新規プロバイダー</span>
          </div>
          <div className="p-3 space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">名前</label>
              <Input
                className="text-sm h-7"
                value={editForm.name ?? ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="プロバイダー名"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">アダプター</label>
              <select
                className="w-full text-sm h-7 rounded-md border border-input bg-background px-2 py-0 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={editForm.adapter ?? 'openai'}
                onChange={(e) => setEditForm({ ...editForm, adapter: e.target.value })}
              >
                <option value="anthropic">anthropic</option>
                <option value="openai">openai</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Base URL</label>
              <Input
                className="text-xs font-mono h-7"
                value={editForm.baseUrl ?? ''}
                onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">モデル</label>
              <Input
                className="text-sm h-7"
                value={editForm.model ?? ''}
                onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                placeholder="gpt-4o"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">API キー</label>
              <Input
                type="password"
                className="text-xs font-mono h-7"
                value={editForm.apiKey ?? ''}
                onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled-new"
                checked={editForm.enabled ?? true}
                onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="enabled-new" className="text-xs text-muted-foreground">
                有効
              </label>
            </div>

            {/* 接続テスト */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePing}
                disabled={pingMutation.isPending}
                className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-md disabled:opacity-50 flex items-center gap-1"
              >
                {pingMutation.isPending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    テスト中...
                  </>
                ) : (
                  '接続テスト'
                )}
              </button>
              {pingResult?.success && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  接続成功
                </span>
              )}
              {pingResult && !pingResult.success && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                  接続失敗: {pingResult.message}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={upsertMutation.isPending}
                className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-md disabled:opacity-50"
              >
                {upsertMutation.isPending ? '保存中...' : '追加'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-md"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プロバイダーを追加ボタン */}
      {!isAdding && (
        <button
          onClick={handleAddNew}
          className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-md flex items-center gap-1 mt-2"
        >
          <Plus size={12} />
          プロバイダーを追加
        </button>
      )}
    </div>
  );
}
