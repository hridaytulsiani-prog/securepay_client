import { useEffect, useMemo, useState } from 'react'
import { getCourierPreferences, saveCourierPreferences } from '../api/merchant'
import { BLUE_DART_PLANS, COURIERS } from '../constants/couriers'
import { getUser } from '../utils/storage'
import { STORE_PLATFORMS, readStoredStorePlatform, storeStorePlatform } from '../constants/storePlatforms'
import { StorePlatformPicker } from './StoreIntegration'

const ONBOARDING_STEPS = [
	{ key: 'couriers', label: 'Delivery partners' },
	{ key: 'store', label: 'Your website' },
	{ key: 'kyc', label: 'KYC setup' },
	{ key: 'extension', label: 'Browser extension (optional)' },
]

const EXTENSION_STORE_URL = import.meta.env.VITE_SECUREPAY_EXTENSION_URL || 'https://chromewebstore.google.com/search/SecurePay%20Label%20Uploader'

function CourierSetupModal() {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [selectedCouriers, setSelectedCouriers] = useState([])
	const [blueDartPlan, setBlueDartPlan] = useState('')
	const [error, setError] = useState('')
	const [hasStarted, setHasStarted] = useState(false)
	const [stepIndex, setStepIndex] = useState(0)
	const [storePlatform, setStorePlatform] = useState(readStoredStorePlatform)
	const user = getUser()

	const displayName = useMemo(() => {
		return user?.merchant_name || user?.name || ''
	}, [user])

	useEffect(() => {
		let active = true
		getCourierPreferences()
			.then((data) => {
				if (!active) return
				const preferences = data.courier_preferences || {}
				setSelectedCouriers(Array.isArray(preferences.couriers) ? preferences.couriers : [])
				setBlueDartPlan(preferences.blue_dart_plan || '')
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
			await saveCourierPreferences({ couriers: selectedCouriers, blue_dart_plan: blueDartPlan })
			setStepIndex(1)
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

	function finishOnboarding() {
		window.dispatchEvent(new Event('securepay-courier-setup-complete'))
	}

	function renderProgress() {
		return (
			<div className="onboarding-progress" aria-label="Onboarding progress">
				{ONBOARDING_STEPS.map((step, index) => (
					<div className={`onboarding-progress-step ${index === stepIndex ? 'is-active' : ''} ${index < stepIndex ? 'is-complete' : ''}`} key={step.key}>
						<span>{index + 1}</span>
						<strong>{step.label}</strong>
					</div>
				))}
			</div>
		)
	}

	function renderWelcome() {
		return (
			<div className="onboarding-welcome">
				<p className="eyebrow">First-time setup</p>
				<h2 id="courier-setup-title">Welcome to EscroSafe{displayName ? `, ${displayName}` : ''}</h2>
				<p>We will set up your shipment assurance workspace in four quick steps so labels, delivery checks, and payment decisions are ready before your team starts processing orders.</p>
				<div className="onboarding-welcome-grid">
					<div><span>01</span><strong>Choose couriers</strong><p>Select the shipping partners your business uses.</p></div>
					<div><span>02</span><strong>Connect your website</strong><p>Tell us if it is custom-built, WordPress or WooCommerce.</p></div>
					<div><span>03</span><strong>Complete KYC</strong><p>Set up your business verification for prepaid orders.</p></div>
					<div><span>04</span><strong>Set up extension (optional)</strong><p>Prepare browser-based PDF label uploads.</p></div>
				</div>
				<button type="button" className="primary-button onboarding-main-action" onClick={() => setHasStarted(true)}>
					Start onboarding
				</button>
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
					<p className="courier-setup-note">
						Note: If your labels are generated through Shiprocket, select Shiprocket only. Do not also select the final delivery courier such as Blue Dart, Xpressbees, or Delhivery for those same Shiprocket shipments.
					</p>
					<div className="courier-option-grid">
						{COURIERS.map((courier) => (
							<label className={`courier-option ${selectedCouriers.includes(courier.key) ? 'is-selected' : ''}`} key={courier.key}>
								<input
									type="checkbox"
									checked={selectedCouriers.includes(courier.key)}
									onChange={() => toggleCourier(courier.key)}
								/>
								<span>{courier.label}</span>
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
				<div className="onboarding-info-grid">
					<div><strong>Install once</strong><p>Add the extension to Chrome or Edge for the operations browser used to download courier labels.</p></div>
					<div><strong>No token copy</strong><p>Your active EscroSafe login is used automatically, so the merchant team does not paste any token manually.</p></div>
					<div><strong>Upload labels faster</strong><p>New courier PDF labels can be captured and sent into EscroSafe without repeating manual uploads.</p></div>
				</div>
				<div className="onboarding-callout">
					<p>Install the EscroSafe extension from Chrome Web Store, then return here and finish onboarding when your browser is ready.</p>
					<div className="onboarding-callout-actions">
						<a href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer">Install extension</a>
					</div>
				</div>
				<div className="courier-setup-footer">
					<button type="button" className="secondary-button" onClick={() => setStepIndex(2)}>Back</button>
					<button type="button" className="primary-button" onClick={finishOnboarding}>Finish onboarding</button>
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
					<p>You can get the snippet or plugin, and your Merchant Key, anytime from Settings → Connect your store.</p>
				</div>
				<div className="courier-setup-footer">
					<button type="button" className="secondary-button" onClick={() => setStepIndex(0)}>Back</button>
					<button type="button" className="primary-button" onClick={() => setStepIndex(2)}>Next</button>
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
					<p>Verify your business details so your store can offer prepaid checkout to more serious buyers with confidence.</p>
				</div>
				<div className="onboarding-info-grid onboarding-info-grid-final">
					<div><strong>Business details</strong><p>Add your registered business name, contact details, address, and required documents.</p></div>
					<div><strong>Bank verification</strong><p>Confirm where your prepaid order earnings should be settled after verification is complete.</p></div>
					<div><strong>Prepaid readiness</strong><p>Once approved, your store is ready to take prepaid orders with stronger buyer commitment.</p></div>
				</div>
				<div className="onboarding-callout">
					<p>KYC is required before your account can fully use prepaid order assurance. You can complete or continue this from your merchant profile.</p>
				</div>
				<div className="courier-setup-footer">
					<button type="button" className="secondary-button" onClick={() => setStepIndex(1)}>Back</button>
					<button type="button" className="primary-button" onClick={() => setStepIndex(3)}>Next</button>
				</div>
			</div>
		)
	}

	function renderCurrentStep() {
		if (!hasStarted) return renderWelcome()
		if (loading) return <p className="courier-setup-loading">Loading your account setup...</p>
		if (stepIndex === 0) return renderCourierStep()
		if (stepIndex === 1) return renderStoreStep()
		if (stepIndex === 2) return renderKycStep()
		return renderExtensionStep()
	}

	return (
		<div className="courier-setup-overlay" role="presentation">
			<div className="courier-setup-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="courier-setup-title">
				{hasStarted && renderProgress()}
				{renderCurrentStep()}
			</div>
		</div>
	)
}

export default CourierSetupModal
