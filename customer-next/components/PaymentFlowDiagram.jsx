import escrosafeLogo from '../assets/escrosafe-logo.png'

function PaymentFlowDiagram() {
	return (
		<div className="pfd">
			{/* 1. Pay online */}
			<section className="pfd-panel pfd-green">
				<span className="pfd-num">1</span>
				<div className="pfd-copy">
					<h4>Pay online</h4>
					<p>Choose EscroSafe at checkout and complete your payment securely.</p>
				</div>
				<div className="pfd-mock">
					<span className="pfd-mock-label">Payment method</span>
					<div className="pfd-mock-options">
						<span className="pfd-mock-option"><i className="pfd-radio" />Credit or debit card</span>
						<span className="pfd-mock-option is-selected"><i className="pfd-radio is-on" /><img src={escrosafeLogo.src} alt="EscroSafe" /></span>
					</div>
					<span className="pfd-mock-button">Complete payment</span>
				</div>
				<svg className="pfd-art pfd-art-phone" viewBox="0 0 64 80" aria-hidden="true">
					<rect x="10" y="4" width="38" height="68" rx="8" fill="#2f4d6b" />
					<rect x="14" y="12" width="30" height="50" rx="3" fill="#ffffff" />
					<rect x="25" y="7" width="8" height="2" rx="1" fill="#8aa0b5" />
					<text x="29" y="40" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1f9a78" fontFamily="system-ui, sans-serif">&#8377;</text>
					<rect x="19" y="50" width="20" height="6" rx="3" fill="#1f9a78" />
					<circle cx="47" cy="56" r="13" fill="#2fa866" stroke="#dff3ea" strokeWidth="3" />
					<path d="m41 56 4.5 4.5L53 52" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</section>

			<section className="pfd-panel pfd-purple">
				<span className="pfd-num">2</span>
				<div className="pfd-copy">
					<h4>Payment held</h4>
					<p>Your payment is securely held with an RBI-regulated payment aggregator until your order is confirmed.</p>
				</div>
				<div className="pfd-mock pfd-mock-held">
					<span className="pfd-mock-label">Payment status</span>
					<div className="pfd-held-row">
						<span>Amount paid</span>
						<strong>&#8377;1,299</strong>
					</div>
					<span className="pfd-held-pill">
						<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
						Held by payment aggregator
					</span>
					<ol className="pfd-held-track">
						<li className="is-done"><i />Paid</li>
						<li className="is-now"><i />Held</li>
						<li><i />Release / Refund</li>
					</ol>
				</div>
				{/* Bank: the payment is held with the payment aggregator's bank */}
				<svg className="pfd-art pfd-art-safe" viewBox="0 0 64 64" aria-hidden="true">
					<path d="M32 4 4 20h56Z" fill="#d94c82" />
					<circle cx="32" cy="14" r="5" fill="#fff" />
					<text x="32" y="17.500" textAnchor="middle" fontSize="8" fontWeight="700" fill="#b03a68" fontFamily="system-ui, sans-serif">&#8377;</text>
					<rect x="9" y="24" width="8" height="26" rx="1.500" fill="#ea7aa3" />
					<rect x="21" y="24" width="8" height="26" rx="1.500" fill="#ea7aa3" />
					<rect x="35" y="24" width="8" height="26" rx="1.500" fill="#ea7aa3" />
					<rect x="47" y="24" width="8" height="26" rx="1.500" fill="#ea7aa3" />
					<rect x="4" y="52" width="56" height="6" rx="2" fill="#d94c82" />
				</svg>
			</section>

			{/* 3. Track & deliver: store -> road -> house */}
			<section className="pfd-panel pfd-blue">
				<span className="pfd-num">3</span>
				<div className="pfd-copy">
					<h4>Track &amp; deliver</h4>
					<p>We track your order in real time from our store to your doorstep.</p>
				</div>
				<div className="pfd-mock pfd-mock-route">
					<div className="pfd-route-head">
						<span className="pfd-mock-label">Live tracking</span>
						<span className="pfd-route-status">On the way</span>
					</div>
					<svg className="pfd-route" viewBox="0 0 214 94" role="img" aria-label="Order route from store to home: shipped, in transit, out for delivery, delivered">
						{/* straight road with 4 milestones: 22 (Shipped), 79 (In transit), 135 (Out for delivery), 192 (Delivered) */}
						<line x1="22" y1="58" x2="192" y2="58" stroke="#d3ddf0" strokeWidth="9" strokeLinecap="round" />
						<line x1="22" y1="58" x2="107" y2="58" stroke="#2f6fe0" strokeWidth="9" strokeLinecap="round" />
						<line x1="26" y1="58" x2="188" y2="58" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="4 4" opacity=".9" />

						{/* store (start) */}
						<g transform="translate(8 14)">
							<rect x="2" y="10" width="24" height="17" fill="#fdf0e3" stroke="#d9c3a5" strokeWidth=".8" />
							<path d="M0 9 3 0H25L28 9Q24.500 13 21 9Q17.500 13 14 9Q10.500 13 7 9Q3.500 13 0 9Z" fill="#e5534b" />
							<path d="M9.500 0 8.500 9M14 0V9M18.500 0 19.500 9" stroke="#fff" strokeWidth="1.800" opacity=".85" />
							<rect x="11" y="16" width="7" height="11" fill="#3f63c9" />
							<rect x="4" y="15" width="5" height="6" fill="#cfe3ff" />
							<rect x="20" y="15" width="5" height="6" fill="#cfe3ff" />
						</g>

						{/* house (destination) */}
						<g transform="translate(178 14)">
							<rect x="19" y="3" width="4" height="8" fill="#c7463a" />
							<rect x="3" y="13" width="22" height="15" fill="#fdf0e3" stroke="#d9c3a5" strokeWidth=".8" />
							<path d="M0 14 14 1 28 14Z" fill="#e5634d" />
							<rect x="11" y="18" width="7" height="10" fill="#3f63c9" />
							<circle cx="16.500" cy="23.500" r=".9" fill="#fff" />
							<rect x="5" y="18" width="5" height="5" fill="#cfe3ff" />
							<rect x="19" y="18" width="5" height="5" fill="#cfe3ff" />
						</g>

						{/* milestones */}
						<circle cx="22" cy="58" r="6" fill="#2f6fe0" stroke="#fff" strokeWidth="2" />
						<circle cx="79" cy="58" r="6" fill="#2f6fe0" stroke="#fff" strokeWidth="2" />
						<circle cx="135" cy="58" r="6" fill="#fff" stroke="#2f6fe0" strokeWidth="2.400" />
						<circle cx="192" cy="58" r="6" fill="#fff" stroke="#f08804" strokeWidth="2.400" />
						<path d="m19.200 58.200 2 2 3.400-3.800M76.200 58.200l2 2 3.400-3.800" fill="none" stroke="#fff" strokeWidth="1.600" strokeLinecap="round" strokeLinejoin="round" />

						{/* tracker: the truck sits between "In transit" and "Out for delivery" */}
						<g transform="translate(107 41)">
							<rect x="-11" y="-9" width="14" height="10.500" rx="1.500" fill="#2f6fe0" />
							<path d="M3 -5.500h5l3.500 4.500v2.500H3Z" fill="#4f86ea" />
							<circle cx="-6" cy="2" r="2.600" fill="#2f3b52" stroke="#fff" strokeWidth="1" />
							<circle cx="7" cy="2" r="2.600" fill="#2f3b52" stroke="#fff" strokeWidth="1" />
						</g>
						<path d="M107 46v6" stroke="#2f6fe0" strokeWidth="1.600" strokeLinecap="round" />
						<circle cx="107" cy="58" r="3.200" fill="#fff" stroke="#2f6fe0" strokeWidth="1.800" />

						{/* labels */}
						<g className="pfd-route-labels" textAnchor="middle">
							<text x="22" y="84">Shipped</text>
							<text x="79" y="84">In transit</text>
							<text x="135" y="84">Out for delivery</text>
							<text x="192" y="84">Delivered</text>
						</g>
					</svg>
				</div>
				{/* Parcel with a location pin: your order, tracked live */}
				<svg className="pfd-art pfd-art-parcel" viewBox="0 0 64 64" aria-hidden="true">
					<path d="M30 6 54 18 30 30 6 18Z" fill="#e0b27a" />
					<path d="M6 18 30 30v26L6 44Z" fill="#c8945a" />
					<path d="M54 18 30 30v26l24-12Z" fill="#ab7a45" />
					<path d="M18 12 42 24v8" fill="none" stroke="#f3dcb9" strokeWidth="3" strokeLinecap="round" opacity=".8" />
					<circle cx="50" cy="48" r="13" fill="#2f6fe0" stroke="#ddeafc" strokeWidth="3" />
					<path d="M50 57c-5-5-6-7.5-6-10a6 6 0 0 1 12 0c0 2.500-1 5-6 10Z" fill="#fff" />
					<circle cx="50" cy="47" r="2.300" fill="#2f6fe0" />
				</svg>
			</section>

			{/* 4. Confirm delivery: the customer confirms in a chat message */}
			<section className="pfd-panel pfd-amber">
				<span className="pfd-num">4</span>
				<div className="pfd-copy">
					<h4>Confirm delivery</h4>
					<p>Once you confirm receiving the order, the payment is released to the merchant.</p>
				</div>
				<div className="pfd-mock pfd-mock-chat">
					{/* WhatsApp-style header: back arrow, shield icon, EscroSafe logo */}
					<div className="pfd-chat-head">
						<svg className="pfd-chat-back" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
						<span className="pfd-chat-avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.500 3 8 7 10 4-2 7-5.500 7-10V6Z" /><path d="m9 12 2.200 2.200L15.500 10" /></svg></span>
						<span className="pfd-chat-logo"><img src={escrosafeLogo.src} alt="EscroSafe" /></span>
					</div>
					<div className="pfd-chat-body">
						<p className="pfd-bubble-in pfd-bubble-long">
							<span>Your order was tracked, and delivered via Delhivery!</span>
							<span>If you have not received your order or had trouble with your order; click the link below, fill out a quick survey and our team will sort it out shortly. If you have received your order - feel free to ignore this</span>
							<span className="pfd-chat-link">escrosafe.io/enquiry</span>
							<small>10:42</small>
						</p>
					</div>
				</div>
				{/* "Delivery confirmed" seal */}
				<svg className="pfd-art pfd-art-chat" viewBox="0 0 64 64" aria-hidden="true">
					<polygon points="32.0,5.0 37.2,9.1 43.7,7.7 46.7,13.6 53.1,15.2 53.2,21.8 58.3,26.0 55.5,32.0 58.3,38.0 53.2,42.2 53.1,48.8 46.7,50.4 43.7,56.3 37.2,54.9 32.0,59.0 26.8,54.9 20.3,56.3 17.3,50.4 10.9,48.8 10.8,42.2 5.7,38.0 8.5,32.0 5.7,26.0 10.8,21.8 10.9,15.2 17.3,13.6 20.3,7.7 26.8,9.1" fill="#f08a24" />
					<circle cx="32" cy="32" r="18" fill="#fff" />
					<path d="m22.500 32.500 6.500 6.500 13-14" fill="none" stroke="#2fa866" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</section>

			{/* Not received */}
			<section className="pfd-panel pfd-refund">
				<span className="pfd-x" aria-hidden="true">
					<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>
				</span>
				<div className="pfd-copy">
					<h4>If the order is not received</h4>
					<p>In case the order is not delivered to you, we will refund the amount to your bank account.</p>
				</div>
				<div className="pfd-refund-flow">
					{/* The refund is sent by the payment aggregator (EscroSafe does not hold the money) */}
					<span className="pfd-agg-chip" role="img" aria-label="Payment aggregator" title="Payment aggregator">
						<svg viewBox="0 0 48 48" aria-hidden="true">
							<circle cx="24" cy="24" r="22" fill="#2f6fe0" />
							<path d="M9.5 20.1A15 15 0 0 1 34.0 12.9" fill="none" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" />
							<path d="M33.3 6.2L34.0 12.9L27.3 12.9" fill="none" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
							<path d="M38.5 27.9A15 15 0 0 1 14.0 35.1" fill="none" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" />
							<path d="M14.7 41.8L14.0 35.1L20.7 35.1" fill="none" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
							<circle cx="24" cy="24" r="7.500" fill="#fff" />
							<text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#2f6fe0" fontFamily="system-ui, sans-serif">&#8377;</text>
						</svg>
					</span>
					<i className="pfd-dash-arrow" aria-hidden="true" />
					<div className="pfd-bank-card">
						<span className="pfd-bank-ico" aria-hidden="true">
							<svg viewBox="0 0 24 24"><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></svg>
						</span>
						<div>
							<strong>Refunded to your bank account</strong>
							<small>Bank Account ****** 1234</small>
						</div>
						<span className="pfd-tick" aria-hidden="true">
							<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" /></svg>
						</span>
					</div>
				</div>
			</section>
		</div>
	)
}

export default PaymentFlowDiagram
