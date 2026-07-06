import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { VrmPose, VrmEngineOptions, BackgroundMode } from './types';

const VRM_BLEND_SHAPE_MAP: Record<string, string> = {
  blink: 'blink',
  blinkLeft: 'blinkLeft',
  blinkRight: 'blinkRight',
  aa: 'aa',
  ih: 'ih',
  ou: 'ou',
  ee: 'ee',
  oh: 'oh',
  happy: 'happy',
  angry: 'angry',
  sad: 'sad',
  relaxed: 'relaxed',
  surprised: 'surprised',
};

export class VrmEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private vrm: VRM | null = null;
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;
  private frameCallbacks: Array<(delta: number) => void> = [];

  constructor(options: VrmEngineOptions) {
    const { canvas, background = 0x1a1a2e } = options;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(background);

    this.camera = new THREE.PerspectiveCamera(30, (canvas.clientWidth || 800) / (canvas.clientHeight || 600), 0.1, 20);
    this.camera.position.set(0, 1.4, 1.8);
    this.camera.lookAt(0, 1.2, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(1, 2, 2);
    this.scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    rimLight.position.set(-1, 0, -1);
    this.scene.add(rimLight);

    const resizeObserver = new ResizeObserver(() => this.onResize());
    resizeObserver.observe(canvas);

    this.startRenderLoop();
  }

  /** three.js内部オブジェクトへのアクセス(拡張ツール用: カメラ操作・ギズモ追加など) */
  get three(): { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
    return { renderer: this.renderer, scene: this.scene, camera: this.camera };
  }

  /** 現在読み込まれているVRM(未読み込みならnull) */
  get currentVrm(): VRM | null {
    return this.vrm;
  }

  /** 毎フレーム描画前に呼ばれるコールバックを登録し、解除関数を返す */
  onFrame(cb: (delta: number) => void): () => void {
    this.frameCallbacks.push(cb);
    return () => {
      this.frameCallbacks = this.frameCallbacks.filter((f) => f !== cb);
    };
  }

  async loadModel(source: string | File): Promise<void> {
    const isFile = typeof source !== 'string';
    const url = isFile ? URL.createObjectURL(source as File) : source;

    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      let gltf;
      try {
        gltf = await loader.loadAsync(url);
      } catch {
        throw new Error('VRMファイルの読み込みに失敗しました。ファイル形式を確認してください。');
      }

      const vrm: VRM | undefined = gltf.userData.vrm;
      if (!vrm) {
        throw new Error('VRMデータが見つかりませんでした。.vrmファイルを指定してください。');
      }

      if (this.vrm) {
        this.scene.remove(this.vrm.scene);
        VRMUtils.deepDispose(this.vrm.scene);
      }
      this.vrm = vrm;
      this.scene.add(vrm.scene);
    } finally {
      if (isFile) URL.revokeObjectURL(url);
    }
  }

  setBackground(mode: BackgroundMode, color?: number): void {
    if (mode === 'transparent') {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
    } else if (mode === 'greenback') {
      this.scene.background = new THREE.Color(0x00ff00);
      this.renderer.setClearColor(0x00ff00, 1);
    } else {
      const c = color ?? 0x1a1a2e;
      this.scene.background = new THREE.Color(c);
      this.renderer.setClearColor(c, 1);
    }
  }

  applyPose(pose: VrmPose): void {
    if (!this.vrm) return;
    const { headRotation, blendShapes } = pose;

    if (headRotation) {
      const head = this.vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
      if (head) {
        head.rotation.x = headRotation.x;
        head.rotation.y = headRotation.y;
        head.rotation.z = headRotation.z;
      }
      const neck = this.vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
      if (neck) {
        neck.rotation.x = headRotation.x * 0.3;
        neck.rotation.y = headRotation.y * 0.3;
        neck.rotation.z = headRotation.z * 0.3;
      }
    }

    if (blendShapes && this.vrm.expressionManager) {
      for (const [key, value] of Object.entries(blendShapes)) {
        const mapped = VRM_BLEND_SHAPE_MAP[key] ?? key;
        try {
          this.vrm.expressionManager.setValue(mapped, value);
        } catch {
          // expression not in this model — skip
        }
      }
      this.vrm.expressionManager.update();
    }
  }

  private onResize(): void {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private startRenderLoop(): void {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);
      const delta = this.clock.getDelta();
      for (const cb of this.frameCallbacks) cb(delta);
      this.vrm?.update(delta);
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  dispose(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.vrm) VRMUtils.deepDispose(this.vrm.scene);
    this.renderer.dispose();
  }
}
