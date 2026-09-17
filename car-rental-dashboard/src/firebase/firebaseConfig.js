import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const clean = (val) => (val ? String(val).replace(/^[",'\s]+|[",'\s]+$/g, '') : '')

// Values come from .env with production fallbacks for Vercel builds.
const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY) || 'AIzaSyAy-2AaFFSTnz3dHZnySATLOBXB9mO1RMY',
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || 'car-rental-manager-c6ef7.firebaseapp.com',
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID) || 'car-rental-manager-c6ef7',
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || 'car-rental-manager-c6ef7.firebasestorage.app',
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || '69626765237',
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID) || '1:69626765237:web:8f83516089ac98bd7dc3fc',
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

// Use persistent IndexedDB cache for instant query reads across sessions with multi-tab support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

// The owner types a username; we turn it into the account's email address.
export const ADMIN_DOMAIN = import.meta.env.VITE_ADMIN_DOMAIN || 'fleetline.local'

export const toEmail = (username) =>
  username.includes('@') ? username.trim() : `${username.trim()}@${ADMIN_DOMAIN}`

export default app
