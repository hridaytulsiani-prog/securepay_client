// Merchant UI for creating shipments and showing order details passed from the
// dashboard Track button. The dashboard supplies backend order data, so this
// page does not make courier tracking calls just to open an order.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { createShipment, createShipmentsBulk } from '../api/tracking'
import { getCourierPreferences } from '../api/merchant'
import { COURIERS } from '../constants/couriers'
import { getCourierLogo } from '../utils/courierLogos'

const TRACK_ORDER_CONTEXT_KEY = 'escrosafe.trackOrderContext'

function valueOrDash(value) {
	return value === undefined || value === null || value === '' ? '-' : value
}

function formatMoney(value) {
	const parsed = Number(value)
	if (Number.isNaN(parsed)) return valueOrDash(value)
	return `₹ ${parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
	if (!value) return '-'
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return String(value)
	return parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function CourierPickerOption({ label }) {
	const match = getCourierLogo(label)
	const logoClass = match ? `logo-${match.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''

	return (
		<span className={`courier-picker-option ${logoClass}`}>
			{match ? (
				<span className="courier-picker-logo-frame">
					<img src={match.logo} alt={match.label} />
				</span>
			) : (
				<span className="courier-picker-mark">{label}</span>
			)}
		</span>
	)
}

function TrackOrderControl() {
	const location = useLocation()
	const initialTrackOrder = location.state?.trackOrder || null
	const [onboardedCouriers, setOnboardedCouriers] = useState(COURIERS)
	const [toastMessage, setToastMessage] = useState('')
	const [isCourierOpen, setIsCourierOpen] = useState(false)
	const courierPickerRef = useRef(null)
	const [orderId, setOrderId] = useState(initialTrackOrder?.orderId || '')
	const [awbInput, setAwbInput] = useState(initialTrackOrder?.awb || '')
	const [courier, setCourier] = useState(initialTrackOrder?.courier || 'Delhivery')
	const [orderDetails, setOrderDetails] = useState(initialTrackOrder || null)
	// Bulk shipment creation (CSV) is commented out below — keep this state/handler wired for when it comes back.
	// eslint-disable-next-line no-unused-vars
	const [bulkCsvFile, setBulkCsvFile] = useState(null)
	// eslint-disable-next-line no-unused-vars
	const [bulkProgress, setBulkProgress] = useState('')

	const showToast = useCallback((message) => {
		setToastMessage('')
		window.setTimeout(() => setToastMessage(message), 0)
	}, [])

	useEffect(() => {
		if (!toastMessage) {
			return undefined
		}

		const toastTimerId = window.setTimeout(() => {
			setToastMessage('')
		}, 3600)

		return () => window.clearTimeout(toastTimerId)
	}, [toastMessage])

	useEffect(() => {
		if (!isCourierOpen) {
			return undefined
		}

		const closeOnOutsideClick = (event) => {
			if (!courierPickerRef.current?.contains(event.target)) {
				setIsCourierOpen(false)
			}
		}
		const closeOnEscape = (event) => {
			if (event.key === 'Escape') {
				setIsCourierOpen(false)
			}
		}

		document.addEventListener('mousedown', closeOnOutsideClick)
		document.addEventListener('keydown', closeOnEscape)
		return () => {
			document.removeEventListener('mousedown', closeOnOutsideClick)
			document.removeEventListener('keydown', closeOnEscape)
		}
	}, [isCourierOpen])

	useEffect(() => {
		const incomingContext = location.state?.trackOrder
		if (!incomingContext) {
			return
		}

		setOrderDetails(incomingContext)
		setOrderId(incomingContext.orderId || '')
		setAwbInput(incomingContext.awb || '')
		setCourier(incomingContext.courier || 'Delhivery')
	}, [location.state])

	useEffect(() => {
		try {
			window.localStorage.removeItem(TRACK_ORDER_CONTEXT_KEY)
		} catch {
			// Ignore browsers with blocked storage.
		}
	}, [])

	useEffect(() => {
		getCourierPreferences()
			.then((data) => {
				const onboardedKeys = data.courier_preferences?.couriers
				if (!Array.isArray(onboardedKeys) || onboardedKeys.length === 0) {
					return
				}

				const matched = COURIERS.filter((item) => onboardedKeys.includes(item.key))
				if (matched.length === 0) {
					return
				}

				setOnboardedCouriers(matched)
				setCourier((current) => (matched.some((item) => item.label === current) ? current : matched[0].label))
			})
			.catch(() => {
				// Keep the full courier list as a fallback if preferences can't load.
			})
	}, [])

	const handleCreateOrStart = async () => {
		const normalizedOrderId = orderId.trim()
		if (!normalizedOrderId) {
			showToast('Enter order id')
			return
		}

		const normalizedCourier = courier.trim() || onboardedCouriers[0]?.label || 'Delhivery'
		const normalizedAwb = awbInput.trim() || undefined

		try {
			const response = await createShipment({
				secureupi_order_id: normalizedOrderId,
				courier: normalizedCourier,
				awb: normalizedAwb,
			})

			if (response.awb && !normalizedAwb) {
				setAwbInput(response.awb)
			}

			showToast('Shipment created successfully.')
		} catch (error) {
			showToast(`Create shipment failed: ${error.message}`)
		}
	}

	const handleLoadOrder = async () => {
		const normalizedOrderId = orderId.trim()
		if (!normalizedOrderId) {
			showToast('Enter order id')
			return
		}

		if (orderDetails?.orderId === normalizedOrderId) {
			showToast('Order details loaded.')
			return
		}

		showToast('Open this order from the dashboard Track button to view saved backend details.')
	}

	// eslint-disable-next-line no-unused-vars
	const handleBulkCreate = async () => {
		if (!bulkCsvFile) {
			showToast('Please select a CSV file')
			return
		}

		if (!bulkCsvFile.name.toLowerCase().endsWith('.csv')) {
			showToast('Please select a CSV file')
			return
		}

		if (!window.confirm(`Upload ${bulkCsvFile.name} and create all shipments from it?`)) {
			return
		}

		setBulkProgress('Uploading CSV and creating shipments...')

		try {
			const response = await createShipmentsBulk(bulkCsvFile)
			setBulkProgress(`Completed: ${response.success_count} succeeded, ${response.failed_count} failed`)
			showToast(`Bulk shipment creation completed. Success: ${response.success_count}, Failed: ${response.failed_count}`)
		} catch (error) {
			setBulkProgress(`Bulk upload failed: ${error.message}`)
			showToast(`Bulk upload failed: ${error.message}`)
		}
	}

	return (
		<section className="dashboard-page">
			{toastMessage ? (
				<div className="page-toast" role="status" aria-live="polite">
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm.9 13.5h-1.8v-1.8h1.8Zm0-3.6h-1.8V7.5h1.8Z" />
					</svg>
					<div>
						<strong>Track order</strong>
						<span>{toastMessage}</span>
					</div>
				</div>
			) : null}

			<div className="dashboard-overview">
				<div className="dashboard-hero">
					<div>
						<p className="dashboard-eyebrow">
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5v10A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10A2.5 2.5 0 0 1 5.5 4Zm2 2A1.5 1.5 0 0 0 6 7.5V9h12V7.5A1.5 1.5 0 0 0 16.5 6h-9ZM6 11v5.5A.5.5 0 0 0 6.5 17h11a.5.5 0 0 0 .5-.5V11h-4v1.25a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V11H6Z" />
							</svg>
							Shipment setup
						</p>
						<h2 className="dashboard-title">Track order</h2>
						<p>Create tracking records for prepaid orders and connect AWB details with the courier partner.</p>
					</div>
				</div>
			</div>

			<div className="card table-card console-card">
				<div className="dashboard-table-toolbar">
					<div className="table-head">
						<h3>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M6.5 3.5h11A2.5 2.5 0 0 1 20 6v12a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18V6a2.5 2.5 0 0 1 2.5-2.5Zm2 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2h-7Zm0 3.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-7Zm0 3.5a1 1 0 1 0 0 2h4.5a1 1 0 1 0 0-2H8.5Z" />
							</svg>
							Enter order and AWB
						</h3>
					</div>
				</div>
				<div className="tracking-row">
					<label>
						Order ID
						<input
							type="text"
							value={orderId}
							onChange={(event) => setOrderId(event.target.value)}
							placeholder="e.g. order_abc123"
						/>
					</label>

					<label>
						AWB (optional)
						<input
							type="text"
							value={awbInput}
							onChange={(event) => setAwbInput(event.target.value)}
							placeholder="e.g. 123456789012"
						/>
					</label>

					<label className="tracking-courier-field">
						Courier
						<div className="courier-picker" ref={courierPickerRef}>
							<button
								type="button"
								className="courier-picker-trigger"
								aria-haspopup="listbox"
								aria-expanded={isCourierOpen}
								onClick={() => setIsCourierOpen((open) => !open)}
							>
								<CourierPickerOption label={courier} />
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d="m6 9 6 6 6-6" />
								</svg>
							</button>
							{isCourierOpen ? (
								<div className="courier-picker-menu" role="listbox" aria-label="Courier">
									{onboardedCouriers.map((item) => (
										<button
											type="button"
											role="option"
											aria-selected={item.label === courier}
											className={item.label === courier ? 'is-selected' : ''}
											value={item.label}
											key={item.key}
											onClick={() => {
												setCourier(item.label)
												setIsCourierOpen(false)
											}}
										>
											<CourierPickerOption label={item.label} />
										</button>
									))}
								</div>
							) : null}
						</div>
					</label>

					<div className="tracking-actions-column">
						<button type="button" onClick={() => void handleCreateOrStart()}>
							Start Tracking
						</button>
						<button type="button" className="secondary-btn" onClick={() => void handleLoadOrder()}>
							Load Order Info
						</button>
					</div>
				</div>

				{/* Bulk shipment creation (CSV) — not needed for now, keep the code but don't render it.
				<div className="bulk-wrap">
					<div className="bulk-col">
						<h3>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 3a1 1 0 0 1 1 1v9.09l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 13a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V17a1 1 0 0 1 1-1Z" />
							</svg>
							Bulk shipment creation (CSV)
						</h3>
						<p className="muted-text">Upload CSV with: secureupi_order_id, awb, courier</p>

						<div className="tracking-row">
							<label>
								CSV File
								<input
									type="file"
									accept=".csv,text/csv"
									onChange={(event) => setBulkCsvFile(event.target.files?.[0] || null)}
								/>
							</label>

							<div className="tracking-actions-column end-align">
								<button type="button" onClick={() => void handleBulkCreate()}>
									Create Bulk Shipments
								</button>
							</div>
						</div>

						<div className="muted-text small-text">{bulkProgress}</div>
					</div>
				</div>
				*/}

				{orderDetails ? (
					<div className="tracking-order-details" aria-label="Selected order details">
						<div><span>Order ID</span><strong>{valueOrDash(orderDetails.orderId)}</strong></div>
						<div><span>AWB</span><strong>{valueOrDash(orderDetails.awb)}</strong></div>
						<div><span>Courier</span><strong>{valueOrDash(orderDetails.courier)}</strong></div>
						<div><span>Amount</span><strong>{formatMoney(orderDetails.amount)}</strong></div>
						<div><span>Payment</span><strong>{valueOrDash(orderDetails.paymentStatus)}</strong></div>
						<div><span>Stage</span><strong>{valueOrDash(orderDetails.paymentState)}</strong></div>
						<div><span>Delivery</span><strong>{valueOrDash(orderDetails.deliveryStatus)}</strong></div>
						<div><span>Order date</span><strong>{formatDate(orderDetails.orderDate)}</strong></div>
						<div><span>Customer</span><strong>{valueOrDash(orderDetails.customerName)}</strong></div>
						<div><span>Phone</span><strong>{valueOrDash(orderDetails.customerPhone)}</strong></div>
					</div>
				) : null}
			</div>
		</section>
	)
}

export default TrackOrderControl
