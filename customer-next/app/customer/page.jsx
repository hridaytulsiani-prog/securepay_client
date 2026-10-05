// Server component: Next renders this page's HTML on the server, so the title
// and description below are in the initial HTML (the Vite version set them
// from useEffect after load).
import CustomerTrust from './CustomerTrust'

const PAGE_TITLE = 'Buyer protection | EscroSafe'
const PAGE_DESCRIPTION =
  'See how EscroSafe protects your payment and keeps you informed from checkout to delivery, with a direct line to the seller if anything goes wrong.'

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, type: 'website' },
}

export default function CustomerPage() {
  return <CustomerTrust />
}
