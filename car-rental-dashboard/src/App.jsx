import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'

// Pages load on demand so the first paint after sign-in stays quick.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Vehicles = lazy(() => import('./pages/Vehicles'))
const AddVehicle = lazy(() => import('./pages/AddVehicle'))
const VehicleAnalytics = lazy(() => import('./pages/VehicleAnalytics'))
const Rentals = lazy(() => import('./pages/Rentals'))
const AddRental = lazy(() => import('./pages/AddRental'))
const Payments = lazy(() => import('./pages/Payments'))
const Drivers = lazy(() => import('./pages/Drivers'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="vehicles" element={<Vehicles />} />
                    <Route path="vehicles/new" element={<AddVehicle />} />
                    <Route path="vehicles/edit/:id" element={<AddVehicle />} />
                    <Route path="vehicles/:id" element={<VehicleAnalytics />} />
                    <Route path="rentals" element={<Rentals />} />
                    <Route path="rentals/new" element={<AddRental />} />
                    <Route path="rentals/edit/:id" element={<AddRental />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="drivers" element={<Drivers />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
