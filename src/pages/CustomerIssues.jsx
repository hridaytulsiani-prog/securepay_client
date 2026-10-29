import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../api/client'
import { getForwardedCustomerIssues, sendForwardedCustomerIssueMessage } from '../api/customerIssues'
import { CourierLogoCell } from '../components/CourierLogo'

const STATUS_CLASS = { new: 'status-pending', in_progress: 'status-pending', resolved: 'status-success' }

function formatDate(value) {
	if (!value) return '-'
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTime(value) {
	const parsed = value ? new Date(value) : null
	return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''
}

function pretty(value) {
	return String(value || '-').replace(/[_-]+/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function deliveryClass(value) {
	const normalized = String(value || '').toUpperCase()
	if (normalized.includes('DELIVERED') && !normalized.includes('RTO')) return 'status-success'
	if (['FAILED', 'CANCEL', 'RTO', 'DAMAGED', 'LOST'].some((term) => normalized.includes(term))) return 'status-failed'
	return 'status-pending'
}

function fileUrl(value) {
	if (!value) return '#'
	return /^https?:\/\//i.test(value) ? value : `${API_BASE_URL}${value}`
}

function isImage(file) {
	return String(file.content_type || '').startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name || '')
}

function isVideo(file) {
	return String(file.content_type || '').startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name || '')
}

function AttachmentLink({ file, compact = false }) {
	if (!compact && isVideo(file)) {
		return (
			<div className="customer-issue-file is-video">
				<video controls preload="metadata" src={fileUrl(file.url)} aria-label={file.name || 'Customer unboxing video'} />
				<a className="customer-issue-file-video-link" href={fileUrl(file.url)} target="_blank" rel="noreferrer">
					<span><strong>{file.name || 'Customer unboxing video'}</strong><small>Open video in a new tab</small></span>
					<span aria-hidden="true">↗</span>
				</a>
			</div>
		)
	}

	if (compact && isImage(file)) {
		return (
			<a className="customer-issue-message-image" href={fileUrl(file.url)} target="_blank" rel="noreferrer">
				<img src={fileUrl(file.url)} alt={file.name || 'Merchant attachment'} />
				<span>{file.name || 'Image attachment'}</span>
			</a>
		)
	}

	return (
		<a className={`customer-issue-file${compact ? ' is-compact' : ''}`} href={fileUrl(file.url)} target="_blank" rel="noreferrer">
			{isImage(file) ? <img src={fileUrl(file.url)} alt="" /> : <span className="customer-issue-file-icon">{isVideo(file) ? 'VIDEO' : 'PDF'}</span>}
			<span><strong>{file.name || 'Attachment'}</strong><small>Open file</small></span>
		</a>
	)
}

function SelectedFileChip({ file, onRemove }) {
	const [previewUrl, setPreviewUrl] = useState('')

	useEffect(() => {
		if (!String(file.type || '').startsWith('image/')) return undefined
		let active = true
		const reader = new FileReader()
		reader.addEventListener('load', () => {
			if (active) setPreviewUrl(String(reader.result || ''))
		})
		reader.readAsDataURL(file)
		return () => { active = false }
	}, [file])

	return (
		<span className="customer-issue-selected-file">
			{previewUrl ? <img src={previewUrl} alt="" /> : <span className="customer-issue-selected-file-type">PDF</span>}
			<strong title={file.name}>{file.name}</strong>
			<button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove}>
				<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7-7 7" /></svg>
			</button>
		</span>
	)
}

function CustomerIssueDetails({ issue, onClose, onSent }) {
	const [draft, setDraft] = useState('')
	const [files, setFiles] = useState([])
	const [sending, setSending] = useState(false)
	const [accepting, setAccepting] = useState(false)
	const [showAcceptConfirm, setShowAcceptConfirm] = useState(false)
	const [challengeOpen, setChallengeOpen] = useState(false)
	const [error, setError] = useState('')
	const fileInputRef = useRef(null)
	const merchantName = issue.merchant_name || 'Merchant'
	const emailSubject = `Customer issue ${issue.reference} · Order ${issue.order_id || '-'}`
	const acceptedPrefixes = ['Accepted issue:', 'Acknowledged:']
	const hasAccepted = issue.messages?.some((message) => message.sender === 'merchant' && acceptedPrefixes.some((prefix) => String(message.body || '').startsWith(prefix)))

	async function handleSend(event) {
		event.preventDefault()
		if ((!draft.trim() && files.length === 0) || sending) return
		setSending(true)
		setError('')
		try {
			const challengeMessage = draft.trim()
				? `Challenged issue: ${draft.trim()}`
				: 'Challenged issue: Supporting evidence attached.'
			await sendForwardedCustomerIssueMessage(issue.id, { body: challengeMessage, attachments: files })
			setDraft('')
			setFiles([])
			setChallengeOpen(false)
			if (fileInputRef.current) fileInputRef.current.value = ''
			await onSent()
		} catch (requestError) {
			setError(requestError.message || 'Your response could not be sent.')
		} finally {
			setSending(false)
		}
	}

	async function handleAccept() {
		if (accepting || hasAccepted) return
		setAccepting(true)
		setError('')
		try {
			await sendForwardedCustomerIssueMessage(issue.id, { body: 'Accepted issue: We confirm that this customer issue is valid and requires action from our side. Please proceed with a refund to the customer.' })
			setShowAcceptConfirm(false)
			setChallengeOpen(false)
			await onSent()
		} catch (requestError) {
			setError(requestError.message || 'The issue acceptance could not be sent.')
		} finally {
			setAccepting(false)
		}
	}

	return (
		<div className="issue-modal-backdrop" role="presentation" onMouseDown={onClose}>
			<section className="issue-modal customer-issue-detail-modal" role="dialog" aria-modal="true" aria-labelledby="customer-issue-title" onMouseDown={(event) => event.stopPropagation()}>
				<div className="issue-modal-head customer-issue-detail-head">
					<div>
						<span className="customer-issue-modal-kicker">Forwarded by EscroSafe</span>
						<div className="customer-issue-title-row"><h2 id="customer-issue-title">{issue.reference}</h2><span className={`status-badge ${STATUS_CLASS[issue.status] || 'status-pending'}`}>{issue.status_label}</span></div>
						<p>Review the customer report and reply to the EscroSafe team.</p>
					</div>
					<button type="button" className="issue-modal-close" aria-label="Close details" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
				</div>

				<div className="customer-issue-summary-grid">
					<div><span>Order ID</span><strong>{issue.order_id || '-'}</strong></div><div><span>Customer</span><strong>{issue.customer_name || '-'}</strong></div><div><span>Issue</span><strong>{issue.issue_type_label}</strong></div><div><span>AWB</span><strong>{issue.awb || 'Not available'}</strong></div><div><span>Courier</span><strong>{issue.courier || 'Not assigned'}</strong></div><div><span>Delivery</span><strong><span className={`status-badge ${deliveryClass(issue.delivery_status)}`}>{pretty(issue.delivery_status)}</span></strong></div>
				</div>

				<div className="customer-issue-conversation">
					<div className="customer-issue-section-title"><div><span>Email thread</span><strong>Merchant and EscroSafe Support</strong></div><small>{(issue.messages?.length || 0) + 1} email{issue.messages?.length ? 's' : ''}</small></div>
					<div className="customer-email-thread-subject"><span>Subject</span><h3>{emailSubject}</h3></div>
					<div className={`customer-email-acknowledge${hasAccepted ? ' is-acknowledged' : ''}`}>
						<div><strong>{hasAccepted ? 'Issue accepted' : 'Choose how you want to respond'}</strong><span>{hasAccepted ? 'EscroSafe has received your acceptance and can proceed with the decision.' : 'Accept the customer issue, or challenge it and send supporting details to EscroSafe.'}</span></div>
						<div className="customer-email-decision-actions">
							<button type="button" className="is-accept" disabled={accepting || hasAccepted || challengeOpen} onClick={() => setShowAcceptConfirm(true)}>{accepting ? 'Sending…' : hasAccepted ? 'Accepted' : 'Accept issue'}</button>
							<button type="button" className={`is-challenge${challengeOpen ? ' is-active' : ''}`} disabled={hasAccepted} onClick={() => setChallengeOpen((selected) => !selected)}>{challengeOpen ? 'Unselect challenge' : 'Challenge issue'}</button>
						</div>
					</div>
					<div className="customer-issue-chat customer-email-thread" aria-live="polite">
						<article className="customer-email-message is-escrosafe is-customer-report">
							<header className="customer-email-message-head">
								<span className="customer-email-avatar is-escrosafe"><img src="/short-logo-new.png" alt="" /></span>
								<div><strong>EscroSafe Customer Support</strong><small>To: {merchantName}</small></div>
								<time>{formatTime(issue.raised_at)}</time>
							</header>
							<div className="customer-email-body">
								<b>Customer report</b>
								<p>{issue.description}</p>
								{issue.attachments?.length ? <div className="customer-email-attachments"><span>Attachments · {issue.attachments.length}</span><div className="customer-issue-message-files is-report-evidence">{issue.attachments.map((file) => <AttachmentLink key={file.id} file={file} />)}</div></div> : null}
							</div>
						</article>
						{issue.messages?.map((message) => {
							const fromMerchant = message.sender === 'merchant'
							return (
								<article key={message.id} className={`customer-email-message ${fromMerchant ? 'is-merchant' : 'is-escrosafe'}`}>
									<header className="customer-email-message-head">
										<span className={`customer-email-avatar ${fromMerchant ? 'is-merchant' : 'is-escrosafe'}`}>{fromMerchant ? merchantName.slice(0, 1).toUpperCase() : <img src="/short-logo-new.png" alt="" />}</span>
										<div><strong>{fromMerchant ? merchantName : 'EscroSafe Customer Support'}</strong><small>To: {fromMerchant ? 'EscroSafe Support' : merchantName}</small></div>
										<time>{formatTime(message.created_at)}</time>
									</header>
									<div className="customer-email-body">{message.body ? <p>{message.body}</p> : null}{message.attachments?.length ? <div className="customer-email-attachments"><span>Attachments · {message.attachments.length}</span><div className="customer-issue-message-files">{message.attachments.map((file) => <AttachmentLink key={file.id} file={file} compact />)}</div></div> : null}</div>
								</article>
							)
						})}
					</div>

					{challengeOpen && !hasAccepted ? <form className="customer-issue-reply customer-email-compose" onSubmit={handleSend}>
						{files.length ? <div className="customer-issue-selected-files">{files.map((file, index) => <SelectedFileChip key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} />)}</div> : null}
						<div className="customer-email-reply-label"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 17-6-5 6-5M4 12h8c5 0 8 2 8 7" /></svg><strong>Reply</strong><span>to EscroSafe Support</span></div>
						<textarea autoFocus rows={4} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Explain why you are challenging this issue…" aria-label="Challenge response to EscroSafe" />
						<div className="customer-email-compose-actions">
							<input ref={fileInputRef} className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 4))} />
							<button type="button" className="customer-issue-attach" onClick={() => fileInputRef.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg><span>Attach files</span></button>
							<small>JPG, PNG, WebP or PDF · up to 4 files</small>
							<button type="submit" className="customer-issue-send" disabled={sending || (!draft.trim() && files.length === 0)}>{sending ? 'Sending…' : 'Send message'}</button>
						</div>
					</form> : null}
					{error ? <p className="issue-error" role="alert">{error}</p> : null}
				</div>

				{showAcceptConfirm ? (
					<div className="customer-ack-confirm-backdrop" role="presentation" onMouseDown={() => !accepting && setShowAcceptConfirm(false)}>
						<section className="customer-ack-confirm" role="alertdialog" aria-modal="true" aria-labelledby="customer-ack-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
							<span className="customer-ack-confirm-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4L12 3Zm0 6v5m0 3v.1" /></svg></span>
							<div><span>Confirm acceptance</span><h3 id="customer-ack-confirm-title">Accept this customer issue?</h3><p>This will notify EscroSafe that the issue is valid and request a refund for the customer.</p></div>
							<div className="customer-ack-confirm-actions"><button type="button" className="is-cancel" disabled={accepting} onClick={() => setShowAcceptConfirm(false)}>Cancel</button><button type="button" className="is-confirm" disabled={accepting} onClick={handleAccept}>{accepting ? 'Sending…' : 'Accept issue'}</button></div>
						</section>
					</div>
				) : null}
			</section>
		</div>
	)
}

function CustomerIssues() {
	const [searchParams, setSearchParams] = useSearchParams()
	const [issues, setIssues] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [query, setQuery] = useState('')
	const [selectedIssueId, setSelectedIssueId] = useState(null)
	const requestedIssueId = Number(searchParams.get('issue')) || null
	const activeIssueId = selectedIssueId || requestedIssueId
	const selectedIssue = issues.find((issue) => issue.id === activeIssueId) || null

	const loadIssues = useCallback(async () => {
		setLoading(true)
		try {
			const data = await getForwardedCustomerIssues()
			const results = Array.isArray(data?.results) ? data.results : []
			setIssues(results)
			setError('')
			return results
		} catch (requestError) {
			setError(requestError.message || 'Customer issues could not be loaded.')
			return []
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		let active = true
		getForwardedCustomerIssues()
			.then((data) => {
				if (!active) return
				setIssues(Array.isArray(data?.results) ? data.results : [])
				setError('')
			})
			.catch((requestError) => {
				if (active) setError(requestError.message || 'Customer issues could not be loaded.')
			})
			.finally(() => {
				if (active) setLoading(false)
			})
		return () => { active = false }
	}, [])

	const handleCloseIssue = useCallback(() => {
		setSelectedIssueId(null)
		setSearchParams({}, { replace: true })
	}, [setSearchParams])

	useEffect(() => {
		if (!selectedIssue) return undefined
		const closeOnEscape = (event) => event.key === 'Escape' && handleCloseIssue()
		document.addEventListener('keydown', closeOnEscape)
		return () => document.removeEventListener('keydown', closeOnEscape)
	}, [selectedIssue, handleCloseIssue])

	const filteredIssues = useMemo(() => {
		const needle = query.trim().toLowerCase()
		if (!needle) return issues
		return issues.filter((issue) => [issue.reference, issue.order_id, issue.customer_name, issue.issue_type_label, issue.status_label].some((value) => String(value || '').toLowerCase().includes(needle)))
	}, [issues, query])

	function handleOpenIssue(issue) {
		setSelectedIssueId(issue.id)
		setSearchParams({ issue: String(issue.id) })
	}

	async function handleMessageSent() {
		await loadIssues()
	}

	return (
		<section className="dashboard-page customer-issues-page">
			<div className="dashboard-overview">
				<div className="dashboard-hero">
					<div>
						<p className="dashboard-eyebrow">
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V17h-.5A2.5 2.5 0 0 1 4 14.5v-8Zm4 1.5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8Zm0 3.5a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H8Z" />
							</svg>
							Customer reports
						</p>
						<h2 className="dashboard-title">Customer Issues</h2>
						<p>Review customer concerns forwarded by EscroSafe and respond with updates or supporting files.</p>
					</div>
				</div>
			</div>
			<div className="card table-card customer-issues-card">
				<div className="customer-issues-toolbar"><div><h3>Forwarded issues</h3><span>{issues.length} total</span></div><label><span className="sr-only">Search customer issues</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, order or customer" /></label><button type="button" className="issue-btn" disabled={loading} onClick={loadIssues}>{loading ? 'Refreshing...' : 'Refresh'}</button></div>
				{error ? <p className="message error">{error}</p> : null}
				{loading && issues.length === 0 ? <p className="support-empty">Loading forwarded customer issues...</p> : null}
				{!loading && issues.length === 0 ? <p className="customer-issues-empty">No customer issues have been forwarded to you. New forwarded issues will appear here and in Notifications.</p> : null}
				{issues.length > 0 && filteredIssues.length === 0 ? <p className="customer-issues-empty">No forwarded issues match your search.</p> : null}
				{filteredIssues.length > 0 ? <div className="shipments-scroll"><table className="shipments-table customer-issues-table" aria-label="Forwarded customer issues"><thead><tr><th>Ticket ID</th><th>Forwarded</th><th>Order ID</th><th>Customer</th><th>Issue</th><th>Courier</th><th>Delivery</th><th>Status</th><th>Response</th><th>Details</th></tr></thead><tbody>{filteredIssues.map((issue) => <tr key={issue.id}><td className="mono-text">{issue.reference}</td><td className="order-date-cell">{formatDate(issue.forwarded_at)}</td><td className="mono-text">{issue.order_id}</td><td>{issue.customer_name}</td><td className="customer-issue-type-cell">{issue.issue_type_label}</td><td><CourierLogoCell courier={issue.courier} /></td><td><span className={`status-badge ${deliveryClass(issue.delivery_status)}`}>{pretty(issue.delivery_status)}</span></td><td><span className={`status-badge ${STATUS_CLASS[issue.status] || 'status-pending'}`}>{issue.status_label}</span></td><td><span className={`customer-response-state ${issue.merchant_responded ? 'has-response' : ''}`}>{issue.merchant_responded ? 'Sent' : 'Waiting'}</span></td><td><button type="button" className="issue-btn issue-btn-small" onClick={() => handleOpenIssue(issue)}>Open</button></td></tr>)}</tbody></table></div> : null}
			</div>
			{selectedIssue ? <CustomerIssueDetails issue={selectedIssue} onClose={handleCloseIssue} onSent={handleMessageSent} /> : null}
		</section>
	)
}

export default CustomerIssues
