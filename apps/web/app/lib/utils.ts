import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const FMT = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** Money in tenge, e.g. 11000 → "11 000 ₸". */
export function money(value: number | string): string {
  return `${FMT.format(Number(value))} ₸`;
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
}
