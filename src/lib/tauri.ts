import { invoke } from '@tauri-apps/api/core';

// --- Types ---

export interface ConvertResult {
  converted: string;
  intent: string;
  typo: string;
  historyId: number;
}

export interface ConversionRecord {
  id: number;
  input: string;
  output: string;
  styleId: string;
  intent: string | null;
  typo: string | null;
  providerId: string;
  model: string;
  pinned: boolean;
  createdAt: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  providerType: string;
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- Commands ---

export async function convertText(
  input: string,
  styleId: string,
  providerId: string,
): Promise<ConvertResult> {
  return invoke<ConvertResult>('convert', { input, styleId, providerId });
}

export async function getHistory(
  limit: number,
  offset: number,
  styleFilter?: string,
): Promise<ConversionRecord[]> {
  return invoke<ConversionRecord[]>('get_history', { limit, offset, styleFilter });
}

export async function listProviders(): Promise<ProviderInfo[]> {
  return invoke<ProviderInfo[]>('list_providers');
}

export async function toggleAlwaysOnTop(): Promise<boolean> {
  return invoke<boolean>('toggle_always_on_top');
}

export async function saveWindowState(
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  return invoke('save_window_state', { x, y, width, height });
}

export async function getWindowState(): Promise<WindowState | null> {
  const json = await invoke<string | null>('get_window_state');
  if (!json) return null;
  return JSON.parse(json) as WindowState;
}
