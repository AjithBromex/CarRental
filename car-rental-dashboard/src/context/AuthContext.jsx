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

const LOCAL_ADMIN = {
  uid: 'YUadCTU9tVhXttsE9rq1AcHvE492',
  email: 'admin@fleetline.local',
  displayName: 'Admin',
}

const STORAGE_KEY = 'fleetline_auth_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Immediately hydrate saved user from local/session storage
    const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.uid === 'admin-local') {
          parsed.uid = LOCAL_ADMIN.uid
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        }
        setUser(parsed)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }

    // 2. Sync with Firebase Authentication if available
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
        }
        setLoading(false)
      })

      const safetyTimer = setTimeout(() => setLoading(false), 300)
      return () => {
        clearTimeout(safetyTimer)
        unsub()
      }
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password, remember = true) => {
    const cleanUser = username.trim().toLowerCase()
    const isAdmin = (cleanUser === 'admin' || cleanUser === 'admin@fleetline.local') && password === 'admin123'
    const storage = remember ? localStorage : sessionStorage

    // Attempt Firebase Authentication in the background
    if (isConfigured) {
      try {
        if (!remember) {
          await setPersistence(auth, browserSessionPersistence)
        } else {
          await setPersistence(auth, browserLocalPersistence)
        }

        const email = toEmail(username)
        let cred = null

        try {
          cred = await signInWithEmailAndPassword(auth, email, password)
        } catch (err) {
          if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
            try {
              cred = await createUserWithEmailAndPassword(auth, email, password)
            } catch {
              // ignore
            }
          }
        }

        if (cred?.user) {
          const u = cred.user
          const minUser = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.email?.split('@')[0],
          }
          storage.setItem(STORAGE_KEY, JSON.stringify(minUser))
          setUser(u)
          return
        }
      } catch (e) {
        console.warn('Firebase Auth attempt failed:', e)
      }
    }

    // If it's admin / admin123, ALWAYS succeed and grant instant dashboard access
    if (isAdmin) {
      storage.setItem(STORAGE_KEY, JSON.stringify(LOCAL_ADMIN))
      setUser(LOCAL_ADMIN)
      return
    }

    throw new Error('That username and password don’t match. Please enter admin and admin123.')
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
    e?.message || 'Sign-in failed. Please enter username admin and password admin123.'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, errorMessage }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
