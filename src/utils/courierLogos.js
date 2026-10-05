// Courier name matching/lookup used by CourierLogo.jsx's CourierLogoCell —
// split out from that component so react-refresh's "only export components"
// rule doesn't fire on the .jsx file.
import blueDartLogo from '../assets/couriers/blue-dart-real.png'
import delhiveryLogo from '../assets/couriers/delhivery-real.png'
import dtdcLogo from '../assets/couriers/dtdc-real.png'
import ecomExpressLogo from '../assets/couriers/ecom-express.png'
import ekartLogo from '../assets/couriers/ekart-real.png'
import shadowfaxLogo from '../assets/couriers/shadowfax.svg'
import shiprocketLogo from '../assets/couriers/shiprocket-real.png'
import xpressbeesLogo from '../assets/couriers/xpressbees-real.png'

export const courierLogos = [
	{ keys: ['blue dart', 'bluedart', 'blue_dart'], label: 'Blue Dart', logo: blueDartLogo },
	{ keys: ['delhivery'], label: 'Delhivery', logo: delhiveryLogo },
	{ keys: ['dtdc'], label: 'DTDC', logo: dtdcLogo },
	{ keys: ['ecom express', 'ecomexpress', 'ecom_express'], label: 'Ecom Express', logo: ecomExpressLogo },
	{ keys: ['ekart'], label: 'Ekart', logo: ekartLogo },
	{ keys: ['shadowfax', 'shadow fax'], label: 'Shadowfax', logo: shadowfaxLogo },
	{ keys: ['shiprocket'], label: 'Shiprocket', logo: shiprocketLogo },
	{ keys: ['xpressbees', 'xpress bees', 'xpress_bees'], label: 'Xpressbees', logo: xpressbeesLogo },
]

export function normalizeCourierName(courier) {
	return String(courier || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

export function getCourierLogo(courier) {
	const normalized = normalizeCourierName(courier)

	return courierLogos.find((item) => item.keys.some((key) => normalizeCourierName(key) === normalized))
}
