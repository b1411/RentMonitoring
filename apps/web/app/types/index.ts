export type RoomStatus = 'FREE' | 'BOOKED' | 'OCCUPIED' | 'OVERDUE' | 'REPAIR';
export type InvoiceStatus = 'UNPAID' | 'PAID' | 'CANCELLED';
export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Point {
  x: number;
  y: number;
}

/** Door = a wall opening drawn as a segment a→b (fractions 0..1). */
export interface Door {
  a: Point;
  b: Point;
}

export interface Tenant {
  id: string;
  companyName: string;
  email: string;
  phone: string;
}

export interface Invoice {
  id: string;
  contractId: string;
  amount: string;
  dueDate: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface Contract {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  tenant?: Tenant;
  invoices?: Invoice[];
}

export interface Room {
  id: string;
  floorId: string;
  roomNumber: string;
  area: number;
  basePrice: string;
  polygonCoordinates: Point[];
  door?: Door | null;
  currentStatus: RoomStatus;
  contracts?: Contract[];
  floor?: Floor;
}

export interface Floor {
  id: string;
  buildingId: string;
  floorNumber: number;
  planImageUrl: string;
  building?: Building;
  rooms?: Room[];
  _count?: { rooms: number };
}

export interface Building {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  floors?: Floor[];
  _count?: { floors: number };
}

export interface CreateRoomPayload {
  floorId: string;
  roomNumber: string;
  area: number;
  basePrice: number;
  coordinates: Point[];
}
