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

  const handleCopy = async () => {
    try {
      await writeText(result.converted);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-2">
      {/* Converted text with copy button (CONV-06) */}
      <div className="relative group">
        <div className="p-3 bg-muted rounded-md text-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {result.converted}
        </div>
        {/* Copy button area — existing + new "バッファに追加" */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={() => {
              addToBuffer(result.converted, selectedStyleId);
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
