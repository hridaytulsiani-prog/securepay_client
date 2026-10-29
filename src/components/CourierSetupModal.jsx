import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCourierPreferences, getMerchantKyc, saveCourierPreferences, updateMerchantKyc } from '../api/merchant'
import { BLUE_DART_PLANS, COURIERS } from '../constants/couriers'
import { clearAuthSession, getUser } from '../utils/storage'
import { clearOnboardingProgress, loadOnboardingProgress, saveOnboardingProgress } from '../utils/onboardingProgress'
import { STORE_PLATFORMS, readStoredStorePlatform, storeStorePlatform } from '../constants/storePlatforms'
import { CourierLogoCell } from './CourierLogo'
import { StorePlatformPicker } from './StoreIntegration'
import chromeLogo from '../assets/platforms/chrome-logo.svg'

const ONBOARDING_STEPS = [
	{ key: 'couriers', label: 'Delivery partners', description: 'Choose the courier partners used by your store.' },
	{ key: 'store', label: 'Your website', description: 'Select how your website or checkout is built.' },
	{ key: 'kyc', label: 'KYC setup', description: 'Review the merchant and settlement information required.' },
	{ key: 'extension', label: 'Browser extension', description: 'Optionally prepare faster shipment-label capture.' },
]

const EXTENSION_STORE_URL = import.meta.env.VITE_SECUREPAY_EXTENSION_URL || 'https://chromewebstore.google.com/search/SecurePay%20Label%20Uploader'

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

function CourierSetupModal() {
	const navigate = useNavigate()
	const user = useMemo(() => getUser(), [])
	const initialProgress = useMemo(() => loadOnboardingProgress(user), [user])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [selectedCouriers, setSelectedCouriers] = useState(() => initialProgress?.selectedCouriers || [])
	const [blueDartPlan, setBlueDartPlan] = useState(() => initialProgress?.blueDartPlan || '')
	const [error, setError] = useState('')
	const [hasStarted, setHasStarted] = useState(() => Boolean(initialProgress?.hasStarted))
	const [stepIndex, setStepIndex] = useState(() => Math.min(Math.max(initialProgress?.stepIndex || 0, 0), ONBOARDING_STEPS.length - 1))
	const [completedSteps, setCompletedSteps] = useState(() => Array.isArray(initialProgress?.completedSteps) ? initialProgress.completedSteps : [])
	const [showProgressOverview, setShowProgressOverview] = useState(true)
	const [storePlatform, setStorePlatform] = useState(() => initialProgress?.storePlatform || readStoredStorePlatform())
	const [kycStep, setKycStep] = useState(1)
	const [kyc, setKyc] = useState(EMPTY_KYC)
	const [kycLoading, setKycLoading] = useState(true)
	const [kycSaving, setKycSaving] = useState(false)
	const [kycError, setKycError] = useState('')

	const displayName = useMemo(() => {
		return user?.merchant_name || user?.name || ''
	}, [user])

	useEffect(() => {
		let active = true
		getCourierPreferences()
			.then((data) => {
				if (!active) return
				const preferences = data.courier_preferences || {}
				if (Array.isArray(preferences.couriers) && preferences.couriers.length) {
					setSelectedCouriers(preferences.couriers)
					setBlueDartPlan(preferences.blue_dart_plan || '')
					setCompletedSteps((current) => current.includes('couriers') ? current : [...current, 'couriers'])
				}
			})
			.catch((requestError) => {
				if (active) setError(requestError.message || 'Could not load courier preferences.')
			})
			.finally(() => {
				if (active) setLoading(false)
			})

		return () => {
			active = false
		}
	}, [])

	useEffect(() => {
		let active = true
		getMerchantKyc()
			.then((data) => {
				if (!active) return
				const details = data.details || {}
				const defaults = data.defaults || {}
				setKyc((current) => ({
					...current,
					...defaults,
					vendor_name: details.vendor_name || defaults.vendor_name || '',
					vendor_contact_email: details.vendor_contact_email || defaults.vendor_contact_email || '',
					vendor_contact_num: details.vendor_contact_num || defaults.vendor_contact_num || '',
					vendor_contact_address: details.vendor_contact_address || defaults.vendor_contact_address || '',
					account_name: details.account_name || '',
					ifsc_code: details.ifsc_code || '',
					bank_name: details.bank_name || '',
					bank_branch: details.bank_branch || '',
					activate_bharat_qr: Boolean(details.bharat_qr_requested),
				}))
				if (data.status === 'PENDING' || data.status === 'APPROVED') {
					setCompletedSteps((current) => current.includes('kyc') ? current : [...current, 'kyc'])
					setStepIndex((current) => current === 2 ? 3 : current)
				}
			})
			.catch((requestError) => {
				if (active) setKycError(requestError.message || 'Could not load merchant KYC details.')
			})
			.finally(() => {
				if (active) setKycLoading(false)
			})

		return () => {
			active = false
		}
	}, [])

	useEffect(() => {
		if (!hasStarted) return
			saveOnboardingProgress(user, {
			hasStarted: true,
			completed: false,
			stepIndex,
			completedSteps,
			selectedCouriers,
			blueDartPlan,
			storePlatform,
		})
	}, [blueDartPlan, completedSteps, hasStarted, selectedCouriers, stepIndex, storePlatform, user])

	function toggleCourier(key) {
		setError('')
		setSelectedCouriers((current) => {
			if (current.includes(key)) {
				if (key === 'blue_dart') setBlueDartPlan('')
				return current.filter((courier) => courier !== key)
			}
			return [...current, key]
		})
	}

	function selectBlueDartPlan(plan) {
		setBlueDartPlan(plan)
		setError(plan === 'basic' ? 'EscroSafe supports only OTP-enabled Blue Dart plans. Choose Advanced or Pro.' : '')
	}

	function markStepComplete(index, nextIndex) {
		const stepKey = ONBOARDING_STEPS[index].key
		setCompletedSteps((current) => current.includes(stepKey) ? current : [...current, stepKey])
		if (typeof nextIndex === 'number') setStepIndex(nextIndex)
	}

	function openStep(index) {
		setHasStarted(true)
		setShowProgressOverview(false)
		setStepIndex(index)
		setError('')
	}

	function startOrResumeOnboarding() {
		const firstIncompleteIndex = ONBOARDING_STEPS.findIndex((step) => !completedSteps.includes(step.key))
		openStep(firstIncompleteIndex === -1 ? Math.min(stepIndex, ONBOARDING_STEPS.length - 1) : firstIncompleteIndex)
	}

	function saveAndExit() {
		saveOnboardingProgress(user, {
			hasStarted: true,
			completed: false,
			stepIndex,
			completedSteps,
			selectedCouriers,
			blueDartPlan,
			storePlatform,
		})
		clearAuthSession()
		navigate('/login', { replace: true })
	}

	async function saveCouriersAndContinue(event) {
		event.preventDefault()
		setError('')

		if (!selectedCouriers.length) {
			setError('Select at least one courier partner.')
			return
		}
		if (selectedCouriers.includes('blue_dart') && !blueDartPlan) {
			setError('Choose a Blue Dart service plan.')
			return
		}
		const selectedBlueDartPlan = BLUE_DART_PLANS.find((plan) => plan.key === blueDartPlan)
		if (selectedCouriers.includes('blue_dart') && !selectedBlueDartPlan?.supported) {
			setError('EscroSafe supports only OTP-enabled Blue Dart plans. Choose Advanced or Pro.')
			return
		}

		setSaving(true)
		try {
			await saveCourierPreferences({ couriers: selectedCouriers, blue_dart_plan: blueDartPlan, complete_setup: false })
			markStepComplete(0, 1)
		} catch (requestError) {
			setError(requestError.message || 'Could not save courier preferences.')
		} finally {
			setSaving(false)
		}
	}

	function chooseStorePlatform(key) {
		setStorePlatform(key)
		storeStorePlatform(key)
	}

	function updateKyc(field, value) {
		setKycError('')
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

	async function submitOnboardingKyc(event) {
		event.preventDefault()
		if (kycStep === 1) {
			continueKyc()
			return
		}
		if (!kyc.account_name.trim() || !kyc.account_number.trim() || !kyc.ifsc_code.trim() || !kyc.bank_name.trim()) {
			setKycError('Complete every required settlement account field before submitting.')
			return
		}
		if (!/^\d{6,50}$/.test(kyc.account_number)) {
			setKycError('Enter a valid bank account number using digits only.')
			return
		}
		if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(kyc.ifsc_code)) {
			setKycError('Enter a valid 11-character IFSC code.')
			return
		}
		if (kyc.activate_bharat_qr && !/^\d{12}$/.test(kyc.aadhar_number)) {
			setKycError('Enter the 12-digit Aadhaar number required for Bharat QR.')
			return
		}

		setKycError('')
		setKycSaving(true)
		try {
			await updateMerchantKyc(kyc)
			markStepComplete(2, 3)
		} catch (requestError) {
			setKycError(requestError.message || 'Could not submit KYC details.')
		} finally {
			setKycSaving(false)
		}
	}

	async function finishOnboarding() {
		setError('')
		setSaving(true)
		try {
			await saveCourierPreferences({ couriers: selectedCouriers, blue_dart_plan: blueDartPlan, complete_setup: true })
			clearOnboardingProgress(user)
			window.dispatchEvent(new Event('securepay-courier-setup-complete'))
		} catch (requestError) {
			setError(requestError.message || 'Could not finish onboarding. Your progress is still saved.')
		} finally {
			setSaving(false)
		}
	}

	function renderProgress() {
		const completedCount = completedSteps.length
		const firstIncompleteIndex = ONBOARDING_STEPS.findIndex((step) => !completedSteps.includes(step.key))
		return (
			<div className="onboarding-progress-shell">
				<div className="onboarding-progress-toolbar">
					<p><strong>{completedCount} of {ONBOARDING_STEPS.length}</strong> steps completed</p>
					<div>
						<button type="button" onClick={() => setShowProgressOverview(true)}>View all steps</button>
						<button type="button" className="onboarding-save-exit" onClick={saveAndExit}>Save and exit</button>
					</div>
				</div>
				<div className="onboarding-progress" aria-label="Onboarding progress">
					{ONBOARDING_STEPS.map((step, index) => {
						const isComplete = completedSteps.includes(step.key)
						const canOpen = isComplete || index === firstIncompleteIndex || index === stepIndex
						return (
							<button type="button" className={`onboarding-progress-step ${index === stepIndex ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`} key={step.key} onClick={() => openStep(index)} disabled={!canOpen}>
								<span>{isComplete ? '✓' : index + 1}</span>
								<strong>{step.label}</strong>
							</button>
						)
					})}
				</div>
				<div className="onboarding-progress-meter" aria-hidden="true"><span style={{ width: `${(completedCount / ONBOARDING_STEPS.length) * 100}%` }} /></div>
			</div>
		)
	}

	function renderWelcome() {
		const completedCount = completedSteps.length
		const firstIncompleteIndex = ONBOARDING_STEPS.findIndex((step) => !completedSteps.includes(step.key))
		return (
			<div className="onboarding-welcome onboarding-overview">
				<p className="eyebrow">{hasStarted ? 'Saved onboarding progress' : 'First-time setup'}</p>
				<h2 id="courier-setup-title">{hasStarted ? 'Your EscroSafe setup progress' : `Welcome to EscroSafe${displayName ? `, ${displayName}` : ''}`}</h2>
				<p>{hasStarted ? 'Continue where you left off, or review any completed step before finishing setup.' : 'Complete these four guided steps. Your progress is saved, so you can exit and continue later.'}</p>
				<div className="onboarding-overview-summary">
					<div><strong>{completedCount}</strong><span>of {ONBOARDING_STEPS.length} steps completed</span></div>
					<div className="onboarding-progress-meter" aria-label={`${completedCount} of ${ONBOARDING_STEPS.length} onboarding steps completed`}><span style={{ width: `${(completedCount / ONBOARDING_STEPS.length) * 100}%` }} /></div>
				</div>
				<div className="onboarding-welcome-grid" role="list" aria-label="Onboarding checklist">
					{ONBOARDING_STEPS.map((step, index) => {
						const isComplete = completedSteps.includes(step.key)
						const isNext = index === firstIncompleteIndex
						const canOpen = isComplete || isNext
						return (
							<button type="button" role="listitem" className={`onboarding-overview-step${isComplete ? ' is-complete' : ''}${isNext ? ' is-next' : ''}`} key={step.key} onClick={() => openStep(index)} disabled={!canOpen}>
								<span className="onboarding-overview-step-icon">{isComplete ? '✓' : index + 1}</span>
								<span className="onboarding-overview-step-copy"><strong>{step.label}</strong><small>{step.description}</small></span>
								<span className="onboarding-overview-step-status">{isComplete ? 'Completed' : isNext ? 'Next step' : 'Remaining'}</span>
							</button>
						)
					})}
				</div>
				<div className="onboarding-overview-actions">
					{hasStarted ? <button type="button" className="secondary-button" onClick={saveAndExit}>Save and exit</button> : <span />}
					<button type="button" className="primary-button onboarding-main-action" onClick={startOrResumeOnboarding}>
						{hasStarted ? 'Continue setup' : 'Start onboarding'}
					</button>
				</div>
			</div>
		)
	}

	function renderCourierStep() {
		return (
			<form onSubmit={saveCouriersAndContinue}>
				<div className="courier-setup-header">
					<p className="eyebrow">Step 1 of 4</p>
					<h2 id="courier-setup-title">Choose your delivery partners</h2>
					<p>Choose the courier partners you already use. EscroSafe will set up tracking and delivery checks around them.</p>
				</div>

				<fieldset className="courier-options">
					<legend>Supported courier partners</legend>
					<div className="courier-option-grid">
						{COURIERS.map((courier) => (
							<label className={`courier-option ${selectedCouriers.includes(courier.key) ? 'is-selected' : ''}`} key={courier.key}>
								<input
									type="checkbox"
									checked={selectedCouriers.includes(courier.key)}
									onChange={() => toggleCourier(courier.key)}
								/>
								<CourierLogoCell courier={courier.label} />
								<span className="sr-only">{courier.label}</span>
							</label>
						))}
					</div>
				</fieldset>

				{selectedCouriers.includes('blue_dart') && (
					<fieldset className="blue-dart-plans">
						<legend>Blue Dart service plan</legend>
						<p className="field-help">EscroSafe requires OTP-enabled Blue Dart plans for delivery verification. Choose Advanced or Pro.</p>
						<div className="plan-list">
							{BLUE_DART_PLANS.map((plan) => (
								<label className={`plan-option ${blueDartPlan === plan.key ? 'is-selected' : ''} ${!plan.supported ? 'is-unavailable' : ''}`} key={plan.key}>
									<input type="radio" name="blue-dart-plan" value={plan.key} checked={blueDartPlan === plan.key} onChange={() => selectBlueDartPlan(plan.key)} />
									<span>
										<strong>{plan.label}</strong>
										<small>{plan.description}</small>
									</span>
								</label>
							))}
						</div>
					</fieldset>
				)}

				{error && <p className="courier-setup-error" role="alert">{error}</p>}
				<div className="courier-setup-footer">
					<p>Your choices are saved to your merchant account.</p>
					<button type="submit" className="primary-button" disabled={saving}>
						{saving ? 'Saving...' : 'Save and next'}
					</button>
				</div>
			</form>
		)
	}

	function renderExtensionStep() {
		return (
			<div>
				<div className="courier-setup-header">
					<p className="eyebrow">Step 4 of 4</p>
					<h2 id="courier-setup-title">Set up browser label capture <span>(optional)</span></h2>
					<p>Use the EscroSafe browser extension to capture courier PDF labels from Chrome or Edge with less manual upload work.</p>
				</div>
				<div className="onboarding-extension-panel">
					<span className="onboarding-extension-icon" aria-hidden="true"><img src={chromeLogo} alt="" /></span>
					<div className="onboarding-extension-copy">
						<strong>EscroSafe Chrome extension</strong>
						<p>Connect courier PDF label downloads with your EscroSafe merchant workspace. Install it once in the signed-in Chrome browser used by your operations team.</p>
					</div>
					<a className="onboarding-extension-install" href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer">Install extension <span aria-hidden="true">↗</span></a>
				</div>
				<div className="onboarding-info-grid onboarding-extension-benefits">
					<div><span>01</span><strong>Install once</strong><p>Add the extension to the browser used to download courier labels.</p></div>
					<div><span>02</span><strong>No token copy</strong><p>Your active EscroSafe login connects the merchant workspace automatically.</p></div>
					<div><span>03</span><strong>Upload labels faster</strong><p>Capture new courier PDF labels without repeating manual uploads.</p></div>
				</div>
				<div className="courier-setup-footer">
					<button type="button" className="secondary-button" onClick={() => setStepIndex(2)}>Back</button>
					{error ? <p className="courier-setup-error" role="alert">{error}</p> : <p>The browser extension is optional and can be installed later.</p>}
					<button type="button" className="primary-button" onClick={finishOnboarding} disabled={saving}>{saving ? 'Finishing...' : 'Finish onboarding'}</button>
				</div>
			</div>
		)
	}

	function renderStoreStep() {
		const platform = STORE_PLATFORMS.find((item) => item.key === storePlatform) || STORE_PLATFORMS[0]
		const details = {
			manual: 'You will get a short snippet to paste on your website. The Pay with EscroSafe button then appears where you place it.',
			wordpress: 'You will get the EscroSafe plugin for WordPress. Install it, then add a shortcode where the Pay with EscroSafe button should appear.',
			woocommerce: 'You will get the EscroSafe plugin for WooCommerce. Install it and Pay with EscroSafe is added to your checkout automatically.',
		}
		return (
			<div>
				<div className="courier-setup-header">
					<p className="eyebrow">Step 2 of 4</p>
					<h2 id="courier-setup-title">How is your website built?</h2>
					<p>This lets us show the easiest way to add Pay with EscroSafe to your store.</p>
				</div>
				<StorePlatformPicker value={storePlatform} onChange={chooseStorePlatform} />
				<div className="onboarding-callout">
					<p><strong>{platform.label}.</strong> {details[platform.key]}</p>
				</div>
				<div className="courier-setup-footer">
					<button type="button" className="secondary-button" onClick={() => setStepIndex(0)}>Back</button>
					<p>Your website selection is saved automatically.</p>
					<button type="button" className="primary-button" onClick={() => markStepComplete(1, 2)}>Save and next</button>
				</div>
			</div>
		)
	}

	function renderKycStep() {
		return (
			<div>
				<div className="courier-setup-header">
					<p className="eyebrow">Step 3 of 4</p>
					<h2 id="courier-setup-title">Complete your merchant KYC</h2>
					<p>Enter the same vendor and settlement information used in Account settings. Your completed KYC is submitted securely for review.</p>
				</div>
				<form className="settings-kyc-form onboarding-kyc-demo" onSubmit={submitOnboardingKyc} autoComplete="off" aria-label="Merchant KYC form">
					<div className="onboarding-kyc-demo-heading">
						<div>
							<span>Merchant KYC</span>
							<strong>Vendor registration and settlement account</strong>
						</div>
						<small>Your KYC status remains available in Account settings.</small>
					</div>
					<div className="settings-kyc-stepper" role="tablist" aria-label="KYC progress">
						<button type="button" className={`settings-kyc-step${kycStep === 1 ? ' is-active' : ' is-complete'}`} role="tab" aria-selected={kycStep === 1} onClick={() => setKycStep(1)}><span>{kycStep === 2 ? '✓' : '1'}</span><strong>Vendor details</strong></button>
						<button type="button" className={`settings-kyc-step${kycStep === 2 ? ' is-active' : ' is-locked'}`} role="tab" aria-selected={kycStep === 2} aria-disabled={kycStep === 1} disabled={kycStep === 1} onClick={() => setKycStep(2)}><span>2</span><strong>Settlement account</strong></button>
					</div>
					{kycLoading ? <p className="courier-setup-loading">Loading merchant KYC details...</p> : kycStep === 1 ? (
						<div className="settings-kyc-fields" key="vendor-details">
							<label><span>Vendor / registered business name *</span><input type="text" required value={kyc.vendor_name} onChange={(event) => updateKyc('vendor_name', event.target.value)} placeholder="Acme Traders Pvt Ltd" /></label>
							<label><span>Contact email *</span><input type="email" required value={kyc.vendor_contact_email} onChange={(event) => updateKyc('vendor_contact_email', event.target.value)} placeholder="accounts@example.com" /></label>
							<label><span>Contact mobile number *</span><input type="tel" required inputMode="numeric" maxLength={10} value={kyc.vendor_contact_num} onChange={(event) => updateKyc('vendor_contact_num', event.target.value.replace(/\D/g, ''))} placeholder="10 digit mobile number" /></label>
							<label><span>Vendor PAN *</span><input type="text" required maxLength={10} value={kyc.vendor_pan} onChange={(event) => updateKyc('vendor_pan', event.target.value.toUpperCase())} placeholder="ABCDE1234F" /></label>
							<label className="onboarding-kyc-wide"><span>Registered business address *</span><textarea required rows="2" value={kyc.vendor_contact_address} onChange={(event) => updateKyc('vendor_contact_address', event.target.value)} placeholder="Enter the complete registered business address" /></label>
							{kycError ? <p className="courier-setup-error" role="alert">{kycError}</p> : null}
							<div className="settings-kyc-actions onboarding-kyc-demo-actions"><button type="button" className="settings-kyc-back" onClick={() => setStepIndex(1)}>Back</button><p>Complete all vendor details before adding your settlement account.</p><button type="submit">Continue</button></div>
						</div>
					) : (
						<div className="settings-kyc-fields" key="settlement-account">
							<label><span>Account holder name *</span><input type="text" required value={kyc.account_name} onChange={(event) => updateKyc('account_name', event.target.value)} placeholder="Name as per bank account" /></label>
							<label><span>Bank account number *</span><input type="text" required name="onboardingSettlementAccountNumber" inputMode="numeric" autoComplete="new-password" spellCheck="false" value={kyc.account_number} onChange={(event) => updateKyc('account_number', event.target.value.replace(/\D/g, ''))} placeholder="Enter bank account number" /></label>
							<label><span>IFSC code *</span><input type="text" required maxLength={11} value={kyc.ifsc_code} onChange={(event) => updateKyc('ifsc_code', event.target.value.toUpperCase())} placeholder="ABCD0123456" /></label>
							<label><span>Bank name *</span><input type="text" required value={kyc.bank_name} onChange={(event) => updateKyc('bank_name', event.target.value)} placeholder="Bank name" /></label>
							<label><span>Bank branch (optional)</span><input type="text" value={kyc.bank_branch} onChange={(event) => updateKyc('bank_branch', event.target.value)} placeholder="Bank branch" /></label>
							<label className="settings-kyc-consent"><input type="checkbox" checked={kyc.activate_bharat_qr} onChange={(event) => updateKyc('activate_bharat_qr', event.target.checked)} /><span>Request a Bharat QR from Omniware</span></label>
							{kyc.activate_bharat_qr ? <label><span>Aadhaar number required by Omniware for Bharat QR *</span><input type="password" required inputMode="numeric" maxLength={12} autoComplete="off" value={kyc.aadhar_number} onChange={(event) => updateKyc('aadhar_number', event.target.value.replace(/\D/g, ''))} placeholder="12 digit Aadhaar number" /><small>Sent directly to Omniware and not retained by EscroSafe.</small></label> : null}
							{kycError ? <p className="courier-setup-error" role="alert">{kycError}</p> : null}
							<div className="settings-kyc-actions onboarding-kyc-demo-actions"><button type="button" className="settings-kyc-back" onClick={() => setKycStep(1)}>Back</button><p>Your bank details are transferred securely and sensitive values are not shown again.</p><button type="submit" disabled={kycSaving}>{kycSaving ? 'Submitting...' : 'Submit KYC and continue'}</button></div>
						</div>
					)}
				</form>
			</div>
		)
	}

	function renderCurrentStep() {
		if (!hasStarted || showProgressOverview) return renderWelcome()
		if (loading) return <p className="courier-setup-loading">Loading your account setup...</p>
		if (stepIndex === 0) return renderCourierStep()
		if (stepIndex === 1) return renderStoreStep()
		if (stepIndex === 2) return renderKycStep()
		return renderExtensionStep()
	}

	return (
		<div className="courier-setup-overlay" role="presentation">
			<div className="courier-setup-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="courier-setup-title">
				{hasStarted && !showProgressOverview && renderProgress()}
				{renderCurrentStep()}
			</div>
		</div>
	)
}

export default CourierSetupModal
