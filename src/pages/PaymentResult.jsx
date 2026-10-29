import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../api/client'
import escrosafeLogo from '../assets/escrosafe-logo.png'

const LABELS = {
	SUCCESS: ['Payment successful', 'Your payment was securely recorded for this order.'],
	PENDING: ['Payment pending', 'The provider is still processing this payment. You can check again.'],
	FAILED: ['Payment failed', 'No successful payment was recorded. You can return and try again.'],
	CANCELLED: ['Payment cancelled', 'The payment was cancelled before completion.'],
	NOT_STARTED: ['Payment not started', 'Return to checkout to begin the payment.'],
}

function buildReturnUrl(value, status, orderId, testMode = false) {
	try {
		const destination = testMode ? (value || '/checkout') : status === 'SUCCESS' ? '/create-order' : (value || '/checkout')
		const url = new URL(destination, window.location.origin)
		if (!['http:', 'https:'].includes(url.protocol)) return '/checkout'
		url.searchParams.set(testMode ? 'escrosafe_test_status' : 'payment_status', status.toLowerCase())
		if (orderId) url.searchParams.set('order_id', orderId)
		return url.toString()
	} catch {
		return '/checkout'
	}
}

function PaymentResult() {
	const [searchParams] = useSearchParams()
	const sessionId = searchParams.get('session_id') || ''
	const [result, setResult] = useState(null)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(true)

	const checkStatus = async () => {
		setLoading(true)
		setError('')
		try {
			const response = await fetch(`${API_BASE_URL}/payments/v1/checkout-sessions/${encodeURIComponent(sessionId)}/payment-status/`, {
				headers: { 'ngrok-skip-browser-warning': 'true' },
			})
			const body = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(body.error || 'Could not check payment status.')
			setResult(body)
		} catch (requestError) {
			setError(requestError.message || 'Could not check payment status.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		const timer = window.setTimeout(() => {
			if (sessionId) checkStatus()
			else { setError('Checkout session is missing.'); setLoading(false) }
		}, 0)
		return () => window.clearTimeout(timer)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId])

	const status = result?.status || 'NOT_STARTED'
	const testMode = Boolean(result?.test_mode)
	const copy = testMode
		? [`Test payment ${status.toLowerCase().replace('_', ' ')}`, status === 'SUCCESS' ? 'Your custom website integration completed the full EscroSafe test journey successfully.' : 'The simulated result was recorded. No real payment or order was created.']
		: LABELS[status] || ['Payment status received', result?.message || status]
	const returnUrl = buildReturnUrl(result?.return_url, status, result?.order_id, testMode)

	return (
		<main className="payment-result-page">
			<section className={`payment-result-card is-${status.toLowerCase()}`}>
				<img src={escrosafeLogo} alt="EscroSafe" />
				{testMode ? <span className="payment-result-test-badge">Test mode · no real payment</span> : null}
				<div className="payment-result-icon" aria-hidden="true">
					{status === 'SUCCESS' ? <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" /></svg> : status === 'PENDING' ? '…' : '!'}
				</div>
				<h1>{loading ? 'Checking payment...' : copy[0]}</h1>
				<p>{error || copy[1]}</p>
				{result?.order_id ? <small>Order ID: {result.order_id}</small> : null}
				<div className="payment-result-actions">
					{status === 'PENDING' || error ? <button type="button" onClick={checkStatus} disabled={loading}>Check again</button> : null}
					<a href={returnUrl}>{testMode ? 'Return to merchant website' : status === 'SUCCESS' ? 'Back to order' : 'Back to checkout'}</a>
				</div>
			</section>
		</main>
	)
}

export default PaymentResult
