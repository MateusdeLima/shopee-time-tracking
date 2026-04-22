import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Shopee Page Control - o controle da shopee external",
  description: "Sistema interno para controle de horas extras e ausências",
  generator: 'v0.dev',
  icons: {
    icon: '/shopee-icon.png',
    shortcut: '/shopee-icon.png',
    apple: '/shopee-icon.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/shopee-icon.png" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}



import './globals.css'