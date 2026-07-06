import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BackgroundMode } from '@mimicra/vrm-core';
import { useVrmEngine } from './hooks/useVrmEngine';
import { useFaceTracker } from './hooks/useFaceTracker';
import { useCameraDevices } from './hooks/useCameraDevices';
import { ControlBar } from './components/ControlBar';
import { DropOverlay } from './components/DropOverlay';
import { StatusOverlay } from './components/StatusOverlay';

const UI_HIDE_DELAY = 2500;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const trackingStartedRef = useRef(false);

  const { engineRef, ready, vrmStatus, vrmError, loadModel } = useVrmEngine(canvasRef);
  const { startTracking } = useFaceTracker(videoRef, engineRef);
  const { devices, refresh } = useCameraDevices();

  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mediapipeStatus, setMediapipeStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [uiVisible, setUiVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('color');
  const [bgColor, setBgColor] = useState('#1a1a2e');

  const initCamera = useCallback(
    async (deviceId?: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
        });
        const old = videoRef.current?.srcObject as MediaStream | null;
        old?.getTracks().forEach((t) => t.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraError(null);
        const track = stream.getVideoTracks()[0];
        setSelectedDeviceId(track?.getSettings().deviceId ?? deviceId ?? '');
        await refresh();

        if (!trackingStartedRef.current) {
          trackingStartedRef.current = true;
          setMediapipeStatus('loading');
          try {
            await startTracking(() => setMediapipeStatus('ready'));
          } catch {
            setMediapipeStatus('error');
          }
        }
      } catch (e) {
        setCameraError((e as Error).message);
      }
    },
    [refresh, startTracking]
  );

  useEffect(() => {
    initCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const colorNum = backgroundMode === 'color' ? parseInt(bgColor.slice(1), 16) : undefined;
    engineRef.current?.setBackground(backgroundMode, colorNum);
  }, [backgroundMode, bgColor, ready, engineRef]);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setUiVisible(false), UI_HIDE_DELAY);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => window.clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) loadModel(file);
    },
    [loadModel]
  );

  return (
    <div
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}
      onMouseMove={resetHideTimer}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      <ControlBar
        visible={uiVisible}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => initCamera(id)}
        onSelectFile={(file) => loadModel(file)}
        backgroundMode={backgroundMode}
        bgColor={bgColor}
        onBackgroundModeChange={setBackgroundMode}
        onBgColorChange={setBgColor}
      />

      <DropOverlay visible={isDragging} />
      <StatusOverlay
        mediapipeStatus={mediapipeStatus}
        vrmStatus={vrmStatus}
        vrmError={vrmError}
        cameraError={cameraError}
      />
    </div>
  );
}
