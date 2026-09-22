import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
  signOut,
} from "firebase/auth"
import firebaseConfig from "../firebase-applet-config.json"

export const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
]

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)

const provider = new GoogleAuthProvider()
SCOPES.forEach((scope) => provider.addScope(scope))

// Memory-only cache for OAuth access token (per security requirements)
let cachedAccessToken: string | null = null
let isSigningIn = false

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken)
      } else if (!isSigningIn) {
        cachedAccessToken = null
        if (onAuthFailure) onAuthFailure()
      }
    } else {
      cachedAccessToken = null
      if (onAuthFailure) onAuthFailure()
    }
  })
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true
    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google access token with Sheets permissions")
    }

    cachedAccessToken = credential.accessToken
    return { user: result.user, accessToken: cachedAccessToken }
  } catch (error) {
    console.error("Google sign in error:", error)
    throw error
  } finally {
    isSigningIn = false
  }
}

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken
}

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token
}

export const logout = async () => {
  await signOut(auth)
  cachedAccessToken = null
}

if (typeof window !== "undefined") {
  ;(window as unknown as { googleSignIn?: typeof googleSignIn; getGoogleAccessToken?: typeof getAccessToken }).googleSignIn = googleSignIn
  ;(window as unknown as { googleSignIn?: typeof googleSignIn; getGoogleAccessToken?: typeof getAccessToken }).getGoogleAccessToken = getAccessToken
}
