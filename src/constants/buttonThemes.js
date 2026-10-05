// Colour themes for the "Pay with EscroSafe" button. Keep in sync with THEMES in public/button.js.
export const BUTTON_THEMES = [
	{ key: 'pink', label: 'Light pink', bg: '#fde4ec', border: '#f2b5c8', hoverBg: '#fbd2e0', hoverBorder: '#e58fae' },
	{ key: 'lavender', label: 'Lavender', bg: '#ece6fb', border: '#c9bbf0', hoverBg: '#ddd3f7', hoverBorder: '#ab97e6' },
	{ key: 'peach', label: 'Soft peach', bg: '#ffe9d9', border: '#f6c7a3', hoverBg: '#fddcc4', hoverBorder: '#eaa979' },
	{ key: 'butter', label: 'Butter yellow', bg: '#fff4c9', border: '#f0dc83', hoverBg: '#ffec9e', hoverBorder: '#e2c94f' },
	{ key: 'sky', label: 'Sky blue', bg: '#dff0fb', border: '#a9d3ee', hoverBg: '#c9e5f7', hoverBorder: '#7fb9e0' },
	{ key: 'lilac', label: 'Lilac pink', bg: '#f6e3f4', border: '#e2b5dc', hoverBg: '#efd0eb', hoverBorder: '#d093c8' },
	{ key: 'grey', label: 'Light grey', bg: '#eef1f0', border: '#cbd3d0', hoverBg: '#e1e6e4', hoverBorder: '#a9b4b0' },
	{ key: 'white', label: 'White', bg: '#ffffff', border: '#bcd3cb', hoverBg: '#eef7f3', hoverBorder: '#173d38' },
]

export const BUTTON_THEME_STORAGE_KEY = 'securepay.buttonTheme'
export const DEFAULT_BUTTON_THEME = 'grey'
// Colour picker on the settings page is switched off for now; set to true to bring it back.
export const BUTTON_THEME_PICKER_ENABLED = false

export function readStoredButtonTheme() {
	if (!BUTTON_THEME_PICKER_ENABLED) {
		return DEFAULT_BUTTON_THEME
	}
	try {
		const stored = window.localStorage.getItem(BUTTON_THEME_STORAGE_KEY)
		return BUTTON_THEMES.some((theme) => theme.key === stored) ? stored : DEFAULT_BUTTON_THEME
	} catch {
		return DEFAULT_BUTTON_THEME
	}
}

export function storeButtonTheme(key) {
	try {
		window.localStorage.setItem(BUTTON_THEME_STORAGE_KEY, key)
	} catch {
		// Theme just won't be remembered on this device.
	}
}
