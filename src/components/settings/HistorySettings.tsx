import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { getHistoryLimit, setHistoryLimit } from '../../lib/tauri';
import { toast } from 'sonner';

export function HistorySettings() {
  const [limit, setLimit] = useState(1000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHistoryLimit().then(setLimit).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setHistoryLimit(limit);
      toast.success('設定を保存しました');
    } catch (err) {
      toast.error('保存できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="font-semibold text-xs text-foreground">履歴の保存件数</label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-20 text-right text-sm"
            min={10}
            max={10000}
          />
          <span className="text-xs text-muted-foreground">件</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          制限を超えた場合、ピン留めされていない古い履歴から削除されます。
        </p>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground text-xs px-4 py-1.5 rounded-md disabled:opacity-50"
      >
        設定を保存
      </button>
    </div>
  );
}
