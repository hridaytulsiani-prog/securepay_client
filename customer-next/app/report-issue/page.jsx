// Server component: a separate page (/report-issue) where a customer reports a problem with an order, for example
// "marked delivered but not received". It posts to the backend, which creates a ticket that the EscroSafe team sees
// under "Customer issues" in the admin app. Not linked from the main customer page yet; open it by its address.
import ReportIssueForm from './ReportIssueForm'
import './report-issue.css'

export const metadata = {
  title: 'Report a problem with your order | EscroSafe',
  description: 'Tell EscroSafe what went wrong with your order and our team will look into it.',
  robots: { index: false },
}

export default function ReportIssuePage() {
  return (
    <main className="ri-page">
      <header className="ri-head">
        <img src="/short-logo-new.png" alt="EscroSafe" />
        <span>EscroSafe</span>
      </header>
      <ReportIssueForm />
    </main>
  )
}
