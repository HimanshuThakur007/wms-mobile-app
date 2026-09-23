export interface User {
  id: string | number;
  name: string;
  username?: string;
  email: string;
  role?: string;
  facility?: string;
  userGroup?: string | number;
  userContact?: string;
  avatarUrl?: string;
  token?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface DocumentType {
  id: number;
  document_number: string;
  doc_no?: string;
  organization_code: string;
  organization_name: string;
  batch_id: string;
  shipment_number: string;
  document_type: string;
  status: string;
  created_at: string;
  departments: string[] | string;
}

export interface Registration {
  id: number;
  document_id: number;
  document_number: string;
  doc_no?: string;
  organization_name?: string;
  department: string;
  registered_at: string;
  status: string;
}

export interface ScanDocument {
  document_id: number;
  document_number: string;
  organization_name: string;
  departments: string[];
  status: string;
}

export interface ScanItem {
  id: number;
  userid: number;
  doc_no: string;
  organization_name: string;
  itemcode: string;
  requested_quantity: number;
  packedqty: number;
  department: string;
  box_no: string;
  remarks: string;
  itemstatus: string;
  scanned_on: string;
  inv_status: string;
  submitted_on: string | null;
}

export interface ScanSummary {
  total_items: number;
  scanned_items: number;
  pending_items: number;
  revised_items: number;
  cancelled_items: number;
  requested_qty: number;
  packed_qty: number;
}

export interface DuplicateEntry {
  id: number;
  doc_no: string;
  itemcode: string;
  box_no: string;
  packedqty: number;
  requested_quantity: number;
  department: string;
  itemstatus: string;
  scanned_on: string;
  username: string;
}

export interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  badge?: string;
  color?: string;
  lightColor?: string;
  bgLight?: string;
  screen?: string;
}

export interface StatItem {
  id: string;
  title?: string;
  label?: string;
  value: string | number;
  change: string;
  trend?: 'up' | 'down' | 'neutral';
  isPositive?: boolean;
  icon?: string;
  iconName?: string;
  iconColor?: string;
  bgColor?: string;
}

export type ActivityStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'ALERT' | 'PROCESSING' | 'IN_TRANSIT';

export interface ActivityRecord {
  id: string;
  title: string;
  code: string;
  timestamp: string;
  type: string;
  status: ActivityStatus;
  itemsCount: number;
  location: string;
  operator: string;
}
