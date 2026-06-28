import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'OilSense', description: 'Manutenção preditiva de transformadores' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>
}