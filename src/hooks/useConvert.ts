import { useCallback } from 'react';
import { convertText } from '../lib/tauri';
import { useConversionStore } from '../store/conversionStore';
import { useSettingsStore } from '../store/settingsStore';
import { toast } from 'sonner';

export function useConvert() {
  const { input, selectedStyleId, loading, setResult, setLoading, setError } =
    useConversionStore();
  const activeProviderId = useSettingsStore((s) => s.activeProviderId);

  const runConvert = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const result = await convertText(trimmed, selectedStyleId, activeProviderId);
      setResult(result);
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Conversion failed';
      setError(msg);
      toast.error(msg); // D-09: shows toast for API key errors and other failures
    } finally {
      setLoading(false);
    }
  }, [input, selectedStyleId, activeProviderId, loading, setResult, setLoading, setError]);

  return { runConvert, loading };
}
