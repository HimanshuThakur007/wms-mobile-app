import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { DocumentType, Registration } from '../types';
import { getDocuments, getUserRegistrations, registerDocument } from '../services/api';
import { syncDocumentScanningData, fetchAndCacheScanningData } from '../services/localScanningCache';

interface UseDocumentRegistrationSessionOptions {
  userId: number;
  userName: string;
  defaultTab?: 'register' | 'scan';
  fallbackDepts?: string[];
}

export function useDocumentRegistrationSession({
  userId,
  userName,
  defaultTab = 'register',
  fallbackDepts = ['General Packing', 'Receiving', 'Shipping', 'Quality Control'],
}: UseDocumentRegistrationSessionOptions) {
  const [tab, setTab] = useState<'register' | 'scan'>(defaultTab);

  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');

  // Register Tab State
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [docSheetOpen, setDocSheetOpen] = useState(false);
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);

  // Scan Tab State
  const [scanSearch, setScanSearch] = useState('');
  const [selectedScanDocNo, setSelectedScanDocNo] = useState<string | null>(null);
  const [selectedScanDepts, setSelectedScanDepts] = useState<string[]>([]);
  const [selectedScanRowIds, setSelectedScanRowIds] = useState<string[]>([]);

  const toggleScanRow = useCallback((id: string) => {
    setSelectedScanRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const toggleAllScanRows = useCallback((allIds: string[]) => {
    setSelectedScanRowIds((prev) => {
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !allIds.includes(id));
      } else {
        const set = new Set([...prev, ...allIds]);
        return Array.from(set);
      }
    });
  }, []);

  // Data Syncing State
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncDocNo, setSyncDocNo] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [syncItemCount, setSyncItemCount] = useState<number | undefined>(undefined);
  const [syncComplete, setSyncComplete] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [docsData, regsData] = await Promise.all([
        getDocuments(),
        getUserRegistrations(userId),
      ]);
      setDocuments(docsData);
      setRegistrations(regsData);
    } catch (e) {
      console.log('LOAD REGISTRATION DATA ERROR:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleTabSwitch = useCallback((newTab: 'register' | 'scan') => {
    setTab(newTab);
    loadData();
  }, [loadData]);

  const availableDepts = useMemo(() => {
    if (!selectedDoc) return [];
    if (Array.isArray(selectedDoc.departments)) return selectedDoc.departments;
    if (typeof selectedDoc.departments === 'string' && (selectedDoc.departments as string).length > 0) {
      return (selectedDoc.departments as string).split(',').map((d: string) => d.trim()).filter(Boolean);
    }
    return fallbackDepts;
  }, [selectedDoc, fallbackDepts]);

  const handleSelectDoc = useCallback((doc: DocumentType) => {
    setSelectedDoc(doc);
    setSelectedDepts([]);
  }, []);

  const toggleDept = useCallback((dept: string) => {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  }, []);

  const toggleAllDepts = useCallback(() => {
    if (selectedDepts.length === availableDepts.length) {
      setSelectedDepts([]);
    } else {
      setSelectedDepts([...availableDepts]);
    }
  }, [selectedDepts, availableDepts]);

  const handleRegister = useCallback(async () => {
    if (!selectedDoc || selectedDepts.length === 0) {
      Alert.alert('Required', 'Please select a document and at least one department.');
      return;
    }
    const docNo = selectedDoc.doc_no || selectedDoc.document_number || '';
    const docId = Number(selectedDoc.id || 0);
    const orgName = selectedDoc.organization_name || 'Organization';

    try {
      setRegistering(true);
      const res = await registerDocument({
        documentId: docId,
        documentNumber: docNo,
        departments: selectedDepts,
        userId,
        userName,
        docNo,
        organizationName: orgName,
      });

      if (res?.status === true) {
        Alert.alert(
          'Registration Successful',
          res?.message || `Registered ${selectedDepts.length} department(s) for ${docNo}`
        );
        setRegSuccess(
          `Registered ${selectedDepts.length} department(s) for ${docNo}`
        );
        setSelectedDoc(null);
        setSelectedDepts([]);

        // Auto trigger background data sync for smooth offline scanning
        startDataSync(docNo);
        loadData();
      } else {
        Alert.alert('Registration Failed', res?.message || 'Could not register document.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to register document');
    } finally {
      setRegistering(false);
    }
  }, [selectedDoc, selectedDepts, userId, userName, loadData]);

  const startDataSync = useCallback((docNo: string) => {
    return new Promise<void>((resolve) => {
      if (!docNo) {
        resolve();
        return;
      }
      setSyncDocNo(docNo);
      setSyncProgress(10);
      setSyncStatusText(`Connecting to repository for ${docNo}...`);
      setSyncItemCount(undefined);
      setSyncComplete(false);
      setSyncModalVisible(true);

      (async () => {
        try {
          setSyncProgress(30);
          setSyncStatusText(`Downloading lines & barcode lookup tables...`);

          const result = await syncDocumentScanningData(docNo);
          setSyncProgress(85);

          if (result.success) {
            setSyncItemCount(result.itemCount);
            setSyncProgress(100);
            setSyncStatusText(`Ready! ${result.itemCount} lines downloaded.`);
            setSyncComplete(true);
          } else {
            setSyncStatusText(`Caching fallback data...`);
            const fallback = await fetchAndCacheScanningData(docNo);
            const count = fallback?.items?.length || 0;
            setSyncItemCount(count);
            setSyncProgress(100);
            setSyncStatusText(`Ready! ${count} items cached locally.`);
            setSyncComplete(true);
          }
        } catch (err: any) {
          console.log('SYNC ERROR:', err);
          setSyncProgress(100);
          setSyncStatusText(`Sync finished with cached fallback dataset.`);
          setSyncComplete(true);
        } finally {
          setTimeout(() => {
            setSyncModalVisible(false);
            resolve();
          }, 1200);
        }
      })();
    });
  }, []);

  return {
    tab,
    setTab,
    documents,
    registrations,
    loading,
    refreshing,
    registering,
    regSuccess,
    setRegSuccess,

    selectedDoc,
    setSelectedDoc,
    selectedDepts,
    setSelectedDepts,
    availableDepts,
    docSheetOpen,
    setDocSheetOpen,
    deptSheetOpen,
    setDeptSheetOpen,

    scanSearch,
    setScanSearch,
    selectedScanDocNo,
    setSelectedScanDocNo,
    selectedScanDepts,
    setSelectedScanDepts,
    selectedScanRowIds,
    setSelectedScanRowIds,
    toggleScanRow,
    toggleAllScanRows,

    syncModalVisible,
    setSyncModalVisible,
    syncDocNo,
    syncProgress,
    syncStatusText,
    syncItemCount,
    syncComplete,

    loadData,
    onRefresh,
    handleTabSwitch,
    handleSelectDoc,
    toggleDept,
    toggleAllDepts,
    handleRegister,
    startDataSync,
  };
}
