import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { VrmEngine } from '@mimicra/vrm-core';
import type { VRM } from '@pixiv/three-vrm';
import { solveIk, type IkChain } from './ik/CcdIkSolver';

interface IkHandle {
  name: string;
  sphere: THREE.Mesh;
  chain: IkChain;
}

const HANDLE_COLOR = 0xff7043;
const HANDLE_COLOR_ACTIVE = 0xffc107;

/**
 * ビューポート操作(OrbitControls)とIKハンドルのドラッグ操作をまとめたコントローラ。
 * 手首・足首・頭のハンドル(球)をドラッグすると、肘・膝・背骨がIKで追従する。
 */
export class PoseController {
  private orbit: OrbitControls;
  private gizmo: TransformControls;
  private handles: IkHandle[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private removeFrameCb: (() => void) | null = null;
  private handleGroup = new THREE.Group();

  constructor(
    private engine: VrmEngine,
    private canvas: HTMLCanvasElement
  ) {
    const { camera, scene } = engine.three;

    this.orbit = new OrbitControls(camera, canvas);
    this.orbit.target.set(0, 1.0, 0);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.1;
    this.orbit.update();

    this.gizmo = new TransformControls(camera, canvas);
    this.gizmo.setMode('translate');
    this.gizmo.setSize(0.6);
    this.gizmo.addEventListener('dragging-changed', (e) => {
      this.orbit.enabled = !(e as unknown as { value: boolean }).value;
    });
    scene.add(this.gizmo);
    scene.add(this.handleGroup);

    canvas.addEventListener('pointerdown', this.onPointerDown);

    this.removeFrameCb = engine.onFrame(() => {
      this.orbit.update();
      for (const h of this.handles) {
        h.sphere.getWorldPosition(h.chain.target);
        solveIk(h.chain);
      }
    });
  }

  /** VRM読み込み後に呼ぶ。IKハンドルを生成する */
  setupHandles(vrm: VRM): void {
    this.clearHandles();

    // rawボーン(実際のメッシュ骨格)を直接操作する。
    // 正規化ボーンはワールド座標が実骨格と一致せずIKターゲット配置に使えないため、
    // 正規化→raw の毎フレーム上書きも無効化する。
    vrm.humanoid.autoUpdateHumanBones = false;
    const bone = (name: string) => vrm.humanoid.getRawBoneNode(name as never);

    const defs: Array<{ name: string; boneNames: string[]; effectorName: string }> = [
      { name: '左手', boneNames: ['leftUpperArm', 'leftLowerArm'], effectorName: 'leftHand' },
      { name: '右手', boneNames: ['rightUpperArm', 'rightLowerArm'], effectorName: 'rightHand' },
      { name: '左足', boneNames: ['leftUpperLeg', 'leftLowerLeg'], effectorName: 'leftFoot' },
      { name: '右足', boneNames: ['rightUpperLeg', 'rightLowerLeg'], effectorName: 'rightFoot' },
      { name: '頭', boneNames: ['spine', 'chest', 'neck'], effectorName: 'head' },
    ];

    for (const def of defs) {
      const bones = def.boneNames.map(bone).filter((b): b is THREE.Object3D => !!b);
      const effector = bone(def.effectorName);
      if (!effector || bones.length === 0) continue;

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 12),
        new THREE.MeshBasicMaterial({ color: HANDLE_COLOR, depthTest: false, transparent: true, opacity: 0.9 })
      );
      sphere.renderOrder = 999;
      effector.getWorldPosition(sphere.position);
      sphere.name = def.name;
      this.handleGroup.add(sphere);

      this.handles.push({
        name: def.name,
        sphere,
        chain: { bones, effector, target: sphere.position.clone() },
      });
    }
  }

  /** ポーズとハンドルを初期状態に戻す */
  resetPose(): void {
    const vrm = this.engine.currentVrm;
    if (!vrm) return;
    vrm.humanoid.resetRawPose();
    this.setupHandles(vrm);
  }

  private onPointerDown = (e: PointerEvent) => {
    if ((this.gizmo as unknown as { dragging: boolean }).dragging) return;

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.engine.three.camera);

    const hits = this.raycaster.intersectObjects(
      this.handles.map((h) => h.sphere),
      false
    );

    if (hits.length > 0) {
      const sphere = hits[0].object as THREE.Mesh;
      for (const h of this.handles) {
        (h.sphere.material as THREE.MeshBasicMaterial).color.setHex(
          h.sphere === sphere ? HANDLE_COLOR_ACTIVE : HANDLE_COLOR
        );
      }
      this.gizmo.attach(sphere);
    }
  };

  private clearHandles(): void {
    this.gizmo.detach();
    for (const h of this.handles) {
      this.handleGroup.remove(h.sphere);
      h.sphere.geometry.dispose();
      (h.sphere.material as THREE.Material).dispose();
    }
    this.handles = [];
  }

  dispose(): void {
    this.removeFrameCb?.();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.clearHandles();
    this.engine.three.scene.remove(this.gizmo);
    this.engine.three.scene.remove(this.handleGroup);
    this.gizmo.dispose();
    this.orbit.dispose();
  }
}
