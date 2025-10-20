"use client";

import { useEffect } from 'react';
import { initConsoleFilter } from '@/utils/consoleFilter';

/**
 * Client component that initializes console filtering on mount
 * Suppresses misleading TensorFlow Lite INFO messages that appear as errors
 */
export default function ConsoleFilterInit() {
  useEffect(() => {
    initConsoleFilter();
  }, []);

  return null; // This component doesn't render anything
}

