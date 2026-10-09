// Pop-up used on the Dashboard (orders ticked in the table) and on the Support page (orders ticked from the
// merchant's own list) to raise an issue with EscroSafe about one or more orders. The admin reads it in the admin
// app under "Merchant issues" and answers on the Support page.
import { useEffect, useMemo, useState } from 'react'
import { createIssue, getMyOrders } from '../api/issues'
import { ISSUE_TYPES } from '../utils/issueTypes'

function prettyStatus(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.toLowerCase()
		.replace(/^\w/, (letter) => letter.toUpperCase())
}

function RaiseIssueModal({ initialOrders = [], onClose, onCreated }) {
	// orders = the order IDs ticked so far; myOrders = every order on this merchant's account, loaded for the picker.
	const [orders, setOrders] = useState(() => Array.from(new Set(initialOrders)))
	const [myOrders, setMyOrders] = useState([])
	const [ordersState, setOrdersState] = useState('loading')
	const [orderSearch, setOrderSearch] = useState('')
	const [issueType, setIssueType] = useState('')
	const [description, setDescription] = useState('')
	const [status, setStatus] = useState({ state: 'idle', text: '', reference: '' })

	useEffect(() => {
		const closeOnEscape = (event) => {
			if (event.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', closeOnEscape)
		return () => window.removeEventListener('keydown', closeOnEscape)
	}, [onClose])

	useEffect(() => {
		let active = true
		getMyOrders()
			.then((list) => {
				if (!active) return
				setMyOrders(list)
				setOrdersState('ready')
			})
			.catch(() => {
				if (active) setOrdersState('error')
			})
		return () => {
			active = false
		}
	}, [])

	// Orders ticked on the Dashboard stay in the list even if they are not in the loaded page of orders.
	const pickerOrders = useMemo(() => {
		const known = new Set(myOrders.map((order) => order.orderId))
		const extra = initialOrders
			.filter((orderId) => !known.has(orderId))
			.map((orderId) => ({ orderId, awb: '', courier: '', deliveryStatus: '', customerName: '' }))
		return [...extra, ...myOrders]
	}, [myOrders, initialOrders])

	const shownOrders = useMemo(() => {
		const needle = orderSearch.trim().toLowerCase()
		if (!needle) return pickerOrders
		return pickerOrders.filter((order) =>
			[order.awb, order.customerName].some((value) => String(value || '').toLowerCase().includes(needle)),
		)
	}, [pickerOrders, orderSearch])

	const allShownTicked = shownOrders.length > 0 && shownOrders.every((order) => orders.includes(order.orderId))
	const toggleOrder = (orderId) =>
		setOrders((current) => (current.includes(orderId) ? current.filter((value) => value !== orderId) : [...current, orderId]))
	const toggleAllShown = () =>
		setOrders((current) =>
			allShownTicked
				? current.filter((orderId) => !shownOrders.some((order) => order.orderId === orderId))
				: Array.from(new Set([...current, ...shownOrders.map((order) => order.orderId)])),
		)

	const selectedType = ISSUE_TYPES.find((type) => type.value === issueType)

	const handleSubmit = async (event) => {
		event.preventDefault()
		if (status.state === 'sending') return

		if (orders.length === 0) {
			setStatus({ state: 'error', text: 'Tick at least one order.', reference: '' })
			return
		}
		if (!issueType) {
			setStatus({ state: 'error', text: 'Choose what the issue is about.', reference: '' })
			return
		}

		setStatus({ state: 'sending', text: '', reference: '' })
		try {
			const issue = await createIssue({ issue_type: issueType, description: description.trim(), orders })
			setStatus({ state: 'sent', text: '', reference: issue.reference })
			onCreated?.(issue)
		} catch (error) {
			setStatus({ state: 'error', text: error.message || 'Could not send your issue. Please try again.', reference: '' })
		}
	}

	if (status.state === 'sent') {
		return (
			<div className="issue-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
				<div className="issue-modal issue-modal-done" role="dialog" aria-modal="true" aria-label="Issue raised">
					<span className="issue-done-tick" aria-hidden="true">
						<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" /></svg>
					</span>
					<h2>Issue raised</h2>
					<p>
						Your reference is <strong>{status.reference}</strong>. The EscroSafe team will look into it and reply on your Support page.
					</p>
					<div className="issue-modal-actions">
						<button type="button" className="issue-btn issue-btn-primary" onClick={onClose}>Done</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="issue-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
			<form className="issue-modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Raise an issue">
				<div className="issue-modal-head">
					<h2>Raise an issue</h2>
					<button type="button" className="issue-modal-close" aria-label="Close" onClick={onClose}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
					</button>
				</div>
				<p className="issue-modal-lead">Tick the orders that have a problem and tell us what is wrong. The EscroSafe team will look into it.</p>

				<div className="issue-field">
					<span className="issue-label">Orders ({orders.length} selected)</span>
					<input
						type="search"
						value={orderSearch}
						onChange={(event) => setOrderSearch(event.target.value)}
						placeholder="Search by AWB or customer name"
						aria-label="Search your orders"
					/>
					<div className="issue-order-picker">
						{ordersState === 'loading' ? <p className="issue-picker-note">Loading your orders...</p> : null}
						{ordersState === 'error' ? <p className="issue-picker-note">Could not load your orders. Please close this and try again.</p> : null}
						{ordersState === 'ready' && shownOrders.length === 0 ? (
							<p className="issue-picker-note">{pickerOrders.length === 0 ? 'You have no orders yet.' : 'No orders match your search.'}</p>
						) : null}
						{shownOrders.length > 0 ? (
							<>
								<label className="issue-picker-row is-head">
									<input type="checkbox" checked={allShownTicked} onChange={toggleAllShown} />
									<span>{orderSearch.trim() ? 'Select all shown' : 'Select all'}</span>
								</label>
								<ul>
									{shownOrders.map((order) => (
										<li key={order.orderId}>
											<label className={`issue-picker-row${orders.includes(order.orderId) ? ' is-ticked' : ''}`}>
												<input type="checkbox" checked={orders.includes(order.orderId)} onChange={() => toggleOrder(order.orderId)} />
												<span className="issue-picker-main">
													<strong>{order.awb || order.orderId}</strong>
													<small>
														{[order.customerName, order.courier, order.awb ? '' : 'No AWB yet'].filter(Boolean).join(' · ') || 'No customer details'}
													</small>
												</span>
												{order.deliveryStatus ? <em className="issue-picker-status">{prettyStatus(order.deliveryStatus)}</em> : null}
											</label>
										</li>
									))}
								</ul>
							</>
						) : null}
					</div>
				</div>

				<label className="issue-field">
					<span className="issue-label">What is the issue?</span>
					<select value={issueType} onChange={(event) => setIssueType(event.target.value)} required>
						<option value="">Choose an issue</option>
						{ISSUE_TYPES.map((type) => (
							<option key={type.value} value={type.value}>{type.label}</option>
						))}
					</select>
					{selectedType ? <small className="issue-hint">{selectedType.hint}</small> : null}
				</label>

				<label className="issue-field">
					<span className="issue-label">Tell us more</span>
					<textarea
						rows={4}
						maxLength={2000}
						required
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						placeholder="What did you expect, and what do you see instead?"
					/>
				</label>

				{status.state === 'error' ? <p className="issue-error" role="alert">{status.text}</p> : null}

				<div className="issue-modal-actions">
					<button type="button" className="issue-btn" onClick={onClose}>Cancel</button>
					<button type="submit" className="issue-btn issue-btn-primary" disabled={status.state === 'sending'}>
						{status.state === 'sending' ? 'Sending...' : 'Send to EscroSafe'}
					</button>
				</div>
			</form>
		</div>
	)
}

export default RaiseIssueModal
