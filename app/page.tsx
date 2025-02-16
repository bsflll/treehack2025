"use client";
import React, { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Alert } from "@/components/alert";

const CameraApp = () => {
  const [permission, setPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const requestCameraPermission = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setPermission(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Failed to get 2D context');
      return;
    }

    // Match canvas dimensions to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and save
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `photo-${new Date().toISOString()}.jpg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Samsung Camera App
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}
        
        <div className="space-y-4">
          {!permission ? (
            <Button 
              onClick={requestCameraPermission}
              className="w-full"
            >
              Start Camera
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={takePhoto} className="flex-1">
                  Take Photo
                </Button>
                <Button 
                  onClick={stopCamera} 
                  variant="outline"
                  className="flex-1"
                >
                  Stop Camera
                </Button>
              </div>
            </div>
          )}
          
          <canvas 
            ref={canvasRef} 
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraApp;