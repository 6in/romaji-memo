import { Check, Copy, FileText } from 'lucide-react';
import { useState } from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import type { ConvertResult } from '../lib/tauri';
import { toast } from 'sonner';
import { useBufferStore } from '../store/bufferStore';
import { useConversionStore } from '../store/conversionStore';

interface ResultDisplayProps {
  result: ConvertResult;
}

export function ResultDisplay({ result }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const addToBuffer = useBufferStore((s) => s.addItem);
  const selectedStyleId = useConversionStore((s) => s.selectedStyleId);
  const setClipboardIgnoreUntil = useConversionStore((s) => s.setClipboardIgnoreUntil);
  const editedResult = useConversionStore((s) => s.editedResult);
  const setEditedResult = useConversionStore((s) => s.setEditedResult);

  const displayText = editedResult ?? result.converted;

  const handleCopy = async () => {
    try {
      await writeText(displayText);
      // Ignore clipboard watch callbacks for 1 second after self-copy (T-03-03)
      setClipboardIgnoreUntil(Date.now() + 1000);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-2">
      {/* Converted text — editable textarea (CONV-06) */}
      <div className="relative group">
        <textarea
          value={displayText}
          onChange={(e) => setEditedResult(e.target.value)}
          rows={Math.max(2, displayText.split('\n').length)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full resize-none p-3 bg-muted rounded-md text-foreground text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring${editedResult !== null ? ' border border-primary/50' : ''}`}
        />
        {/* Copy button area — existing + new "バッファに追加" */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={() => {
              addToBuffer(displayText, selectedStyleId);
              toast.success('バッファに追加しました');
            }}
            className="p-1.5 rounded-md bg-background/80 hover:bg-accent transition-colors"
            title="バッファに追加"
          >
            <FileText size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md bg-background/80 hover:bg-accent transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} className="text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Intent display (CONV-04) */}
      {result.intent && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">意図:</span>
          <span>{result.intent}</span>
        </div>
      )}

      {/* Typo correction display (CONV-05) */}
      {result.typo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">修正:</span>
          <span>{result.typo}</span>
        </div>
      )}
    </div>
  );
}
