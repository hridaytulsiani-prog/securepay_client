// "What happens after you pay" scene for the customer page (/customer).
// It mirrors the four points under it, left to right:
//   1. Your details stay private  -> phone showing a UPI payment, with a lock
//   2. Updates without asking     -> order notification with a bell
//   3. Checked, not just marked   -> parcel with a green verified tick
//   4. One tap if needed          -> direct chat with the seller
// Inline SVG on a transparent background. Colours match the four icon tiles
// below it (dark, amber, teal, coral). Size is set in App.css under
// ".buyer-timeline-art".

function PostPayArt() {
	return (
		<svg className="buyer-timeline-art" viewBox="0 0 680 250" role="presentation" aria-hidden="true">
			{/* soft tinted circles behind each step */}
			<circle cx="95" cy="120" r="62" fill="#12211a" opacity=".07" />
			<circle cx="255" cy="120" r="62" fill="#e08a2b" opacity=".16" />
			<circle cx="415" cy="120" r="62" fill="#1f9d6b" opacity=".16" />
			<circle cx="575" cy="120" r="62" fill="#d1594c" opacity=".14" />

			{/* arrows between the steps (same green dashed arrow as the refund strip) */}
			<g>
				<line x1="161" y1="120" x2="180" y2="120" stroke="#2fa866" strokeWidth="2.500" strokeDasharray="5 4" />
				<polygon points="180,114 190,120 180,126" fill="#2fa866" />
				<line x1="321" y1="120" x2="340" y2="120" stroke="#2fa866" strokeWidth="2.500" strokeDasharray="5 4" />
				<polygon points="340,114 350,120 340,126" fill="#2fa866" />
				<line x1="481" y1="120" x2="500" y2="120" stroke="#2fa866" strokeWidth="2.500" strokeDasharray="5 4" />
				<polygon points="500,114 510,120 500,126" fill="#2fa866" />
			</g>

			{/* 1. details stay private: phone (UPI payment) + lock */}
			<g transform="translate(95 120)">
				<g transform="rotate(-8)">
					<rect x="-26" y="-44" width="52" height="88" rx="10" fill="#12211a" />
					<rect x="-21" y="-34" width="42" height="68" rx="4" fill="#ffffff" />
					<rect x="-7" y="-40" width="14" height="3" rx="1.500" fill="#2c4036" />
					<circle cx="0" cy="-12" r="13" fill="#1f9d6b" opacity=".16" />
					<text x="0" y="-5" textAnchor="middle" fontSize="20" fontWeight="700" fill="#12211a" fontFamily="system-ui, sans-serif">&#8377;</text>
					<rect x="-14" y="10" width="28" height="5" rx="2.500" fill="#2c4036" opacity=".35" />
					<rect x="-14" y="19" width="28" height="9" rx="4.500" fill="#1f9d6b" />
				</g>
				<circle cx="34" cy="30" r="17" fill="#ffffff" stroke="#12211a" strokeWidth="3" />
				<rect x="27" y="29" width="14" height="11" rx="2.500" fill="#12211a" />
				<path d="M30 29v-4a4 4 0 0 1 8 0v4" fill="none" stroke="#12211a" strokeWidth="3" strokeLinecap="round" />
			</g>

			{/* 2. updates without asking: notification + bell */}
			<g transform="translate(255 120)">
				<rect x="-42" y="-42" width="100" height="46" rx="12" fill="#ffffff" opacity=".55" />
				<rect x="-50" y="-26" width="100" height="48" rx="12" fill="#ffffff" stroke="#f3dcb9" strokeWidth="1.500" />
				<circle cx="-30" cy="-2" r="14" fill="#e08a2b" />
				<path d="M-30 -10a6.500 6.500 0 0 1 6.500 6.500v4l2.200 3.500h-17.400l2.200-3.500v-4A6.500 6.500 0 0 1-30-10Z" fill="#fff" />
				<circle cx="-30" cy="11" r="2.300" fill="#fff" />
				<rect x="-10" y="-14" width="48" height="6.500" rx="3.250" fill="#2b3a4f" />
				<rect x="-10" y="-2" width="34" height="5.500" rx="2.750" fill="#c9d0da" />
				<g fill="#2fa866"><circle cx="-8" cy="12" r="3" /><circle cx="2" cy="12" r="3" /></g>
				<circle cx="12" cy="12" r="3" fill="none" stroke="#9fb0c7" strokeWidth="1.500" />
			</g>

			{/* 3. checked, not just marked: parcel + verified tick */}
			<g transform="translate(415 120)">
				<polygon points="0,-44 40,-25 0,-6 -40,-25" fill="#f1c687" />
				<polygon points="-40,-25 0,-6 0,40 -40,21" fill="#d9a25f" />
				<polygon points="40,-25 0,-6 0,40 40,21" fill="#c48a49" />
				<path d="M-20-34.500 20-15.500M0-6v46" stroke="#f8dcb0" strokeWidth="6" opacity=".9" />
				<circle cx="34" cy="30" r="18" fill="#1f9d6b" stroke="#ffffff" strokeWidth="3" />
				<path d="m25 30 6.500 6.500L44 23" fill="none" stroke="#fff" strokeWidth="4.200" strokeLinecap="round" strokeLinejoin="round" />
			</g>

			{/* 4. one tap if needed: a simple chat bubble, seller is online */}
			<g transform="translate(575 120)">
				<rect x="-46" y="-38" width="92" height="64" rx="20" fill="#d1594c" />
				<path d="M-22 24-34 44l26-18Z" fill="#d1594c" />
				<circle cx="-18" cy="-6" r="6" fill="#ffffff" />
				<circle cx="0" cy="-6" r="6" fill="#ffffff" />
				<circle cx="18" cy="-6" r="6" fill="#ffffff" />
				<circle cx="40" cy="-34" r="10" fill="#2fa866" stroke="#ffffff" strokeWidth="3" />
			</g>
		</svg>
	)
}

export default PostPayArt
