// src/components/UploadCard.js
import React, { useEffect, useRef, useState } from "react";
import * as GS3D from "@mkkellogg/gaussian-splats-3d";
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// 확장자 기반 포맷 추정 (GS3D 전용 + PLY 식별)
const guessFormat = (name = "") => {
  const s = name.toLowerCase();
  if (s.endsWith(".ksplat")) return GS3D.SceneFormat.KSplat;
  if (s.endsWith(".splat")) return GS3D.SceneFormat.Splat;
  if (s.endsWith(".ply")) return GS3D.SceneFormat.Ply; // three.js 경로에서만 사용
  return null;
};

// GS3D 카메라 씬 핏
function fitCameraToScene(viewer) {
  try {
    const sc = viewer?.world?.scene;
    if (!sc) return;
    const box = new THREE.Box3().setFromObject(sc);
    const c = new THREE.Vector3();
    const sz = new THREE.Vector3();
    box.getCenter(c);
    box.getSize(sz);
    const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
    const cam = viewer.camera;
    const fov = ((cam?.fov ?? 50) * Math.PI) / 180;
    const dist = (maxDim * 1.2) / (2 * Math.tan(fov / 2));
    cam.near = Math.max(0.01, dist * 0.001);
    cam.far = Math.max(cam.near + 1, dist * 20);
    cam.fov = 45;
    cam.updateProjectionMatrix?.();
    const pos = c
      .clone()
      .add(new THREE.Vector3(0.9, 0.6, 0.9).normalize().multiplyScalar(dist * 1.5));
    viewer.setCameraLookAt({ position: pos.toArray(), target: c.toArray() });
  } catch (err) {
    console.error("카메라 조정 오류:", err);
  }
}

export default function UploadCard({ height = 360, compact = false }) {
  const mountRef = useRef(null); // 캔버스가 붙는 컨테이너
  const viewerRef = useRef(null); // GS3D 뷰어 참조
  const threeRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    rafId: null,
    resizeObs: null,
    object: null,
  });
  const [fileName, setFileName] = useState("");

  // three.js 리소스 정리
  function disposeThree() {
    const t = threeRef.current;
    if (t.resizeObs) {
      try {
        t.resizeObs.disconnect();
      } catch {}
      t.resizeObs = null;
    }
    if (t.rafId) {
      cancelAnimationFrame(t.rafId);
      t.rafId = null;
    }
    if (t.controls) {
      try {
        t.controls.dispose();
      } catch {}
      t.controls = null;
    }
    if (t.renderer) {
      try {
        t.renderer.dispose();
      } catch {}
      t.renderer = null;
    }
    if (t.scene) {
      try {
        t.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            if (obj.material?.map) obj.material.map.dispose?.();
            obj.material?.dispose?.();
          }
        });
      } catch {}
      t.scene = null;
    }
    t.camera = null;
    t.object = null;

    // 기존 three 캔버스 제거
    const el = mountRef.current;
    if (el) {
      [...el.querySelectorAll("canvas")].forEach((c) => {
        if (c.dataset?.renderer === "three") c.remove();
      });
    }
  }

  // three.js 카메라 씬 핏
  function fitCameraThree(obj) {
    const t = threeRef.current;
    if (!t.camera || !obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    const c = new THREE.Vector3();
    const sz = new THREE.Vector3();
    box.getCenter(c);
    box.getSize(sz);
    const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
    const fov = (t.camera.fov * Math.PI) / 180;
    const dist = (maxDim * 1.4) / (2 * Math.tan(fov / 2));
    t.camera.near = Math.max(0.01, dist * 0.001);
    t.camera.far = Math.max(t.camera.near + 1, dist * 50);
    t.camera.updateProjectionMatrix();
    const pos = c
      .clone()
      .add(new THREE.Vector3(0.9, 0.6, 0.9).normalize().multiplyScalar(dist * 1.6));
    t.camera.position.copy(pos);
    t.controls?.target.copy(c);
    t.controls?.update();
  }

  // .ply를 three.js로 렌더링
  async function renderPLYWithThree(url) {
    disposeThree();
    const el = mountRef.current;
    if (!el) throw new Error("mount not ready");

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || 1, el.clientHeight || 1);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.dataset.renderer = "three";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(
      45,
      (el.clientWidth || 1) / (el.clientHeight || 1),
      0.01,
      2000
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 라이팅
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 5, 2);
    scene.add(dir);

    // PLY 로드
    const loader = new PLYLoader();
    const geometry = await new Promise((resolve, reject) =>
      loader.load(url, resolve, undefined, reject)
    );

    let object;
    if (geometry.index || geometry.getAttribute("normal")) {
      // 표면 메시
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      const hasColor = !!geometry.getAttribute("color");
      const material = new THREE.MeshStandardMaterial({
        color: hasColor ? 0xffffff : 0x5fb3ff,
        vertexColors: hasColor,
        roughness: 0.6,
        metalness: 0.1,
      });
      object = new THREE.Mesh(geometry, material);
    } else {
      // 포인트 클라우드
      const hasColor = !!geometry.getAttribute("color");
      const material = new THREE.PointsMaterial({
        size: 0.01,
        sizeAttenuation: true,
        color: hasColor ? 0xffffff : 0x5fb3ff,
        vertexColors: hasColor,
      });
      object = new THREE.Points(geometry, material);
    }
    scene.add(object);

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      rafId: null,
      resizeObs: null,
      object,
    };
    fitCameraThree(object);

    const animate = () => {
      threeRef.current.rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 리사이즈 대응
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(el);
    threeRef.current.resizeObs = ro;
  }

  // GS3D 뷰어 초기화 및 캔버스 스타일 패치
  useEffect(() => {
    if (!mountRef.current || viewerRef.current) return;

    const v = new GS3D.Viewer({
      rootElement: mountRef.current,
      initialCameraPosition: [3, 2, 3],
      sharedMemoryForWorkers: !!window.crossOriginIsolated,
      showLoadingUI: true,
    });
    viewerRef.current = v;

    const patch = () => {
      const cvs = mountRef.current?.querySelector("canvas");
      if (cvs) {
        cvs.style.position = "absolute";
        cvs.style.inset = "0";
        cvs.style.width = "100%";
        cvs.style.height = "100%";
        cvs.style.display = "block";
        cvs.style.boxSizing = "border-box";
      }
    };
    patch();
    const mo = new MutationObserver(patch);
    mo.observe(mountRef.current, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      try {
        viewerRef.current?.dispose?.();
      } catch {}
      viewerRef.current = null;
      disposeThree();
    };
  }, []);

  // 파일 업로드 핸들러
  async function handleLocalFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const url = URL.createObjectURL(file);
    const format = guessFormat(file.name);
    if (!format) {
      alert("지원: .ksplat / .splat / .ply");
      URL.revokeObjectURL(url);
      return;
    }

    // .ply는 three.js로 렌더링
    if (file.name.toLowerCase().endsWith(".ply")) {
      try {
        try {
          await viewerRef.current?.clear?.();
        } catch {}
        await renderPLYWithThree(url);
      } catch (err) {
        console.error("PLY 렌더 실패:", err);
        alert(`PLY 렌더 실패: ${err?.message || err}`);
      } finally {
        URL.revokeObjectURL(url);
      }
      return;
    }

    // ksplat/splat는 GS3D로 렌더링
    disposeThree();
    const viewer = viewerRef.current;
    try {
      await viewer.clear?.();
      await viewer.addSplatScene(url, { format, showLoadingUI: true });
      fitCameraToScene(viewer);
      requestAnimationFrame(() => fitCameraToScene(viewer));
    } catch (err) {
      console.error("스플랫 로드 실패:", err);
      alert("파일을 로드하지 못했습니다. 콘솔 오류를 확인해주세요.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const grid = compact
    ? {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
        alignItems: "start",
        gridAutoRows: "min-content",
      }
    : {
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        gap: 16,
        alignItems: "start",
        gridAutoRows: "min-content",
      };

  return (
    <div style={grid}>
      {/* 뷰어/렌더러를 담는 높이 리미터 */}
      <div
        style={{
          height,
          width: "100%",
          position: "relative",
          background: "#0b1430",
          outline: "1px dashed rgba(255,255,255,.25)",
          borderRadius: 12,
          overflow: "hidden",
          boxSizing: "border-box",
          contain: "size layout paint",
        }}
      >
        <div id="gs3d-mount" ref={mountRef} style={{ position: "absolute", inset: 0 }} />
      </div>

      {/* 업로드 패널 */}
      <div
        style={{
          background: "#0f162e",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h3 style={{ margin: "4px 0 8px" }}>파일 업로드</h3>
        <p style={{ color: "#9fb0d0" }}>
          지원: <code>.ksplat</code> / <code>.splat</code> / <code>.ply</code>
        </p>
        <input type="file" accept=".ksplat,.splat,.ply" onChange={handleLocalFile} />
        <div style={{ fontSize: 13, color: "#9fb0d0", marginTop: 8 }}>
          {fileName ? `선택됨: ${fileName}` : "선택된 파일 없음"}
        </div>
      </div>
    </div>
  );
}
