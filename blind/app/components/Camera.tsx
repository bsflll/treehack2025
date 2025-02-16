"use client";

import { useEffect, useRef, useState } from "react";

// Add type declarations for legacy getUserMedia methods and MSStream
declare global {
  interface Navigator {
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
  }
  interface Window {
    MSStream?: unknown;
  }
}

export const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [debug, setDebug] = useState<string>("");

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    const startCamera = async () => {
      try {
        setDebug(`Checking media devices... iOS: ${isIOS}, Safari: ${isSafari}`);

        // Ensure we're using HTTPS
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          throw new Error('Camera access requires HTTPS');
        }

        setDebug(prev => prev + "\nChecking camera API availability...");
        
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API is not supported in this browser');
        }

        setDebug(prev => prev + "\nRequesting camera access...");

        // For iOS Safari, we need to request with specific constraints
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        // On iOS, we might need to be more permissive with constraints
        if (isIOS) {
          constraints.video = true;
        }

        setDebug(prev => prev + "\nRequesting camera with constraints...");
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // For iOS Safari, we need to wait for loadedmetadata and handle play carefully
          videoRef.current.onloadedmetadata = async () => {
            try {
              // Ensure video element is properly mounted
              if (videoRef.current) {
                videoRef.current.setAttribute('playsinline', 'true');
                videoRef.current.setAttribute('webkit-playsinline', 'true');
                await videoRef.current.play();
                setDebug(prev => prev + "\nVideo playback started successfully");
              }
            } catch (playError) {
              setDebug(prev => prev + "\nPlay error: " + (playError as Error).message);
              console.error("Error playing video:", playError);
            }
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setDebug(prev => prev + "\nError: " + errorMessage);
        
        if (err instanceof Error) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Camera access was denied. Please grant camera permissions in your Safari settings:\n1. Open Settings\n2. Scroll down to Safari\n3. Tap Camera\n4. Allow for this website");
          } else if (err.name === "NotFoundError") {
            setError("No camera found on your device.");
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            setError("Camera is already in use by another application.");
          } else if (err.name === "NotSupportedError") {
            setError("Camera access is not supported. Please ensure you're using Safari on iOS and have granted permissions.");
          } else {
            setError(`Unable to access camera: ${err.message}\n\nPlease ensure you're using Safari and have granted camera permissions in Settings.`);
          }
        } else {
          setError("An unexpected error occurred while accessing the camera. Please ensure you're using Safari on iOS.");
        }
      }
    };

    // Start camera with a longer delay on iOS Safari
    if (isIOS && isSafari) {
      setTimeout(startCamera, 1000); // Increased delay for iOS Safari
    } else {
      startCamera();
    }

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]); // Added stream to dependencies

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {error ? (
        <div className="space-y-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline whitespace-pre-line">{error}</span>
            <button 
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => window.location.reload()}
            >
              Retry Camera Access
            </button>
          </div>
          <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded relative">
            <pre className="whitespace-pre-wrap text-xs">{debug}</pre>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            webkit-playsinline="true"
            muted
            className="w-full h-full rounded-lg shadow-lg"
            style={{
              transform: "scaleX(-1)",
              maxHeight: "calc(100vh - 200px)",
              backgroundColor: "#000"
            }}
          />
          {debug && (
            <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded relative">
              <pre className="whitespace-pre-wrap text-xs">{debug}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 