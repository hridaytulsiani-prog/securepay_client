// Shared courier-logo cell, used anywhere a courier name needs to render as
// its brand logo instead of plain text (merchant Dashboard's shipments
// table, ShipmentPdfUploader's PDF validation records table).
import { getCourierLogo, normalizeCourierName } from '../utils/courierLogos'

export function CourierLogoCell({ courier }) {
	const match = getCourierLogo(courier)

	if (!courier || courier === '-') {
		return <span className="courier-logo-empty">-</span>
	}

	if (!match) {
		return <span className="courier-logo-fallback">{courier}</span>
	}

	return (
		<span className={`courier-logo-cell logo-${normalizeCourierName(match.label).replace(/\s+/g, '-')}`} title={match.label}>
			<img src={match.logo} alt={`${match.label} logo`} />
		</span>
	)
}
