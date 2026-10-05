import { useEffect, useState } from 'react'
import { getCourierPreferences, saveCourierPreferences } from '../api/merchant'
import { API_BASE_URL } from '../api/client'
import { BLUE_DART_PLANS, COURIERS } from '../constants/couriers'
import { getUser } from '../utils/storage'
import { BUTTON_THEMES, readStoredButtonTheme } from '../constants/buttonThemes'

const EXTENSION_STORE_URL = import.meta.env.VITE_SECUREPAY_EXTENSION_URL || 'https://chromewebstore.google.com/search/SecurePay%20Label%20Uploader'
const SECUREPAY_BUTTON_SCRIPT_URL = import.meta.env.VITE_SECUREPAY_BUTTON_URL || `${window.location.origin}/button.js`
const SECUREPAY_SESSION_API_URL = import.meta.env.VITE_SECUREPAY_SESSION_API_URL || `${API_BASE_URL || window.location.origin}/payments/v1/checkout-sessions/`
const SECUREPAY_BUTTON_CONFIG_URL = import.meta.env.VITE_SECUREPAY_BUTTON_CONFIG_URL || `${API_BASE_URL || window.location.origin}/payments/v1/button-config/`

const SECUREPAY_BUTTON_LOGO_URL = new URL('escrosafe-logo.png', SECUREPAY_BUTTON_SCRIPT_URL).toString()

function buildSecurePayButtonSnippet(merchantKey, theme) {
	return `<script src="${SECUREPAY_BUTTON_SCRIPT_URL}" data-button-text="Pay with" data-button-logo-url="${SECUREPAY_BUTTON_LOGO_URL}" data-button-theme="${theme}" data-merchant-key="${merchantKey || 'sp_live_xxx'}" data-session-api-url="${SECUREPAY_SESSION_API_URL}" data-config-api-url="${SECUREPAY_BUTTON_CONFIG_URL}"></script>`
}

function CourierSettings() {
	const user = getUser()
	const merchantKey = user?.merchant_key || user?.merchantKey || user?.publishable_key || (user?.id ? `sp_merchant_${user.id}` : '')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [selectedCouriers, setSelectedCouriers] = useState([])
	const [blueDartPlan, setBlueDartPlan] = useState('')
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [kycStep, setKycStep] = useState(1)
	const [buttonSnippetCopied, setButtonSnippetCopied] = useState(false)
	const [buttonTheme] = useState(readStoredButtonTheme)
	const activeTheme = BUTTON_THEMES.find((theme) => theme.key === buttonTheme) || BUTTON_THEMES[0]
	const securePayButtonSnippet = buildSecurePayButtonSnippet(merchantKey, buttonTheme)

	// Used by the colour picker (switched off for now):
	// function chooseButtonTheme(key) {
	// 	setButtonTheme(key)
	// 	storeButtonTheme(key)
	// }

	useEffect(() => {
		getCourierPreferences()
			.then((data) => {
				const preferences = data.courier_preferences || {}
				setSelectedCouriers(Array.isArray(preferences.couriers) ? preferences.couriers : [])
				setBlueDartPlan(preferences.blue_dart_plan || '')
			})
			.catch((requestError) => setError(requestError.message || 'Could not load courier settings.'))
			.finally(() => setLoading(false))
	}, [])

	function toggleCourier(key) {
		setError('')
		setMessage('')
		setSelectedCouriers((current) => {
			if (current.includes(key)) {
				if (key === 'blue_dart') setBlueDartPlan('')
				return current.filter((courier) => courier !== key)
			}
			return [...current, key]
		})
	}

	async function handleSubmit(event) {
		event.preventDefault()
		setError('')
		setMessage('')

		if (!selectedCouriers.length) return setError('Select at least one courier partner.')
		if (selectedCouriers.includes('blue_dart') && !blueDartPlan) return setError('Choose a Blue Dart service plan.')
		if (blueDartPlan === 'basic') return setError('EscroSafe supports only OTP-enabled Blue Dart plans.')

		setSaving(true)
		try {
			await saveCourierPreferences({ couriers: selectedCouriers, blue_dart_plan: blueDartPlan })
			setMessage('Settings updated successfully.')
			window.dispatchEvent(new Event('securepay-courier-settings-updated'))
		} catch (requestError) {
			setError(requestError.message || 'Could not update courier settings.')
		} finally {
			setSaving(false)
		}
	}

	async function copyButtonSnippet() {
		try {
			await navigator.clipboard.writeText(securePayButtonSnippet)
			setButtonSnippetCopied(true)
			window.setTimeout(() => setButtonSnippetCopied(false), 2200)
		} catch {
			setButtonSnippetCopied(false)
		}
	}

	return (
		<section className="courier-settings-page">
			<div className="dashboard-hero courier-settings-hero">
				<div>
					<p className="eyebrow">Account settings</p>
					<h2 className="dashboard-title">Merchant account settings</h2>
					<p>Manage courier partners, complete KYC readiness, and prepare browser label uploads for your EscroSafe workspace.</p>
				</div>
			</div>

			<div className="courier-settings-panel settings-section-card">
				<div className="settings-section-head">
					<div>
						<span>01</span>
						<h3>Courier options</h3>
						<p>Update the courier partners your business currently uses for shipment tracking and delivery checks.</p>
					</div>
				</div>
				{loading ? <p className="courier-setup-loading">Loading courier settings...</p> : (
					<form onSubmit={handleSubmit}>
						<fieldset className="courier-options">
							<legend>Selected and available partners</legend>
							<div className="courier-option-grid">
								{COURIERS.map((courier) => (
									<label className={`courier-option ${selectedCouriers.includes(courier.key) ? 'is-selected' : ''}`} key={courier.key}>
										<input type="checkbox" checked={selectedCouriers.includes(courier.key)} onChange={() => toggleCourier(courier.key)} />
										<span>{courier.label}</span>
									</label>
								))}
							</div>
						</fieldset>

						{selectedCouriers.includes('blue_dart') && (
							<fieldset className="blue-dart-plans">
								<legend>Blue Dart service plan</legend>
								<p className="field-help">EscroSafe requires OTP-enabled plans for delivery verification.</p>
								<div className="plan-list">
									{BLUE_DART_PLANS.map((plan) => (
										<label className={`plan-option ${blueDartPlan === plan.key ? 'is-selected' : ''} ${!plan.supported ? 'is-unavailable' : ''}`} key={plan.key}>
											<input type="radio" name="blue-dart-plan-settings" checked={blueDartPlan === plan.key} onChange={() => { setBlueDartPlan(plan.key); setError(plan.supported ? '' : 'EscroSafe supports only OTP-enabled Blue Dart plans.') }} />
											<span><strong>{plan.label}</strong><small>{plan.description}</small></span>
										</label>
									))}
								</div>
							</fieldset>
						)}

						{error && <p className="courier-setup-error" role="alert">{error}</p>}
						{message && <p className="courier-settings-success" role="status">{message}</p>}
						<div className="courier-settings-actions">
							<span>Changes are saved to your merchant account.</span>
							<button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update settings'}</button>
						</div>
					</form>
				)}
			</div>

			<div className="settings-section-card settings-info-section">
				<div className="settings-section-head">
					<div>
						<span>02</span>
						<h3>KYC setup</h3>
						<p>Submit the business, contact, document, and bank details needed to review your merchant account.</p>
					</div>
				</div>
				<form className="settings-kyc-form">
					<div className="settings-kyc-stepper" aria-label="KYC steps">
						<button type="button" className={kycStep === 1 ? 'is-active' : ''} onClick={() => setKycStep(1)}>
							<span>1</span>
							<strong>Business verification</strong>
						</button>
						<button type="button" className={kycStep === 2 ? 'is-active' : ''} onClick={() => setKycStep(2)}>
							<span>2</span>
							<strong>Owner & settlement</strong>
						</button>
					</div>

					{kycStep === 1 ? (
						<div className="settings-kyc-fields">
							<label>
								<span>Business type</span>
								<select defaultValue="">
									<option value="" disabled>Select business type</option>
									<option>Individual / freelancer</option>
									<option>Sole proprietorship</option>
									<option>Partnership</option>
									<option>LLP</option>
									<option>Private limited company</option>
									<option>Public limited company</option>
									<option>Trust / NGO</option>
								</select>
							</label>
							<label>
								<span>Registered business name</span>
								<input type="text" placeholder="Acme Traders Pvt Ltd" />
							</label>
							<label>
								<span>Brand / store name</span>
								<input type="text" placeholder="Acme Store" />
							</label>
							<label>
								<span>Business PAN</span>
								<input type="text" placeholder="Business PAN" />
							</label>
							<label>
								<span>GSTIN</span>
								<input type="text" placeholder="GSTIN, if applicable" />
							</label>
							<label>
								<span>Business category</span>
								<input type="text" placeholder="Fashion, electronics, wellness..." />
							</label>
							<label>
								<span>Website / store URL</span>
								<input type="url" placeholder="https://example.com" />
							</label>
							<label>
								<span>Support email</span>
								<input type="email" placeholder="support@example.com" />
							</label>
							<label>
								<span>Support phone</span>
								<input type="tel" placeholder="10 digit mobile number" />
							</label>
							<label>
								<span>Business registration document</span>
								<input type="file" />
							</label>
							<label className="settings-kyc-wide">
								<span>Business address</span>
								<textarea rows="3" placeholder="Registered business address" />
							</label>
							<div className="settings-kyc-actions">
								<p>Save business details first, then add owner and settlement information.</p>
								<button type="button" onClick={() => setKycStep(2)}>Save and continue</button>
							</div>
						</div>
					) : (
						<div className="settings-kyc-fields">
							<label>
								<span>Authorised person name</span>
								<input type="text" placeholder="Full name" />
							</label>
							<label>
								<span>Authorised person PAN</span>
								<input type="text" placeholder="PAN" />
							</label>
							<label>
								<span>Authorised person email</span>
								<input type="email" placeholder="owner@example.com" />
							</label>
							<label>
								<span>Authorised person phone</span>
								<input type="tel" placeholder="10 digit mobile number" />
							</label>
							<label>
								<span>Account holder name</span>
								<input type="text" placeholder="Name as per bank account" />
							</label>
							<label>
								<span>Settlement bank account</span>
								<input type="text" placeholder="Account number" />
							</label>
							<label>
								<span>IFSC code</span>
								<input type="text" placeholder="IFSC code" />
							</label>
							<label>
								<span>Bank name</span>
								<input type="text" placeholder="Bank name" />
							</label>
							<label className="settings-kyc-wide">
								<span>Cancelled cheque / bank statement</span>
								<input type="file" />
							</label>
							<div className="settings-kyc-actions">
								<button type="button" className="settings-kyc-back" onClick={() => setKycStep(1)}>Back</button>
								<p>Submit complete details for EscroSafe review before prepaid workflows are enabled.</p>
								<button type="button">Submit KYC for review</button>
							</div>
						</div>
					)}
				</form>
			</div>

			<div className="settings-section-card settings-info-section">
				<div className="settings-section-head">
					<div>
						<span>03</span>
						<h3>Pay with EscroSafe button</h3>
						<p>Copy this snippet and paste it on the merchant website where the EscroSafe payment button should appear.</p>
					</div>
					<button type="button" className="settings-extension-link" onClick={copyButtonSnippet}>
						{buttonSnippetCopied ? 'Copied' : 'Copy snippet'}
					</button>
				</div>
				<div className="settings-button-snippet-card">
					<div className="settings-pay-button-preview" style={{ '--sp-bg': activeTheme.bg, '--sp-border': activeTheme.border }}>
						<span>Pay with</span>
						<img src={SECUREPAY_BUTTON_LOGO_URL} alt="EscroSafe" />
					</div>
					<pre>{securePayButtonSnippet}</pre>
					{/* Button colour picker, switched off for now (see BUTTON_THEME_PICKER_ENABLED). To bring it back, uncomment:
					<div className="settings-theme-picker">
						<p>Choose a button colour. The snippet above updates automatically.</p>
						<div className="settings-theme-grid" role="radiogroup" aria-label="Button colour">
							{BUTTON_THEMES.map((theme) => (
								<button
									type="button"
									role="radio"
									aria-checked={theme.key === buttonTheme}
									className={`settings-theme-option${theme.key === buttonTheme ? ' is-selected' : ''}`}
									key={theme.key}
									onClick={() => chooseButtonTheme(theme.key)}
								>
									<span className="settings-theme-sample" style={{ background: theme.bg, border: `1.5px solid ${theme.border}` }}>
										Pay with <img src={SECUREPAY_BUTTON_LOGO_URL} alt="" />
									</span>
									<span>{theme.label}</span>
								</button>
							))}
						</div>
					</div>
					*/}
				</div>
			</div>

			<div className="settings-section-card settings-info-section">
				<div className="settings-section-head">
					<div>
						<span>04</span>
						<h3>Browser extension</h3>
						<p>Install the EscroSafe extension in the browser your team uses for courier portals.</p>
					</div>
					<a className="settings-extension-link" href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer">Install extension</a>
				</div>
				<div className="settings-extension-panel">
					<strong>Chrome or Edge extension</strong>
					<p>Use this extension to connect courier PDF label downloads with your EscroSafe merchant workspace. Install it once, then continue using EscroSafe from the same logged-in browser.</p>
				</div>
			</div>
		</section>
	)
}

export default CourierSettings
