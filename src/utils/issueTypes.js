// What a merchant can raise an issue about. Keep the values in sync with MerchantIssue.ISSUE_TYPE_CHOICES in
// SecurePay/adminpanel/models.py (and the list in securepay-admin/src/pages/MerchantIssuesPage.jsx).
export const ISSUE_TYPES = [
	{ value: 'status_mismatch', label: 'Delivered, but a different status is shown', hint: 'The courier delivered the order but EscroSafe shows another status.' },
	{ value: 'payment_delayed', label: 'Delivered, but payment is delayed', hint: 'The order is delivered and the payment has not been released to you yet.' },
	{ value: 'payment_missing', label: 'Payment not received or wrong amount', hint: 'The payment is missing, or the amount is not what you expected.' },
	{ value: 'tracking_stuck', label: 'Tracking is not updating', hint: 'The shipment has shown the same status for too long.' },
	{ value: 'rto_return', label: 'Return or RTO not reflected', hint: 'The parcel came back to you but the order still shows another status.' },
	{ value: 'customer_dispute', label: 'Customer says the order was not delivered', hint: 'Your buyer claims they never received an order shown as delivered.' },
	{ value: 'other', label: 'Something else', hint: 'Anything else about these orders.' },
]

export function getIssueTypeLabel(value) {
	return ISSUE_TYPES.find((type) => type.value === value)?.label || value
}
