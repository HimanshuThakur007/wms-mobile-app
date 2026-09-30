import { useState, useRef, useEffect, useCallback } from 'react';
import { TextInput } from 'react-native';

interface UseHardwareScannerOptions {
  onProcessBarcode: (code: string) => Promise<void> | void;
  isModalOpen?: boolean;
}

export function useHardwareScanner({
  onProcessBarcode,
  isModalOpen = false,
}: UseHardwareScannerOptions) {
  const inputRef = useRef<TextInput>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);
  const barcodeBufferRef = useRef<string>('');
  const refocusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const processingRef = useRef<boolean>(false);

  const [itemCode, setItemCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const clearAndRefocus = useCallback(() => {
    setItemCode('');
    barcodeBufferRef.current = '';

    refocusTimersRef.current.forEach((t) => clearTimeout(t));
    refocusTimersRef.current = [];

    if (!isModalOpen) {
      const t1 = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      const t2 = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      refocusTimersRef.current = [t1, t2];
    }
  }, [isModalOpen]);

  const processBarcodeInternal = useCallback(
    async (scannedCode: string) => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      const trimmed = scannedCode.replace(/[\r\n\t]+/g, '').trim();
      if (!trimmed) {
        clearAndRefocus();
        return;
      }

      if (processingRef.current) {
        setItemCode('');
        barcodeBufferRef.current = '';
        return;
      }

      const now = Date.now();
      if (
        trimmed.toLowerCase() === lastCodeRef.current.toLowerCase() &&
        now - lastTimeRef.current < 350
      ) {
        setItemCode('');
        barcodeBufferRef.current = '';
        return;
      }

      lastCodeRef.current = trimmed;
      lastTimeRef.current = now;

      try {
        processingRef.current = true;
        setScanning(true);
        await onProcessBarcode(trimmed);
      } finally {
        processingRef.current = false;
        barcodeBufferRef.current = '';
        setScanning(false);
      }
    },
    [clearAndRefocus, onProcessBarcode]
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setItemCode(text);
      barcodeBufferRef.current = text;

      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      if (/[\r\n\t]/.test(text)) {
        processBarcodeInternal(text);
        return;
      }

      if (text.trim().length >= 2) {
        scanTimerRef.current = setTimeout(() => {
          processBarcodeInternal(barcodeBufferRef.current);
        }, 100);
      }
    },
    [processBarcodeInternal]
  );

  const resetScannerHistory = useCallback(() => {
    lastCodeRef.current = '';
    lastTimeRef.current = 0;
  }, []);

  return {
    inputRef,
    itemCode,
    setItemCode,
    scanning,
    setScanning,
    inputFocused,
    setInputFocused,
    barcodeBufferRef,
    handleTextChange,
    clearAndRefocus,
    processBarcodeInternal,
    resetScannerHistory,
  };
}
