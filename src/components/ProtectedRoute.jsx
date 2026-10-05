// Gate for merchant-only routes: also doubles as the shared layout (Navbar +
// page shell) for everything under it, so a protected page never renders
// without the nav bar around it.
import { Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import CourierSetupModal from './CourierSetupModal'
import { getCourierPreferences } from '../api/merchant'
import { isAuthenticated } from '../utils/storage'

function ProtectedRoute() {
	const [showCourierSetup, setShowCourierSetup] = useState(null)

	useEffect(() => {
		let active = true
		if (!isAuthenticated()) return undefined

		getCourierPreferences()
			.then((data) => {
				if (active) setShowCourierSetup(!data.courier_setup_completed)
			})
			.catch((requestError) => {
				// Do not silently skip mandatory first-login setup. The modal can
				// still be submitted once the API is available again.
				console.error('Unable to load courier setup status:', requestError)
				if (active) setShowCourierSetup(true)
			})
		return () => {
			active = false
		}
	}, [])

	useEffect(() => {
		const completeSetup = () => setShowCourierSetup(false)
		window.addEventListener('securepay-courier-setup-complete', completeSetup)
		return () => window.removeEventListener('securepay-courier-setup-complete', completeSetup)
	}, [])

	if (!isAuthenticated()) {
		return <Navigate to="/login" replace />
	}

	if (showCourierSetup === null || showCourierSetup) {
		return showCourierSetup === null ? (
			<div className="courier-setup-overlay" role="status">
				<p className="courier-setup-loading">Loading your account setup...</p>
			</div>
		) : <CourierSetupModal />
	}

	return (
		<div className="app-layout">
			<Navbar />
			<main className="page-shell">
				<Outlet />
			</main>
		</div>
	)
}

export default ProtectedRoute

