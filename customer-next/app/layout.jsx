import './index.css'
import './App.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/short-logo-new.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
