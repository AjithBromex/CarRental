import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { auth, toEmail } from '../firebase/firebaseConfig'

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u)
    setLoading(false)
  }), [])

  const login = async (username, password, remember = true) => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    await signInWithEmailAndPassword(auth, toEmail(username), password)
  }

  const logout = () => signOut(auth)

  const errorMessage = (e) =>
    MESSAGES[e?.code] || 'Sign-in failed. Check your Firebase setup and try again.'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, errorMessage }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
