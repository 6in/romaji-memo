import { useEffect, useRef, useCallback } from 'react';
import { startListening, onTextUpdate } from 'tauri-plugin-clipboard-api';
import { useConversionStore } from '../store/conversionStore';

/**
 * WINX-06: Clipboard watch hook.
 * When enabled, listens for external clipboard changes and calls onText with the new text.
 * Self-copy prevention: ignores callbacks until clipboardIgnoreUntil timestamp (T-03-03).
 * DoS prevention: 300ms debounce on the callback (T-03-01).
 */
export function useClipboardWatch(enabled: boolean, onText: (text: string) => void) {
  const unlistenRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback reference that reads clipboardIgnoreUntil at call time
  const handleText = useCallback(
    (text: string) => {
      const ignoreUntil = useConversionStore.getState().clipboardIgnoreUntil;
      if (Date.now() < ignoreUntil) {
        // Self-copy: ignore (T-03-03)
        return;
      }
      // Debounce 300ms (T-03-01)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onText(text);
      }, 300);
    },
    [onText],
  );

  useEffect(() => {
    if (!enabled) {
      // Stop listening and clean up
      unlistenRef.current?.();
      unlistenRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }

    let stopListeningFn: (() => void) | null = null;

    (async () => {
      try {
        // Register text update listener (CrossCopy tauri-plugin-clipboard)
        const unlistenText = await onTextUpdate((text) => {
          handleText(text);
        });
        // Start background monitor thread
        stopListeningFn = await startListening();
        unlistenRef.current = () => {
          unlistenText();
          stopListeningFn?.();
        };
      } catch (err) {
        console.error('[useClipboardWatch] Failed to start clipboard monitor:', err);
      }
    })();

    return () => {
      unlistenRef.current?.();
      unlistenRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, handleText]);
}
