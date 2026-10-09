// Pop-up listing every order attached to an issue: order ID, amount and delivery status, in a scrollable list.
import { useEffect } from 'react'

function prettyStatus(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.toLowerCase()
		.replace(/^\w/, (letter) => letter.toUpperCase())
}

function formatAmount(value) {
	const amount = Number(value)
	if (!value || Number.isNaN(amount)) return '-'
	return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function IssueOrdersModal({ issue, onClose }) {
	useEffect(() => {
		const closeOnEscape = (event) => {
			if (event.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', closeOnEscape)
		return () => window.removeEventListener('keydown', closeOnEscape)
	}, [onClose])

	return (
		<div className="issue-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
			<div className="issue-modal issue-orders-modal" role="dialog" aria-modal="true" aria-label={`Orders in ${issue.reference}`}>
				<div className="issue-modal-head">
					<div className="issue-chat-title">
						<h2>Orders in {issue.reference}</h2>
						<p>{issue.orders.length} {issue.orders.length === 1 ? 'order' : 'orders'}</p>
					</div>
					<button type="button" className="issue-modal-close" aria-label="Close" onClick={onClose}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
					</button>
				</div>

				<div className="issue-orders-list">
					<table>
						<thead>
							<tr>
								<th>Order ID</th>
								<th>AWB number</th>
								<th>Amount</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{issue.orders.map((order) => (
								<tr key={`${order.merchant_order_id}-${order.awb}`}>
									<td className="mono-text">{order.merchant_order_id || order.order_id}</td>
									<td className="mono-text">{order.awb || '-'}</td>
									<td>{formatAmount(order.amount)}</td>
									<td>{order.delivery_status ? <span className="issue-picker-status">{prettyStatus(order.delivery_status)}</span> : '-'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

export default IssueOrdersModal
