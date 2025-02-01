// src/app/page.tsx
'use client'
import Header from '@/components/layout/Header'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import Pricing from '@/components/sections/Pricing'
import Integration from '@/components/sections/Integration'
import Footer from '@/components/layout/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Integration />
      </main>
      <Footer />
    </div>
  )
}