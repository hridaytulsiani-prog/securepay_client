// Public, no-login wizard a customer lands on from the signed delivery-
// notification link (order_id + sig in the URL — see tracking.signing).
// Progress is saved to localStorage per order_id so a customer who closes
// the tab partway through picks up where they left off on the same link.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { submitEnquiry } from '../api/enquiry'

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

function YesNoQuestion({ question, yesLabel = 'Yes', noLabel = 'No', onAnswer }) {
	return (
		<div className="enquiry-step">
			<p className="enquiry-question">{question}</p>
			<div className="enquiry-options">
				<button type="button" onClick={() => onAnswer(true)}>
					{yesLabel}
				</button>
				<button type="button" onClick={() => onAnswer(false)}>
					{noLabel}
				</button>
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
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

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
		setIsSubmitting(true)

		try {
			await submitEnquiry({
				orderId,
				sig,
				enquiryMessage: buildEnquiryMessage(),
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
						<div className="enquiry-options">
							<button type="button" onClick={() => handleReceived('correct')}>
								Correct order
							</button>
							<button type="button" onClick={() => handleReceived('not_received')}>
								Not received
							</button>
							<button type="button" onClick={() => handleReceived('wrong_order')}>
								Wrong order
							</button>
						</div>
					</div>
				)

			case STEP.CHECKED_WITH_FAMILY:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">Checked with family or watchman?</p>
						<div className="enquiry-options">
							<button type="button" onClick={handleSaveForLater}>
								Not sure
							</button>
							<button type="button" onClick={() => goTo(STEP.AGENT_CONTACTED)}>
								Checked; nobody received it
							</button>
						</div>
					</div>
				)

			case STEP.SAVED_PROGRESS:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">
							Your progress has been saved. Come back to this same link anytime to continue where you left
							off.
						</p>
					</div>
				)

			case STEP.AGENT_CONTACTED:
				return (
					<YesNoQuestion
						question="Did the agent contact you?"
						onAnswer={(value) => {
							const nextAnswers = { ...answers, agentContacted: value }
							setAnswers(nextAnswers)
							goTo(STEP.OTP_SHARED, nextAnswers)
						}}
					/>
				)

			case STEP.OTP_SHARED:
				return (
					<YesNoQuestion
						question="Was the OTP shared or entered?"
						onAnswer={(value) => {
							const nextAnswers = { ...answers, otpShared: value }
							setAnswers(nextAnswers)
							goTo(STEP.REVIEW, nextAnswers)
						}}
					/>
				)

			case STEP.UNBOXING_VIDEO:
				return (
					<YesNoQuestion
						question="Have an unboxing video?"
						onAnswer={(value) => {
							const nextAnswers = { ...answers, unboxingVideo: value }
							setAnswers(nextAnswers)
							goTo(value ? STEP.UPLOAD : STEP.REVIEW, nextAnswers)
						}}
					/>
				)

			case STEP.UPLOAD:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">Upload your unboxing video (required)</p>
						<input
							type="file"
							accept="image/*,video/*"
							required
							onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
						/>
						<div className="enquiry-options">
							<button type="button" onClick={() => goTo(STEP.REVIEW)} disabled={!evidenceFile}>
								Continue
							</button>
						</div>
					</div>
				)

			case STEP.REVIEW:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">Submit and arrange call</p>
						<label htmlFor="enquiryMessage">Additional details (optional)</label>
						<textarea
							id="enquiryMessage"
							value={additionalMessage}
							onChange={(event) => setAdditionalMessage(event.target.value)}
							placeholder="Add any additional context"
							rows={4}
						/>
						{error ? <p className="message error">{error}</p> : null}
						<div className="enquiry-options">
							<button type="button" onClick={handleSubmit} disabled={isSubmitting}>
								{isSubmitting ? 'Submitting...' : 'Submit and arrange call'}
							</button>
						</div>
					</div>
				)

			case STEP.THANK_YOU:
				return (
					<div className="enquiry-step">
						<p className="enquiry-question">
							{success || 'Thank you! Your order is marked as received.'}
						</p>
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
				<h2>Order Enquiry</h2>
				<p>Order ID: {orderId}</p>
				{renderStep()}
			</div>
		</section>
	)
}

export default Enquiry
