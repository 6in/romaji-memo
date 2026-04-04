import { Loader2 } from 'lucide-react';
import { useConversionStore } from '../store/conversionStore';
import { useSettingsStore } from '../store/settingsStore';
import { useConvert } from '../hooks/useConvert';
import { useProviders } from '../hooks/useProviders';
import { StyleSelector } from './StyleSelector';
import { ResultDisplay } from './ResultDisplay';

export function Converter() {
  const { input, setInput, result, loading, error } = useConversionStore();
  const { activeProviderId, setActiveProviderId } = useSettingsStore();
  const { runConvert } = useConvert();
  const { data: providers } = useProviders();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // D-01: Cmd/Ctrl+Enter triggers conversion
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runConvert();
    }
    // D-02: plain Enter = newline (default textarea behavior, no special handling)
    // D-03: Shift+Enter = newline (default textarea behavior, no special handling)
  };

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      {/* Provider selector (PROV-04) */}
      {providers && providers.length > 1 && (
        <select
          value={activeProviderId}
          onChange={(e) => setActiveProviderId(e.target.value)}
          className="text-xs px-2 py-1 bg-muted text-foreground border border-border rounded-md"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {/* Style selector (CONV-02) */}
      <StyleSelector />

      {/* Romaji input textarea (D-02: multiline) */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="ローマ字を入力... (Cmd/Ctrl+Enter で変換)"
        rows={4}
        className="w-full resize-none rounded-md p-3 bg-muted text-foreground text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
      />

      {/* Convert button */}
      <button
        onClick={runConvert}
        disabled={loading || !input.trim()}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            変換中...
          </>
        ) : (
          '変換'
        )}
      </button>

      {/* Error display */}
      {error && (
        <div className="text-xs text-destructive p-2 bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {/* Result display (CONV-04, CONV-05, CONV-06) */}
      {result && !loading && <ResultDisplay result={result} />}
    </div>
  );
}
