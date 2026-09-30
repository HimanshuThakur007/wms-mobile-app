import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScanItem, DuplicateEntry } from '../types';
import {
  findItem,
  fetchAndCacheScanningData,
  submitScan,
  saveScan,
  cancelScan,
} from '../services/api';
import {
  loadScanningDataFromStorage,
  LocalScanningItem,
  saveInProgressScannedItems,
  loadInProgressScannedItems,
  clearInProgressScannedItems,
} from '../services/localScanningCache';
import {
  getFormattedBoxNo,
  formatItemBoxNo,
  calculateScanSummary,
  calculateSkuStatsMap,
  getReportItems,
} from '../utils/scanHelpers';
import { useLanguage } from '../context/LanguageContext';

interface UseWmsScanningSessionOptions {
  documentNumber: string;
  organizationName: string;
  departments: string[];
  userId: number;
  userGroup: string;
}

export function useWmsScanningSession({
  documentNumber,
  organizationName,
  departments,
  userId,
  userGroup,
}: UseWmsScanningSessionOptions) {
  const router = useRouter();
  const { t, isHindi } = useLanguage();

  const [currentBox, setCurrentBox] = useState(1);
  const [allScannedItems, setAllScannedItems] = useState<ScanItem[]>([]);
  const [picklistItems, setPicklistItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAllCartItems, setShowAllCartItems] = useState(false);

  // Modals
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
  const [duplicateSaving] = useState(false);

  // Pending Items Modal
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingItemsList, setPendingItemsList] = useState<LocalScanningItem[]>([]);
  const [pendingCountDisplay, setPendingCountDisplay] = useState(0);

  // Report Modal
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
  }, [documentNumber]);

  useEffect(() => {
    loadInitialSessionAndPicklist();
  }, [loadInitialSessionAndPicklist]);

  useEffect(() => {
    if (isRestoringSessionRef.current) return;
    if (documentNumber) {
      saveInProgressScannedItems(documentNumber, allScannedItems, currentBox);
    }
  }, [allScannedItems, currentBox, documentNumber]);

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

  const handleProcessBarcode = useCallback(
    async (trimmedCode: string) => {
      const cleanScanned = trimmedCode.toLowerCase();
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
        item = findRes.data;
      }

      const department = item.department || (departments[0] || 'Packing');
      const boxNo = getFormattedBoxNoStr(currentBox);
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
      picklistItems,
      documentNumber,
      organizationName,
      departments,
      getFormattedBoxNoStr,
      currentBox,
      allScannedItems,
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
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
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
  }, [editQtyId, editQtyValue]);

  const saveAllCartItemsToServer = useCallback(
    async (itemsToSave: ScanItem[]) => {
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
            boxNo: it.box_no || getFormattedBoxNoStr(currentBox),
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
    },
    [userId, documentNumber, organizationName, departments, getFormattedBoxNoStr, currentBox]
  );

  const executeSubmitScan = useCallback(async () => {
    try {
      setSubmitting(true);
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
          t('Batch Submitted'),
          res?.message || `Packing batch for ${documentNumber} submitted successfully!`,
          [
            {
              text: t('Return to Hub'),
              onPress: () => {
                router.replace({
                  pathname: '/(tabs)/packing/wms-registration',
                  params: { refresh: String(Date.now()) },
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(t('Submit Failed'), res?.message || t('Failed to submit packing batch.'));
      }
    } catch (err: any) {
      Alert.alert(t('Submit Error'), err?.message || t('Error submitting packing batch.'));
    } finally {
      setSubmitting(false);
    }
  }, [saveAllCartItemsToServer, allScannedItems, departments, documentNumber, t, router]);

  const handleOpenPendingCheck = useCallback(async () => {
    try {
      const activeScannedCodes = new Set(
        allScannedItems
          .filter((it) => it.itemstatus !== 'cancelled')
          .map((it) => String(it.itemcode || '').trim().toLowerCase())
      );

      const remainingPending = picklistItems.filter(
        (pi) => !activeScannedCodes.has(String(pi.itemcode || '').trim().toLowerCase())
      );

      if (remainingPending.length > 0) {
        setPendingItemsList(remainingPending);
        setPendingCountDisplay(remainingPending.length);
        setPendingModalVisible(true);
      } else {
        await executeSubmitScan();
      }
    } catch (err) {
      console.log('Error checking pending items:', err);
      await executeSubmitScan();
    }
  }, [allScannedItems, picklistItems, executeSubmitScan]);

  const isAnyModalOpen =
    duplicateVisible || editQtyVisible || cancelModalVisible || pendingModalVisible || reportModalVisible;

  return {
    cleanDoc,
    group,
    currentBox,
    setCurrentBox,
    allScannedItems,
    picklistItems,
    loading,
    submitting,
    showAllCartItems,
    setShowAllCartItems,
    summary,
    skuStatsMap,
    reportItems,
    getFormattedBoxNoStr,
    formatItemBoxNoStr,
    loadInitialSessionAndPicklist,
    handleProcessBarcode,

    cancelModalVisible,
    setCancelModalVisible,
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

    pendingModalVisible,
    setPendingModalVisible,
    pendingItemsList,
    pendingCountDisplay,
    handleOpenPendingCheck,
    executeSubmitScan,

    reportModalVisible,
    setReportModalVisible,
    reportFilter,
    setReportFilter,

    revisedItemIds,
    isAnyModalOpen,
  };
}
