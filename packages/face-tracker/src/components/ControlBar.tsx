import React, { useRef } from 'react';
import type { BackgroundMode } from '@mimicra/vrm-core';

interface Props {
  visible: boolean;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  onSelectFile: (file: File) => void;
  backgroundMode: BackgroundMode;
  bgColor: string;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
  onBgColorChange: (color: string) => void;
}

const selectStyle: React.CSSProperties = {
  background: '#1f2937',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '4px 6px',
};

export function ControlBar({
  visible,
  devices,
  selectedDeviceId,
  onSelectDevice,
  onSelectFile,
  backgroundMode,
  bgColor,
  onBackgroundModeChange,
  onBgColorChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px',
        background: 'rgba(17,24,39,0.85)',
        backdropFilter: 'blur(4px)',
        color: '#e2e8f0',
        fontSize: 13,
        transition: 'transform 0.25s ease, opacity 0.25s ease',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 10,
      }}
    >
      <strong style={{ marginRight: 8 }}>Mimicra</strong>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        カメラ:
        <select
          value={selectedDeviceId}
          onChange={(e) => onSelectDevice(e.target.value)}
          style={selectStyle}
        >
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `カメラ ${i + 1}`}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: '#6c5ce7',
          border: 'none',
          color: '#fff',
          padding: '5px 14px',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        VRM読み込み
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".vrm"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectFile(file);
          e.target.value = '';
        }}
      />
      <span style={{ color: '#6b7280', fontSize: 11 }}>(ドラッグ&ドロップでも読み込めます)</span>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        背景:
        <select
          value={backgroundMode}
          onChange={(e) => onBackgroundModeChange(e.target.value as BackgroundMode)}
          style={selectStyle}
        >
          <option value="color">単色</option>
          <option value="greenback">グリーンバック</option>
          <option value="transparent">透過</option>
        </select>
      </label>

      {backgroundMode === 'color' && (
        <input
          type="color"
          value={bgColor}
          onChange={(e) => onBgColorChange(e.target.value)}
          style={{ width: 32, height: 26, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
        />
      )}
    </div>
  );
}
