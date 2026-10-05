import { Navigate, useSearchParams } from 'react-router-dom'
import CheckoutConfirm from './CheckoutConfirm'
import Checkout from './Checkout'
import { isAuthenticated } from '../utils/storage'

// /checkout serves two pages: the EscroSafe hosted confirmation (opened by the
// SDK with ?session_id=...) and the merchant's order checkout (payment method
// selection, reached from /cart).
function CheckoutRoute() {
	const [searchParams] = useSearchParams()

	if (searchParams.get('session_id')) {
		return <CheckoutConfirm />
	}

	return isAuthenticated() ? <Checkout /> : <Navigate to="/login" replace />
}

export default CheckoutRoute
