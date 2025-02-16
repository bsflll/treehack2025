"use client";

import { Camera } from "./components/Camera";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center">
          {/* Camera Section */}
          <div className="w-full max-w-2xl">
            <Camera />
          </div>
          
          {/* Additional UI elements can be added here */}
          <div className="mt-6 w-full max-w-2xl">
            {/* Add any controls or UI elements below the camera */}
          </div>
        </div>
      </div>
    </main>
  );
}
