"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CORONARY_SEGMENTS,
  getCurveForSegment,
  getSegmentRadii,
  midpoint,
} from "./segmentData";
import { createTaperedTubeGeometry } from "./taperedTubeGeometry";
import type { AnnotationKind, SegmentAnnotation } from "./coronaryTypes";

export type { AnnotationKind, SegmentAnnotation } from "./coronaryTypes";

type Props = {
  annotations: Record<string, SegmentAnnotation>;
  selectedId: string | null;
  paintMode: AnnotationKind;
  onSelectSegment: (id: string | null) => void;
  onApplyAnnotation: (segmentId: string, kind: AnnotationKind) => void;
  focusSegmentId: string | null;
  focusRev: number;
  cameraPreset: string | null;
  onCameraPresetDone: () => void;
};

type SegMaterials = {
  base: THREE.MeshPhysicalMaterial;
  lesion: THREE.MeshPhysicalMaterial;
  stent: THREE.MeshPhysicalMaterial;
  geom: THREE.BufferGeometry;
};

function pickMaterial(
  ann: SegmentAnnotation | undefined,
  selected: boolean,
  mats: SegMaterials
): THREE.MeshPhysicalMaterial {
  const { base, lesion, stent } = mats;
  if (ann?.kind === "lesion") {
    lesion.opacity = Math.min(0.95, Math.max(0.25, ann.opacity));
    lesion.emissiveIntensity = selected ? 0.25 : 0.08;
    return lesion;
  }
  if (ann?.kind === "stent") {
    stent.opacity = Math.min(0.95, Math.max(0.25, ann.opacity));
    stent.emissiveIntensity = selected ? 0.22 : 0.08;
    return stent;
  }
  base.emissiveIntensity = selected ? 0.28 : 0.06;
  return base;
}

export default function CoronaryScene(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    group: THREE.Group;
    meshes: Map<string, THREE.Mesh>;
    segMaterials: Map<string, SegMaterials>;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    meshList: THREE.Mesh[];
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c121a);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(3.8, 2.4, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI * 0.92;

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.1);
    d1.position.set(6, 10, 4);
    scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xa8c8ff, 0.35);
    d2.position.set(-4, 2, -2);
    scene.add(d2);

    const group = new THREE.Group();
    group.position.set(0, -0.2, 0);
    scene.add(group);

    const meshes = new Map<string, THREE.Mesh>();
    const segMaterials = new Map<string, SegMaterials>();

    const makeSegMaterials = (selected: boolean) => {
      const base = new THREE.MeshPhysicalMaterial({
        color: selected ? 0xc4a8a4 : 0x8b5349,
        roughness: 0.42,
        metalness: 0.06,
        clearcoat: 0.12,
        clearcoatRoughness: 0.45,
        emissive: selected ? 0x3d2020 : 0x1a0a08,
        emissiveIntensity: selected ? 0.28 : 0.06,
      });
      const lesion = new THREE.MeshPhysicalMaterial({
        color: 0xd06028,
        transparent: true,
        opacity: 0.88,
        roughness: 0.38,
        metalness: 0.1,
        depthWrite: false,
        emissive: 0x4a1808,
        emissiveIntensity: selected ? 0.25 : 0.08,
      });
      const stent = new THREE.MeshPhysicalMaterial({
        color: 0x4ab0d8,
        transparent: true,
        opacity: 0.8,
        roughness: 0.28,
        metalness: 0.35,
        depthWrite: false,
        emissive: 0x103040,
        emissiveIntensity: selected ? 0.22 : 0.08,
      });
      return { base, lesion, stent };
    };

    for (const seg of CORONARY_SEGMENTS) {
      const curve = getCurveForSegment(seg);
      const { start: r0, end: r1 } = getSegmentRadii(seg);
      const geom = createTaperedTubeGeometry(curve, 72, 14, r0, r1, false);
      const mats: SegMaterials = { ...makeSegMaterials(false), geom };
      const mesh = new THREE.Mesh(geom, mats.base);
      mesh.userData.segmentId = seg.id;
      group.add(mesh);
      meshes.set(seg.id, mesh);
      segMaterials.set(seg.id, mats);
    }

    const meshList = Array.from(meshes.values());
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    el.appendChild(renderer.domElement);
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onPointerDown = (e: PointerEvent) => {
      const p = propsRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshList, false);
      if (hits.length > 0) {
        const id = (hits[0].object as THREE.Mesh).userData.segmentId as string;
        if (id) {
          p.onSelectSegment(id);
          p.onApplyAnnotation(id, p.paintMode);
        }
      } else {
        p.onSelectSegment(null);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshList, false);
      document.body.style.cursor = hits.length > 0 ? "pointer" : "auto";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      group,
      meshes,
      segMaterials,
      raycaster,
      pointer,
      meshList,
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      document.body.style.cursor = "auto";
      controls.dispose();
      segMaterials.forEach((m) => {
        m.base.dispose();
        m.lesion.dispose();
        m.stent.dispose();
        m.geom.dispose();
      });
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    const { meshes, segMaterials } = t;
    for (const seg of CORONARY_SEGMENTS) {
      const mesh = meshes.get(seg.id);
      const mats = segMaterials.get(seg.id);
      if (!mesh || !mats) continue;
      const ann = props.annotations[seg.id];
      const selected = props.selectedId === seg.id;
      mats.base.color.set(selected ? 0xc4a8a4 : 0x8b5349);
      mats.base.emissive.set(selected ? 0x3d2020 : 0x1a0a08);
      mats.base.emissiveIntensity = selected ? 0.28 : 0.06;
      const mat = pickMaterial(ann, selected, mats);
      mesh.material = mat;
    }
  }, [props.annotations, props.selectedId]);

  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    const { camera, controls } = t;
    const { focusSegmentId, focusRev, cameraPreset, onCameraPresetDone } = props;

    if (focusSegmentId) {
      const seg = CORONARY_SEGMENTS.find((s) => s.id === focusSegmentId);
      if (seg) {
        const mid = midpoint(seg);
        const off = new THREE.Vector3(2.2, 1.6, 2.4);
        camera.position.copy(mid.clone().add(off));
        controls.target.copy(mid);
        controls.update();
      }
    }

    if (cameraPreset) {
      const presets: Record<string, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
        depan: {
          pos: new THREE.Vector3(0, 1.2, 6.2),
          target: new THREE.Vector3(0, 0.6, 0),
        },
        samping: {
          pos: new THREE.Vector3(6.5, 1.0, 2.0),
          target: new THREE.Vector3(0, 0.5, 0),
        },
        atas: {
          pos: new THREE.Vector3(0.4, 7.5, 0.4),
          target: new THREE.Vector3(0, 0.4, 0),
        },
      };
      const p = presets[cameraPreset];
      if (p) {
        camera.position.copy(p.pos);
        controls.target.copy(p.target);
        controls.update();
      }
      onCameraPresetDone();
    }
  }, [
    props.focusSegmentId,
    props.focusRev,
    props.cameraPreset,
    props.onCameraPresetDone,
  ]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-h-[280px] rounded-lg bg-[#0c121a]"
    />
  );
}
