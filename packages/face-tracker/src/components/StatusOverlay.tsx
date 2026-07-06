import React from 'react';

interface Props {
  mediapipeStatus: 'loading' | 'ready' | 'error';
  vrmStatus: 'loading' | 'ready' | 'error';
  vrmError: string | null;
  cameraError: string | null;
}

export function StatusOverlay({ mediapipeStatus, vrmStatus, vrmError, cameraError }: Props) {
  const messages: string[] = [];
  if (cameraError) messages.push(`カメラエラー: ${cameraError}`);
  if (mediapipeStatus === 'loading') messages.push('顔トラッキングを準備中...');
  if (mediapipeStatus === 'error') messages.push('顔トラッキングの初期化に失敗しました');
  if (vrmStatus === 'loading') messages.push('VRMモデルを読み込み中...');
  if (vrmStatus === 'error' && vrmError) messages.push(vrmError);

  if (messages.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        padding: '8px 20px',
        borderRadius: 8,
        fontSize: 13,
        color: '#fff',
        whiteSpace: 'nowrap',
        zIndex: 15,
        textAlign: 'center',
      }}
    >
      {messages.map((m, i) => (
        <div key={i}>{m}</div>
      ))}
    </div>
  );
}
