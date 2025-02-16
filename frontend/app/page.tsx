"use client"

import dynamic from "next/dynamic"

const CityMap = dynamic(() => import("@/components/city-map"), {
  ssr: false,
})

export default function Page() {
  return (
    <div className="min-h-screen bg-black">
      <main>
        <CityMap />
      </main>
    </div>
  )
}

