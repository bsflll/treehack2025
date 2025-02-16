"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import type { Complaint } from "./city-map"

interface ComplaintSidebarProps {
  complaint: Complaint | null
  complaints: Complaint[]
  onClose: () => void
}

export function ComplaintSidebar({ complaint, complaints, onClose }: ComplaintSidebarProps) {
  const [isNearbyOpen, setIsNearbyOpen] = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)

  // Find nearby complaints (within ~500m)
  const getNearbyComplaints = (currentComplaint: Complaint) => {
    return complaints
      .filter(c => {
        // Don't compare with self
        if (c === currentComplaint) return false
        
        // Calculate distance using coordinates
        const distance = Math.sqrt(
          Math.pow(c.coordinates[0] - currentComplaint.coordinates[0], 2) + 
          Math.pow(c.coordinates[1] - currentComplaint.coordinates[1], 2)
        )
        
        // Roughly 500m in degrees (0.005 degrees ≈ 500m)
        return distance < 0.005
      })
      .slice(0, 5) // Limit to 5 nearby complaints
  }

  if (!complaint) {
    return (
      <div className="p-4 text-gray-400">
        Click a marker to view complaint details
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 p-4 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">
          {complaint.issue_type}
        </h2>
      </header>

      <ScrollArea className="flex-1 p-6">
        <div className="p-6 space-y-6">
          {/* Header with close button */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {complaint.issue_type}
              </h2>
              <p className="text-gray-600">{complaint.location}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900"
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Description</h3>
            <p className="text-gray-900">{complaint.description}</p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Category</h3>
            <p className="text-gray-900">{complaint.category}</p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Date Reported</h3>
            <p className="text-gray-900">
              {new Date(complaint.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Source</h3>
            <p className="text-gray-900">{complaint.source}</p>
            <div className="space-y-1">
              {complaint.source_links.map((link, index) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View Source {complaint.source_links.length > 1 ? index + 1 : ''}
                </a>
              ))}
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Coordinates</h3>
            <p className="text-gray-900 font-mono text-sm">
              {complaint.coordinates[0].toFixed(6)}, {complaint.coordinates[1].toFixed(6)}
            </p>
          </div>

          {/* Nearby Complaints Section */}
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={() => setIsNearbyOpen(!isNearbyOpen)}
              className="flex items-center justify-between w-full text-gray-900 hover:text-gray-600 transition-colors"
            >
              <span className="font-semibold">Nearby Complaints</span>
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  isNearbyOpen ? "transform rotate-180" : ""
                }`}
              />
            </button>
            
            {isNearbyOpen && (
              <div className="mt-4 space-y-3">
                {getNearbyComplaints(complaint).map((nearby, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedComplaint(nearby)
                      setIsNearbyOpen(true)
                    }}
                  >
                    <h4 className="font-medium text-gray-900 mb-1">{nearby.issue_type}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{nearby.description}</p>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>{nearby.category}</span>
                      <span>{new Date(nearby.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

