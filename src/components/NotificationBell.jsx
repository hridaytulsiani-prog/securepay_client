import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMerchantNotifications } from '../api/notifications'

const NOTIFICATION_POLL_MS = 15 * 1000
const NOTIFICATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const READ_IDS_KEY = 'securepay.readNotificationIds'

function readStoredReadIds() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(READ_IDS_KEY) || '[]')
		return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
	} catch {
		return new Set()
	}
}

function storeReadIds(ids) {
	try {
		window.localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]))
	} catch {
		// Read state just won't survive a refresh if storage is unavailable.
	}
}

function formatNotificationDate(value) {
	if (!value) {
		return 'Date unavailable'
	}

	const date = new Date(value)
	return Number.isNaN(date.getTime())
		? 'Date unavailable'
		: date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function getNotificationLabel(notification) {
	const type = String(notification.type || '').replaceAll('_', ' ')
	return type ? type.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'System notification'
}

function getNotificationVisual(notification) {
	const searchText = `${notification.source || ''} ${notification.type || ''} ${notification.title || ''}`.toLowerCase()
	if (searchText.includes('customer_issue') || searchText.includes('customer issue')) {
		return { tone: 'issue', icon: 'message' }
	}
	if (searchText.includes('shipment') || searchText.includes('label') || searchText.includes('courier')) {
		return { tone: 'shipment', icon: 'package' }
	}
	if (searchText.includes('payment') || searchText.includes('refund') || searchText.includes('release')) {
		return { tone: 'payment', icon: 'payment' }
	}
	return { tone: 'general', icon: 'bell' }
}

function NotificationTypeIcon({ notification }) {
	const { tone, icon } = getNotificationVisual(notification)
	return (
		<span className={`notification-item-icon is-${tone}`} aria-hidden="true">
			{icon === 'message' ? (
				<svg viewBox="0 0 24 24"><path d="M20 15a3 3 0 0 1-3 3H8l-4 3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" /><path d="M8 9h8M8 13h5" /></svg>
			) : icon === 'package' ? (
				<svg viewBox="0 0 24 24"><path d="m4 7 8-4 8 4-8 4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></svg>
			) : icon === 'payment' ? (
				<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></svg>
			) : (
				<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
			)}
		</span>
	)
}

// Tracking messages end with "Next check: ..." — show that on its own line.
function splitNextCheck(message) {
	const text = String(message || '')
	const index = text.indexOf('Next check:')
	return index > 0 ? [text.slice(0, index).trim(), text.slice(index).trim()] : [text]
}

// Keep "Order ID <id>" on one line and colour the id by status (green = delivered).
function renderMessage(notification) {
	const message = String(notification.message || '')
	const orderId = notification.order_id ? String(notification.order_id) : ''
	const index = orderId ? message.indexOf(orderId) : -1
	if (index < 0) {
		return message
	}
	const tone = notification.normalized_status === 'DELIVERED' ? 'is-delivered' : 'is-pending'
	const before = message.slice(0, index)
	const label = before.match(/\S+\s+\S+\s*$/)?.[0] ?? ''
	return (
		<>
			{before.slice(0, before.length - label.length)}
			<span className="notification-order-ref">
				{label}
				<span className={`notification-order-id ${tone}`}>{orderId}</span>
			</span>
			{message.slice(index + orderId.length)}
		</>
	)
}

function sortNotifications(items) {
	return [...items].sort((first, second) => {
		const firstTime = first.created_at ? new Date(first.created_at).getTime() : 0
		const secondTime = second.created_at ? new Date(second.created_at).getTime() : 0
		return secondTime - firstTime
	})
}

function NotificationBell() {
	const navigate = useNavigate()
	const notificationWrapRef = useRef(null)
	const [notifications, setNotifications] = useState([])
	const [isOpen, setIsOpen] = useState(false)
	const [selectedNotification, setSelectedNotification] = useState(null)
	const [viewedNotificationIds, setViewedNotificationIds] = useState(readStoredReadIds)
	const [error, setError] = useState('')

	const loadNotifications = useCallback(async () => {
		try {
			const response = await fetchMerchantNotifications()
			const results = Array.isArray(response.results) ? response.results : []
			const cutoff = Date.now() - NOTIFICATION_RETENTION_MS
			const fresh = results.filter((notification) => {
				const createdAt = notification.created_at ? new Date(notification.created_at).getTime() : NaN
				return Number.isNaN(createdAt) || createdAt >= cutoff
			})
			setNotifications(sortNotifications(fresh))
			setError('')
			// Forget read ids for notifications that no longer exist so the list stays small.
			setViewedNotificationIds((viewed) => {
				const currentIds = new Set(fresh.map((notification) => String(notification.id)))
				const next = new Set([...viewed].filter((id) => currentIds.has(id)))
				if (next.size !== viewed.size) {
					storeReadIds(next)
					return next
				}
				return viewed
			})
		} catch (loadError) {
			setError(loadError.message || 'Unable to load notifications.')
			setNotifications([])
		}
	}, [])

	useEffect(() => {
		void loadNotifications()

		const intervalId = window.setInterval(() => {
			void loadNotifications()
		}, NOTIFICATION_POLL_MS)
		const refreshWhenVisible = () => {
			if (document.visibilityState === 'visible') {
				void loadNotifications()
			}
		}

		window.addEventListener('focus', refreshWhenVisible)
		document.addEventListener('visibilitychange', refreshWhenVisible)

		return () => {
			window.clearInterval(intervalId)
			window.removeEventListener('focus', refreshWhenVisible)
			document.removeEventListener('visibilitychange', refreshWhenVisible)
		}
	}, [loadNotifications])

	const unreadCount = notifications.filter((notification) => !viewedNotificationIds.has(String(notification.id))).length

	const markAsRead = (ids) => {
		setViewedNotificationIds((viewed) => {
			const next = new Set(viewed)
			ids.forEach((id) => next.add(String(id)))
			storeReadIds(next)
			return next
		})
	}

	const handleToggle = () => {
		setIsOpen((current) => !current)
	}

	const handleNotificationClick = (notification) => {
		markAsRead([notification.id])
		setIsOpen(false)
		if (notification.source === 'admin_customer_issue' && notification.customer_issue_id) {
			navigate(`/customer-issues?issue=${notification.customer_issue_id}`)
			return
		}
		setSelectedNotification(notification)
	}

	useEffect(() => {
		if (!selectedNotification) {
			return undefined
		}

		const closeOnEscape = (event) => {
			if (event.key === 'Escape') {
				setSelectedNotification(null)
			}
		}

		document.addEventListener('keydown', closeOnEscape)
		return () => document.removeEventListener('keydown', closeOnEscape)
	}, [selectedNotification])

	useEffect(() => {
		if (!isOpen) {
			return undefined
		}

		const closeOnOutsideClick = (event) => {
			if (!notificationWrapRef.current?.contains(event.target)) {
				setIsOpen(false)
			}
		}

		document.addEventListener('mousedown', closeOnOutsideClick)
		return () => document.removeEventListener('mousedown', closeOnOutsideClick)
	}, [isOpen])

	return (
		<div className="notification-wrap" ref={notificationWrapRef}>
			<button
				type="button"
				className="notification-button"
				aria-label="Notifications"
				onClick={handleToggle}
			>
				<svg aria-hidden="true" viewBox="0 0 24 24" className="notification-icon">
					<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
					<path d="M10 21a2 2 0 0 0 4 0" />
				</svg>
				{unreadCount > 0 ? (
					<span className="notification-count" aria-label={`${unreadCount} unread notifications`}>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				) : null}
			</button>

			{isOpen ? (
				<div className="notification-menu" role="dialog" aria-label="Notifications">
					<div className="notification-head">
						<div className="notification-head-copy">
							<strong>Notifications</strong>
							<span>{notifications.length ? (unreadCount ? `${unreadCount} new · ${notifications.length} total` : 'All caught up') : 'No new updates'}</span>
						</div>
						<div className="notification-head-actions">
							<button type="button" className="notification-mark-read" disabled={unreadCount === 0} onClick={() => markAsRead(notifications.map((notification) => notification.id))}>
								Mark all as read
							</button>
							<button type="button" className="notification-menu-close" aria-label="Close notifications" onClick={() => setIsOpen(false)}>
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
							</button>
						</div>
					</div>
					{error ? <p className="notification-error">{error}</p> : null}
					{notifications.length === 0 ? (
						<p className="notification-empty">No pending notifications.</p>
					) : (
						<ul className="notification-list">
							{notifications.map((notification) => {
								const isUnread = !viewedNotificationIds.has(String(notification.id))
								return (
								<li key={notification.id}>
									<button type="button" className={`notification-item${isUnread ? ' is-unread' : ''}`} onClick={() => handleNotificationClick(notification)}>
										<NotificationTypeIcon notification={notification} />
										<span className="notification-item-content">
											<span className="notification-item-title-row">
												<strong>{notification.title}</strong>
												{isUnread ? <i className="notification-unread-dot" aria-label="Unread" /> : null}
											</span>
											<span>{renderMessage(notification)}</span>
											<small className="notification-item-meta">
												{notification.order_id && !String(notification.message || '').includes(notification.order_id) ? <span>{notification.order_id}</span> : null}
												<time dateTime={notification.created_at || undefined}>{formatNotificationDate(notification.created_at)}</time>
											</small>
										</span>
									</button>
								</li>
								)
							})}
						</ul>
					)}
				</div>
			) : null}

			{selectedNotification ? (
				<div className="notification-modal-backdrop" role="presentation" onMouseDown={() => setSelectedNotification(null)}>
					<section className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notification-detail-title" onMouseDown={(event) => event.stopPropagation()}>
						<div className="notification-modal-head">
							<div>
								<span className="notification-modal-eyebrow">Notification details</span>
								<h2 id="notification-detail-title">{selectedNotification.title}</h2>
							</div>
							<button type="button" className="notification-modal-close" aria-label="Close notification details" onClick={() => setSelectedNotification(null)}>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
						</button>
						</div>
						<p className="notification-modal-message">
							{splitNextCheck(selectedNotification.message).map((line) => <span key={line}>{renderMessage({ ...selectedNotification, message: line })}</span>)}
						</p>
						<div className="notification-detail-grid">
							<div><span>Type</span><strong>{getNotificationLabel(selectedNotification)}</strong></div>
							<div><span>Created</span><strong>{formatNotificationDate(selectedNotification.created_at)}</strong></div>
							<div><span>Order ID</span><strong>{selectedNotification.order_id || 'Not available'}</strong></div>
							<div><span>Customer</span><strong>{selectedNotification.customer_name || 'Not available'}</strong></div>
							{selectedNotification.payment_state ? <div><span>Payment state</span><strong>{selectedNotification.payment_state}</strong></div> : null}
							{selectedNotification.issue_reference ? <div><span>Customer issue</span><strong>{selectedNotification.issue_reference}</strong></div> : null}
							{selectedNotification.issue_type ? <div><span>Issue</span><strong>{selectedNotification.issue_type}</strong></div> : null}
							{selectedNotification.reminder_count ? <div><span>Reminder count</span><strong>{selectedNotification.reminder_count}</strong></div> : null}
						</div>
					</section>
				</div>
			) : null}
		</div>
	)
}

export default NotificationBell
