// utils.ts
// cn() is a helper to merge Tailwind class names cleanly.
// It uses clsx for conditional classes and tailwind-merge to resolve conflicts
// (e.g. if you pass both "p-2" and "p-4", it keeps only "p-4").

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
