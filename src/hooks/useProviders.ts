import { useQuery } from '@tanstack/react-query';
import { listProviders } from '../lib/tauri';

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
    staleTime: Infinity, // providers don't change during session in Phase 1
  });
}
