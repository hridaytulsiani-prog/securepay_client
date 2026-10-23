import { API_BASE_URL, buildAuthHeaders, buildJsonHeaders, handleApiResponse } from './client'

export async function getForwardedCustomerIssues() {
	const response = await fetch(`${API_BASE_URL}/payments/v1/customer-issues/`, {
		method: 'GET',
		headers: buildJsonHeaders(),
	})

	return handleApiResponse(response)
}

export async function sendForwardedCustomerIssueMessage(issueId, { body, attachments = [] }) {
	const form = new FormData()
	form.append('body', body || '')
	attachments.forEach((file) => form.append('attachments', file))

	const response = await fetch(`${API_BASE_URL}/payments/v1/customer-issues/${issueId}/messages/`, {
		method: 'POST',
		headers: buildAuthHeaders(),
		body: form,
	})

	return handleApiResponse(response)
}
