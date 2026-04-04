import { useQuery } from '@tanstack/react-query';
import { getHistory } from '../lib/tauri';

export function useHistory(enabled: boolean = true) {
  return useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(50, 0),
    enabled,
    staleTime: 30_000,
  });
}
