// Merchant signup/login — calls merchant.v1.create_merchant on the backend.
// No auth header needed here (buildJsonHeaders(false)) since there's no
// session yet at this point.
import { API_BASE_URL, buildJsonHeaders, handleApiResponse } from './client'

const REGISTER_ENDPOINT = import.meta.env.VITE_REGISTER_ENDPOINT || '/merchants/create_merchant/'

export async function loginUser(payload) {
	const response = await fetch(`${API_BASE_URL}/merchants/login/`, {
		method: 'POST',
		headers: buildJsonHeaders(false),
		body: JSON.stringify(payload),
	})

	return handleApiResponse(response)
}

export async function registerUser(payload) {
	const response = await fetch(`${API_BASE_URL}${REGISTER_ENDPOINT}`, {
		method: 'POST',
		headers: buildJsonHeaders(false),
		body: JSON.stringify(payload),
	})

	return handleApiResponse(response)
}

export async function sendRegisterOtp(payload) {
	const response = await fetch(`${API_BASE_URL}/merchants/register/send-otp/`, {
		method: 'POST',
		headers: buildJsonHeaders(false),
		body: JSON.stringify(payload),
	})

	return handleApiResponse(response)
}

export async function verifyRegisterOtp(payload) {
	const response = await fetch(`${API_BASE_URL}/merchants/register/verify-otp/`, {
		method: 'POST',
		headers: buildJsonHeaders(false),
		body: JSON.stringify(payload),
	})

	return handleApiResponse(response)
}

