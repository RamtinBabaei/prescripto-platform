import { useQuery } from '@tanstack/react-query';
import type { Doctor, User } from './types';
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data === 'object' && data !== null && 'error' in data
        ? String(data.error)
        : 'Request failed',
    );
  return data as T;
}
export const useDoctors = () =>
  useQuery({
    queryKey: ['doctors'],
    queryFn: () => request<Doctor[]>('/doctors'),
    staleTime: 60000,
  });
export const useUser = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => request<User | null>('/me'),
    staleTime: 60000,
    retry: false,
  });
export const specialties = [
  'General physician',
  'Gynecologist',
  'Dermatologist',
  'Pediatricians',
  'Neurologist',
  'Gastroenterologist',
];
export const asset = (name: string) => `/assets/${name}`;
export const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
