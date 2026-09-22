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
  boundAt: Timestamp | Date | null
  lastAccessAt: Timestamp | Date | null
  notes?: string
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
