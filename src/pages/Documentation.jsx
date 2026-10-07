import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { isAuthenticated } from '../utils/storage'
import blueDartLogo from '../assets/couriers/blue-dart-real.png'
import delhiveryLogo from '../assets/couriers/delhivery-real.png'
import dtdcLogo from '../assets/couriers/dtdc-real.png'
import ekartLogo from '../assets/couriers/ekart-real.png'
import shadowfaxLogo from '../assets/couriers/shadowfax.svg'
import shiprocketLogo from '../assets/couriers/shiprocket-real.png'
import xpressbeesLogo from '../assets/couriers/xpressbees-real.png'

// Same logo boxes as the "delivery partners" strip on the landing page.
const SUPPORTED_COURIERS = [
	{ key: 'blue_dart', label: 'Blue Dart', logo: blueDartLogo },
	{ key: 'delhivery', label: 'Delhivery', logo: delhiveryLogo },
	{ key: 'dtdc', label: 'DTDC', logo: dtdcLogo },
	{ key: 'ekart', label: 'Ekart', logo: ekartLogo },
	{ key: 'shadowfax', label: 'Shadowfax', logo: shadowfaxLogo },
	{ key: 'shiprocket', label: 'Shiprocket', logo: shiprocketLogo },
	{ key: 'xpressbees', label: 'Xpressbees', logo: xpressbeesLogo },
]

const EXTENSION_STORE_URL = import.meta.env.VITE_SECUREPAY_EXTENSION_URL || 'https://chromewebstore.google.com/search/SecurePay%20Label%20Uploader'

function Documentation() {
	const [searchParams, setSearchParams] = useSearchParams()
	const initialTab = searchParams.get('tab') || 'integration'
	const [activeTab, setActiveTab] = useState(initialTab)
	const [copiedSnippet, setCopiedSnippet] = useState(null)
	const [language, setLanguage] = useState('curl')
	
	const isAuthed = isAuthenticated()
	const docTabs = [
		{ id: 'integration', label: 'Payment Aggregator Partnership' },
		{ id: 'api', label: 'API Documentation' },
		{ id: 'extension', label: 'Chrome Extension Guide' },
	]

	useEffect(() => {
		const tab = searchParams.get('tab')
		if (tab && ['integration', 'api', 'extension'].includes(tab)) {
			setActiveTab(tab)
		}
	}, [searchParams])

	const handleTabChange = (tab) => {
		setActiveTab(tab)
		setSearchParams({ tab })
	}

	const copyToClipboard = (text, id) => {
		navigator.clipboard.writeText(text)
		setCopiedSnippet(id)
		setTimeout(() => setCopiedSnippet(null), 2000)
	}

	return (
		<div className="doc-page">
			{/* Hero Banner */}
			<div className="doc-hero">
				<h1>Developer & Merchant Resources</h1>
				<p>Complete integration guides, REST API reference, and Chrome extension setup for EscroSafe assurance.</p>
			</div>

			{/* Main Container */}
			<div className="doc-container">
				<div className="doc-tabs" role="tablist" aria-label="Developer resources">
					{docTabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							className={`doc-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
							onClick={() => handleTabChange(tab.id)}
							role="tab"
							aria-selected={activeTab === tab.id}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Tab 1: Payment Aggregator Partnership */}
				{activeTab === 'integration' && (
					<section className="doc-content-section">
						<h2>Payment Aggregator Partnership Guide</h2>
						<p className="doc-lead">
							EscroSafe is not itself a payment aggregator, it sits as a decision layer between you and the customer. Your customer's money is actually collected and held by your linked payment aggregator partner. EscroSafe validates the shipping label and confirms delivery with the courier, and only then instructs the aggregator to <b>release</b> the held funds to you or <b>refund</b> the customer.
						</p>

						<div className="integration-steps font-body">
							<div className="step-card">
								<div className="step-number">1</div>
								<div className="step-body">
									<h3>Sign Up, Complete KYC & Link Your Aggregator Account</h3>
									<p>When you create your merchant account and log in for the first time, that same onboarding also completes your KYC and links your account to our partnered payment aggregator. EscroSafe stores that link (aggregator provider + your aggregator account ID) against your merchant profile, so every order you take is automatically routed through your linked aggregator, no separate signup with the aggregator is needed.</p>
									<div className="code-block-wrapper">
										<pre className="code-block">
{`Authorization: Bearer <MERCHANT_ID>-<SESSION_TOKEN>
Content-Type: application/json`}
										</pre>
									</div>
									<p>This session token (from <code>POST /merchants/login/</code>) is what every request below is authenticated with.</p>
								<p>The first time you log in, you're also asked to choose your courier partners (Blue Dart, Delhivery, DTDC, Ekart, Shadowfax, Shiprocket, Xpressbees), this is where EscroSafe's shipment validation and tracking get wired up per courier. Blue Dart specifically requires an OTP-enabled plan; EscroSafe does not support the basic (non-OTP) Blue Dart plan.</p>
								</div>
							</div>

							<div className="step-card">
								<div className="step-number">2</div>
								<div className="step-body">
									<h3>Customer Pays: Funds Are Held, Not Settled</h3>
									<p>Checkout is started through your linked aggregator. The customer's payment is captured and placed in a per-order hold rather than settling straight to your bank account, that hold is what lets EscroSafe step in before the money actually moves. <b>Note:</b> <code>amount</code> must be an integer in <i>paise</i> (₹1499.00 = <code>149900</code>).</p>

									<div className="lang-switcher">
										<button type="button" className={language === 'curl' ? 'active' : ''} onClick={() => setLanguage('curl')}>cURL</button>
										<button type="button" className={language === 'node' ? 'active' : ''} onClick={() => setLanguage('node')}>Node.js (Fetch)</button>
										<button type="button" className={language === 'python' ? 'active' : ''} onClick={() => setLanguage('python')}>Python</button>
									</div>

									{language === 'curl' && (
										<div className="code-block-wrapper">
											<button type="button" className="copy-btn" onClick={() => copyToClipboard(curlOrderCode, 'curlOrder')}>
												{copiedSnippet === 'curlOrder' ? 'Copied!' : 'Copy cURL'}
											</button>
											<pre className="code-block">{curlOrderCode}</pre>
										</div>
									)}

									{language === 'node' && (
										<div className="code-block-wrapper">
											<button type="button" className="copy-btn" onClick={() => copyToClipboard(nodeOrderCode, 'nodeOrder')}>
												{copiedSnippet === 'nodeOrder' ? 'Copied!' : 'Copy Node.js'}
											</button>
											<pre className="code-block">{nodeOrderCode}</pre>
										</div>
									)}

									{language === 'python' && (
										<div className="code-block-wrapper">
											<button type="button" className="copy-btn" onClick={() => copyToClipboard(pyOrderCode, 'pyOrder')}>
												{copiedSnippet === 'pyOrder' ? 'Copied!' : 'Copy Python'}
											</button>
											<pre className="code-block">{pyOrderCode}</pre>
										</div>
									)}
								</div>
							</div>

							<div className="step-card">
								<div className="step-number">3</div>
								<div className="step-body">
									<h3>Upload the Shipping Label for Validation</h3>
									<p>Once the order ships, upload the courier's PDF label (via the dashboard, or automatically through the Chrome extension). EscroSafe checks the label against the order, courier, AWB, amount, tamper signs, and separately confirms delivery status directly with the courier.</p>
								</div>
							</div>

							<div className="step-card">
								<div className="step-number">4</div>
								<div className="step-body">
									<h3>EscroSafe Decides: Release or Refund</h3>
									<p>This is the core of the partnership, you never call a "release" or "refund" API yourself. Once the label is approved <i>and</i> the courier confirms delivery, EscroSafe instructs your aggregator to release the held funds to you. If delivery fails, the courier reports a return, or no valid label shows up within the review window, EscroSafe instructs the aggregator to refund the customer instead. Anything the evidence doesn't clearly support is held for manual review rather than moved automatically.</p>
								</div>
							</div>

							<div className="step-card">
								<div className="step-number">5</div>
								<div className="step-body">
									<h3>Track the Outcome</h3>
									<p>Every release or refund shows up as a notification on your dashboard, and you can pull the same feed via <code>GET /payments/v1/notifications/</code> with your session token, useful if you want to mirror payout status back into your own systems.</p>
								</div>
							</div>
						</div>
					</section>
				)}

				{/* Tab 2: API Reference */}
				{activeTab === 'api' && (
					<section className="doc-content-section">
						<h2>API Reference (v1)</h2>
						<p className="doc-lead">
							Comprehensive specification of all EscroSafe merchant REST endpoints, parameters, field validations, and error payload structures.
						</p>

						<div className="endpoint-card">
							<div className="endpoint-header">
								<span className="http-badge post">POST</span>
								<code className="endpoint-path">/v1/orders</code>
								<span className="endpoint-title">Create Order</span>
							</div>
							<div className="endpoint-body">
								<p>Creates a new merchant order in EscroSafe and returns payment checkout credentials.</p>
								<h4>Headers</h4>
								<pre className="code-block">
{`Authorization: Bearer <merchant_api_token>
X-Merchant-Id: <merchant_id>
Content-Type: application/json`}
								</pre>

								<h4>Request Fields</h4>
								<table className="doc-table">
									<thead>
										<tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
									</thead>
									<tbody>
										<tr><td><code>merchant_order_id</code></td><td>string</td><td>Yes</td><td>Unique order reference ID from merchant system</td></tr>
										<tr><td><code>amount</code></td><td>integer</td><td>Yes</td><td>Order total in <b>paise</b> (₹100 = 10000)</td></tr>
										<tr><td><code>currency</code></td><td>string</td><td>Yes</td><td>Currently <code>INR</code></td></tr>
										<tr><td><code>customer.name</code></td><td>string</td><td>Yes</td><td>Full customer name</td></tr>
										<tr><td><code>customer.email</code></td><td>string</td><td>Yes</td><td>Customer email address</td></tr>
										<tr><td><code>customer.phone</code></td><td>string</td><td>Yes</td><td>10-digit mobile number</td></tr>
										<tr><td><code>shipping.pincode</code></td><td>string</td><td>Yes</td><td>6-digit delivery postal code</td></tr>
										<tr><td><code>return_url</code></td><td>string</td><td>Yes</td><td>Redirect URL after payment flow completes</td></tr>
										<tr><td><code>cancel_url</code></td><td>string</td><td>Yes</td><td>Redirect URL if payment is cancelled</td></tr>
									</tbody>
								</table>

								<h4>Success Response (201 Created)</h4>
								<div className="code-block-wrapper">
									<pre className="code-block">
{`{
  "order_id": "supi_ord_01K2XYZABC",
  "merchant_id": "46",
  "merchant_order_id": "ORD-2026-000123",
  "status": "CREATED",
  "amount": 149900,
  "currency": "INR",
  "payment_id": "supi_pay_01K2XYZDEF",
  "checkout_token": "chk_tkn_eyJhbGciOi...",
  "checkout_url": "https://checkout.secureupi.com/c/chk_tkn_eyJ...",
  "expires_at": "2026-08-13T15:10:00Z"
}`}
									</pre>
								</div>
							</div>
						</div>

						<div className="endpoint-card">
							<div className="endpoint-header">
								<span className="http-badge get">GET</span>
								<code className="endpoint-path">/v1/orders/{'{order_id}'}</code>
								<span className="endpoint-title">Get Order Status</span>
							</div>
							<div className="endpoint-body">
								<p>Retrieves real-time payment status, paid timestamp, and linked courier details for an existing order.</p>
								<h4>Success Response (200 OK)</h4>
								<div className="code-block-wrapper">
									<pre className="code-block">
{`{
  "order_id": "supi_ord_01K2XYZABC",
  "merchant_order_id": "ORD-2026-000123",
  "status": "SUCCESS",
  "amount": 149900,
  "currency": "INR",
  "payment_id": "supi_pay_01K2XYZDEF",
  "paid_at": "2026-08-13T14:45:11Z"
}`}
									</pre>
								</div>
							</div>
						</div>

						<div className="endpoint-card">
							<div className="endpoint-header">
								<span className="http-badge post">POST</span>
								<code className="endpoint-path">/tracking/openapi/pdf/upload/</code>
								<span className="endpoint-title">Open PDF Label Upload API</span>
							</div>
							<div className="endpoint-body">
								<p>Upload shipment-label PDF files directly to EscroSafe for automatic parsing and label validation.</p>
								<h4>Headers & Content-Type</h4>
								<pre className="code-block">
{`Authorization: Bearer <merchant_session_token>
Content-Type: multipart/form-data`}
								</pre>
								<h4>Form Parameters</h4>
								<table className="doc-table">
									<thead>
										<tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
									</thead>
									<tbody>
										<tr><td><code>file</code></td><td>file</td><td>Yes</td><td>Courier shipment label PDF (Blue Dart, Delhivery, DTDC, Ekart, Shadowfax, Shiprocket, Xpressbees)</td></tr>
									</tbody>
								</table>

								<h4>Success Response (200 OK)</h4>
								<div className="code-block-wrapper">
									<pre className="code-block">
{`{
  "ok": true,
  "message": "PDF accepted",
  "filename": "bluedart_label_8849.pdf",
  "content_type": "application/pdf",
  "size_bytes": 245678,
  "pages": 1,
  "sha256": "6e8f0a8a3f6d9f7b3a4c8f0e1c2d3b4a5f6e7d8c9b0a1e2f3d4c5b6a7e8f9a0"
}`}
									</pre>
								</div>
							</div>
						</div>

						<div className="endpoint-card">
							<div className="endpoint-header">
								<span className="http-badge post">POST</span>
								<code className="endpoint-path">/v1/orders/{'{order_id}'}/shipping</code>
								<span className="endpoint-title">Link Shipping Details</span>
							</div>
							<div className="endpoint-body">
								<p>Links generated courier AWB and shipment metadata to a paid EscroSafe order.</p>
								<h4>Request Payload</h4>
								<div className="code-block-wrapper">
									<pre className="code-block">
{`{
  "shipment_id": "SHP_77891183565",
  "awb": "77891183565",
  "courier": "bluedart",
  "service_type": "surface",
  "tracking_url": "https://www.bluedart.com/tracking?awb=77891183565"
}`}
									</pre>
								</div>
							</div>
						</div>

						<div className="error-codes-card">
							<h3>Standard Error Response Payload</h3>
							<p>When an error occurs, EscroSafe returns an explicit error code, message, and target field:</p>
							<div className="code-block-wrapper">
								<pre className="code-block">
{`{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be >= 100 paise",
    "field": "amount"
  }
}`}
								</pre>
							</div>
							<table className="doc-table">
								<thead>
									<tr><th>Status Code</th><th>Error Code</th><th>Cause</th></tr>
								</thead>
								<tbody>
									<tr><td><code>400 Bad Request</code></td><td><code>INVALID_PAYLOAD</code></td><td>Malformed JSON or missing parameters</td></tr>
									<tr><td><code>401 Unauthorized</code></td><td><code>INVALID_TOKEN</code></td><td>Missing or expired session/bearer token</td></tr>
									<tr><td><code>403 Forbidden</code></td><td><code>MERCHANT_MISMATCH</code></td><td>Order belongs to another merchant ID</td></tr>
									<tr><td><code>409 Conflict</code></td><td><code>DUPLICATE_ORDER_ID</code></td><td>Merchant order ID already exists</td></tr>
									<tr><td><code>422 Unprocessable</code></td><td><code>ORDER_NOT_PAYABLE</code></td><td>Attempting to link shipping before payment</td></tr>
									<tr><td><code>429 Too Many Requests</code></td><td><code>RATE_LIMIT_EXCEEDED</code></td><td>Exceeded API request quota</td></tr>
								</tbody>
							</table>
						</div>
					</section>
				)}

				{/* Tab 3: Chrome Extension Guide */}
				{activeTab === 'extension' && (
					<section className="doc-content-section">
						<h2>EscroSafe Chrome Extension Guide</h2>
						<p className="doc-lead">
							Automate shipping label verification! The EscroSafe Chrome/Edge Extension automatically intercepts courier PDF downloads from courier dashboards (Blue Dart, Delhivery, etc.) and uploads them directly to your EscroSafe merchant portal.
						</p>

						<div className="token-assistant-box">
							<div className="token-assistant-info">
								<span className="assistant-badge">Automatic session connection</span>
								<h3>No token copy-paste required</h3>
								<p>
									{isAuthed
										? "The extension reads your active EscroSafe merchant session in this browser and attaches it to uploads automatically."
										: "Log in to your EscroSafe merchant account in this browser before using the extension."}
								</p>
							</div>
							{!isAuthed && (
								<Link to="/login" className="login-token-btn">
									Log in to EscroSafe
								</Link>
							)}
							<a href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className="login-token-btn">
								Open Chrome Web Store
							</a>
						</div>

						<div className="extension-guide-grid">
							<div className="ext-step-card">
								<div className="ext-step-num">Step 1</div>
								<h3>Locate Extension Directory</h3>
								<p>The Chrome Extension source code is located in your project directory at:</p>
								<code className="ext-path">C:\Users\kunal\Music\Secure-Pay\securepay-extension</code>
							</div>

							<div className="ext-step-card">
								<div className="ext-step-num">Step 2</div>
								<h3>Enable Developer Mode</h3>
								<p>Open Google Chrome or Microsoft Edge and navigate to the extension manager:</p>
								<ul className="ext-list">
									<li>Chrome: <code>chrome://extensions</code></li>
									<li>Edge: <code>edge://extensions</code></li>
								</ul>
								<p>Toggle the <b>"Developer mode"</b> switch in the top right corner.</p>
							</div>

							<div className="ext-step-card">
								<div className="ext-step-num">Step 3</div>
								<h3>Load Unpacked Extension</h3>
								<p>Click the <b>"Load unpacked"</b> button and select the <code>securepay-extension</code> folder.</p>
							</div>

							<div className="ext-step-card">
								<div className="ext-step-num">Step 4</div>
								<h3>Confirm Extension Connection</h3>
								<p>Click the EscroSafe puzzle piece icon in your Chrome toolbar:</p>
								<ul className="ext-list">
									<li>Set API URL: <code>http://localhost:8000/tracking/openapi/pdf/upload/</code></li>
									<li>Make sure the EscroSafe session status shows connected</li>
									<li>Keep <i>"Auto-upload new PDF downloads"</i> enabled</li>
									<li>Click <b>"Save Settings"</b></li>
								</ul>
							</div>
						</div>

						<div className="ext-modes-section font-body">
							<h3>Extension Capabilities & Workflows</h3>
							
							<div className="mode-card">
								<h4>1. Automatic Download Interception</h4>
								<p>Whenever you download a shipping label PDF from courier portals (e.g. Shiprocket, Blue Dart, Ekart), the extension detects completed PDF downloads and automatically posts them to EscroSafe in the background.</p>
							</div>

							<div className="mode-card">
								<h4>2. Manual PDF Drag & Drop Upload</h4>
								<p>If a courier download URL requires session re-authentication, open the extension popup and use the manual file uploader to upload one or multiple label PDFs instantly.</p>
							</div>

							<div className="mode-card">
								<h4>3. Saved PDF Folder Batch Upload (Print Dialogs)</h4>
								<p>When Delhivery or other couriers open a browser print dialog instead of a direct download, save the PDF to a designated folder on your computer. Open the popup under <i>"Saved PDF Folder"</i>, select the folder, and click <b>Upload Folder PDFs</b>.</p>
							</div>
						</div>

						<div className="couriers-supported">
							<h3>Supported Courier Services</h3>
							<div className="doc-courier-logos">
								{SUPPORTED_COURIERS.map((courier) => (
									<span className={`landing-courier-logo logo-${courier.key}`} key={courier.key}>
										<img src={courier.logo} alt={`${courier.label} logo`} />
									</span>
								))}
							</div>
						</div>
					</section>
				)}
			</div>
		</div>
	)
}

const curlOrderCode = `curl --request POST "http://localhost:8000/payments/phonepe/initiate/" \\
  --header "Authorization: Bearer <MERCHANT_ID>-<SESSION_TOKEN>" \\
  --header "Content-Type: application/json" \\
  --data '{
    "merchantOrderId": "ORD-2026-000123",
    "amount": 149900,
    "redirectUrl": "https://merchant.com/checkout/return",
    "mobileNumber": "9869094746",
    "customerName": "Sarthak Chavande",
    "customerEmail": "sarthak@example.com"
  }'`

const nodeOrderCode = `const response = await fetch('http://localhost:8000/payments/phonepe/initiate/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <MERCHANT_ID>-<SESSION_TOKEN>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    merchantOrderId: 'ORD-2026-000123',
    amount: 149900, // in paise
    redirectUrl: 'https://merchant.com/checkout/return',
    mobileNumber: '9869094746',
    customerName: 'Sarthak Chavande',
    customerEmail: 'sarthak@example.com'
  })
});
const data = await response.json();
console.log('Redirect customer to:', data.redirectUrl);`

const pyOrderCode = `import requests

url = "http://localhost:8000/payments/phonepe/initiate/"
headers = {
    "Authorization": "Bearer <MERCHANT_ID>-<SESSION_TOKEN>",
    "Content-Type": "application/json"
}
payload = {
    "merchantOrderId": "ORD-2026-000123",
    "amount": 149900,  # in paise
    "redirectUrl": "https://merchant.com/checkout/return",
    "mobileNumber": "9869094746",
    "customerName": "Sarthak Chavande",
    "customerEmail": "sarthak@example.com"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print("Redirect customer to:", data.get("redirectUrl"))`

export default Documentation
