import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cement Store POS - Family Tree Business Inc',
  description: 'Point of Sale and Inventory Management System for Family Tree Business Inc',
  icons: {
    icon: [
      {
        url: '/family_tree.png',
        sizes: 'any',
      },
    ],
    apple: '/family_tree.png',
    shortcut: '/family_tree.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
