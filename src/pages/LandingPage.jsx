import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../api/client'
import ResourcesDropdown from '../components/ResourcesDropdown'
import dashboardPreview from '../assets/dashboard.png'
import blueDartLogo from '../assets/couriers/blue-dart-real.png'
import delhiveryLogo from '../assets/couriers/delhivery-real.png'
import dtdcLogo from '../assets/couriers/dtdc-real.png'
import ekartLogo from '../assets/couriers/ekart-real.png'
import shadowfaxLogo from '../assets/couriers/shadowfax.svg'
import shiprocketLogo from '../assets/couriers/shiprocket-real.png'
import xpressbeesLogo from '../assets/couriers/xpressbees-real.png'

const outcomeItems = [
	{
		label: 'Fewer',
		detail: 'RTOs',
		tone: 'orange',
		icon: (
			<svg viewBox="0 0 32 32" aria-hidden="true">
				<path d="M4 10.5h14v10H4z" />
				<path d="M18 14h5.5l4 4v2.5H18z" />
				<circle cx="10" cy="23" r="2.5" />
				<circle cx="24" cy="23" r="2.5" />
				<path d="M14 15H8.8m0 0 2.6-2.6M8.8 15l2.6 2.6" />
			</svg>
		),
	},
	{
		label: 'Payment secured',
		detail: 'upfront',
		wrap: true,
		tone: 'blue',
		icon: (
			<svg viewBox="0 0 32 32" aria-hidden="true">
				<path d="M6 9h20v15H6z" />
				<path d="M6 13h20" />
				<path d="m12 19 2.5 2.5L20 16" />
				<path d="M10 7h12" />
			</svg>
		),
	},
	{
		label: 'Lower',
		detail: 'COD costs',
		tone: 'gold',
		icon: (
			<svg viewBox="0 0 32 32" aria-hidden="true">
				<circle cx="16" cy="16" r="11.5" />
				<path d="M11 10h9" />
				<path d="M11 14h9" />
				<path d="M13.5 10c4.2 0 6.5 1.5 6.5 4s-2.3 4-6.5 4h-1l7 5" />
			</svg>
		),
	},
	{
		label: 'Less working',
		detail: 'capital tied up',
		wrap: true,
		tone: 'green',
		icon: (
			<svg viewBox="0 0 32 32" aria-hidden="true">
				<path d="M7 20h18v5H7z" />
				<path d="M9 17h14v3H9z" />
				<path d="M11 14h10v3H11z" />
				<path d="M16 6v7" />
				<path d="m12.5 9.5 3.5-3.5 3.5 3.5" />
			</svg>
		),
	},
]

const courierPartners = [
	{ key: 'blue_dart', label: 'Blue Dart', logo: blueDartLogo },
	{ key: 'xpressbees', label: 'Xpressbees', logo: xpressbeesLogo },
	{ key: 'dtdc', label: 'DTDC', logo: dtdcLogo },
	{ key: 'shadowfax', label: 'Shadowfax', logo: shadowfaxLogo },
	{ key: 'ekart', label: 'Ekart', logo: ekartLogo },
	{ key: 'delhivery', label: 'Delhivery', logo: delhiveryLogo },
	{ key: 'shiprocket', label: 'Shiprocket', logo: shiprocketLogo },
]
import escrosafeLogo from '../assets/escrosafe-logo.png'

const SUPPORT_EMAIL = 'partners@escrosafe.com'
const HELP_TOPICS = ['Getting started', 'Payments and settlements', 'Couriers and label uploads', 'Account or KYC', 'Something else']

function LandingPage() {
	const [helpForm, setHelpForm] = useState({ name: '', email: '', topic: HELP_TOPICS[0], reference: '', message: '', website: '' })
	const [helpStatus, setHelpStatus] = useState({ state: 'idle', text: '' })
	const updateHelp = (field) => (event) => setHelpForm((current) => ({ ...current, [field]: event.target.value }))

	// After a successful send, keep the confirmation for 10 seconds, then empty the form and bring the button back
	// (same behaviour as the customer page), so another question can be sent.
	useEffect(() => {
		if (helpStatus.state !== 'sent') return undefined
		const timer = window.setTimeout(() => {
			setHelpForm({ name: '', email: '', topic: HELP_TOPICS[0], reference: '', message: '', website: '' })
			setHelpStatus({ state: 'idle', text: '' })
		}, 10000)
		return () => window.clearTimeout(timer)
	}, [helpStatus.state])

	// Sent to the public contact endpoint (POST /adminpanel/contact/) with source "merchant", so it shows up in the
	// admin app under "Merchant queries" instead of the customer "Messages" list.
	const submitHelp = async (event) => {
		event.preventDefault()
		if (helpStatus.state === 'sending' || helpStatus.state === 'sent') return
		setHelpStatus({ state: 'sending', text: '' })
		try {
			const response = await fetch(`${API_BASE_URL}/adminpanel/contact/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: helpForm.name.trim(),
					email: helpForm.email.trim(),
					order_id: helpForm.reference.trim(),
					message: helpForm.message.trim(),
					source: 'merchant',
					topic: helpForm.topic,
					website: helpForm.website,
				}),
			})
			const data = await response.json().catch(() => null)
			if (!response.ok) throw new Error((data && data.error) || 'Could not send your message. Please try again.')
			setHelpStatus({ state: 'sent', text: 'Thanks! Your message has been sent. We will get back to you within one working day.' })
		} catch (error) {
			setHelpStatus({ state: 'error', text: error.message || 'Could not send your message. Please try again.' })
		}
	}

	return (
		<div className="landing-page">
			<header className="landing-nav">
				<Link className="landing-brand" to="/">
					<img src={escrosafeLogo} alt="EscroSafe" />
				</Link>
				<nav className="landing-nav-actions" aria-label="Account actions">
					<ResourcesDropdown />
					<a className="landing-login-link landing-help-link" href="#contact">Help</a>
					<Link className="landing-login-link" to="/login">Log in</Link>
					<Link className="landing-signup-button" to="/register">Create account</Link>
				</nav>
			</header>

			<main>
				<section className="landing-hero">
					<div className="landing-copy">
						<p className="landing-kicker">Beyond COD</p>
						<h1>
							<span>Your customers get the</span>
							<span>confidence of COD. You</span>
							<span>get the economics of prepaid.</span>
						</h1>
						<p className="landing-description">
							<span>EscroSafe helps merchants replace COD with prepaid orders customers feel</span>
							<span>confident placing, reducing RTOs, COD costs, and cash tied up in failed deliveries.</span>
						</p>
						<div className="landing-hero-actions">
							<Link className="landing-primary-button" to="/register">Get started</Link>
							<Link className="landing-secondary-link" to="/login">
								<span>I already have an account</span>
								<svg className="landing-link-arrow" viewBox="0 0 20 20" aria-hidden="true">
									<path d="M4 10h11" />
									<path d="m11 5 5 5-5 5" />
								</svg>
							</Link>
						</div>
						<div className="landing-outcome-row" aria-label="EscroSafe prepaid order outcomes">
							{outcomeItems.map((item) => (
								<div className={`landing-outcome-item is-${item.tone}`} key={item.detail}>
									<span className="landing-outcome-icon">{item.icon}</span>
									<span className={`landing-outcome-text${item.wrap ? ' is-wrapped' : ''}`}>
										{item.wrap ? <><span>{item.label}</span><span>{item.detail}</span></> : `${item.label} ${item.detail}`}
									</span>
								</div>
							))}
						</div>
					</div>

					<div className="landing-workspace-visual" aria-label="EscroSafe merchant assurance workspace preview">
						<img className="landing-dashboard-preview" src={dashboardPreview} alt="EscroSafe dashboard preview" />
					</div>
				</section>

				<section className="landing-partner-band" aria-label="EscroSafe delivery partners">
					<div className="landing-partner-copy">
						<span>Built around your existing delivery flow</span>
						<strong>
							<span>One prepaid flow across</span>
							<span>the couriers you already use.</span>
						</strong>
					</div>
					<div className="landing-partner-connect" aria-hidden="true">
						<svg viewBox="0 0 32 32">
							<circle cx="9" cy="16" r="3" />
							<circle cx="23" cy="8" r="3" />
							<circle cx="23" cy="24" r="3" />
							<path d="m11.7 14.6 8.6-5.2" />
							<path d="m11.7 17.4 8.6 5.2" />
						</svg>
					</div>
					<div className="landing-partner-logos">
						{courierPartners.map((courier) => (
							<span className={`landing-courier-logo logo-${courier.key}`} key={courier.key}>
								<img src={courier.logo} alt={`${courier.label} logo`} />
							</span>
						))}
						<span className="landing-courier-logo logo-more">more...</span>
					</div>
				</section>

				{/* <section className="landing-proof-strip" aria-label="EscroSafe merchant benefits">
					<div><span>Prepaid confidence</span><strong>Sell beyond COD</strong></div>
					<div><span>Buyer seriousness</span><strong>Filter casual orders</strong></div>
					<div><span>Fulfilment focus</span><strong>Ship with confidence</strong></div>
					<div><span>Merchant control</span><strong>One clear view</strong></div>
				</section> */}

				<section className="landing-section landing-flow-section">
					<div className="landing-section-copy">
						<p className="landing-section-kicker">Why merchants use EscroSafe</p>
						<h2>
							<span>Make prepaid orders</span>
							<span>feel safer for both sides.</span>
						</h2>
						<p>EscroSafe gives merchants a trust layer for prepaid checkout: buyers commit upfront, merchants fulfil with confidence, and teams get a clearer view of every paid order.</p>
					</div>
					<div className="landing-flow-grid">
						<div><span>01</span><strong>Encourage prepaid orders</strong><p>Give serious buyers a protected prepaid flow instead of depending only on COD.</p></div>
						<div><span>02</span><strong>Reduce unserious buyers</strong><p>Use prepaid commitment and delivery visibility to lower fake orders, refusals, and avoidable follow-ups.</p></div>
						<div><span>03</span><strong>Reduce wasted shipping</strong><p>Focus fulfilment effort on paid buyers with clearer shipment visibility from order to delivery.</p></div>
					</div>
				</section>

				<section className="landing-section landing-help-section" id="contact">
					<div className="landing-section-copy landing-help-intro">
						<p className="landing-section-kicker">Still have a question?</p>
						<h2>Ask us anything.</h2>
						<p className="landing-help-lede">
							<span>Not a merchant yet, or stuck somewhere? Send us a message and a real person</span>
							<span>will get back to you.</span>
						</p>
						<ul className="landing-help-cards">
							<li>
								<span className="landing-help-icon is-blue"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
								<div><strong>Email us</strong><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></div>
							</li>
							<li>
								<span className="landing-help-icon is-amber"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
								<div><strong>We reply quickly</strong><span>Expect an answer within one working day.</span></div>
							</li>
							<li>
								<span className="landing-help-icon is-green"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg></span>
								<div><strong>Already a merchant?</strong><span>Add your order ID or AWB so we can help faster.</span></div>
							</li>
						</ul>
					</div>

					<form className="landing-help-form" onSubmit={submitHelp}>
						<label>Your name
							<input type="text" required maxLength={120} value={helpForm.name} onChange={updateHelp('name')} placeholder="Full name" autoComplete="name" />
						</label>
						<label>Email
							<input type="email" required value={helpForm.email} onChange={updateHelp('email')} placeholder="you@example.com" autoComplete="email" />
						</label>
						<label>Topic
							<select value={helpForm.topic} onChange={updateHelp('topic')}>
								{HELP_TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
							</select>
						</label>
						<label>Order ID or AWB (optional)
							<input type="text" maxLength={64} value={helpForm.reference} onChange={updateHelp('reference')} placeholder="e.g. SP_1001" />
						</label>
						<label className="is-wide">Your message
							<textarea required rows={5} maxLength={1900} value={helpForm.message} onChange={updateHelp('message')} placeholder="How can we help?" />
						</label>
						<input className="landing-help-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={helpForm.website} onChange={updateHelp('website')} />
						<button type="submit" className="landing-help-send" disabled={helpStatus.state === 'sending' || helpStatus.state === 'sent'}>
							{helpStatus.state === 'sending' ? 'Sending...' : helpStatus.state === 'sent' ? 'Message sent' : 'Send message'}
						</button>
						{helpStatus.text ? <p className={`landing-help-status is-${helpStatus.state}`} role="status">{helpStatus.text}</p> : null}
					</form>
				</section>

			</main>
		</div>
	)
}

export default LandingPage
