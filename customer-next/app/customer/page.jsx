// Server component: Next renders this page's HTML on the server, so the title
// and description below are in the initial HTML (the Vite version set them
// from useEffect after load).
import CustomerTrust from './CustomerTrust'

const PAGE_TITLE = 'Buyer protection | EscroSafe'
const PAGE_DESCRIPTION =
  'See how EscroSafe protects your payment and keeps you informed from checkout to delivery, with a direct line to the seller if anything goes wrong.'

// The link preview (WhatsApp, Slack, LinkedIn, ...) shows /og-image.png: the full EscroSafe logo on white, 1200 x 630.
const SITE_URL = 'https://escrosafe.com'
const SHARE_IMAGE = { url: '/og-image.png', width: 1200, height: 630, alt: 'EscroSafe' }

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type: 'website',
    siteName: 'EscroSafe',
    url: '/customer',
    images: [SHARE_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: PAGE_TITLE, description: PAGE_DESCRIPTION, images: [SHARE_IMAGE.url] },
}

export default function CustomerPage() {
  return <CustomerTrust />
}
