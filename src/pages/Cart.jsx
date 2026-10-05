import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../utils/cart'
import { createMerchantOrderId, readOrderDraft, writeOrderDraft } from '../utils/orderDraft'
import { formatInr, handleImgError } from '../constants/storeProducts'
import StoreStepper from '../components/StoreStepper'

// Cart + delivery details. "Proceed to buy" saves the details and moves on to
// /checkout, where the payment method is chosen and EscroSafe is launched
// (SDK mounting / terms modal live in pages/Checkout.jsx).
function Cart() {
	const navigate = useNavigate()
	const { cartLines, cartTotal, changeQty } = useCart()
	const [createOrderForm, setCreateOrderForm] = useState(() => ({
		merchantOrderId: createMerchantOrderId(),
		customerName: '',
		customerPhone: '',
		customerEmail: '',
		customerAddress: '',
		...(readOrderDraft() || {}),
	}))
	const [message, setMessage] = useState('')

	const handleChange = (field, value) => {
		setCreateOrderForm((currentForm) => ({ ...currentForm, [field]: value }))
	}

	const proceedToBuy = () => {
		if (!cartLines.length) {
			setMessage('Your cart is empty. Add products to create your order.')
			return
		}
		if (!createOrderForm.customerName.trim() || !createOrderForm.customerPhone.trim() || !createOrderForm.customerAddress.trim()) {
			setMessage('Please fill in customer name, phone and address to continue.')
			return
		}
		writeOrderDraft(createOrderForm)
		navigate('/checkout')
	}

	return (
		<section className="dashboard-page create-order-page so-page">
			<div className="so-layout so-single">
				<div className="so-main">
					<div className="so-panel" id="so-checkout">
						<div className="so-head">
							<h2><strong>Shopping Cart</strong></h2>
							<span><Link className="so-link" to="/create-order">Continue shopping</Link></span>
						</div>

						{cartLines.length ? (
							<div className="so-lines">
								{cartLines.map((line) => (
									<div className="so-line" key={line.id}>
										<img src={line.img} alt={line.name} referrerPolicy="no-referrer" onError={handleImgError} />
										<div>
											<strong>{line.brand}</strong>
											<p>{line.name}</p>
											<span className="so-instock">In stock · FREE delivery {line.delivery}</span>
											<div className="so-line-ctl">
												<StoreStepper qty={line.qty} onDec={() => changeQty(line.id, -1)} onInc={() => changeQty(line.id, 1)} small />
											</div>
										</div>
										<div className="so-line-price">
											{formatInr(line.price * line.qty)}
											<span>{line.qty} × {formatInr(line.price)}</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="so-empty-note">Your cart is empty. <Link className="so-link" to="/create-order">Continue shopping</Link></p>
						)}

						<div className="so-checkout-grid">
							<div className="so-box">
								<h3>Order &amp; delivery details</h3>
								<div className="so-fields">
									<label>
										<span>Order ID</span>
										<input
											id="order-id"
											name="order_id"
											type="text"
											value={createOrderForm.merchantOrderId}
											onChange={(event) => handleChange('merchantOrderId', event.target.value)}
											placeholder="SP_1001"
										/>
									</label>
									<label>
										<span>Amount (INR)</span>
										<input
											id="order-total"
											name="amount"
											type="number"
											value={cartTotal ? cartTotal.toFixed(2) : ''}
											readOnly
											placeholder="Add items to cart"
										/>
									</label>
									<label>
										<span>Customer name</span>
										<input
											id="customer-name"
											autoComplete="off"
											name="customer_name"
											type="text"
											value={createOrderForm.customerName}
											onChange={(event) => handleChange('customerName', event.target.value)}
											placeholder="Customer name"
										/>
									</label>
									<label>
										<span>Customer phone</span>
										<input
											id="customer-phone"
											autoComplete="off"
											name="customer_phone"
											type="tel"
											value={createOrderForm.customerPhone}
											onChange={(event) => handleChange('customerPhone', event.target.value)}
											placeholder="9876543210"
										/>
									</label>
									<label>
										<span>Customer email</span>
										<input
											id="customer-email"
											autoComplete="off"
											name="customer_email"
											type="email"
											value={createOrderForm.customerEmail}
											onChange={(event) => handleChange('customerEmail', event.target.value)}
											placeholder="customer@example.com"
										/>
									</label>
									<label>
										<span>Customer address</span>
										<input
											id="shipping-address"
											autoComplete="off"
											name="shipping_address"
											type="text"
											value={createOrderForm.customerAddress}
											onChange={(event) => handleChange('customerAddress', event.target.value)}
											placeholder="Delivery address"
										/>
									</label>
								</div>
							</div>

							<div className="so-box so-summary">
								<h3>Order summary</h3>
								<div className="so-sum-line"><span>Items:</span><span>{formatInr(cartTotal)}</span></div>
								<div className="so-sum-line"><span>Delivery:</span><span className="so-free">FREE</span></div>
								<div className="so-sum-total"><span>Order total:</span><span>{formatInr(cartTotal)}</span></div>
								<button type="button" className="so-btn-add so-btn-proceed" onClick={proceedToBuy}>Proceed to buy</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{message ? (
				<div className="create-order-toast" role="status">
					<div>
						<strong>Before you continue</strong>
						<span>{message}</span>
					</div>
					<button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}>
						&times;
					</button>
				</div>
			) : null}
		</section>
	)
}

export default Cart
