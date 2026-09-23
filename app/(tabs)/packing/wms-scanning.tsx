import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { BrandLogo } from '../../../src/components/common/BrandLogo';
import { HeaderActions } from '../../../src/components/common/HeaderActions';
import { ScanItem, ScanSummary, DuplicateEntry } from '../../../src/types';
import {
  findItem,
  fetchAndCacheScanningData,
  submitScan,
  saveScan,
  cancelScan,
} from '../../../src/services/api';
import {
  loadScanningDataFromStorage,
  LocalScanningItem,
  saveInProgressScannedItems,
  loadInProgressScannedItems,
  clearInProgressScannedItems,
} from '../../../src/services/localScanningCache';
import { CancelItemModal } from '../../../src/components/scanning/modals/CancelItemModal';
import { EditQtyModal } from '../../../src/components/scanning/modals/EditQtyModal';
import { DuplicateItemModal } from '../../../src/components/scanning/modals/DuplicateItemModal';
import { HardwareScanInputCard } from '../../../src/components/scanning/HardwareScanInputCard';
import { ScanStatsGrid } from '../../../src/components/scanning/ScanStatsGrid';
import { borderRadius, spacing, monoFont } from '../../../src/constants/theme';

export default function WmsScanningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const documentNumber = String(params.document_number || '');
  const organizationName = String(params.organization_name || 'Organization');
  const departmentsParam = String(params.departments || '');
  const userId = params.user_id ? Number(params.user_id) : (user?.id ? Number(user.id) : 1);

  const departments = departmentsParam
    ? departmentsParam
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const inputRef = useRef<TextInput>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);
  const barcodeBufferRef = useRef<string>('');
  const refocusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const processingRef = useRef<boolean>(false);

  const [currentBox, setCurrentBox] = useState(1);
  const [itemCode, setItemCode] = useState('');
  const [allScannedItems, setAllScannedItems] = useState<ScanItem[]>([]);
  const [picklistItems, setPicklistItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Modals
  // Cancel Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');

  // Edit Qty Modal
  const [editQtyVisible, setEditQtyVisible] = useState(false);
  const [editQtyId, setEditQtyId] = useState<number | null>(null);
  const [editQtyItem, setEditQtyItem] = useState<ScanItem | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');
  const [revisedItemIds, setRevisedItemIds] = useState<Set<number>>(new Set());

  // Duplicate Modal
  const [duplicateVisible, setDuplicateVisible] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<{
    itemcode: string;
    doc_no: string;
    box_no: string;
    department: string;
    requested_quantity: number;
    already_packed: number;
    balance_qty: number;
    items: DuplicateEntry[];
  } | null>(null);
  const [duplicateQty, setDuplicateQty] = useState('');
  const [duplicateSaving, setDuplicateSaving] = useState(false);
  // Pending Items Modal
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingItemsList, setPendingItemsList] = useState<LocalScanningItem[]>([]);
  const [pendingCountDisplay, setPendingCountDisplay] = useState(0);
  const [markingPending, setMarkingPending] = useState(false);
  const [markingProgressText, setMarkingProgressText] = useState('');

  // Statistics Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportFilter, setReportFilter] = useState<'total' | 'scanned' | 'revised' | 'cancelled' | 'pending'>('scanned');

  // UI state
  const [showAllDepts, setShowAllDepts] = useState(false);
  const [manualInputMode, setManualInputMode] = useState(false);

  // Dynamic Scan Summary derived directly from scanned items & picklist
  const summary: ScanSummary = useMemo(() => {
    const activeScanned = allScannedItems.filter((it) => it.itemstatus !== 'cancelled');
    const cancelledCount = allScannedItems.filter((it) => it.itemstatus === 'cancelled').length;
    const revisedCount = allScannedItems.filter((it) => it.itemstatus === 'revised').length;
    const packedQty = activeScanned.reduce((sum, it) => sum + Number(it.packedqty || 0), 0);

    const scannedCodeSet = new Set(
      activeScanned.map((it) => String(it.itemcode || '').trim().toLowerCase()).filter(Boolean)
    );
    const scannedItemsCount = scannedCodeSet.size;

    const totalItems =
      picklistItems.length > 0
        ? picklistItems.length
        : Math.max(scannedItemsCount, allScannedItems.length);

    const requestedQty =
      picklistItems.length > 0
        ? picklistItems.reduce((sum, it) => sum + Number(it.qty ?? it.requested_quantity ?? 1), 0)
        : activeScanned.reduce((sum, it) => sum + Number(it.requested_quantity || 1), 0);

    const pendingItems = Math.max(0, totalItems - scannedItemsCount);

    return {
      total_items: totalItems,
      scanned_items: scannedItemsCount,
      packed_qty: packedQty,
      requested_qty: requestedQty,
      pending_items: pendingItems,
      revised_items: revisedCount,
      cancelled_items: cancelledCount,
    };
  }, [allScannedItems, picklistItems]);

  // Helpers to format box numbers e.g. 1000/B-01, 1000/B-02, 1000/B-03
  const cleanDoc = String(documentNumber || '').replace(/^SCND-?/i, '').trim() || '1000';
  const group = String(user?.userGroup || 'B').trim() || 'B';

  const getFormattedBoxNo = (boxNum: number) => {
    const seq = String(boxNum).padStart(2, '0');
    return `${cleanDoc}/${group}-${seq}`;
  };

  const formatItemBoxNo = (boxVal: string | number | undefined | null) => {
    if (boxVal === undefined || boxVal === null || boxVal === '') {
      return `${cleanDoc}/${group}-01`;
    }
    const str = String(boxVal).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      const docPart = parts[0].replace(/^SCND-?/i, '').trim() || cleanDoc;
      return `${docPart}/${parts.slice(1).join('/')}`;
    }
    if (str.includes('-')) {
      return `${cleanDoc}/${str}`;
    }
    const num = str.replace(/\D/g, '');
    if (num) {
      const seq = String(parseInt(num, 10)).padStart(2, '0');
      return `${cleanDoc}/${group}-${seq}`;
    }
    return `${cleanDoc}/${group}-${str}`;
  };

  const isRestoringSessionRef = useRef(true);

  useEffect(() => {
    if (documentNumber) {
      loadInitialSessionAndPicklist();
    }
  }, [documentNumber]);

  const loadInitialSessionAndPicklist = async () => {
    try {
      setLoading(true);
      isRestoringSessionRef.current = true;

      // 1. Load picklist cache to resolve any missing requested_quantity / DO qty & stats
      let picklist = await loadScanningDataFromStorage(documentNumber);
      if (!picklist || picklist.length === 0) {
        const fetched = await fetchAndCacheScanningData(documentNumber);
        if (fetched && Array.isArray(fetched.items)) {
          picklist = fetched.items;
        }
      }
      if (picklist && Array.isArray(picklist)) {
        setPicklistItems(picklist);
      }

      // 2. Restore saved in-progress scanned session if present (including cancelled items)
      const savedSession = await loadInProgressScannedItems(documentNumber);
      if (savedSession && Array.isArray(savedSession.items) && savedSession.items.length > 0) {
        setAllScannedItems(savedSession.items);
        if (savedSession.currentBox && Number(savedSession.currentBox) >= 1) {
          setCurrentBox(Number(savedSession.currentBox));
        }
        const revisedIds = new Set<number>();
        savedSession.items.forEach((it) => {
          if (it.itemstatus === 'revised' && it.id) {
            revisedIds.add(it.id);
          }
        });
        setRevisedItemIds(revisedIds);
      }
    } catch (err) {
      console.log('LOAD SESSION / PICKLIST ERROR:', err);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isRestoringSessionRef.current = false;
      }, 300);
    }
  };

  // Auto-save in-progress scanned items & current box to local storage whenever cart changes
  useEffect(() => {
    if (isRestoringSessionRef.current) return;
    if (documentNumber) {
      saveInProgressScannedItems(documentNumber, allScannedItems, currentBox);
    }
  }, [allScannedItems, currentBox, documentNumber]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 350);
    return () => {
      clearTimeout(timer);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [currentBox]);

  const handleProcessBarcode = async (scannedCode: string) => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    const trimmed = scannedCode.replace(/[\r\n\t]+/g, '').trim();
    if (!trimmed) {
      clearAndRefocus();
      return;
    }

    // Prevent concurrent processing — if already handling a scan, skip
    if (processingRef.current) {
      setItemCode('');
      barcodeBufferRef.current = '';
      return;
    }

    const now = Date.now();
    if (
      trimmed.toLowerCase() === lastCodeRef.current.toLowerCase() &&
      now - lastTimeRef.current < 200
    ) {
      setItemCode('');
      return;
    }

    lastCodeRef.current = trimmed;
    lastTimeRef.current = now;

    try {
      processingRef.current = true;
      setScanning(true);

      // 1. Instant check against in-memory picklist items across all possible identifiers
      const cleanScanned = trimmed.toLowerCase();
      const matchedPicklist = picklistItems.find((pi) => {
        const ids = [
          pi.itemcode,
          pi.item,
          pi.barcode,
          pi.sku,
          (pi as any).item_code,
          (pi as any).ean,
          (pi as any).upc,
        ].filter(Boolean);
        return ids.some((c) => String(c).trim().toLowerCase() === cleanScanned);
      });

      let item: any = null;
      if (matchedPicklist) {
        item = {
          item: matchedPicklist.itemcode || matchedPicklist.item,
          itemcode: matchedPicklist.itemcode || matchedPicklist.item,
          requested_quantity: Number(matchedPicklist.qty ?? matchedPicklist.requested_quantity ?? 1),
          department: matchedPicklist.department || (departments[0] || 'Packing'),
          document_number: documentNumber,
          organization_name: organizationName,
        };
      } else {
        // Fallback to local storage / remote API
        const findRes = await findItem(documentNumber, trimmed);
        if (!findRes || findRes.status !== true) {
          Alert.alert(
            'Item Not Found',
            findRes?.message || `Item '${trimmed}' not found for document ${documentNumber}.`
          );
          clearAndRefocus();
          return;
        }
        item = findRes.data;
      }

      const department = item.department || (departments[0] || 'Packing');
      const boxNo = getFormattedBoxNo(currentBox);
      const requestedQty = Number(item.requested_quantity || item.qty || 1);
      const targetItemCode = item.item || item.itemcode || trimmed;
      const matchKeys = new Set([
        trimmed.trim().toLowerCase(),
        String(targetItemCode || '').trim().toLowerCase(),
        String(item.item || '').trim().toLowerCase(),
        String(item.itemcode || '').trim().toLowerCase(),
        String(item.barcode || '').trim().toLowerCase(),
      ].filter(Boolean));

      // Check if this item is already scanned in local state (duplicate check)
      const existingRows = allScannedItems.filter(
        (it) =>
          matchKeys.has(String(it.itemcode || '').trim().toLowerCase()) &&
          it.itemstatus !== 'cancelled'
      );

      if (existingRows.length > 0) {
        const dupReqQty = Number(item.requested_quantity || existingRows[0].requested_quantity || requestedQty || 1);
        const alreadyPacked = existingRows.reduce((sum, it) => sum + Number(it.packedqty || 0), 0);
        const balanceQty = Math.max(0, dupReqQty - alreadyPacked);

        setDuplicateItem({
          itemcode: targetItemCode,
          doc_no: documentNumber,
          box_no: boxNo,
          department,
          requested_quantity: dupReqQty,
          already_packed: alreadyPacked,
          balance_qty: balanceQty,
          items: existingRows.map((it) => ({
            id: Number(it.id || 0),
            doc_no: documentNumber,
            itemcode: it.itemcode,
            box_no: formatItemBoxNo(it.box_no),
            packedqty: Number(it.packedqty || 0),
            requested_quantity: Number(it.requested_quantity || dupReqQty),
            department: it.department || department,
            itemstatus: it.itemstatus || 'scanned',
            scanned_on: it.scanned_on || new Date().toISOString(),
            username: '',
          })),
        });

        // Set default quantity to remaining balance or 1
        setDuplicateQty(balanceQty > 0 ? String(Math.floor(balanceQty)) : '1');
        setDuplicateVisible(true);
        setItemCode('');
        return;
      }

      // Add item to local scanned list directly without calling any server API
      const newItem: ScanItem = {
        id: Date.now(),
        userid: userId,
        doc_no: documentNumber,
        organization_name: item.organization_name || organizationName,
        itemcode: targetItemCode,
        box_no: boxNo,
        packedqty: requestedQty,
        requested_quantity: requestedQty,
        department,
        remarks: '',
        itemstatus: 'scanned',
        scanned_on: new Date().toISOString(),
        inv_status: '',
        submitted_on: null,
      };

      setAllScannedItems((prev) => [newItem, ...prev]);
      clearAndRefocus();
    } catch (err: any) {
      Alert.alert('Scan Error', err?.message || 'Unable to process barcode.');
      clearAndRefocus();
    } finally {
      processingRef.current = false;
      barcodeBufferRef.current = '';
      setScanning(false);
    }
  };

  const handleTextChange = (text: string) => {
    setItemCode(text);
    barcodeBufferRef.current = text;

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (/[\r\n\t]/.test(text)) {
      handleProcessBarcode(text);
      return;
    }

    // In manual keyboard mode, do not auto-trigger on typing — let user press Enter / Submit
    if (manualInputMode) {
      return;
    }

    if (text.trim().length >= 2) {
      scanTimerRef.current = setTimeout(() => {
        handleProcessBarcode(barcodeBufferRef.current);
      }, 350);
    }
  };

  const prevDuplicateVisible = useRef(duplicateVisible);
  const prevEditQtyVisible = useRef(editQtyVisible);
  const prevCancelModalVisible = useRef(cancelModalVisible);
  const prevPendingModalVisible = useRef(pendingModalVisible);

  const clearAndRefocus = () => {
    setItemCode('');
    barcodeBufferRef.current = '';

    // Cancel any previously queued refocus timers
    refocusTimersRef.current.forEach((t) => clearTimeout(t));
    refocusTimersRef.current = [];

    // Only refocus if no modal is open
    const anyModalOpen =
      duplicateVisible || editQtyVisible || cancelModalVisible || pendingModalVisible || reportModalVisible;
    if (!anyModalOpen) {
      const t1 = setTimeout(() => { inputRef.current?.focus(); }, 80);
      const t2 = setTimeout(() => { inputRef.current?.focus(); }, 250);
      refocusTimersRef.current = [t1, t2];
    }
  };

  useEffect(() => {
    const wasOpen =
      prevDuplicateVisible.current ||
      prevEditQtyVisible.current ||
      prevCancelModalVisible.current ||
      prevPendingModalVisible.current;

    const isNowClosed =
      !duplicateVisible &&
      !editQtyVisible &&
      !cancelModalVisible &&
      !pendingModalVisible;

    if (wasOpen && isNowClosed) {
      clearAndRefocus();
    }

    prevDuplicateVisible.current = duplicateVisible;
    prevEditQtyVisible.current = editQtyVisible;
    prevCancelModalVisible.current = cancelModalVisible;
    prevPendingModalVisible.current = pendingModalVisible;
  }, [duplicateVisible, editQtyVisible, cancelModalVisible, pendingModalVisible]);

  const handleDuplicateInsert = () => {
    if (!duplicateItem) return;
    const qty = parseInt(duplicateQty, 10);

    if (isNaN(qty) || qty < 1) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity (minimum 1).');
      return;
    }

    const newRow: ScanItem = {
      id: Date.now(),
      userid: userId,
      doc_no: duplicateItem.doc_no,
      organization_name: organizationName,
      itemcode: duplicateItem.itemcode,
      box_no: duplicateItem.box_no,
      packedqty: qty,
      requested_quantity: duplicateItem.requested_quantity,
      department: duplicateItem.department,
      remarks: '',
      itemstatus: 'revised',
      scanned_on: new Date().toISOString(),
      inv_status: '',
      submitted_on: null,
    };

    setRevisedItemIds((prev) => new Set(prev).add(newRow.id));
    setAllScannedItems((prev) => [newRow, ...prev]);

    setDuplicateVisible(false);
    setDuplicateItem(null);
    setDuplicateQty('');
    lastCodeRef.current = '';
    lastTimeRef.current = 0;
    clearAndRefocus();
  };

  const openCancelModal = (id: number) => {
    setCancelId(id);
    setCancelRemarks('');
    setCancelModalVisible(true);
  };

  const handleCancelItem = () => {
    if (!cancelId || !cancelRemarks.trim()) return;

    setAllScannedItems((prev) =>
      prev.map((it) =>
        it.id === cancelId
          ? { ...it, itemstatus: 'cancelled', remarks: cancelRemarks.trim() }
          : it
      )
    );

    setCancelModalVisible(false);
    setCancelId(null);
    setCancelRemarks('');
    clearAndRefocus();
  };

  const openEditQtyModal = (item: ScanItem) => {
    setEditQtyItem(item);
    setEditQtyId(item.id);
    setEditQtyValue(String(Math.floor(item.packedqty)));
    setEditQtyVisible(true);
  };

  const handleUpdatePackedQty = () => {
    if (!editQtyId) return;
    const qty = parseInt(editQtyValue, 10);

    if (isNaN(qty) || qty < 1) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity (minimum 1).');
      return;
    }

    const currentTargetId = editQtyId;
    setRevisedItemIds((prev) => new Set(prev).add(currentTargetId));

    setAllScannedItems((prev) =>
      prev.map((it) =>
        it.id === currentTargetId
          ? { ...it, packedqty: qty, itemstatus: 'revised' }
          : it
      )
    );

    setEditQtyVisible(false);
    setEditQtyItem(null);
    setEditQtyId(null);
    setEditQtyValue('');
    clearAndRefocus();
  };

  const goPreviousBox = () => {
    if (currentBox <= 1) return;
    setCurrentBox(currentBox - 1);
    setItemCode('');
  };

  const goNextBox = () => {
    setCurrentBox(currentBox + 1);
    setItemCode('');
  };

  const saveAllCartItemsToServer = async (itemsToSave: ScanItem[]) => {
    for (const it of itemsToSave) {
      try {
        const isCancelled = it.itemstatus === 'cancelled';
        const saveRes = await saveScan({
          userId,
          docNo: it.doc_no || documentNumber,
          organizationName: it.organization_name || organizationName,
          itemCode: it.itemcode,
          requestedQty: Number(it.requested_quantity || 1),
          packedQty: Number(it.packedqty || 0),
          department: it.department || (departments[0] || 'Packing'),
          boxNo: it.box_no || getFormattedBoxNo(currentBox),
          forceInsert: true,
        });

        if (isCancelled) {
          const savedId = Number(saveRes?.data?.id || saveRes?.id || 0);
          if (savedId) {
            await cancelScan(savedId, it.remarks || 'Cancelled by user');
          }
        }
      } catch (e) {
        console.warn('Error saving item line to server during final batch submit:', e);
      }
    }
  };

  const executeSubmitScan = async () => {
    try {
      setSubmitting(true);

      // Save all local items to backend (including cancelled & revised)
      await saveAllCartItemsToServer(allScannedItems);

      const deptsToSubmit =
        departments.length > 0
          ? departments
          : Array.from(
              new Set(
                allScannedItems
                  .map((i) => i.department)
                  .filter(Boolean)
              )
            );

      const res = await submitScan(documentNumber, deptsToSubmit);
      if (res?.status === true) {
        await clearInProgressScannedItems(documentNumber);
        setPendingModalVisible(false);
        Alert.alert(
          'Batch Submitted',
          res?.message || `Packing batch for ${documentNumber} submitted successfully!`,
          [{ text: 'Return to Hub', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Submission Failed',
          res?.message || 'Failed to submit packing list. Please try again.'
        );
      }
    } catch (err: any) {
      console.error('Submit scan error:', err);
      Alert.alert(
        'Error',
        err?.message || 'An error occurred while submitting packing list.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishBatch = async () => {
    if (submitting || markingPending) return;

    try {
      setLoading(true);

      // Load picklist lines to accurately detect pending unscanned items
      let picklist = await loadScanningDataFromStorage(documentNumber);
      if (!picklist || picklist.length === 0) {
        const fetched = await fetchAndCacheScanningData(documentNumber);
        if (fetched && Array.isArray(fetched.items)) {
          picklist = fetched.items;
        }
      }

      // Existing active item codes in scanned items
      const scannedItemCodes = new Set(
        allScannedItems
          .filter((it) => it.itemstatus !== 'cancelled')
          .map((it) => String(it.itemcode || '').trim().toLowerCase())
      );

      const unscannedItems = (picklist || []).filter(
        (item) => !scannedItemCodes.has(String(item.itemcode || '').trim().toLowerCase())
      );

      const pendingCount =
        summary.pending_items > 0
          ? summary.pending_items
          : unscannedItems.length;

      // If pending items exist, open modal to show count and allow marking 0
      if (pendingCount > 0 || unscannedItems.length > 0) {
        setPendingItemsList(unscannedItems);
        setPendingCountDisplay(Math.max(pendingCount, unscannedItems.length));
        setPendingModalVisible(true);
        return;
      }

      // If no pending items, proceed with regular confirmation
      Alert.alert(
        'Submit Packing List',
        `Ready to submit ${summary.packed_qty} total packed units (${allScannedItems.length} lines) for document ${documentNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm & Submit',
            onPress: executeSubmitScan,
          },
        ]
      );
    } catch (err: any) {
      console.error('Check pending items error:', err);
      Alert.alert('Error', 'Unable to check pending items before submission.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPendingZeroAndSubmit = async () => {
    try {
      setMarkingPending(true);
      setMarkingProgressText('Marking pending items as 0...');

      let itemsToProcess = [...pendingItemsList];

      // If list is empty but count was > 0, fetch picklist again
      if (itemsToProcess.length === 0) {
        const fetched = await fetchAndCacheScanningData(documentNumber);
        const list = fetched?.items || [];
        const scannedCodes = new Set(
          allScannedItems
            .filter((it) => it.itemstatus !== 'cancelled')
            .map((it) => String(it.itemcode || '').trim().toLowerCase())
        );
        itemsToProcess = list.filter(
          (it) => !scannedCodes.has(String(it.itemcode || '').trim().toLowerCase())
        );
      }

      const boxNo = getFormattedBoxNo(currentBox);
      const zeroRows: ScanItem[] = itemsToProcess.map((item, idx) => ({
        id: Date.now() + idx,
        userid: userId,
        doc_no: documentNumber,
        organization_name: item.organization_name || organizationName,
        itemcode: item.itemcode || item.item,
        box_no: boxNo,
        packedqty: 0,
        requested_quantity: Number(item.qty || item.requested_quantity || 1),
        department: item.department || (departments[0] || 'Packing'),
        remarks: 'Pending item marked 0',
        itemstatus: 'revised',
        scanned_on: new Date().toISOString(),
        inv_status: '',
        submitted_on: null,
      }));

      const fullCart = [...zeroRows, ...allScannedItems];
      setAllScannedItems(fullCart);

      setMarkingProgressText('Saving all scanned & cancelled items to server...');
      await saveAllCartItemsToServer(fullCart);

      // All pending items are marked 0 -> now submit
      setMarkingProgressText('Submitting packing list...');
      const deptsToSubmit =
        departments.length > 0
          ? departments
          : Array.from(
              new Set(
                fullCart
                  .map((i) => i.department)
                  .filter(Boolean)
              )
            );

      const res = await submitScan(documentNumber, deptsToSubmit);
      if (res?.status === true) {
        await clearInProgressScannedItems(documentNumber);
        setPendingModalVisible(false);
        Alert.alert(
          'Batch Submitted',
          res?.message || `Packing batch for ${documentNumber} submitted successfully!`,
          [{ text: 'Return to Hub', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Submission Failed',
          res?.message || 'All pending items were marked 0, but final submission failed. Please try submitting again.'
        );
      }
    } catch (err: any) {
      console.error('Mark pending zero and submit error:', err);
      Alert.alert('Error', err?.message || 'An error occurred while marking pending items as 0.');
    } finally {
      setMarkingPending(false);
      setMarkingProgressText('');
    }
  };

  const skuStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { totalPacked: number; requestedQty: number; rowCount: number }
    >();

    allScannedItems.forEach((it) => {
      if (it.itemstatus === 'cancelled') return;
      const code = String(it.itemcode || '').trim().toLowerCase();
      const prev = map.get(code) || {
        totalPacked: 0,
        requestedQty: Number(it.requested_quantity || 0),
        rowCount: 0,
      };
      prev.totalPacked += Number(it.packedqty || 0);
      prev.requestedQty = Math.max(prev.requestedQty, Number(it.requested_quantity || 0));
      prev.rowCount += 1;
      map.set(code, prev);
    });

    return map;
  }, [allScannedItems]);

  const reportItems = useMemo(() => {
    if (reportFilter === 'cancelled') {
      return allScannedItems.filter((item) => item.itemstatus === 'cancelled');
    }
    if (reportFilter === 'revised') {
      return allScannedItems.filter((item) => {
        if (item.itemstatus === 'cancelled') return false;
        if (item.itemstatus === 'revised' || revisedItemIds.has(item.id)) return true;
        const skuKey = String(item.itemcode || '').trim().toLowerCase();
        const skuStats = skuStatsMap.get(skuKey);
        const requestedQty = Number(item.requested_quantity ?? (item as any).qty ?? 1) || 1;
        const packedQty = Number(item.packedqty ?? (item as any).packed_qty ?? requestedQty) || 1;
        const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;
        return totalSkuPacked !== requestedQty || (skuStats && skuStats.rowCount > 1);
      });
    }
    if (reportFilter === 'scanned') {
      return allScannedItems.filter((item) => {
        if (item.itemstatus === 'cancelled') return false;
        if (item.itemstatus === 'revised' || revisedItemIds.has(item.id)) return false;
        const skuKey = String(item.itemcode || '').trim().toLowerCase();
        const skuStats = skuStatsMap.get(skuKey);
        const requestedQty = Number(item.requested_quantity ?? (item as any).qty ?? 1) || 1;
        const packedQty = Number(item.packedqty ?? (item as any).packed_qty ?? requestedQty) || 1;
        const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;
        return totalSkuPacked === requestedQty && (!skuStats || skuStats.rowCount <= 1);
      });
    }
    if (reportFilter === 'pending') {
      const scannedCodes = new Set(
        allScannedItems
          .filter((i) => i.itemstatus !== 'cancelled')
          .map((i) => String(i.itemcode || '').trim().toLowerCase())
      );
      return picklistItems
        .filter((it) => !scannedCodes.has(String(it.itemcode || '').trim().toLowerCase()))
        .map((it, idx) => ({
          id: -1000 - idx,
          itemcode: it.itemcode,
          box_no: '—',
          requested_quantity: Number(it.qty ?? it.requested_quantity ?? 1),
          packedqty: 0,
          itemstatus: 'pending',
        } as ScanItem));
    }
    return allScannedItems;
  }, [allScannedItems, reportFilter, revisedItemIds, skuStatsMap, picklistItems]);

  const progressPct =
    summary.requested_qty > 0
      ? Math.min(100, Math.round((summary.packed_qty / summary.requested_qty) * 100))
      : summary.total_items > 0
      ? Math.min(100, Math.round((summary.scanned_items / summary.total_items) * 100))
      : 0;

  const getStatusBadge = (status: string) => {
    if (status === 'revised') {
      return { label: 'REVISED', color: colors.violet, bg: colors.violetMuted, border: colors.violet };
    }
    if (status === 'cancelled') {
      return { label: 'CANCELLED', color: colors.red, bg: colors.redMuted, border: colors.red };
    }
    return { label: 'SCANNED', color: colors.primary, bg: colors.primaryMuted, border: colors.primary };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 0) }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ──────────────────────────────────────── */}
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
              </TouchableOpacity>

              <View style={[styles.topRightRow, { alignItems: 'center', gap: 10 }]}>
                <BrandLogo size={28} rounded />
                <HeaderActions />
              </View>
            </View>

            {/* Doc Info */}
            <View style={styles.docInfoRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.statusLiveRow}>
                  <View style={[styles.livePulse, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.moduleTag, { color: colors.textSecondary }]}>
                    WMS PACKING — SCANNING
                  </Text>
                </View>
                <Text style={[styles.docNoText, { color: colors.textPrimary }]}>
                  {documentNumber || 'No Document'}
                </Text>
                {departments.length > 0 && (
                  <View style={styles.deptsRow}>
                    {departments.map((d) => (
                      <View key={d} style={[styles.deptChip, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.deptChipText, { color: colors.primary }]}>{d}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.scannedCountBox}>
                <Text style={[styles.scannedCountNum, { color: colors.primary }]}>
                  {allScannedItems.filter((i) => i.itemstatus !== 'cancelled').length}
                </Text>
                <Text style={[styles.scannedCountLabel, { color: colors.textMuted }]}>scanned</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                  {summary.packed_qty}/{summary.requested_qty || summary.total_items} qty packed
                </Text>
                <Text style={[styles.progressPctText, { color: colors.primary }]}>{progressPct}%</Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: colors.surface3 }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPct}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* ── Box Navigation ──────────────────────────────── */}
          <View style={[styles.boxNavBar, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={goPreviousBox}
              disabled={currentBox <= 1}
              focusable={false}
              accessible={false}
              style={[
                styles.boxNavBtn,
                { backgroundColor: colors.surface, borderColor: colors.primary },
                currentBox <= 1 && [styles.boxNavBtnDisabled, { backgroundColor: colors.surface3, borderColor: colors.border }],
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={14}
                color={currentBox <= 1 ? colors.textMuted : colors.primary}
              />
              <Text
                style={[
                  styles.boxNavBtnText,
                  { color: currentBox <= 1 ? colors.textMuted : colors.primary },
                ]}
              >
                Prev
              </Text>
            </TouchableOpacity>

            <View style={styles.currentBoxCenter}>
              <View style={[styles.boxIconWrap, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="cube" size={16} color={colors.primary} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.currentBoxLabel, { color: colors.textMuted }]}>CURRENT BOX</Text>
                <Text style={[styles.currentBoxNum, { color: colors.textPrimary }]}>
                  {getFormattedBoxNo(currentBox)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={goNextBox}
              focusable={false}
              accessible={false}
              style={[styles.boxNavBtnNext, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.boxNavBtnNextText}>Next</Text>
              <Ionicons name="chevron-forward" size={14} color="#0B0F14" />
            </TouchableOpacity>
          </View>

          {/* ── Scan Input Card (Hardware Scanner Only) ─────────── */}
          <HardwareScanInputCard
            inputRef={inputRef}
            itemCode={itemCode}
            inputFocused={inputFocused}
            scanning={scanning}
            title="Hardware Scanner"
            subtitle={`Box ${getFormattedBoxNo(currentBox)} · ${inputFocused ? 'Ready for laser barcode scan' : 'Tap to focus scanner'}`}
            onChangeText={handleTextChange}
            onSubmitEditing={() => {
              const code = barcodeBufferRef.current || itemCode;
              if (code.trim()) {
                handleProcessBarcode(code);
              }
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => {
              setInputFocused(false);
              if (
                !duplicateVisible &&
                !editQtyVisible &&
                !cancelModalVisible &&
                !pendingModalVisible
              ) {
                setTimeout(() => inputRef.current?.focus(), 60);
              }
            }}
          />

          {/* ── Scanned Items Table ─────────────────────────── */}
          <View style={[styles.tableCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={[styles.tableCardHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.tableCardTitle, { color: colors.textPrimary }]}>Scanned Items</Text>
                <Text style={[styles.tableCardSub, { color: colors.textMuted }]}>
                  {allScannedItems.length > 5
                    ? `ALL BOXES · Latest 5 of ${allScannedItems.length} items`
                    : `ALL BOXES · ${allScannedItems.length} item${allScannedItems.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              {allScannedItems.length > 0 && (
                <TouchableOpacity
                  style={[styles.refreshBtn, { backgroundColor: colors.primaryMuted }]}
                  onPress={() => {
                    loadInitialSessionAndPicklist();
                  }}
                >
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Reload</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading && allScannedItems.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>Loading scanning data...</Text>
              </View>
            ) : allScannedItems.length === 0 ? (
              <View style={styles.emptyTable}>
                <View style={[styles.emptyIconBox, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="barcode-outline" size={28} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTableTitle, { color: colors.textSecondary }]}>
                  No items scanned yet
                </Text>
                <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>
                  Scan a barcode above or trigger hardware laser
                </Text>
              </View>
            ) : (
              <View style={styles.tableBodyWrap}>
                <View style={[styles.tableHeaderRow, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
                  <Text style={[styles.thCell, { color: colors.textMuted, width: 24, textAlign: 'center' }]}>#</Text>
                  <Text style={[styles.thCell, { color: colors.textMuted, width: 68 }]}>BOX</Text>
                  <Text style={[styles.thCell, { color: colors.textMuted, flex: 1 }]}>ITEM SKU</Text>
                  <Text style={[styles.thCell, { color: colors.textMuted, width: 32, textAlign: 'center' }]}>DO</Text>
                  <Text style={[styles.thCell, { color: colors.textMuted, width: 44, textAlign: 'center' }]}>PCK</Text>
                  <Text style={[styles.thCell, { color: colors.textMuted, width: 28, textAlign: 'center' }]}>DIF</Text>
                  <Text style={[styles.thCell, { color: colors.textMuted, width: 50, textAlign: 'center' }]}>STAT</Text>
                </View>

                {allScannedItems.slice(0, 5).map((item, idx) => {
                  const isCancelled = item.itemstatus === 'cancelled';
                  const skuKey = String(item.itemcode || '').trim().toLowerCase();
                  const skuStats = skuStatsMap.get(skuKey);

                  const requestedQty =
                    Number(item.requested_quantity ?? (item as any).qty ?? 1) || 1;
                  const packedQty =
                    Number(item.packedqty ?? (item as any).packed_qty ?? requestedQty) || 1;
                  const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;

                  // Difference = Requested DO Qty - Total Packed Qty for this SKU
                  const diff = isCancelled ? 0 : requestedQty - totalSkuPacked;

                  const isRevised =
                    !isCancelled &&
                    (item.itemstatus === 'revised' ||
                      revisedItemIds.has(item.id) ||
                      totalSkuPacked !== requestedQty ||
                      (skuStats && skuStats.rowCount > 1));

                  const currentStatus = isCancelled
                    ? 'cancelled'
                    : isRevised
                    ? 'revised'
                    : item.itemstatus || 'scanned';
                  const badge = getStatusBadge(currentStatus);

                  return (
                    <View
                      key={item.id || idx}
                      style={[
                        styles.tableRow,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: idx % 2 === 1 ? colors.surface2 : colors.surface,
                        },
                        isCancelled && styles.tableRowCancelled,
                      ]}
                    >
                      <View style={{ width: 24, alignItems: 'center' }}>
                        <TouchableOpacity
                          disabled={isCancelled}
                          onPress={() => !isCancelled && openCancelModal(item.id)}
                          style={[
                            styles.rowTrashBtn,
                            { backgroundColor: colors.redMuted },
                            isCancelled && styles.rowTrashBtnDisabled,
                          ]}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={11}
                            color={isCancelled ? colors.textMuted : colors.red}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={{ width: 68 }}>
                        <View style={[styles.boxTag, { backgroundColor: colors.primaryMuted }]}>
                          <Text style={[styles.boxTagText, { color: colors.primary }]} numberOfLines={1}>
                            {formatItemBoxNo(item.box_no)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flex: 1, paddingRight: 4, justifyContent: 'center' }}>
                        <Text
                          style={[
                            styles.rowItemCode,
                            { color: colors.textPrimary },
                            isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                          ]}
                          numberOfLines={1}
                        >
                          {item.itemcode}
                        </Text>
                      </View>

                      {/* DO Qty (Requested DO Quantity) */}
                      <View style={{ width: 32, alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.rowNum,
                            { color: colors.textSecondary },
                            isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                          ]}
                        >
                          {Math.floor(requestedQty)}
                        </Text>
                      </View>

                      {/* PCK Qty (Packed / Scanned Quantity) */}
                      <View style={{ width: 44, alignItems: 'center' }}>
                        <TouchableOpacity
                          disabled={isCancelled}
                          onPress={() => !isCancelled && openEditQtyModal(item)}
                          style={[
                            styles.packedQtyPill,
                            { backgroundColor: colors.primaryMuted },
                            isCancelled && styles.packedQtyPillDisabled,
                          ]}
                        >
                          <Text style={[styles.packedQtyText, { color: colors.primary }]}>
                            {Math.floor(packedQty)}
                          </Text>
                          {!isCancelled && (
                            <Ionicons name="pencil" size={8} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* DIF Qty (Difference) */}
                      <View style={{ width: 28, alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.rowDiffText,
                            {
                              color: isCancelled
                                ? colors.textMuted
                                : diff === 0
                                ? colors.emerald
                                : diff < 0
                                ? colors.red
                                : colors.amber,
                              fontWeight: diff === 0 ? '700' : '800',
                            },
                            isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                          ]}
                        >
                          {isCancelled ? '—' : diff}
                        </Text>
                      </View>

                      {/* STAT (Status Badge) */}
                      <View style={{ width: 50, alignItems: 'center' }}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: badge.bg,
                              borderColor: `${badge.border}40`,
                            },
                          ]}
                        >
                          <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {allScannedItems.length > 5 && (
                  <View style={[styles.limitedCartFooter, { borderTopColor: colors.border, backgroundColor: colors.surface2 }]}>
                    <Ionicons name="layers-outline" size={13} color={colors.primary} />
                    <Text style={[styles.limitedCartFooterText, { color: colors.textMuted }]}>
                      Showing latest 5 of {allScannedItems.length} scanned items · All items are saved & counted
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Scan Statistics Grid (Clickable to open Report Modal) ── */}
          <ScanStatsGrid
            summary={summary}
            title="SCAN STATISTICS"
            onFilterSelect={(filter) => {
              setReportFilter(filter);
              setReportModalVisible(true);
            }}
          />

          {/* ── Submit Footer Bar ────────────────────────────── */}
          {allScannedItems.length > 0 && (
            <View style={[styles.submitFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <View style={styles.submitMetaRow}>
                <Text style={[styles.submitMetaText, { color: colors.textMuted }]}>
                  {allScannedItems.filter((i) => i.itemstatus !== 'cancelled').length} lines · {summary.packed_qty} packed
                </Text>
                <View style={styles.readyBadge}>
                  <View style={[styles.readyDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.readyText, { color: colors.primary }]}>Ready</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 },
                ]}
                activeOpacity={0.85}
                disabled={submitting}
                onPress={handleFinishBatch}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0B0F14" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle" size={20} color="#0B0F14" />
                    <Text style={styles.submitBtnText}>Submit Packing List</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══ CANCEL ITEM MODAL ════════════════════════════ */}
      {/* ══ CANCEL ITEM MODAL ════════════════════════════ */}
      <CancelItemModal
        visible={cancelModalVisible}
        remarks={cancelRemarks}
        onRemarksChange={setCancelRemarks}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleCancelItem}
      />

      {/* ══ EDIT QUANTITY MODAL ══════════════════════════ */}
      <EditQtyModal
        visible={editQtyVisible}
        itemCode={editQtyItem?.itemcode}
        requestedQty={editQtyItem?.requested_quantity}
        value={editQtyValue}
        onValueChange={setEditQtyValue}
        onClose={() => setEditQtyVisible(false)}
        onConfirm={handleUpdatePackedQty}
      />

      {/* ══ DUPLICATE ITEM MODAL ═════════════════════════ */}
      <DuplicateItemModal
        visible={duplicateVisible}
        item={duplicateItem}
        quantity={duplicateQty}
        saving={duplicateSaving}
        onQuantityChange={setDuplicateQty}
        onClose={() => setDuplicateVisible(false)}
        onConfirm={handleDuplicateInsert}
      />

      {/* ══ SCAN STATISTICS REPORT MODAL ══════════════════ */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setReportModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.reportModalCard,
                  { backgroundColor: colors.surface2, borderColor: colors.border },
                ]}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="stats-chart" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      Scan Statistics Report
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                      Doc: {cleanDoc} · {summary.packed_qty}/{summary.requested_qty || summary.total_items} packed
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setReportModalVisible(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Filter Selector Tabs */}
                <View style={[styles.reportFilterRow, { borderBottomColor: colors.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
                    <TouchableOpacity
                      onPress={() => setReportFilter('total')}
                      style={[
                        styles.reportFilterTab,
                        {
                          backgroundColor: reportFilter === 'total' ? colors.surface3 : colors.surface,
                          borderColor: reportFilter === 'total' ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reportFilterTabText,
                          { color: reportFilter === 'total' ? colors.primary : colors.textMuted },
                        ]}
                      >
                        TOTAL ({summary.total_items})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setReportFilter('scanned')}
                      style={[
                        styles.reportFilterTab,
                        {
                          backgroundColor: reportFilter === 'scanned' ? `${colors.emerald}20` : colors.surface,
                          borderColor: reportFilter === 'scanned' ? colors.emerald : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reportFilterTabText,
                          { color: reportFilter === 'scanned' ? colors.emerald : colors.textMuted },
                        ]}
                      >
                        SCANNED ({summary.scanned_items})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setReportFilter('revised')}
                      style={[
                        styles.reportFilterTab,
                        {
                          backgroundColor: reportFilter === 'revised' ? colors.violetMuted : colors.surface,
                          borderColor: reportFilter === 'revised' ? colors.violet : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reportFilterTabText,
                          { color: reportFilter === 'revised' ? colors.violet : colors.textMuted },
                        ]}
                      >
                        REVISED ({summary.revised_items})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setReportFilter('cancelled')}
                      style={[
                        styles.reportFilterTab,
                        {
                          backgroundColor: reportFilter === 'cancelled' ? colors.redMuted : colors.surface,
                          borderColor: reportFilter === 'cancelled' ? colors.red : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reportFilterTabText,
                          { color: reportFilter === 'cancelled' ? colors.red : colors.textMuted },
                        ]}
                      >
                        CANCELLED ({summary.cancelled_items})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setReportFilter('pending')}
                      style={[
                        styles.reportFilterTab,
                        {
                          backgroundColor: reportFilter === 'pending' ? colors.amberMuted : colors.surface,
                          borderColor: reportFilter === 'pending' ? colors.amber : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reportFilterTabText,
                          { color: reportFilter === 'pending' ? colors.amber : colors.textMuted },
                        ]}
                      >
                        PENDING ({summary.pending_items})
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Items List inside Modal - Non-tabular clean card list */}
                <View style={{ flex: 1, minHeight: 200, maxHeight: 400 }}>
                  {reportItems.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <Ionicons name="document-text-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                      <Text style={[styles.emptyTableSub, { color: colors.textMuted, fontSize: 13 }]}>
                        No {reportFilter === 'total' ? '' : reportFilter} items in current session
                      </Text>
                    </View>
                  ) : (
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingVertical: 4 }}>
                      {reportItems.map((item, idx) => {
                        const isCancelled = item.itemstatus === 'cancelled';
                        const isPending = item.itemstatus === 'pending';
                        const skuKey = String(item.itemcode || '').trim().toLowerCase();
                        const skuStats = skuStatsMap.get(skuKey);

                        const requestedQty = Number(item.requested_quantity ?? (item as any).qty ?? 1) || 1;
                        const packedQty = Number(item.packedqty ?? (item as any).packed_qty ?? 0);
                        const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;
                        const diff = isCancelled ? 0 : isPending ? requestedQty : requestedQty - totalSkuPacked;

                        const isRevised =
                          !isCancelled &&
                          !isPending &&
                          (item.itemstatus === 'revised' ||
                            revisedItemIds.has(item.id) ||
                            totalSkuPacked !== requestedQty ||
                            (skuStats && skuStats.rowCount > 1));

                        const currentStatus = isPending
                          ? 'pending'
                          : isCancelled
                          ? 'cancelled'
                          : isRevised
                          ? 'revised'
                          : item.itemstatus || 'scanned';

                        const badge = isPending
                          ? { label: 'PENDING', color: colors.amber, bg: colors.amberMuted, border: colors.amber }
                          : getStatusBadge(currentStatus);

                        return (
                          <View
                            key={item.id || idx}
                            style={[
                              {
                                padding: 12,
                                marginBottom: 10,
                                borderRadius: borderRadius.lg || 10,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: isCancelled ? `${colors.surface}80` : colors.surface,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 4,
                                elevation: 2,
                              },
                              isCancelled && styles.tableRowCancelled,
                            ]}
                          >
                            {/* Card Top Row: Index #, Box Tag, Status Badge */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: colors.surface3,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <Text style={{ fontSize: 11, fontFamily: monoFont, fontWeight: '800', color: colors.textMuted }}>
                                    #{idx + 1}
                                  </Text>
                                </View>

                                <View style={[styles.boxTag, { backgroundColor: isPending ? colors.surface3 : colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 4 }]}>
                                  <Text style={[styles.boxTagText, { color: isPending ? colors.textMuted : colors.primary, fontSize: 11 }]} numberOfLines={1}>
                                    {isPending ? 'Box: —' : `Box: ${formatItemBoxNo(item.box_no)}`}
                                  </Text>
                                </View>
                              </View>

                              <View
                                style={[
                                  styles.statusBadge,
                                  {
                                    backgroundColor: badge.bg,
                                    borderColor: `${badge.border}40`,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                  },
                                ]}
                              >
                                <Text style={[styles.statusBadgeText, { color: badge.color, fontSize: 10, fontWeight: '800' }]}>
                                  {badge.label}
                                </Text>
                              </View>
                            </View>

                            {/* Main Row: ITEM SKU (Full width, never cut off) */}
                            <View style={{ marginBottom: 10 }}>
                              <Text style={{ fontSize: 10, fontFamily: monoFont, color: colors.textMuted, marginBottom: 2, letterSpacing: 0.5 }}>
                                ITEM SKU
                              </Text>
                              <Text
                                style={[
                                  {
                                    fontSize: 14,
                                    fontFamily: monoFont,
                                    fontWeight: '800',
                                    color: colors.textPrimary,
                                    letterSpacing: 0.3,
                                  },
                                  isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                                ]}
                              >
                                {item.itemcode}
                              </Text>
                            </View>

                            {/* Bottom Stat Chips: DO, PCK, DIF */}
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-around',
                              backgroundColor: colors.surface2,
                              borderRadius: borderRadius.md || 8,
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}>
                              <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 9, fontFamily: monoFont, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>
                                  REQ (DO)
                                </Text>
                                <Text style={{ fontSize: 13, fontFamily: monoFont, fontWeight: '800', color: colors.textSecondary }}>
                                  {Math.floor(requestedQty)}
                                </Text>
                              </View>

                              <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

                              <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 9, fontFamily: monoFont, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>
                                  PACKED
                                </Text>
                                <Text style={{ fontSize: 13, fontFamily: monoFont, fontWeight: '800', color: isPending ? colors.amber : isCancelled ? colors.textMuted : colors.primary }}>
                                  {Math.floor(packedQty)}
                                </Text>
                              </View>

                              <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

                              <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 9, fontFamily: monoFont, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>
                                  DIFF
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontFamily: monoFont,
                                    fontWeight: '800',
                                    color: isCancelled
                                      ? colors.textMuted
                                      : diff === 0
                                      ? colors.emerald
                                      : diff < 0
                                      ? colors.red
                                      : colors.amber,
                                  }}
                                >
                                  {isCancelled ? '—' : diff}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* Modal Footer */}
                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setReportModalVisible(false)}
                  >
                    <Text style={[styles.modalConfirmBtnText, { color: '#0B0F14' }]}>Close Report</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ══ PENDING ITEMS MODAL ══════════════════════════ */}
      <Modal
        visible={pendingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!markingPending) setPendingModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (!markingPending) setPendingModalVisible(false);
          }}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ width: '100%', alignItems: 'center' }}
              >
                <View
                  style={[
                    styles.modalCard,
                    { backgroundColor: colors.surface2, borderColor: colors.border },
                  ]}
                >
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View
                      style={[
                        styles.modalIconBox,
                        { backgroundColor: colors.amberMuted },
                      ]}
                    >
                      <Ionicons
                        name="hourglass-outline"
                        size={20}
                        color={colors.amber}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.modalTitle, { color: colors.textPrimary }]}
                      >
                        Pending Items Detected
                      </Text>
                      <Text
                        style={[styles.modalSubtitle, { color: colors.textMuted }]}
                      >
                        Action required before submitting batch
                      </Text>
                    </View>
                    {!markingPending && (
                      <TouchableOpacity
                        onPress={() => setPendingModalVisible(false)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name="close"
                          size={20}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Summary Box with Pending Count */}
                  <View
                    style={[
                      styles.pendingCountCard,
                      {
                        backgroundColor: colors.amberMuted,
                        borderColor: `${colors.amber}40`,
                      },
                    ]}
                  >
                    <View style={styles.pendingCountRow}>
                      <View style={styles.pendingCountBadge}>
                        <Text style={[styles.pendingCountNumber, { color: colors.amber }]}>
                          {pendingCountDisplay}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pendingCountHeading, { color: colors.amber }]}>
                          {pendingCountDisplay === 1
                            ? '1 Pending Item Found'
                            : `${pendingCountDisplay} Pending Items Found`}
                        </Text>
                        <Text
                          style={[
                            styles.pendingCountSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Unscanned items cannot remain pending during submission.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.pendingInstructionText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    To proceed, all pending items will be marked with quantity{' '}
                    <Text style={{ fontWeight: '800', color: colors.textPrimary }}>0</Text>.
                    Once all items are marked 0, the packing list will be submitted automatically.
                  </Text>

                  {/* Marking progress indicator */}
                  {markingPending && (
                    <View style={styles.markingProgressWrap}>
                      <ActivityIndicator size="small" color={colors.amber} />
                      <Text
                        style={[
                          styles.markingProgressText,
                          { color: colors.amber },
                        ]}
                      >
                        {markingProgressText || 'Processing items...'}
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.modalCancelBtn,
                        {
                          backgroundColor: colors.surface3,
                          borderColor: colors.border,
                          opacity: markingPending ? 0.5 : 1,
                        },
                      ]}
                      disabled={markingPending}
                      onPress={() => setPendingModalVisible(false)}
                    >
                      <Text
                        style={[
                          styles.modalCancelBtnText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Keep Scanning
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalConfirmBtn,
                        {
                          backgroundColor: colors.amber,
                          opacity: markingPending ? 0.7 : 1,
                        },
                      ]}
                      disabled={markingPending}
                      onPress={handleMarkPendingZeroAndSubmit}
                    >
                      {markingPending ? (
                        <ActivityIndicator size="small" color="#0B0F14" />
                      ) : (
                        <Text
                          style={[
                            styles.modalConfirmBtnText,
                            { color: '#0B0F14' },
                          ]}
                        >
                          Mark 0 & Submit
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  statsBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  docInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  statusLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moduleTag: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  docNoText: {
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  deptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  deptChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  deptChipText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  scannedCountBox: {
    alignItems: 'flex-end',
  },
  scannedCountNum: {
    fontSize: 24,
    fontFamily: monoFont,
    fontWeight: '900',
    lineHeight: 28,
  },
  scannedCountLabel: {
    fontSize: 10,
    fontFamily: monoFont,
  },
  progressSection: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  progressPctText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  boxNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  boxNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  boxNavBtnDisabled: {},
  boxNavBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  currentBoxCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boxIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBoxLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  currentBoxNum: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  boxNavBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  boxNavBtnNextText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#0B0F14',
  },
  scanCard: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  scanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  scanIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  scanCardSubtitle: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  scanInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scanInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 46,
    gap: 8,
  },
  scanTextInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '600',
  },
  focusActiveTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  focusActiveTagText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: borderRadius.lg,
    gap: 6,
  },
  scanActionBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#0B0F14',
  },
  statsSection: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsSectionTitle: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsSectionSub: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statBoxVal: {
    fontSize: 15,
    fontFamily: monoFont,
    fontWeight: '900',
    lineHeight: 18,
  },
  statBoxLabel: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  tableCard: {
    borderBottomWidth: 1,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tableCardSub: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  emptyTable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 4,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTableTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyTableSub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  tableBodyWrap: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableRowCancelled: {
    opacity: 0.5,
  },
  rowTrashBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTrashBtnDisabled: {
    backgroundColor: 'transparent',
  },
  boxTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  boxTagText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  rowItemCode: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rowNum: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  packedQtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  packedQtyPillDisabled: {
    backgroundColor: 'transparent',
  },
  packedQtyText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  rowDiffText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  rowTextCancelled: {
    textDecorationLine: 'line-through',
  },
  submitFooter: {
    borderTopWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  submitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  submitMetaText: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  readyText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#0B0F14',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 1,
  },
  modalLabel: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    marginBottom: 6,
  },
  remarksInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 13,
    fontFamily: monoFont,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: monoFont,
    fontWeight: '900',
    height: 44,
  },
  stepperSubtext: {
    fontSize: 11,
    fontFamily: monoFont,
    marginBottom: 14,
  },
  dupInfoBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: 12,
  },
  dupItemCode: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  dupDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dupDetailText: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  pendingCountCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: 10,
  },
  pendingCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingCountNumber: {
    fontSize: 28,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  pendingCountHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  pendingCountSub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  pendingInstructionText: {
    fontSize: 11,
    fontFamily: monoFont,
    lineHeight: 16,
    marginBottom: 12,
  },
  pendingListWrap: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  pendingListHeader: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    marginBottom: 6,
  },
  pendingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pendingItemCode: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  pendingItemMeta: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 1,
  },
  pendingZeroBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  pendingZeroBadgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  markingProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 8,
  },
  markingProgressText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  limitedCartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  limitedCartFooterText: {
    fontSize: 11,
    fontFamily: monoFont,
    flex: 1,
  },
  activeLaserPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeLaserText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  reportFilterRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 10,
  },
  reportFilterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  reportFilterTabText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  reportTableContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
