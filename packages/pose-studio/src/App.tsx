import React, { useEffect, useRef, useState } from 'react';
import { VrmEngine } from '@mimicra/vrm-core';
import { PoseController } from './PoseController';

const SAMPLE_VRM_URL =
  'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

const buttonStyle: React.CSSProperties = {
  background: '#6c5ce7',
  border: 'none',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  width: '100%',
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VrmEngine | null>(null);
  const controllerRef = useRef<PoseController | null>(null);
  const [status, setStatus] = useState('VRMモデルを読み込み中...');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new VrmEngine({ canvas });
    engineRef.current = engine;
    const controller = new PoseController(engine, canvas);
    controllerRef.current = controller;

    engine
      .loadModel(SAMPLE_VRM_URL)
      .then(() => {
        const vrm = engine.currentVrm;
        if (vrm) controller.setupHandles(vrm);
        setStatus('');
      })
      .catch((e) => setStatus('読み込みエラー: ' + (e as Error).message));

    return () => {
      controller.dispose();
      engine.dispose();
      engineRef.current = null;
      controllerRef.current = null;
    };
  }, []);

  const handleLoadVrm = async (file: File) => {
    const engine = engineRef.current;
    const controller = controllerRef.current;
    if (!engine || !controller) return;
    setStatus('VRMモデルを読み込み中...');
    try {
      await engine.loadModel(file);
      const vrm = engine.currentVrm;
      if (vrm) controller.setupHandles(vrm);
      setStatus('');
    } catch (e) {
      setStatus('読み込みエラー: ' + (e as Error).message);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* ビューポート — 左 */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {status && (
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
            }}
          >
            {status}
          </div>
        )}
      </div>

      {/* 操作パネル — 右 */}
      <div
        style={{
          width: 240,
          background: '#111827',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flexShrink: 0,
          fontSize: 13,
          color: '#e2e8f0',
        }}
      >
        <p style={{ fontWeight: 600, fontSize: 15 }}>Pose Studio</p>

        <button style={buttonStyle} onClick={() => fileInputRef.current?.click()}>
          VRM読み込み
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".vrm"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleLoadVrm(f);
            e.target.value = '';
          }}
        />

        <button style={{ ...buttonStyle, background: '#374151' }} onClick={() => controllerRef.current?.resetPose()}>
          ポーズをリセット
        </button>

        <div style={{ borderTop: '1px solid #374151', paddingTop: 12, color: '#9ca3af', lineHeight: 1.7 }}>
          <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>操作方法</p>
          ・ドラッグ: 視点回転
          <br />
          ・ホイール: ズーム
          <br />
          ・右ドラッグ: パン
          <br />
          ・オレンジの球をクリック→矢印をドラッグでポーズ操作(手首・足首・頭)
        </div>

        <p style={{ marginTop: 'auto', color: '#4b5563', fontSize: 11 }}>
          MVP版: ポーズ保存・背景画像・PNG書き出しは次のステップで追加予定
        </p>
      </div>
    </div>
  );
}
