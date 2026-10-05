// Top nav for the merchant dashboard — this "EscroSafe / Logistics Console"
// layout was the visual reference for the separate securepay-admin app's
// DashboardLayout, so keep them in sync if this changes.
import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import escrosafeLogo from '../assets/escrosafe-logo.png'
import { clearAuthSession, getUser } from '../utils/storage'

function Navbar() {
	const navigate = useNavigate()
	const moreMenuRef = useRef(null)
	const [isMoreOpen, setIsMoreOpen] = useState(false)
	const user = getUser()
	const displayName = user?.merchant_name || user?.username || user?.name || user?.merchant_email || user?.email || 'Merchant'
	const accountInitial = displayName.trim().charAt(0).toUpperCase() || 'M'

	useEffect(() => {
		if (!isMoreOpen) {
			return undefined
		}

		const closeOnOutsideClick = (event) => {
			if (!moreMenuRef.current?.contains(event.target)) {
				setIsMoreOpen(false)
			}
		}
		const closeOnEscape = (event) => {
			if (event.key === 'Escape') {
				setIsMoreOpen(false)
			}
		}

		document.addEventListener('mousedown', closeOnOutsideClick)
		document.addEventListener('keydown', closeOnEscape)
		return () => {
			document.removeEventListener('mousedown', closeOnOutsideClick)
			document.removeEventListener('keydown', closeOnEscape)
		}
	}, [isMoreOpen])

	const handleLogout = () => {
		clearAuthSession()
		navigate('/login', { replace: true })
	}

	return (
		<header className="navbar">
			<div className="brand">
				<h1 className="brand-logo"><img src={escrosafeLogo} alt="EscroSafe" /></h1>
			</div>

			<nav className="nav-links">
				<NavLink to="/dashboard">Dashboard</NavLink>
				<NavLink to="/enquiries">Enquiries</NavLink>
				<NavLink to="/track-order">Track Order</NavLink>
				<NavLink to="/upload-label">Upload Label</NavLink>
			</nav>

			<div className="nav-account">
				<NotificationBell />
				<button type="button" className="settings-button" aria-label="Courier settings" title="Courier settings" onClick={() => navigate('/settings')}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.73l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				</button>
				<div className="nav-more" ref={moreMenuRef}>
					<button type="button" className="nav-more-button" aria-label="More options" aria-haspopup="menu" aria-expanded={isMoreOpen} onClick={() => setIsMoreOpen((open) => !open)}>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="5" r="1.8" />
							<circle cx="12" cy="12" r="1.8" />
							<circle cx="12" cy="19" r="1.8" />
						</svg>
					</button>
					{isMoreOpen ? (
						<div className="nav-more-menu" role="menu">
							<div className="nav-more-profile" role="presentation">
								<span className="nav-user-avatar">{accountInitial}</span>
								<div>
									<strong>{displayName}</strong>
									<span>Merchant account</span>
								</div>
							</div>
							<button type="button" className="nav-more-logout" role="menuitem" onClick={handleLogout}>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<path d="M16 17l5-5-5-5" />
									<path d="M21 12H9" />
								</svg>
								Logout
							</button>
						</div>
					) : null}
				</div>
			</div>
		</header>
	)
}

export default Navbar
