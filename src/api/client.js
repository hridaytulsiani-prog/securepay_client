// Shared fetch helpers for the merchant frontend's api/*.js modules — one
// place for auth headers, JSON parsing, and 401 handling so each api file
// doesn't reimplement it.
//
// --- Setup: pointing this app at your backend -------------------------------
// Set VITE_API_BASE_URL in a .env / .env.local file in this project's root,
// e.g. VITE_API_BASE_URL=http://localhost:8000 for local dev, or your real
// backend domain in production. Restart `npm run dev` after changing it —
// Vite only reads env files at startup.
//
// NOTE the default here is '' (empty string) rather than a localhost URL —
// that means "same origin as this frontend is served from" (relative
// fetch() calls like `${API_BASE_URL}/merchants/login/` become just
// `/merchants/login/`). This only works if this frontend is served from the
// same host/port as the Django backend, or if a reverse proxy makes it look
// that way. If you're running this with Vite's own dev server (a different
// port than Django), you MUST set VITE_API_BASE_URL explicitly or every API
// call will 404 against Vite's own dev server instead of reaching Django.
// (Contrast with securepay-admin, this project's separate admin frontend,
// which defaults to http://localhost:8000 instead — the two apps' .env
// files are independent; check both if something isn't reaching the
// backend as expected.)
import { clearAuthSession, getToken, refreshAuthSessionCookie, setAuthNotice } from '../utils/storage'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function handleApiResponse(response) {
	// A 401 means the merchant's session expired/was revoked — clear the
	// stored token so the next protected-route check redirects to login
	// instead of retrying with a token the backend has already rejected.
	const contentType = response.headers.get('content-type')
	const isJson = contentType && contentType.includes('application/json')
	let body = isJson ? await response.json() : await response.text()

	if (!response.ok) {
		// A protected endpoint generally returns 401 after an admin blocks a
		// merchant. Resolve the restriction before clearing the token so the
		// login screen can explain why the session ended.
		if (response.status === 401 && !response.url.includes('/merchants/session-status/')) {
			const token = getToken()
			if (token) {
				try {
					const statusResponse = await fetch(`${API_BASE_URL}/merchants/session-status/`, {
						headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
					})
					if (statusResponse.status === 403) {
						const restriction = await statusResponse.json()
						body = restriction
						setAuthNotice(restriction.error)
					}
				} catch {
					// Preserve the original authentication response if this check fails.
				}
			}
		}
		const message = isJson
			? body.error || body.message || body.detail
			: contentType && contentType.includes('text/html')
				? `EscroSafe API returned ${response.status}. Please restart the backend server and try again.`
				: body

		if (response.status === 401) {
			clearAuthSession()
		}

		const apiError = new Error(message || 'Request failed.')
		apiError.status = response.status
		apiError.code = typeof body === 'object' ? body.code : undefined
		apiError.data = typeof body === 'object' ? body : undefined
		throw apiError
	}

	refreshAuthSessionCookie()
	return body
}

export function buildJsonHeaders(includeAuth = true) {
	const headers = {
		'Content-Type': 'application/json',
		'ngrok-skip-browser-warning': 'true',
	}

	if (!includeAuth) {
		return headers
	}

	const token = getToken()
	if (token) {
		headers.Authorization = `Bearer ${token}`
	}

	return headers
}

export function buildAuthHeaders() {
	const token = getToken()
	const headers = {
		'ngrok-skip-browser-warning': 'true',
	}

	if (token) {
		headers.Authorization = `Bearer ${token}`
	}

	return headers
}
