import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listProviders,
  getProviderConfig,
  upsertProvider,
  deleteProvider,
  pingProvider,
  setActiveProvider,
} from '../lib/tauri';
import type { ProviderConfig } from '../lib/tauri';

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
    staleTime: Infinity,
  });
}

export function useProviderConfig() {
  return useQuery({
    queryKey: ['providerConfig'],
    queryFn: getProviderConfig,
    staleTime: 30_000,
  });
}

export function useUpsertProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: ProviderConfig) => upsertProvider(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providerConfig'] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => deleteProvider(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providerConfig'] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function usePingProvider() {
  return useMutation({
    mutationFn: ({ baseUrl, apiKey }: { baseUrl: string; apiKey: string | null }) =>
      pingProvider(baseUrl, apiKey),
  });
}

export function useSetActiveProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => setActiveProvider(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providerConfig'] });
    },
  });
}
