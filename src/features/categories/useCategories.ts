// React Query hooks for master data.
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export function useCategories() { return useQuery({ queryKey: ['categories'], queryFn: api.getCategories, staleTime: 60_000 }); }
export function useAccounts() { return useQuery({ queryKey: ['accounts'], queryFn: api.getAccounts, staleTime: 60_000 }); }
