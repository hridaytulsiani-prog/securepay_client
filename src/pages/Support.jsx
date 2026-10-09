// Merchant "Support" page: the issues this merchant has raised with EscroSafe, in a table. "Orders" opens the
// list of orders in an issue; "Details" opens the chat with the EscroSafe team about it. New issues are raised
// from here (orders ticked from the merchant's own list) or from the Dashboard (orders ticked in the table).
import { useCallback, useEffect, useState } from 'react'
import { getMyIssues } from '../api/issues'
import IssueChatModal from '../components/IssueChatModal'
import IssueOrdersModal from '../components/IssueOrdersModal'
import RaiseIssueModal from '../components/RaiseIssueModal'

const STATUS_CLASS = {
	new: 'status-pending',
	in_progress: 'status-pending',
	resolved: 'status-success',
}

function formatDate(value) {
	if (!value) return '-'
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime())
		? '-'
		: parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Support() {
	const [issues, setIssues] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [isRaiseOpen, setIsRaiseOpen] = useState(false)
	const [ordersIssue, setOrdersIssue] = useState(null)
	const [chatIssue, setChatIssue] = useState(null)

	// reloadKey changes whenever the list should be fetched again (Refresh button, after raising an issue).
	const [reloadKey, setReloadKey] = useState(0)
	const reload = () => {
		setIsLoading(true)
		setReloadKey((key) => key + 1)
	}
	// Refetch without the "Refreshing..." state: used by the timer below and when the chat sees a change.
	const quietReload = useCallback(() => setReloadKey((key) => key + 1), [])

	// Keep the table current (status, new replies) while the page is open.
	useEffect(() => {
		const timer = window.setInterval(() => setReloadKey((key) => key + 1), 15000)
		return () => window.clearInterval(timer)
	}, [])

	useEffect(() => {
		let active = true
		getMyIssues()
			.then((data) => {
				if (!active) return
				setIssues(Array.isArray(data?.results) ? data.results : [])
				setError('')
			})
			.catch((requestError) => {
				if (active) setError(requestError.message || 'Could not load your issues.')
			})
			.finally(() => {
				if (active) setIsLoading(false)
			})
		return () => {
			active = false
		}
	}, [reloadKey])

	return (
		<section className="dashboard-page support-page">
			<div className="dashboard-overview">
				<div className="dashboard-hero">
					<div>
						<p className="dashboard-eyebrow">
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V17h-.5A2.5 2.5 0 0 1 4 14.5v-8Zm4 1.5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8Zm0 3.5a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H8Z" />
							</svg>
							Help with your orders
						</p>
						<h2 className="dashboard-title">Support</h2>
						<p>Raise an issue about your orders and the EscroSafe team will look into it.</p>
					</div>
				</div>
			</div>

			<div className="card table-card support-card">
				{error ? <p className="message error">{error}</p> : null}

				<div className="support-list-head">
					<h3>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M6.5 3.5h11A2.5 2.5 0 0 1 20 6v12a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18V6a2.5 2.5 0 0 1 2.5-2.5Zm2 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2h-7Zm0 3.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-7Zm0 3.5a1 1 0 1 0 0 2h4.5a1 1 0 1 0 0-2H8.5Z" />
						</svg>
						Your issues
					</h3>
					<div className="support-list-actions">
						<button type="button" className="issue-btn" onClick={() => setIsRaiseOpen(true)}>
							Raise an issue
						</button>
						<button type="button" className="issue-btn" onClick={reload} disabled={isLoading}>
							{isLoading ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>
				</div>

				{isLoading && issues.length === 0 ? (
					<p className="support-empty">Loading...</p>
				) : issues.length === 0 ? (
					<p className="support-empty">You have not raised any issues yet.</p>
				) : (
					<div className="shipments-scroll">
						<table className="shipments-table support-table" aria-label="Your issues">
							<thead>
								<tr>
									<th>Ticket number</th>
									<th>Raised</th>
									<th>Type</th>
									<th>Orders</th>
									<th>Status</th>
									<th>Details</th>
								</tr>
							</thead>
							<tbody>
								{issues.map((issue) => {
									return (
										<tr key={issue.id}>
											<td className="mono-text">{issue.reference}</td>
											<td className="order-date-cell">{formatDate(issue.created_at)}</td>
											<td className="support-type-cell">{issue.issue_type_label}</td>
											<td>
												<div className="support-orders-cell">
													<button type="button" className="issue-btn issue-btn-small" onClick={() => setOrdersIssue(issue)}>
														Open
													</button>
												</div>
											</td>
											<td>
												<span className={`status-badge ${STATUS_CLASS[issue.status] || 'status-pending'}`}>{issue.status_label}</span>
											</td>
											<td>
												<button type="button" className="issue-btn issue-btn-small" onClick={() => setChatIssue(issue)}>
													Open
												</button>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{isRaiseOpen ? <RaiseIssueModal onClose={() => setIsRaiseOpen(false)} onCreated={reload} /> : null}
			{ordersIssue ? <IssueOrdersModal issue={ordersIssue} onClose={() => setOrdersIssue(null)} /> : null}
			{chatIssue ? <IssueChatModal issue={chatIssue} onClose={() => setChatIssue(null)} onChanged={quietReload} /> : null}
		</section>
	)
}

export default Support
