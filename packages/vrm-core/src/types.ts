export interface VrmPose {
  // Head rotation in radians (Euler angles, VRM coordinate system)
  headRotation?: {
    x: number; // pitch (nod up/down)
    y: number; // yaw (turn left/right)
    z: number; // roll (tilt)
  };
  // Blend shapes (0.0 - 1.0)
  blendShapes?: Partial<Record<BlendShapeName, number>>;
}

export type BlendShapeName =
  | 'blink'
  | 'blinkLeft'
  | 'blinkRight'
  | 'aa'
  | 'ih'
  | 'ou'
  | 'ee'
  | 'oh'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'relaxed'
  | 'surprised';

export type BackgroundMode = 'color' | 'greenback' | 'transparent';

export interface VrmEngineOptions {
  canvas: HTMLCanvasElement;
  background?: number; // initial solid color, default 0x1a1a2e
}
