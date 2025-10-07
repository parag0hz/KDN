import { useState, useRef, useEffect } from "react";
import Viewer3D from "../components/Viewer3D";

export default function Viewer3DPage() {
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [reports, setReports] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [isReporting, setIsReporting] = useState(false);
    const fileInputRef = useRef(null);
    const viewerRef = useRef(null);

    // 3D 뷰어 클릭 핸들러
    const handle3DClick = (point) => {
        // 뷰어 컨테이너의 상대 좌표로 변환
        const viewerContainer = viewerRef.current;
        if (viewerContainer && point.screenX && point.screenY) {
            const containerRect = viewerContainer.getBoundingClientRect();
            const relativeX = point.screenX - containerRect.left;
            const relativeY = point.screenY - containerRect.top;

            const updatedPoint = {
                ...point,
                screenX: relativeX,
                screenY: relativeY
            };

            setSelectedPoint(updatedPoint);
            console.log('3D 포인트 클릭:', updatedPoint);
        } else {
            setSelectedPoint(point);
            console.log('3D 포인트 클릭:', point);
        }
    };

    // 3D 화면 캡쳐 함수
    const capture3DScreen = async () => {
        try {
            if (!viewerRef.current) {
                throw new Error('3D 뷰어 참조를 찾을 수 없습니다.');
            }

            // 마커가 있는 전체 뷰어 영역 캡처를 위해 html2canvas 시도
            try {
                // html2canvas가 있는지 확인하고 사용
                if (typeof window !== 'undefined' && window.html2canvas) {
                    console.log('html2canvas를 사용하여 전체 뷰어 캡처 시도...');
                    const canvas = await window.html2canvas(viewerRef.current, {
                        backgroundColor: null,
                        scale: 1,
                        logging: false,
                        useCORS: true,
                        allowTaint: true
                    });

                    const blob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png', 1.0);
                    });

                    if (blob && blob.size > 1000) {
                        console.log('html2canvas 캡처 성공:', blob.size, 'bytes');
                        return blob;
                    }
                }
            } catch (html2canvasError) {
                console.warn('html2canvas 캡처 실패, WebGL 캔버스 직접 캡처로 대체:', html2canvasError);
            }

            // 기존 WebGL 캔버스 직접 캡처 방식 (폴백)
            const canvases = viewerRef.current.querySelectorAll('canvas');
            console.log('발견된 캔버스 수:', canvases.length);

            if (canvases.length === 0) {
                throw new Error('Canvas 요소를 찾을 수 없습니다.');
            }

            // 활성 캔버스 찾기 (visible이고 크기가 있는 것)
            let activeCanvas = null;
            for (const canvas of canvases) {
                const style = window.getComputedStyle(canvas);
                const rect = canvas.getBoundingClientRect();

                console.log('캔버스 정보:', {
                    width: canvas.width,
                    height: canvas.height,
                    visible: style.visibility !== 'hidden',
                    display: style.display !== 'none',
                    rectWidth: rect.width,
                    rectHeight: rect.height,
                    renderer: canvas.dataset?.renderer || 'unknown'
                });

                if (style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    canvas.width > 0 &&
                    canvas.height > 0 &&
                    rect.width > 0 &&
                    rect.height > 0) {
                    activeCanvas = canvas;
                    break;
                }
            }

            if (!activeCanvas) {
                throw new Error('활성 Canvas를 찾을 수 없습니다.');
            }

            console.log('캡쳐할 캔버스:', {
                width: activeCanvas.width,
                height: activeCanvas.height,
                renderer: activeCanvas.dataset?.renderer || 'GS3D'
            });

            // WebGL 컨텍스트 확인 및 강제 렌더링
            const gl = activeCanvas.getContext('webgl') || activeCanvas.getContext('webgl2') ||
                activeCanvas.getContext('experimental-webgl');

            if (gl) {
                console.log('WebGL 컨텍스트 정보:', {
                    drawingBufferWidth: gl.drawingBufferWidth,
                    drawingBufferHeight: gl.drawingBufferHeight,
                    contextAttributes: gl.getContextAttributes()
                });

                // 강제로 한 프레임 더 렌더링
                try {
                    if (window.gs3dViewer && window.gs3dViewer.render) {
                        await window.gs3dViewer.render();
                        console.log('GS3D 강제 렌더링 완료');
                    }
                } catch (renderError) {
                    console.warn('강제 렌더링 실패:', renderError);
                }

                // 잠시 대기 (렌더링 완료 보장)
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(resolve);
                    });
                });
            }

            // Canvas를 Blob으로 변환하되, 마커 정보를 오버레이로 추가
            let blob = null;

            // 방법 1: 마커 정보와 함께 합성된 캔버스 생성
            try {
                const combinedCanvas = document.createElement('canvas');
                const ctx = combinedCanvas.getContext('2d');

                combinedCanvas.width = activeCanvas.width;
                combinedCanvas.height = activeCanvas.height;

                // 3D 캔버스 내용 그리기
                ctx.drawImage(activeCanvas, 0, 0);

                // 마커가 있다면 캔버스에 직접 그리기
                if (selectedPoint && selectedPoint.screenX && selectedPoint.screenY) {
                    const viewerRect = viewerRef.current.getBoundingClientRect();
                    const canvasRect = activeCanvas.getBoundingClientRect();

                    // 뷰어 좌표를 캔버스 좌표로 변환
                    const scaleX = activeCanvas.width / canvasRect.width;
                    const scaleY = activeCanvas.height / canvasRect.height;

                    const markerX = selectedPoint.screenX * scaleX;
                    const markerY = selectedPoint.screenY * scaleY;

                    // 마커 그리기
                    ctx.save();

                    // 외부 원 (펄스 효과)
                    ctx.beginPath();
                    ctx.arc(markerX, markerY, 15, 0, 2 * Math.PI);
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 3;
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                    ctx.fill();
                    ctx.stroke();

                    // 내부 점
                    ctx.beginPath();
                    ctx.arc(markerX, markerY, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = '#ff0000';
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.fill();
                    ctx.stroke();

                    ctx.restore();

                    console.log('마커를 캔버스에 추가:', { markerX, markerY });
                }

                blob = await new Promise(resolve => {
                    combinedCanvas.toBlob(resolve, 'image/png', 1.0);
                });

                if (blob && blob.size > 1000) {
                    console.log('마커 포함 캔버스 생성 성공:', blob.size, 'bytes');
                    return blob;
                }
            } catch (combinedError) {
                console.warn('마커 포함 캔버스 생성 실패:', combinedError);
            }

            // 방법 2: 기존 toBlob 방식 (폴백)
            try {
                blob = await new Promise((resolve, reject) => {
                    activeCanvas.toBlob(
                        (result) => {
                            if (result && result.size > 1000) {
                                console.log('toBlob 성공:', result.size, 'bytes');
                                resolve(result);
                            } else {
                                reject(new Error(`toBlob 결과가 너무 작습니다: ${result?.size || 0} bytes`));
                            }
                        },
                        'image/png',
                        1.0
                    );
                });
            } catch (toBlobError) {
                console.warn('toBlob 실패:', toBlobError);

                // 방법 3: toDataURL 백업
                try {
                    const dataURL = activeCanvas.toDataURL('image/png', 1.0);
                    if (dataURL && dataURL.length > 5000) {
                        const response = await fetch(dataURL);
                        blob = await response.blob();
                        console.log('DataURL을 Blob으로 변환 완료:', blob.size, 'bytes');
                    } else {
                        throw new Error('toDataURL 결과가 비어있거나 너무 작습니다.');
                    }
                } catch (dataURLError) {
                    console.error('toDataURL도 실패:', dataURLError);
                    throw new Error('모든 캡쳐 방법이 실패했습니다.');
                }
            }

            if (!blob || blob.size < 1000) {
                throw new Error(`캡쳐된 이미지가 너무 작습니다: ${blob?.size || 0} bytes`);
            }

            console.log('최종 캡쳐 완료:', {
                size: blob.size,
                type: blob.type
            });

            return blob;

        } catch (error) {
            console.error('3D 화면 캡쳐 오류:', error);
            throw error;
        }
    };

    // 제보하기 함수
    const handleReport = async () => {
        try {
            setIsReporting(true);

            // 선택된 포인트가 없으면 알림
            if (!selectedPoint) {
                alert('3D 화면에서 위치를 클릭하여 선택해주세요.');
                return;
            }

            // 3D 화면 캡쳐
            const capturedImage = await capture3DScreen();

            console.log('캡쳐된 이미지:', {
                size: capturedImage.size,
                type: capturedImage.type
            });

            // API 전송용 FormData 생성
            const formData = new FormData();
            formData.append('image', capturedImage, `3d-report-${Date.now()}.png`);
            formData.append('type', '3D 뷰어 제보');
            formData.append('timestamp', new Date().toISOString());

            // 3D 좌표 정보 추가
            const coordinateData = {
                x: selectedPoint.x,
                y: selectedPoint.y,
                z: selectedPoint.z,
                screenX: selectedPoint.screenX,
                screenY: selectedPoint.screenY,
                isApproximate: selectedPoint.isApproximate || false
            };
            formData.append('coordinates', JSON.stringify(coordinateData));

            // 선택된 제보 정보가 있다면 추가
            if (selectedReport) {
                formData.append('relatedReportId', selectedReport.id);
                formData.append('address', selectedReport.address);
            }

            console.log('제보 데이터 준비 완료:', {
                hasImage: !!capturedImage,
                coordinates: coordinateData,
                relatedReport: selectedReport?.id,
                timestamp: new Date().toISOString()
            });

            // API 전송 시도
            try {
                const response = await fetch('https://api.3dgs.scorve.kr/upload/report', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('API 전송 성공:', result);
                    alert('제보가 성공적으로 전송되었습니다!');

                    // 성공 후 선택된 포인트 초기화
                    setSelectedPoint(null);
                } else {
                    throw new Error(`API 전송 실패: ${response.status} ${response.statusText}`);
                }
            } catch (apiError) {
                console.warn('API 전송 실패, 로컬 다운로드로 대체:', apiError);

                // API 실패 시 로컬 다운로드
                const url = URL.createObjectURL(capturedImage);
                const link = document.createElement('a');
                link.href = url;
                link.download = `3d-capture-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // 좌표 정보를 JSON 파일로도 다운로드
                const coordBlob = new Blob([JSON.stringify(coordinateData, null, 2)],
                    { type: 'application/json' });
                const coordUrl = URL.createObjectURL(coordBlob);
                const coordLink = document.createElement('a');
                coordLink.href = coordUrl;
                coordLink.download = `3d-coordinates-${Date.now()}.json`;
                document.body.appendChild(coordLink);
                coordLink.click();
                document.body.removeChild(coordLink);
                URL.revokeObjectURL(coordUrl);

                alert('API 전송에 실패하여 파일을 로컬에 다운로드했습니다. (다운로드 폴더 확인)');
            }

        } catch (error) {
            console.error('제보 처리 오류:', error);
            alert('제보 처리 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsReporting(false);
        }
    };

    const fetchReports = async () => {
        try {
            setIsLoadingReports(true);
            const response = await fetch('https://api.3dgs.scorve.kr/upload/list');

            if (response.ok) {
                const data = await response.json();
                console.log('제보 목록 가져오기 성공:', data);

                // 3D 파일이 있는 제보만 필터링하고 최신순 정렬
                const filteredReports = data.items ? data.items
                    .filter(item => item.url && (
                        item.url.endsWith('.ksplat') ||
                        item.url.endsWith('.splat') ||
                        item.url.endsWith('.ply')
                    ))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];

                setReports(filteredReports);
            } else {
                console.error('제보 목록 가져오기 실패:', response.status);
                setReports([]);
            }
        } catch (error) {
            console.error('제보 목록 가져오기 오류:', error);
            setReports([]);
        } finally {
            setIsLoadingReports(false);
        }
    };

    // 컴포넌트 마운트 시 제보 목록 가져오기
    useEffect(() => {
        fetchReports();
    }, []);

    // 제보 선택 처리
    const handleReportSelect = async (report) => {
        try {
            setIsLoading(true);
            setLoadError(null);
            setSelectedReport(report);

            console.log('제보 파일 로드 시작:', {
                url: report.url,
                type: report.type,
                address: report.address
            });

            // URL에서 파일을 다운로드하여 File 객체로 변환
            const response = await fetch(report.url);
            if (!response.ok) {
                throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
            }

            // Content-Length 확인
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                const fileSize = parseInt(contentLength);
                console.log('파일 크기:', fileSize, 'bytes');

                // 파일 크기 검증 (최소 1KB, 최대 500MB)
                if (fileSize < 1024) {
                    throw new Error('파일이 너무 작습니다. 유효한 3D 파일이 아닐 수 있습니다.');
                }
                if (fileSize > 500 * 1024 * 1024) {
                    throw new Error('파일이 너무 큽니다. (최대 500MB)');
                }
            }

            const blob = await response.blob();
            console.log('다운로드된 파일 정보:', {
                size: blob.size,
                type: blob.type
            });

            // 파일 크기 재검증
            if (blob.size < 1024) {
                throw new Error('다운로드된 파일이 너무 작습니다. 유효한 3D 파일이 아닐 수 있습니다.');
            }

            const fileName = report.url.split('/').pop() || 'model.ksplat';

            // 파일 확장자 검증
            const fileExtension = fileName.toLowerCase().split('.').pop();
            if (!['ksplat', 'splat', 'ply'].includes(fileExtension)) {
                throw new Error(`지원되지 않는 파일 형식입니다: .${fileExtension}`);
            }

            const file = new File([blob], fileName, {
                type: blob.type || 'application/octet-stream',
                lastModified: new Date(report.createdAt).getTime()
            });

            // 추가 파일 유효성 검사 (.ksplat 파일의 경우)
            if (fileExtension === 'ksplat') {
                try {
                    // 파일 헤더 검사를 위해 처음 몇 바이트 읽기
                    const headerBuffer = await blob.slice(0, 1024).arrayBuffer();
                    const headerBytes = new Uint8Array(headerBuffer);

                    console.log('파일 헤더 확인:', {
                        size: headerBytes.length,
                        firstBytes: Array.from(headerBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
                    });

                    // KSPLAT 파일 시그니처 확인 (간단한 검증)
                    if (headerBytes.length < 16) {
                        throw new Error('KSPLAT 파일 헤더가 유효하지 않습니다.');
                    }
                } catch (headerError) {
                    console.warn('헤더 검증 실패:', headerError);
                    throw new Error('KSPLAT 파일 형식이 올바르지 않습니다.');
                }
            }

            setUploadedFile({
                name: fileName,
                size: file.size,
                type: file.type,
                file: file,
                lastModified: file.lastModified,
                reportData: report // 제보 데이터도 함께 저장
            });

            console.log('제보 3D 파일 로드 완료:', fileName);

        } catch (error) {
            console.error('제보 파일 로드 실패:', error);
            setLoadError(`제보 파일을 불러오는 중 오류가 발생했습니다: ${error.message}`);
            setSelectedReport(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            loadFile(file);
        }
    };

    const loadFile = async (file) => {
        const fileName = file.name.toLowerCase();

        // 지원되는 파일 형식 확인
        if (fileName.endsWith('.ksplat') || fileName.endsWith('.splat') || fileName.endsWith('.ply')) {
            setIsLoading(true);
            setLoadError(null);

            try {
                // 파일 정보 저장
                setUploadedFile({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file, // 실제 File 객체 저장
                    lastModified: file.lastModified
                });

                console.log('3D 파일 선택됨:', file.name);

                // 로딩은 Viewer3D 컴포넌트에서 처리
                setIsLoading(false);

            } catch (error) {
                console.error('파일 로드 실패:', error);
                setLoadError('파일을 불러오는 중 오류가 발생했습니다.');
                setIsLoading(false);
            }
        } else {
            setLoadError('지원되지 않는 파일 형식입니다. .ksplat, .splat, .ply 파일만 업로드 가능합니다.');
        }
    };

    const handleNewFile = () => {
        setUploadedFile(null);
        setIsLoading(false);
        setLoadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleLoadComplete = () => {
        console.log('3D 모델 로드 완료');
    };

    const handleLoadError = (error) => {
        console.error('3D 모델 로드 에러:', error);
        setLoadError(error);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragOver(false);

        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            loadFile(files[0]);
        }
    };

    // 파일 크기를 읽기 쉬운 형태로 변환
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="viewer3d-container">
            {/* 메인 콘텐츠 영역 */}
            <div className="main-content">
                {/* 좌측 사이드바 - 제보 목록 */}
                <div className="left-sidebar">
                    <div className="sidebar-header">
                        <h3>3D 제보 목록</h3>
                        <button className="refresh-btn" onClick={fetchReports} disabled={isLoadingReports}>
                            <img src="/img/3d/3DGS 2.png" alt="Refresh" className="refresh-icon" />
                        </button>
                    </div>

                    <div className="sidebar-description">
                        시민들의 실시간 제보를 기반으로 수집된 홍수 피해 정보를<br />
                        3D 화면을 통해 해당 지역의 침수 상황을 직접 살펴보세요.
                    </div>

                    <div className="reports-container">
                        {isLoadingReports ? (
                            <div className="loading-message">
                                <p>제보 목록을 불러오는 중...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="empty-message">
                                <p>3D 파일이 포함된 제보가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="reports-list">
                                {reports.map((report, index) => {
                                    // 아이콘 선택
                                    const floodIcon = index % 3 === 0 ? 'flood2.png' :
                                        index % 3 === 1 ? 'flood3.png' : 'flood4.png';

                                    // 위험도에 따른 배경색 선택
                                    const riskColors = ['#B7D508', '#FFE100', '#F99100', '#ED0101']; // 안전, 주의, 경고, 위험
                                    const riskColor = riskColors[index % 4];

                                    return (
                                        <div
                                            key={report.id}
                                            className={`report-item ${selectedReport?.id === report.id ? 'selected' : ''}`}
                                            onClick={() => handleReportSelect(report)}
                                        >
                                            <div className="report-icon" style={{ background: riskColor }}>
                                                <img src={`/img/3d/${floodIcon}`} alt="Flood Icon" />
                                            </div>
                                            <div className="report-content">
                                                <div className="report-date">
                                                    {new Date(report.createdAt).toLocaleString('ko-KR')}
                                                </div>
                                                <div className="report-address">{report.address}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 위험도 범례 */}
                        <div className="risk-legend">
                            <div className="gradient-bar"></div>
                            <div className="legend-labels">
                                <span>심각</span>
                                <span>위험</span>
                                <span>경고</span>
                                <span>안전</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 중앙 뷰어 영역 */}
                <div className="center-viewer">
                    {!uploadedFile ? (
                        /* 업로드 대기 상태 */
                        <div className="upload-placeholder">
                            <div className="upload-content">
                                {/* 업로드 아이콘 */}
                                <div className="upload-icon-container">
                                    <img
                                        src="/img/upload-icon.svg"
                                        alt="Upload Icon"
                                        className="upload-icon"
                                    />
                                </div>

                                {/* 메인 텍스트 */}
                                <h1 className="main-title">3D 장면을 통해 침수 상황을 확인하세요.</h1>

                                {/* 서브 텍스트 */}
                                <p className="sub-title">.ksplat / .splat / .ply 파일을 업로드 하세요.</p>

                                {/* 파일 업로드 버튼 */}
                                <div className="upload-button-container">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        id="file-input"
                                        accept=".ksplat,.splat,.ply"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="file-input" className="upload-button">
                                        파일 선택
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* 3D 뷰어 영역 */
                        <div className="viewer-area">
                            {/* 선택된 포인트 정보 오버레이 */}
                            {selectedPoint && (
                                <div className="point-info-overlay">
                                    <div className="point-coordinates">
                                        <span>X : {selectedPoint.x?.toFixed(3) || '0.000'}</span>
                                        <span>Y : {selectedPoint.y?.toFixed(3) || '0.000'}</span>
                                        <span>Z : {selectedPoint.z?.toFixed(3) || '0.000'}</span>
                                    </div>
                                </div>
                            )}

                            {/* 클릭한 지점 마커 */}
                            {selectedPoint && selectedPoint.screenX && selectedPoint.screenY && (
                                <div
                                    className="click-marker"
                                    style={{
                                        left: `${selectedPoint.screenX}px`,
                                        top: `${selectedPoint.screenY}px`
                                    }}
                                >
                                    <div className="marker-pulse"></div>
                                    <div className="marker-dot"></div>
                                </div>
                            )}

                            <div className="viewer-container" ref={viewerRef}>
                                <Viewer3D
                                    file={uploadedFile?.file}
                                    isFlipped={isFlipped}
                                    onLoadComplete={handleLoadComplete}
                                    onError={handleLoadError}
                                    onClick={handle3DClick}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 우측 사이드바를 오버레이로 변경 */}
                {uploadedFile && (
                    <div className="right-overlay">
                        <div className="overlay-header">
                            <div className="header-title-section">
                                <div className="title-and-coordinates">
                                    <h3>3D 뷰어 제보</h3>
                                    {selectedPoint && (
                                        <div className="coordinates-display">
                                            <span>X: {selectedPoint.x?.toFixed(3) || '0.000'}</span>
                                            <span>Y: {selectedPoint.y?.toFixed(3) || '0.000'}</span>
                                            <span>Z: {selectedPoint.z?.toFixed(3) || '0.000'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                className="close-overlay-btn"
                                onClick={() => setUploadedFile(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overlay-content-row">
                            <div className="overlay-description">
                                3D 화면에서 위치를 클릭하여 선택하세요.<br />
                                선택된 지점이 빨간 마커로 표시되고 좌표가 캡처됩니다.<br />
                                제보 시 이미지와 좌표 정보가 함께 전송됩니다.
                            </div>

                            <div className="report-actions">
                                <button
                                    className="download-btn"
                                    onClick={handleReport}
                                    disabled={isReporting}
                                >
                                    <img src="/img/3d/download.png" alt="Download" className="download-icon" />
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>            {/* 하단 정보바 */}
            {selectedReport && (
                <div className="bottom-info-bar">
                    <div className="info-section">
                        <div className="info-label">
                            <img src="/img/3d/flood2.png" alt="Flood Icon" className="info-label-icon" />
                            홍수
                        </div>
                        <div className="info-address">{selectedReport.address}</div>
                        <div className="info-description">
                            오후 2시 기준 집중호우로 도로와 골목 침수됨. 배수로 일부 막혀 상가 지하, 저지대 주택 일부 물 잠김.
                        </div>
                    </div>
                    <button
                        className="close-info-btn"
                        onClick={() => {
                            setUploadedFile(null);
                            setSelectedReport(null);
                            setLoadError(null);
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 에러 메시지 */}
            {loadError && (
                <div className="error-panel">
                    <div className="error-content">
                        <h4>⚠️ 로드 오류</h4>
                        <p>{loadError}</p>
                        <button className="error-btn" onClick={() => setLoadError(null)}>
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* 드래그 앤 드롭 오버레이 */}
            <div
                className={`drag-drop-overlay ${dragOver ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {dragOver && (
                    <div className="drag-message">
                        <img src="/img/upload-icon.svg" alt="Upload" className="drag-icon" />
                        <p>파일을 여기에 놓으세요</p>
                    </div>
                )}
            </div>

            {/* 스타일 정의 */}
            <style jsx>{`
                .viewer3d-container {
                    background: #ffffff;
                    height: 1020px;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                /* 메인 콘텐츠 */
                .main-content {
                    flex: 1;
                    display: flex;
                    min-height: calc(100vh - 170px); /* NavBar 높이 고려 */
                }

                /* 좌측 사이드바 */
                .left-sidebar {
                    width: 450px;
                    background: #F8FAFF;
                    padding: 20px 28px;
                    box-shadow: 5px 0px 26.6px -17px rgba(0, 0, 0, 0.25);
                    display: flex;
                    flex-direction: column;
                }

                .sidebar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(37, 99, 202, 0.1);
                }

                .sidebar-header h3 {
                    color: #2563ca;
                    font-family: "Inter-Bold", sans-serif;
                    font-size: 18px;
                    font-weight: 800;
                    margin: 0;
                }

                .refresh-btn {
                    background: #2563ca;
                    border: none;
                    border-radius: 4px;
                    width: 28px;
                    height: 28px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(37, 99, 202, 0.2);
                }

                .refresh-btn:hover:not(:disabled) {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(37, 99, 202, 0.3);
                }

                .refresh-btn:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                    transform: none;
                    opacity: 0.6;
                }

                .refresh-icon {
                    width: 14px;
                    height: 14px;
                    object-fit: contain;
                }

                .sidebar-description {
                    color: #000000ff;
                    font-family: "Inter-Light", sans-serif;
                    font-size: 15px;
                    line-height: 130%;
                    font-weight: 300;
                    margin-bottom: 30px;
                }

                .reports-container {
                    flex: 1;
                    overflow-y: auto;
                }

                .reports-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .report-item {
                    background: #ffffff;
                    border-radius: 6px;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0px 2px 18.7px -12px rgba(0, 0, 0, 1);
                    min-height: 61px;
                }

                .report-item:hover {
                    transform: translateY(-1px);
                    box-shadow: 0px 4px 20px -8px rgba(0, 0, 0, 0.15);
                }

                .report-item.selected {
                    border: 2px solid #2563ca;
                }

                .report-icon {
                    border-radius: 6px;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .report-icon img {
                    width: 38px;
                    height: 36px;
                    object-fit: contain;
                }

                .report-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .report-date {
                    color: #000000;
                    font-family: "Inter-Regular", sans-serif;
                    font-size: 12px;
                    line-height: 140%;
                    font-weight: 400;
                }

                .report-address {
                    color: #000000;
                    font-family: "Inter-SemiBold", sans-serif;
                    font-size: 18px;
                    line-height: 140%;
                    font-weight: 600;
                    margin: 4px 0;
                }

                .report-file {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #7c7c7c;
                    font-family: "Inter-Regular", sans-serif;
                    font-size: 5px;
                    line-height: 140%;
                    font-weight: 400;
                }

                .file-icon {
                    width: 6px;
                    height: 5px;
                    object-fit: contain;
                }

                /* 위험도 범례 */
                .risk-legend {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(37, 99, 202, 0.1);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gradient-bar {
                    height: 8px;
                    border-radius: 4px;
                    background: linear-gradient(to right, #ED0101, #F99100, #FFE100, #B7D508);
                    border: 1px solid rgba(0, 0, 0, 0.1);
                }

                .legend-labels {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .legend-labels span {
                    color: #000000;
                    font-family: "Inter-Regular", sans-serif;
                    font-size: 9px;
                    font-weight: 400;
                    text-align: center;
                    flex: 1;
                }

                /* 중앙 뷰어 */
                .center-viewer {
                    flex: 1;
                    position: relative;
                    background: #f3f8ff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .upload-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 40px;
                }

                .upload-icon-container {
                    margin-bottom: 16px;
                }

                .upload-icon {
                    width: 50px;
                    height: 45px;
                    object-fit: contain;
                }

                .main-title {
                    color: #2563ca;
                    font-family: "Inter", sans-serif;
                    font-size: 18px;
                    font-weight: 500;
                    margin: 0 0 8px 0;
                    line-height: 1.3;
                }

                .sub-title {
                    color: #2563ca;
                    font-family: "Inter", sans-serif;
                    font-size: 13px;
                    font-weight: 300;
                    margin: 0 0 24px 0;
                    line-height: 1.4;
                }

                .upload-button {
                    background: #ffffff;
                    border-radius: 24px;
                    width: 100px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #2563ca;
                    font-family: "Inter", sans-serif;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: -1px 2px 9.8px 0px rgba(208, 223, 249, 1);
                    transition: all 0.2s ease;
                    text-decoration: none;
                    border: none;
                }

                .upload-button:hover {
                    transform: translateY(-2px);
                    box-shadow: -1px 4px 15px 0px rgba(208, 223, 249, 0.8);
                    background: #f8faff;
                }

                .viewer-area {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .point-info-overlay {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(248, 250, 255, 0.8);
                    border-radius: 9px;
                    padding: 12px 20px;
                    box-shadow: 5px 0px 26.6px -17px rgba(0, 0, 0, 0.25);
                    z-index: 10;
                    backdrop-filter: blur(10px);
                }

                .point-coordinates {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                }

                .point-coordinates span {
                    color: #000000;
                    font-family: "Inter-Light", sans-serif;
                    font-size: 10px;
                    line-height: 140%;
                    font-weight: 300;
                    background: #ffffff;
                    padding: 2px 8px;
                    border-radius: 4px;
                }

                .viewer-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    background: transparent;
                    overflow: hidden;
                }

                /* 클릭 마커 */
                .click-marker {
                    position: absolute;
                    transform: translate(-50%, -50%);
                    z-index: 15;
                    pointer-events: none;
                }

                .marker-pulse {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 30px;
                    height: 30px;
                    border: 3px solid #ff0000;
                    border-radius: 50%;
                    background: rgba(255, 0, 0, 0.1);
                    animation: pulse 2s infinite;
                    box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                }

                .marker-dot {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 12px;
                    height: 12px;
                    background: #ff0000;
                    border: 3px solid #ffffff;
                    border-radius: 50%;
                    box-shadow: 0 0 8px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 0, 0, 0.6);
                }

                @keyframes pulse {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.8;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.3);
                        opacity: 0.5;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.6);
                        opacity: 0;
                    }
                }

                /* 우측 오버레이 */
                .right-overlay {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 600px;
                    background: rgba(248, 250, 255, 0.95);
                    backdrop-filter: blur(12px);
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    z-index: 20;
                    animation: slideInRight 0.3s ease-out;
                }

                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .overlay-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(37, 99, 202, 0.1);
                }

                .header-title-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .title-and-coordinates {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    justify-content: space-between;
                    width: 100%;
                }

                .overlay-header h3 {
                    color: #2563ca;
                    font-family: "Inter-Bold", sans-serif;
                    font-size: 18px;
                    font-weight: 800;
                    margin: 0;
                    flex-shrink: 0;
                }

                .coordinates-display {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .coordinates-display span {
                    color: #ef4444;
                    font-family: "Inter-Medium", sans-serif;
                    font-size: 11px;
                    font-weight: 500;
                    background: rgba(239, 68, 68, 0.1);
                    padding: 2px 6px;
                    border-radius: 3px;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }

                .close-overlay-btn {
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .close-overlay-btn:hover {
                    background: #dc2626;
                    transform: scale(1.1);
                }

                .overlay-content-row {
                    display: flex;
                    align-items: flex-end;
                    gap: 20px;
                    justify-content: space-between;
                }

                .overlay-description {
                    color: #000000;
                    font-family: "Inter-Light", sans-serif;
                    font-size: 15px;
                    line-height: 143%;
                    font-weight: 300;
                    margin-bottom: 0;
                    flex: 1;
                }

                .report-actions {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 0;
                    flex-shrink: 0;
                }

                .download-btn {
                    background: #2563ca;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    color: #ffffff;
                    font-family: "Inter-Bold", sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }

                .download-btn:hover:not(:disabled) {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                }

                .download-btn:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                }

                .download-icon {
                    width: 14px;
                    height: 14px;
                    object-fit: contain;
                }

                /* 하단 정보바 */
                .bottom-info-bar {
                    background: rgba(248, 250, 255, 0.8);
                    border-radius: 9px;
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 1166px;
                    height: 35px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 20px;
                    box-shadow: 5px 0px 26.6px -17px rgba(0, 0, 0, 0.25);
                    backdrop-filter: blur(10px);
                    z-index: 15;
                }

                .info-section {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex: 1;
                }

                .info-label {
                    background: #2563ca;
                    border-radius: 9px;
                    padding: 4px 12px;
                    color: #ffffff;
                    font-family: "Inter-Bold", sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .info-label-icon {
                    width: 16px;
                    height: 15px;
                    object-fit: contain;
                }

                .info-address {
                    color: #000000;
                    font-family: "Inter-SemiBold", sans-serif;
                    font-size: 15px;
                    line-height: 140%;
                    font-weight: 600;
                }

                .info-description {
                    color: #000000;
                    font-family: "Inter-Regular", sans-serif;
                    font-size: 15px;
                    line-height: 140%;
                    font-weight: 400;
                    flex: 1;
                }

                .close-info-btn {
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .close-info-btn:hover {
                    background: #dc2626;
                }

                /* 에러 패널 */
                .error-panel {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(220, 38, 38, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 24px;
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    max-width: 400px;
                    text-align: center;
                    z-index: 25;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }

                .error-content h4 {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .error-content p {
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .error-btn {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                }

                .error-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                /* 드래그 앤 드롭 */
                .drag-drop-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(37, 99, 202, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    z-index: 1000;
                }

                .drag-drop-overlay.active {
                    opacity: 1;
                    visibility: visible;
                    background: rgba(37, 99, 202, 0.15);
                }

                .drag-message {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    border: 2px dashed #2563ca;
                }

                .drag-icon {
                    width: 48px;
                    height: 44px;
                    margin-bottom: 16px;
                }

                .drag-message p {
                    color: #2563ca;
                    font-family: "Inter", sans-serif;
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0;
                }

                .loading-message, .empty-message {
                    text-align: center;
                    padding: 20px 15px;
                    color: #6b7280;
                    font-size: 13px;
                }

                /* 반응형 디자인 */
                @media (max-width: 1400px) {
                    .left-sidebar {
                        width: 280px;
                    }

                    .right-overlay {
                        width: 320px;
                    }

                    .bottom-info-bar {
                        width: calc(100% - 40px);
                        max-width: 1000px;
                    }
                }

                @media (max-width: 1024px) {
                    .viewer3d-container {
                        min-height: 100vh;
                    }

                    .main-content {
                        flex-direction: column;
                        min-height: calc(100vh - 170px);
                    }

                    .left-sidebar {
                        width: 100%;
                        height: auto;
                        max-height: 200px;
                    }

                    .right-overlay {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 90vw;
                        max-width: 400px;
                        max-height: 80vh;
                        overflow-y: auto;
                    }

                    .center-viewer {
                        min-height: 400px;
                    }

                    .bottom-info-bar {
                        position: relative;
                        bottom: 0;
                        left: 0;
                        transform: none;
                        width: 100%;
                        margin: 20px 0;
                    }

                    .sidebar-header h3 {
                        font-size: 13px;
                    }

                    .refresh-btn {
                        width: 24px;
                        height: 24px;
                    }

                    .refresh-icon {
                        width: 12px;
                        height: 12px;
                    }
                }

                @media (max-width: 768px) {
                    .main-content {
                        min-height: calc(100vh - 150px);
                    }

                    .left-sidebar {
                        padding: 15px;
                        max-height: 150px;
                    }

                    .right-overlay {
                        width: 95vw;
                        padding: 16px;
                    }

                    .report-address {
                        font-size: 14px;
                    }

                    .sidebar-header {
                        margin-bottom: 15px;
                        padding-bottom: 8px;
                    }

                    .sidebar-header h3 {
                        font-size: 12px;
                    }

                    .refresh-btn {
                        width: 22px;
                        height: 22px;
                    }

                    .refresh-icon {
                        width: 10px;
                        height: 10px;
                    }
                }
            `}</style>
        </div>
    );
}