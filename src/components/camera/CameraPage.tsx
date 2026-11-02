import React, { useState, useRef, useEffect } from 'react';
import { X, Music, RefreshCw, Zap, Clock, Sparkles, Camera, Upload } from 'lucide-react';

interface CameraPageProps {
  onClose: () => void;
}

export const CameraPage: React.FC<CameraPageProps> = ({ onClose }) => {
  const [creationMode, setCreationMode] = useState<'10m' | '60s' | '15s' | 'photo' | 'text'>('photo');
  const [permissionState, setPermissionState] = useState<'initial' | 'prompt' | 'granted' | 'denied'>('initial');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashOn, setFlashOn] = useState(false);
  const [filter, setFilter] = useState('none');
  const [isRecording, setIsRecording] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initCamera = async (mode: 'user' | 'environment' = 'user') => {
    try {
      setPermissionState('prompt');
      setDiagnosticError(null);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: true
        });
      } catch (err) {
        console.warn("Video+Audio failed, trying Video-only:", err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false
        });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionState('granted');
      setFacingMode(mode);
    } catch (err) {
      console.error("Camera error:", err);
      setPermissionState('denied');
      if (window.self !== window.top) {
        setDiagnosticError('iframe-restriction');
      }
    }
  };

  useEffect(() => {
    // Check initial permission status if possible
    if (navigator.permissions && (navigator.permissions as any).query) {
      (navigator.permissions as any).query({ name: 'camera' }).then((result: any) => {
        if (result.state === 'granted') {
          initCamera();
        }
      });
    }
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const toggleCamera = () => initCamera(facingMode === 'user' ? 'environment' : 'user');
  
  const toggleFlash = async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      // @ts-ignore
      await videoTrack.applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setIsRecording(true);
    const recorder = new MediaRecorder(streamRef.current);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      console.log('Video recorded:', blob);
    };
    recorder.start();
    // @ts-ignore
    streamRef.current.recorder = recorder;
  };

  const stopRecording = () => {
    // @ts-ignore
    streamRef.current?.recorder?.stop();
    setIsRecording(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const photoData = canvas.toDataURL('image/jpeg');
    console.log('Photo captured:', photoData);
  };

  const handleCaptureClick = () => {
    if (creationMode === 'photo') {
      capturePhoto();
    } else {
      isRecording ? stopRecording() : startRecording();
    }
  };

  if (diagnosticError === 'iframe-restriction') {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Preview Restricted</h2>
        <p className="text-gray-400 mb-8">The camera cannot be accessed within this preview window.</p>
        <button onClick={() => window.open(window.location.href, '_blank')} className="bg-[#8B5CF6] py-3 px-8 rounded-full font-bold text-lg">Open Full Website</button>
        <button onClick={onClose} className="mt-6 text-gray-500">Close</button>
      </div>
    );
  }

  if (permissionState === 'initial') {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <Camera className="w-20 h-20 text-[#8B5CF6] mb-6" />
        <h2 className="text-2xl font-bold mb-2">Enable Camera</h2>
        <p className="text-gray-400 mb-8">We need camera access to let you record videos and take photos.</p>
        <button onClick={() => initCamera()} className="bg-[#8B5CF6] py-3 px-8 rounded-full font-bold text-lg">Enable Camera</button>
        <button onClick={onClose} className="mt-6 text-gray-500">Not Now</button>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <p className="mb-4">Camera permission denied. Please enable it in browser settings (click the lock icon in the address bar).</p>
        <button onClick={() => initCamera()} className="bg-[#8B5CF6] py-2 px-6 rounded-lg font-bold">Retry Camera</button>
        <button onClick={onClose} className="mt-4 text-gray-400">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ filter }} />

      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <button onClick={onClose} className="text-white"><X className="w-8 h-8" /></button>
        <button className="flex items-center gap-2 text-white font-semibold"><Music className="w-5 h-5" /> Sound</button>
        <button onClick={toggleCamera} className="text-white"><RefreshCw className="w-8 h-8" /></button>
      </div>

      <div className="absolute right-4 top-24 flex flex-col gap-8 z-10">
        <button onClick={toggleFlash} className={`text-white ${flashOn ? 'text-yellow-400' : ''}`}><Zap className="w-8 h-8" /></button>
        <button className="text-white"><Clock className="w-8 h-8" /></button>
        <button className="text-white"><Sparkles className="w-8 h-8" /></button>
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-6">
        <div className="flex gap-6 text-white text-sm font-bold opacity-90">
          {(['10m', '60s', '15s', 'photo', 'text'] as const).map(mode => (
            <button key={mode} onClick={() => setCreationMode(mode)} className={creationMode === mode ? 'text-white' : 'text-gray-400'}>
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between w-full px-10">
          <div className="w-12 h-12 bg-gray-800 rounded-lg" />
          <button 
            onClick={handleCaptureClick}
            className={`w-20 h-20 rounded-full border-4 border-white ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white'}`}
          />
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
            <Upload className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};
