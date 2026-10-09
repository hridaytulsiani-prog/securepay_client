import { API_BASE_URL, buildJsonHeaders, handleApiResponse } from './client'

// The merchant's own issues, newest first (includes the admin's response once there is one).
export async function getMyIssues() {
	const response = await fetch(`${API_BASE_URL}/merchants/issues/`, {
		method: 'GET',
		headers: buildJsonHeaders(),
	})

	return handleApiResponse(response)
}

// Raise an issue about one or more of the merchant's orders: { issue_type, description, orders: [order ids] }.
export async function createIssue(payload) {
	const response = await fetch(`${API_BASE_URL}/merchants/issues/`, {
		method: 'POST',
		headers: buildJsonHeaders(),
		body: JSON.stringify(payload),
	})

	return handleApiResponse(response)
}

// One issue with its whole conversation: { ..., messages: [{ id, sender: 'merchant' | 'admin', body, created_at }] }.
export async function getIssue(issueId) {
	const response = await fetch(`${API_BASE_URL}/merchants/issues/${issueId}/`, {
		method: 'GET',
		headers: buildJsonHeaders(),
	})

	return handleApiResponse(response)
}

// Send a message to the EscroSafe team in an issue's conversation.
export async function sendIssueMessage(issueId, body) {
	const response = await fetch(`${API_BASE_URL}/merchants/issues/${issueId}/messages/`, {
		method: 'POST',
		headers: buildJsonHeaders(),
		body: JSON.stringify({ body }),
	})

	return handleApiResponse(response)
}

// The merchant's own orders (the same list the Dashboard shows), reduced to what the issue pop-up needs so they can
// be ticked instead of typed: { orderId, awb, courier, deliveryStatus, customerName }.
export async function getMyOrders() {
	const response = await fetch(`${API_BASE_URL}/payments/v1/shipments/?limit=500`, {
		method: 'GET',
		headers: buildJsonHeaders(),
	})
	const data = await handleApiResponse(response)
	const rows = Array.isArray(data) ? data : data?.results || data?.shipments || []

	return rows
		.map((record) => ({
			orderId: record.secureupi_order_id || record.pa_order_id || record.order_id || record.merchant_order_id || '',
			awb: record.awb || record.shipment_id__awb || record.awb_number || '',
			courier: record.courier || record.shipment_id__courier || '',
			deliveryStatus:
				record.normalized_status || record.current_status || record.delivery_status || record.shipment_id__status || record.status || '',
			customerName: record.customer?.name || record.customer_info__customer_name || record.customer_name || '',
		}))
		.filter((order) => order.orderId)
}
