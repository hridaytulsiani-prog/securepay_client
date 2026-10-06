// How a merchant's storefront is built. This decides which "connect your store"
// instructions Settings and onboarding show: a pasted button snippet for hand-built
// sites, or the EscroSafe plugin for WordPress / WooCommerce.
export const STORE_PLATFORMS = [
	{ key: 'manual', label: 'Custom-built website', hint: 'Hand-coded site, or any site where you can paste a script.' },
	{ key: 'wordpress', label: 'WordPress', hint: 'A WordPress site without a cart, such as a landing page.' },
	{ key: 'woocommerce', label: 'WooCommerce', hint: 'A WordPress store with a cart and checkout.' },
]

export const STORE_PLATFORM_STORAGE_KEY = 'securepay.storePlatform'
export const DEFAULT_STORE_PLATFORM = 'manual'

// Built by wordpress-plugin/build.py and served from public/downloads/.
export const WORDPRESS_PLUGIN_ZIP_URL = '/downloads/escrosafe-for-wordpress.zip'

export function readStoredStorePlatform() {
	try {
		const stored = window.localStorage.getItem(STORE_PLATFORM_STORAGE_KEY)
		return STORE_PLATFORMS.some((platform) => platform.key === stored) ? stored : DEFAULT_STORE_PLATFORM
	} catch {
		return DEFAULT_STORE_PLATFORM
	}
}

export function storeStorePlatform(key) {
	try {
		window.localStorage.setItem(STORE_PLATFORM_STORAGE_KEY, key)
	} catch {
		// The choice just won't be remembered on this device.
	}
}
