import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../api/client'
import paymentQr from '../assets/payment-qr.png'
import escrosafeLogo from '../assets/escrosafe-logo.png'
import { clearStoredCart } from '../utils/cart'
import { clearOrderDraft } from '../utils/orderDraft'

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
	const [searchParams] = useSearchParams()
	const sessionId = searchParams.get('session_id') || ''
	const paymentReady = searchParams.get('payment_ready') === '1'
	const [session, setSession] = useState(null)

	// Reaching the payment page means the order exists: the next visit to
	// /create-order starts with an empty cart and a blank form.
	useEffect(() => {
		if (sessionId) {
			clearStoredCart()
			clearOrderDraft()
		}
	}, [sessionId])
	const [loading, setLoading] = useState(true)
	const [message, setMessage] = useState('')
	const [remainingMs, setRemainingMs] = useState(CHECKOUT_SESSION_TTL_MS)

	const customer = session?.customer_snapshot || {}
	const order = session?.order_snapshot || {}
	const merchant = session?.merchant || {}
	const isPaymentReady = paymentReady || session?.status === 'confirmed'
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
									<strong>New order received</strong>
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
								<span>Complete your payment</span>
								<div className="aggregator-qr-card" aria-label="Payment QR code">
									<img src={paymentQr} alt="Scan to pay" />
									{/* Previous placeholder pattern, kept for reference:
									<div className="aggregator-qr-pattern">
										<span />
										<span />
										<span />
									</div>
									*/}
								</div>
								<strong>Payment of {amountLabel}</strong>
								<small>{isSessionExpired ? 'QR code expired' : `QR code is valid for ${formatRemainingTime(remainingMs)} minutes`}</small>

								<p className="aggregator-terms-text">
									By paying, you accept <img className="aggregator-terms-logo" src={escrosafeLogo} alt="EscroSafe" /> <a className="aggregator-terms-link" href="/terms" target="_blank" rel="noreferrer">
										Terms &amp; Conditions
										<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
									</a>
								</p>

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
