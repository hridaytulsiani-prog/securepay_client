// Public "report a delivery problem" form submission — hits
// tracking.api.v1.enquiry.SubmitEnquiry. No auth token (the customer isn't
// logged in); the order_id + sig pair is what proves the request is
// legitimate, matching tracking.signing.build_enquiry_link on the backend.
import { API_BASE_URL, handleApiResponse } from './client'

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

export async function submitEnquiry({
	orderId,
	sig,
	enquiryMessage,
	receiptStatus,
	someoneElseReceived = null,
	agentContacted = null,
	otpShared = null,
	unboxingEvidence = null,
	evidenceFile = null,
}) {
	const csrfToken = getCookie('csrftoken')
	const headers = {}

	if (csrfToken) {
		headers['X-CSRFToken'] = csrfToken
	}

	const formData = new FormData()
	formData.append('order_id', orderId)
	formData.append('sig', sig)
	formData.append('enquiry_msg', enquiryMessage)
	formData.append('receipt_status', receiptStatus)

	if (someoneElseReceived !== null) {
		formData.append('someone_else_received', someoneElseReceived)
	}
	if (agentContacted !== null) {
		formData.append('agent_contacted', agentContacted)
	}
	if (otpShared !== null) {
		formData.append('otp_shared', otpShared)
	}
	if (unboxingEvidence !== null) {
		formData.append('unboxing_evidence', unboxingEvidence)
	}
	if (evidenceFile) {
		formData.append('evidence_file', evidenceFile)
	}

	const response = await fetch(`${API_BASE_URL}/tracking/enquiry/`, {
		method: 'POST',
		headers,
		credentials: 'same-origin',
		body: formData,
	})

	return handleApiResponse(response)
}
