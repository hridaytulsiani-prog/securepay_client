// Merchant-scoped enquiry listing (the logged-in merchant's own customers'
// enquiries only) — calls tracking.api.v1.enquiry_list.EnquiryListView.
// The admin panel's equivalent, which lists every merchant's enquiries, is
// a separate app (securepay-admin) calling AdminEnquiryListView instead.
import { API_BASE_URL, buildAuthHeaders, handleApiResponse } from './client'

export async function fetchEnquiries({ page = 1, limit = 25, q = '' } = {}) {
	const params = new URLSearchParams({ page: String(page), limit: String(limit) })
	if (q.trim()) {
		params.set('q', q.trim())
	}

	const response = await fetch(`${API_BASE_URL}/tracking/enquiries/?${params.toString()}`, {
		method: 'GET',
		headers: buildAuthHeaders(),
		credentials: 'same-origin',
	})

	return handleApiResponse(response)
}
