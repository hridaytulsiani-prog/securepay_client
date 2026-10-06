import { useState } from 'react'
import { STORE_PLATFORMS, WORDPRESS_PLUGIN_ZIP_URL } from '../constants/storePlatforms'

// Three-way choice: custom-built site / WordPress / WooCommerce.
export function StorePlatformPicker({ value, onChange }) {
	return (
		<div className="store-platform-picker" role="radiogroup" aria-label="How is your website built?">
			{STORE_PLATFORMS.map((platform) => (
				<button
					type="button"
					role="radio"
					aria-checked={platform.key === value}
					className={`store-platform-option${platform.key === value ? ' is-selected' : ''}`}
					key={platform.key}
					onClick={() => onChange(platform.key)}
				>
					<strong>{platform.label}</strong>
					<small>{platform.hint}</small>
				</button>
			))}
		</div>
	)
}

function CopyRow({ label, value, secret }) {
	const [copied, setCopied] = useState(false)

	async function copy() {
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)
			window.setTimeout(() => setCopied(false), 2200)
		} catch {
			setCopied(false)
		}
	}

	return (
		<div className="store-copy-row">
			<span>{label}</span>
			<code>{secret && value ? `${value.slice(0, 8)}${'•'.repeat(10)}` : value || 'Not available yet'}</code>
			<button type="button" onClick={copy} disabled={!value}>{copied ? 'Copied' : 'Copy'}</button>
		</div>
	)
}

const STEPS = {
	woocommerce: [
		'Download the plugin using the Download plugin button at the top right.',
		'In WordPress admin, go to Plugins → Add New → Upload Plugin, choose the zip, then Install and Activate.',
		'Open Settings → EscroSafe and paste the values shown here, then Save.',
		'Go to WooCommerce → Settings → Payments → EscroSafe and tick Enable.',
		'"Pay with EscroSafe" now shows at your checkout. Place a test order to check it.',
	],
	wordpress: [
		'Download the plugin using the Download plugin button at the top right.',
		'In WordPress admin, go to Plugins → Add New → Upload Plugin, choose the zip, then Install and Activate.',
		'Open Settings → EscroSafe and paste the values shown here, then Save.',
		'Edit the page or post where you want the button, and paste the Shortcode shown here.',
	],
}

// Plugin instructions + the values the merchant pastes into WordPress.
export function WordPressPluginPanel({ platform, merchantKey, apiUrl, scriptUrl, theme, logoUrl }) {
	const isWoo = platform === 'woocommerce'

	return (
		<div className="store-plugin-panel">
			<div className="store-plugin-head">
				<div>
					<strong>EscroSafe plugin for {isWoo ? 'WooCommerce' : 'WordPress'}</strong>
					<p>{isWoo
						? 'Adds EscroSafe as a payment method at checkout. No code to paste.'
						: 'Adds a shortcode that places the Pay with EscroSafe button on any page. No code to edit.'}</p>
				</div>
				<a className="settings-extension-link" href={WORDPRESS_PLUGIN_ZIP_URL} download>Download plugin</a>
			</div>

			<ol className="store-plugin-steps">
				{STEPS[platform].map((step) => <li key={step}>{step}</li>)}
			</ol>

			<p className="store-platform-lead">This is how the button will look on your {isWoo ? 'checkout' : 'page'}.</p>
			<div className="settings-pay-button-preview" style={{ '--sp-bg': theme?.bg, '--sp-border': theme?.border, justifySelf: 'start', width: 'min(100%, 320px)' }}>
				<span>Pay with</span>
				<img src={logoUrl} alt="EscroSafe" />
			</div>

			<div className="store-copy-list">
				<CopyRow label="Merchant Key" value={merchantKey} secret />
				<CopyRow label="API URL" value={apiUrl} />
				{!isWoo && <CopyRow label="Button script URL" value={scriptUrl} />}
				{!isWoo && <CopyRow label="Shortcode" value="[escrosafe_button]" />}
			</div>


			{isWoo && (
				<p className="store-plugin-note">
					The customer is taken to EscroSafe to pay. The order is set to On hold until you confirm the payment in your EscroSafe dashboard. Automatic "paid" updates will follow in a later plugin version.
				</p>
			)}
		</div>
	)
}
