import { useEffect, useState } from 'react'
import { getCheckoutSessions, getCourierPreferences, getMerchantKyc, saveCourierPreferences, updateMerchantKyc } from '../api/merchant'
import { API_BASE_URL } from '../api/client'
import { BLUE_DART_PLANS, COURIERS } from '../constants/couriers'
import { getUser } from '../utils/storage'
import { BUTTON_THEMES, readStoredButtonTheme } from '../constants/buttonThemes'
import { readStoredStorePlatform, storeStorePlatform } from '../constants/storePlatforms'
import { StorePlatformPicker, WordPressPluginPanel } from '../components/StoreIntegration'
import { CourierLogoCell } from '../components/CourierLogo'
import chromeLogo from '../assets/platforms/chrome-logo.svg'

const EXTENSION_STORE_URL = import.meta.env.VITE_SECUREPAY_EXTENSION_URL || 'https://chromewebstore.google.com/search/SecurePay%20Label%20Uploader'
// In local development the public button, checkout and API proxy all run on
// the current Vite origin. Production keeps using the explicitly configured
// Escrosafe domains from .env.production.
const LOCAL_DEVELOPMENT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
const SECUREPAY_PUBLIC_ORIGIN = import.meta.env.VITE_SECUREPAY_PUBLIC_ORIGIN || (import.meta.env.DEV ? LOCAL_DEVELOPMENT_ORIGIN : 'https://merchant.escrosafe.com')
const SECUREPAY_API_URL = API_BASE_URL || (import.meta.env.DEV ? LOCAL_DEVELOPMENT_ORIGIN : 'https://api.escrosafe.com')
const SECUREPAY_BUTTON_SCRIPT_URL = import.meta.env.VITE_SECUREPAY_BUTTON_URL || `${SECUREPAY_PUBLIC_ORIGIN}/button.js`
const SECUREPAY_CHECKOUT_URL = import.meta.env.VITE_SECUREPAY_CHECKOUT_URL || `${SECUREPAY_PUBLIC_ORIGIN}/checkout`
const SECUREPAY_SESSION_API_URL = import.meta.env.VITE_SECUREPAY_SESSION_API_URL || `${SECUREPAY_API_URL}/payments/v1/checkout-sessions/`
const SECUREPAY_BUTTON_CONFIG_URL = import.meta.env.VITE_SECUREPAY_BUTTON_CONFIG_URL || `${SECUREPAY_API_URL}/payments/v1/button-config/`

const EMPTY_KYC = {
	vendor_name: '',
	vendor_contact_email: '',
	vendor_contact_num: '',
	vendor_contact_address: '',
	vendor_pan: '',
	settlement_method: 'bank',
	account_name: '',
	account_number: '',
	ifsc_code: '',
	bank_name: '',
	bank_branch: '',
	activate_bharat_qr: false,
	aadhar_number: '',
}

const SECUREPAY_BUTTON_LOGO_URL = new URL('escrosafe-logo.png', SECUREPAY_BUTTON_SCRIPT_URL).toString()

function buildSecurePayButtonSnippet(merchantKey, theme) {
	return `<script src="${SECUREPAY_BUTTON_SCRIPT_URL}" data-button-text="Pay with" data-button-logo-url="${SECUREPAY_BUTTON_LOGO_URL}" data-button-theme="${theme}" data-checkout-url="${SECUREPAY_CHECKOUT_URL}" data-merchant-key="${merchantKey || 'sp_live_xxx'}" data-session-api-url="${SECUREPAY_SESSION_API_URL}" data-config-api-url="${SECUREPAY_BUTTON_CONFIG_URL}"></script>`
}

function CourierSettings() {
	const user = getUser()
	const [merchantKey, setMerchantKey] = useState(() => user?.merchant_key || user?.merchantKey || user?.publishable_key || '')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [selectedCouriers, setSelectedCouriers] = useState([])
	const [blueDartPlan, setBlueDartPlan] = useState('')
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [kycStep, setKycStep] = useState(1)
	const [kyc, setKyc] = useState(EMPTY_KYC)
	const [kycProfile, setKycProfile] = useState(null)
	const [kycLoading, setKycLoading] = useState(true)
	const [kycSaving, setKycSaving] = useState(false)
	const [kycMessage, setKycMessage] = useState('')
	const [kycError, setKycError] = useState('')
	const [isEditingKyc, setIsEditingKyc] = useState(false)
	const [buttonSnippetCopied, setButtonSnippetCopied] = useState(false)
	const [testWebsiteUrl, setTestWebsiteUrl] = useState('')
	const [latestTestSession, setLatestTestSession] = useState(null)
	const [testCheckLoading, setTestCheckLoading] = useState(false)
	const [testIntegrationMessage, setTestIntegrationMessage] = useState('')
	const [buttonTheme] = useState(readStoredButtonTheme)
	const [storePlatform, setStorePlatform] = useState(readStoredStorePlatform)
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
				if (data.merchant_key) setMerchantKey(data.merchant_key)
				const preferences = data.courier_preferences || {}
				setSelectedCouriers(Array.isArray(preferences.couriers) ? preferences.couriers : [])
				setBlueDartPlan(preferences.blue_dart_plan || '')
			})
			.catch((requestError) => setError(requestError.message || 'Could not load courier settings.'))
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => {
		getMerchantKyc()
			.then((data) => {
				setKycProfile(data)
				const details = data.details || {}
				setKyc((current) => ({
					...current,
					...(data.defaults || {}),
					vendor_name: details.vendor_name || data.defaults?.vendor_name || '',
					vendor_contact_email: details.vendor_contact_email || data.defaults?.vendor_contact_email || '',
					vendor_contact_num: details.vendor_contact_num || data.defaults?.vendor_contact_num || '',
					vendor_contact_address: details.vendor_contact_address || data.defaults?.vendor_contact_address || '',
					settlement_method: 'bank',
					account_name: details.account_name || '',
					ifsc_code: details.ifsc_code || '',
					bank_name: details.bank_name || '',
					bank_branch: details.bank_branch || '',
					activate_bharat_qr: Boolean(details.bharat_qr_requested),
				}))
			})
			.catch((requestError) => setKycError(requestError.message || 'Could not load KYC status.'))
			.finally(() => setKycLoading(false))
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

	function chooseStorePlatform(key) {
		setStorePlatform(key)
		storeStorePlatform(key)
	}

	async function copyButtonSnippet() {
		if (!merchantKey) {
			setError('Your merchant key is still loading. Refresh Account Settings and try again.')
			return
		}
		try {
			await navigator.clipboard.writeText(securePayButtonSnippet)
			setButtonSnippetCopied(true)
			window.setTimeout(() => setButtonSnippetCopied(false), 2200)
		} catch {
			setButtonSnippetCopied(false)
		}
	}

	function openTestWebsite() {
		setTestIntegrationMessage('')
		try {
			const url = new URL(testWebsiteUrl)
			if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Enter a complete http:// or https:// website URL.')
			window.open(url.toString(), '_blank', 'noopener,noreferrer')
		} catch (urlError) {
			setTestIntegrationMessage(urlError.message || 'Enter a valid website URL.')
		}
	}

	async function refreshIntegrationTest() {
		setTestCheckLoading(true)
		setTestIntegrationMessage('')
		try {
			const data = await getCheckoutSessions()
			const latest = (data.results || []).find((session) => session.test_mode) || null
			setLatestTestSession(latest)
			setTestIntegrationMessage(latest ? 'Latest custom website test loaded.' : 'No test session found yet. Complete a test from your website first.')
		} catch (requestError) {
			setTestIntegrationMessage(requestError.message || 'Could not check the latest integration test.')
		} finally {
			setTestCheckLoading(false)
		}
	}

	function updateKyc(field, value) {
		setKycError('')
		setKycMessage('')
		setKyc((current) => ({ ...current, [field]: value }))
	}

	function continueKyc() {
		if (!kyc.vendor_name.trim() || !kyc.vendor_contact_email.trim() || !kyc.vendor_contact_num.trim() || !kyc.vendor_pan.trim() || !kyc.vendor_contact_address.trim()) {
			setKycError('Complete every required vendor field before continuing.')
			return
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kyc.vendor_contact_email)) {
			setKycError('Enter a valid contact email address.')
			return
		}
		if (!/^[6-9]\d{9}$/.test(kyc.vendor_contact_num)) {
			setKycError('Enter a valid 10-digit Indian mobile number.')
			return
		}
		if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(kyc.vendor_pan)) {
			setKycError('Enter PAN in the format ABCDE1234F.')
			return
		}
		setKycError('')
		setKycStep(2)
	}

	async function submitKyc(event) {
		event.preventDefault()
		if (kycStep === 1) {
			continueKyc()
			return
		}
		setKycError('')
		setKycMessage('')
		setKycSaving(true)
		try {
			const data = await updateMerchantKyc(isEditingKyc ? { ...kyc, action: 'modify' } : kyc)
			setKycProfile(data)
			setIsEditingKyc(false)
			setKycMessage(isEditingKyc ? 'Updated KYC details submitted to Omniware for reapproval.' : 'KYC details submitted to Omniware for review.')
		} catch (requestError) {
			setKycError(requestError.message || 'Could not submit KYC details.')
		} finally {
			setKycSaving(false)
		}
	}

	function editApprovedKyc() {
		setKycError('')
		setKycMessage('')
		setKycStep(1)
		setIsEditingKyc(true)
	}

	function cancelKycEdit() {
		setKycError('')
		setKycMessage('')
		setKycStep(1)
		setIsEditingKyc(false)
	}

	async function updateKycStatus(action) {
		setKycError('')
		setKycMessage('')
		setKycSaving(true)
		try {
			const data = await updateMerchantKyc({ action })
			setKycProfile(data)
			setKycMessage(data.provider_message || 'KYC status updated.')
		} catch (requestError) {
			setKycError(requestError.message || 'Could not update KYC status.')
		} finally {
			setKycSaving(false)
		}
	}

	return (
		<section className="courier-settings-page">
			<div className="dashboard-hero courier-settings-hero">
				<div>
					<p className="dashboard-eyebrow">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 2.75a2.2 2.2 0 0 1 2.08 1.48l.25.72c.3.12.59.28.86.46l.75-.15a2.2 2.2 0 0 1 2.34 1.07l.67 1.16a2.2 2.2 0 0 1-.26 2.56l-.5.57c.03.32.03.64 0 .96l.5.57a2.2 2.2 0 0 1 .26 2.56l-.67 1.16a2.2 2.2 0 0 1-2.34 1.07l-.75-.15c-.27.18-.56.34-.86.46l-.25.72a2.2 2.2 0 0 1-2.08 1.48h-1.34a2.2 2.2 0 0 1-2.08-1.48l-.25-.72a7 7 0 0 1-.86-.46l-.75.15a2.2 2.2 0 0 1-2.34-1.07l-.67-1.16a2.2 2.2 0 0 1 .26-2.56l.5-.57a5.6 5.6 0 0 1 0-.96l-.5-.57a2.2 2.2 0 0 1-.26-2.56l.67-1.16a2.2 2.2 0 0 1 2.34-1.07l.75.15c.27-.18.56-.34.86-.46l.25-.72a2.2 2.2 0 0 1 2.08-1.48H12Zm-.67 5.65a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm0 2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" />
						</svg>
						Account settings
					</p>
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
										<CourierLogoCell courier={courier.label} />
										<span className="sr-only">{courier.label}</span>
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
							<button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update'}</button>
						</div>
					</form>
				)}
			</div>

			<div className="settings-section-card settings-info-section settings-kyc-section">
				<div className="settings-section-head">
					<div>
						<span>02</span>
						<h3>KYC setup</h3>
						<p>Register your business as an Omniware vendor and submit your bank account for settlement review.</p>
					</div>
				</div>
				<form className="settings-kyc-form" onSubmit={submitKyc} autoComplete="off">
					{kycProfile?.status === 'APPROVED' && !isEditingKyc ? (
						<div className="settings-kyc-approved-summary">
							<span className="settings-kyc-approved-icon" aria-hidden="true">
								<svg viewBox="0 0 24 24"><path d="m7.4 12.3 3.1 3.1 6.4-6.8" /></svg>
							</span>
							<div className="settings-kyc-approved-copy">
								<span>Omniware KYC</span>
								<strong>Approved</strong>
								<p>{kycProfile.provider_message || 'Your vendor and settlement details are verified.'}</p>
							</div>
							<div className="settings-kyc-approved-meta">
								<div><span>Vendor code</span><strong>{kycProfile.vendor_code || 'Not available'}</strong></div>
								<div><span>Settlement account</span><strong>{kycProfile.details?.account_number_masked || 'Verified'}</strong></div>
							</div>
							<button type="button" className="settings-kyc-edit-button" onClick={editApprovedKyc}>Edit details</button>
						</div>
					) : kycProfile?.status && kycProfile.status !== 'NOT_SUBMITTED' && !isEditingKyc ? (
						<div className={`settings-kyc-status is-${kycProfile.status.toLowerCase()}`}>
							<div>
								<span>Omniware vendor status</span>
								<strong>{kycProfile.status.replaceAll('_', ' ')}</strong>
								{kycProfile.vendor_code ? <small>Vendor code: {kycProfile.vendor_code}</small> : null}
								{kycProfile.status === 'APPROVED' && kycProfile.details?.account_number_masked ? <small>Settlement account: {kycProfile.details.account_number_masked}</small> : null}
							</div>
							<p>{kycProfile.provider_message || 'Your vendor information is being reviewed by the payment aggregator.'}</p>
							{kycProfile.status === 'PENDING' && !kycProfile.mock ? <button type="button" onClick={() => updateKycStatus('refresh')} disabled={kycSaving}>Refresh status</button> : null}
						</div>
					) : null}
					{isEditingKyc ? <div className="settings-kyc-edit-bar"><span>Changes require Omniware reapproval</span><button type="button" onClick={cancelKycEdit}>Cancel</button></div> : null}
					{kycLoading ? <p className="courier-setup-loading">Loading Omniware KYC status...</p> : null}
					{!kycLoading && kycProfile?.status !== 'PENDING' && (kycProfile?.status !== 'APPROVED' || isEditingKyc) ? (
						<div className="settings-kyc-flow">
							<div className="settings-kyc-stepper" role="tablist" aria-label="KYC progress">
								<div className={`settings-kyc-step${kycStep === 1 ? ' is-active' : ' is-complete'}`} role="tab" aria-selected={kycStep === 1}><span>{kycStep === 2 ? '✓' : '1'}</span><strong>Vendor details</strong></div>
								<div className={`settings-kyc-step${kycStep === 2 ? ' is-active' : ' is-locked'}`} role="tab" aria-selected={kycStep === 2} aria-disabled={kycStep === 1}><span>2</span><strong>Settlement account</strong></div>
							</div>
							{kycStep === 1 ? (
								<div className="settings-kyc-fields" key="vendor-details">
									<label><span>Vendor / registered business name *</span><input type="text" required value={kyc.vendor_name} onChange={(event) => updateKyc('vendor_name', event.target.value)} placeholder="Acme Traders Pvt Ltd" disabled={!kycProfile?.can_submit && !isEditingKyc} /></label>
									<label><span>Contact email *</span><input type="email" required value={kyc.vendor_contact_email} onChange={(event) => updateKyc('vendor_contact_email', event.target.value)} placeholder="accounts@example.com" disabled={!kycProfile?.can_submit && !isEditingKyc} /></label>
									<label><span>Contact mobile number *</span><input type="tel" required inputMode="numeric" maxLength={10} value={kyc.vendor_contact_num} onChange={(event) => updateKyc('vendor_contact_num', event.target.value.replace(/\D/g, ''))} placeholder="10 digit mobile number" disabled={!kycProfile?.can_submit && !isEditingKyc} /></label>
									<label><span>Vendor PAN *</span><input type="text" required maxLength={10} value={kyc.vendor_pan} onChange={(event) => updateKyc('vendor_pan', event.target.value.toUpperCase())} placeholder="ABCDE1234F" disabled={!kycProfile?.can_submit && !isEditingKyc} /></label>
									<label><span>Registered business address *</span><textarea required rows="2" value={kyc.vendor_contact_address} onChange={(event) => updateKyc('vendor_contact_address', event.target.value)} placeholder="Enter the complete registered business address" disabled={!kycProfile?.can_submit && !isEditingKyc} /></label>
									{kycError ? <p className="courier-setup-error" role="alert">{kycError}</p> : null}
									<div className="settings-kyc-actions"><p>{isEditingKyc ? 'Review these details carefully. Changes require Omniware reapproval.' : 'Complete all vendor details to unlock settlement account setup.'}</p><button type="button" onClick={continueKyc} disabled={!kycProfile?.can_submit && !isEditingKyc}>Continue</button></div>
								</div>
							) : (
								<div className="settings-kyc-fields" key="settlement-account">
									<label><span>Account holder name *</span><input type="text" required value={kyc.account_name} onChange={(event) => updateKyc('account_name', event.target.value)} placeholder="Name as per bank account" /></label>
									<label><span>Bank account number *</span><input type="text" required name="omniwareSettlementAccountNumber" inputMode="numeric" autoComplete="new-password" spellCheck="false" value={kyc.account_number} onChange={(event) => updateKyc('account_number', event.target.value.replace(/\D/g, ''))} placeholder="Enter bank account number" /></label>
									<label><span>IFSC code *</span><input type="text" required maxLength={11} value={kyc.ifsc_code} onChange={(event) => updateKyc('ifsc_code', event.target.value.toUpperCase())} placeholder="ABCD0123456" /></label>
									<label><span>Bank name *</span><input type="text" required value={kyc.bank_name} onChange={(event) => updateKyc('bank_name', event.target.value)} placeholder="Bank name" /></label>
									<label><span>Bank branch (optional)</span><input type="text" value={kyc.bank_branch} onChange={(event) => updateKyc('bank_branch', event.target.value)} placeholder="Bank branch" /></label>
									<label className="settings-kyc-consent"><input type="checkbox" checked={kyc.activate_bharat_qr} onChange={(event) => updateKyc('activate_bharat_qr', event.target.checked)} /><span>Request a Bharat QR from Omniware</span></label>
									{kyc.activate_bharat_qr ? <label><span>Aadhaar number required by Omniware for Bharat QR *</span><input type="password" required inputMode="numeric" maxLength={12} autoComplete="off" value={kyc.aadhar_number} onChange={(event) => updateKyc('aadhar_number', event.target.value.replace(/\D/g, ''))} placeholder="12 digit Aadhaar number" /><small>Sent directly to Omniware and not retained by EscroSafe.</small></label> : null}
									{kycError ? <p className="courier-setup-error" role="alert">{kycError}</p> : null}
									{kycMessage ? <p className="courier-settings-success" role="status">{kycMessage}</p> : null}
									<div className="settings-kyc-actions"><button type="button" className="settings-kyc-back" onClick={() => setKycStep(1)}>Back</button><p>{isEditingKyc ? 'Re-enter the complete account number. Your KYC remains pending until Omniware approves the changes.' : 'Your bank details are transferred securely and sensitive values are not shown again.'}</p><button type="submit" disabled={kycSaving || (!kycProfile?.can_submit && !isEditingKyc)}>{kycSaving ? 'Submitting...' : 'Submit'}</button></div>
								</div>
							)}
						</div>
					) : null}
					{kycProfile?.mock && kycProfile.status === 'PENDING' ? <div className="settings-kyc-mock-tools"><span>Local test controls</span><p>Omniware performs this review in production. Choose a result here to test the UI.</p><button type="button" onClick={() => updateKycStatus('mock_approve')} disabled={kycSaving}>Simulate approval</button><button type="button" onClick={() => updateKycStatus('mock_reject')} disabled={kycSaving}>Simulate rejection</button></div> : null}
				</form>
			</div>

			<div className="settings-section-card settings-info-section settings-store-section">
				<div className="settings-section-head">
					<div>
						<span>03</span>
						<h3>Connect your store</h3>
						<p>Tell us how your website is built and we will show the right way to add the Pay with EscroSafe button.</p>
					</div>
					{storePlatform === 'manual' && (
						<button type="button" className="settings-extension-link" onClick={copyButtonSnippet} disabled={!merchantKey}>
							{buttonSnippetCopied ? 'Copied' : 'Copy snippet'}
						</button>
					)}
				</div>
				<StorePlatformPicker value={storePlatform} onChange={chooseStorePlatform} />
				{storePlatform === 'manual' ? (
					<>
						<p className="store-platform-lead">Copy this snippet and paste it on your website where the EscroSafe payment button should appear.</p>
						<div className="settings-button-snippet-card">
							<div className="settings-snippet-preview">
								<span>Button preview</span>
								<div className="settings-pay-button-preview" style={{ '--sp-bg': activeTheme.bg, '--sp-border': activeTheme.border }}>
									<span>Pay with</span>
									<img src={SECUREPAY_BUTTON_LOGO_URL} alt="EscroSafe" />
								</div>
							</div>
							<div className="settings-snippet-code">
								<span>Embed code</span>
								<pre>{securePayButtonSnippet}</pre>
							</div>
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
						<section className="settings-integration-test" aria-labelledby="custom-site-test-title">
							<div className="settings-integration-test-head">
								<div><span>Safe test mode</span><h4 id="custom-site-test-title">Test your custom-built website</h4><p>Use the integration snippet shown above to verify your button without creating an order or moving money.</p></div>
							</div>
							<div className="settings-integration-test-guide-title"><span>How to test your integration</span><small>The EscroSafe demo page automatically changes the snippet to safe test mode.</small></div>
							<div className="settings-integration-test-steps">
								<div><span>1</span><strong>Copy the snippet above</strong><p>Use the same integration snippet shown with your button preview. A second test snippet is not required.</p></div>
								<div><span>2</span><strong>Open your test page</strong><p>Paste it into the demo merchant page or your private checkout page, then enter that page URL below.</p></div>
								<div><span>3</span><strong>Complete the safe test</strong><p>Click Pay with EscroSafe, simulate the result, then check the latest result here.</p></div>
							</div>
							<div className="settings-integration-test-controls">
								<label><span>Test checkout page URL</span><input type="url" value={testWebsiteUrl} onChange={(event) => setTestWebsiteUrl(event.target.value)} placeholder="https://yourstore.com/test-checkout" /></label>
								<button type="button" onClick={openTestWebsite} disabled={!testWebsiteUrl.trim()}>Open website to test <span aria-hidden="true">↗</span></button>
								<button type="button" className="is-secondary" onClick={refreshIntegrationTest} disabled={testCheckLoading}>{testCheckLoading ? 'Checking...' : 'Check latest result'}</button>
							</div>
							{latestTestSession ? (
								<div className={`settings-integration-test-result is-${String(latestTestSession.test_status || 'not_started').toLowerCase()}`}>
									<span aria-hidden="true">{latestTestSession.test_status === 'SUCCESS' ? '✓' : 'i'}</span>
									<div><strong>{latestTestSession.test_status === 'SUCCESS' ? 'Full test passed' : latestTestSession.test_status === 'NOT_STARTED' ? 'Button connection detected' : `Test ${String(latestTestSession.test_status).toLowerCase()}`}</strong><p>{latestTestSession.source_url || 'Custom website'} · Order {latestTestSession.order_snapshot?.order_id || '-'}</p><small>{latestTestSession.test_status === 'NOT_STARTED' ? 'The button, merchant key, fields and checkout redirect worked. Complete a simulated result on the test checkout.' : 'This was a test-only session. No real order or payment was created.'}</small></div>
								</div>
							) : null}
							{testIntegrationMessage ? <p className="settings-integration-test-message" role="status">{testIntegrationMessage}</p> : null}
						</section>
					</>
				) : (
					<WordPressPluginPanel platform={storePlatform} merchantKey={merchantKey} apiUrl={SECUREPAY_API_URL} scriptUrl={SECUREPAY_BUTTON_SCRIPT_URL} theme={activeTheme} logoUrl={SECUREPAY_BUTTON_LOGO_URL} />
				)}
			</div>

			<div className="settings-section-card settings-info-section settings-extension-section">
				<div className="settings-section-head">
					<div>
						<span>04</span>
						<h3>Browser extension</h3>
						<p>Install the EscroSafe Chrome extension your team uses for courier portals.</p>
					</div>
					<a className="settings-extension-link" href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer">
						Install extension
						<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5h8v8M15 5 6 14" /></svg>
					</a>
				</div>
				<div className="settings-extension-panel">
					<span className="settings-extension-panel-icon" aria-hidden="true">
						<img src={chromeLogo} alt="" />
					</span>
					<div>
						<strong>Chrome extension</strong>
						<p>Connect courier PDF label downloads with your EscroSafe merchant workspace. Install it once, then keep using EscroSafe from the same signed-in Chrome browser.</p>
					</div>
				</div>
			</div>
		</section>
	)
}

export default CourierSettings
