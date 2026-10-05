import { API_BASE_URL, buildJsonHeaders, handleApiResponse } from './client'

export async function getCourierPreferences() {
	const response = await fetch(`${API_BASE_URL}/merchants/courier-preferences/`, {
		method: 'GET',
		headers: buildJsonHeaders(),
	})

	return handleApiResponse(response)
}

export async function saveCourierPreferences(payload) {
	const response = await fetch(`${API_BASE_URL}/merchants/courier-preferences/`, {
		method: 'POST',
		headers: buildJsonHeaders(),
		body: JSON.stringify(payload),
	})

	return handleApiResponse(response)
}
