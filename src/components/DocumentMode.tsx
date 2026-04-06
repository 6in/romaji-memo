import { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2, ChevronDown, ChevronRight, Copy, ArrowLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useDocumentStore } from '../store/documentStore';
import { useConversionStore } from '../store/conversionStore';
import { useSettingsStore } from '../store/settingsStore';
import { exportDocument, convertText } from '../lib/tauri';
import { useConvert } from '../hooks/useConvert';
import { StyleSelector } from './StyleSelector';

export function DocumentMode() {
  const {
    paragraphs,
    previewText,
    appendParagraph,
    removeParagraph,
    updateParagraph,
    clearDocument,
    getExportContent,
    setPreviewText,
  } = useDocumentStore();
  const { input, setInput, result, loading, selectedStyleId } = useConversionStore();
  const activeProviderId = useSettingsStore((s) => s.activeProviderId);
  const { runConvert } = useConvert();

  const [previewLoading, setPreviewLoading] = useState(false);

  // 変換成功の検出: result が変化したときに段落を追加する
  const prevResultRef = useRef(result);
  // 変換前の入力テキストを保持 (appendParagraph 呼び出し時に使う)
  const pendingInputRef = useRef('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 段落リスト末尾のスクロールターゲット
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // 段落が追加されたときに最下部へスクロール (編集時はスクロールしない)
  useEffect(() => {
    if (paragraphs.length > 0) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [paragraphs.length]);

  // 変換実行前に入力を保存
  const handleConvert = () => {
    pendingInputRef.current = input.trim();
    runConvert();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleConvert();
    }
  };

  // result が変わったら段落を追加し、input をクリア
  useEffect(() => {
    if (result !== null && result !== prevResultRef.current) {
      appendParagraph(pendingInputRef.current, result.converted, selectedStyleId);
      setInput('');
      pendingInputRef.current = '';
    }
    prevResultRef.current = result;
  }, [result, appendParagraph, setInput, selectedStyleId]);

  const handleExport = async (format: 'md' | 'txt') => {
    if (paragraphs.length === 0) {
      toast.error('エクスポートする段落がありません');
      return;
    }
    try {
      const content = getExportContent(format);
      const saved = await exportDocument(content, format);
      if (saved) {
        toast.success('エクスポートしました');
      }
    } catch (err) {
      toast.error('エクスポートに失敗しました');
      console.error('Export error:', err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // プレビューモードを開く: 全段落を結合
  const handleOpenPreview = () => {
    const combined = paragraphs.map((p) => p.output).join('\n\n');
    setPreviewText(combined);
  };

  // プレビューからクリップボードにコピー
  const handleCopyPreview = async () => {
    if (!previewText) return;
    try {
      await writeText(previewText);
      toast.success('コピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  // プレビューに口調変換をかける
  const handleConvertPreview = async () => {
    if (!previewText?.trim()) return;
    setPreviewLoading(true);
    try {
      const result = await convertText(previewText, selectedStyleId, activeProviderId);
      setPreviewText(result.converted);
      toast.success('変換しました');
    } catch (err) {
      const msg = typeof err === 'string' ? err : '変換に失敗しました';
      toast.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  // --- プレビュービュー ---
  if (previewText !== null) {
    return (
      <div className="flex flex-col h-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewText(null)}
              className="p-1 rounded hover:bg-accent transition-colors"
              title="段落ビューに戻る"
            >
              <ArrowLeft size={12} className="text-muted-foreground" />
            </button>
            <span className="text-xs font-semibold text-foreground">プレビュー</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyPreview}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border bg-muted hover:bg-accent transition-colors"
              title="クリップボードにコピー"
            >
              <Copy size={10} />
              コピー
            </button>
            <div className="relative group">
              <button className="text-xs px-2 py-1 rounded-md border border-border bg-muted hover:bg-accent transition-colors">
                エクスポート ▾
              </button>
              <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-md z-10 hidden group-hover:block min-w-max">
                <button
                  onClick={() => handleExport('md')}
                  className="block w-full text-left text-xs px-3 py-2 hover:bg-accent transition-colors"
                >
                  .md でエクスポート
                </button>
                <button
                  onClick={() => handleExport('txt')}
                  className="block w-full text-left text-xs px-3 py-2 hover:bg-accent transition-colors"
                >
                  .txt でエクスポート
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* プレビュー textarea */}
        <div className="flex-1 overflow-hidden p-3">
          <textarea
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="w-full h-full resize-none rounded-md p-3 bg-muted text-foreground text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* 口調変換エリア */}
        <div className="flex flex-col gap-2 p-3 border-t border-border shrink-0">
          <StyleSelector />
          <button
            onClick={handleConvertPreview}
            disabled={previewLoading || !previewText.trim()}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {previewLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                変換中...
              </>
            ) : (
              '全文を口調変換'
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- 段落リストビュー ---
  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">
          長文書モード
          <span className="ml-2 text-muted-foreground font-normal">
            ({paragraphs.length} 段落)
          </span>
        </span>
        <div className="flex items-center gap-1">
          {/* プレビューボタン */}
          <button
            onClick={handleOpenPreview}
            disabled={paragraphs.length === 0}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="全文プレビュー"
          >
            <Eye size={10} />
            プレビュー
          </button>
          {/* エクスポートドロップダウン */}
          <div className="relative group">
            <button
              className="text-xs px-2 py-1 rounded-md border border-border bg-muted hover:bg-accent transition-colors"
              title="エクスポート"
            >
              エクスポート ▾
            </button>
            <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-md z-10 hidden group-hover:block min-w-max">
              <button
                onClick={() => handleExport('md')}
                className="block w-full text-left text-xs px-3 py-2 hover:bg-accent transition-colors"
              >
                .md でエクスポート
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="block w-full text-left text-xs px-3 py-2 hover:bg-accent transition-colors"
              >
                .txt でエクスポート
              </button>
            </div>
          </div>
          {/* 全消去ボタン */}
          <button
            onClick={clearDocument}
            disabled={paragraphs.length === 0}
            className="text-xs px-2 py-1 rounded-md border border-border bg-muted hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="全消去"
          >
            全消去
          </button>
        </div>
      </div>

      {/* 蓄積リスト */}
      <div className="flex-1 overflow-y-auto">
        {paragraphs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <p className="text-xs font-semibold text-muted-foreground">段落がありません</p>
            <p className="text-xs text-muted-foreground mt-1">
              段落を変換すると、ここに蓄積されます
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paragraphs.map((p) => (
              <div key={p.id} className="group px-3 py-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {/* 変換結果テキスト (インライン編集) */}
                    <textarea
                      value={p.output}
                      onChange={(e) => updateParagraph(p.id, e.target.value)}
                      rows={Math.max(2, p.output.split('\n').length)}
                      className="w-full resize-none rounded-sm px-1 py-0.5 bg-transparent text-xs text-foreground border border-transparent hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                    />
                    {/* 入力テキスト (折りたたみ) */}
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="flex items-center gap-0.5 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedIds.has(p.id) ? (
                        <ChevronDown size={10} />
                      ) : (
                        <ChevronRight size={10} />
                      )}
                      <span>入力</span>
                    </button>
                    {expandedIds.has(p.id) && (
                      <p className="mt-1 text-xs text-muted-foreground break-words pl-3">
                        {p.input}
                      </p>
                    )}
                  </div>
                  {/* 削除ボタン */}
                  <button
                    onClick={() => removeParagraph(p.id)}
                    className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    aria-label="段落を削除"
                  >
                    <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
            {/* 自動スクロール用ターゲット */}
            <div ref={scrollEndRef} />
          </div>
        )}
      </div>

      {/* 入力エリア (下部固定) */}
      <div className="flex flex-col gap-2 p-3 border-t border-border shrink-0">
        <StyleSelector />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ローマ字を入力... (Cmd/Ctrl+Enter で変換)"
          rows={3}
          className="w-full resize-none rounded-md p-3 bg-muted text-foreground text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
        <button
          onClick={handleConvert}
          disabled={loading || !input.trim()}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              変換中...
            </>
          ) : (
            '変換して追加'
          )}
        </button>
      </div>
    </div>
  );
}
