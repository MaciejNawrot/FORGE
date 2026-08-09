import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class strings, with later classes winning conflicts.
 *
 * Both clsx and tailwind-merge are pure string manipulation with no DOM
 * access, so this is safe to use from primitives that will later render
 * on React Native via NativeWind.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
