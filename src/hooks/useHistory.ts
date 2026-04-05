import { useQuery } from '@tanstack/react-query';
import { getHistory, searchHistory } from '../lib/tauri';

interface UseHistoryOptions {
  enabled?: boolean;
  search?: string;
  styleFilter?: string | null;
  limit?: number;
  offset?: number;
}

export function useHistory(options: UseHistoryOptions = {}) {
  const {
    enabled = true,
    search = '',
    styleFilter = null,
    limit = 50,
    offset = 0,
  } = options;

  return useQuery({
    queryKey: ['history', search, styleFilter, limit, offset],
    queryFn: () => {
      if (search.trim()) {
        return searchHistory(search.trim(), styleFilter, limit, offset);
      }
      return getHistory(limit, offset, styleFilter ?? undefined);
    },
    enabled,
    staleTime: 10_000,
  });
}
