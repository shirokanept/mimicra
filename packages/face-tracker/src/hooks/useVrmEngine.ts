import { useEffect, useRef, useState, useCallback } from 'react';
import { VrmEngine } from '@mimicra/vrm-core';

// @pixiv/three-vrm 公式サンプルVRM (VRM 1.0 対応モデル)
const SAMPLE_VRM_URL =
  'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

export function useVrmEngine(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const engineRef = useRef<VrmEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [vrmStatus, setVrmStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [vrmError, setVrmError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new VrmEngine({ canvas });
    engineRef.current = engine;
    setReady(true);

    setVrmStatus('loading');
    engine
      .loadModel(SAMPLE_VRM_URL)
      .then(() => setVrmStatus('ready'))
      .catch((e) => {
        setVrmStatus('error');
        setVrmError((e as Error).message);
      });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const loadModel = useCallback(async (source: string | File) => {
    const engine = engineRef.current;
    if (!engine) return;
    setVrmStatus('loading');
    setVrmError(null);
    try {
      await engine.loadModel(source);
      setVrmStatus('ready');
    } catch (e) {
      setVrmStatus('error');
      setVrmError((e as Error).message);
    }
  }, []);

  return { engineRef, ready, vrmStatus, vrmError, loadModel };
}
