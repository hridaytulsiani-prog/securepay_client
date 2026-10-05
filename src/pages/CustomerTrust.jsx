// Public, customer-facing counterpart to LandingPage.jsx (which pitches
// EscroSafe to merchants). This one pitches the same product to the SHOPPER
// instead, and is deliberately a different layout/visual language (mint
// hero with a hand-built order-card mock, timeline, teal/coral/amber trust
// accents) — see App.css's .buyer-* rules, kept separate from .landing-*.
// escrosafe-logo.png in the nav is scoped to THIS page only — the rest of
// the app still reads EscroSafe. Every claim is scoped to what's actually
// built: PhonePe-backed checkout, real courier tracking, OTP-verified
// delivery, and the signed no-login enquiry link sent after delivery (see
// tracking.api.v1.track_shipments.notify_customer_delivered). No refund
// guarantees are claimed — resolution_status on EnquiryData is currently a
// label the merchant sets manually, not an automated payout.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import escrosafeLogo from '../assets/escrosafe-logo.png'
import PaymentFlowDiagram from '../components/PaymentFlowDiagram'
import PostPayArt from '../components/PostPayArt'
import { API_BASE_URL } from '../api/client'

const timelineSteps = [
	{
		tone: 'blue',
		title: 'Your details stay private',
		body: 'Card and bank info never reach the seller.',
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
				<path d="M7 11V7a5 5 0 0 1 10 0v4" />
			</svg>
		),
	},
	{
		tone: 'amber',
		title: 'Updates without asking',
		body: 'Real order status, sent straight to you.',
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.1L5 15v1.5h14V15l-1.5-2.9V9a5.5 5.5 0 0 0-5.5-5.5Z" />
				<path d="M9.8 19a2.3 2.3 0 0 0 4.4 0" />
			</svg>
		),
	},
	{
		tone: 'teal',
		title: 'Checked, not just marked',
		body: 'We verify it landed safely in your hands.',
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 3 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6Z" />
				<path d="m8.5 12 2.4 2.4L15.5 9" />
			</svg>
		),
	},
	{
		tone: 'coral',
		title: 'One tap if needed',
		body: 'Reach the seller directly, no queue.',
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M4 6h16v11H9l-5 3.5Z" />
				<path d="M8 11h6" />
			</svg>
		),
	},
]

// Answers for these 5 questions are the merchant's own official FAQ copy
// (provided verbatim, not written from the codebase), except "How does
// EscroSafe know it was delivered?" which stays as originally written.
// `answer` is an array of paragraphs so multi-paragraph answers render as
// separate <p> tags instead of one run-on block.
const FAQ_ITEMS = [
	{
		question: 'Is my payment actually safe?',
		answer: [
			"When you choose EscroSafe, your payment is collected by an RBI-authorised payment aggregator. Under RBI rules, the aggregator keeps collected funds in an escrow account with a scheduled commercial bank in India. That account is managed by the payment aggregator; the money is not held in EscroSafe's bank account or paid straight to the seller.",
			"The seller is paid after delivery is verified and you confirm that you've received the parcel. If delivery fails, the payment is refunded through the payment partner. In case of dispute, our customer support team investigates the issue and reaches a decision.",
		],
	},
	{
		question: 'Do I need to create an account?',
		answer: [
			"No. Just choose EscroSafe at the seller's checkout. We'll send you a secure link when it's time to confirm delivery.",
		],
	},
	{
		question: 'How will I know where my order is?',
		answer: [
			"You can track it through the courier link provided for your order. EscroSafe also checks the shipment's delivery status so we know when to ask for your confirmation.",
		],
	},
	{
		question: 'How does EscroSafe know it was delivered?',
		answer: [
			"Through the courier's delivery scan, or an OTP shared with you at the door, not just a status label.",
		],
	},
	{
		question: "Something's wrong with my order. What do I do?",
		answer: [
			"Message us through the WhatsApp link we send you. Our customer support team will get in touch and investigate. If your order hasn't arrived, we'll review the delivery evidence and decide the claim. Once we confirm it wasn't delivered, your payment will be refunded.",
			"If the item arrives but is wrong or damaged, you can report it through the same link. We'll help you raise it with the seller, whose return and refund policy applies to product issues.",
		],
	},
]

const PAGE_TITLE = 'Buyer protection | EscroSafe'
const PAGE_DESCRIPTION =
	"See how EscroSafe protects your payment and keeps you informed from checkout to delivery, with a direct line to the seller if anything goes wrong."

// Sets the tab title + share-preview metadata for this page only, and
// restores whatever was there before on unmount — no other page in this app
// manages document.title, so leaving it changed after navigating away would
// mislabel every other route in the tab/history.
function useDocumentMeta(title, description) {
	useEffect(() => {
		const previousTitle = document.title
		document.title = title

		const metaEntries = [
			{ name: 'description', content: description },
			{ property: 'og:title', content: title },
			{ property: 'og:description', content: description },
			{ property: 'og:type', content: 'website' },
		]

		const addedTags = metaEntries.map(({ name, property, content }) => {
			const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`
			let tag = document.head.querySelector(selector)
			const alreadyExisted = Boolean(tag)

			if (!tag) {
				tag = document.createElement('meta')
				if (name) tag.setAttribute('name', name)
				if (property) tag.setAttribute('property', property)
				document.head.appendChild(tag)
			}

			const previousContent = tag.getAttribute('content')
			tag.setAttribute('content', content)
			return { tag, alreadyExisted, previousContent }
		})

		return () => {
			document.title = previousTitle
			addedTags.forEach(({ tag, alreadyExisted, previousContent }) => {
				if (alreadyExisted) {
					tag.setAttribute('content', previousContent || '')
				} else {
					tag.remove()
				}
			})
		}
	}, [title, description])
}

// Scroll-reveal: flips a class on once a section crosses into view, then
// stops watching — a lightweight stand-in for a real animation library,
// used to fade/slide each section in as the shopper scrolls to it.
function useReveal() {
	const ref = useRef(null)
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		const node = ref.current
		if (!node || typeof IntersectionObserver === 'undefined') {
			setIsVisible(true)
			return undefined
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true)
					observer.disconnect()
				}
			},
			{ threshold: 0.15 },
		)
		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	return [ref, isVisible]
}

// Contact-form messages are saved by the backend (POST /adminpanel/contact/) and
// read by the owner admin under "Messages". This address is only shown on the page.
const CONTACT_EMAIL = 'support@escrosafe.io'

const contactCards = [
	{
		tone: 'blue',
		title: 'Email us',
		body: CONTACT_EMAIL,
		href: `mailto:${CONTACT_EMAIL}`,
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<rect x="3" y="5" width="18" height="14" rx="2" />
				<path d="m3 7 9 6 9-6" />
			</svg>
		),
	},
	{
		tone: 'amber',
		title: 'We reply quickly',
		body: 'Expect an answer within one working day.',
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<circle cx="12" cy="12" r="9" />
				<path d="M12 7v5l3 2" />
			</svg>
		),
	},
	{
		tone: 'teal',
		title: 'Have an order?',
		body: 'Add your order ID so we can help faster.',
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M21 8 12 3 3 8l9 5 9-5Z" />
				<path d="M3 8v8l9 5 9-5V8M12 13v8" />
			</svg>
		),
	},
]

// Scrollspy for the sticky nav: watches the 3 anchor-target sections and
// reports whichever one currently sits nearest the vertical center of the
// viewport, so the matching nav tab can highlight as the shopper scrolls —
// not just on click.
function useScrollSpy(sectionRefs) {
	const [activeId, setActiveId] = useState(sectionRefs[0]?.id)

	useEffect(() => {
		const nodes = sectionRefs.map(({ id, ref }) => ({ id, node: ref.current })).filter((entry) => entry.node)
		if (nodes.length === 0 || typeof IntersectionObserver === 'undefined') {
			return undefined
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries.find((entry) => entry.isIntersecting)
				if (visible) {
					setActiveId(visible.target.id)
				}
			},
			{ rootMargin: '-35% 0px -55% 0px', threshold: 0 },
		)

		nodes.forEach(({ node }) => observer.observe(node))
		return () => observer.disconnect()
	}, [sectionRefs])

	return activeId
}

// Transparent nav over the hero, solid/blurred once the shopper scrolls
// past it — flips a class rather than computing an inline style so all the
// actual colors/blur stay in App.css.
function useScrolled(thresholdPx) {
	const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > thresholdPx)

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > thresholdPx)
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [thresholdPx])

	return scrolled
}

// --- Hero "how it works" animated stepper: commented out (not deleted) so
// it can be reused elsewhere later. Re-enable by uncommenting this block,
// the `useStepCycle()` call in CustomerTrust(), and the .buyer-hero-flow
// JSX below (swap it back in for .buyer-payment-flow). ---
/*
function prefersReducedMotion() {
	return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

// Fills the hero's right-hand slot: a small animated stepper. Framed
// entirely as customer benefit ("what's in it for you"), not the backend
// mechanics (courier tracking, OTP scans, seller payout timing) — those
// belong to the merchant-facing LandingPage.jsx, not this page. One step
// highlights at a time, cycling on a timer, purely to draw the eye —
// respects prefers-reduced-motion by freezing on the first step instead of
// cycling.
const HOW_IT_WORKS_STEPS = [
	{
		title: 'Pay without worry',
		bodyLines: ['Your payment stays protected from the moment you check out', 'never handed straight to a stranger.'],
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
				<path d="M7 11V7a5 5 0 0 1 10 0v4" />
			</svg>
		),
	},
	{
		title: 'Stay in the loop',
		bodyLines: ["Get real updates on your order, so you're never left guessing", 'where it is.'],
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.1L5 15v1.5h14V15l-1.5-2.9V9a5.5 5.5 0 0 0-5.5-5.5Z" />
				<path d="M9.8 19a2.3 2.3 0 0 0 4.4 0" />
			</svg>
		),
	},
	{
		title: "We confirm it's really there",
		bodyLines: ['We make sure your order actually reached you safely, not just', "marked as 'delivered'."],
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<rect x="6" y="4" width="12" height="16" rx="2" />
				<path d="M9 4h6" />
				<path d="m9 12 2 2 4-4" />
			</svg>
		),
	},
	{
		title: 'You get the final say',
		bodyLines: ["If something's wrong, you're covered. Your happiness comes", 'before anyone gets paid.'],
		icon: (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 3 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6Z" />
			</svg>
		),
	},
]

function useStepCycle(length, intervalMs) {
	const [active, setActive] = useState(0)

	useEffect(() => {
		if (prefersReducedMotion()) {
			return undefined
		}

		const id = window.setInterval(() => {
			setActive((current) => (current + 1) % length)
		}, intervalMs)

		return () => window.clearInterval(id)
	}, [length, intervalMs])

	return active
}
*/

// --- Hero phone/WhatsApp-mock illustration: commented out (not deleted) so
// it can be reused elsewhere later. Re-enable by uncommenting this block,
// the `useChatDemo()` call in CustomerTrust(), and the
// .buyer-hero-art-wrap JSX below. ---
/*
// Looping "conversation" script for the hero phone mock: two incoming
// EscroSafe/WhatsApp messages type in from the left, quick-reply buttons
// appear, one gets auto-"tapped" and echoes back as an outgoing
// (right-aligned) bubble, then a final incoming thank-you reply types in
// from the left — closing the loop the way a real WhatsApp business
// conversation would — before the whole thing resets. Each frame holds for
// `hold` ms before advancing; the cycle loops for as long as the page is
// open. Respects prefers-reduced-motion by freezing on a single
// representative frame instead of animating.
const CHAT_DEMO_FRAMES = [
	{ visibleCount: 0, typing: true, showOptions: false, pickedReply: null, thanksTyping: false, thanksText: null, hold: 700 },
	{ visibleCount: 1, typing: false, showOptions: false, pickedReply: null, thanksTyping: false, thanksText: null, hold: 1600 },
	{ visibleCount: 1, typing: true, showOptions: false, pickedReply: null, thanksTyping: false, thanksText: null, hold: 700 },
	{ visibleCount: 2, typing: false, showOptions: false, pickedReply: null, thanksTyping: false, thanksText: null, hold: 1500 },
	{ visibleCount: 2, typing: false, showOptions: true, pickedReply: null, thanksTyping: false, thanksText: null, hold: 2000 },
	{ visibleCount: 2, typing: false, showOptions: false, pickedReply: 'Yes, all good', thanksTyping: false, thanksText: null, hold: 1000 },
	{ visibleCount: 2, typing: false, showOptions: false, pickedReply: 'Yes, all good', thanksTyping: true, thanksText: null, hold: 900 },
	{
		visibleCount: 2,
		typing: false,
		showOptions: false,
		pickedReply: 'Yes, all good',
		thanksTyping: false,
		thanksText: 'Thanks for confirming! 🙌',
		hold: 2800,
	},
	{ visibleCount: 0, typing: false, showOptions: false, pickedReply: null, thanksTyping: false, thanksText: null, hold: 600 },
]

const CHAT_DEMO_REDUCED_MOTION_FRAME = CHAT_DEMO_FRAMES[7]

function prefersReducedMotion() {
	return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

function useChatDemo() {
	const [frame, setFrame] = useState(() =>
		prefersReducedMotion() ? CHAT_DEMO_REDUCED_MOTION_FRAME : CHAT_DEMO_FRAMES[0],
	)
	const chatBodyRef = useRef(null)

	useEffect(() => {
		if (prefersReducedMotion()) {
			return undefined
		}

		let active = true
		let timeoutId

		const advance = (index) => {
			if (!active) return
			const next = CHAT_DEMO_FRAMES[index % CHAT_DEMO_FRAMES.length]
			setFrame(next)
			timeoutId = window.setTimeout(() => advance(index + 1), next.hold)
		}

		timeoutId = window.setTimeout(() => advance(1), CHAT_DEMO_FRAMES[0].hold)

		return () => {
			active = false
			window.clearTimeout(timeoutId)
		}
	}, [])

	useEffect(() => {
		const node = chatBodyRef.current
		if (node) {
			node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
		}
	}, [frame])

	return { frame, chatBodyRef }
}
*/

function CustomerTrust() {
	useDocumentMeta(PAGE_TITLE, PAGE_DESCRIPTION)

	const heroRef = useRef(null)
	const [timelineRef, timelineVisible] = useReveal()
	const [faqRef, faqVisible] = useReveal()
	const [contactRef, contactVisible] = useReveal()
	const [contactForm, setContactForm] = useState({ name: '', email: '', orderId: '', message: '', website: '' })
	// idle | sending | sent | error
	const [contactStatus, setContactStatus] = useState({ state: 'idle', text: '' })
	// const activeStep = useStepCycle(HOW_IT_WORKS_STEPS.length, 2200)
	// const { frame: chatFrame, chatBodyRef } = useChatDemo()

	const navSectionRefs = useMemo(
		() => [
			{ id: 'hero', ref: heroRef },
			{ id: 'how-it-works', ref: timelineRef },
			{ id: 'faq', ref: faqRef },
			{ id: 'contact', ref: contactRef },
		],
		[heroRef, timelineRef, faqRef, contactRef],
	)
	const activeNavId = useScrollSpy(navSectionRefs)
	// After a successful send, keep the confirmation for 10 seconds, then empty the form and bring the button back.
	useEffect(() => {
		if (contactStatus.state !== 'sent') {
			return undefined
		}
		const timer = window.setTimeout(() => {
			setContactForm({ name: '', email: '', orderId: '', message: '', website: '' })
			setContactStatus({ state: 'idle', text: '' })
		}, 10000)
		return () => window.clearTimeout(timer)
	}, [contactStatus.state])

	const handleContactSubmit = async (event) => {
		event.preventDefault()
		if (contactStatus.state === 'sending' || contactStatus.state === 'sent') {
			return
		}
		setContactStatus({ state: 'sending', text: '' })
		try {
			const response = await fetch(`${API_BASE_URL}/adminpanel/contact/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: contactForm.name.trim(),
					email: contactForm.email.trim(),
					order_id: contactForm.orderId.trim(),
					message: contactForm.message.trim(),
					website: contactForm.website,
				}),
			})
			const data = await response.json().catch(() => null)
			if (!response.ok) {
				throw new Error((data && data.error) || 'Could not send your message. Please try again.')
			}
			setContactStatus({ state: 'sent', text: "Thanks! Your message has been sent. We'll get back to you soon." })
		} catch (error) {
			setContactStatus({ state: 'error', text: error.message || 'Could not send your message. Please try again.' })
		}
	}
	const isScrolled = useScrolled(80)

	return (
		<div className="buyer-page">
			<div className="buyer-bg-blob buyer-bg-blob-a" aria-hidden="true" />
			<div className="buyer-bg-blob buyer-bg-blob-b" aria-hidden="true" />

			<header className={`buyer-nav${isScrolled ? ' is-scrolled' : ''}`}>
				<div className="buyer-nav-inner">
					<img className="buyer-brand-logo" src={escrosafeLogo} alt="EscroSafe" />
					<nav className="buyer-nav-links" aria-label="Buyer protection page">
						<a className={activeNavId === 'hero' ? 'is-active' : ''} href="#hero">
							How it works
						</a>
						<a className={activeNavId === 'how-it-works' ? 'is-active' : ''} href="#how-it-works">
							What to expect
						</a>
						<a className={activeNavId === 'faq' ? 'is-active' : ''} href="#faq">
							FAQ
						</a>
						<a className={activeNavId === 'contact' ? 'is-active' : ''} href="#contact">
							Contact
						</a>
					</nav>
					<Link className="buyer-nav-cta" to="/">
						For merchants
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
					</Link>
				</div>
			</header>

			<main>
				<section className="buyer-hero" id="hero" ref={heroRef}>
					<div className="buyer-hero-copy">
						<span className="buyer-badge buyer-fade-up" style={{ '--d': '0s' }}>
							<span className="buyer-badge-dot" aria-hidden="true" />
							Your payment, protected until delivery
						</span>
						<h1 className="buyer-fade-up" style={{ '--d': '0.08s' }}>
							Shop online, without<br />the <span className="buyer-hero-accent">leap of faith.</span>
						</h1>
						<p className="buyer-lede buyer-fade-up" style={{ '--d': '0.16s' }}>
							EscroSafe protects your payment the moment you check out,<br />
							with a direct line to the seller if anything goes wrong.
						</p>
						<div className="buyer-hero-actions buyer-fade-up" style={{ '--d': '0.22s' }}>
							<a className="buyer-cta-primary" href="#how-it-works">
								See a live demo
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
							</a>
						</div>
						<p className="buyer-hero-footnote buyer-fade-up" style={{ '--d': '0.28s' }}>
							Available whenever a seller checks you out with EscroSafe.
						</p>
					</div>

					{/* Hero phone/WhatsApp mock — commented out (not shown), kept for later reuse.
					<div className="buyer-hero-art-wrap buyer-fade-up" style={{ '--d': '0.24s' }}>
						<div className="buyer-hero-ring" aria-hidden="true" />
						<div className="buyer-hero-phone">
							<span className="buyer-hero-phone-speaker" aria-hidden="true" />
							<div className="buyer-hero-phone-screen">
								<div className="buyer-hero-chat-header">
									<div>
										<strong className="buyer-hero-chat-name">
											EscroSafe
											<svg className="buyer-hero-chat-badge" viewBox="0 0 24 24" aria-hidden="true">
												<circle cx="12" cy="12" r="11" fill="#1f9d6b" />
												<path
													d="m7.5 12.5 3 3 6-6.5"
													fill="none"
													stroke="#ffffff"
													strokeWidth="2.4"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</strong>
										<span>via WhatsApp</span>
									</div>
								</div>

								<div className="buyer-hero-chat-body" ref={chatBodyRef}>
									{chatFrame.visibleCount >= 1 && (
										<div className="buyer-hero-chat-bubble buyer-chat-pop">
											<p>📦 Your order #1042 has been picked up and is on its way.</p>
											<span>10:14 AM</span>
										</div>
									)}
									{chatFrame.typing && (
										<div className="buyer-hero-chat-bubble buyer-hero-chat-typing buyer-chat-pop">
											<span className="buyer-hero-chat-dot" />
											<span className="buyer-hero-chat-dot" />
											<span className="buyer-hero-chat-dot" />
										</div>
									)}
									{chatFrame.visibleCount >= 2 && (
										<div className="buyer-hero-chat-bubble buyer-chat-pop">
											<p>✅ Delivered! Did everything arrive okay?</p>
											<span>4:42 PM</span>
										</div>
									)}
									{chatFrame.showOptions && (
										<div className="buyer-hero-chat-actions buyer-chat-pop">
											<button type="button">Yes, all good</button>
											<button type="button">Something&apos;s wrong</button>
										</div>
									)}
									{chatFrame.pickedReply && (
										<div className="buyer-hero-chat-bubble is-out buyer-chat-pop-right">
											<p>{chatFrame.pickedReply} ✅</p>
											<span>Just now</span>
										</div>
									)}
									{chatFrame.thanksTyping && (
										<div className="buyer-hero-chat-bubble buyer-hero-chat-typing buyer-chat-pop">
											<span className="buyer-hero-chat-dot" />
											<span className="buyer-hero-chat-dot" />
											<span className="buyer-hero-chat-dot" />
										</div>
									)}
									{chatFrame.thanksText && (
										<div className="buyer-hero-chat-bubble buyer-chat-pop">
											<p>{chatFrame.thanksText}</p>
											<span>Just now</span>
										</div>
									)}
								</div>
							</div>
							<span className="buyer-hero-phone-home" aria-hidden="true" />
						</div>
						<span className="buyer-hero-chip buyer-hero-chip-a">
							You&apos;ve got this
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
						</span>
						<span className="buyer-hero-chip buyer-hero-chip-b">No app. No login. Just WhatsApp.</span>
					</div>
					*/}

					{/* Hero "how it works" animated stepper — commented out (not shown), kept for later reuse.
					<div className="buyer-hero-flow buyer-fade-up" style={{ '--d': '0.24s' }}>
						<span className="buyer-hero-flow-eyebrow">How EscroSafe works for you</span>
						<ol className="buyer-hero-flow-steps">
							{HOW_IT_WORKS_STEPS.map((step, index) => (
								<li key={step.title} className={index === activeStep ? 'is-active' : ''}>
									<span className="buyer-hero-flow-icon">{step.icon}</span>
									<div>
										<strong>{step.title}</strong>
										<p>
											{step.bodyLines[0]}
											<br />
											{step.bodyLines[1]}
										</p>
									</div>
								</li>
							))}
						</ol>
					</div>
					*/}

					<div className="buyer-payment-flow buyer-fade-up" style={{ '--d': '0.24s' }}>
						{/* "Live example" label removed (kept for reference):
						<span className="buyer-payment-flow-eyebrow">
							<span className="buyer-payment-flow-live-dot" aria-hidden="true" />
							Live example
						</span>
						*/}
						{/* Heading removed (kept for reference):
						<h3>From checkout to confirmation</h3>
						*/}

						{/* Decorative — the "From checkout to confirmation" heading above
						already states what this shows, and the merged image itself has
						its own numbers/titles baked in, so an alt description would
						just repeat both. */}
						{/* Previous pasted image, kept for reference:
						<img className="buyer-payment-flow-image" src="/payment-flow-illustration.png" alt="" />
						*/}
						<PaymentFlowDiagram />
					</div>
				</section>

				<section
					className={`buyer-timeline-section${timelineVisible ? ' is-visible' : ''}`}
					id="how-it-works"
					ref={timelineRef}
				>
					<div className="buyer-timeline-copy">
						<span className="buyer-badge">
							<span className="buyer-badge-dot" aria-hidden="true" />
							Working behind the scenes
						</span>
						<h2>
							What happens after
							<br />
							<span className="buyer-hero-accent">you pay</span>
						</h2>
						<p className="buyer-timeline-lede">
							Four things run quietly behind every order, from the moment you pay to the moment it's
							confirmed in your hands.
						</p>
					</div>

					<div className="buyer-timeline-media">
						{/* Previous pasted image, kept for reference:
						<img className="buyer-timeline-image" src="/what-to-expect-illustration.png" alt="" />
						*/}
						<PostPayArt />
					</div>

					<div className="buyer-expect-grid">
						{timelineSteps.map((step) => (
							<div className="buyer-expect-item" key={step.title}>
								<span className={`buyer-expect-icon is-${step.tone}`}>{step.icon}</span>
								<strong>{step.title}</strong>
								<p>{step.body}</p>
							</div>
						))}
					</div>
				</section>

				<section id="faq" className={`buyer-faq${faqVisible ? ' is-visible' : ''}`} ref={faqRef}>
					<span className="buyer-badge">
						<span className="buyer-badge-dot" aria-hidden="true" />
						Before you ask
					</span>
					<h2>
						Frequently asked <span className="buyer-hero-accent">questions</span>
					</h2>
					<p className="buyer-faq-lede">
						Quick answers to what shoppers ask most about payments, delivery and refunds.
					</p>

					<div className="buyer-faq-list">
						{FAQ_ITEMS.map((item) => (
							<details className="buyer-faq-item" key={item.question}>
								<summary>
									{item.question}
									<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
								</summary>
								{item.answer.map((paragraph) => (
									<p key={paragraph}>{paragraph}</p>
								))}
							</details>
						))}
					</div>
				</section>

				<section id="contact" className={`buyer-contact${contactVisible ? ' is-visible' : ''}`} ref={contactRef}>
					<span className="buyer-badge">
						<span className="buyer-badge-dot" aria-hidden="true" />
						Still have a question?
					</span>
					<h2>
						Get in <span className="buyer-hero-accent">touch</span>
					</h2>
					<p className="buyer-contact-lede">
						Something unclear about your order or payment? Send us a message and we&apos;ll get back to you.
					</p>

					<div className="buyer-contact-grid">
						<div className="buyer-contact-info">
							{contactCards.map((card) => {
								const content = (
									<>
										<span className={`buyer-expect-icon is-${card.tone}`}>{card.icon}</span>
										<div>
											<strong>{card.title}</strong>
											<p>{card.body}</p>
										</div>
									</>
								)
								return card.href ? (
									<a className="buyer-contact-card" href={card.href} key={card.title}>{content}</a>
								) : (
									<div className="buyer-contact-card" key={card.title}>{content}</div>
								)
							})}
						</div>

						<form className="buyer-contact-form" onSubmit={handleContactSubmit}>
							<label>
								<span>Your name</span>
								<input type="text" required value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} placeholder="Full name" />
							</label>
							<label>
								<span>Email</span>
								<input type="email" required value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} placeholder="you@example.com" />
							</label>
							<label className="is-wide">
								<span>Order ID (optional)</span>
								<input type="text" value={contactForm.orderId} onChange={(event) => setContactForm({ ...contactForm, orderId: event.target.value })} placeholder="SP_1001" />
							</label>
							<label className="is-wide">
								<span>Your message</span>
								<textarea required rows="3" value={contactForm.message} onChange={(event) => setContactForm({ ...contactForm, message: event.target.value })} placeholder="How can we help?" />
							</label>
								<input
									type="text"
									name="website"
									tabIndex={-1}
									autoComplete="off"
									aria-hidden="true"
									className="buyer-contact-hp"
									value={contactForm.website}
									onChange={(event) => setContactForm({ ...contactForm, website: event.target.value })}
								/>
								<button type="submit" className="buyer-contact-send" disabled={contactStatus.state === 'sending' || contactStatus.state === 'sent'}>
									{contactStatus.state === 'sending' ? 'Sending...' : contactStatus.state === 'sent' ? 'Message sent' : 'Send message'}
								</button>
								{contactStatus.state === 'sent' || contactStatus.state === 'error' ? (
									<small className={`is-wide buyer-contact-note is-${contactStatus.state}`} role="status">{contactStatus.text}</small>
								) : (
									<small className="is-wide">We reply within one working day.</small>
								)}
						</form>
					</div>
				</section>
			</main>

			<footer className="buyer-footer">
				<span>© {new Date().getFullYear()} EscroSafe. Checkout protection for every order.</span>
				<Link to="/terms">Terms & Conditions</Link>
			</footer>
		</div>
	)
}

export default CustomerTrust
