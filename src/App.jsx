import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Enquiry from './pages/Enquiry'
import EnquiryDashboard from './pages/EnquiryDashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import TrackOrder from './pages/TrackOrder'
import UploadLabel from './pages/UploadLabel'
import CourierSettings from './pages/CourierSettings'
import CreateOrder from './pages/CreateOrder'
import Cart from './pages/Cart'
import LandingPage from './pages/LandingPage'
import CustomerTrust from './pages/CustomerTrust'
import CheckoutRoute from './pages/CheckoutRoute'
import Documentation from './pages/Documentation'
import Terms from './pages/Terms'
import { AUTH_IDLE_TIMEOUT_MS, clearAuthSession, isAuthenticated, refreshAuthSessionCookie } from './utils/storage'
import './App.css'

function App() {
  const navigate = useNavigate()
  // isAuthenticated() reads a cookie directly rather than React state, so
  // authTick exists purely to force a re-render (and re-read of that cookie)
  // whenever storage.js's 'securepay-auth-changed' event fires.
  const [authTick, setAuthTick] = useState(0)
  const authed = isAuthenticated()

  useEffect(() => {
  const handleAuthChange = () => {
    setAuthTick((currentTick) => currentTick + 1)
  }

  window.addEventListener('securepay-auth-changed', handleAuthChange)

  return () => {
    window.removeEventListener('securepay-auth-changed', handleAuthChange)
  }
  }, [])

  // Auto-logout on inactivity: any of these events resets the timer, and
  // letting it run out clears the session and bounces to /login — mirrors
  // the backend's own short-lived (TOKEN_TTL_SECONDS) session tokens.
  useEffect(() => {
  if (!authed) {
    return undefined
  }

  const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
  let idleTimerId = window.setTimeout(() => {
    clearAuthSession()
    navigate('/login', { replace: true })
  }, AUTH_IDLE_TIMEOUT_MS)

  const resetIdleTimer = () => {
    refreshAuthSessionCookie()
    window.clearTimeout(idleTimerId)
    idleTimerId = window.setTimeout(() => {
      clearAuthSession()
      navigate('/login', { replace: true })
    }, AUTH_IDLE_TIMEOUT_MS)
  }

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, resetIdleTimer)
  })

  return () => {
    window.clearTimeout(idleTimerId)
    activityEvents.forEach((eventName) => {
      window.removeEventListener(eventName, resetIdleTimer)
    })
  }
  }, [authTick, authed, navigate])

  return (
    <Routes>
      {/* /enquiry is the one public route besides login/register — it's
          where the signed WhatsApp delivery-notification link points. */}
      <Route
        path="/"
        element={
          authed ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/enquiry" element={<Enquiry />} />
      <Route path="/customer" element={<CustomerTrust />} />
      <Route path="/docs" element={<Documentation />} />
      <Route path="/checkout" element={<CheckoutRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-order" element={<CreateOrder />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/enquiries" element={<EnquiryDashboard />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route path="/upload-label" element={<UploadLabel />} />
        <Route path="/settings" element={<CourierSettings />} />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={authed ? '/dashboard' : '/login'}
            replace
          />
        }
      />
    </Routes>
  )
}

export default App
