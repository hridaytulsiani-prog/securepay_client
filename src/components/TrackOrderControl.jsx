// Merchant UI for creating shipments (single or bulk-CSV) and looking up an
// order's status. NOTE: "Load Order Info" (handleLoadOrder/refreshOrder)
// calls fetchOrder(), which hits /v1/orders/<id> — a route that doesn't
// exist on the backend (see the NOTE in api/tracking.js) — so that lookup
// will always fail as written; shipment creation itself is unaffected.
import { useCallback, useEffect, useState } from 'react'
import { createShipment, createShipmentsBulk, fetchOrder } from '../api/tracking'
import { getCourierPreferences } from '../api/merchant'
import { COURIERS } from '../constants/couriers'

function TrackOrderControl() {
	const [onboardedCouriers, setOnboardedCouriers] = useState(COURIERS)
	const [toastMessage, setToastMessage] = useState('')
	const [orderId, setOrderId] = useState(() => {
		try {
			const cached = localStorage.getItem('last_payment') || localStorage.getItem('CURRENT_ORDER')
			if (!cached) {
				return ''
			}

			const parsed = JSON.parse(cached)
			return parsed.secureupi_order_id || ''
		} catch {
			return ''
		}
	})
	const [awbInput, setAwbInput] = useState('')
	const [courier, setCourier] = useState('Delhivery')
	const [orderSummary, setOrderSummary] = useState('')
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

	const refreshOrder = useCallback(
		async (targetOrderId) => {
			if (!targetOrderId) {
				return
			}

			try {
				const response = await fetchOrder(targetOrderId)
				setOrderSummary(
					`Order ${response.secureupi_order_id || targetOrderId} - Amount: ${response.amount || '-'} - Status: ${response.status || '-'}`,
				)
			} catch (error) {
				showToast(`Order fetch failed: ${error.message}`)
				setOrderSummary('')
			}
		},
		[showToast],
	)

	useEffect(() => {
		try {
			const cached = localStorage.getItem('last_payment') || localStorage.getItem('CURRENT_ORDER')
			if (!cached) {
				return
			}

			const parsed = JSON.parse(cached)
			const cachedOrderId = parsed.secureupi_order_id || orderId
			if (cachedOrderId) {
				// Hydrate initial order summary from cached context on mount.
				// eslint-disable-next-line react-hooks/set-state-in-effect
				void refreshOrder(cachedOrderId)
			}
		} catch {
			// Ignore invalid local cache.
		}
	}, [orderId, refreshOrder])

	const handleCreateOrStart = async () => {
		const normalizedOrderId = orderId.trim()
		if (!normalizedOrderId) {
			showToast('Enter SecureUPI order id')
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

			await refreshOrder(normalizedOrderId)
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

		await refreshOrder(normalizedOrderId)
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
						SecureUPI Order ID
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
							placeholder="leave blank to auto-generate"
						/>
					</label>

					<label className="tracking-courier-field">
						Courier
						<select value={courier} onChange={(event) => setCourier(event.target.value)}>
							{onboardedCouriers.map((item) => (
								<option value={item.label} key={item.key}>
									{item.label}
								</option>
							))}
						</select>
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

				{orderSummary ? <p className="muted-text small-text tracking-summary">{orderSummary}</p> : null}
			</div>
		</section>
	)
}

export default TrackOrderControl
