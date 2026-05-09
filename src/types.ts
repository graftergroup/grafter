import type { UUID } from "crypto";

export type ApiStatus = "checking" | "connected" | "error";

export interface HealthResponse {
  ok: boolean;
  version: string;
}

// Auth Types
export interface User {
  id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: "admin" | "franchise_manager" | "technician" | "customer";
  franchise_id: UUID;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface APIKey {
  id: UUID;
  key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

// Customer Types
export interface Customer {
  id: UUID;
  franchise_id: UUID;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Service Types
export interface Service {
  id: UUID;
  franchise_id: UUID;
  name: string;
  description?: string;
  base_price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Booking Types
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: UUID;
  franchise_id: UUID;
  customer_id: UUID;
  service_id: UUID;
  scheduled_date: string;
  status: BookingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Job Types
export type JobStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";

export interface Job {
  id: UUID;
  franchise_id: UUID;
  booking_id?: UUID;
  assigned_technician_id?: UUID;
  vehicle_id?: UUID;
  scheduled_date: string;
  status: JobStatus;
  completed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Vehicle Types
export interface Vehicle {
  id: UUID;
  franchise_id: UUID;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
