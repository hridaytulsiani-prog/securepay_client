import { API_BASE_URL, buildAuthHeaders, handleApiResponse } from './client'

export async function fetchMerchantNotifications() {
	const response = await fetch(`${API_BASE_URL}/payments/v1/notifications/`, {
		method: 'GET',
		headers: buildAuthHeaders(),
		credentials: 'same-origin',
	})

	return handleApiResponse(response)
}
