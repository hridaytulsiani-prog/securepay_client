// Small brand marks for the payment-method list on /checkout.
// Drawn as inline SVG (card-network style marks on a light tile), so no image files are needed.
// Each mark is 44x28; change a size in App.css under ".oc-logo-tile".

function Tile({ label, children }) {
	return (
		<span className="oc-logo-tile" role="img" aria-label={label} title={label}>
			<svg viewBox="0 0 44 28" aria-hidden="true">{children}</svg>
		</span>
	)
}

export function VisaLogo() {
	return (
		<Tile label="Visa">
			<text x="22" y="19.500" textAnchor="middle" fontSize="15" fontWeight="900" fontStyle="italic" fill="#1a1f71" fontFamily="Arial Black, Arial, sans-serif" letterSpacing="-.3">VISA</text>
			<path d="M8 22.500h28" stroke="#f7b600" strokeWidth="1.600" strokeLinecap="round" />
		</Tile>
	)
}

export function MastercardLogo() {
	return (
		<Tile label="Mastercard">
			<circle cx="17" cy="14" r="8.500" fill="#eb001b" />
			<circle cx="27" cy="14" r="8.500" fill="#f79e1b" />
			<path d="M22 7.300a8.500 8.500 0 0 1 0 13.400 8.500 8.500 0 0 1 0-13.400Z" fill="#ff5f00" />
		</Tile>
	)
}

export function AmexLogo() {
	return (
		<Tile label="American Express">
			<rect x="3" y="3" width="38" height="22" rx="2.500" fill="#2e77bc" />
			<text x="22" y="18" textAnchor="middle" fontSize="8.500" fontWeight="800" fill="#ffffff" fontFamily="Arial, sans-serif" letterSpacing=".4">AMEX</text>
		</Tile>
	)
}

export function DinersLogo() {
	return (
		<Tile label="Diners Club">
			<circle cx="22" cy="14" r="10" fill="#0079be" />
			<circle cx="22" cy="14" r="8" fill="#ffffff" />
			<path d="M18.500 8.400a6 6 0 0 0 0 11.200ZM25.500 8.400a6 6 0 0 1 0 11.200Z" fill="#0079be" />
			<rect x="20.800" y="7" width="2.400" height="14" fill="#0079be" />
		</Tile>
	)
}

export function MaestroLogo() {
	return (
		<Tile label="Maestro">
			<circle cx="17" cy="14" r="8.500" fill="#eb001b" />
			<circle cx="27" cy="14" r="8.500" fill="#0099df" />
			<path d="M22 7.300a8.500 8.500 0 0 1 0 13.400 8.500 8.500 0 0 1 0-13.400Z" fill="#6c6bbd" />
		</Tile>
	)
}

export function RupayLogo() {
	return (
		<Tile label="RuPay">
			<text x="4" y="18" fontSize="11" fontWeight="800" fontStyle="italic" fill="#1c3f94" fontFamily="Arial, sans-serif">Ru</text>
			<text x="16" y="18" fontSize="11" fontWeight="800" fontStyle="italic" fill="#f26f21" fontFamily="Arial, sans-serif">Pay</text>
			<path d="M34.500 9.500 40 13.500l-5.500 4Z" fill="#00a651" />
			<path d="M34.500 9.500 37 13.500l-2.500 4Z" fill="#f26f21" />
		</Tile>
	)
}

export function UpiLogo() {
	return (
		<span className="oc-upi-logo" role="img" aria-label="UPI" title="UPI">
			<svg viewBox="0 0 46 20" aria-hidden="true">
				<text x="1" y="15" fontSize="15" fontWeight="800" fontStyle="italic" fill="#5b5b5b" fontFamily="Arial, sans-serif" letterSpacing="-.5">UPI</text>
				<path d="M33 2 39 10 33 18Z" fill="#f58220" />
				<path d="M37.500 2 43.500 10 37.500 18Z" fill="#00823b" />
			</svg>
		</span>
	)
}
