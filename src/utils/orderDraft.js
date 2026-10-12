// Delivery/customer details typed on /cart and read back on /checkout.
const DRAFT_KEY = 'securepay.orderDraft'

export function createMerchantOrderId() {
	const now = new Date()
	const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
	const datePart = `${String(now.getFullYear()).slice(-2)}${String(dayOfYear).padStart(3, '0')}`
	const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
	return `ES-${datePart}-${randomPart}`
}

export function readOrderDraft() {
	try {
		const parsed = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || 'null')
		return parsed && typeof parsed === 'object' ? parsed : null
	} catch {
		return null
	}
}

export function clearOrderDraft() {
	try {
		window.sessionStorage.removeItem(DRAFT_KEY)
	} catch {
		// Nothing to clear if storage is unavailable.
	}
}

export function writeOrderDraft(draft) {
	try {
		window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
	} catch {
		// Storage unavailable: checkout will send the user back to /cart.
	}
}
