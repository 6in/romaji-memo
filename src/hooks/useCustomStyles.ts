import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCustomStyles,
  createCustomStyle,
  updateCustomStyle,
  deleteCustomStyle,
} from '../lib/tauri';

export function useCustomStyles() {
  return useQuery({
    queryKey: ['customStyles'],
    queryFn: listCustomStyles,
    staleTime: 30_000,
  });
}

export function useCreateStyle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; label: string; emoji: string; prompt: string; sortOrder: number }) =>
      createCustomStyle(args.id, args.label, args.emoji, args.prompt, args.sortOrder),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customStyles'] }),
  });
}

export function useUpdateStyle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; label: string; emoji: string; prompt: string }) =>
      updateCustomStyle(args.id, args.label, args.emoji, args.prompt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customStyles'] }),
  });
}

export function useDeleteStyle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomStyle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customStyles'] }),
  });
}
