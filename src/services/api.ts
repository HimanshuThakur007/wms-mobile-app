import { DocumentType, Registration, ScanItem, ScanSummary } from "../types";
import {
  fetchAndCacheScanningData,
  findItemLocalOrRemote,
  fetchAndCachePutawayGrnItems,
  loadPutawayDataFromStorage,
  savePutawayDataLocally,
  saveGrnResponseLocally,
  syncPutawayGrnData,
  findPutawayItemLocalOrRemote,
} from "./localScanningCache";

export {
  fetchAndCacheScanningData,
  fetchAndCachePutawayGrnItems,
  loadPutawayDataFromStorage,
  savePutawayDataLocally,
  saveGrnResponseLocally,
  syncPutawayGrnData,
  findPutawayItemLocalOrRemote,
  saveInProgressScannedItems,
  loadInProgressScannedItems,
  clearInProgressScannedItems,
} from "./localScanningCache";

export const LOGIN_API_URL = "https://market99.tech/tmp/ynex/wms_api/login.php";
export const WMS_API_URL = "https://market99.tech/tmp/ynex/wms_api/wms_api.php";
export const PUTAWAY_USER_API_URL =
  "https://market99.tech/tmp/ynex/wms_api/putaway_user";
export const PUTAWAY_USER_PHP_URL =
  "https://market99.tech/tmp/ynex/wms_api/putaway_user.php";
export const BIN_MASTER_API_URL =
  "https://market99.tech/tmp/ynex/wms_api/get_bin_master";
export const BIN_MASTER_PHP_URL =
  "https://market99.tech/tmp/ynex/wms_api/get_bin_master.php";
export const SUBMIT_GRN_PHP_URL =
  "https://market99.tech/tmp/ynex/wms_api/submit_grn.php";
export const SAVE_GRN_PHP_URL =
  "https://market99.tech/tmp/ynex/wms_api/save_grn.php";

export type { PutawayGrnItem, PutawayGrnPayload } from "./localScanningCache";

export interface PutawayUserAssignment {
  grn_number: string;
  department: string;
  user_id: number | string;
  status: string;
  bill_no: string;
  bill_date: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  status: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Safe JSON parser with full error diagnostics
 */
async function parseApiResponse(
  response: Response,
  apiName: string,
): Promise<any> {
  const rawText = await response.text();
  console.log(`========== API [${apiName}] ==========`);
  console.log("HTTP STATUS:", response.status);

  if (!rawText.trim()) {
    throw new Error(
      `${apiName}: Server returned empty response (HTTP ${response.status})`,
    );
  }

  try {
    return JSON.parse(rawText);
  } catch (err) {
    console.error(`${apiName} JSON parse error:`, rawText);
    throw new Error(`${apiName}: Server returned invalid JSON format`);
  }
}

/**
 * Normalize Document from API response
 */
export function normalizeDocument(item: any): DocumentType {
  return {
    id: Number(item?.id || 0),
    document_number: String(
      item?.document_number || item?.document_no || item?.documentNumber || "",
    ),
    organization_code: String(
      item?.organization_code || item?.organizationCode || "",
    ),
    organization_name: String(
      item?.organization_name ||
        item?.organizationName ||
        item?.organization ||
        "",
    ),
    batch_id: String(item?.batch_id || ""),
    shipment_number: String(item?.shipment_number || ""),
    document_type: String(item?.document_type || ""),
    status: String(item?.status || "Active"),
    created_at: String(item?.created_at || ""),
    departments: Array.isArray(item?.departments)
      ? item.departments.map((d: any) => String(d))
      : [],
  };
}

/**
 * Normalize Registration from API response
 */
export function normalizeRegistration(item: any): Registration {
  return {
    id: Number(item?.id || 0),
    document_id: Number(item?.document_id || item?.documentId || 0),
    document_number: String(item?.document_number || item?.document_no || ""),
    department: String(item?.department || ""),
    registered_at: String(item?.registered_at || item?.created_at || ""),
    status: String(item?.status || "Registered"),
  };
}

/**
 * Login API
 */
export async function loginUser(
  email: string,
  pass: string,
): Promise<ApiResponse> {
  const response = await fetch(LOGIN_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password: pass,
    }),
  });

  return parseApiResponse(response, "LOGIN");
}

/**
 * Fetch all available documents
 */
export async function getDocuments(): Promise<DocumentType[]> {
  const response = await fetch(`${WMS_API_URL}?action=get_documents`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  const res = await parseApiResponse(response, "GET DOCUMENTS");
  if (res?.status === true && Array.isArray(res?.data)) {
    return res.data.map(normalizeDocument);
  }
  return [];
}

/**
 * Fetch registrations for a specific user ID
 */
export async function getUserRegistrations(
  userId: number | string,
): Promise<Registration[]> {
  const response = await fetch(
    `${WMS_API_URL}?action=get_user_registrations&user_id=${encodeURIComponent(String(userId))}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    },
  );

  const res = await parseApiResponse(response, "GET USER REGISTRATIONS");
  if (res?.status === true && Array.isArray(res?.data)) {
    return res.data.map(normalizeRegistration);
  }
  return [];
}

/**
 * Register document with selected departments for user
 */
export async function registerDocument(params: {
  documentId?: number;
  documentNumber?: string;
  docNo?: string;
  organizationName?: string;
  departments: string[];
  userId: number;
  userName?: string;
}): Promise<ApiResponse> {
  const docNumber = params.documentNumber || params.docNo || "";
  const docId = Number(params.documentId || 0);
  const uId = Number(params.userId || 1);

  const requestBody = {
    document_id: docId,
    document_number: docNumber,
    departments: params.departments,
    user_id: uId,
  };

  console.log("==============================================");
  console.log("REGISTER API REQUEST:", JSON.stringify(requestBody, null, 2));
  console.log("==============================================");

  const response = await fetch(`${WMS_API_URL}?action=register`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const res = await parseApiResponse(response, "REGISTER");
  console.log("==============================================");
  console.log("REGISTER API RESPONSE:", JSON.stringify(res, null, 2));
  console.log("==============================================");

  if (res?.status === true && docNumber) {
    // Background fetch & cache picklist items for this document
    fetchAndCacheScanningData(docNumber).catch((err) => {
      console.log("Background caching error:", err);
    });
  }

  return res;
}

/**
 * Fetch all scanned items for a document and user
 */
export async function getAllScanningData(
  userId: number | string,
  docNo: string,
): Promise<ScanItem[]> {
  const url = `${WMS_API_URL}?action=get_all_scanning_data&user_id=${encodeURIComponent(
    String(userId),
  )}&doc_no=${encodeURIComponent(docNo)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  const res = await parseApiResponse(response, "GET ALL SCANNING DATA");
  if (res?.status === true && Array.isArray(res?.data)) {
    return res.data;
  }
  return [];
}

/**
 * Fetch scan summary statistics for a document and user
 */
export async function getScanSummary(
  userId: number | string,
  docNo: string,
): Promise<ScanSummary> {
  const url = `${WMS_API_URL}?action=scan_summary&user_id=${encodeURIComponent(
    String(userId),
  )}&doc_no=${encodeURIComponent(docNo)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  const res = await parseApiResponse(response, "SCAN SUMMARY");
  if (res?.status === true && res?.data) {
    const d = res.data;
    return {
      total_items: Number(d.total_items || 0),
      scanned_items: Number(d.scanned_items || 0),
      pending_items: Number(d.pending_items || 0),
      revised_items: Number(d.revised_items || 0),
      cancelled_items: Number(d.cancelled_items || 0),
      requested_qty: Number(d.requested_qty || 0),
      packed_qty: Number(d.packed_qty || 0),
    };
  }

  return {
    total_items: 0,
    scanned_items: 0,
    pending_items: 0,
    revised_items: 0,
    cancelled_items: 0,
    requested_qty: 0,
    packed_qty: 0,
  };
}

/**
 * Lookup item details directly from remote server
 */
export async function findItemRemote(
  docNo: string,
  itemCode: string,
): Promise<ApiResponse> {
  const url = `${WMS_API_URL}?action=find_item&doc_no=${encodeURIComponent(
    docNo,
  )}&itemcode=${encodeURIComponent(itemCode.trim())}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  return parseApiResponse(response, "FIND ITEM REMOTE");
}

/**
 * Lookup item details: Searches locally first. If not found locally, falls back to remote API.
 */
export async function findItem(
  docNo: string,
  itemCode: string,
): Promise<ApiResponse> {
  return findItemLocalOrRemote(docNo, itemCode, findItemRemote);
}

/**
 * Save scanned item (with support for duplicate detection & force insert)
 */
export async function saveScan(params: {
  userId: number;
  docNo: string;
  organizationName: string;
  itemCode: string;
  requestedQty: number;
  packedQty: number;
  department: string;
  boxNo: string;
  forceInsert?: boolean;
}): Promise<ApiResponse> {
  const body = {
    userid: params.userId,
    doc_no: params.docNo,
    organization_name: params.organizationName,
    itemcode: params.itemCode,
    requested_quantity: params.requestedQty,
    packedqty: params.packedQty,
    department: params.department,
    box_no: params.boxNo,
    ...(params.forceInsert ? { force_insert: true } : {}),
  };

  const response = await fetch(`${WMS_API_URL}?action=save_scan`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse(response, "SAVE SCAN");
}

/**
 * Cancel a scanned item with remarks
 */
export async function cancelScan(
  id: number,
  remarks: string,
): Promise<ApiResponse> {
  const response = await fetch(`${WMS_API_URL}?action=cancel_scan`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      remarks: remarks.trim(),
    }),
  });

  return parseApiResponse(response, "CANCEL SCAN");
}

/**
 * Update packed quantity for an existing scanned item
 */
export async function updatePackedQty(
  id: number,
  packedQty: number,
): Promise<ApiResponse> {
  const response = await fetch(`${WMS_API_URL}?action=update_packed_qty`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      packedqty: packedQty,
    }),
  });

  return parseApiResponse(response, "UPDATE PACKED QTY");
}

/**
 * Submit packing list for a document and its departments
 */
export async function submitScan(
  docNo: string,
  departments: string[],
): Promise<ApiResponse> {
  const body = {
    doc_no: docNo,
    departments: departments,
  };

  console.log("==============================================");
  console.log("SUBMIT SCAN API REQUEST:", JSON.stringify(body, null, 2));
  console.log("==============================================");

  const response = await fetch(`${WMS_API_URL}?action=submit_scan`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const res = await parseApiResponse(response, "SUBMIT SCAN");
  console.log("==============================================");
  console.log("SUBMIT SCAN API RESPONSE:", JSON.stringify(res, null, 2));
  console.log("==============================================");

  return res;
}

/**
 * Fetch GRN assignments for putaway by user_id
 */
export async function getPutawayUserAssignments(
  userId: number | string,
): Promise<ApiResponse<PutawayUserAssignment[]>> {
  const numericUserId = Number(userId) || userId;
  const postBody = JSON.stringify({ user_id: numericUserId });

  console.log("==============================================");
  console.log("PUTAWAY USER API REQUEST:", postBody);
  console.log("==============================================");

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  let response: Response | null = null;
  try {
    response = await fetch(PUTAWAY_USER_API_URL, {
      method: "POST",
      headers,
      body: postBody,
    });
  } catch (err: any) {
    console.log(
      "Primary putaway_user endpoint failed, trying .php...",
      err?.message,
    );
    try {
      response = await fetch(PUTAWAY_USER_PHP_URL, {
        method: "POST",
        headers,
        body: postBody,
      });
    } catch (err2: any) {
      console.error("Both putaway_user endpoints failed:", err2?.message);
      return {
        status: false,
        message:
          err2?.message || "Failed to connect to putaway assignments endpoint",
        data: [],
      };
    }
  }

  if (!response) {
    return {
      status: false,
      message: "No response from putaway assignments endpoint",
      data: [],
    };
  }

  const res = await parseApiResponse(response, "PUTAWAY USER ASSIGNMENTS");
  console.log("==============================================");
  console.log("PUTAWAY USER API RESPONSE:", JSON.stringify(res, null, 2));
  console.log("==============================================");

  return res;
}

/**
 * Validate bin location against bin master API
 */
export async function validateBinMaster(
  binNumber: string,
): Promise<ApiResponse> {
  const cleanBin = String(binNumber || "").trim();
  const postBody = JSON.stringify({ bin_number: cleanBin });

  console.log("==============================================");
  console.log("VALIDATE BIN MASTER REQUEST:", postBody);
  console.log("==============================================");

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  let response: Response | null = null;
  try {
    response = await fetch(BIN_MASTER_API_URL, {
      method: "POST",
      headers,
      body: postBody,
    });
  } catch (err: any) {
    console.log(
      "Primary get_bin_master endpoint failed, trying .php...",
      err?.message,
    );
    try {
      response = await fetch(BIN_MASTER_PHP_URL, {
        method: "POST",
        headers,
        body: postBody,
      });
    } catch (err2: any) {
      console.error("Both get_bin_master endpoints failed:", err2?.message);
      return {
        status: false,
        message: err2?.message || "Failed to connect to bin validation server",
      };
    }
  }

  if (!response) {
    return {
      status: false,
      message: "No response from bin validation server",
    };
  }

  const res = await parseApiResponse(response, "VALIDATE BIN MASTER");
  console.log("==============================================");
  console.log("VALIDATE BIN MASTER RESPONSE:", JSON.stringify(res, null, 2));
  console.log("==============================================");

  return res;
}

/**
 * Submit GRN Putaway API
 * Endpoint: https://market99.tech/tmp/ynex/wms_api/submit_grn.php
 * Request Body:
 * {
 *   "grn": "GRN-3218",
 *   "department": ["HEALTH & BEAUTY", "STATIONERY"],
 *   "vouchdate": "2026-08-07"
 * }
 */
export async function submitGrn(params: {
  grn: string;
  department: string[];
  vouchdate: string;
}): Promise<ApiResponse> {
  const cleanGrn = String(params.grn || "").trim();
  const deptArray = Array.isArray(params.department)
    ? params.department.map((d) => String(d).trim()).filter(Boolean)
    : typeof params.department === "string"
      ? [String(params.department).trim()]
      : [];
  const cleanVouchDate = String(params.vouchdate || "").trim();

  const body = {
    grn: cleanGrn,
    department: deptArray,
    vouchdate: cleanVouchDate,
  };

  console.log("==============================================");
  console.log("SUBMIT GRN API REQUEST:", JSON.stringify(body, null, 2));
  console.log("==============================================");

  const response = await fetch(SUBMIT_GRN_PHP_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const res = await parseApiResponse(response, "SUBMIT GRN");
  console.log("==============================================");
  console.log("SUBMIT GRN API RESPONSE:", JSON.stringify(res, null, 2));
  console.log("==============================================");

  return res;
}

/**
 * Save GRN Putaway Item API
 * Endpoint: https://market99.tech/tmp/ynex/wms_api/save_grn.php
 * Request Body:
 * {
 *   "grn": "GRN-3218",
 *   "department": ["HEALTH & BEAUTY", "STATIONERY"],
 *   "vouchdate": "2026-08-07",
 *   "bin_code": "G1",
 *   "item_code": "MM00014214",
 *   "qty": 10,
 *   "userid": "6000"
 * }
 */
export async function saveGrn(params: {
  grn: string;
  department: string[];
  vouchdate: string;
  bin_code: string;
  item_code: string;
  qty: number;
  userid: string | number;
}): Promise<ApiResponse> {
  const cleanGrn = String(params.grn || "").trim();
  const deptArray = Array.isArray(params.department)
    ? params.department.map((d) => String(d).trim()).filter(Boolean)
    : typeof params.department === "string"
    ? [String(params.department).trim()]
    : [];
  const cleanVouchDate = String(params.vouchdate || "").trim();
  const cleanBinCode = String(params.bin_code || "").trim();
  const cleanItemCode = String(params.item_code || "").trim();
  const numQty = Number(params.qty) || 0;
  const userIdStr = String(params.userid ?? "6000").trim();

  const body = {
    grn: cleanGrn,
    department: deptArray,
    vouchdate: cleanVouchDate,
    bin_code: cleanBinCode,
    item_code: cleanItemCode,
    qty: numQty,
    userid: userIdStr,
  };

  console.log("==============================================");
  console.log("SAVE GRN API REQUEST:", JSON.stringify(body, null, 2));
  console.log("==============================================");

  const response = await fetch(SAVE_GRN_PHP_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const res = await parseApiResponse(response, "SAVE GRN");
  console.log("==============================================");
  console.log("SAVE GRN API RESPONSE:", JSON.stringify(res, null, 2));
  console.log("==============================================");

  return res;
}
