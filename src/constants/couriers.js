export const COURIERS = [
	{ key: 'blue_dart', label: 'Blue Dart' },
	{ key: 'delhivery', label: 'Delhivery' },
	{ key: 'dtdc', label: 'DTDC' },
	{ key: 'ekart', label: 'Ekart' },
	{ key: 'shadowfax', label: 'Shadowfax' },
	{ key: 'shiprocket', label: 'Shiprocket' },
	{ key: 'xpressbees', label: 'Xpressbees' },
]

export const BLUE_DART_PLANS = [
	{ key: 'basic', label: 'Starter', description: 'Entry plan. OTP delivery verification is not enabled.', supported: false },
	{ key: 'otp_enabled', label: 'Advanced', description: 'Includes OTP-based delivery verification for EscroSafe checks.', supported: true },
	{ key: 'otp_enabled_plus', label: 'Pro', description: 'Includes OTP verification with enhanced tracking support.', supported: true },
]
