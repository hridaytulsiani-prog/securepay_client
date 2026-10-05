import { Link } from 'react-router-dom'
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

function LandingPage() {
	return (
		<div className="landing-page">
			<header className="landing-nav">
				<Link className="landing-brand" to="/">
					<img src={escrosafeLogo} alt="EscroSafe" />
				</Link>
				<nav className="landing-nav-actions" aria-label="Account actions">
					<ResourcesDropdown />
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

			</main>
		</div>
	)
}

export default LandingPage
