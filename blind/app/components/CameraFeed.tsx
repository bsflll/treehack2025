'use client';

import { useEffect, useRef, useState } from 'react';

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  const isMobile = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  useEffect(() => {
    async function setupCamera() {
      try {
        // First try to enumerate devices to find the back camera
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        let constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } as MediaTrackConstraints,
          audio: false
        };

        // If we're on mobile and have multiple cameras, try to explicitly select the back camera
        if (isMobile() && videoDevices.length > 1) {
          // On iPhone, the back camera usually comes last in the array
          const backCamera = videoDevices[videoDevices.length - 1];
          constraints = {
            video: {
              deviceId: { exact: backCamera.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } as MediaTrackConstraints,
            audio: false
          };
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Unable to access camera. Please ensure you have granted camera permissions.');
        console.error('Error accessing camera:', err);
      }
    }

    setupCamera();

    // Cleanup function to stop the camera when component unmounts
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      {error ? (
        <div className="bg-red-500 text-white p-4 rounded-lg text-center">
          {error}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full rounded-lg"
          style={{ transform: 'scaleX(-1)' }} // Mirror the video
        />
      )}
    </div>
  );
} 