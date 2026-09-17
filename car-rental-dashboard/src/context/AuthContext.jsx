import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { auth, toEmail, isConfigured } from '../firebase/firebaseConfig'

const AuthContext = createContext(null)

const MESSAGES = {
  'auth/invalid-credential': 'That username and password don’t match. If you created this user in Firebase Console, verify its password is set to admin123.',
  'auth/wrong-password': 'That username and password don’t match. Make sure the password in Firebase Console is admin123.',
  'auth/user-not-found': 'No admin account with that username.',
  'auth/invalid-email': 'That username or email isn’t valid.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/network-request-failed': 'No connection to Firebase. Check your network.',
  'auth/user-disabled': 'This account has been disabled in Firebase Console.',
  'auth/operation-not-allowed': 'Email/Password provider is not enabled in Firebase Console. Please go to Authentication > Sign-in method and enable Email/Password.',
}

const LOCAL_ADMIN = {
  uid: 'admin-local',
  email: 'admin@fleetline.local',
  displayName: 'Admin',
}

const STORAGE_KEY = 'fleetline_auth_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    // Hydrate saved user if not the legacy mock admin
    const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.uid === 'admin-local') {
          localStorage.removeItem(STORAGE_KEY)
          sessionStorage.removeItem(STORAGE_KEY)
          setUser(null)
        } else {
          setUser(parsed)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }

    // Always register onAuthStateChanged to sync with real Firebase Auth
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
  }, [])

  const login = async (username, password, remember = true) => {
    if (!remember) {
      await setPersistence(auth, browserSessionPersistence)
    } else {
      await setPersistence(auth, browserLocalPersistence)
    }

    const email = toEmail(username)
    let u = null

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      u = cred.user
    } catch (err) {
      // If user does not exist in Firebase Authentication yet, automatically create it
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, email, password)
          u = newCred.user
        } catch {
          throw err
        }
      } else {
        throw err
      }
    }

    if (u) {
      const minUser = {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || u.email?.split('@')[0],
      }
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(STORAGE_KEY, JSON.stringify(minUser))
      setUser(u)
    }
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
    MESSAGES[e?.code] || 'Sign-in failed. Check your Firebase setup and try again.'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, errorMessage }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
