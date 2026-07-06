import React from 'react';

export function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(108,92,231,0.25)',
        border: '3px dashed #6c5ce7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        color: '#fff',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      VRMファイルをドロップして読み込み
    </div>
  );
}
