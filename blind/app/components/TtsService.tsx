'use client';

import { useEffect, useState } from 'react';
import { KokoroTTS } from 'kokoro-js';

type KokoroVoice = 
  | "af_heart" | "af_alloy" | "af_aoede" | "af_bella" 
  | "af_jessica" | "af_kore" | "af_nicole" | "af_nova" 
  | "af_river" | "af_sarah" | "af_sky" | "am_adam" 
  | "am_echo" | "am_eric";

interface TtsServiceProps {
  text?: string;
  autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const useTts = ({ text, autoPlay = false, onStart, onEnd, onError }: TtsServiceProps) => {
  const [tts, setTts] = useState<KokoroTTS | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<KokoroVoice>("af_heart");
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [currentSource, setCurrentSource] = useState<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    async function initTTS() {
      try {
        const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
        const ttsInstance = await KokoroTTS.from_pretrained(model_id, {
          dtype: "fp32",
          device: "webgpu",
        });
        setTts(ttsInstance);
        setAudioContext(new AudioContext());
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Kokoro-TTS:', error);
        onError?.('Failed to initialize TTS');
      }
    }

    initTTS();
    return () => {
      stop();
    };
  }, [onError]);

  const speak = async (textToSpeak: string) => {
    if (!textToSpeak.trim() || !isInitialized || !tts || !audioContext) {
      console.error('Cannot speak: TTS not ready');
      return;
    }

    try {
      stop();
      setIsPlaying(true);
      onStart?.();

      const audio = await tts.generate(textToSpeak, {
        voice: selectedVoice,
      });

      const audioBuffer = await audioContext.decodeAudioData(audio.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      setCurrentSource(source);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          setCurrentSource(null);
          setIsPlaying(false);
          onEnd?.();
          resolve();
        };
        source.start();
      });

    } catch (error) {
      console.error('Speech error:', error);
      setIsPlaying(false);
      onError?.(error instanceof Error ? error.message : 'Speech error');
    }
  };

  const stop = () => {
    if (currentSource) {
      try {
        currentSource.stop();
        currentSource.disconnect();
      } catch (e) {
        // Ignore errors during stop
      }
      setCurrentSource(null);
    }
    setIsPlaying(false);
  };

  const setVoice = (voice: KokoroVoice) => {
    setSelectedVoice(voice);
  };

  const voices: KokoroVoice[] = [
    "af_heart", "af_alloy", "af_aoede", "af_bella",
    "af_jessica", "af_kore", "af_nicole", "af_nova",
    "af_river", "af_sarah", "af_sky", "am_adam",
    "am_echo", "am_eric"
  ];

  return {
    speak,
    stop,
    isPlaying,
    voices,
    selectedVoice,
    isInitialized,
    setVoice
  };
}; 