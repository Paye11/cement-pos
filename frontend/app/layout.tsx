import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cement Store POS - Family Tree Business Inc',
  description: 'Point of Sale and Inventory Management System for Family Tree Business Inc',
  themeColor: '#1e40af',
  applicationName: 'Family Tree Business Inc POS',
  appleWebApp: {
    capable: true,
    title: 'FTB POS',
    statusBarStyle: 'default',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      {
        url: '/family_tree.png',
        sizes: '512x512',
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
