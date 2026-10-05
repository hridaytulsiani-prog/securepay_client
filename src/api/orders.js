// NOTE: /orders and /orders/track/<id> don't match any route in the Django
// backend (which mounts order/shipment endpoints under /payments/ and
// /tracking/ instead — see tracking.js and payments/urls.py). These calls
// will 404 as written; looks like leftover/unused code.
import { API_BASE_URL, buildJsonHeaders, handleApiResponse } from './client'

export async function getOrders() {
	const response = await fetch(`${API_BASE_URL}/orders`, {
		method: 'GET',
		headers: buildJsonHeaders(),
	})

	return handleApiResponse(response)
}

export async function trackOrder(trackingId) {
	const response = await fetch(`${API_BASE_URL}/orders/track/${trackingId}`, {
		method: 'GET',
		headers: buildJsonHeaders(),
	})

	return handleApiResponse(response)
}

