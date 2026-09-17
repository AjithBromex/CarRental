import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { auth, toEmail, isConfigured } from '../firebase/firebaseConfig'

const AuthContext = createContext(null)

const MESSAGES = {
  'auth/invalid-credential': 'That email/username and password don’t match. Please check your credentials in Firebase Console.',
  'auth/wrong-password': 'That username and password don’t match.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/invalid-email': 'That username or email isn’t valid.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/network-request-failed': 'No connection to Firebase. Check your network.',
  'auth/user-disabled': 'This account has been disabled in Firebase Console.',
}

const STORAGE_KEY = 'fleetline_auth_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Clear any legacy mock sessions from storage
    const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.uid === 'admin-local') {
          localStorage.removeItem(STORAGE_KEY)
          sessionStorage.removeItem(STORAGE_KEY)
        } else {
          setUser(parsed)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }

    // 2. Listen to real Firebase Authentication state
    if (isConfigured) {
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          const minUser = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.email?.split('@')[0],
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minUser))
          setUser(u)
        } else {
          localStorage.removeItem(STORAGE_KEY)
          sessionStorage.removeItem(STORAGE_KEY)
          setUser(null)
        }
        setLoading(false)
      })

      return () => unsub()
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password, remember = true) => {
    if (!remember) {
      await setPersistence(auth, browserSessionPersistence)
    } else {
      await setPersistence(auth, browserLocalPersistence)
    }

    const email = toEmail(username)
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const u = cred.user
    const minUser = {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || u.email?.split('@')[0],
    }
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEY, JSON.stringify(minUser))
    setUser(u)
    return cred
  }

  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
    try {
      await signOut(auth)
    } catch {
      // ignore
    }
  }

  const errorMessage = (e) =>
    MESSAGES[e?.code] || e?.message || 'Sign-in failed. Check your Firebase setup and try again.'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, errorMessage }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
