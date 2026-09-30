import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { ScanItem, DuplicateEntry } from '../types';
import { findItem, fetchAndCacheScanningData } from '../services/api';
import {
  loadScanningDataFromStorage,
  saveInProgressScannedItems,
  loadInProgressScannedItems,
} from '../services/localScanningCache';
import {
  getFormattedBoxNo,
  formatItemBoxNo,
  calculateScanSummary,
  calculateSkuStatsMap,
  getReportItems,
} from '../utils/scanHelpers';
import { useLanguage } from '../context/LanguageContext';

interface UseContainerScanningSessionOptions {
  documentNumber: string;
  organizationName: string;
  departments: string[];
  userId: number;
  userGroup: string;
}

export function useContainerScanningSession({
  documentNumber,
  organizationName,
  departments,
  userId,
  userGroup,
}: UseContainerScanningSessionOptions) {
  const { t, isHindi } = useLanguage();

  const [currentPallet, setCurrentPallet] = useState(1);
  const [allScannedItems, setAllScannedItems] = useState<ScanItem[]>([]);
  const [picklistItems, setPicklistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllCartItems, setShowAllCartItems] = useState(false);

  // Modals state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');

  const [editQtyVisible, setEditQtyVisible] = useState(false);
  const [editQtyId, setEditQtyId] = useState<number | null>(null);
  const [editQtyItem, setEditQtyItem] = useState<ScanItem | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');
  const [revisedItemIds, setRevisedItemIds] = useState<Set<number>>(new Set());

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

  // Container Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportFilter, setReportFilter] = useState<'total' | 'scanned' | 'revised' | 'cancelled' | 'pending'>('scanned');

  const isRestoringSessionRef = useRef(true);

  const cleanDoc = useMemo(
    () => String(documentNumber || '').replace(/^SCND-?/i, '').trim() || '1000',
    [documentNumber]
  );
  const group = useMemo(() => String(userGroup || 'B').trim() || 'B', [userGroup]);

  const getFormattedBoxNoStr = useCallback(
    (boxNum: number) => getFormattedBoxNo(cleanDoc, group, boxNum),
    [cleanDoc, group]
  );

  const formatItemBoxNoStr = useCallback(
    (boxVal: any) => formatItemBoxNo(cleanDoc, group, boxVal),
    [cleanDoc, group]
  );

  const loadInitialSessionAndPicklist = useCallback(async () => {
    if (!documentNumber) return;
    try {
      setLoading(true);
      isRestoringSessionRef.current = true;

      // 1. Load picklist cache
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

      // 2. Restore saved in-progress session
      const savedSession = await loadInProgressScannedItems(documentNumber);
      if (savedSession && Array.isArray(savedSession.items) && savedSession.items.length > 0) {
        setAllScannedItems(savedSession.items);
        if (savedSession.currentBox && Number(savedSession.currentBox) >= 1) {
          setCurrentPallet(Number(savedSession.currentBox));
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
  }, [documentNumber]);

  useEffect(() => {
    loadInitialSessionAndPicklist();
  }, [loadInitialSessionAndPicklist]);

  // Auto-save in-progress scanned items locally whenever cart changes
  useEffect(() => {
    if (isRestoringSessionRef.current) return;
    if (documentNumber) {
      saveInProgressScannedItems(documentNumber, allScannedItems, currentPallet);
    }
  }, [allScannedItems, currentPallet, documentNumber]);

  // Derived Summary & Stats
  const summary = useMemo(
    () => calculateScanSummary(allScannedItems, picklistItems),
    [allScannedItems, picklistItems]
  );

  const skuStatsMap = useMemo(
    () => calculateSkuStatsMap(allScannedItems),
    [allScannedItems]
  );

  const reportItems = useMemo(
    () => getReportItems(allScannedItems, picklistItems, reportFilter, revisedItemIds, skuStatsMap),
    [allScannedItems, picklistItems, reportFilter, revisedItemIds, skuStatsMap]
  );

  const progressPct = useMemo(() => {
    if (summary.requested_qty > 0) {
      return Math.min(100, Math.round((summary.packed_qty / summary.requested_qty) * 100));
    }
    if (summary.total_items > 0) {
      return Math.min(100, Math.round((summary.scanned_items / summary.total_items) * 100));
    }
    return 0;
  }, [summary]);

  const handleProcessBarcode = useCallback(
    async (trimmedCode: string) => {
      const findRes = await findItem(documentNumber, trimmedCode);
      if (!findRes || findRes.status !== true) {
        Alert.alert(
          t('Item Not Found'),
          isHindi
            ? `दस्तावेज़ ${documentNumber} के लिए आइटम '${trimmedCode}' नहीं मिला।`
            : findRes?.message || `Item '${trimmedCode}' not found for document ${documentNumber}.`
        );
        return;
      }

      const item = findRes.data;
      const department = item.department || (departments[0] || 'Container');
      const boxNo = getFormattedBoxNoStr(currentPallet);
      const requestedQty = Number(item.requested_quantity || item.qty || 1);
      const targetItemCode = item.item || item.itemcode || trimmedCode;
      const matchKeys = new Set(
        [
          trimmedCode.trim().toLowerCase(),
          String(targetItemCode || '').trim().toLowerCase(),
          String(item.item || '').trim().toLowerCase(),
          String(item.itemcode || '').trim().toLowerCase(),
          String(item.barcode || '').trim().toLowerCase(),
        ].filter(Boolean)
      );

      // Check duplicate
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
            box_no: formatItemBoxNoStr(it.box_no),
            packedqty: Number(it.packedqty || 0),
            requested_quantity: Number(it.requested_quantity || dupReqQty),
            department: it.department || department,
            itemstatus: it.itemstatus || 'scanned',
            scanned_on: it.scanned_on || new Date().toISOString(),
            username: '',
          })),
        });

        setDuplicateQty(balanceQty > 0 ? String(Math.floor(balanceQty)) : '1');
        setDuplicateVisible(true);
        return;
      }

      // Add item directly to local scanned list
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
    },
    [
      documentNumber,
      departments,
      getFormattedBoxNoStr,
      currentPallet,
      allScannedItems,
      organizationName,
      userId,
      formatItemBoxNoStr,
      t,
      isHindi,
    ]
  );

  const handleDuplicateInsert = useCallback(() => {
    if (!duplicateItem) return;
    const qty = parseInt(duplicateQty, 10);
    if (isNaN(qty) || qty < 1) {
      Alert.alert(t('Invalid Quantity'), t('Please enter a valid quantity.'));
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
  }, [duplicateItem, duplicateQty, userId, organizationName]);

  const openCancelModal = useCallback((id: number) => {
    setCancelId(id);
    setCancelRemarks('');
    setCancelModalVisible(true);
  }, []);

  const handleCancelItem = useCallback(() => {
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
  }, [cancelId, cancelRemarks]);

  const openEditQtyModal = useCallback((item: ScanItem) => {
    setEditQtyItem(item);
    setEditQtyId(item.id);
    setEditQtyValue(String(Math.floor(item.packedqty)));
    setEditQtyVisible(true);
  }, []);

  const handleUpdatePackedQty = useCallback(() => {
    if (!editQtyId) return;
    const qty = parseInt(editQtyValue, 10);
    if (isNaN(qty) || qty < 1) return;

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
  }, [editQtyId, editQtyValue]);

  const isAnyModalOpen =
    duplicateVisible || editQtyVisible || cancelModalVisible || reportModalVisible;

  return {
    cleanDoc,
    group,
    currentPallet,
    setCurrentPallet,
    allScannedItems,
    picklistItems,
    loading,
    showAllCartItems,
    setShowAllCartItems,
    summary,
    skuStatsMap,
    reportItems,
    progressPct,
    getFormattedBoxNoStr,
    formatItemBoxNoStr,
    loadInitialSessionAndPicklist,
    handleProcessBarcode,
    // Modals
    cancelModalVisible,
    setCancelModalVisible,
    cancelId,
    cancelRemarks,
    setCancelRemarks,
    openCancelModal,
    handleCancelItem,

    editQtyVisible,
    setEditQtyVisible,
    editQtyItem,
    editQtyValue,
    setEditQtyValue,
    openEditQtyModal,
    handleUpdatePackedQty,

    duplicateVisible,
    setDuplicateVisible,
    duplicateItem,
    duplicateQty,
    setDuplicateQty,
    duplicateSaving,
    handleDuplicateInsert,

    reportModalVisible,
    setReportModalVisible,
    reportFilter,
    setReportFilter,

    revisedItemIds,
    isAnyModalOpen,
  };
}
