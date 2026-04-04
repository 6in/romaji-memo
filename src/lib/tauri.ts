import { invoke } from '@tauri-apps/api/core';

// Types for Tauri IPC responses
export interface ConvertResult {
  converted: string;
  intent: string;
  typo: string;
  historyId: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  providerType: string;
}

export interface HistoryRecord {
  id: number;
  input: string;
  converted: string;
  intent: string;
  typo: string;
  styleId: string;
  providerId: string;
  createdAt: string;
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Typed invoke wrappers
export async function convertText(
  input: string,
  styleId: string,
  providerId: string,
): Promise<ConvertResult> {
  return invoke<ConvertResult>('convert_text', { input, styleId, providerId });
}

export async function listProviders(): Promise<ProviderInfo[]> {
  return invoke<ProviderInfo[]>('list_providers');
}

export async function getHistory(
  limit?: number,
  offset?: number,
  styleFilter?: string,
): Promise<HistoryRecord[]> {
  return invoke<HistoryRecord[]>('get_history', { limit, offset, styleFilter });
}

export async function toggleAlwaysOnTop(): Promise<boolean> {
  return invoke<boolean>('toggle_always_on_top');
}

export async function saveWindowState(state: WindowState): Promise<void> {
  return invoke<void>('save_window_state', { state });
}

export async function getWindowState(): Promise<WindowState | null> {
  return invoke<WindowState | null>('get_window_state');
}
