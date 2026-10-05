// Merchant login — calls merchant.v1.create_merchant.LoginMerchant. Only
// the merchant_email is stashed as the "user" object (setAuthSession's
// second arg) since that endpoint's response doesn't include a display name.
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { isAuthenticated, setAuthSession } from '../utils/storage'
import escrosafeLogo from '../assets/escrosafe-logo.png'

function Login() {
	const navigate = useNavigate()
	const location = useLocation()
	const [email, setEmail] = useState(location.state?.verifiedEmail || '')
	const [password, setPassword] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState('')

	if (isAuthenticated()) {
		return <Navigate to="/dashboard" replace />
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		const normalizedEmail = email.trim().toLowerCase()
		const normalizedPassword = password.trim()
		setError('')

		if (!normalizedEmail || !normalizedPassword) {
			setError('Email and password are required.')
			return
		}

		setIsSubmitting(true)

		try {
			const result = await loginUser({ merchant_email: normalizedEmail, password: normalizedPassword })
			setAuthSession(result.token, {
				merchant_email: normalizedEmail,
				merchant_id: result.merchant_id,
				merchant_key: result.merchant_key,
			})
			navigate('/dashboard', { replace: true })
		} catch (loginError) {
			setError(loginError.message || 'Unable to sign in.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<section className="auth-page auth-page-login">
			<Link className="auth-brand" to="/"><img src={escrosafeLogo} alt="EscroSafe" /></Link>
			<form className="card form-card" onSubmit={handleSubmit}>
				<h2>Sign In</h2>
				<p>Access your EscroSafe shipping console.</p>
				{location.state?.message ? <p className="message success">{location.state.message}</p> : null}

				<label htmlFor="email">Merchant Email</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="merchant@escrosafe.io"
					required
				/>

				<label htmlFor="password">Password</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					placeholder="••••••••"
					required
				/>

				{error ? <p className="message error">{error}</p> : null}

				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Signing in...' : 'Sign In'}
				</button>

				<p className="inline-link">
					New to EscroSafe? <Link to="/register">Create an account</Link>
				</p>
			</form>
		</section>
	)
}

export default Login

