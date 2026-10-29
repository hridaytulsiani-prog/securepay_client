import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../api/client'
import paymentQr from '../assets/payment-qr.png'
import escrosafeLogo from '../assets/escrosafe-logo.png'

const CHECKOUT_SESSION_TTL_MS = 10 * 60 * 1000

function valueOrDash(value) {
	return value ? String(value) : '-'
}

function formatRemainingTime(milliseconds) {
	const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatAmount(amount, currency = 'INR') {
	const numericAmount = Number(amount)
	if (!Number.isFinite(numericAmount)) {
		return amount ? `${currency} ${amount}` : '-'
	}

	if (currency === 'INR') {
		return `₹ ${numericAmount.toLocaleString('en-IN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`
	}

	return `${currency} ${numericAmount.toLocaleString('en-IN', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`
}

function clearSecurePayActiveSession(sessionId) {
	try {
		const storagePrefix = 'securepay.activeSession.'
		for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
			const key = window.localStorage.key(index)
			if (!key || !key.startsWith(storagePrefix)) {
				continue
			}

			const session = JSON.parse(window.localStorage.getItem(key) || 'null')
			if (session?.session_id === sessionId) {
				window.localStorage.removeItem(key)
			}
		}
	} catch {
		// Local storage can be unavailable in private or embedded browser contexts.
	}
}

function CheckoutConfirm() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const sessionId = searchParams.get('session_id') || ''
	const paymentReady = searchParams.get('payment_ready') === '1'
	const [session, setSession] = useState(null)
	const [paymentData, setPaymentData] = useState(null)

	const [loading, setLoading] = useState(true)
	const [message, setMessage] = useState('')
	const [simulating, setSimulating] = useState('')
	const [remainingMs, setRemainingMs] = useState(CHECKOUT_SESSION_TTL_MS)

	const customer = session?.customer_snapshot || {}
	const order = session?.order_snapshot || {}
	const merchant = session?.merchant || {}
	const isTestMode = Boolean(session?.test_mode)
	const isPaymentReady = paymentReady || ['created', 'confirmed', 'payment_started'].includes(session?.status)
	const isSessionExpired = session?.status === 'created' && remainingMs <= 0
	const amountLabel = useMemo(() => formatAmount(order.amount, order.currency || 'INR'), [order.amount, order.currency])

	useEffect(() => {
		if (!sessionId) {
			setMessage('Checkout session is missing.')
			setLoading(false)
			return
		}

		fetch(`${API_BASE_URL}/payments/v1/checkout-sessions/${encodeURIComponent(sessionId)}/`, {
			headers: { 'ngrok-skip-browser-warning': 'true' },
		})
			.then(async (response) => {
				const body = await response.json().catch(() => ({}))
				if (!response.ok) {
					throw new Error(body.error || 'Could not load checkout session.')
				}
				if (body.status && body.status !== 'created') {
					clearSecurePayActiveSession(sessionId)
				}
				setSession(body)
			})
			.catch((error) => {
				clearSecurePayActiveSession(sessionId)
				setMessage(error.message || 'Could not load checkout session.')
			})
			.finally(() => setLoading(false))
	}, [sessionId])

	useEffect(() => {
		if (!sessionId || !session || isTestMode || !isPaymentReady || isSessionExpired || paymentData) return undefined
		let cancelled = false
		const timer = window.setTimeout(async () => {
			setMessage('')
			try {
				const response = await fetch(`${API_BASE_URL}/payments/v1/checkout-sessions/${encodeURIComponent(sessionId)}/payment/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
					body: JSON.stringify({ payment_mode: 'UPI_QR' }),
				})
				const body = await response.json().catch(() => ({}))
				if (!response.ok || (!body.qr_image_url && !body.mock)) {
					throw new Error(body.error || 'Could not load the UPI QR code.')
				}
				if (!cancelled) setPaymentData(body)
			} catch (error) {
				if (!cancelled) setMessage(error.message || 'Could not load the UPI QR code.')
			}
		}, 0)
		return () => { cancelled = true; window.clearTimeout(timer) }
	}, [isPaymentReady, isSessionExpired, isTestMode, paymentData, session, sessionId])

	async function simulateTestPayment(outcome) {
		setMessage('')
		setSimulating(outcome)
		try {
			const response = await fetch(`${API_BASE_URL}/payments/v1/checkout-sessions/${encodeURIComponent(sessionId)}/test-outcome/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
				body: JSON.stringify({ outcome }),
			})
			const body = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(body.error || 'Could not simulate the test payment.')
			clearSecurePayActiveSession(sessionId)
			navigate(`/checkout/payment-result?session_id=${encodeURIComponent(sessionId)}&status=${body.status.toLowerCase()}`)
		} catch (error) {
			setMessage(error.message || 'Could not simulate the test payment.')
			setSimulating('')
		}
	}

	useEffect(() => {
		if (!paymentData || !sessionId) return undefined
		const checkPayment = async () => {
			try {
				const response = await fetch(`${API_BASE_URL}/payments/v1/checkout-sessions/${encodeURIComponent(sessionId)}/payment-status/`, {
					headers: { 'ngrok-skip-browser-warning': 'true' },
				})
				const body = await response.json().catch(() => ({}))
				if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(body.status)) {
					navigate(`/checkout/payment-result?session_id=${encodeURIComponent(sessionId)}&status=${body.status.toLowerCase()}`)
				}
			} catch {
				// A temporary status check failure should not remove a valid QR.
			}
		}
		const interval = window.setInterval(checkPayment, 3000)
		return () => window.clearInterval(interval)
	}, [navigate, paymentData, sessionId])

	useEffect(() => {
		if (!session?.created_at) {
			setRemainingMs(CHECKOUT_SESSION_TTL_MS)
			return undefined
		}

		const createdAt = new Date(session.created_at).getTime()
		if (!Number.isFinite(createdAt)) {
			setRemainingMs(CHECKOUT_SESSION_TTL_MS)
			return undefined
		}

		const expiresAt = createdAt + CHECKOUT_SESSION_TTL_MS
		const tick = () => setRemainingMs(Math.max(0, expiresAt - Date.now()))
		tick()
		const timer = window.setInterval(tick, 1000)
		return () => window.clearInterval(timer)
	}, [session?.created_at])

	return (
		<section className="checkout-confirm-page">
			<div className="checkout-confirm-shell">
				{loading ? (
					<div className="checkout-confirm-card">
						<p className="checkout-confirm-muted">Loading checkout details...</p>
					</div>
				) : session ? (
					<div className="aggregator-payment-layout">
						<aside className="securepay-webhook-toast" role="status" aria-live="polite">
							<div className="securepay-webhook-toast-head">
								<div>
									<img className="securepay-webhook-toast-logo" src={escrosafeLogo} alt="EscroSafe" />
									<strong>{isTestMode ? 'Test checkout received' : 'New order received'}</strong>
								</div>
								<strong>{amountLabel}</strong>
							</div>
							<dl className="securepay-webhook-toast-details">
								<div><dt>Merchant</dt><dd>{valueOrDash(merchant.name)}</dd></div>
								<div><dt>Order ID</dt><dd>{valueOrDash(order.order_id)}</dd></div>
								<div><dt>Customer</dt><dd>{valueOrDash(customer.name)}</dd></div>
								<div><dt>Phone</dt><dd>{valueOrDash(customer.phone)}</dd></div>
								<div className="securepay-webhook-toast-wide"><dt>Delivery</dt><dd>{valueOrDash(customer.address)}</dd></div>
							</dl>
							<p className="securepay-webhook-toast-note">If any detail is incorrect, do not proceed with payment.</p>
						</aside>

						<div className="checkout-confirm-card checkout-payment-card">
							<div className="aggregator-payment-box">
								<span>{isTestMode ? 'EscroSafe integration test' : 'Complete your payment'}</span>
								{isTestMode ? (
									<div className="checkout-test-simulator">
										<strong>TEST MODE</strong>
										<h1>No real payment will be made</h1>
										<p>The button, merchant key, mapped order fields and EscroSafe checkout redirect are working. Choose a result to finish this test.</p>
										<div className="checkout-test-actions">
											<button type="button" className="is-success" onClick={() => simulateTestPayment('success')} disabled={Boolean(simulating)}>{simulating === 'success' ? 'Simulating...' : 'Simulate success'}</button>
											<button type="button" onClick={() => simulateTestPayment('failed')} disabled={Boolean(simulating)}>{simulating === 'failed' ? 'Simulating...' : 'Simulate failure'}</button>
											<button type="button" onClick={() => simulateTestPayment('cancelled')} disabled={Boolean(simulating)}>{simulating === 'cancelled' ? 'Simulating...' : 'Simulate cancellation'}</button>
										</div>
									</div>
								) : paymentData ? (
									<a
										className="aggregator-qr-card"
										href={paymentData.mock ? paymentData.mock_control_url : undefined}
										target={paymentData.mock ? '_blank' : undefined}
										rel={paymentData.mock ? 'noreferrer' : undefined}
										aria-label={paymentData.mock ? 'Open mock UPI payment controls' : 'UPI payment QR code'}
									>
										<img src={paymentData.qr_image_url || paymentQr} alt="Scan with any UPI app to pay" />
									</a>
								) : (
									<div className="aggregator-qr-loading" role="status">Generating secure UPI QR...</div>
								)}
								{!isTestMode ? <><strong>Payment of {amountLabel}</strong><small>{isSessionExpired ? 'QR code expired' : `QR code is valid for ${formatRemainingTime(remainingMs)} minutes`}</small>{paymentData?.mock ? <small className="aggregator-mock-hint">Local test: click the QR to simulate a UPI result.</small> : null}</> : null}

								{!isTestMode ? <p className="aggregator-terms-text">
									By paying, you accept <img className="aggregator-terms-logo" src={escrosafeLogo} alt="EscroSafe" /> <a className="aggregator-terms-link" href="/terms" target="_blank" rel="noreferrer">
										Terms &amp; Conditions
										<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
									</a>
								</p> : null}

								{message ? <p className="checkout-confirm-message">{message}</p> : null}
							</div>
						</div>
					</div>
				) : (
					<div className="checkout-confirm-card">
						<div className="checkout-confirm-empty">
							<h1>Checkout unavailable</h1>
							<p>{message || 'This EscroSafe checkout session could not be loaded.'}</p>
							<Link to="/create-order">Back to test order</Link>
						</div>
					</div>
				)}
			</div>
		</section>
	)
}

export default CheckoutConfirm
