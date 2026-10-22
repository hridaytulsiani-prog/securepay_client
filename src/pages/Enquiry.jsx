// Public, no-login wizard a customer lands on from the signed delivery-
// notification link (order_id + sig in the URL — see tracking.signing).
// Progress is saved to localStorage per order_id so a customer who closes
// the tab partway through picks up where they left off on the same link.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { submitEnquiry } from '../api/enquiry'
import escrosafeLogo from '../assets/escrosafe-logo.png'

const STEP = {
	RECEIVED: 'received',
	CHECKED_WITH_FAMILY: 'checked_with_family',
	SAVED_PROGRESS: 'saved_progress',
	AGENT_CONTACTED: 'agent_contacted',
	OTP_SHARED: 'otp_shared',
	UNBOXING_VIDEO: 'unboxing_video',
	UPLOAD: 'upload',
	REVIEW: 'review',
	THANK_YOU: 'thank_you',
}

function draftKey(orderId) {
	return `enquiry-draft-${orderId}`
}

function loadDraft(orderId) {
	try {
		const raw = window.localStorage.getItem(draftKey(orderId))
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

function saveDraft(orderId, draft) {
	try {
		window.localStorage.setItem(draftKey(orderId), JSON.stringify(draft))
	} catch {
		// ignore storage failures (private browsing, quota, etc.)
	}
}

function clearDraft(orderId) {
	try {
		window.localStorage.removeItem(draftKey(orderId))
	} catch {
		// ignore
	}
}

function YesNoQuestion({ question, yesLabel = 'Yes', noLabel = 'No', yesHelp, noHelp, value, onAnswer, onPrevious, onNext }) {
	return (
		<div className="enquiry-step">
			<p className="enquiry-question">{question}</p>
			<p className="enquiry-step-help">Choose the option that best matches what happened.</p>
			<div className="enquiry-options is-two">
				<button className={`enquiry-choice ${value === true ? 'is-selected' : ''}`} type="button" onClick={() => onAnswer(true)}>
					<span>{yesLabel}</span><small>{yesHelp}</small>
				</button>
				<button className={`enquiry-choice ${value === false ? 'is-selected' : ''}`} type="button" onClick={() => onAnswer(false)}>
					<span>{noLabel}</span><small>{noHelp}</small>
				</button>
			</div>
			<div className="enquiry-step-navigation">
				<button className="enquiry-previous-action" type="button" onClick={onPrevious}>← Previous</button>
				<button className="enquiry-next-action" type="button" onClick={onNext} disabled={typeof value !== 'boolean'}>Next →</button>
			</div>
		</div>
	)
}

function Enquiry() {
	const [searchParams] = useSearchParams()
	const orderId = (searchParams.get('order_id') || '').trim()
	const sig = (searchParams.get('sig') || '').trim()
	const hasValidLink = Boolean(orderId && sig)

	const draft = hasValidLink ? loadDraft(orderId) : null
	const [step, setStep] = useState(() => {
		if (!hasValidLink) return null
		if (draft?.step) return draft.step
		return STEP.RECEIVED
	})
	const [answers, setAnswers] = useState(() => draft?.answers || {})
	const [evidenceFile, setEvidenceFile] = useState(null)
	const [additionalMessage, setAdditionalMessage] = useState(() => draft?.additionalMessage || '')
	const [hasConsent, setHasConsent] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	useEffect(() => {
		if (!hasValidLink || !step || step === STEP.THANK_YOU) return
		saveDraft(orderId, { step, answers, additionalMessage })
	}, [additionalMessage, answers, hasValidLink, orderId, step])

	const progressByStep = {
		[STEP.RECEIVED]: 1,
		[STEP.CHECKED_WITH_FAMILY]: 2,
		[STEP.SAVED_PROGRESS]: 2,
		[STEP.AGENT_CONTACTED]: 2,
		[STEP.OTP_SHARED]: 3,
		[STEP.UNBOXING_VIDEO]: 2,
		[STEP.UPLOAD]: 3,
		[STEP.REVIEW]: 4,
		[STEP.THANK_YOU]: 4,
	}
	const progressStep = progressByStep[step] || 1

	const goTo = (nextStep, nextAnswers = answers) => {
		setStep(nextStep)
		saveDraft(orderId, { step: nextStep, answers: nextAnswers, additionalMessage })
	}

	const handleReceived = (choice) => {
		if (choice === 'correct') {
			setAnswers((prev) => ({ ...prev, receiptStatus: 'received' }))
			clearDraft(orderId)
			setStep(STEP.THANK_YOU)
		} else if (choice === 'not_received') {
			const nextAnswers = { ...answers, receiptStatus: 'not_received' }
			setAnswers(nextAnswers)
			goTo(STEP.CHECKED_WITH_FAMILY, nextAnswers)
		} else {
			const nextAnswers = { ...answers, receiptStatus: 'wrong_order' }
			setAnswers(nextAnswers)
			goTo(STEP.UNBOXING_VIDEO, nextAnswers)
		}
	}

	const handleSaveForLater = () => {
		saveDraft(orderId, { step: STEP.CHECKED_WITH_FAMILY, answers, additionalMessage })
		setStep(STEP.SAVED_PROGRESS)
	}

	// Free-text summary the admin panel later shows verbatim in its Message
	// column — built here rather than left for a human to type, so every
	// enquiry's text is a consistent shape regardless of which branch the
	// customer took through the wizard.
	const buildEnquiryMessage = () => {
		const lines = []

		if (answers.receiptStatus === 'wrong_order') {
			lines.push('Customer received the wrong order.')
			lines.push(`Unboxing video provided: ${answers.unboxingVideo ? 'Yes' : 'No'}`)
		} else if (answers.receiptStatus === 'not_received') {
			lines.push('Customer did not receive the order.')
			lines.push(`Checked with family or watchman, nobody received it: Yes`)
			lines.push(`Delivery agent contacted customer: ${answers.agentContacted ? 'Yes' : 'No'}`)
			lines.push(`OTP shared or entered: ${answers.otpShared ? 'Yes' : 'No'}`)
		}

		if (additionalMessage.trim()) {
			lines.push(`Additional details: ${additionalMessage.trim()}`)
		}

		return lines.join('\n')
	}

	const handleSubmit = async () => {
		setError('')
		if (!hasConsent) {
			setError('Please confirm your consent before submitting.')
			return
		}
		setIsSubmitting(true)

		try {
			await submitEnquiry({
				orderId,
				sig,
				enquiryMessage: buildEnquiryMessage(),
				additionalMessage,
				consentGiven: hasConsent,
				receiptStatus: answers.receiptStatus,
				someoneElseReceived: answers.receiptStatus === 'not_received' ? false : null,
				agentContacted: answers.agentContacted ?? null,
				otpShared: answers.otpShared ?? null,
				unboxingEvidence: answers.unboxingVideo ?? null,
				evidenceFile,
			})
			clearDraft(orderId)
			setStep(STEP.THANK_YOU)
			setSuccess('Your enquiry was submitted. Our team will arrange a call with you shortly.')
		} catch (submitError) {
			setError(submitError.message || 'Unable to submit enquiry.')
		} finally {
			setIsSubmitting(false)
		}
	}

	const renderStep = () => {
		switch (step) {
			case STEP.RECEIVED:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">Did you receive your order?</p>
						<p className="enquiry-step-help">Select the option that describes your delivery.</p>
						<div className="enquiry-options is-three">
							<button className="enquiry-choice is-positive" type="button" onClick={() => handleReceived('correct')}>
								<span>Correct order</span><small>Received as expected</small>
							</button>
							<button className="enquiry-choice" type="button" onClick={() => handleReceived('not_received')}>
								<span>Not received</span><small>Marked delivered, but missing</small>
							</button>
							<button className="enquiry-choice" type="button" onClick={() => handleReceived('wrong_order')}>
								<span>Wrong order</span><small>Received a different item</small>
							</button>
						</div>
					</div>
				)

			case STEP.CHECKED_WITH_FAMILY:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">Checked with family or watchman?</p>
						<p className="enquiry-step-help">Sometimes a package is accepted by someone nearby.</p>
						<div className="enquiry-options is-two">
							<button className="enquiry-choice" type="button" onClick={handleSaveForLater}>
								<span>Not sure</span><small>Save and check first</small>
							</button>
							<button className="enquiry-choice is-primary" type="button" onClick={() => goTo(STEP.AGENT_CONTACTED)}>
								<span>Checked everywhere</span><small>Nobody received it</small>
							</button>
						</div>
						<button className="enquiry-previous-action" type="button" onClick={() => goTo(STEP.RECEIVED)}>← Previous</button>
					</div>
				)

			case STEP.SAVED_PROGRESS:
				return (
					<div className="enquiry-step enquiry-result-state">
						<span className="enquiry-result-icon">✓</span>
						<p className="enquiry-question">Your progress is saved</p>
						<p className="enquiry-step-help">
							Your progress has been saved. Come back to this same link anytime to continue where you left
							off.
						</p>
						<button className="enquiry-primary-action" type="button" onClick={() => goTo(STEP.CHECKED_WITH_FAMILY)}>Continue now</button>
					</div>
				)

			case STEP.AGENT_CONTACTED:
				return (
					<YesNoQuestion
						question="Did the agent contact you?"
						yesHelp="The delivery agent contacted me"
						noHelp="I received no call or message"
						value={answers.agentContacted}
						onPrevious={() => goTo(STEP.CHECKED_WITH_FAMILY)}
						onAnswer={(value) => setAnswers((previous) => ({ ...previous, agentContacted: value }))}
						onNext={() => goTo(STEP.OTP_SHARED)}
					/>
				)

			case STEP.OTP_SHARED:
				return (
					<YesNoQuestion
						question="Was the OTP shared or entered?"
						yesHelp="An OTP was shared or entered"
						noHelp="No OTP was shared or entered"
						value={answers.otpShared}
						onPrevious={() => goTo(STEP.AGENT_CONTACTED)}
						onAnswer={(value) => setAnswers((previous) => ({ ...previous, otpShared: value }))}
						onNext={() => goTo(STEP.REVIEW)}
					/>
				)

			case STEP.UNBOXING_VIDEO:
				return (
					<YesNoQuestion
						question="Have an unboxing video?"
						yesHelp="I have a video to upload"
						noHelp="I do not have an unboxing video"
						value={answers.unboxingVideo}
						onPrevious={() => goTo(STEP.RECEIVED)}
						onAnswer={(value) => setAnswers((previous) => ({ ...previous, unboxingVideo: value }))}
						onNext={() => goTo(answers.unboxingVideo ? STEP.UPLOAD : STEP.REVIEW)}
					/>
				)

			case STEP.UPLOAD:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">Upload your unboxing video (required)</p>
						<p className="enquiry-step-help">Add a photo or video that clearly shows the package opening.</p>
						<label className={`enquiry-upload ${evidenceFile ? 'has-file' : ''}`}>
							<input type="file" accept="image/*,video/*" required onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)} />
							<span>{evidenceFile ? evidenceFile.name : 'Choose photo or video'}</span>
							<small>{evidenceFile ? 'File selected successfully' : 'Tap to browse your device'}</small>
						</label>
						<div className="enquiry-actions">
							<button className="enquiry-previous-action" type="button" onClick={() => goTo(STEP.UNBOXING_VIDEO)}>← Previous</button>
							<button className="enquiry-primary-action" type="button" onClick={() => goTo(STEP.REVIEW)} disabled={!evidenceFile}>
								Continue
							</button>
						</div>
					</div>
				)

			case STEP.REVIEW:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">Review and submit</p>
						<p className="enquiry-step-help">Add anything that may help our support team understand the issue.</p>
						<label className="enquiry-field-label" htmlFor="enquiryMessage">Additional details <span>Optional</span></label>
						<textarea
							id="enquiryMessage"
							value={additionalMessage}
							onChange={(event) => setAdditionalMessage(event.target.value)}
							placeholder="Tell us what happened, when you noticed it, or anything else we should know..."
							rows={4}
						/>
						<label className="enquiry-consent">
							<input type="checkbox" checked={hasConsent} onChange={(event) => setHasConsent(event.target.checked)} />
							<span>I confirm that the information provided is accurate and consent to EscroSafe using these details and any uploaded evidence to investigate and resolve this order issue.</span>
						</label>
						{error ? <p className="message error">{error}</p> : null}
						<div className="enquiry-actions">
							<button
								className="enquiry-previous-action"
								type="button"
								onClick={() => goTo(answers.receiptStatus === 'wrong_order' ? (answers.unboxingVideo ? STEP.UPLOAD : STEP.UNBOXING_VIDEO) : STEP.OTP_SHARED)}
							>
								← Previous
							</button>
							<button className="enquiry-primary-action" type="button" onClick={handleSubmit} disabled={isSubmitting || !hasConsent}>
								{isSubmitting ? 'Submitting...' : 'Submit'}
							</button>
						</div>
					</div>
				)

			case STEP.THANK_YOU:
				return (
					<div className="enquiry-step enquiry-result-state">
						<span className="enquiry-result-icon">✓</span>
						<p className="enquiry-question">
							{success || 'Thank you! Your order is marked as received.'}
						</p>
						<p className="enquiry-step-help">You can safely close this page now.</p>
					</div>
				)

			default:
				return null
		}
	}

	if (step === null) {
		return (
			<section className="enquiry-page">
				<div className="card form-card enquiry-card">
					<h2>Order Enquiry</h2>
					<p className="message error">
						This enquiry link is missing or invalid. Please use the exact link sent to you for this order.
					</p>
				</div>
			</section>
		)
	}

	return (
		<section className="enquiry-page">
			<div className="card form-card enquiry-card">
				<div className="enquiry-brand">
					<img src={escrosafeLogo} alt="EscroSafe" />
					<div className="enquiry-order-ref"><span>Order ID</span><strong>{orderId}</strong></div>
				</div>
				{step !== STEP.THANK_YOU ? <h1 className="enquiry-title">Order Enquiry</h1> : null}
				{step !== STEP.THANK_YOU ? (
					<div className="enquiry-progress">
						<div><span>Step {progressStep} of 4</span></div>
						<div className="enquiry-progress-track"><span style={{ width: `${progressStep * 25}%` }} /></div>
					</div>
				) : null}
				<div className="enquiry-form-body">{renderStep()}</div>
				{step !== STEP.THANK_YOU ? <footer className="enquiry-save-note"><span>✓</span> Responses are saved automatically as you continue</footer> : null}
			</div>
		</section>
	)
}

export default Enquiry
