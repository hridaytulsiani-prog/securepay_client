import { API_BASE_URL, buildAuthHeaders, handleApiResponse } from './client'

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

export async function uploadLabelPdf({ file, orderId }) {
	// NOTE: no /labels/upload route exists on the backend (the actual label
	// validator is mounted at /tracking/pdf/upload — see uploadTrackingPdf
	// below). This call will 404 as written; looks unused/dead.
	const formData = new FormData()
	const headers = buildAuthHeaders()

	formData.append('label', file)
	if (orderId) {
		formData.append('orderId', orderId)
	}

	const response = await fetch(`${API_BASE_URL}/labels/upload`, {
		method: 'POST',
		headers,
		body: formData,
	})

	return handleApiResponse(response)
}

// Uploads a shipping-label PDF to the forgery-risk validator
// (tracking.api.v1.validate.PDFValidator) — see that file for the full
// scoring pipeline this response's risk_analysis comes from.
export async function uploadTrackingPdf({ file, secureupiOrderId }) {
	const formData = new FormData()
	const csrfToken = getCookie('csrftoken')
	const headers = {
		...buildAuthHeaders(),
	}

	if (csrfToken) {
		headers['X-CSRFToken'] = csrfToken
	}

	formData.append('file', file)
	if (secureupiOrderId) {
		formData.append('secureupi_order_id', secureupiOrderId)
	}

	const response = await fetch(`${API_BASE_URL}/tracking/pdf/upload`, {
		method: 'POST',
		headers,
		credentials: 'same-origin',
		body: formData,
	})

	return handleApiResponse(response)
}

export async function fetchPdfValidationRecords() {
	const response = await fetch(`${API_BASE_URL}/tracking/pdf/upload`, {
		method: 'GET',
		headers: buildAuthHeaders(),
		credentials: 'same-origin',
	})

	return handleApiResponse(response)
}

export async function deletePdfValidationRecord(id) {
	const csrfToken = getCookie('csrftoken')
	const headers = {
		...buildAuthHeaders(),
	}

	if (csrfToken) {
		headers['X-CSRFToken'] = csrfToken
	}

	const response = await fetch(`${API_BASE_URL}/tracking/pdf/upload?id=${encodeURIComponent(id)}`, {
		method: 'DELETE',
		headers,
		credentials: 'same-origin',
	})

	return handleApiResponse(response)
}

