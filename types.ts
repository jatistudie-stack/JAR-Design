export type DesignType = 'Social Media' | 'Banner' | 'Menu' | 'Packaging' | 'Flyer' | 'Other';

export type RequestStatus = 'Pending' | 'In Progress' | 'Done';

export interface DesignRequest {
  id: string;
  outletName: string;
  designType: DesignType;
  dimensions: string;
  elements: string;
  referenceUrl: string;
  status: RequestStatus;
  createdAt: string; // ISO String
  resultFileName?: string;
  resultFileUrl?: string;
  designerName?: string;
}

export type ViewState = 'LOGIN' | 'DASHBOARD';
export type DashboardTab = 'STATUS' | 'NEW_REQUEST' | 'USERS' | 'HISTORY';
export type UserRole = 'Admin' | 'Designer' | 'User';

export interface User {
  username: string;
  password?: string; // Optional for display, required for DB
  role: UserRole;
  name: string;
}