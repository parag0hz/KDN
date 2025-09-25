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
function fitCameraToScene(viewer, isFlipped = false) {
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
    
    // 자연스러운 카메라 위치 (GitHub 예제 기반)
    if (isFlipped) {
      // 상하 반전 시: 위에서 아래로 보는 시점
      const pos = c.clone().add(new THREE.Vector3(0.5, 1.5, 0.8).normalize().multiplyScalar(dist * 1.5));
      viewer.setCameraLookAt({ position: pos.toArray(), target: c.toArray() });
    } else {
      // 일반 시점: 아래에서 위로 보는 자연스러운 각도
      const pos = c.clone().add(new THREE.Vector3(0.5, -1.2, 1.0).normalize().multiplyScalar(dist * 1.5));
      viewer.setCameraLookAt({ position: pos.toArray(), target: c.toArray() });
    }
    
    console.log("GS3D 카메라 위치 조정:", { target: c.toArray(), flipped: isFlipped });
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
  const [isFlipped, setIsFlipped] = useState(false);

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
  function fitCameraThree(obj, isFlipped = false) {
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
    
    // 자연스러운 카메라 위치
    if (isFlipped) {
      // 상하 반전 시: 위에서 아래로 보는 시점
      const pos = c.clone().add(new THREE.Vector3(0.5, 1.5, 1.0).normalize().multiplyScalar(dist * 1.6));
      t.camera.position.copy(pos);
    } else {
      // 일반 시점: 아래에서 위로 보는 자연스러운 각도  
      const pos = c.clone().add(new THREE.Vector3(0.5, -1.2, 1.0).normalize().multiplyScalar(dist * 1.6));
      t.camera.position.copy(pos);
    }
    
    t.controls?.target.copy(c);
    t.controls?.update();
    
    console.log("Three.js 카메라 위치 조정:", { target: c.toArray(), flipped: isFlipped });
  }

  // .ply를 three.js로 렌더링
  async function renderPLYWithThree(url) {
    console.log("renderPLYWithThree 시작, URL:", url.slice(0, 50) + "...");
    disposeThree();
    const el = mountRef.current;
    if (!el) {
      console.error("Mount element not ready");
      throw new Error("mount not ready");
    }

    console.log("Three.js 렌더러 초기화 중...", "컨테이너 크기:", el.clientWidth, "x", el.clientHeight);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x0b1430);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || 400, el.clientHeight || 360);
    
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.zIndex = "1";
    canvas.dataset.renderer = "three";
    
    el.innerHTML = '';
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      (el.clientWidth || 400) / (el.clientHeight || 360),
      0.01,
      2000
    );
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    // 라이팅 개선
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 5, 5);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dir2.position.set(-5, -5, -5);
    scene.add(dir2);

    console.log("PLY 파일 로딩 중...");
    const loader = new PLYLoader();
    const geometry = await new Promise((resolve, reject) =>
      loader.load(url, 
        (geo) => {
          console.log("PLY 로드 성공:", geo);
          console.log("Vertices:", geo.attributes.position?.count || 0);
          resolve(geo);
        }, 
        (progress) => {
          console.log("PLY 로드 진행:", progress);
        }, 
        (error) => {
          console.error("PLY 로드 오류:", error);
          reject(error);
        }
      )
    );

    let object;
    if (geometry.index || geometry.getAttribute("normal")) {
      console.log("메쉬로 렌더링");
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      const hasColor = !!geometry.getAttribute("color");
      const material = new THREE.MeshLambertMaterial({
        color: hasColor ? 0xffffff : 0x5fb3ff,
        vertexColors: hasColor,
      });
      object = new THREE.Mesh(geometry, material);
    } else {
      console.log("포인트 클라우드로 렌더링");
      const hasColor = !!geometry.getAttribute("color");
      const material = new THREE.PointsMaterial({
        size: 0.02,
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
    
    console.log("카메라 위치 조정 중...");
    fitCameraThree(object, isFlipped);

    console.log("애니메이션 루프 시작...");
    const animate = () => {
      threeRef.current.rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 400;
      const h = el.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(el);
    threeRef.current.resizeObs = ro;
    
    console.log("Three.js PLY 렌더링 설정 완료");
  }

  // GS3D 뷰어 초기화
  useEffect(() => {
    if (!mountRef.current || viewerRef.current) return;

    console.log("GS3D Viewer 초기화 중...");
    try {
      const v = new GS3D.Viewer({
        rootElement: mountRef.current,
        cameraUp: [0, -1, -0.6],  // Y축 아래 방향이 업 벡터
        initialCameraPosition: [0, -4, 6],  // Y축 음수에서 시작
        initialCameraLookAt: [0, 0, 0],
        sharedMemoryForWorkers: !!window.crossOriginIsolated,
        showLoadingUI: true,
      });
      viewerRef.current = v;
      console.log("GS3D Viewer 초기화 완료");

      const patch = () => {
        const cvs = mountRef.current?.querySelector("canvas");
        if (cvs && !cvs.dataset.renderer) {
          cvs.style.position = "absolute";
          cvs.style.top = "0";
          cvs.style.left = "0";
          cvs.style.width = "100%";
          cvs.style.height = "100%";
          cvs.style.display = "block";
          cvs.style.boxSizing = "border-box";
          cvs.style.zIndex = "1";
          console.log("GS3D 캔버스 스타일 패치 완료");
        }
      };
      
      setTimeout(patch, 100);
      const mo = new MutationObserver(patch);
      mo.observe(mountRef.current, { childList: true, subtree: true });

      return () => {
        mo.disconnect();
        try {
          viewerRef.current?.dispose?.();
        } catch (e) {
          console.warn("GS3D Viewer dispose 오류:", e);
        }
        viewerRef.current = null;
        disposeThree();
      };
    } catch (error) {
      console.error("GS3D Viewer 초기화 실패:", error);
      viewerRef.current = null;
    }
  }, []);

  // 파일 업로드 핸들러
  async function handleLocalFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log(`파일 선택됨: ${file.name}, 크기: ${file.size}바이트`);
    setFileName(file.name);

    const url = URL.createObjectURL(file);
    const format = guessFormat(file.name);
    if (!format) {
      alert("지원: .ksplat / .splat / .ply");
      URL.revokeObjectURL(url);
      return;
    }

    console.log(`파일 형식: ${file.name.toLowerCase().endsWith('.ply') ? 'PLY (Three.js)' : 'Splat (GS3D)'}`);

    // .ply는 three.js로 렌더링
    if (file.name.toLowerCase().endsWith(".ply")) {
      try {
        console.log("PLY 파일 렌더링 시작...");
        try {
          await viewerRef.current?.clear?.();
        } catch {}
        await renderPLYWithThree(url);
        console.log("PLY 파일 렌더링 완료!");
      } catch (err) {
        console.error("PLY 렌더 실패:", err);
        alert(`PLY 렌더 실패: ${err?.message || err}`);
      } finally {
        URL.revokeObjectURL(url);
      }
      return;
    }

    // ksplat/splat는 GS3D로 렌더링
    console.log("Splat 파일 렌더링 시작...");
    disposeThree();
    const viewer = viewerRef.current;
    
    if (!viewer) {
      console.error("GS3D 뷰어가 초기화되지 않았습니다");
      alert("뷰어가 준비되지 않았습니다. 페이지를 새로고침하세요.");
      URL.revokeObjectURL(url);
      return;
    }

    try {
      console.log("기존 씬 정리 중...");
      await viewer.clear?.();
      
      console.log("새 씬 로드 중...", { format, url: url.slice(0, 50) + "..." });
      await viewer.addSplatScene(url, { format, showLoadingUI: true });
      
      console.log("씬 로드 완료, 렌더링 시작 시도...");
      
      if (viewer.start) {
        await viewer.start();
        console.log("뷰어 시작됨");
      }
      
      console.log("카메라 조정 중...");
      fitCameraToScene(viewer, isFlipped);
      setTimeout(() => fitCameraToScene(viewer, isFlipped), 500);
      setTimeout(() => fitCameraToScene(viewer, isFlipped), 1000);
      
      console.log("Splat 파일 렌더링 완료!");
    } catch (err) {
      console.error("스플랫 로드 실패:", err);
      alert(`파일 로드 실패: ${err?.message || err}`);
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
          minHeight: 300,
        }}
      >
        <div 
          id="gs3d-mount" 
          ref={mountRef} 
          style={{ 
            position: "absolute", 
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
            background: "rgba(11, 20, 48, 0.5)"
          }} 
        />
        {/* 디버그용 정보 */}
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "8px 12px",
          borderRadius: 4,
          fontSize: 11,
          zIndex: 10,
          pointerEvents: "none",
          fontFamily: "monospace"
        }}>
          <div>뷰어 크기: {mountRef.current?.clientWidth || 0} × {mountRef.current?.clientHeight || 0}</div>
          <div>GS3D 초기화: {viewerRef.current ? '✓' : '✗'}</div>
          <div>Three.js 활성: {threeRef.current?.renderer ? '✓' : '✗'}</div>
          {fileName && <div>파일: {fileName}</div>}
        </div>
        {/* 중앙 안내 텍스트 */}
        {!fileName && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            zIndex: 5,
            pointerEvents: "none"
          }}>
            파일을 업로드하여 3D 모델을 확인하세요
          </div>
        )}
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
        
        {/* Y축 반전 토글 버튼 */}
        {fileName && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              onClick={() => {
                setIsFlipped(!isFlipped);
                // 즉시 카메라 재조정
                setTimeout(() => {
                  if (viewerRef.current) fitCameraToScene(viewerRef.current, !isFlipped);
                  if (threeRef.current?.object) fitCameraThree(threeRef.current.object, !isFlipped);
                }, 100);
              }}
              style={{
                background: isFlipped ? "#4f46e5" : "#374151",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              {isFlipped ? "원래 방향" : "상하 반전"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}