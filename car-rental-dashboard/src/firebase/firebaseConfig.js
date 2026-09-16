import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const clean = (val) => (val ? String(val).replace(/^[",'\s]+|[",'\s]+$/g, '') : '')

// Values come from .env (never commit the real file).
const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
}

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const fallbackConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:000000000000',
}

const app = initializeApp(isConfigured ? firebaseConfig : fallbackConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// The owner types a username; we turn it into the account's email address.
export const ADMIN_DOMAIN = import.meta.env.VITE_ADMIN_DOMAIN || 'fleetline.local'

export const toEmail = (username) =>
  username.includes('@') ? username.trim() : `${username.trim()}@${ADMIN_DOMAIN}`

export default app
