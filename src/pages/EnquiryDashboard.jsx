// Merchant's own enquiries dashboard (own customers only). This page's
// layout/columns were the visual reference the securepay-admin app's
// EnquiriesPage was built to match, before it added notes/resolution and
// pulled in every merchant's enquiries instead of just one.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchEnquiries } from '../api/enquiryList'

const ENQUIRY_FETCH_LIMIT = 500

function formatReceiptStatus(status) {
	switch (status) {
		case 'received':
			return 'Received'
		case 'not_received':
			return 'Not Received'
		case 'wrong_order':
			return 'Wrong Order'
		default:
			return status || '-'
	}
}

function formatBool(value) {
	if (value === null || value === undefined) {
		return '-'
	}
	return value ? 'Yes' : 'No'
}

function formatStatusText(status) {
	const value = String(status || '').trim()
	if (!value) {
		return '-'
	}

	return value
		.replace(/[_-]+/g, ' ')
		.toLowerCase()
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getStatusClass(status) {
	const normalized = String(status || '').toUpperCase()

	if (['RESOLVED'].includes(normalized)) {
		return 'status-badge status-paid'
	}

	if (['REVIEWED', 'IN_PROGRESS'].includes(normalized)) {
		return 'status-badge status-shipping'
	}

	return 'status-badge status-pending'
}

// Opens the merchant's own mail app with the customer's address, a subject and
// a greeting already filled in, same approach as the admin panel's reply button.
function buildReplyLink(enquiry) {
	const subject = `Regarding your enquiry ${enquiry.enquiry_id}${enquiry.order_id ? ` (order ${enquiry.order_id})` : ''}`
	const body = `Hi ${enquiry.customer_name || 'there'},



---
Your message:
${enquiry.enquiry_text || ''}`
	return `mailto:${enquiry.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function EnquiryDetailsModal({ enquiry, onClose }) {
	useEffect(() => {
		function handleKey(event) {
			if (event.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleKey)
		return () => document.removeEventListener('keydown', handleKey)
	}, [onClose])

	const details = [
		['Enquiry ID', enquiry.enquiry_id],
		['Order ID', enquiry.order_id],
		['AWB', enquiry.shipment_awb || '-'],
		['Customer', enquiry.customer_name || '-'],
		['Phone', enquiry.customer_phone || '-'],
		['Email', enquiry.customer_email || '-'],
		['Receipt status', <span className={getReceiptStatusClass(enquiry.receipt_status)}>{formatReceiptStatus(enquiry.receipt_status).toUpperCase()}</span>],
		['Status', <span className={getStatusClass(enquiry.status)}>{formatStatusText(enquiry.status).toUpperCase()}</span>],
		['Submitted', new Date(enquiry.created_at).toLocaleString()],
	]

	return createPortal(
		<div className="enquiry-modal-overlay" onMouseDown={onClose}>
			<div className="enquiry-modal-card" role="dialog" aria-modal="true" aria-label="Enquiry details" onMouseDown={(event) => event.stopPropagation()}>
				<div className="enquiry-modal-header">
					<h3>Enquiry details</h3>
					<button type="button" className="enquiry-modal-close" onClick={onClose} aria-label="Close">&times;</button>
				</div>
				<div className="enquiry-modal-body">
					<dl className="enquiry-modal-grid">
						{details.map(([label, value]) => (
							<div key={label}>
								<dt>{label}</dt>
								<dd>{value}</dd>
							</div>
						))}
					</dl>
					<div className="enquiry-modal-message">
						<span>Message</span>
						<p>{enquiry.enquiry_text || '-'}</p>
					</div>
					{enquiry.evidence_file_url ? (
						<a href={enquiry.evidence_file_url} target="_blank" rel="noreferrer">View uploaded file</a>
					) : null}
				</div>
				<div className="enquiry-modal-footer">
					{enquiry.customer_email ? (
						<a className="enquiry-modal-primary" href={buildReplyLink(enquiry)}>Reply with email</a>
					) : (
						<span className="muted-text small-text">No customer email on file to reply to.</span>
					)}
				</div>
			</div>
		</div>,
		document.body,
	)
}

function getReceiptStatusClass(status) {
	switch (status) {
		case 'received':
			return 'status-badge status-paid'
		case 'not_received':
			return 'status-badge status-failed'
		default:
			return 'status-badge status-pending'
	}
}

function getDateOnly(value) {
	if (!value) {
		return ''
	}

	const text = String(value)
	if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
		return text.slice(0, 10)
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return ''
	}

	return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function EnquiryDashboard() {
	const [enquiries, setEnquiries] = useState([])
	const [query, setQuery] = useState('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')
	const [receiptStatusFilter, setReceiptStatusFilter] = useState('')
	const [statusFilter, setStatusFilter] = useState('')
	const [pageSize, setPageSize] = useState('25')
	const [currentPage, setCurrentPage] = useState(1)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [selectedEnquiry, setSelectedEnquiry] = useState(null)

	const loadEnquiries = useCallback(async () => {
		setIsLoading(true)
		setError('')

		try {
			const data = await fetchEnquiries({ page: 1, limit: ENQUIRY_FETCH_LIMIT, q: query })
			setEnquiries(data.results || [])
		} catch (fetchError) {
			setError(fetchError.message || 'Unable to load enquiries.')
			setEnquiries([])
		} finally {
			setIsLoading(false)
		}
	}, [query])

	useEffect(() => {
		void loadEnquiries()
	}, [loadEnquiries])

	const filteredRows = useMemo(() => {
		return enquiries.filter((enquiry) => {
			const enquiryDate = getDateOnly(enquiry.created_at)
			const inDateRange =
				(!dateFrom || (enquiryDate && enquiryDate >= dateFrom)) &&
				(!dateTo || (enquiryDate && enquiryDate <= dateTo))
			const matchesReceiptStatus = !receiptStatusFilter || enquiry.receipt_status === receiptStatusFilter
			const matchesStatus = !statusFilter || String(enquiry.status || '').toLowerCase() === statusFilter

			return inDateRange && matchesReceiptStatus && matchesStatus
		})
	}, [dateFrom, dateTo, enquiries, receiptStatusFilter, statusFilter])

	const enquiryStats = useMemo(() => {
		return filteredRows.reduce(
			(summary, enquiry) => {
				const status = String(enquiry.status || '').toLowerCase()

				if (status === 'pending') {
					summary.pending += 1
				} else if (status === 'reviewed') {
					summary.reviewed += 1
				} else if (status === 'resolved') {
					summary.resolved += 1
				}

				return summary
			},
			{ pending: 0, reviewed: 0, resolved: 0 },
		)
	}, [filteredRows])

	const totalPages = Math.max(1, Math.ceil(filteredRows.length / Number(pageSize)))
	const visibleRows = useMemo(() => {
		const rowsPerPage = Number(pageSize)
		const startIndex = (currentPage - 1) * rowsPerPage
		return filteredRows.slice(startIndex, startIndex + rowsPerPage)
	}, [currentPage, filteredRows, pageSize])
	const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages])

	useEffect(() => {
		setCurrentPage(1)
	}, [dateFrom, dateTo, pageSize, query, receiptStatusFilter, statusFilter])

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages)
		}
	}, [currentPage, totalPages])

	return (
		<section className="dashboard-page">
			<div className="dashboard-overview">
				<div className="dashboard-hero">
					<div>
						<p className="dashboard-eyebrow">
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 3.5c-4.97 0-9 3.24-9 7.25 0 2.32 1.35 4.38 3.46 5.72-.12.98-.47 2.04-1.18 3a.6.6 0 0 0 .6.94c1.76-.37 3.13-1.12 4.1-1.83.65.11 1.32.17 2.02.17 4.97 0 9-3.25 9-7.25s-4.03-7-9-7Zm-3.25 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm3.25 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm3.25 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
							</svg>
							Customer responses
						</p>
						<h2 className="dashboard-title">Enquiry response overview</h2>
						<p>Review buyer delivery responses, evidence, and order concerns from one merchant workspace.</p>
					</div>
				</div>

				<div className="dashboard-stat-grid">
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M7 3.5h10A2.5 2.5 0 0 1 19.5 6v12a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Zm1.25 4.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Zm0 3.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Zm0 3.5a.75.75 0 0 0 0 1.5h4.75a.75.75 0 0 0 0-1.5H8.25Z" />
							</svg>
							Total enquiries
						</span>
						<strong>{filteredRows.length}</strong>
					</div>
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 3a9 9 0 1 0 9 9 9.01 9.01 0 0 0-9-9Zm.85 9.15 2.86 1.71a.9.9 0 0 1-.92 1.54l-3.3-1.98a.9.9 0 0 1-.44-.77V7.8a.9.9 0 0 1 1.8 0v4.35Z" />
							</svg>
							Pending
						</span>
						<strong>{enquiryStats.pending}</strong>
					</div>
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 4.5c-4.42 0-8.2 2.75-9.5 6.5 1.3 3.75 5.08 6.5 9.5 6.5s8.2-2.75 9.5-6.5c-1.3-3.75-5.08-6.5-9.5-6.5Zm0 10.83A4.33 4.33 0 1 1 12 6.67a4.33 4.33 0 0 1 0 8.66Zm0-6.83a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
							</svg>
							Reviewed
						</span>
						<strong>{enquiryStats.reviewed}</strong>
					</div>
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4.56 6.44-5.25 5.25a1 1 0 0 1-1.42 0l-2.45-2.45a1 1 0 1 1 1.42-1.42l1.74 1.75 4.54-4.55a1 1 0 1 1 1.42 1.42Z" />
							</svg>
							Resolved
						</span>
						<strong>{enquiryStats.resolved}</strong>
					</div>
				</div>
			</div>

			<div className="card table-card">
				<div className="dashboard-table-toolbar">
					<div className="table-head">
						<h3>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M9 3.5h6a1 1 0 0 1 1 1V5h.5A2.5 2.5 0 0 1 19 7.5v11A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-11A2.5 2.5 0 0 1 7.5 5H8v-.5a1 1 0 0 1 1-1Zm-1 3v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1h.5a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H8Zm.75 6.55 1.58 1.58 3.42-3.43a.85.85 0 1 1 1.2 1.2l-4.02 4.03a.85.85 0 0 1-1.2 0l-2.18-2.18a.85.85 0 1 1 1.2-1.2Z" />
							</svg>
							Enquiries
						</h3>
					</div>

					<div className="dashboard-controls merchant-order-controls">
						<label className="dashboard-search">
							<span>Search enquiries</span>
							<div className="dashboard-search-box">
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<circle cx="11" cy="11" r="7" />
									<path d="m16 16 4 4" />
								</svg>
								<input
									type="text"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									onKeyUp={(event) => {
										if (event.key === 'Enter') {
											void loadEnquiries()
										}
									}}
									placeholder="order id, customer name, phone, enquiry id"
								/>
							</div>
						</label>

						<label>
							<span>From date</span>
							<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
						</label>

						<label>
							<span>To date</span>
							<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
						</label>

						<label>
							<span>Receipt status</span>
							<select value={receiptStatusFilter} onChange={(event) => setReceiptStatusFilter(event.target.value)}>
								<option value="">All receipt statuses</option>
								<option value="received">Received</option>
								<option value="not_received">Not Received</option>
								<option value="wrong_order">Wrong Order</option>
							</select>
						</label>

						<label>
							<span>Status</span>
							<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
								<option value="">All statuses</option>
								<option value="pending">Pending</option>
								<option value="reviewed">Reviewed</option>
								<option value="resolved">Resolved</option>
							</select>
						</label>

						<label>
							<span>Rows</span>
							<select value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
						</label>

						<button type="button" className="dashboard-refresh-btn" onClick={() => void loadEnquiries()} disabled={isLoading}>
							{isLoading ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>
				</div>

				{error ? <p className="message error">{error}</p> : null}

				<div className="shipments-scroll">
					<table className="shipments-table" aria-label="Enquiries table">
						<thead>
							<tr>
								<th>Enquiry ID</th>
								<th>Order ID</th>
								<th>AWB</th>
								<th>Customer</th>
								<th>Receipt Status</th>
								<th>Status</th>
								<th>Submitted</th>
								<th>Details</th>
							</tr>
						</thead>
						<tbody>
							{filteredRows.length === 0 && !isLoading ? (
								<tr>
									<td colSpan="8" className="empty-cell">
										No enquiries found
									</td>
								</tr>
							) : null}

							{visibleRows.map((enquiry) => (
								<tr key={enquiry.enquiry_id}>
									<td className="mono-text">{enquiry.enquiry_id}</td>
									<td className="mono-text">{enquiry.order_id}</td>
									<td className="mono-text">{enquiry.shipment_awb || '-'}</td>
									<td>
										{enquiry.customer_name || '-'}
										<br />
										<span className="muted-text small-text">{enquiry.customer_phone || ''}</span>
									</td>
									<td>
										<span className={getReceiptStatusClass(enquiry.receipt_status)}>{formatReceiptStatus(enquiry.receipt_status).toUpperCase()}</span>
									</td>
									<td>
										<span className={getStatusClass(enquiry.status)}>{formatStatusText(enquiry.status).toUpperCase()}</span>
									</td>
									<td className="mono-text">{new Date(enquiry.created_at).toLocaleString()}</td>
									<td>
										<button type="button" className="enquiry-details-button" onClick={() => setSelectedEnquiry(enquiry)}>
											Details
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{selectedEnquiry ? <EnquiryDetailsModal enquiry={selectedEnquiry} onClose={() => setSelectedEnquiry(null)} /> : null}

				<div className="shipments-pager">
					<span className="muted-text small-text">
						Showing {visibleRows.length} of {filteredRows.length} enquiries.
					</span>
					<div className="pagination-controls" aria-label="Enquiry pagination">
						<button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
							Previous
						</button>
						{pageNumbers.map((pageNumber) => (
							<button
								type="button"
								className={pageNumber === currentPage ? 'is-active' : ''}
								onClick={() => setCurrentPage(pageNumber)}
								key={pageNumber}
							>
								{pageNumber}
							</button>
						))}
						<button
							type="button"
							onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
							disabled={currentPage === totalPages}
						>
							Next
						</button>
					</div>
				</div>
			</div>
		</section>
	)
}

export default EnquiryDashboard
