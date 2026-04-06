import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

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

export async function quitApp(): Promise<void> {
  return invoke('quit_app');
}

export async function getWindowState(): Promise<WindowState | null> {
  const json = await invoke<string | null>('get_window_state');
  if (!json) return null;
  return JSON.parse(json) as WindowState;
}

// --- Phase 2 Types ---

export interface CustomStyle {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
  sortOrder: number;
  createdAt: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  adapter: string;
  baseUrl: string | null;
  apiKey: string | null;
  model: string;
  enabled: boolean;
}

export interface ProvidersFile {
  providers: ProviderConfig[];
  defaultProvider: string;
}

// --- History Commands ---

export async function searchHistory(
  query: string,
  styleFilter: string | null,
  limit: number,
  offset: number,
): Promise<ConversionRecord[]> {
  return invoke<ConversionRecord[]>('search_history', { query, styleFilter, limit, offset });
}

export async function pinHistory(id: number, pinned: boolean): Promise<void> {
  return invoke('pin_history', { id, pinned });
}

export async function deleteHistory(id: number): Promise<void> {
  return invoke('delete_history', { id });
}

export async function setHistoryLimit(limit: number): Promise<void> {
  return invoke('set_history_limit', { limit });
}

export async function getHistoryLimit(): Promise<number> {
  return invoke<number>('get_history_limit');
}

// --- Style Commands ---

export async function listCustomStyles(): Promise<CustomStyle[]> {
  return invoke<CustomStyle[]>('list_styles');
}

export async function createCustomStyle(
  id: string,
  label: string,
  emoji: string,
  prompt: string,
  sortOrder: number,
): Promise<void> {
  return invoke('create_style', { id, label, emoji, prompt, sortOrder });
}

export async function updateCustomStyle(
  id: string,
  label: string,
  emoji: string,
  prompt: string,
): Promise<void> {
  return invoke('update_style', { id, label, emoji, prompt });
}

export async function deleteCustomStyle(id: string): Promise<void> {
  return invoke('delete_style', { id });
}

// --- Provider Commands ---

export async function getProviderConfig(): Promise<ProvidersFile> {
  return invoke<ProvidersFile>('get_provider_config');
}

export async function upsertProvider(config: ProviderConfig): Promise<void> {
  return invoke('upsert_provider', { config });
}

export async function deleteProvider(providerId: string): Promise<void> {
  return invoke('delete_provider', { providerId });
}

export async function pingProvider(baseUrl: string, apiKey: string | null): Promise<string> {
  return invoke<string>('ping_provider', { baseUrl, apiKey });
}

export async function setActiveProvider(providerId: string): Promise<void> {
  return invoke('set_active_provider', { providerId });
}

// --- Mini Mode (WINX-05) ---

const MINI_HEIGHT = 120; // TitleBar(32px) + textarea(~78px) + padding

export async function enterMiniMode(): Promise<{ width: number; height: number }> {
  const win = getCurrentWindow();
  // outerSize() returns PhysicalSize; divide by scaleFactor to get logical pixels
  const physSize = await win.outerSize();
  const scale = await win.scaleFactor();
  const logWidth = physSize.width / scale;
  const logHeight = physSize.height / scale;
  await win.setMinSize(null);
  await win.setSize(new LogicalSize(logWidth, MINI_HEIGHT));
  return { width: logWidth, height: logHeight };
}

export async function exitMiniMode(savedSize: { width: number; height: number }): Promise<void> {
  const win = getCurrentWindow();
  await win.setSize(new LogicalSize(savedSize.width, savedSize.height));
  // Restore minHeight constraint from tauri.conf.json value
  await win.setMinSize(new LogicalSize(320, 400));
}

// --- Copilot Device Flow ---

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export async function startCopilotAuth(): Promise<DeviceCodeResponse> {
  return invoke<DeviceCodeResponse>('start_copilot_auth');
}

export async function pollCopilotAuth(
  deviceCode: string,
  interval: number,
  providerId: string,
): Promise<void> {
  return invoke('poll_copilot_auth', { deviceCode, interval, providerId });
}

// --- Conversation Context (履歴ストッパー) ---

export function newConversation(): Promise<void> {
  return invoke('new_conversation');
}

// --- Document Export (CONV-08) ---

export async function exportDocument(content: string, format: 'md' | 'txt'): Promise<boolean> {
  const path = await save({
    filters: [{ name: format === 'md' ? 'Markdown' : 'Text', extensions: [format] }],
    defaultPath: `document.${format}`,
  });
  if (!path) return false;
  await writeTextFile(path, content);
  return true;
}
