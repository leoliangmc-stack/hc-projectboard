import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Whether the primary pointer is a finger (phones, tablets): the same condition as Tailwind's
 * `pointer-coarse:` variant and the `tap-target` utility. Only call this in the browser.
 */
export function isTouchScreen() {
  return window.matchMedia('(pointer: coarse)').matches
}
