import { useState } from 'react'
import { STORE_PRODUCTS } from '../constants/storeProducts'

// Cart is shared between /create-order (shop) and /cart (checkout), so it is
// persisted in localStorage as { [productId]: qty }.
const CART_KEY = 'securepay.storeCart'

function readCart() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || '{}')
		return parsed && typeof parsed === 'object' ? parsed : {}
	} catch {
		return {}
	}
}

function writeCart(cart) {
	try {
		window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
	} catch {
		// Storage unavailable: cart just won't survive navigation.
	}
}

export function clearStoredCart() {
	try {
		window.localStorage.removeItem(CART_KEY)
	} catch {
		// Nothing to clear if storage is unavailable.
	}
}

export function useCart() {
	const [cart, setCart] = useState(readCart)

	const cartLines = STORE_PRODUCTS.filter((product) => cart[product.id] > 0).map((product) => ({ ...product, qty: cart[product.id] }))
	const cartCount = cartLines.reduce((sum, line) => sum + line.qty, 0)
	const cartTotal = cartLines.reduce((sum, line) => sum + line.price * line.qty, 0)
	const qtyOf = (id) => cart[id] || 0

	const changeQty = (id, delta) => {
		const next = { ...cart }
		const qty = Math.max(0, (cart[id] || 0) + delta)
		if (qty) next[id] = qty
		else delete next[id]
		writeCart(next)
		setCart(next)
	}

	return { cartLines, cartCount, cartTotal, qtyOf, changeQty }
}
