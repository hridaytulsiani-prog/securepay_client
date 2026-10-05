import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function ResourcesDropdown() {
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef(null)
	const navigate = useNavigate()

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const handleNavigate = (tab) => {
		setIsOpen(false)
		navigate(`/docs?tab=${tab}`)
	}

	return (
		<div className="resources-dropdown-container" ref={dropdownRef}>
			<button
				type="button"
				className={`resources-trigger ${isOpen ? 'active' : ''}`}
				onClick={() => setIsOpen((prev) => !prev)}
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<span>Resources</span>
				<svg className={`chevron-icon ${isOpen ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor">
					<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
				</svg>
			</button>

			{isOpen && (
				<div className="resources-menu" role="menu">
					<div className="resources-menu-header">
						<span className="resources-menu-title">Developer & Merchant Hub</span>
					</div>

					<button
						type="button"
						className="resources-item"
						onClick={() => handleNavigate('integration')}
						role="menuitem"
					>
						<div className="resources-item-text">
							<strong>Payment Aggregator Partnership</strong>
						</div>
					</button>

					<button
						type="button"
						className="resources-item"
						onClick={() => handleNavigate('api')}
						role="menuitem"
					>
						<div className="resources-item-text">
							<strong>API Documentation (v1)</strong>
						</div>
					</button>

					<button
						type="button"
						className="resources-item"
						onClick={() => handleNavigate('extension')}
						role="menuitem"
					>
						<div className="resources-item-text">
							<strong>Chrome Extension Guide</strong>
						</div>
					</button>

				</div>
			)}
		</div>
	)
}

export default ResourcesDropdown
