'use client';

import * as React from 'react';

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
};

export function toast({ title, description, variant }: ToastProps) {
  if (typeof window !== 'undefined') {
    // For clean alert or toast behavior
    console.log(`[Toast ${variant || 'default'}] ${title}: ${description}`);
  }
}

export function useToast() {
  return { toast };
}
