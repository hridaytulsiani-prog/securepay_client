// Pop-up with the conversation between the merchant and the EscroSafe team about one issue, laid out like WhatsApp:
// the merchant's own messages on the right (with a merchant avatar), EscroSafe's replies on the left (with the
// EscroSafe lock icon). Days are separated by a small date pill. The merchant can keep writing.
import { useCallback, useEffect, useRef, useState } from 'react'
import { getIssue, sendIssueMessage } from '../api/issues'

const POLL_MS = 10000

function parseDate(value) {
	const parsed = value ? new Date(value) : null
	return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
}

function formatTime(value) {
	const parsed = parseDate(value)
	return parsed ? parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''
}

function dayKey(value) {
	const parsed = parseDate(value)
	return parsed ? `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}` : ''
}

function dayLabel(value) {
	const parsed = parseDate(value)
	if (!parsed) return ''
	const today = new Date()
	const yesterday = new Date()
	yesterday.setDate(today.getDate() - 1)
	if (dayKey(parsed) === dayKey(today)) return 'Today'
	if (dayKey(parsed) === dayKey(yesterday)) return 'Yesterday'
	return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// The merchant's avatar: a person icon (blue, so it stands apart from the green EscroSafe side).
function MerchantAvatar() {
	return (
		<span className="issue-chat-avatar is-merchant" aria-hidden="true">
			<svg viewBox="0 0 24 24">
				<circle cx="12" cy="8.5" r="3.6" />
				<path d="M4.5 20c.5-4 3.5-6.2 7.5-6.2s7 2.2 7.5 6.2" />
			</svg>
		</span>
	)
}

function EscroSafeAvatar() {
	return (
		<span className="issue-chat-avatar is-escrosafe" aria-hidden="true">
			<img src="/short-logo-new.png" alt="" />
		</span>
	)
}

function IssueChatModal({ issue, onClose, onChanged }) {
	const [messages, setMessages] = useState([])
	const [issueStatus, setIssueStatus] = useState({ status: issue.status, label: issue.status_label })
	const [state, setState] = useState('loading')
	const [draft, setDraft] = useState('')
	const [sending, setSending] = useState(false)
	const [error, setError] = useState('')
	const endRef = useRef(null)
	// The status the table behind this pop-up currently shows; when the conversation reports a different one, tell the page.
	const shownStatus = useRef(issue.status)

	const refresh = useCallback(async () => {
		try {
			const data = await getIssue(issue.id)
			setMessages(data.messages || [])
			setIssueStatus({ status: data.status, label: data.status_label })
			setState('ready')
			if (data.status !== shownStatus.current) {
				shownStatus.current = data.status
				onChanged?.()
			}
		} catch {
			setState((current) => (current === 'loading' ? 'error' : current))
		}
	}, [issue.id, onChanged])

	useEffect(() => {
		let active = true
		getIssue(issue.id)
			.then((data) => {
				if (!active) return
				setMessages(data.messages || [])
				setIssueStatus({ status: data.status, label: data.status_label })
				setState('ready')
				if (data.status !== shownStatus.current) {
					shownStatus.current = data.status
					onChanged?.()
				}
			})
			.catch(() => {
				if (active) setState('error')
			})
		const timer = window.setInterval(() => {
			if (active) void refresh()
		}, POLL_MS)
		return () => {
			active = false
			window.clearInterval(timer)
		}
	}, [issue.id, refresh, onChanged])

	useEffect(() => {
		endRef.current?.scrollIntoView({ block: 'end' })
	}, [messages.length, state])

	useEffect(() => {
		const closeOnEscape = (event) => {
			if (event.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', closeOnEscape)
		return () => window.removeEventListener('keydown', closeOnEscape)
	}, [onClose])

	const handleSend = async (event) => {
		event.preventDefault()
		const body = draft.trim()
		if (!body || sending) return
		setSending(true)
		setError('')
		try {
			await sendIssueMessage(issue.id, body)
			setDraft('')
			await refresh()
			onChanged?.()
		} catch (requestError) {
			setError(requestError.message || 'Could not send your message. Please try again.')
		} finally {
			setSending(false)
		}
	}

	const waitingForReply = state === 'ready' && messages.length > 0 && messages.every((message) => message.sender === 'merchant')

	return (
		<div className="issue-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
			<div className="issue-modal issue-chat-modal" role="dialog" aria-modal="true" aria-label={`Conversation about ${issue.reference}`}>
				<div className="issue-chat-head">
					<span className="issue-chat-avatar is-escrosafe is-large" aria-hidden="true">
						<img src="/short-logo-new.png" alt="" />
					</span>
					<div className="issue-chat-title">
						<h2>{issue.reference}</h2>
						<p>{issue.issue_type_label}</p>
					</div>
					<span className={`status-badge ${issueStatus.status === 'resolved' ? 'status-success' : 'status-pending'}`}>{issueStatus.label}</span>
					<button type="button" className="issue-modal-close" aria-label="Close" onClick={onClose}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
					</button>
				</div>

				<div className="issue-chat-body" aria-live="polite">
					{state === 'loading' ? <p className="issue-chat-note">Loading the conversation...</p> : null}
					{state === 'error' ? <p className="issue-chat-note">Could not load the conversation. Please close this and try again.</p> : null}
					{messages.map((message, index) => {
						const isMe = message.sender === 'merchant'
						const startsNewDay = index === 0 || dayKey(message.created_at) !== dayKey(messages[index - 1].created_at)
						return (
							<div key={message.id} className="issue-chat-item">
								{startsNewDay ? <div className="issue-chat-day"><span>{dayLabel(message.created_at)}</span></div> : null}
								<div className={`issue-chat-row ${isMe ? 'is-me' : 'is-them'}`}>
									{isMe ? null : <EscroSafeAvatar />}
									<div className="issue-chat-bubble">
										<span className="issue-chat-who">{isMe ? 'You' : 'EscroSafe'}</span>
										<p>{message.body}</p>
										<time>{formatTime(message.created_at)}</time>
									</div>
									{isMe ? <MerchantAvatar /> : null}
								</div>
							</div>
						)
					})}
					{waitingForReply ? <p className="issue-chat-note">The EscroSafe team has not replied yet. We will answer here.</p> : null}
					<div ref={endRef} />
				</div>

				{issueStatus.status === 'resolved' ? <p className="issue-chat-note is-resolved">This issue is marked resolved. Send a message to reopen it.</p> : null}
				{error ? <p className="issue-error" role="alert">{error}</p> : null}

				<form className="issue-chat-form" onSubmit={handleSend}>
					<textarea
						rows={1}
						maxLength={2000}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !event.shiftKey) handleSend(event)
						}}
						placeholder="Type a message"
						aria-label="Message to EscroSafe"
					/>
					<button type="submit" className="issue-chat-send" aria-label="Send message" title="Send" disabled={sending || !draft.trim()}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-4.5 16-3.5-6.5L4 12Zm8 1.5 3.5-4.5" /></svg>
					</button>
				</form>
			</div>
		</div>
	)
}

export default IssueChatModal
