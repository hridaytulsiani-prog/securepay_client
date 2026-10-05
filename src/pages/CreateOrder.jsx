import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { STORE_PRODUCTS, formatInr, renderStars, handleImgError } from '../constants/storeProducts'
import { useCart } from '../utils/cart'
import { clearOrderDraft } from '../utils/orderDraft'
import StoreStepper from '../components/StoreStepper'

function CreateOrder() {
	const { cartLines, cartCount, cartTotal, qtyOf, changeQty } = useCart()

	// Browsing the shop starts a new order, so earlier customer details are dropped.
	useEffect(() => {
		clearOrderDraft()
	}, [])

	return (
		<section className="dashboard-page create-order-page so-page">
			<div className="so-layout">
				<div className="so-main">
					<div className="so-panel">
						<div className="so-head">
							<h2>Create your order</h2>
							<span>{STORE_PRODUCTS.length} products available</span>
						</div>

						<div className="so-grid">
							{STORE_PRODUCTS.map((product) => {
								const qty = qtyOf(product.id)
								const off = Math.round((1 - product.price / product.mrp) * 100)
								return (
									<article className="so-card" key={product.id}>
										<div className="so-imgbox">
											<img src={product.img} alt={product.name} loading="lazy" referrerPolicy="no-referrer" onError={handleImgError} />
										</div>
										<strong className="so-brand">{product.brand}</strong>
										<p className="so-title">{product.name}</p>
										<div className="so-rate">
											<span className="so-stars">{renderStars(product.rating)}</span>
											<span>{product.reviews}</span>
										</div>
										<span className="so-bought">{product.bought}</span>
										<div className="so-price-row">
											<span className="so-disc">-{off}%</span>
											<span className="so-price">₹{product.price.toLocaleString('en-IN')}</span>
										</div>
										<span className="so-mrp">M.R.P.: <s>{formatInr(product.mrp)}</s></span>
										<span className="so-deliv">FREE delivery <strong>{product.delivery}</strong></span>
										<div className="so-add-area">
											{qty ? (
												<StoreStepper qty={qty} onDec={() => changeQty(product.id, -1)} onInc={() => changeQty(product.id, 1)} />
											) : (
												<button type="button" className="so-btn-add" onClick={() => changeQty(product.id, 1)}>Add to Cart</button>
											)}
										</div>
									</article>
								)
							})}
						</div>
					</div>
				</div>

				<aside className="so-side">
					<span className="so-side-label">Subtotal</span>
					<strong className="so-side-amt">{formatInr(cartTotal)}</strong>
					{cartLines.length ? (
						<p className="so-side-free">Your order is eligible for FREE Delivery. Select this option at checkout.</p>
					) : null}
					{cartCount > 0 ? (
						<Link className="so-btn-line" to="/cart">
							Go to Cart
							<span className="so-badge" aria-label={`${cartCount} items in cart`}>{cartCount}</span>
						</Link>
					) : (
						<button type="button" className="so-btn-line" disabled>Go to Cart</button>
					)}
				</aside>
			</div>

			{/* ORIGINAL CREATE-ORDER FORM: kept for future use. EscroSafe SDK reads these same input ids/data-attrs; the live copy now lives in pages/Cart.jsx (route /cart).
			<div className="section-head create-order-heading">
				<div>
					<h2 className="dashboard-title">Create Order</h2>
				<p>Create a payment order and launch the EscroSafe checkout flow.</p>
				</div>
			</div>

			<div className="card table-card create-order-card">
				<form className="create-order-form" onSubmit={(event) => event.preventDefault()}>
						<label>
							<span>Order ID</span>
						<input
							id="order-id"
							name="order_id"
							data-order-id
							type="text"
							value={createOrderForm.merchantOrderId}
							onChange={(event) => handleCreateOrderChange('merchantOrderId', event.target.value)}
							placeholder="SP_1001"
						/>
					</label>

					<label>
							<span>Amount (INR)</span>
						<input
							id="order-total"
							name="amount"
							data-order-amount
							type="number"
							min="1"
							step="0.01"
							value={createOrderForm.amount}
							onChange={(event) => handleCreateOrderChange('amount', event.target.value)}
							placeholder="1299"
						/>
					</label>

					<label>
							<span>Customer name</span>
						<input
							id="customer-name"
							name="customer_name"
							type="text"
							value={createOrderForm.customerName}
							onChange={(event) => handleCreateOrderChange('customerName', event.target.value)}
							placeholder="Customer name"
						/>
					</label>

					<label>
							<span>Customer phone</span>
						<input
							id="customer-phone"
							name="customer_phone"
							type="tel"
							value={createOrderForm.customerPhone}
							onChange={(event) => handleCreateOrderChange('customerPhone', event.target.value)}
							placeholder="9876543210"
						/>
					</label>

					<label>
							<span>Customer email</span>
						<input
							id="customer-email"
							name="customer_email"
							type="email"
							value={createOrderForm.customerEmail}
							onChange={(event) => handleCreateOrderChange('customerEmail', event.target.value)}
							placeholder="customer@example.com"
						/>
					</label>

					<label>
							<span>Customer address</span>
						<input
							id="shipping-address"
							name="shipping_address"
							type="text"
							value={createOrderForm.customerAddress}
							onChange={(event) => handleCreateOrderChange('customerAddress', event.target.value)}
							placeholder="Delivery address"
						/>
					</label>

					<div className="tracking-actions-column end-align">
						<div className="create-order-payment-options" aria-label="Payment options">
									<button type="button" className="create-order-payment-option" onClick={() => showFallbackMessage('Card payment')}>
										Pay using Card
									</button>
							{merchantKey ? (
								<div key={buttonMountKey} ref={buttonHostRef} className="create-order-securepay-button" />
							) : (
								<p className="message error">Merchant key missing. Log out and log in again, then copy/test the EscroSafe button.</p>
							)}
										<button type="button" className="create-order-payment-option" onClick={() => showFallbackMessage('Net banking')}>
											Pay using Net Banking
										</button>
								</div>
								<button type="button" className="create-order-session-stop" onClick={stopCurrentSessionForTesting}>
									Stop current session (testing)
								</button>
							</div>
				</form>

				{createOrderMessage ? (
					<div className="create-order-toast" role="status">
						<div>
							<strong>Payment method note</strong>
							<span>{createOrderMessage}</span>
						</div>
						<button type="button" aria-label="Dismiss payment method note" onClick={() => setCreateOrderMessage('')}>
							&times;
						</button>
					</div>
				) : null}
			</div>
			*/}
		</section>
	)
}

export default CreateOrder
