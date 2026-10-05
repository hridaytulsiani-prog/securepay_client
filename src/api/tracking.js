// Shipment creation/tracking calls against the tracking app. Has its own
// local `request()` (separate from client.js's handleApiResponse) because
// these endpoints are plain Django views, not DRF, and some need a CSRF
// token cookie rather than just the bearer auth header.
import { API_BASE_URL, buildAuthHeaders } from './client'
import { clearAuthSession, refreshAuthSessionCookie } from '../utils/storage'

function getCookie(name) {
	if (typeof document === 'undefined') {
		return null
	}

	const cookies = document.cookie ? document.cookie.split('; ') : []
	const cookie = cookies.find((entry) => entry.startsWith(`${name}=`))

	if (!cookie) {
		return null
	}

	return decodeURIComponent(cookie.split('=').slice(1).join('='))
}

function buildHeaders({ json = false, includeCsrf = false } = {}) {
	const headers = {
		...buildAuthHeaders(),
	}

	if (json) {
		headers['Content-Type'] = 'application/json'
	}

	if (includeCsrf) {
		const csrfToken = getCookie('csrftoken')
		if (csrfToken) {
			headers['X-CSRFToken'] = csrfToken
		}
	}

	return headers
}

function parseErrorMessage(body) {
	if (typeof body === 'string') {
		return body || 'Request failed.'
	}

	return body?.error || body?.message || 'Request failed.'
}

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		credentials: 'same-origin',
		...options,
	})

	const contentType = response.headers.get('content-type') || ''
	const isJson = contentType.includes('application/json')
	const body = isJson ? await response.json() : await response.text()

	if (!response.ok) {
		if (response.status === 401) {
			clearAuthSession()
		}

		throw new Error(parseErrorMessage(body))
	}

	refreshAuthSessionCookie()
	return body
}

export function createShipment(payload) {
	return request('/tracking/create_shipment/', {
		method: 'POST',
		headers: buildHeaders({ json: true, includeCsrf: true }),
		body: JSON.stringify(payload),
	})
}

export function createShipmentsBulk(file) {
	const formData = new FormData()
	formData.append('file', file)

	return request('/tracking/create_shipments_bulk/', {
		method: 'POST',
		headers: buildHeaders({ includeCsrf: true }),
		body: formData,
	})
}

export function fetchShipment(awb) {
	return request(`/tracking/track_shipment/${encodeURIComponent(awb)}`)
}

export function markShipmentDelivered(awb) {
	return request(`/tracking/track_shipment/${encodeURIComponent(awb)}/delivered`, {
		method: 'POST',
		headers: buildHeaders({ includeCsrf: true }),
	})
}

export function markShipmentFailed(awb) {
	// NOTE: no .../failed route exists in tracking/urls.py (only .../delivered
	// via UpdateShipment) — this will 404 until a matching backend view exists.
	return request(`/tracking/track_shipment/${encodeURIComponent(awb)}/failed`, {
		method: 'POST',
		headers: buildHeaders({ includeCsrf: true }),
	})
}

export function fetchOrder(orderId) {
	// NOTE: no /v1/orders/<id> route exists on the backend — unused/dead code.
	return request(`/v1/orders/${encodeURIComponent(orderId)}`)
}

export function fetchInternalState() {
	// NOTE: no /__internal/state route exists on the backend — unused/dead code.
	return request('/__internal/state')
}
