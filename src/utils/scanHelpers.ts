import { ScanItem, ScanSummary } from '../types';

export interface SkuStat {
  totalPacked: number;
  requestedQty: number;
  rowCount: number;
}

export function getFormattedBoxNo(cleanDoc: string, group: string, boxNum: number): string {
  const seq = String(boxNum).padStart(2, '0');
  return `${cleanDoc}/${group}-${seq}`;
}

export function formatItemBoxNo(cleanDoc: string, group: string, boxVal: string | number | undefined | null): string {
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
}

export function calculateScanSummary(allScannedItems: ScanItem[], picklistItems: any[]): ScanSummary {
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
}

export function calculateSkuStatsMap(allScannedItems: ScanItem[]): Map<string, SkuStat> {
  const map = new Map<string, SkuStat>();

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
}

export function getStatusBadge(status: string, colors: any, t: (str: string) => string) {
  if (status === 'revised') {
    return { label: t('REVISED'), color: colors.violet, bg: colors.violetMuted, border: colors.violet };
  }
  if (status === 'cancelled') {
    return { label: t('CANCELLED'), color: colors.red, bg: colors.redMuted, border: colors.red };
  }
  return { label: t('SCANNED'), color: colors.amber, bg: colors.amberMuted, border: colors.amber };
}

export function getReportItems(
  allScannedItems: ScanItem[],
  picklistItems: any[],
  reportFilter: 'total' | 'scanned' | 'revised' | 'cancelled' | 'pending',
  revisedItemIds: Set<number>,
  skuStatsMap: Map<string, SkuStat>
): ScanItem[] {
  const scannedCodes = new Set(
    allScannedItems
      .filter((i) => i.itemstatus !== 'cancelled')
      .map((i) => String(i.itemcode || '').trim().toLowerCase())
  );
  const pendingItems = picklistItems
    .filter((it) => !scannedCodes.has(String(it.itemcode || '').trim().toLowerCase()))
    .map((it, idx) => ({
      id: -1000 - idx,
      itemcode: it.itemcode,
      box_no: '—',
      requested_quantity: Number(it.qty ?? it.requested_quantity ?? 1),
      packedqty: 0,
      itemstatus: 'pending',
    } as ScanItem));

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
      const packedQty = Number(item.packedqty ?? (item as any).packed_qty ?? 0);
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
      const packedQty = Number(item.packedqty ?? (item as any).packed_qty ?? 0);
      const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;
      return totalSkuPacked === requestedQty && (!skuStats || skuStats.rowCount <= 1);
    });
  }
  if (reportFilter === 'pending') {
    return pendingItems;
  }
  return [...allScannedItems, ...pendingItems];
}
