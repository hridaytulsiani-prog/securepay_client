// Merchant signup. NOTE: submits merchant_username, but the backend's
// CreateMerchant view passes that straight into MerchantInfo.objects.create
// (username=...) — a field that no longer exists on the model (removed by
// migration 0011). As written, submitting this form will 500. Also: the
// backend never returns a token/user on signup, so the `result?.token`
// branch below is currently unreachable — it always falls through to
// navigate('/login').
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { sendRegisterOtp, verifyRegisterOtp } from '../api/auth'
import escrosafeLogo from '../assets/escrosafe-logo.png'
import { isAuthenticated } from '../utils/storage'

function Register() {
	const navigate = useNavigate()
	const [merchantName, setMerchantName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [address, setAddress] = useState('')
	const [password, setPassword] = useState('')
	const [acceptedTerms, setAcceptedTerms] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
	const [error, setError] = useState('')
	const [toastMessage, setToastMessage] = useState('')
	const [showOtpModal, setShowOtpModal] = useState(false)
	const [otpCode, setOtpCode] = useState('')
	const [pendingRegistration, setPendingRegistration] = useState(null)
	const [resendSeconds, setResendSeconds] = useState(0)

	useEffect(() => {
		if (!toastMessage) {
			return undefined
		}

		const toastTimerId = window.setTimeout(() => {
			setToastMessage('')
		}, 3600)

		return () => {
			window.clearTimeout(toastTimerId)
		}
	}, [toastMessage])

	useEffect(() => {
		if (!resendSeconds) {
			return undefined
		}

		const timerId = window.setTimeout(() => {
			setResendSeconds((currentSeconds) => Math.max(0, currentSeconds - 1))
		}, 1000)

		return () => window.clearTimeout(timerId)
	}, [resendSeconds])

	if (isAuthenticated()) {
		return <Navigate to="/dashboard" replace />
	}

	const showToast = (message) => {
		setToastMessage('')
		window.setTimeout(() => {
			setToastMessage(message)
		}, 0)
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		const normalizedMerchantName = merchantName.trim()
		const normalizedEmail = email.trim().toLowerCase()
		const normalizedPhone = phone.trim()
		const normalizedAddress = address.trim()
		const normalizedPassword = password.trim()

		setError('')

		if (!acceptedTerms) {
			showToast('Please accept our Terms and Conditions to create your merchant account.')
			return
		}

		if (!normalizedMerchantName || !normalizedEmail || !normalizedPhone || !normalizedAddress) {
			setError('All fields are required.')
			return
		}

		if (!/^\d{10,15}$/.test(normalizedPhone)) {
			setError('Phone must contain 10 to 15 digits.')
			return
		}

		if (normalizedPassword.length < 8) {
			setError('Password must be at least 8 characters long.')
			return
		}

		setIsSubmitting(true)

		try {
			const registrationPayload = {
				merchant_name: normalizedMerchantName,
				merchant_email: normalizedEmail,
				merchant_phone: normalizedPhone,
				merchant_address: normalizedAddress,
				merchant_password: normalizedPassword,
			}

			const result = await sendRegisterOtp(registrationPayload)
			setPendingRegistration(registrationPayload)
			setOtpCode('')
			setShowOtpModal(true)
			setResendSeconds(result?.resend_after || 45)
			showToast(`Verification code sent to ${normalizedEmail}.`)
		} catch (registerError) {
			setError(registerError.message || 'Unable to send verification code.')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleVerifyOtp = async (event) => {
		event.preventDefault()
		const normalizedOtp = otpCode.trim()
		if (!pendingRegistration?.merchant_email || !/^\d{6}$/.test(normalizedOtp)) {
			setError('Enter the 6 digit verification code.')
			return
		}

		setError('')
		setIsVerifyingOtp(true)

		try {
			await verifyRegisterOtp({
				merchant_email: pendingRegistration.merchant_email,
				otp: normalizedOtp,
			})
			navigate('/login', {
				replace: true,
				state: {
					verifiedEmail: pendingRegistration.merchant_email,
					message: 'Email verified. Sign in to continue.',
				},
			})
		} catch (verifyError) {
			setError(verifyError.message || 'Unable to verify code.')
		} finally {
			setIsVerifyingOtp(false)
		}
	}

	const handleResendOtp = async () => {
		if (!pendingRegistration || resendSeconds) {
			return
		}

		setError('')
		setIsSubmitting(true)
		try {
			const result = await sendRegisterOtp(pendingRegistration)
			setOtpCode('')
			setResendSeconds(result?.resend_after || 45)
			showToast(`New verification code sent to ${pendingRegistration.merchant_email}.`)
		} catch (resendError) {
			setError(resendError.message || 'Unable to resend verification code.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<section className="auth-page auth-page-register">
			<Link className="auth-brand" to="/"><img src={escrosafeLogo} alt="EscroSafe" /></Link>
			<form className="card form-card" onSubmit={handleSubmit}>
				<h2>Register</h2>
				<p>Create your merchant profile.</p>

				<label className="auth-field" htmlFor="merchantName">
					<span>Merchant Name</span>
					<input
						id="merchantName"
						type="text"
						value={merchantName}
						onChange={(event) => setMerchantName(event.target.value)}
						placeholder="Acme Traders"
						required
					/>
				</label>

				<label className="auth-field" htmlFor="email">
					<span>Email</span>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="ops@escrosafe.io"
						required
					/>
				</label>

				<label className="auth-field" htmlFor="phone">
					<span>Phone</span>
					<input
						id="phone"
						type="tel"
						value={phone}
						onChange={(event) => setPhone(event.target.value)}
						placeholder="4334323213"
						required
					/>
				</label>

				<label className="auth-field" htmlFor="address">
					<span>Address</span>
					<input
						id="address"
						type="text"
						value={address}
						onChange={(event) => setAddress(event.target.value)}
						placeholder="221B Baker Street"
						required
					/>
				</label>

				<label className="auth-field" htmlFor="password">
					<span>Password</span>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder="Use at least 8 characters"
						minLength={8}
						required
					/>
				</label>

				<label className="terms-check" htmlFor="acceptedTerms">
					<input
						id="acceptedTerms"
						type="checkbox"
						checked={acceptedTerms}
						onChange={(event) => {
							setAcceptedTerms(event.target.checked)
							if (event.target.checked) {
								setToastMessage('')
							}
						}}
					/>
					<span>
						I accept the{' '}
						<Link className="terms-link" to="/terms" target="_blank" rel="noreferrer">
							Terms &amp; Conditions
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
						</Link>
					</span>
				</label>

				{error ? <p className="message error">{error}</p> : null}
				{toastMessage ? (
					<div className="auth-toast auth-toast-error" role="status" aria-live="polite">
						{toastMessage}
					</div>
				) : null}

				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Sending code...' : 'Create Merchant'}
				</button>

				<p className="inline-link">
					Already registered? <Link to="/login">Sign in here</Link>
				</p>
			</form>

			{showOtpModal ? (
				<div className="securepay-modal-backdrop">
					<form className="auth-otp-modal" onSubmit={handleVerifyOtp}>
						<div className="securepay-modal-head">
							<div>
								<span>Email verification</span>
								<h2>Enter the code we sent</h2>
							</div>
						</div>
						<p>
							We sent a 6 digit code to <strong>{pendingRegistration?.merchant_email}</strong>.
						</p>
						<label className="auth-field" htmlFor="registerOtp">
							<span>Verification code</span>
							<input
								id="registerOtp"
								type="text"
								inputMode="numeric"
								maxLength={6}
								value={otpCode}
								onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
								placeholder="123456"
								autoFocus
								required
							/>
						</label>
						{error ? <p className="message error">{error}</p> : null}
						<div className="securepay-modal-actions">
							<button
								type="button"
								className="checkout-reject-btn"
								onClick={handleResendOtp}
								disabled={Boolean(resendSeconds) || isSubmitting || isVerifyingOtp}
							>
								{resendSeconds ? `Resend in ${resendSeconds}s` : 'Resend code'}
							</button>
							<button type="submit" disabled={isVerifyingOtp}>
								{isVerifyingOtp ? 'Verifying...' : 'Verify and create account'}
							</button>
						</div>
					</form>
				</div>
			) : null}
		</section>
	)
}

export default Register
