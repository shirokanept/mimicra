import * as THREE from 'three';

/**
 * CCD (Cyclic Coordinate Descent) 方式のシンプルなIKソルバー。
 * chain: 根元→先端の順に並んだボーン。effectorは先端ボーン(手首・足首など)。
 * ターゲット位置に向けて中間関節(肘・膝など)が自然に追従する。
 */
export interface IkChain {
  /** 根元から先端の順 (effectorは含めない) */
  bones: THREE.Object3D[];
  /** 先端ボーン (この位置をターゲットへ近づける) */
  effector: THREE.Object3D;
  /** ワールド座標のターゲット */
  target: THREE.Vector3;
  /** 1関節あたりの回転上限(ラジアン)。急激な曲がりを防ぐ */
  maxAngleStep?: number;
}

const _bonePos = new THREE.Vector3();
const _effPos = new THREE.Vector3();
const _toEff = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _invQuat = new THREE.Quaternion();
const _deltaQuat = new THREE.Quaternion();
const _axis = new THREE.Vector3();

export function solveIk(chain: IkChain, iterations = 10, tolerance = 0.005): void {
  const { bones, effector, target, maxAngleStep = 0.5 } = chain;

  for (let iter = 0; iter < iterations; iter++) {
    // 先端から根元へ向かって各関節を回す
    for (let i = bones.length - 1; i >= 0; i--) {
      const bone = bones[i];

      bone.updateWorldMatrix(true, false);
      effector.updateWorldMatrix(true, false);

      bone.getWorldPosition(_bonePos);
      effector.getWorldPosition(_effPos);

      _toEff.copy(_effPos).sub(_bonePos);
      _toTarget.copy(target).sub(_bonePos);
      if (_toEff.lengthSq() < 1e-8 || _toTarget.lengthSq() < 1e-8) continue;
      _toEff.normalize();
      _toTarget.normalize();

      let angle = _toEff.angleTo(_toTarget);
      if (angle < 1e-4) continue;
      if (angle > maxAngleStep) angle = maxAngleStep;

      _axis.crossVectors(_toEff, _toTarget);
      if (_axis.lengthSq() < 1e-8) continue;
      _axis.normalize();

      // ワールド空間の回転をボーンのローカル空間に変換して適用
      bone.getWorldQuaternion(_invQuat).invert();
      _axis.applyQuaternion(_invQuat);
      _deltaQuat.setFromAxisAngle(_axis, angle);
      bone.quaternion.multiply(_deltaQuat);

      bone.updateWorldMatrix(false, true);
    }

    effector.updateWorldMatrix(true, false);
    effector.getWorldPosition(_effPos);
    if (_effPos.distanceToSquared(target) < tolerance * tolerance) break;
  }
}
