// src/components/Viewer3D.js
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
        console.log("GS3D fitCameraToScene 시작:", { isFlipped });
        const sc = viewer?.world?.scene;
        if (!sc) {
            console.warn("GS3D scene이 없습니다");
            return;
        }
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
            console.log("GS3D 카메라 위치 (반전):", { position: pos.toArray(), target: c.toArray() });
        } else {
            // 일반 시점: 아래에서 위로 보는 자연스러운 각도
            const pos = c.clone().add(new THREE.Vector3(0.5, -1.2, 1.0).normalize().multiplyScalar(dist * 1.5));
            viewer.setCameraLookAt({ position: pos.toArray(), target: c.toArray() });
            console.log("GS3D 카메라 위치 (일반):", { position: pos.toArray(), target: c.toArray() });
        }

        console.log("GS3D 카메라 위치 조정 완료:", { target: c.toArray(), flipped: isFlipped });
    } catch (err) {
        console.error("GS3D 카메라 조정 오류:", err);
    }
}

export default function Viewer3D({ file, isFlipped, onLoadComplete, onError, onClick }) {
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
    const [isLoading, setIsLoading] = useState(false);

    // GS3D 캔버스 가시성 토글 (three.js 렌더 시 겹침 방지)
    function setGS3DCanvasVisible(visible) {
        const el = mountRef.current;
        if (!el) return;
        const gsCanvas = [...el.querySelectorAll('canvas')].find(c => !c.dataset?.renderer);
        if (gsCanvas) {
            gsCanvas.style.visibility = visible ? 'visible' : 'hidden';
            gsCanvas.style.pointerEvents = visible ? 'auto' : 'none';
        }
    }

    // three.js 리소스 정리
    function disposeThree() {
        const t = threeRef.current;
        if (t.resizeObs) {
            try {
                t.resizeObs.disconnect();
            } catch { }
            t.resizeObs = null;
        }
        if (t.rafId) {
            cancelAnimationFrame(t.rafId);
            t.rafId = null;
        }
        if (t.controls) {
            try {
                t.controls.dispose();
            } catch { }
            t.controls = null;
        }
        if (t.renderer) {
            try {
                t.renderer.dispose();
            } catch { }
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
            } catch { }
            t.scene = null;
        }
        t.camera = null;
        t.object = null;

        // 안전한 three 캔버스 제거 (removeChild 에러 방지)
        const el = mountRef.current;
        if (el) {
            try {
                const canvases = el.querySelectorAll("canvas[data-renderer='three']");
                canvases.forEach((canvas) => {
                    try {
                        if (canvas && canvas.isConnected && typeof canvas.remove === 'function') {
                            canvas.remove();
                        } else if (canvas && canvas.parentNode) {
                            try { canvas.parentNode.removeChild(canvas); } catch { /* no-op */ }
                        }
                    } catch (innerError) {
                        console.warn("개별 캔버스 제거 중 에러 (무시됨):", innerError);
                    }
                });
            } catch (error) {
                console.warn("Three.js 캔버스 정리 중 에러 (무시됨):", error);
                // 에러가 나도 계속 진행
            }
        }
    }

    // three.js 카메라 씬 핏
    function fitCameraThree(obj, isFlipped = false) {
        console.log("Three.js fitCameraThree 시작:", { isFlipped });
        const t = threeRef.current;
        if (!t.camera || !obj) {
            console.warn("Three.js 카메라 또는 객체가 없습니다");
            return;
        }
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
            console.log("Three.js 카메라 위치 (반전):", pos.toArray());
        } else {
            // 일반 시점: 아래에서 위로 보는 자연스러운 각도  
            const pos = c.clone().add(new THREE.Vector3(0.5, -1.2, 1.0).normalize().multiplyScalar(dist * 1.6));
            t.camera.position.copy(pos);
            console.log("Three.js 카메라 위치 (일반):", pos.toArray());
        }

        t.controls?.target.copy(c);
        t.controls?.update();

        console.log("Three.js 카메라 위치 조정 완료:", { target: c.toArray(), flipped: isFlipped });
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
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true  // 캡쳐를 위해 추가
        });
        renderer.setClearColor(0x000000, 0);
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

        // 클릭 이벤트 추가
        canvas.addEventListener('click', (event) => {
            if (onClick && threeRef.current?.camera && threeRef.current?.object) {
                const rect = canvas.getBoundingClientRect();
                const mouse = new THREE.Vector2();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, threeRef.current.camera);

                const intersects = raycaster.intersectObject(threeRef.current.object);
                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    onClick({
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        screenX: event.clientX,
                        screenY: event.clientY
                    });
                }
            }
        });

        // 안전한 캔버스 추가
        try {
            if (el && canvas) {
                el.appendChild(canvas);
                setGS3DCanvasVisible(false);
            }
        } catch (error) {
            console.error("캔버스 추가 중 에러:", error);
            throw new Error("캔버스를 추가할 수 없습니다");
        }

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
                webGLOptions: {
                    preserveDrawingBuffer: true  // 캡쳐를 위해 추가
                }
            });
            viewerRef.current = v;

            // 전역 접근을 위해 window에 뷰어 참조 저장
            window.gs3dViewer = v;

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
                    // GS3D Viewer 정리 - dispose 중 removeChild 예외 방지용 패치
                    const el = mountRef.current;
                    const originalElRemove = el?.removeChild;
                    const originalBodyRemove = document.body.removeChild;

                    if (el && typeof originalElRemove === 'function') {
                        el.removeChild = function (child) {
                            try {
                                if (child && child.parentNode === el) {
                                    return originalElRemove.call(el, child);
                                }
                            } catch { /* no-op */ }
                            return child;
                        };
                    }

                    document.body.removeChild = function (child) {
                        try {
                            if (child && child.parentNode === document.body) {
                                return originalBodyRemove.call(document.body, child);
                            }
                        } catch { /* no-op */ }
                        return child;
                    };

                    try {
                        // 외부 렌더러(three.js) 경유 가능성이 있으므로 내부 body 제거 로직을 비활성화 힌트
                        if (viewerRef.current) {
                            try { viewerRef.current.usingExternalRenderer = true; } catch { }
                        }
                        viewerRef.current?.dispose?.();
                    } finally {
                        // 원복
                        if (el && typeof originalElRemove === 'function') {
                            el.removeChild = originalElRemove;
                        }
                        document.body.removeChild = originalBodyRemove;
                    }
                } catch (e) {
                    console.warn("GS3D Viewer dispose 오류:", e);
                }
                viewerRef.current = null;

                // Three.js 정리 (안전하게)
                try {
                    disposeThree();
                } catch (e) {
                    console.warn("Three.js cleanup 오류:", e);
                }
            };
        } catch (error) {
            console.error("GS3D Viewer 초기화 실패:", error);
            viewerRef.current = null;
        }
    }, []);

    // 파일 로딩 effect
    useEffect(() => {
        if (!file) return;

        const loadFile = async () => {
            setIsLoading(true);
            console.log(`파일 로딩 시작: ${file.name}, 크기: ${file.size}바이트`);

            const url = URL.createObjectURL(file);
            const format = guessFormat(file.name);
            if (!format) {
                onError?.("지원하지 않는 파일 형식입니다. (.ksplat / .splat / .ply만 지원)");
                URL.revokeObjectURL(url);
                setIsLoading(false);
                return;
            }

            console.log(`파일 형식: ${file.name.toLowerCase().endsWith('.ply') ? 'PLY (Three.js)' : 'Splat (GS3D)'}`);

            try {
                // .ply는 three.js로 렌더링
                if (file.name.toLowerCase().endsWith(".ply")) {
                    console.log("PLY 파일 렌더링 시작...");
                    // GS3D 뷰어 정리 (안전하게)
                    try {
                        await viewerRef.current?.clear?.();
                    } catch { }
                    // Three.js에서 PLY 렌더링
                    await renderPLYWithThree(url);
                    console.log("PLY 파일 렌더링 완료!");
                } else {
                    // ksplat/splat는 GS3D로 렌더링
                    console.log("Splat 파일 렌더링 시작...");
                    // Three.js 정리 (안전하게)
                    disposeThree();
                    setGS3DCanvasVisible(true);
                    const viewer = viewerRef.current;

                    if (!viewer) {
                        throw new Error("GS3D 뷰어가 초기화되지 않았습니다");
                    }

                    console.log("기존 씬 정리 중...");
                    await viewer.clear?.();

                    console.log("새 씬 로드 중...", { format, url: url.slice(0, 50) + "..." });

                    // GS3D 로드 시 에러 처리 개선
                    try {
                        await viewer.addSplatScene(url, {
                            format,
                            showLoadingUI: true,
                            // 추가 옵션들
                            splatAlphaRemovalThreshold: 1,
                            halfPrecisionCovariancesOnGPU: true,
                            devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2)
                        });
                    } catch (splatError) {
                        console.error("Splat 파일 로드 세부 오류:", splatError);

                        // 구체적인 오류 메시지 제공
                        if (splatError.message.includes('Invalid typed array length') ||
                            splatError.message.includes('RangeError')) {
                            throw new Error("파일이 손상되었거나 올바른 형식이 아닙니다. 다른 파일을 시도해보세요.");
                        } else if (splatError.message.includes('network') ||
                            splatError.message.includes('fetch')) {
                            throw new Error("네트워크 오류로 파일을 불러올 수 없습니다. 연결을 확인하고 다시 시도해주세요.");
                        } else {
                            throw new Error(`파일 로드 실패: ${splatError.message}`);
                        }
                    }

                    console.log("씬 로드 완료, 렌더링 시작 시도...");

                    if (viewer.start) {
                        await viewer.start();
                        console.log("뷰어 시작됨");
                    }

                    // GS3D 캔버스에 클릭 이벤트 추가
                    const gsCanvas = mountRef.current?.querySelector('canvas:not([data-renderer])');
                    if (gsCanvas && onClick) {
                        const handleGSClick = (event) => {
                            const rect = gsCanvas.getBoundingClientRect();
                            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                            // GS3D에서는 정확한 3D 포인트를 가져오기 어려우므로 근사값 사용
                            onClick({
                                x: x * 5, // 대략적인 스케일
                                y: y * 5,
                                z: 0,
                                screenX: event.clientX,
                                screenY: event.clientY,
                                isApproximate: true
                            });
                        };

                        gsCanvas.addEventListener('click', handleGSClick);

                        // 클릭 이벤트 정리를 위한 참조 저장
                        gsCanvas._clickHandler = handleGSClick;
                    }

                    console.log("카메라 조정 중...");
                    fitCameraToScene(viewer, isFlipped);
                    setTimeout(() => fitCameraToScene(viewer, isFlipped), 500);
                    setTimeout(() => fitCameraToScene(viewer, isFlipped), 1000);

                    console.log("Splat 파일 렌더링 완료!");
                }

                onLoadComplete?.();
            } catch (err) {
                console.error("파일 로딩 실패:", err);
                onError?.(err?.message || "파일 로딩에 실패했습니다");
            } finally {
                URL.revokeObjectURL(url);
                setIsLoading(false);
            }
        };

        loadFile();
    }, [file, isFlipped]);

    // 카메라 방향 변경 effect
    useEffect(() => {
        if (!file) return;

        console.log("카메라 방향 변경 트리거:", { isFlipped, file: file?.name });

        // 약간의 지연을 두고 카메라 재조정
        const adjustCamera = () => {
            let adjusted = false;

            if (viewerRef.current) {
                console.log("GS3D 뷰어 카메라 조정 중...", isFlipped);
                fitCameraToScene(viewerRef.current, isFlipped);
                adjusted = true;
            }

            if (threeRef.current?.object) {
                console.log("Three.js 카메라 조정 중...", isFlipped);
                fitCameraThree(threeRef.current.object, isFlipped);
                adjusted = true;
            }

            if (!adjusted) {
                console.warn("조정할 카메라가 없습니다");
            }
        };

        // 즉시 조정
        adjustCamera();

        // 약간의 지연 후 다시 조정 (안정성을 위해)
        setTimeout(adjustCamera, 100);
        setTimeout(adjustCamera, 300);
    }, [isFlipped, file]);

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                background: "transparent",
                borderRadius: 12,
                overflow: "hidden",
                boxSizing: "border-box",
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
                    background: "transparent"
                }}
            />

            {/* 로딩 인디케이터 */}
            {isLoading && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.5)",
                    color: "white",
                    fontSize: 18,
                    zIndex: 10
                }}>
                    로딩 중...
                </div>
            )}

            {/* 중앙 안내 텍스트 */}
            {!file && (
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
    );
}