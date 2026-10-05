import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { API_BASE_URL } from '../api/client'
import { getUser } from '../utils/storage'
import { clearStoredCart, useCart } from '../utils/cart'
import { clearOrderDraft, readOrderDraft, writeOrderDraft } from '../utils/orderDraft'
import { formatInr } from '../constants/storeProducts'
import { readStoredButtonTheme } from '../constants/buttonThemes'
import escrosafeLogo from '../assets/escrosafe-logo.png'
import { AmexLogo, DinersLogo, MastercardLogo, RupayLogo, UpiLogo, VisaLogo } from '../components/PaymentLogos'

const SECUREPAY_BUTTON_SCRIPT_URL = `${window.location.origin}/button.js`
const SECUREPAY_SESSION_API_URL = import.meta.env.VITE_SECUREPAY_SESSION_API_URL || `${API_BASE_URL || window.location.origin}/payments/v1/checkout-sessions/`
const SECUREPAY_BUTTON_CONFIG_URL = import.meta.env.VITE_SECUREPAY_BUTTON_CONFIG_URL || `${API_BASE_URL || window.location.origin}/payments/v1/button-config/`

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank']
// Extra charge added to Cash on Delivery orders (edit here).
const COD_CONVENIENCE_FEE = 100
// Approximate height of the EscroSafe info popover, used to decide whether it opens up or down.
const ESCROW_INFO_HEIGHT = 230

const METHOD_ICONS = {
	card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
	netbanking: <><path d="M3 10l9-6 9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></>,
	upi: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" /></>,
	securepay: <><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.9-7.5-9.5V6z" /><rect x="9" y="11" width="6" height="4.5" rx="1" /><path d="M10.2 11V9.8a1.8 1.8 0 0 1 3.6 0V11" /></>,
	cod: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" /></>,
}

function MethodIcon({ name }) {
	return (
		<span className="oc-method-ico" aria-hidden="true">
			<svg viewBox="0 0 24 24">{METHOD_ICONS[name]}</svg>
		</span>
	)
}

// Order checkout (/checkout without ?session_id=). Details come from /cart via
// the order draft; the EscroSafe SDK button is mounted on the right only when
// "Pay using EscroSafe" is the chosen method.
function Checkout() {
	const user = getUser()
	const merchantKey = user?.merchant_key || user?.merchantKey || user?.publishable_key || ''
	const { cartLines, cartCount, cartTotal } = useCart()
	const [draft, setDraft] = useState(readOrderDraft)

	const buttonHostRef = useRef(null)
	// const pendingSecurePayClickRef = useRef(null)
	const [method, setMethod] = useState('securepay')
	const [bank, setBank] = useState('')
	// const [termsAccepted, setTermsAccepted] = useState(false)
	// const [showTermsModal, setShowTermsModal] = useState(false)
	const [message, setMessage] = useState('')
	const [buttonMountKey, setButtonMountKey] = useState(0)
	const [showAddressModal, setShowAddressModal] = useState(false)
	const [editingAddress, setEditingAddress] = useState(false)
	const [addressForm, setAddressForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', customerAddress: '' })
	const [showCardForm, setShowCardForm] = useState(false)
	const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' })
	const [savedCard, setSavedCard] = useState(null)
	const [showEscrowInfo, setShowEscrowInfo] = useState(false)
	const [escrowInfoAbove, setEscrowInfoAbove] = useState(false)
	const escrowInfoRef = useRef(null)

	// Close the "How EscroSafe works" popover on outside click or Escape.
	useEffect(() => {
		if (!showEscrowInfo) {
			return undefined
		}
		const closeOnOutsideClick = (event) => {
			if (!escrowInfoRef.current?.contains(event.target)) {
				setShowEscrowInfo(false)
			}
		}
		const closeOnEscape = (event) => {
			if (event.key === 'Escape') {
				setShowEscrowInfo(false)
			}
		}
		document.addEventListener('mousedown', closeOnOutsideClick)
		document.addEventListener('keydown', closeOnEscape)
		return () => {
			document.removeEventListener('mousedown', closeOnOutsideClick)
			document.removeEventListener('keydown', closeOnEscape)
		}
	}, [showEscrowInfo])

	// Terms popup disabled for now, kept for later. While off, the SDK is not intercepted and goes straight to checkout.
	/*
	useEffect(() => {
		const handleBeforeStart = (event) => {
			if (termsAccepted) {
				return
			}

			event.preventDefault()
			pendingSecurePayClickRef.current = event.detail?.continueCheckout || null
			setShowTermsModal(true)
		}

		window.addEventListener('securepay:before-start', handleBeforeStart)
		return () => window.removeEventListener('securepay:before-start', handleBeforeStart)
	}, [termsAccepted])
	*/

	// The order exists once the SDK has created its session, so the next visit to
	// /create-order starts with an empty cart and a blank form.
	useEffect(() => {
		const handleSessionCreated = () => {
			clearStoredCart()
			clearOrderDraft()
		}

		window.addEventListener('securepay:session-created', handleSessionCreated)
		return () => window.removeEventListener('securepay:session-created', handleSessionCreated)
	}, [])

	useEffect(() => {
		const handlePageShow = (event) => {
			if (event.persisted) {
				setButtonMountKey((currentKey) => currentKey + 1)
			}
		}

		window.addEventListener('pageshow', handlePageShow)
		return () => window.removeEventListener('pageshow', handlePageShow)
	}, [])

	useEffect(() => {
		const host = buttonHostRef.current
		if (!host || !merchantKey || method !== 'securepay') {
			return undefined
		}

		const clearButtonHost = () => {
			Array.from(host.children).forEach((child) => {
				if (typeof child.securePayDestroy === 'function') {
					child.securePayDestroy()
				}
			})
			host.innerHTML = ''
		}

		clearButtonHost()

		const mountButton = () => {
			clearButtonHost()
			window.SecurePay?.button?.mount({
				merchantKey,
				buttonText: 'Pay with',
				buttonTheme: readStoredButtonTheme(),
				buttonLogoUrl: `${window.location.origin}/escrosafe-logo.png`,
				sessionApiUrl: SECUREPAY_SESSION_API_URL,
				configApiUrl: SECUREPAY_BUTTON_CONFIG_URL,
				target: host,
			})
		}

		if (window.SecurePay?.button?.mount) {
			mountButton()
			return () => {
				clearButtonHost()
			}
		}

		const script = document.createElement('script')
		script.src = SECUREPAY_BUTTON_SCRIPT_URL
		script.async = true
		script.setAttribute('data-auto-render', 'false')
		script.onload = mountButton
		script.onerror = () => setMessage('Could not load EscroSafe button SDK from this frontend URL.')
		document.body.appendChild(script)

		return () => {
			clearButtonHost()
		}
	}, [merchantKey, buttonMountKey, method])

	if (!cartLines.length || !draft) {
		return <Navigate to="/cart" replace />
	}

	// Terms popup disabled for now, kept for later:
	/*
	const continueAfterTerms = (accepted) => {
		setTermsAccepted(accepted)
		setShowTermsModal(false)
		const continueCheckout = pendingSecurePayClickRef.current
		pendingSecurePayClickRef.current = null
		if (typeof continueCheckout === 'function') {
			continueCheckout()
		}
	}
	*/

	const useThisPaymentMethod = () => {
		const labels = { card: 'Credit or debit card', netbanking: 'Net Banking', upi: 'Scan and Pay with UPI', cod: 'Cash on Delivery' }
		setMessage(`${labels[method] || 'This method'} is available as a fallback option. Choose "Pay with EscroSafe" to complete the payment.`)
	}

	const openAddressModal = () => {
		setAddressForm({
			customerName: draft.customerName || '',
			customerPhone: draft.customerPhone || '',
			customerEmail: draft.customerEmail || '',
			customerAddress: draft.customerAddress || '',
		})
		setEditingAddress(false)
		setShowAddressModal(true)
	}

	const confirmAddress = () => {
		if (!addressForm.customerName.trim() || !addressForm.customerPhone.trim() || !addressForm.customerAddress.trim()) {
			setMessage('Please fill in name, phone and address before confirming.')
			return
		}
		const nextDraft = { ...draft, ...addressForm }
		writeOrderDraft(nextDraft)
		setDraft(nextDraft)
		setShowAddressModal(false)
		setButtonMountKey((currentKey) => currentKey + 1)
	}

	const addCard = () => {
		const digits = cardForm.number.replace(/\D/g, '')
		if (digits.length < 12 || !cardForm.name.trim() || !/^\d{2}\/\d{2}$/.test(cardForm.expiry) || !/^\d{3,4}$/.test(cardForm.cvv)) {
			setMessage('Enter a valid card number, name, expiry (MM/YY) and CVV.')
			return
		}
		// Only the last 4 digits are kept, and only in memory.
		setSavedCard({ last4: digits.slice(-4), name: cardForm.name.trim() })
		setCardForm({ number: '', name: '', expiry: '', cvv: '' })
		setShowCardForm(false)
	}

	const canUseMethod = (method === 'card' && Boolean(savedCard)) || (method === 'netbanking' && Boolean(bank)) || method === 'upi' || method === 'cod'

	const methodClass = (id) => `oc-method${method === id ? ' selected' : ''}`

	return (
		<div className="oc-page so-page">
			<header className="oc-header">
				<span />
				<h1>Secure checkout</h1>
				<Link to="/cart" className="oc-cart-link">
					<span className="oc-cart-ico" aria-hidden="true">&#128722;</span>
					<span>Cart</span>
					<span className="oc-badge">{cartCount}</span>
				</Link>
			</header>

			<main className="oc-body">
				<div className="oc-left">
					<section className="oc-card">
						<div className="oc-deliver">
							<div>
								<h2>Delivering to {draft.customerName}</h2>
								<p>{draft.customerAddress}</p>
								<p className="oc-muted">
									{draft.customerPhone}
									{draft.customerEmail ? ` · ${draft.customerEmail}` : ''}
								</p>
							</div>
							<button type="button" className="oc-change" onClick={openAddressModal}>Change</button>
						</div>
					</section>

					<section className="oc-card">
						<h2 className="oc-section-title">Payment method</h2>
						<div className="oc-methods">
							<label className={methodClass('card')}>
								<input type="radio" name="payment-method" checked={method === 'card'} onChange={() => setMethod('card')} />
								<div>
									<strong className="oc-method-title"><MethodIcon name="card" />Credit or debit card</strong>
									<div className="oc-brands">
										<VisaLogo />
										<MastercardLogo />
										<AmexLogo />
										<DinersLogo />
										<RupayLogo />
									</div>
									{method === 'card' ? (
										<div className="oc-card-area">
											{savedCard ? <p className="oc-note">Card ending {savedCard.last4} ({savedCard.name})</p> : null}
											{showCardForm ? (
												<div className="oc-card-form">
													<input type="text" inputMode="numeric" autoComplete="off" placeholder="Card number" value={cardForm.number} onChange={(event) => setCardForm({ ...cardForm, number: event.target.value })} />
													<input type="text" autoComplete="off" placeholder="Name on card" value={cardForm.name} onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })} />
													<input type="text" autoComplete="off" placeholder="MM/YY" maxLength={5} value={cardForm.expiry} onChange={(event) => setCardForm({ ...cardForm, expiry: event.target.value })} />
													<input type="password" inputMode="numeric" autoComplete="off" placeholder="CVV" maxLength={4} value={cardForm.cvv} onChange={(event) => setCardForm({ ...cardForm, cvv: event.target.value })} />
													<button type="button" className="so-btn-add" onClick={addCard}>Add card</button>
												</div>
											) : (
												<button type="button" className="oc-link-btn" onClick={() => setShowCardForm(true)}>+ Add a new credit or debit card</button>
											)}
										</div>
									) : null}
								</div>
							</label>

							<label className={methodClass('netbanking')}>
								<input type="radio" name="payment-method" checked={method === 'netbanking'} onChange={() => setMethod('netbanking')} />
								<div>
									<strong className="oc-method-title"><MethodIcon name="netbanking" />Net Banking</strong>
									<select value={bank} onChange={(event) => { setBank(event.target.value); setMethod('netbanking') }} aria-label="Choose a bank">
										<option value="">Choose an Option</option>
										{BANKS.map((name) => <option key={name} value={name}>{name}</option>)}
									</select>
								</div>
							</label>

							<label className={methodClass('upi')}>
								<input type="radio" name="payment-method" checked={method === 'upi'} onChange={() => setMethod('upi')} />
								<div>
									<strong className="oc-logo-label oc-method-title"><MethodIcon name="upi" />Scan and Pay with <UpiLogo /></strong>
									{method === 'upi' ? <p className="oc-note">You will need to scan the QR code on the payment page to complete the payment.</p> : null}
								</div>
							</label>

							<label className={methodClass('securepay')}>
								<input type="radio" name="payment-method" checked={method === 'securepay'} onChange={() => setMethod('securepay')} />
								<div>
									<strong className="oc-logo-label oc-method-title">
										<img className="oc-inline-logo" src={escrosafeLogo} alt="EscroSafe" />
										<span className="oc-info-wrap" ref={escrowInfoRef}>
											<button
												type="button"
												className="oc-info-btn"
												aria-label="How EscroSafe works"
												aria-expanded={showEscrowInfo}
												onClick={(event) => {
													event.preventDefault()
													event.stopPropagation()
													// Open upward when there is not enough room below the button.
													const rect = event.currentTarget.getBoundingClientRect()
													const roomBelow = window.innerHeight - rect.bottom
													setEscrowInfoAbove(roomBelow < ESCROW_INFO_HEIGHT && rect.top > roomBelow)
													setShowEscrowInfo((open) => !open)
												}}
											>
												<svg viewBox="0 0 24 24" aria-hidden="true"><text className="oc-info-letter" x="12" y="18" textAnchor="middle">i</text></svg>
											</button>
											{showEscrowInfo ? (
												<span className={`oc-info-pop${escrowInfoAbove ? ' is-above' : ''}`} role="dialog" aria-label="About paying with EscroSafe">
													<span>EscroSafe keeps your payment protected with an RBI-regulated payment partner instead of sending it straight to the seller.</span>
													<span>Your money is released only after your order is delivered, giving you extra protection when shopping online.</span>
												</span>
											) : null}
										</span>
									</strong>
									{method === 'securepay' ? <p className="oc-note">Your payment is securely held with an RBI-regulated payment aggregator until your order is confirmed.</p> : null}
								</div>
							</label>

							<label className={methodClass('cod')}>
								<input type="radio" name="payment-method" checked={method === 'cod'} onChange={() => setMethod('cod')} />
								<div>
									<strong className="oc-method-title"><MethodIcon name="cod" />Cash on Delivery/Pay on Delivery</strong>
									<p className="oc-muted">Cash, UPI and Cards accepted.</p>
									{method === 'cod' ? (
										<p className="oc-note oc-note-promo">
											Save on COD fees with EscroSafe; pay online, with your money held securely until delivery is confirmed.{' '}
											<button type="button" className="oc-promo-link" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMethod('securepay') }}>
												Pay with <img src={escrosafeLogo} alt="EscroSafe" />
											</button>
										</p>
									) : null}
									{method === 'cod' ? (
										<p className="oc-note oc-note-warn">
											A convenience fee of {formatInr(COD_CONVENIENCE_FEE)} is charged on Cash on Delivery orders.
										</p>
									) : null}
								</div>
							</label>
						</div>
					</section>
				</div>

				<aside className="oc-card oc-summary">
					{method === 'securepay' ? (
						merchantKey ? (
							<div key={buttonMountKey} ref={buttonHostRef} className="oc-sdk-button" />
						) : (
							<p className="message error">Merchant key missing. Log out and log in again, then copy/test the EscroSafe button.</p>
						)
					) : canUseMethod ? (
						<button type="button" className="so-btn-add oc-use-btn" onClick={useThisPaymentMethod}>Use this payment method</button>
					) : (
						<p className="oc-muted oc-hint">
							{method === 'card' ? 'Add a card to continue.' : 'Choose a bank to continue.'}
						</p>
					)}

					<hr />
					<div className="so-sum-line"><span>Items ({cartCount}):</span><span>{formatInr(cartTotal)}</span></div>
					<div className="so-sum-line"><span>Delivery:</span><span className="so-free">FREE</span></div>
					{method === 'cod' ? (
						<div className="so-sum-line"><span>Convenience fee:</span><span>{formatInr(COD_CONVENIENCE_FEE)}</span></div>
					) : null}
					<div className="so-sum-total"><span>Order Total:</span><span>{formatInr(method === 'cod' ? cartTotal + COD_CONVENIENCE_FEE : cartTotal)}</span></div>
					<p className="oc-muted oc-orderid">Order ID: {draft.merchantOrderId}</p>

					{/* EscroSafe SDK reads the order from these fields (same ids as the /cart form). */}
					<div className="oc-sr-only" aria-hidden="true">
						<input id="order-id" name="order_id" data-order-id type="text" value={draft.merchantOrderId} readOnly tabIndex={-1} />
						<input id="order-total" name="amount" data-order-amount type="number" value={cartTotal.toFixed(2)} readOnly tabIndex={-1} />
						<input id="customer-name" name="customer_name" type="text" value={draft.customerName || ''} readOnly tabIndex={-1} />
						<input id="customer-phone" name="customer_phone" type="tel" value={draft.customerPhone || ''} readOnly tabIndex={-1} />
						<input id="customer-email" name="customer_email" type="email" value={draft.customerEmail || ''} readOnly tabIndex={-1} />
						<input id="shipping-address" name="shipping_address" type="text" value={draft.customerAddress || ''} readOnly tabIndex={-1} />
					</div>
				</aside>
			</main>

			{message ? (
				<div className="create-order-toast" role="status">
					<div>
						<strong>Payment method note</strong>
						<span>{message}</span>
					</div>
					<button type="button" aria-label="Dismiss payment method note" onClick={() => setMessage('')}>
						&times;
					</button>
				</div>
			) : null}

			{showAddressModal ? (
				<div className="securepay-modal-backdrop">
					<div className="oc-address-modal" role="dialog" aria-modal="true" aria-label="Select a delivery address">
						<div className="oc-modal-head">
							<h2>Select a delivery address</h2>
							<button type="button" aria-label="Close" onClick={() => setShowAddressModal(false)}>&times;</button>
						</div>
						<h3>Delivery addresses (1)</h3>
						<div className="oc-address-row">
							<input type="radio" checked readOnly aria-label="Selected address" />
							<div>
								<strong>{addressForm.customerName}</strong>
								<p>{addressForm.customerAddress}</p>
								<p>Phone number: {addressForm.customerPhone}</p>
								{addressForm.customerEmail ? <p>{addressForm.customerEmail}</p> : null}
								<button type="button" className="oc-link-btn" onClick={() => setEditingAddress((value) => !value)}>
									{editingAddress ? 'Done editing' : 'Edit address'}
								</button>
							</div>
						</div>
						{editingAddress ? (
							<div className="oc-address-form">
								<label>Full name<input type="text" value={addressForm.customerName} onChange={(event) => setAddressForm({ ...addressForm, customerName: event.target.value })} /></label>
								<label>Phone<input type="tel" value={addressForm.customerPhone} onChange={(event) => setAddressForm({ ...addressForm, customerPhone: event.target.value })} /></label>
								<label>Email<input type="email" value={addressForm.customerEmail} onChange={(event) => setAddressForm({ ...addressForm, customerEmail: event.target.value })} /></label>
								<label>Address<input type="text" value={addressForm.customerAddress} onChange={(event) => setAddressForm({ ...addressForm, customerAddress: event.target.value })} /></label>
							</div>
						) : null}
						<div className="oc-modal-actions">
							<button type="button" className="oc-cancel-btn" onClick={() => setShowAddressModal(false)}>Cancel</button>
							<button type="button" className="so-btn-add oc-confirm-btn" onClick={confirmAddress}>Use this address</button>
						</div>
					</div>
				</div>
			) : null}

			{/* Terms popup disabled for now, kept for later:
			{showTermsModal ? (
				<div className="securepay-modal-backdrop">
					<div className="create-order-terms-modal" role="dialog" aria-modal="true" aria-label="EscroSafe terms">
						<div className="securepay-modal-head">
							<div>
								<span>EscroSafe terms</span>
								<h2>Before you continue</h2>
							</div>
						</div>
						<label className="create-order-terms-check modal-terms-check">
							<input
								type="checkbox"
								checked={termsAccepted}
								onChange={(event) => setTermsAccepted(event.target.checked)}
							/>
							<span>I accept EscroSafe verification terms and customer detail confirmation.</span>
						</label>
						<div className="securepay-modal-actions">
							<button type="button" className="checkout-reject-btn" onClick={() => continueAfterTerms(false)}>
								Skip
							</button>
							<button type="button" onClick={() => continueAfterTerms(true)} disabled={!termsAccepted}>
								Confirm and continue
							</button>
						</div>
					</div>
				</div>
			) : null}
			*/}
		</div>
	)
}

export default Checkout
