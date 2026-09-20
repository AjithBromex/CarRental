import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import AddVehicle from './pages/AddVehicle'
import VehicleAnalytics from './pages/VehicleAnalytics'
import Rentals from './pages/Rentals'
import AddRental from './pages/AddRental'
import Payments from './pages/Payments'
import Drivers from './pages/Drivers'
import Analytics from './pages/Analytics'
import Maintenance from './pages/Maintenance'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

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
                    <Route path="maintenance" element={<Maintenance />} />
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
