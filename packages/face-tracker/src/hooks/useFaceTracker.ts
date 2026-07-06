import { useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Face } from 'kalidokit';
import type { VrmEngine } from '@mimicra/vrm-core';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export function useFaceTracker(
  videoRef: React.RefObject<HTMLVideoElement>,
  engineRef: React.MutableRefObject<VrmEngine | null>
) {
  const rafRef = useRef<number>(0);

  const startTracking = useCallback(async (onReady?: () => void) => {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });

    onReady?.();

    const detect = () => {
      const video = videoRef.current;
      const engine = engineRef.current;

      if (!video || !engine || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const result = landmarker.detectForVideo(video, performance.now());

      if (result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];

        const faceRig = Face.solve(landmarks, {
          runtime: 'mediapipe',
          video,
          smoothBlink: true,
          blinkSettings: [0.25, 0.75],
        });

        if (faceRig) {
          const deg2rad = Math.PI / 180;
          engine.applyPose({
            headRotation: {
              x: faceRig.head.degrees.x * deg2rad * -1,
              y: faceRig.head.degrees.y * deg2rad,
              z: faceRig.head.degrees.z * deg2rad,
            },
            blendShapes: {
              blinkLeft: faceRig.eye.l,
              blinkRight: faceRig.eye.r,
              aa: faceRig.mouth.shape.A,
              ih: faceRig.mouth.shape.I,
              ou: faceRig.mouth.shape.U,
              ee: faceRig.mouth.shape.E,
              oh: faceRig.mouth.shape.O,
            },
          });
        }
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      cancelAnimationFrame(rafRef.current);
      landmarker.close();
    };
  }, [videoRef, engineRef]);

  return { startTracking };
}
