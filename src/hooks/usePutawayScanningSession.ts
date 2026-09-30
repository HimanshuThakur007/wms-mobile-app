import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  findPutawayItemLocalOrRemote,
  loadPutawayDataFromStorage,
  saveInProgressScannedItems,
  loadInProgressScannedItems,
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export interface PutawayScannedItem {
  id: number;
  itemcode: string;
  itemname: string;
  grn_number: string;
  bin_location: string;
  requested_quantity: number;
  packedqty: number;
  department: string;
  itemstatus: 'scanned' | 'revised' | 'cancelled';
  scanned_at: string;
}

interface UsePutawayScanningSessionOptions {
  activeGrn: string;
  binLocation: string;
  binDepartment: string;
  grnDepartmentParam: string;
  departments: string[];
}

export function usePutawayScanningSession({
  activeGrn,
  binLocation,
  binDepartment,
  grnDepartmentParam,
  departments,
}: UsePutawayScanningSessionOptions) {
  const { t, isHindi } = useLanguage();

  const [allScannedItems, setAllScannedItems] = useState<PutawayScannedItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelItemId, setCancelItemId] = useState<number | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');

  const [editQtyVisible, setEditQtyVisible] = useState(false);
  const [editQtyItem, setEditQtyItem] = useState<PutawayScannedItem | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');

  const [duplicateVisible, setDuplicateVisible] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<{
    itemcode: string;
    itemname: string;
    grn_number: string;
    bin_location: string;
    requested_quantity: number;
    already_packed: number;
    balance_qty: number;
  } | null>(null);
  const [duplicateQty, setDuplicateQty] = useState('1');

  const isRestoringSessionRef = useRef(false);

  // Pre-load local storage data & restore saved in-progress scanned items
  useEffect(() => {
    if (!activeGrn) return;
    const restoreSavedSession = async () => {
      try {
        isRestoringSessionRef.current = true;
        await loadPutawayDataFromStorage(activeGrn);
        const savedSession = await loadInProgressScannedItems(activeGrn);
        if (savedSession && Array.isArray(savedSession.items) && savedSession.items.length > 0) {
          setAllScannedItems(savedSession.items);
        }
      } catch (err) {
        console.error('[PutawayScanning] Restore session error:', err);
      } finally {
        setTimeout(() => {
          isRestoringSessionRef.current = false;
        }, 300);
      }
    };

    restoreSavedSession();
  }, [activeGrn]);

  // Auto-save in-progress scanned items
  useEffect(() => {
    if (isRestoringSessionRef.current) return;
    if (activeGrn) {
      saveInProgressScannedItems(activeGrn, allScannedItems);
    }
  }, [allScannedItems, activeGrn]);

  const processValidScan = useCallback(
    (
      code: string,
      itemName: string,
      reqQty: number,
      itemDept: string,
      localItemData?: any
    ) => {
      const targetItemCode = String(
        localItemData?.itemcode ||
          localItemData?.itemCode ||
          localItemData?.item ||
          code
      ).trim();

      const matchKeys = new Set(
        [
          code.trim().toLowerCase(),
          targetItemCode.toLowerCase(),
          String(localItemData?.itemcode || '').trim().toLowerCase(),
          String(localItemData?.itemCode || '').trim().toLowerCase(),
          String(localItemData?.item || '').trim().toLowerCase(),
          String(localItemData?.barcode || '').trim().toLowerCase(),
          String(localItemData?.barcode1 || '').trim().toLowerCase(),
          String(localItemData?.barcode2 || '').trim().toLowerCase(),
          String(localItemData?.sku || '').trim().toLowerCase(),
        ].filter(Boolean)
      );

      const existingRows = allScannedItems.filter(
        (it) =>
          matchKeys.has(String(it.itemcode || '').trim().toLowerCase()) &&
          it.itemstatus !== 'cancelled'
      );

      if (existingRows.length > 0) {
        const alreadyPacked = existingRows.reduce((sum, it) => sum + Number(it.packedqty || 0), 0);
        const resolvedReqQty = existingRows[0].requested_quantity || reqQty;
        const balanceQty = Math.max(0, resolvedReqQty - alreadyPacked);

        setDuplicateItem({
          itemcode: targetItemCode,
          itemname: itemName,
          grn_number: activeGrn,
          bin_location: binLocation,
          requested_quantity: resolvedReqQty,
          already_packed: alreadyPacked,
          balance_qty: balanceQty,
        });
        setDuplicateQty(balanceQty > 0 ? String(Math.floor(balanceQty)) : '1');
        setDuplicateVisible(true);
        return;
      }

      const newItem: PutawayScannedItem = {
        id: Date.now(),
        itemcode: targetItemCode,
        itemname: itemName,
        grn_number: activeGrn,
        bin_location: binLocation,
        requested_quantity: reqQty,
        packedqty: reqQty,
        department: itemDept,
        itemstatus: 'scanned',
        scanned_at: new Date().toISOString(),
      };

      setAllScannedItems((prev) => [newItem, ...prev]);
    },
    [allScannedItems, activeGrn, binLocation]
  );

  const handleProcessBarcode = useCallback(
    async (trimmedCode: string) => {
      const localLookup = await findPutawayItemLocalOrRemote(activeGrn, trimmedCode);
      const localData = localLookup?.data;

      if (!localLookup || localLookup.status !== true || !localData || !localData.itemcode) {
        Alert.alert(
          t('Item Not Found in GRN'),
          isHindi
            ? `आइटम "${trimmedCode}" GRN ${activeGrn} के लिए आवंटित आइटमों में नहीं मिला। कृपया एक मान्य आइटम स्कैन करें।`
            : `Item "${trimmedCode}" is not found in the assigned items for GRN ${activeGrn}. Please scan a valid item.`
        );
        return;
      }

      const itemName = localData?.itemDesc || localData?.itemname || localData?.item_name || `SKU-${trimmedCode}`;
      const reqQty = Number(localData?.orderedQty ?? localData?.requested_quantity ?? 1);
      const itemDept = localData?.department || grnDepartmentParam || binDepartment || 'Putaway Binning';

      const isDeptMatched =
        departments.length === 0 ||
        !localData.department ||
        departments.some(
          (d) => d.trim().toUpperCase() === localData.department.trim().toUpperCase()
        );

      if (!isDeptMatched) {
        Alert.alert(
          t('Department Warning'),
          isHindi
            ? `आइटम "${trimmedCode}" विभाग "${localData.department}" का है, जबकि GRN "${departments.join(', ')}" को आवंटित है। क्या आप आगे बढ़ना चाहते हैं?`
            : `Item "${trimmedCode}" belongs to "${localData.department}", while GRN is assigned to "${departments.join(', ')}". Do you want to proceed?`,
          [
            { text: t('Cancel'), style: 'cancel' },
            {
              text: t('Confirm'),
              onPress: () => processValidScan(trimmedCode, itemName, reqQty, itemDept, localData),
            },
          ]
        );
        return;
      }

      processValidScan(trimmedCode, itemName, reqQty, itemDept, localData);
    },
    [activeGrn, t, isHindi, grnDepartmentParam, binDepartment, departments, processValidScan]
  );

  const closeDuplicateModal = useCallback(() => {
    setDuplicateVisible(false);
    setDuplicateItem(null);
    setDuplicateQty('1');
  }, []);

  const handleDuplicateInsert = useCallback(() => {
    if (!duplicateItem) return;
    const qty = parseInt(duplicateQty, 10);
    if (isNaN(qty) || qty < 1) {
      Alert.alert(t('Invalid Quantity'), t('Please enter a valid quantity.'));
      return;
    }

    const newItem: PutawayScannedItem = {
      id: Date.now(),
      itemcode: duplicateItem.itemcode,
      itemname: duplicateItem.itemname || `SKU-${duplicateItem.itemcode}`,
      grn_number: duplicateItem.grn_number,
      bin_location: duplicateItem.bin_location,
      requested_quantity: duplicateItem.requested_quantity,
      packedqty: qty,
      department: grnDepartmentParam || binDepartment || 'Putaway Binning',
      itemstatus: 'revised',
      scanned_at: new Date().toISOString(),
    };

    setAllScannedItems((prev) => [newItem, ...prev]);
    closeDuplicateModal();
  }, [duplicateItem, duplicateQty, grnDepartmentParam, binDepartment, t, closeDuplicateModal]);

  const openCancelModal = useCallback((id: number) => {
    setCancelItemId(id);
    setCancelRemarks('');
    setCancelModalVisible(true);
  }, []);

  const handleCancelItem = useCallback(() => {
    if (!cancelItemId) return;
    setAllScannedItems((prev) =>
      prev.map((it) => (it.id === cancelItemId ? { ...it, itemstatus: 'cancelled' } : it))
    );
    setCancelModalVisible(false);
    setCancelItemId(null);
    setCancelRemarks('');
  }, [cancelItemId]);

  const openEditQtyModal = useCallback((item: PutawayScannedItem) => {
    setEditQtyItem(item);
    setEditQtyValue(String(Math.floor(item.packedqty)));
    setEditQtyVisible(true);
  }, []);

  const handleUpdateQty = useCallback(() => {
    if (!editQtyItem) return;
    const qty = parseInt(editQtyValue, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert(t('Invalid Quantity'), t('Please enter a valid number.'));
      return;
    }

    setAllScannedItems((prev) =>
      prev.map((it) =>
        it.id === editQtyItem.id ? { ...it, packedqty: qty, itemstatus: 'revised' } : it
      )
    );
    setEditQtyVisible(false);
    setEditQtyItem(null);
    setEditQtyValue('');
  }, [editQtyItem, editQtyValue, t]);

  const skuStats = useMemo(() => {
    const active = allScannedItems.filter((i) => i.itemstatus !== 'cancelled');
    const totalLines = active.length;
    const totalQty = active.reduce((sum, i) => sum + Number(i.packedqty || 0), 0);
    const uniqueSkus = new Set(active.map((i) => String(i.itemcode).trim().toLowerCase())).size;
    return { totalLines, totalQty, uniqueSkus };
  }, [allScannedItems]);

  const isAnyModalOpen = duplicateVisible || editQtyVisible || cancelModalVisible;

  return {
    allScannedItems,
    setAllScannedItems,
    submitting,
    setSubmitting,
    skuStats,

    handleProcessBarcode,

    cancelModalVisible,
    setCancelModalVisible,
    cancelItemId,
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
    handleUpdateQty,

    duplicateVisible,
    setDuplicateVisible,
    duplicateItem,
    duplicateQty,
    setDuplicateQty,
    closeDuplicateModal,
    handleDuplicateInsert,

    isAnyModalOpen,
  };
}
