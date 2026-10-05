// Merchant session storage: token in a cookie (so it can also be sent
// server-side to the static demo pages under merchant/static/), user profile
// in localStorage. Cross-tab/cross-component sync is done via a custom
// 'securepay-auth-changed' event rather than React context, since storage
// writes here can originate from a plain fetch call outside any component.
const TOKEN_KEY = 'securepay_token'
const USER_KEY = 'securepay_user'
export const AUTH_IDLE_TIMEOUT_MS = 10 * 60 * 1000

function emitAuthChange() {
	window.dispatchEvent(new Event('securepay-auth-changed'))
}

function setCookie(name, value, maxAgeSeconds) {
	const encodedValue = encodeURIComponent(value)
	const maxAge = typeof maxAgeSeconds === 'number' ? `; Max-Age=${maxAgeSeconds}` : ''
	document.cookie = `${name}=${encodedValue}; Path=/; SameSite=Lax${maxAge}`
}

function getCookie(name) {
	const cookies = document.cookie ? document.cookie.split('; ') : []
	const cookie = cookies.find((entry) => entry.startsWith(`${name}=`))

	if (!cookie) {
		return null
	}

	return decodeURIComponent(cookie.split('=').slice(1).join('='))
}

function deleteCookie(name) {
	document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function setAuthSession(token, user) {
	if (token) {
		setCookie(TOKEN_KEY, token, AUTH_IDLE_TIMEOUT_MS / 1000)
	}

	if (user) {
		localStorage.setItem(USER_KEY, JSON.stringify(user))
	}

	emitAuthChange()
}

export function getToken() {
	return getCookie(TOKEN_KEY)
}

export function refreshAuthSessionCookie() {
	const token = getToken()
	if (token) {
		setCookie(TOKEN_KEY, token, AUTH_IDLE_TIMEOUT_MS / 1000)
	}
}

export function getUser() {
	const rawUser = localStorage.getItem(USER_KEY)

	if (!rawUser) {
		return null
	}

	try {
		return JSON.parse(rawUser)
	} catch {
		localStorage.removeItem(USER_KEY)
		return null
	}
}

export function clearAuthSession() {
	deleteCookie(TOKEN_KEY)
	localStorage.removeItem(USER_KEY)
	emitAuthChange()
}

export function isAuthenticated() {
	return Boolean(getToken())
}

