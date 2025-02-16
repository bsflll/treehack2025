"use client"

import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useEffect, useRef, useState } from "react"

import { ComplaintSidebar } from "./complaint-sidebar"

// Move the type definition to the top and export it
export type Complaint = {
  issue_type: string
  location: string
  description: string
  source: string
  source_links: string[]
  date: string
  category: string
  coordinates: [number, number] // [latitude, longitude]
}
// Update TYPE_COLORS to use lighter greens
const TYPE_COLORS = {
  "Street Sanitation": "#2E7D32",     // Lighter green
  "Illegal Dumping": "#43A047",       // Light green
  "Air Quality": "#4CAF50",           // Medium green
  "Trash Accumulation": "#66BB6A",    // Lighter green
  "Infrastructure Costs": "#81C784",   // Very light green
  "Human/Animal Feces": "#A5D6A7",    // Pale green
  "Commercial Blight": "#C8E6C9",     // Very pale green
  "Air Pollution": "#E8F5E9",         // Almost white green
  "Encampment Waste": "#43A047",      // Light green
  Other: "#66BB6A",                   // Lighter green
}

export default function CityMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [tempMarker, setTempMarker] = useState<mapboxgl.Marker | null>(null)

  // Fetch complaints data
  const fetchComplaints = async () => {
    try {
      const response = await fetch('/api/complaints')
      const data = await response.json()
      setComplaints(data.complaints)
    } catch (error) {
      console.error('Failed to fetch complaints:', error)
    }
  }

  // Initialize map and fetch initial data
  useEffect(() => {
    fetchComplaints()

    if (!mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-122.169660, 37.429832],
      zoom: 15,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl())

    // Cleanup
    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      map.current?.remove()
    }
  }, [])

  // Update markers and layers when complaints change
  useEffect(() => {
    if (!map.current || !complaints.length) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Wait for map to be loaded
    if (!map.current.loaded()) {
      map.current.on('load', () => updateMapData())
    } else {
      updateMapData()
    }
  }, [complaints])

  const updateMapData = () => {
    if (!map.current) return

    // Add markers for each complaint
    complaints.forEach((complaint) => {
      const el = document.createElement("div")
      el.className = "complaint-marker"
      el.style.width = "12px"
      el.style.height = "12px"
      el.style.borderRadius = "50%"
      const color = TYPE_COLORS[complaint.issue_type as keyof typeof TYPE_COLORS] || TYPE_COLORS.Other
      el.style.backgroundColor = color
      el.style.boxShadow = `0 0 0 2px ${color}`
      el.style.cursor = "pointer"

      // Create and add the marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([complaint.coordinates[1], complaint.coordinates[0]])
        .addTo(map.current!)

      // Add click handler
      el.addEventListener("click", () => {
        setSelectedComplaint(complaint)
        setIsSidebarOpen(true)
      })

      // Store marker reference
      markersRef.current.push(marker)
    })

    // Update or add heat map layer
    const source = map.current.getSource('complaints')
    if (source) {
      // Update existing source
      ;(source as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: complaints.map((complaint) => ({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [complaint.coordinates[1], complaint.coordinates[0]],
          },
        })),
      })
    } else {
      // Add new source and layers
      map.current.addSource("complaints", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: complaints.map((complaint) => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [complaint.coordinates[1], complaint.coordinates[0]],
            },
          })),
        },
      })

      map.current.addLayer(
        {
          id: "complaints-heat",
          type: "heatmap",
          source: "complaints",
          maxzoom: 15,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(67,160,71,0)",
              0.2,
              "rgb(102,187,106)",
              0.4,
              "rgb(129,199,132)",
              0.6,
              "rgb(165,214,167)",
              0.8,
              "rgb(200,230,201)",
              1,
              "rgb(67,160,71)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 20],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 13, 1, 15, 0],
          },
        },
        "waterway-label"
      )

      map.current.addLayer(
        {
          id: "complaints-point",
          type: "circle",
          source: "complaints",
          minzoom: 14,
          paint: {
            "circle-radius": 6,
            "circle-color": "#2E7D32",
            "circle-stroke-width": 0.5,
            "circle-stroke-color": "#4CAF50",
            "circle-opacity": 0.8
          },
        },
        "waterway-label"
      )
    }
  }

  function generateRandomComplaint() {
    const reference = complaints[Math.floor(Math.random() * complaints.length)]
    if (!reference) return null

    const offset = 0.001
    const location = {
      lng: reference.coordinates[1] + (Math.random() - 0.5) * offset,
      lat: reference.coordinates[0] + (Math.random() - 0.5) * offset,
    }

    return { reference, location }
  }

  function getRandomInterval() {
    return Math.random() * 9000 + 1000
  }

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = []

    function createPulse() {
      if (!map.current) return

      const randomComplaint = generateRandomComplaint()
      if (!randomComplaint) return

      // Create temporary pulse effect
      const el = document.createElement("div")
      el.className = "temporary-pulse"
      el.style.width = "8px"
      el.style.height = "8px"
      el.style.borderRadius = "50%"
      el.style.background = TYPE_COLORS[randomComplaint.reference.issue_type as keyof typeof TYPE_COLORS] || TYPE_COLORS.Other

      const marker = new mapboxgl.Marker(el)
        .setLngLat([randomComplaint.location.lng, randomComplaint.location.lat])
        .addTo(map.current)
      setTempMarker(marker)

      // Remove after animation
      const removeTimeout = setTimeout(() => {
        marker.remove()
      }, 2000)

      // Schedule next pulse
      const nextTimeout = setTimeout(() => {
        createPulse()
      }, getRandomInterval())

      timeouts.push(removeTimeout, nextTimeout)
    }

    // Start multiple independent pulse chains
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        createPulse()
      }, getRandomInterval())
    }

    // Cleanup
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="flex h-screen">
      <div className="w-[400px] bg-white border-r border-gray-200 overflow-hidden">
        <ComplaintSidebar 
          complaint={selectedComplaint}
          complaints={complaints}
          onClose={() => {
            setSelectedComplaint(null)
          }} 
        />
      </div>
      <div className="flex-1 relative">
        <div ref={mapContainer} className="h-full w-full" />
      </div>
    </div>
  )
}

