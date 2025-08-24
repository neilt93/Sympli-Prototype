import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
  colorScheme: 'light dark',
}

export const metadata: Metadata = {
  title: 'Sympli - AI Health Companion',
  description: 'Voice-first AI health companion that helps you log symptoms, track patterns, and generate reports for your GP.',
  keywords: ['health', 'AI', 'voice', 'symptoms', 'medical', 'PWA'],
  authors: [{ name: 'Sympli Team' }],
  creator: 'Sympli',
  publisher: 'Sympli',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://sympli-health.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Sympli - AI Health Companion',
    description: 'Voice-first AI health companion that helps you log symptoms, track patterns, and generate reports for your GP.',
    url: 'https://sympli-health.com',
    siteName: 'Sympli Health',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sympli - AI Health Companion',
    description: 'Voice-first AI health companion that helps you log symptoms, track patterns, and generate reports for your GP.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sympli',
  },
  applicationName: 'Sympli',
  referrer: 'origin-when-cross-origin',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/logo.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Sympli" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sympli" />
        <meta name="description" content="Voice-first AI health companion" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#0ea5e9" />
        
        <link rel="apple-touch-icon" href="/logo.svg" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/logo.svg" color="#10B981" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
