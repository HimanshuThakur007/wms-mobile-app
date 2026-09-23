import { SafeStorage } from "../utils/storage";
import { ApiResponse } from "./api";

export const SCANNING_DATA_API_URL =
  "https://market99.tech/tmp/ynex/wms_api/scanning_data";
export const SCANNING_DATA_PHP_URL =
  "https://market99.tech/tmp/ynex/wms_api/scanning_data.php";
export const PENDING_GRN_ITEMS_API_URL =
  "https://market99.tech/tmp/ynex/wms_api/pending_grn_items";
export const PENDING_GRN_ITEMS_PHP_URL =
  "https://market99.tech/tmp/ynex/wms_api/pending_grn_items.php";

export const MAX_CACHED_DOCUMENTS = 20; // Keep at most the 20 most recent documents
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours expiry
export const CACHE_INDEX_KEY = "@wms_scanning_cache_index";

export interface LocalScanningItem {
  document_number: string;
  itemcode: string;
  qty: string | number;
  department: string;
  [key: string]: any;
}

export interface PutawayGrnItem {
  id?: string | number;
  grn_number?: string;
  itemcode: string;
  itemCode?: string;
  itemname?: string;
  itemDesc?: string;
  item_name?: string;
  item_description?: string;
  qty?: string | number;
  orderedQty?: string | number;
  ordered_qty?: string | number;
  requested_quantity?: string | number;
  department?: string;
  vouch_date?: string;
  [key: string]: any;
}

export interface PutawayGrnPayload {
  status: boolean;
  message?: string;
  data?: PutawayGrnItem[];
  items?: PutawayGrnItem[];
  count?: number;
  total_items?: number;
  cached_at?: number;
  grn_number?: string;
  vouch_date?: string;
  [key: string]: any;
}

export interface LocalScanningDataPayload {
  status: boolean;
  message?: string;
  header?: {
    id?: string | number;
    document_id?: string | number;
    document_number?: string;
    department?: string;
    user_id?: string | number;
    registered_at?: string;
    status?: string;
    modify_status?: string | number;
    modify_on?: string | null;
    modift_at?: string | null;
    [key: string]: any;
  };
  items: LocalScanningItem[];
  total_items?: number;
  cached_at?: number;
}

export interface CacheIndexEntry {
  docNo: string;
  storageKey: string;
  cachedAt: number;
  lastAccessedAt: number;
  itemCount: number;
}

// In-memory fast access maps
const docItemsCache = new Map<string, LocalScanningItem[]>();
const itemLookupCache = new Map<string, LocalScanningItem>();

function getDocKeys(docNo: string): string[] {
  const clean = String(docNo || "")
    .trim()
    .toLowerCase();
  const withoutPrefix = clean.replace(/^scnd-?/i, "");
  const withPrefix = `scnd-${withoutPrefix}`;
  return Array.from(new Set([clean, withoutPrefix, withPrefix])).filter(
    Boolean,
  );
}

function getItemKey(docNo: string, itemCode: string): string {
  const cleanDoc = String(docNo || "")
    .trim()
    .toLowerCase()
    .replace(/^scnd-?/i, "");
  const cleanItem = String(itemCode || "")
    .trim()
    .toLowerCase();
  return `${cleanDoc}:::${cleanItem}`;
}

async function getCacheIndex(): Promise<CacheIndexEntry[]> {
  try {
    const raw = await SafeStorage.getItem(CACHE_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("[LocalCache] Error reading cache index:", err);
  }
  return [];
}

async function saveCacheIndex(index: CacheIndexEntry[]): Promise<void> {
  try {
    await SafeStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    console.error("[LocalCache] Error saving cache index:", err);
  }
}

/**
 * Automatically purge document caches older than 24 hours or exceeding the 20 most recent limit
 */
export async function pruneOldScanningCaches(): Promise<void> {
  try {
    const now = Date.now();
    const index = await getCacheIndex();
    if (!index || index.length === 0) return;

    const validEntries: CacheIndexEntry[] = [];
    const entriesToEvict: CacheIndexEntry[] = [];

    // 1. Separate expired (older than 24 hours) from unexpired
    for (const entry of index) {
      const age = now - (entry.lastAccessedAt || entry.cachedAt || 0);
      if (age > CACHE_TTL_MS) {
        entriesToEvict.push(entry);
      } else {
        validEntries.push(entry);
      }
    }

    // 2. If valid entries still exceed MAX_CACHED_DOCUMENTS, keep only the 20 most recently accessed
    validEntries.sort(
      (a, b) =>
        (b.lastAccessedAt || b.cachedAt) - (a.lastAccessedAt || a.cachedAt),
    );
    while (validEntries.length > MAX_CACHED_DOCUMENTS) {
      const removed = validEntries.pop();
      if (removed) entriesToEvict.push(removed);
    }

    // 3. Remove evicted items from SafeStorage & in-memory cache
    for (const evicted of entriesToEvict) {
      console.log(
        `[LocalCache] Pruning old cache for doc '${evicted.docNo}' (StorageKey: ${evicted.storageKey})`,
      );
      await SafeStorage.removeItem(evicted.storageKey);
      const keys = getDocKeys(evicted.docNo);
      keys.forEach((k) => docItemsCache.delete(k));
    }

    // 4. Save updated index
    await saveCacheIndex(validEntries);
  } catch (err) {
    console.error("[LocalCache] Error pruning old scanning caches:", err);
  }
}

/**
 * Remove specific document cache explicitly
 */
export async function clearDocumentScanningCache(docNo: string): Promise<void> {
  if (!docNo) return;
  try {
    const keys = getDocKeys(docNo);
    const storageKey = `@wms_scanning_data_${keys[0]}`;
    await SafeStorage.removeItem(storageKey);
    keys.forEach((k) => docItemsCache.delete(k));

    const index = await getCacheIndex();
    const cleanDoc = docNo.trim().toLowerCase();
    const filtered = index.filter(
      (e) => e.docNo.trim().toLowerCase() !== cleanDoc,
    );
    await saveCacheIndex(filtered);
    console.log(`[LocalCache] Cleared cache for doc '${docNo}'`);
  } catch (err) {
    console.error("[LocalCache] Error clearing doc cache:", err);
  }
}

/**
 * Save scanning data into memory and persistent SafeStorage
 */
export async function saveScanningDataLocally(
  docNo: string,
  payload: LocalScanningDataPayload,
): Promise<void> {
  if (!docNo || !payload || !Array.isArray(payload.items)) {
    return;
  }

  const keys = getDocKeys(docNo);
  const items = payload.items;

  // 1. Store in memory maps
  keys.forEach((k) => {
    docItemsCache.set(k, items);
  });

  items.forEach((item) => {
    const identifiers = [
      item?.itemcode,
      item?.barcode,
      item?.item,
      item?.sku,
      item?.item_code,
      (item as any)?.ean,
      (item as any)?.upc,
    ].filter(Boolean);

    identifiers.forEach((code) => {
      const lookupKey = getItemKey(docNo, String(code));
      itemLookupCache.set(lookupKey, item);

      // Also index with item's own document_number if available
      if (item.document_number && item.document_number !== docNo) {
        itemLookupCache.set(
          getItemKey(item.document_number, String(code)),
          item,
        );
      }
    });
  });

  // 2. Persist to SafeStorage
  try {
    const storageKey = `@wms_scanning_data_${keys[0]}`;
    const dataToSave = {
      ...payload,
      cached_at: Date.now(),
    };
    await SafeStorage.setItem(storageKey, JSON.stringify(dataToSave));
    console.log(
      `[LocalCache] Stored ${items.length} items locally for doc '${docNo}' (StorageKey: ${storageKey})`,
    );

    // 3. Update index and run auto-prune (keeping only recent 20 docs, max 24h old)
    const index = await getCacheIndex();
    const cleanDoc = docNo.trim().toLowerCase();
    const filtered = index.filter(
      (e) => e.docNo.trim().toLowerCase() !== cleanDoc,
    );
    filtered.unshift({
      docNo,
      storageKey,
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
      itemCount: items.length,
    });
    await saveCacheIndex(filtered);
    await pruneOldScanningCaches();
  } catch (err) {
    console.error("[LocalCache] SafeStorage save error:", err);
  }
}

/**
 * Load scanning data for a document from SafeStorage into in-memory cache
 */
export async function loadScanningDataFromStorage(
  docNo: string,
): Promise<LocalScanningItem[] | null> {
  const keys = getDocKeys(docNo);

  // Check in-memory first
  for (const k of keys) {
    if (docItemsCache.has(k)) {
      return docItemsCache.get(k) || null;
    }
  }

  // Load from SafeStorage
  for (const k of keys) {
    try {
      const storageKey = `@wms_scanning_data_${k}`;
      const json = await SafeStorage.getItem(storageKey);
      if (json) {
        const parsed: LocalScanningDataPayload = JSON.parse(json);
        if (parsed && Array.isArray(parsed.items)) {
          // Populate memory
          keys.forEach((dk) => docItemsCache.set(dk, parsed.items));
          parsed.items.forEach((item) => {
            const identifiers = [
              item?.itemcode,
              item?.barcode,
              item?.item,
              item?.sku,
              item?.item_code,
              (item as any)?.ean,
              (item as any)?.upc,
            ].filter(Boolean);

            identifiers.forEach((code) => {
              itemLookupCache.set(getItemKey(docNo, String(code)), item);
            });
          });
          console.log(
            `[LocalCache] Loaded ${parsed.items.length} items from storage for doc '${docNo}'`,
          );

          // Update last accessed timestamp in index for LRU tracking
          getCacheIndex()
            .then((idx) => {
              const cleanDoc = docNo.trim().toLowerCase();
              const entry = idx.find(
                (e) => e.docNo.trim().toLowerCase() === cleanDoc,
              );
              if (entry) {
                entry.lastAccessedAt = Date.now();
                saveCacheIndex(idx);
              }
            })
            .catch(() => {});

          return parsed.items;
        }
      }
    } catch (err) {
      console.error("[LocalCache] SafeStorage read error:", err);
    }
  }

  return null;
}

/**
 * Background fetch and cache pick list data from server after registration
 */
export async function fetchAndCacheScanningData(
  documentNumber: string,
): Promise<LocalScanningDataPayload | null> {
  const docNo = String(documentNumber || "").trim();
  if (!docNo) return null;

  console.log(`[LocalCache] Background fetching scanning data for: ${docNo}`);

  const postBody = JSON.stringify({ document_number: docNo });
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  let response: Response | null = null;

  try {
    response = await fetch(SCANNING_DATA_API_URL, {
      method: "POST",
      headers,
      body: postBody,
    });
  } catch (err: any) {
    console.log(
      `[LocalCache] Primary URL failed, trying .php endpoint...`,
      err?.message,
    );
    try {
      response = await fetch(SCANNING_DATA_PHP_URL, {
        method: "POST",
        headers,
        body: postBody,
      });
    } catch (err2: any) {
      console.error(
        `[LocalCache] Both scanning_data endpoints failed:`,
        err2?.message,
      );
      return null;
    }
  }

  if (!response) return null;

  try {
    const rawText = await response.text();
    console.log(`[LocalCache] API Response Status: ${response.status}`);

    if (!rawText.trim()) {
      console.warn(`[LocalCache] Server returned empty response for ${docNo}`);
      return null;
    }

    const res: LocalScanningDataPayload = JSON.parse(rawText);
    console.log(
      `[LocalCache] Received payload for ${docNo}: status=${res?.status}, total_items=${res?.total_items || res?.items?.length || 0}`,
    );

    if (res && res.status === true && Array.isArray(res.items)) {
      await saveScanningDataLocally(docNo, res);
      return res;
    } else {
      console.warn(
        `[LocalCache] Scanning data returned status false:`,
        res?.message,
      );
    }
  } catch (err: any) {
    console.error(
      `[LocalCache] Error parsing scanning_data JSON:`,
      err?.message,
    );
  }

  return null;
}

/**
 * High-level syncing with progressive callback for UI modal percentage bar
 */
export async function syncDocumentScanningData(
  documentNumber: string,
  onProgress?: (
    progress: number,
    statusText: string,
    itemCount?: number,
  ) => void,
): Promise<{ success: boolean; itemCount: number; message: string }> {
  const docNo = String(documentNumber || "").trim();
  if (!docNo) {
    return { success: false, itemCount: 0, message: "Document number missing" };
  }

  onProgress?.(15, "Connecting to WMS server...");
  await new Promise((r) => setTimeout(r, 120));

  onProgress?.(35, "Fetching picklist line items...");

  try {
    const postBody = JSON.stringify({ document_number: docNo });
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    let response: Response | null = null;
    try {
      response = await fetch(SCANNING_DATA_API_URL, {
        method: "POST",
        headers,
        body: postBody,
      });
    } catch (e1: any) {
      console.log(`[LocalCache] Primary URL retry via PHP...`, e1?.message);
      response = await fetch(SCANNING_DATA_PHP_URL, {
        method: "POST",
        headers,
        body: postBody,
      });
    }

    onProgress?.(65, "Receiving picklist data payload...");
    await new Promise((r) => setTimeout(r, 80));

    if (!response || !response.ok) {
      onProgress?.(100, "Proceeding with live network lookup...", 0);
      return {
        success: false,
        itemCount: 0,
        message: "Server responded with non-200",
      };
    }

    const rawText = await response.text();
    onProgress?.(80, "Validating & indexing items...");
    await new Promise((r) => setTimeout(r, 80));

    if (!rawText.trim()) {
      onProgress?.(100, "No offline items found. Ready.", 0);
      return { success: false, itemCount: 0, message: "Empty response" };
    }

    const res: LocalScanningDataPayload = JSON.parse(rawText);

    if (res && res.status === true && Array.isArray(res.items)) {
      onProgress?.(92, "Committing items to local offline storage...");
      await saveScanningDataLocally(docNo, res);
      const count = res.items.length;
      onProgress?.(100, `Synced ${count} items successfully!`, count);
      return { success: true, itemCount: count, message: "Sync complete" };
    } else {
      onProgress?.(100, res?.message || "Ready to scan", 0);
      return {
        success: false,
        itemCount: 0,
        message: res?.message || "Status false",
      };
    }
  } catch (err: any) {
    console.error(`[LocalCache] syncDocumentScanningData error:`, err);
    onProgress?.(100, "Proceeding in live mode...", 0);
    return {
      success: false,
      itemCount: 0,
      message: err?.message || "Sync error",
    };
  }
}

/**
 * Find item in local cache first. If not found locally, fallback to remote findItem API.
 */
export async function findItemLocalOrRemote(
  docNo: string,
  itemCode: string,
  remoteFindItemFallback: (d: string, i: string) => Promise<ApiResponse>,
): Promise<ApiResponse> {
  const trimmedItem = String(itemCode || "").trim();
  const trimmedDoc = String(docNo || "").trim();

  if (!trimmedItem || !trimmedDoc) {
    return {
      status: false,
      message: "Document number and item code are required.",
    };
  }

  // 1. Check in-memory index
  const key = getItemKey(trimmedDoc, trimmedItem);
  let localItem = itemLookupCache.get(key);
  let storageType = "in-memory fast cache";

  // 2. If not in memory, try loading storage for this doc
  if (!localItem) {
    const docItems = await loadScanningDataFromStorage(trimmedDoc);
    if (docItems && Array.isArray(docItems)) {
      const cleanSearch = trimmedItem.toLowerCase();
      localItem = docItems.find((it) => {
        const ids = [
          it?.itemcode,
          it?.barcode,
          it?.item,
          it?.sku,
          it?.item_code,
          (it as any)?.ean,
          (it as any)?.upc,
        ].filter(Boolean);
        return ids.some((code) => String(code || '').trim().toLowerCase() === cleanSearch);
      });
      if (localItem) {
        storageType = "SafeStorage offline cache";
      }
    }
  }

  // 3. If found locally -> Return immediately (0ms, 0 server load!)
  if (localItem) {
    console.log(
      `\n======================================================\n` +
        `📦 [SCAN SOURCE] -> SCANNED FROM LOCAL STORAGE\n` +
        `   Item Code   : ${localItem.itemcode}\n` +
        `   Doc Number  : ${trimmedDoc}\n` +
        `   Department  : ${localItem.department || "N/A"}\n` +
        `   DO Quantity : ${localItem.qty}\n` +
        `   Storage Type: ${storageType}\n` +
        `   Server Hit  : NO (0ms Offline Hit)\n` +
        `======================================================\n`,
    );
    return {
      status: true,
      message: "Item found in local storage",
      source: "local_storage",
      data: {
        item: localItem.itemcode,
        itemcode: localItem.itemcode,
        requested_quantity: Number(localItem.qty || 1),
        department: localItem.department || "",
        document_number: localItem.document_number || trimmedDoc,
        organization_name: "",
      },
    };
  }

  // 4. Not in local cache -> Fallback to remote API
  console.log(
    `\n======================================================\n` +
      `🌐 [SCAN SOURCE] -> ITEM NOT IN LOCAL STORAGE\n` +
      `   Fetching from Remote API: item='${trimmedItem}', doc='${trimmedDoc}'...\n` +
      `======================================================\n`,
  );
  try {
    const remoteRes = await remoteFindItemFallback(trimmedDoc, trimmedItem);
    if (remoteRes && remoteRes.status === true) {
      console.log(
        `\n======================================================\n` +
          `🌐 [SCAN SOURCE] -> SCANNED FROM REMOTE API\n` +
          `   Item Code   : ${trimmedItem}\n` +
          `   Doc Number  : ${trimmedDoc}\n` +
          `   Department  : ${remoteRes.data?.department || "N/A"}\n` +
          `   DO Quantity : ${remoteRes.data?.requested_quantity || 1}\n` +
          `   Server Hit  : YES (Remote Network Call)\n` +
          `======================================================\n`,
      );
      return {
        ...remoteRes,
        source: "remote_api",
      };
    } else {
      console.log(
        `❌ [SCAN SOURCE] -> Item not found on Remote API: ${remoteRes?.message || "Unknown error"}`,
      );
      return remoteRes;
    }
  } catch (err: any) {
    console.error(
      `❌ [SCAN SOURCE] -> Remote API network error:`,
      err?.message,
    );
    return {
      status: false,
      message: err?.message || "Item not found on server.",
    };
  }
}

// ============================================================================
// PUTAWAY LOCAL CACHING ENGINE
// ============================================================================

const putawayDocItemsCache = new Map<string, PutawayGrnItem[]>();
const putawayItemLookupCache = new Map<string, PutawayGrnItem>();

function getGrnKeys(grnNo: string): string[] {
  const clean = String(grnNo || "")
    .trim()
    .toLowerCase();
  const withoutPrefix = clean.replace(/^grn[\s\-_]*/i, "").trim();
  const withHyphen = `grn-${withoutPrefix}`;
  const withSpace = `grn ${withoutPrefix}`;
  const withNone = `grn${withoutPrefix}`;
  return Array.from(new Set([clean, withoutPrefix, withHyphen, withSpace, withNone])).filter(
    Boolean,
  );
}

function getPutawayItemKey(grnNo: string, itemCode: string): string {
  const cleanGrn = String(grnNo || "")
    .trim()
    .toLowerCase()
    .replace(/^grn[\s\-_]*/i, "")
    .trim();
  const cleanItem = String(itemCode || "")
    .trim()
    .toLowerCase();
  return `${cleanGrn}:::${cleanItem}`;
}

/**
 * Save Putaway GRN line items locally into memory and SafeStorage.
 * Handles the response structure:
 * {
 *   "status": true,
 *   "message": "GRN items fetched successfully",
 *   "count": 14,
 *   "data": [
 *     {
 *       "itemCode": "MM00012698",
 *       "department": "HOME CARE",
 *       "orderedQty": 57,
 *       "itemDesc": "DUSTBIN (BI1724)# ...",
 *       "vouch_date": "2026-09-17"
 *     }
 *   ]
 * }
 */
export async function savePutawayDataLocally(
  grnNo: string,
  payload: PutawayGrnPayload,
): Promise<void> {
  const cleanGrn = String(grnNo || "").trim();
  if (!cleanGrn || !payload) return;

  const rawItems = payload.data || payload.items || [];
  if (!Array.isArray(rawItems)) return;

  const keys = getGrnKeys(cleanGrn);
  const normalizedItems: PutawayGrnItem[] = rawItems.map((item) => {
    const rawCode = String(
      item.itemCode || item.itemcode || item.item_code || item.item || "",
    ).trim();
    const rawDesc =
      item.itemDesc ||
      item.itemname ||
      item.item_name ||
      item.item_description ||
      (rawCode ? `SKU-${rawCode}` : "");
    const rawQty =
      item.orderedQty ??
      item.ordered_qty ??
      item.qty ??
      item.requested_quantity ??
      1;
    const numQty = Number(rawQty) || 1;
    const dept = String(item.department || "").trim();
    const vouchDate = String(
      item.vouch_date || payload.vouch_date || "",
    ).trim();

    return {
      ...item,
      grn_number: item.grn_number || cleanGrn,
      itemcode: rawCode,
      itemCode: rawCode,
      itemname: rawDesc,
      itemDesc: rawDesc,
      qty: numQty,
      orderedQty: numQty,
      requested_quantity: numQty,
      department: dept,
      vouch_date: vouchDate,
    };
  });

  // 1. In-memory cache
  keys.forEach((k) => {
    putawayDocItemsCache.set(k, normalizedItems);
  });

  normalizedItems.forEach((item) => {
    const code = item.itemCode || item.itemcode;
    if (code) {
      const lookupKey = getPutawayItemKey(cleanGrn, code);
      putawayItemLookupCache.set(lookupKey, item);

      // Index both lowercase and uppercase variations for instant barcode scanning
      putawayItemLookupCache.set(
        getPutawayItemKey(cleanGrn, code.toLowerCase()),
        item,
      );
      putawayItemLookupCache.set(
        getPutawayItemKey(cleanGrn, code.toUpperCase()),
        item,
      );

      if (item.grn_number && item.grn_number !== cleanGrn) {
        putawayItemLookupCache.set(
          getPutawayItemKey(item.grn_number, code),
          item,
        );
        putawayItemLookupCache.set(
          getPutawayItemKey(item.grn_number, code.toLowerCase()),
          item,
        );
        putawayItemLookupCache.set(
          getPutawayItemKey(item.grn_number, code.toUpperCase()),
          item,
        );
      }
    }
  });

  // 2. Persist to SafeStorage
  try {
    const storageKey = `@wms_putaway_data_${keys[0]}`;
    const dataToSave: PutawayGrnPayload = {
      ...payload,
      status: true,
      count: normalizedItems.length,
      total_items: normalizedItems.length,
      items: normalizedItems,
      data: normalizedItems,
      cached_at: Date.now(),
      grn_number: cleanGrn,
      vouch_date: payload.vouch_date || (normalizedItems[0]?.vouch_date ?? ""),
    };

    await SafeStorage.setItem(storageKey, JSON.stringify(dataToSave));
    console.log(
      `[PutawayCache] Stored ${normalizedItems.length} items locally for GRN '${cleanGrn}' (Key: ${storageKey})`,
    );

    // 3. Update index
    const index = await getCacheIndex();
    const cleanLower = cleanGrn.toLowerCase();
    const filtered = index.filter(
      (e) => e.docNo.trim().toLowerCase() !== cleanLower,
    );
    filtered.unshift({
      docNo: cleanGrn,
      storageKey,
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
      itemCount: normalizedItems.length,
    });
    await saveCacheIndex(filtered);
    await pruneOldScanningCaches();
  } catch (err) {
    console.error("[PutawayCache] SafeStorage save error:", err);
  }
}

/**
 * Convenient wrapper function to save any GRN response payload directly to local storage
 */
export async function saveGrnResponseLocally(
  grnNo: string,
  response: PutawayGrnPayload,
): Promise<boolean> {
  try {
    if (!grnNo || !response) return false;
    await savePutawayDataLocally(grnNo, response);
    return true;
  } catch (err) {
    console.error("[PutawayCache] Error saving GRN response locally:", err);
    return false;
  }
}

/**
 * Load Putaway GRN line items from SafeStorage into in-memory cache
 */
export async function loadPutawayDataFromStorage(
  grnNo: string,
): Promise<PutawayGrnItem[] | null> {
  const cleanGrn = String(grnNo || "").trim();
  if (!cleanGrn) return null;

  const keys = getGrnKeys(cleanGrn);

  // Check in-memory first
  for (const k of keys) {
    if (putawayDocItemsCache.has(k)) {
      return putawayDocItemsCache.get(k) || null;
    }
  }

  // Load from SafeStorage
  for (const k of keys) {
    try {
      const storageKey = `@wms_putaway_data_${k}`;
      const json = await SafeStorage.getItem(storageKey);
      if (json) {
        const parsed: PutawayGrnPayload = JSON.parse(json);
        const rawItems = parsed.data || parsed.items || [];
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const normalizedLoaded: PutawayGrnItem[] = rawItems.map(
            (item: any) => {
              const rawCode = String(
                item.itemCode ||
                  item.itemcode ||
                  item.item_code ||
                  item.item ||
                  "",
              ).trim();
              const rawDesc =
                item.itemDesc ||
                item.itemname ||
                item.item_name ||
                item.item_description ||
                (rawCode ? `SKU-${rawCode}` : "");
              const rawQty =
                item.orderedQty ??
                item.ordered_qty ??
                item.qty ??
                item.requested_quantity ??
                1;
              const numQty = Number(rawQty) || 1;
              return {
                ...item,
                grn_number: item.grn_number || cleanGrn,
                itemcode: rawCode,
                itemCode: rawCode,
                itemname: rawDesc,
                itemDesc: rawDesc,
                qty: numQty,
                orderedQty: numQty,
                requested_quantity: numQty,
                department: String(item.department || "").trim(),
                vouch_date: String(
                  item.vouch_date || parsed.vouch_date || "",
                ).trim(),
              };
            },
          );

          keys.forEach((dk) => putawayDocItemsCache.set(dk, normalizedLoaded));
          normalizedLoaded.forEach((item) => {
            const code = item.itemCode || item.itemcode;
            if (code) {
              putawayItemLookupCache.set(
                getPutawayItemKey(cleanGrn, code),
                item,
              );
              putawayItemLookupCache.set(
                getPutawayItemKey(cleanGrn, code.toLowerCase()),
                item,
              );
              putawayItemLookupCache.set(
                getPutawayItemKey(cleanGrn, code.toUpperCase()),
                item,
              );
            }
          });
          console.log(
            `[PutawayCache] Loaded ${normalizedLoaded.length} items from storage for GRN '${cleanGrn}'`,
          );
          return normalizedLoaded;
        }
      }
    } catch (err) {
      console.error("[PutawayCache] SafeStorage read error:", err);
    }
  }

  return null;
}

/**
 * Fetch pending GRN items from API and save to local storage
 */
export async function fetchAndCachePutawayGrnItems(params: {
  grn_number: string;
  vouch_date?: string;
  department?: string[] | string;
}): Promise<PutawayGrnPayload | null> {
  const grnNo = String(params.grn_number || "").trim();
  if (!grnNo) return null;

  const deptArray = Array.isArray(params.department)
    ? params.department
    : params.department
      ? [String(params.department).trim()]
      : [];

  const postBodyObj = {
    grn_number: grnNo,
    vouch_date: params.vouch_date ? String(params.vouch_date).trim() : "",
    department: deptArray,
  };

  const postBody = JSON.stringify(postBodyObj);
  console.log("==============================================");
  console.log("FETCH PENDING GRN ITEMS REQUEST:", postBody);
  console.log("==============================================");

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  let response: Response | null = null;
  try {
    response = await fetch(PENDING_GRN_ITEMS_API_URL, {
      method: "POST",
      headers,
      body: postBody,
    });
  } catch (err: any) {
    console.log(
      "[PutawayCache] Primary pending_grn_items failed, trying .php...",
      err?.message,
    );
    try {
      response = await fetch(PENDING_GRN_ITEMS_PHP_URL, {
        method: "POST",
        headers,
        body: postBody,
      });
    } catch (err2: any) {
      console.error(
        "[PutawayCache] Both pending_grn_items endpoints failed:",
        err2?.message,
      );
      return null;
    }
  }

  if (!response) return null;

  try {
    const rawText = await response.text();
    console.log(`[PutawayCache] API Response Status: ${response.status}`);
    console.log("==============================================");
    console.log("FETCH PENDING GRN ITEMS RESPONSE:", rawText);
    console.log("==============================================");

    if (!rawText.trim()) {
      console.warn(
        `[PutawayCache] Server returned empty response for GRN ${grnNo}`,
      );
      return null;
    }

    const res: PutawayGrnPayload = JSON.parse(rawText);

    if (res && res.status === true) {
      await savePutawayDataLocally(grnNo, {
        ...res,
        grn_number: grnNo,
        vouch_date: params.vouch_date,
      });
      return res;
    } else {
      console.warn(
        `[PutawayCache] Pending GRN items returned status false:`,
        res?.message,
      );
    }
  } catch (err: any) {
    console.error(
      `[PutawayCache] Error parsing pending_grn_items JSON:`,
      err?.message,
    );
  }

  return null;
}

/**
 * High-level syncing for Putaway GRN Inbound items with progressive callback for UI DataSyncModal
 */
export async function syncPutawayGrnData(
  params: {
    grn_number: string;
    vouch_date?: string;
    department?: string[] | string;
  },
  onProgress?: (progress: number, statusText: string, itemCount?: number) => void
): Promise<{ success: boolean; itemCount: number; message: string }> {
  const grnNo = String(params.grn_number || '').trim();
  if (!grnNo) {
    return { success: false, itemCount: 0, message: 'GRN number missing' };
  }

  onProgress?.(15, 'Connecting to WMS inbound server...');
  await new Promise((r) => setTimeout(r, 120));

  onProgress?.(35, 'Fetching GRN items & quantities...');

  try {
    const deptArray = Array.isArray(params.department)
      ? params.department
      : params.department
      ? [String(params.department).trim()]
      : [];

    const postBodyObj = {
      grn_number: grnNo,
      vouch_date: params.vouch_date ? String(params.vouch_date).trim() : '',
      department: deptArray,
    };

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    let response: Response | null = null;
    try {
      response = await fetch(PENDING_GRN_ITEMS_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(postBodyObj),
      });
    } catch (e1: any) {
      console.log('[PutawayCache] Primary URL retry via PHP...', e1?.message);
      try {
        response = await fetch(PENDING_GRN_ITEMS_PHP_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(postBodyObj),
        });
      } catch (e2: any) {
        console.error('[PutawayCache] Both pending_grn_items failed:', e2?.message);
      }
    }

    onProgress?.(65, 'Receiving GRN items payload...');
    await new Promise((r) => setTimeout(r, 80));

    if (!response || !response.ok) {
      onProgress?.(100, 'Proceeding with offline mode...', 0);
      return { success: false, itemCount: 0, message: 'Server responded with non-200' };
    }

    const rawText = await response.text();
    onProgress?.(80, 'Validating & indexing SKU items...');
    await new Promise((r) => setTimeout(r, 80));

    if (!rawText.trim()) {
      onProgress?.(100, 'No inbound items found. Ready.', 0);
      return { success: false, itemCount: 0, message: 'Empty response' };
    }

    const res: PutawayGrnPayload = JSON.parse(rawText);

    if (res && res.status === true) {
      onProgress?.(92, 'Committing GRN items to local cache...');
      await savePutawayDataLocally(grnNo, {
        ...res,
        grn_number: grnNo,
        vouch_date: params.vouch_date,
      });
      const rawList = res.data || res.items || [];
      const count = res.count ?? rawList.length;
      onProgress?.(100, `Synced ${count} items successfully!`, count);
      return { success: true, itemCount: count, message: 'Sync complete' };
    } else {
      onProgress?.(100, res?.message || 'Ready to scan', 0);
      return { success: false, itemCount: 0, message: res?.message || 'Status false' };
    }
  } catch (err: any) {
    console.error('[PutawayCache] syncPutawayGrnData error:', err);
    onProgress?.(100, 'Proceeding to scan...', 0);
    return { success: false, itemCount: 0, message: err?.message || 'Sync error' };
  }
}

/**
 * Fast 0ms local lookup for Putaway item by GRN and Item Code
 */
export async function findPutawayItemLocalOrRemote(
  grnNo: string,
  itemCode: string,
): Promise<ApiResponse> {
  const trimmedItem = String(itemCode || "").trim();
  const trimmedGrn = String(grnNo || "").trim();

  if (!trimmedItem || !trimmedGrn) {
    return {
      status: false,
      message: "GRN number and item code are required.",
    };
  }

  // 1. Check in-memory index for all key variations
  const grnKeys = getGrnKeys(trimmedGrn);
  let localItem: PutawayGrnItem | undefined;
  let storageType = "in-memory fast cache";

  for (const gk of grnKeys) {
    const key = getPutawayItemKey(gk, trimmedItem);
    localItem = putawayItemLookupCache.get(key);
    if (localItem) break;
  }

  // 2. If not in memory by direct key, search memory doc list
  if (!localItem) {
    const cleanSearch = trimmedItem.toLowerCase();
    for (const gk of grnKeys) {
      const cachedList = putawayDocItemsCache.get(gk);
      if (cachedList && Array.isArray(cachedList)) {
        localItem = cachedList.find((it) => {
          const c1 = String(it.itemCode || it.itemcode || it.item_code || it.item || "").trim().toLowerCase();
          const c2 = String((it as any).barcode || (it as any).barcode1 || (it as any).barcode2 || (it as any).ean || (it as any).sku || "").trim().toLowerCase();
          return c1 === cleanSearch || (c2 && c2 === cleanSearch);
        });
        if (localItem) break;
      }
    }
  }

  // 3. If not in memory, load from SafeStorage
  if (!localItem) {
    const grnItems = await loadPutawayDataFromStorage(trimmedGrn);
    if (grnItems && Array.isArray(grnItems)) {
      const cleanSearch = trimmedItem.toLowerCase();
      localItem = grnItems.find((it) => {
        const c1 = String(it.itemCode || it.itemcode || it.item_code || it.item || "").trim().toLowerCase();
        const c2 = String((it as any).barcode || (it as any).barcode1 || (it as any).barcode2 || (it as any).ean || (it as any).sku || "").trim().toLowerCase();
        return c1 === cleanSearch || (c2 && c2 === cleanSearch);
      });
      if (localItem) {
        storageType = "SafeStorage offline cache";
      }
    }
  }

  // 4. If still not found, check across all cached putaway docs in memory
  if (!localItem) {
    const cleanSearch = trimmedItem.toLowerCase();
    for (const [_, items] of putawayDocItemsCache.entries()) {
      localItem = items.find((it) => {
        const c1 = String(it.itemCode || it.itemcode || it.item_code || it.item || "").trim().toLowerCase();
        const c2 = String((it as any).barcode || (it as any).barcode1 || (it as any).barcode2 || (it as any).ean || (it as any).sku || "").trim().toLowerCase();
        return c1 === cleanSearch || (c2 && c2 === cleanSearch);
      });
      if (localItem) {
        storageType = "Global putaway cache";
        break;
      }
    }
  }

  // 5. If still not found, attempt dynamic remote fetch fallback
  if (!localItem) {
    try {
      console.log(`[PutawayCache] Item '${trimmedItem}' not in local cache for GRN '${trimmedGrn}'. Attempting dynamic remote fetch...`);
      const fetched = await fetchAndCachePutawayGrnItems({ grn_number: trimmedGrn });
      if (fetched && fetched.status === true) {
        const rawList = fetched.data || fetched.items || [];
        const cleanSearch = trimmedItem.toLowerCase();
        localItem = rawList.find((it: any) => {
          const c1 = String(it.itemCode || it.itemcode || it.item_code || it.item || "").trim().toLowerCase();
          const c2 = String(it.barcode || it.barcode1 || it.barcode2 || it.ean || it.sku || "").trim().toLowerCase();
          return c1 === cleanSearch || (c2 && c2 === cleanSearch);
        });
        if (localItem) {
          storageType = "Remote API dynamic fetch";
        }
      }
    } catch (e: any) {
      console.log('[PutawayCache] Dynamic fallback fetch error:', e?.message);
    }
  }

  // 6. If found -> Return hit!
  if (localItem) {
    const code = localItem.itemCode || localItem.itemcode || trimmedItem;
    const desc =
      localItem.itemDesc ||
      localItem.itemname ||
      localItem.item_name ||
      `SKU-${code}`;
    const reqQty = Number(
      localItem.orderedQty ??
        localItem.requested_quantity ??
        localItem.qty ??
        1,
    );
    const dept = localItem.department || "";
    const vouchDate = localItem.vouch_date || "";

    console.log(
      `\n======================================================\n` +
        `📦 [PUTAWAY SCAN SOURCE] -> SCANNED ITEM RESOLVED\n` +
        `   Item Code   : ${code}\n` +
        `   Item Desc   : ${desc}\n` +
        `   GRN Number  : ${trimmedGrn}\n` +
        `   Department  : ${dept || "N/A"}\n` +
        `   Ordered Qty : ${reqQty}\n` +
        `   Vouch Date  : ${vouchDate || "N/A"}\n` +
        `   Storage Type: ${storageType}\n` +
        `======================================================\n`,
    );

    return {
      status: true,
      message: "Putaway item found",
      source: "local_storage",
      data: {
        item: code,
        itemcode: code,
        itemCode: code,
        itemname: desc,
        itemDesc: desc,
        orderedQty: reqQty,
        requested_quantity: reqQty,
        department: dept,
        vouch_date: vouchDate,
        grn_number: localItem.grn_number || trimmedGrn,
      },
    };
  }

  // 7. Not in local cache -> Fallback
  console.log(
    `\n======================================================\n` +
      `🌐 [PUTAWAY SCAN SOURCE] -> ITEM NOT FOUND\n` +
      `   Item Code: ${trimmedItem}, GRN: ${trimmedGrn}\n` +
      `======================================================\n`,
  );

  return {
    status: false,
    message: `Item '${trimmedItem}' not found in GRN ${trimmedGrn}. Please scan a valid item.`,
    data: {
      item: trimmedItem,
      itemcode: trimmedItem,
      itemCode: trimmedItem,
      itemname: `SKU-${trimmedItem}`,
      itemDesc: `SKU-${trimmedItem}`,
      orderedQty: 1,
      requested_quantity: 1,
      department: "",
      vouch_date: "",
      grn_number: trimmedGrn,
    },
  };
}

export interface InProgressScanData {
  documentNumber: string;
  items: any[];
  currentBox?: number;
  lastUpdated: number;
}

/**
 * Save in-progress scanned items locally for a document
 */
export async function saveInProgressScannedItems(
  docNo: string,
  items: any[],
  currentBox?: number
): Promise<void> {
  if (!docNo) return;
  try {
    const clean = String(docNo).trim().toLowerCase();
    const key = `@wms_in_progress_scan_${clean}`;
    const payload: InProgressScanData = {
      documentNumber: docNo,
      items,
      currentBox: currentBox || 1,
      lastUpdated: Date.now(),
    };
    await SafeStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error("Save in-progress scanned items error:", err);
  }
}

/**
 * Load in-progress scanned items locally for a document
 */
export async function loadInProgressScannedItems(
  docNo: string
): Promise<InProgressScanData | null> {
  if (!docNo) return null;
  try {
    const clean = String(docNo).trim().toLowerCase();
    const key = `@wms_in_progress_scan_${clean}`;
    const raw = await SafeStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch (err) {
    console.error("Load in-progress scanned items error:", err);
  }
  return null;
}

/**
 * Clear in-progress scanned items after successful final submit
 */
export async function clearInProgressScannedItems(
  docNo: string
): Promise<void> {
  if (!docNo) return;
  try {
    const clean = String(docNo).trim().toLowerCase();
    const key = `@wms_in_progress_scan_${clean}`;
    await SafeStorage.removeItem(key);
  } catch (err) {
    console.error("Clear in-progress scanned items error:", err);
  }
}
