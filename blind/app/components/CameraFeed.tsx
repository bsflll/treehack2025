'use client';

import { useEffect, useRef, useState } from 'react';

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioElements = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Preload audio files
  useEffect(() => {
    const audioFiles = ['starting.wav', '1.wav', '2.wav', '3.wav', '4.wav', '5.wav', 'yes.wav', 'no.wav'];
    
    audioFiles.forEach(filename => {
      const audio = new Audio();
      audio.src = `/${filename}`;
      audio.preload = 'auto';
      audioElements.current[filename] = audio;
    });

    return () => {
      // Cleanup audio elements
      Object.values(audioElements.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const playAudio = async (filename: string) => {
    try {
      const audio = audioElements.current[filename];
      if (!audio) {
        console.error(`Audio file ${filename} not found`);
        return;
      }
      
      // Reset the audio to start
      audio.currentTime = 0;
      
      // Create and wait for the play promise
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        try {
          await playPromise;
        } catch (error) {
          console.error('Playback failed:', error);
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const startAudioSequence = () => {
    if (isSequenceRunning) return;
    setIsSequenceRunning(true);

    // Clear any existing timeout
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
    }

    // Schedule all audio plays
    setTimeout(() => playAudio('starting.wav'), 1000);
    setTimeout(() => playAudio('1.wav'), 30000);
    setTimeout(() => playAudio('2.wav'), 60000);
    setTimeout(() => playAudio('3.wav'), 90000);
    setTimeout(() => playAudio('yes.wav'), 95000);
    setTimeout(() => playAudio('4.wav'), 115000);
    setTimeout(() => playAudio('5.wav'), 135000);
    setTimeout(() => {
      playAudio('no.wav');
      setIsSequenceRunning(false);
    }, 140000);

    sequenceTimeoutRef.current = setTimeout(() => {
      setIsSequenceRunning(false);
    }, 140000);
  };

  const isMobile = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  useEffect(() => {
    async function setupCamera() {
      try {
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

        if (isMobile() && videoDevices.length > 1) {
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

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Top 50% - Camera */}
      <div className="relative h-1/2 w-full bg-black">
        {error ? (
          <div className="bg-red-500 text-white p-4 rounded-lg text-center">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-lg"
          />
        )}
      </div>
      
      {/* Bottom 50% - Audio Control */}
      <div className="flex h-1/2 w-full bg-gray-900 items-center justify-center">
        <button
          onClick={startAudioSequence}
          disabled={isSequenceRunning}
          className={`px-8 py-4 rounded-xl text-white text-xl font-bold transition-colors ${
            isSequenceRunning 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {isSequenceRunning ? 'Sequence Running...' : 'Start Sequence'}
        </button>
      </div>
    </div>
  );
} 