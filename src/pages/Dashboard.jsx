// Merchant's own shipments/orders dashboard — the counterpart to
// securepay-admin's OrdersPage, but scoped to the logged-in merchant only
// (backed by payments.api.v1.generate_order.ShipmentListView).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE_URL, buildAuthHeaders } from '../api/client'
import { refreshAuthSessionCookie } from '../utils/storage'
import { CourierLogoCell } from '../components/CourierLogo'
import { normalizeCourierName } from '../utils/courierLogos'

// Arrays (rather than a single hardcoded path) so loadShipments/trackShipment
// can try each candidate in turn — a defensive pattern from when the backend
// route was still being finalized. Only one entry each today.
const SHIPMENT_LIST_PATHS = [
	'/payments/v1/shipments/'
]

const DASHBOARD_FETCH_LIMIT = 500
const TRACKING_CACHE_TTL_MS = 60 * 60 * 1000
const SAVED_TRACKING_PATH = '/payments/v1/shipments/'

function formatMoney(value) {
	const parsed = Number(value)
	if (Number.isNaN(parsed)) {
		return ''
	}

	return `₹ ${parsed.toLocaleString('en-IN', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`
}

function getStatusClass(paymentStatus) {
	const normalized = String(paymentStatus || '').toUpperCase()

	if (['PAID', 'SUCCESS', 'COMPLETED', 'SUCCESSFUL'].includes(normalized)) {
		return 'status-badge status-paid'
	}

	if (['PENDING', 'INITIATED', 'PROCESSING', 'IN_PROGRESS'].includes(normalized)) {
		return 'status-badge status-pending'
	}

	return 'status-badge status-failed'
}

function formatStatusText(status) {
	const value = String(status || '').trim()
	if (!value) {
		return '-'
	}

	return value
		.replace(/[_-]+/g, ' ')
		.toLowerCase()
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatOrderDate(value) {
	if (!value) {
		return '-'
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return String(value)
	}

	return parsed.toLocaleString('en-IN', {
		dateStyle: 'medium',
		timeStyle: 'short',
	})
}

function formatChipText(status) {
	return formatStatusText(status).toUpperCase()
}

function getDeliveryStatusClass(status) {
	const normalized = String(status || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_')

	if (!normalized) {
		return 'status-badge status-neutral'
	}

	if (normalized.includes('DELIVERED')) {
		return 'status-badge status-paid'
	}

	if (normalized.includes('RETURN') || normalized.includes('CANCEL') || normalized.includes('FAILED')) {
		return 'status-badge status-failed'
	}

	if (
		normalized.includes('TRANSIT') ||
		normalized.includes('SHIPPED') ||
		normalized.includes('PICKED') ||
		normalized.includes('DISPATCH') ||
		normalized.includes('OUT_FOR_DELIVERY')
	) {
		return 'status-badge status-shipping'
	}

	return 'status-badge status-pending'
}

function getDateOnly(value) {
	if (!value) {
		return ''
	}

	const text = String(value)
	if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
		return text.slice(0, 10)
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return ''
	}

	return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function matchesDeliveryStatus(status, selectedStatus) {
	if (!selectedStatus) {
		return true
	}

	const normalized = String(status || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_')
	if (selectedStatus === 'RTO') {
		return normalized.includes('RTO') || normalized.includes('RETURN')
	}

	return normalized === selectedStatus || normalized.includes(selectedStatus)
}

function getTrackingCacheKey(awb) {
	return `securepay.dashboard.savedTracking.${encodeURIComponent(String(awb))}`
}

function readTrackingCache(awb) {
	try {
		const cached = JSON.parse(window.localStorage.getItem(getTrackingCacheKey(awb)) || 'null')
		if (!cached?.fetchedAt || Date.now() - cached.fetchedAt >= TRACKING_CACHE_TTL_MS) {
			window.localStorage.removeItem(getTrackingCacheKey(awb))
			return null
		}

		return cached.data || null
	} catch {
		return null
	}
}

function writeTrackingCache(awb, data) {
	try {
		window.localStorage.setItem(
			getTrackingCacheKey(awb),
			JSON.stringify({ fetchedAt: Date.now(), data }),
		)
	} catch {
		// Tracking still works when browser storage is unavailable.
	}
}

// Backend responses vary in shape depending on which endpoint answered
// (flat ShipmentListView rows vs. a nested {order, shipment} shape) — this
// normalizes both into one consistent row shape for the table below.
function normalizeShipment(record) {
	const awb = record.awb || record.shipment_id__awb || record.awb_number || record.id || ''
	const orderId = record.secureupi_order_id || record.pa_order_id || record.order_id || record.merchant_order_id || ''
	const courier = record.courier || record.shipment_id__courier || ''
	const deliveryStatus =
		record.normalized_status ||
		record.current_status ||
		record.delivery_status ||
		record.shipment_id__status ||
		record.status ||
		''
	const paymentProvider = record.payment_provider || record.order?.payment_provider || '-'
	const phonepeOrderId = record.phonepe_order_id || record.order?.phonepe_order_id || record.pa_order_id || ''
	const phonepePaymentId =
		record.phonepe_payment_id ||
		record.order?.phonepe_payment_id ||
		record.pa_payment_id ||
		record.payment_id ||
		''
	const paymentStatus = record.order_status || record.payment_status || record.order?.order_status || ''
	const paymentState = record.payment_state || record.order?.payment_state || ''
	const amount = record.order_amount || record.amount || record.order?.order_amount || ''
	const orderDate =
		record.order_date ||
		record.created_at ||
		record.createdAt ||
		record.order?.order_date ||
		record.order?.created_at ||
		''
	const customerName =
		record.customer?.name ||
		record.customer_info__customer_name ||
		record.customer_name ||
		record.order?.customer_name ||
		''
	const customerPhone =
		record.customer?.phone ||
		record.customer_info__customer_phone ||
		record.customer_phone ||
		record.order?.customer_phone ||
		''
	const history = record.history || record.shipment_history || []
	const histText = Array.isArray(history)
		? history
				.slice(-5)
				.map((item) => `${item.ts || item.time || ''} ${item.status || ''}${item.note ? ` : ${item.note}` : ''}`)
				.join('\n')
		: ''

	return {
		awb,
		orderId,
		paymentProvider,
		phonepeOrderId,
		phonepePaymentId,
		paymentStatus,
		paymentState,
		amount,
		orderDate,
		courier,
		deliveryStatus,
		customerName,
		customerPhone,
		histText,
	}
}

function Dashboard() {
	const [shipments, setShipments] = useState([])
	const [query, setQuery] = useState('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')
	const [courierFilter, setCourierFilter] = useState('')
	const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('')
	const [pageSize, setPageSize] = useState('25')
	const [currentPage, setCurrentPage] = useState(1)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [trackingAwb, setTrackingAwb] = useState('')
	const trackingCacheRef = useRef(new Map())
	const trackingRequestsRef = useRef(new Map())

	const fetchJson = useCallback(async (pathWithQuery) => {
		const response = await fetch(`${API_BASE_URL}${pathWithQuery}`, {
			method: 'GET',
			headers: buildAuthHeaders(),
			credentials: 'same-origin',
		})

		if (response.ok) {
			refreshAuthSessionCookie()
			return { ok: true, data: await response.json() }
		}

		const text = await response.text().catch(() => '')
		return {
			ok: false,
			status: response.status,
			text,
		}
	}, [])

	const loadShipments = useCallback(async () => {
		setIsLoading(true)
		setError('')

		const params = new URLSearchParams({ limit: String(DASHBOARD_FETCH_LIMIT) })
		if (query.trim()) {
			params.set('q', query.trim())
		}

		const queryString = params.toString()

		for (const path of SHIPMENT_LIST_PATHS) {
			const candidate = `${path}${queryString ? `?${queryString}` : ''}`

			try {
				const result = await fetchJson(candidate)
				if (result.ok) {
					const payload = result.data
					const rows = Array.isArray(payload) ? payload : payload.results || payload.shipments || []
					setShipments(rows)
					setIsLoading(false)
					return
				}

			} catch (requestError) {
				setError(requestError.message || 'Request failed while fetching shipments.')
			}
		}

		setShipments([])
		setError('No shipments endpoint found / error')
		setIsLoading(false)
	}, [fetchJson, query])

	const trackShipment = useCallback(
		async (awb, rowIndex) => {
			if (!awb) {
				return
			}

			const cacheKey = String(awb)
			const inMemoryCache = trackingCacheRef.current.get(cacheKey)
			const cachedData =
				inMemoryCache && Date.now() - inMemoryCache.fetchedAt < TRACKING_CACHE_TTL_MS
					? inMemoryCache.data
					: readTrackingCache(awb)
			if (cachedData) {
				trackingCacheRef.current.set(cacheKey, { fetchedAt: Date.now(), data: cachedData })
				setShipments((currentRows) =>
					currentRows.map((row, index) => (index === rowIndex ? { ...row, ...cachedData } : row)),
				)
				setError('')
				return
			}

			if (trackingRequestsRef.current.has(cacheKey)) {
				return
			}

			setTrackingAwb(awb)
			trackingRequestsRef.current.set(cacheKey, true)

			try {
				const encodedAwb = encodeURIComponent(awb)
				const result = await fetchJson(`${SAVED_TRACKING_PATH}${encodedAwb}/tracking/`)
				if (result.ok) {
					const fetchedAt = Date.now()
					trackingCacheRef.current.set(cacheKey, { fetchedAt, data: result.data })
					writeTrackingCache(awb, result.data)
					setShipments((currentRows) =>
						currentRows.map((row, index) => (index === rowIndex ? { ...row, ...result.data } : row)),
					)
					setTrackingAwb('')
					return
				}
			} finally {
				trackingRequestsRef.current.delete(cacheKey)
			}

			setError(`Track failed for ${awb}.`)
			setTrackingAwb('')
		},
		[fetchJson],
	)

	useEffect(() => {
		const timerId = window.setTimeout(() => {
			void loadShipments()
		}, 0)

		return () => {
			window.clearTimeout(timerId)
		}
	}, [loadShipments])

	const normalizedRows = useMemo(() => shipments.map((item) => normalizeShipment(item)), [shipments])
	const filteredRows = useMemo(() => {
		const selectedCourier = normalizeCourierName(courierFilter)

		return normalizedRows
			.map((shipment, sourceIndex) => ({ ...shipment, sourceIndex }))
			.filter((shipment) => {
				const shipmentDate = getDateOnly(shipment.orderDate)
				const inDateRange =
					(!dateFrom || (shipmentDate && shipmentDate >= dateFrom)) &&
					(!dateTo || (shipmentDate && shipmentDate <= dateTo))
				const hasCourier = !selectedCourier || normalizeCourierName(shipment.courier) === selectedCourier

				return inDateRange && hasCourier && matchesDeliveryStatus(shipment.deliveryStatus, deliveryStatusFilter)
			})
	}, [courierFilter, dateFrom, dateTo, deliveryStatusFilter, normalizedRows])
	const totalPages = Math.max(1, Math.ceil(filteredRows.length / Number(pageSize)))
	const visibleRows = useMemo(() => {
		const rowsPerPage = Number(pageSize)
		const startIndex = (currentPage - 1) * rowsPerPage
		return filteredRows.slice(startIndex, startIndex + rowsPerPage).map((shipment, index) => ({
			...shipment,
			absoluteIndex: shipment.sourceIndex ?? startIndex + index,
		}))
	}, [currentPage, filteredRows, pageSize])
	const pageNumbers = useMemo(() => {
		return Array.from({ length: totalPages }, (_, index) => index + 1)
	}, [totalPages])
	const dashboardStats = useMemo(() => {
		return filteredRows.reduce(
			(summary, shipment) => {
				const paymentStatus = String(shipment.paymentStatus || '').toUpperCase()
				const deliveryStatus = String(shipment.deliveryStatus || '').toUpperCase()
				const amount = Number(shipment.amount)

				if (['PAID', 'SUCCESS', 'COMPLETED', 'SUCCESSFUL'].includes(paymentStatus)) {
					summary.prepaidOrders += 1
				}

				if (['PENDING', 'INITIATED', 'PROCESSING', 'IN_PROGRESS'].includes(paymentStatus)) {
					summary.pendingOrders += 1
				}

				if (deliveryStatus && !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(deliveryStatus)) {
					summary.activeShipments += 1
				}

				if (!Number.isNaN(amount)) {
					summary.totalValue += amount
				}

				return summary
			},
			{ prepaidOrders: 0, pendingOrders: 0, activeShipments: 0, totalValue: 0 },
		)
	}, [filteredRows])

	useEffect(() => {
		setCurrentPage(1)
	}, [courierFilter, dateFrom, dateTo, deliveryStatusFilter, pageSize, query])

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages)
		}
	}, [currentPage, totalPages])

	return (
		<section className="dashboard-page">
			<div className="dashboard-overview">
				<div className="dashboard-hero">
					<div>
						<p className="dashboard-eyebrow">
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5v10A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10A2.5 2.5 0 0 1 5.5 4Zm2 2A1.5 1.5 0 0 0 6 7.5V9h12V7.5A1.5 1.5 0 0 0 16.5 6h-9ZM6 11v5.5A.5.5 0 0 0 6.5 17h11a.5.5 0 0 0 .5-.5V11h-4v1.25a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V11H6Z" />
							</svg>
							Merchant workspace
						</p>
						<h2 className="dashboard-title">Prepaid order overview</h2>
						<p>Monitor prepaid orders, payment value, and delivery progress in one merchant-friendly workspace.</p>
					</div>
				</div>

				<div className="dashboard-stat-grid">
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M7 3.5h10A2.5 2.5 0 0 1 19.5 6v12a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Zm1.25 4.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Zm0 3.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Zm0 3.5a.75.75 0 0 0 0 1.5h4.75a.75.75 0 0 0 0-1.5H8.25Z" />
							</svg>
							Total orders
						</span>
						<strong>{filteredRows.length}</strong>
					</div>
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4.56 6.44-5.25 5.25a1 1 0 0 1-1.42 0l-2.45-2.45a1 1 0 1 1 1.42-1.42l1.74 1.75 4.54-4.55a1 1 0 1 1 1.42 1.42Z" />
							</svg>
							Paid orders
						</span>
						<strong>{dashboardStats.prepaidOrders}</strong>
					</div>
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 3a9 9 0 1 0 9 9 9.01 9.01 0 0 0-9-9Zm.85 9.15 2.86 1.71a.9.9 0 0 1-.92 1.54l-3.3-1.98a.9.9 0 0 1-.44-.77V7.8a.9.9 0 0 1 1.8 0v4.35Z" />
							</svg>
							Payments pending
						</span>
						<strong>{dashboardStats.pendingOrders}</strong>
					</div>
					<div className="dashboard-stat-card">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M7.5 4.5h9a1 1 0 0 1 0 2h-2.12c.42.45.73.99.89 1.6h1.23a1 1 0 1 1 0 2h-1.23c-.41 1.58-1.76 2.76-3.71 3.05l4.11 4.74a1 1 0 0 1-1.51 1.31l-5.5-6.35A1 1 0 0 1 9.42 11h1.58c1.05 0 1.87-.34 2.22-.9H7.5a1 1 0 1 1 0-2h5.72c-.35-.56-1.17-.9-2.22-.9H7.5a1 1 0 0 1 0-2Z" />
							</svg>
							Payment value
						</span>
						<strong>{formatMoney(dashboardStats.totalValue) || '₹ 0.00'}</strong>
					</div>
				</div>
			</div>

			<div className="card table-card">
				<div className="dashboard-table-toolbar">
					<div className="table-head">
						<h3>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M6.5 3.5h11A2.5 2.5 0 0 1 20 6v12a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18V6a2.5 2.5 0 0 1 2.5-2.5Zm2 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2h-7Zm0 3.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-7Zm0 3.5a1 1 0 1 0 0 2h4.5a1 1 0 1 0 0-2H8.5Z" />
							</svg>
							Order details
						</h3>
					</div>

					<div className="dashboard-controls merchant-order-controls">
						<label className="dashboard-search">
							<span>Search payments</span>
							<div className="dashboard-search-box">
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<circle cx="11" cy="11" r="7" />
									<path d="m16 16 4 4" />
								</svg>
								<input
									type="text"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									onKeyUp={(event) => {
										if (event.key === 'Enter') {
											void loadShipments()
										}
									}}
									placeholder="order id, awb, customer, courier"
								/>
							</div>
						</label>

						<label>
							<span>From date</span>
							<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
						</label>

						<label>
							<span>To date</span>
							<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
						</label>

						<label>
							<span>Courier</span>
							<select value={courierFilter} onChange={(event) => setCourierFilter(event.target.value)}>
								<option value="">All couriers</option>
								<option value="Blue Dart">Blue Dart</option>
								<option value="Delhivery">Delhivery</option>
								<option value="DTDC">DTDC</option>
								<option value="Ecom Express">Ecom Express</option>
								<option value="Ekart">Ekart</option>
								<option value="Shadowfax">Shadowfax</option>
								<option value="Shiprocket">Shiprocket</option>
								<option value="Xpressbees">Xpressbees</option>
							</select>
						</label>

						<label>
							<span>Delivery status</span>
							<select value={deliveryStatusFilter} onChange={(event) => setDeliveryStatusFilter(event.target.value)}>
								<option value="">All statuses</option>
								<option value="CREATED">Created</option>
								<option value="IN_TRANSIT">In transit</option>
								<option value="OUT_FOR_DELIVERY">Out for delivery</option>
								<option value="DELIVERED">Delivered</option>
								<option value="RTO">RTO / Returned</option>
								<option value="CANCELLED">Cancelled</option>
							</select>
						</label>

						<label>
							<span>Rows</span>
							<select value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
						</label>

						<button type="button" className="dashboard-refresh-btn" onClick={() => void loadShipments()} disabled={isLoading}>
							{isLoading ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>
				</div>

				{error ? <p className="message error">{error}</p> : null}

				<div className="shipments-scroll">
						<table className="shipments-table merchant-orders-table" aria-label="Shipments table">
						<thead>
							<tr>
								<th>AWB</th>
								<th>Order ID</th>
								<th>Order date</th>
								<th>Payment Result</th>
								<th>Current Stage</th>
								<th>Amount</th>
								<th>Courier</th>
								<th>Delivery Status</th>
								<th>Customer</th>
								<th>Track</th>
							</tr>
						</thead>
						<tbody>
							{filteredRows.length === 0 && !isLoading ? (
								<tr>
									<td colSpan="10" className="empty-cell">
										No payment orders found
									</td>
								</tr>
							) : null}

							{visibleRows.map((shipment) => (
								<tr key={`${shipment.awb || 'row'}-${shipment.absoluteIndex}`}>
									<td className="mono-text">{shipment.awb || '-'}</td>
									<td className="mono-text">{shipment.orderId || '-'}</td>
									<td className="order-date-cell">{formatOrderDate(shipment.orderDate)}</td>
									<td>
										<span className={getStatusClass(shipment.paymentStatus)}>
											{String(shipment.paymentStatus || '-').toUpperCase()}
										</span>
									</td>
									<td>
										<span className="status-badge status-pending">
											{formatChipText(shipment.paymentState)}
										</span>
									</td>
									<td className="amount-cell">{shipment.amount !== '' ? formatMoney(shipment.amount) : '-'}</td>
									<td>
										<CourierLogoCell courier={shipment.courier} />
									</td>
									<td>
										<span className={getDeliveryStatusClass(shipment.deliveryStatus)}>
											{formatChipText(shipment.deliveryStatus)}
										</span>
									</td>
									<td>
										{shipment.customerName || '-'}
										<br />
										<span className="muted-text small-text">{shipment.customerPhone || ''}</span>
									</td>
									<td>
										{shipment.awb ? (
											<button
												type="button"
												onClick={() => void trackShipment(shipment.awb, shipment.absoluteIndex)}
												disabled={trackingAwb === shipment.awb}
											>
												{trackingAwb === shipment.awb ? 'Checking...' : 'Track'}
											</button>
										) : (
											'-'
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="shipments-pager">
					<span className="muted-text small-text">
						Showing {visibleRows.length} of {filteredRows.length} payment orders.
					</span>
					<div className="pagination-controls" aria-label="Payment order pagination">
						<button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
							Previous
						</button>
						{pageNumbers.map((pageNumber) => (
							<button
								type="button"
								className={pageNumber === currentPage ? 'is-active' : ''}
								onClick={() => setCurrentPage(pageNumber)}
								key={pageNumber}
							>
								{pageNumber}
							</button>
						))}
						<button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
							Next
						</button>
					</div>
				</div>
			</div>

		</section>
	)
}

export default Dashboard

