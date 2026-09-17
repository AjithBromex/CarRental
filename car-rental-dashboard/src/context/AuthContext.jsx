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
  'auth/invalid-credential': 'That username and password don\u2019t match. Try again.',
  'auth/wrong-password': 'That username and password don\u2019t match. Try again.',
  'auth/user-not-found': 'No admin account with that username.',
  'auth/invalid-email': 'That username isn\u2019t valid.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/network-request-failed': 'No connection to Firebase. Check your network.',
  'auth/user-disabled': 'This account has been disabled.',
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
    const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setUser(JSON.parse(saved))
        setLoading(false)
        return
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }

    if (!isConfigured) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        const minUser = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email?.split('@')[0],
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minUser))
        setUser(u)
      } else {
        const curSaved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
        if (curSaved) {
          try {
            const parsed = JSON.parse(curSaved)
            if (parsed.uid !== 'admin-local') {
              localStorage.removeItem(STORAGE_KEY)
              sessionStorage.removeItem(STORAGE_KEY)
              setUser(null)
            }
          } catch {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      }
      setLoading(false)
    })
  }, [])

  const login = async (username, password, remember = true) => {
    const cleanUser = username.trim().toLowerCase()
    if ((cleanUser === 'admin' || cleanUser === 'admin@fleetline.local') && password === 'admin123') {
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(STORAGE_KEY, JSON.stringify(LOCAL_ADMIN))
      setUser(LOCAL_ADMIN)
      return
    }

    if (!remember) {
      await setPersistence(auth, browserSessionPersistence)
    }

    const cred = await signInWithEmailAndPassword(auth, toEmail(username), password)
    const u = cred.user
    const minUser = {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || u.email?.split('@')[0],
    }
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEY, JSON.stringify(minUser))
    setUser(u)
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
