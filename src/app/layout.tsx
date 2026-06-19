import './globals.css'
import React from 'react'

export const metadata = {
  title: 'MERCED\u2019S TRADING ROBOT',
  description: 'Progressive Web App trading assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
