import type { Timestamp } from "firebase/firestore"

export interface AuthorizedUser {
  userId: string
  name: string
  role: string
  phone: string
  activationToken: string | null
  isActivated: boolean
  boundDeviceId: string | null
  boundDeviceModel: string | null
  allowedDeviceIds?: string[]
  boundAt: Timestamp | Date | null
  lastAccessAt: Timestamp | Date | null
  notes?: string
}

export interface DevicePairingRequest {
  requestId: string
  userId: string
  userName?: string
  phone?: string
  newDeviceId: string
  newDeviceModel: string
  otpCode: string // 6 digits
  expiresAt: Timestamp | Date
  status: "pending" | "approved" | "rejected" | "expired"
  createdAt: Timestamp | Date
  approvedAt?: Timestamp | Date | null
}

export interface SecurityAlert {
  id?: string
  userId: string
  userName?: string
  attemptedDeviceId: string
  boundDeviceId?: string
  ip: string
  userAgent: string
  reason: string
  timestamp: Timestamp | Date
}

export interface DeviceSession {
  userId: string
  name: string
  role: string
  phone: string
  deviceId: string
  deviceModel: string
  isActivated: boolean
}
