import React, { useState, useEffect } from "react";
import GoogleMapComponent from "../components/GoogleMapComponent";

export default function MapPage() {
    // 기본 서울시청 좌표
    const defaultCenter = { lat: 37.5665, lng: 126.9780 };

    // 동적 지도 중심 상태
    const [mapCenter, setMapCenter] = useState(defaultCenter);

    // API에서 가져온 제보 목록 상태
    const [reports, setReports] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [mapInstance, setMapInstance] = useState(null); // 지도 인스턴스 상태 추가

    // 제보 목록 가져오기
    const fetchReports = async () => {
        try {
            setIsLoadingReports(true);
            const response = await fetch('https://api.3dgs.scorve.kr/upload/list');

            if (response.ok) {
                const data = await response.json();
                console.log('제보 목록 가져오기 성공:', data);

                // 최신순 정렬
                const sortedReports = data.items ? data.items
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];

                setReports(sortedReports);

                // 가장 최신 제보의 위치로 지도 중심 설정
                if (sortedReports.length > 0) {
                    const latestReport = sortedReports[0];

                    // 좌표가 있는 경우 해당 좌표로 설정
                    if (latestReport.lat && latestReport.lng) {
                        const newCenter = {
                            lat: parseFloat(latestReport.lat),
                            lng: parseFloat(latestReport.lng)
                        };
                        setMapCenter(newCenter);
                        console.log('최신 제보 위치로 지도 중심 설정:', newCenter);
                    }
                    // 좌표가 없고 주소가 있는 경우 지오코딩으로 좌표 찾기
                    else if (latestReport.address && window.google && window.google.maps) {
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode({ address: latestReport.address }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                const location = results[0].geometry.location;
                                const newCenter = {
                                    lat: location.lat(),
                                    lng: location.lng()
                                };
                                setMapCenter(newCenter);
                                console.log('최신 제보 주소로 지도 중심 설정:', newCenter);
                            } else {
                                console.warn('최신 제보 주소 지오코딩 실패:', status);
                            }
                        });
                    }
                }
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

    // 제보 위험도 계산
    const getRiskLevel = (report) => {
        // report의 id를 기반으로 고정된 위험도 계산 (일관된 결과 보장)
        if (!report || !report.id) {
            return { level: 'normal', text: '관심', color: '#191919' };
        }

        // ID의 해시값을 이용해 고정된 위험도 결정
        const hash = report.id.toString().split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);

        const value = Math.abs(hash) % 100;

        if (value > 70) return { level: 'danger', text: '심각', color: '#c42222' };
        if (value > 40) return { level: 'warning', text: '주의', color: '#ff9800' };
        return { level: 'normal', text: '관심', color: '#191919' };
    };

    // 제보 선택 핸들러
    const handleReportSelect = (report) => {
        setSelectedReport(report);
        console.log('선택된 제보:', report);

        // 지도가 준비되어 있고 좌표 정보가 있으면 해당 위치로 이동
        if (mapInstance && report.lat && report.lng) {
            const newCenter = new window.google.maps.LatLng(report.lat, report.lng);
            mapInstance.panTo(newCenter);
            mapInstance.setZoom(17); // 줌 레벨을 높여서 더 자세히 보기

            // 기존 마커 제거
            if (window.selectedMarker) {
                window.selectedMarker.setMap(null);
            }

            // 기존 동적 오버레이 제거
            if (window.dynamicOverlay) {
                window.dynamicOverlay.setMap(null);
            }

            // 새 마커 추가 (선택된 위치 표시)
            window.selectedMarker = new window.google.maps.Marker({
                position: newCenter,
                map: mapInstance,
                title: report.address || '선택된 위치',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" fill="#2563ca" stroke="#fff" stroke-width="3"/>
                            <circle cx="20" cy="20" r="8" fill="#fff"/>
                        </svg>
                    `),
                    scaledSize: new window.google.maps.Size(40, 40)
                }
            });

            // 동적 위험 오버레이 생성 (선택된 위치 중심으로)
            const lat = parseFloat(report.lat);
            const lng = parseFloat(report.lng);
            const offset = 0.003; // 약 300m 반경의 불규칙한 모양

            const dynamicPaths = [
                { lat: lat + offset * 0.8, lng: lng - offset * 1.2 },
                { lat: lat + offset * 1.3, lng: lng - offset * 0.5 },
                { lat: lat + offset * 1.5, lng: lng + offset * 0.3 },
                { lat: lat + offset * 1.2, lng: lng + offset * 1.1 },
                { lat: lat + offset * 0.5, lng: lng + offset * 1.4 },
                { lat: lat - offset * 0.2, lng: lng + offset * 1.2 },
                { lat: lat - offset * 0.8, lng: lng + offset * 0.8 },
                { lat: lat - offset * 1.1, lng: lng + offset * 0.2 },
                { lat: lat - offset * 1.3, lng: lng - offset * 0.4 },
                { lat: lat - offset * 0.9, lng: lng - offset * 1.0 },
                { lat: lat - offset * 0.3, lng: lng - offset * 1.3 },
                { lat: lat + offset * 0.1, lng: lng - offset * 1.1 }
            ];

            // 위험도에 따른 색상 결정
            const risk = getRiskLevel(report);
            let fillColor, strokeColor;

            switch (risk.level) {
                case 'danger':
                    fillColor = '#FF5252'; // 빨간색
                    strokeColor = '#D32F2F';
                    break;
                case 'warning':
                    fillColor = '#FF9800'; // 주황색
                    strokeColor = '#F57C00';
                    break;
                default:
                    fillColor = '#FFC107'; // 노란색
                    strokeColor = '#F57C00';
            }

            // 동적 오버레이 생성
            window.dynamicOverlay = new window.google.maps.Polygon({
                paths: dynamicPaths,
                strokeColor: strokeColor,
                strokeOpacity: 0.8,
                strokeWeight: 3,
                fillColor: fillColor,
                fillOpacity: 0.5
            });

            window.dynamicOverlay.setMap(mapInstance);

            // 오버레이 클릭 시 정보창 표시
            const dynamicInfoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 10px; max-width: 200px;">
                    <h4 style="margin: 0 0 10px 0; color: ${strokeColor};">
                      🚨 ${report.address || '위험 지역'}
                    </h4>
                    <p style="margin: 5px 0;"><strong>위험도:</strong> ${risk.text}</p>
                    <p style="margin: 5px 0;"><strong>제보 시간:</strong> ${new Date(report.createdAt).toLocaleDateString('ko-KR')}</p>
                    <p style="margin: 5px 0;"><strong>상황:</strong> 홍수 위험 지역으로 분류됨</p>
                  </div>
                `
            });

            window.dynamicOverlay.addListener('click', (event) => {
                dynamicInfoWindow.setPosition(event.latLng);
                dynamicInfoWindow.open(mapInstance);
            });

            console.log('지도 이동 및 동적 오버레이 생성:', report.lat, report.lng);
        } else if (mapInstance && report.address) {
            // 좌표가 없으면 주소로 지오코딩 시도
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: report.address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    const lat = location.lat();
                    const lng = location.lng();

                    mapInstance.panTo(location);
                    mapInstance.setZoom(17);

                    // 기존 마커 제거
                    if (window.selectedMarker) {
                        window.selectedMarker.setMap(null);
                    }

                    // 기존 동적 오버레이 제거
                    if (window.dynamicOverlay) {
                        window.dynamicOverlay.setMap(null);
                    }

                    // 새 마커 추가
                    window.selectedMarker = new window.google.maps.Marker({
                        position: location,
                        map: mapInstance,
                        title: report.address,
                        icon: {
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" r="18" fill="#2563ca" stroke="#fff" stroke-width="3"/>
                                    <circle cx="20" cy="20" r="8" fill="#fff"/>
                                </svg>
                            `),
                            scaledSize: new window.google.maps.Size(40, 40)
                        }
                    });

                    // 동적 위험 오버레이 생성
                    const offset = 0.003;
                    const dynamicPaths = [
                        { lat: lat + offset * 0.8, lng: lng - offset * 1.2 },
                        { lat: lat + offset * 1.3, lng: lng - offset * 0.5 },
                        { lat: lat + offset * 1.5, lng: lng + offset * 0.3 },
                        { lat: lat + offset * 1.2, lng: lng + offset * 1.1 },
                        { lat: lat + offset * 0.5, lng: lng + offset * 1.4 },
                        { lat: lat - offset * 0.2, lng: lng + offset * 1.2 },
                        { lat: lat - offset * 0.8, lng: lng + offset * 0.8 },
                        { lat: lat - offset * 1.1, lng: lng + offset * 0.2 },
                        { lat: lat - offset * 1.3, lng: lng - offset * 0.4 },
                        { lat: lat - offset * 0.9, lng: lng - offset * 1.0 },
                        { lat: lat - offset * 0.3, lng: lng - offset * 1.3 },
                        { lat: lat + offset * 0.1, lng: lng - offset * 1.1 }
                    ];

                    // 위험도에 따른 색상
                    const risk = getRiskLevel(report);
                    let fillColor, strokeColor;

                    switch (risk.level) {
                        case 'danger':
                            fillColor = '#FF5252';
                            strokeColor = '#D32F2F';
                            break;
                        case 'warning':
                            fillColor = '#FF9800';
                            strokeColor = '#F57C00';
                            break;
                        default:
                            fillColor = '#FFC107';
                            strokeColor = '#F57C00';
                    }

                    // 동적 오버레이 생성
                    window.dynamicOverlay = new window.google.maps.Polygon({
                        paths: dynamicPaths,
                        strokeColor: strokeColor,
                        strokeOpacity: 0.8,
                        strokeWeight: 3,
                        fillColor: fillColor,
                        fillOpacity: 0.5
                    });

                    window.dynamicOverlay.setMap(mapInstance);

                    // 오버레이 클릭 시 정보창
                    const dynamicInfoWindow = new window.google.maps.InfoWindow({
                        content: `
                          <div style="padding: 10px; max-width: 200px;">
                            <h4 style="margin: 0 0 10px 0; color: ${strokeColor};">
                              🚨 ${report.address}
                            </h4>
                            <p style="margin: 5px 0;"><strong>위험도:</strong> ${risk.text}</p>
                            <p style="margin: 5px 0;"><strong>제보 시간:</strong> ${new Date(report.createdAt).toLocaleDateString('ko-KR')}</p>
                            <p style="margin: 5px 0;"><strong>상황:</strong> 홍수 위험 지역으로 분류됨</p>
                          </div>
                        `
                    });

                    window.dynamicOverlay.addListener('click', (event) => {
                        dynamicInfoWindow.setPosition(event.latLng);
                        dynamicInfoWindow.open(mapInstance);
                    });

                    console.log('주소로 지도 이동 및 동적 오버레이 생성:', report.address);
                } else {
                    console.warn('지오코딩 실패:', status);
                }
            });
        }
    };

    // 지도 준비 완료 핸들러
    const handleMapReady = (map) => {
        setMapInstance(map);
        console.log('지도 준비 완료');

        // 지도가 준비된 후 제보 목록을 다시 가져와서 지오코딩 처리
        if (reports.length > 0) {
            const latestReport = reports[0];
            if (!latestReport.lat && !latestReport.lng && latestReport.address) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ address: latestReport.address }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        const newCenter = {
                            lat: location.lat(),
                            lng: location.lng()
                        };
                        setMapCenter(newCenter);
                        map.setCenter(new window.google.maps.LatLng(newCenter.lat, newCenter.lng));
                        console.log('지도 준비 후 최신 제보 주소로 중심 설정:', newCenter);
                    }
                });
            }
        }
    };

    // 기본 마커들 제거 (빈 배열로 설정)
    const markers = [];

    // 지역 오버레이 추가 - 첨부 이미지와 같은 불규칙한 모양
    const overlays = [
        {
            type: 'flood_zone',
            title: '홍수 위험 지역',
            paths: [
                // 불규칙한 모양의 좌표들 (서울 중구 근처)
                { lat: 37.5700, lng: 126.9750 },
                { lat: 37.5720, lng: 126.9780 },
                { lat: 37.5740, lng: 126.9820 },
                { lat: 37.5760, lng: 126.9850 },
                { lat: 37.5780, lng: 126.9830 },
                { lat: 37.5790, lng: 126.9800 },
                { lat: 37.5780, lng: 126.9760 },
                { lat: 37.5760, lng: 126.9730 },
                { lat: 37.5740, lng: 126.9720 },
                { lat: 37.5720, lng: 126.9740 },
                { lat: 37.5700, lng: 126.9750 }
            ],
            riskLevel: '높음',
            waterLevel: '침수 위험',
            evacuationRoute: '안전지대로 대피',
            strokeColor: '#E57373', // 연한 빨간색 테두리
            strokeWeight: 3,
            strokeOpacity: 0.8,
            fillColor: '#F8BBD9', // 분홍색 채우기 (이미지와 유사한 색상)
            fillOpacity: 0.6
        },
        {
            type: 'flood_zone',
            title: '침수 주의 지역',
            paths: [
                // 두 번째 불규칙한 지역 (한강 근처)
                { lat: 37.5580, lng: 126.9720 },
                { lat: 37.5600, lng: 126.9740 },
                { lat: 37.5620, lng: 126.9780 },
                { lat: 37.5640, lng: 126.9820 },
                { lat: 37.5620, lng: 126.9860 },
                { lat: 37.5600, lng: 126.9840 },
                { lat: 37.5580, lng: 126.9800 },
                { lat: 37.5560, lng: 126.9760 },
                { lat: 37.5580, lng: 126.9720 }
            ],
            riskLevel: '중간',
            waterLevel: '주의 필요',
            evacuationRoute: '고지대로 이동',
            strokeColor: '#F06292', // 핑크색 테두리
            strokeWeight: 2,
            strokeOpacity: 0.7,
            fillColor: '#F8BBD9', // 동일한 분홍색
            fillOpacity: 0.5
        },
        {
            type: 'flood_zone',
            title: '범람 위험 구역',
            paths: [
                // 세 번째 지역 (더 큰 불규칙한 모양)
                { lat: 37.5450, lng: 126.9650 },
                { lat: 37.5480, lng: 126.9680 },
                { lat: 37.5520, lng: 126.9720 },
                { lat: 37.5560, lng: 126.9760 },
                { lat: 37.5580, lng: 126.9800 },
                { lat: 37.5560, lng: 126.9840 },
                { lat: 37.5530, lng: 126.9870 },
                { lat: 37.5500, lng: 126.9850 },
                { lat: 37.5470, lng: 126.9820 },
                { lat: 37.5440, lng: 126.9780 },
                { lat: 37.5420, lng: 126.9740 },
                { lat: 37.5430, lng: 126.9700 },
                { lat: 37.5450, lng: 126.9650 }
            ],
            riskLevel: '매우 높음',
            waterLevel: '즉시 대피',
            evacuationRoute: '최단거리 대피로',
            strokeColor: '#E57373',
            strokeWeight: 4,
            strokeOpacity: 0.9,
            fillColor: '#F8BBD9',
            fillOpacity: 0.7
        }
    ];

    return (
        <div style={{
            position: 'relative',
            width: '95vw',
            height: '980px',
            margin: '20px auto',
            overflow: 'hidden',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            {/* 구글 맵 */}
            <GoogleMapComponent
                height="80vh"
                center={mapCenter}
                zoom={15}
                markers={markers}
                overlays={overlays}
                onMapReady={handleMapReady}
            />

            {/* 왼쪽 오버레이 컨테이너 박스 */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50px',
                transform: 'translateY(-50%)',
                zIndex: 1000,
                background: '#FFFFFFCC',
                width: '350px',
                height: '686.8px',
                flexShrink: 0,
                borderRadius: '20px',
                padding: '30px 20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column'
            }}>


                {/* Live Flood 타이틀 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px'
                }}>
                    <img
                        src="/img/Layer_1_map.svg"
                        alt="Flag"
                        style={{ width: '38px', height: '28px' }}
                    />
                    <h3 style={{
                        color: '#2563ca',
                        fontFamily: '"Inter", sans-serif',
                        fontSize: '32px',
                        fontWeight: 800,
                        margin: 0
                    }}>
                        Live Flood
                    </h3>
                </div>

                {/* 설명 텍스트 */}
                <div style={{
                    marginBottom: '24px'
                }}>
                    <p style={{
                        color: '#7c7c7c',
                        fontFamily: '"Inter", sans-serif',
                        fontSize: '16px',
                        lineHeight: '130%',
                        margin: 0
                    }}>
                        지도 위에 실시간으로 나타나는 홍수 현황을 통해,<br />
                        <span style={{ letterSpacing: '0.05em' }}>
                            지금 어디가 위험하고 어디가 안전한지를 즉시<br />
                        </span>
                        확인하고 대비하세요.
                    </p>
                </div>

                {/* 제보 목록 */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto'
                }}>
                    {isLoadingReports ? (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            width: '100%',
                            height: '95px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '-1px 2px 18.3px -12px rgba(0, 0, 0, 1)',
                            marginBottom: '12px'
                        }}>
                            <span style={{
                                color: '#7c7c7c',
                                fontFamily: '"Inter", sans-serif',
                                fontSize: '18px'
                            }}>
                                로딩 중...
                            </span>
                        </div>
                    ) : reports.length === 0 ? (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            width: '100%',
                            height: '95px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '-1px 2px 18.3px -12px rgba(0, 0, 0, 1)',
                            marginBottom: '12px'
                        }}>
                            <span style={{
                                color: '#7c7c7c',
                                fontFamily: '"Inter", sans-serif',
                                fontSize: '18px'
                            }}>
                                제보가 없습니다
                            </span>
                        </div>
                    ) : (
                        reports.slice(0, 4).map((report, index) => {
                            const risk = getRiskLevel(report);
                            const isSelected = selectedReport?.id === report.id;

                            return (
                                <div
                                    key={report.id}
                                    onClick={() => handleReportSelect(report)}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = '-1px 6px 20px -8px rgba(0, 0, 0, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0px)';
                                        e.target.style.boxShadow = '-1px 2px 18.3px -12px rgba(0, 0, 0, 1)';
                                    }}
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '20px',
                                        width: '100%',
                                        height: '95px',
                                        position: 'relative',
                                        boxShadow: '-1px 2px 18.3px -12px rgba(0, 0, 0, 1)',
                                        marginBottom: '12px',
                                        cursor: 'pointer',
                                        border: isSelected ? '2px solid #2563ca' : 'none',
                                        transition: 'all 0.2s ease',
                                        outline: 'none',
                                        userSelect: 'none',
                                        WebkitTapHighlightColor: 'transparent',
                                        WebkitUserSelect: 'none',
                                        MozUserSelect: 'none',
                                        msUserSelect: 'none'
                                    }}
                                >
                                    {/* 위험도 표시 */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '13px',
                                        background: risk.color,
                                        borderRadius: '8px',
                                        width: '35px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{
                                            color: '#ffffff',
                                            fontFamily: '"Inter", sans-serif',
                                            fontSize: '10px',
                                            fontWeight: 900,
                                            userSelect: 'none',
                                            outline: 'none',
                                            textShadow: 'none'
                                        }}>
                                            {risk.text}
                                        </span>
                                    </div>

                                    {/* 주소 */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '32px',
                                        left: '12px',
                                        right: '12px'
                                    }}>
                                        <h4 style={{
                                            color: '#000000',
                                            fontFamily: '"Inter", sans-serif',
                                            fontSize: '23px',
                                            fontWeight: 900,
                                            margin: 0,
                                            lineHeight: '140%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            userSelect: 'none',
                                            outline: 'none',
                                            textShadow: 'none',
                                            WebkitTapHighlightColor: 'transparent'
                                        }}>
                                            {report.address || '주소 정보 없음'}
                                        </h4>
                                    </div>

                                    {/* 시간 */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '12px'
                                    }}>
                                        <span style={{
                                            color: '#000000',
                                            fontFamily: '"Inter", sans-serif',
                                            fontSize: '12px',
                                            lineHeight: '140%',
                                            userSelect: 'none',
                                            outline: 'none',
                                            textShadow: 'none'
                                        }}>
                                            {new Date(report.createdAt).toLocaleString('ko-KR', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            }).replace(/\. /g, '-').replace(/\./g, '').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* 더보기 버튼 */}
                    {reports.length > 4 && (
                        <div style={{
                            background: '#2563ca',
                            borderRadius: '20px',
                            width: '47px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '-1px 2px 18.3px -12px rgba(0, 0, 0, 1)',
                            cursor: 'pointer',
                            margin: '12px auto 0',
                        }}>
                            <span style={{
                                color: '#ffffff',
                                fontFamily: '"Inter", sans-serif',
                                fontSize: '20px',
                                fontWeight: 900
                            }}>
                                +
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* 선택된 제보 상세 정보 (오른쪽 하단) */}
            {selectedReport && (
                <div style={{
                    position: 'absolute',
                    bottom: '90px',
                    right: '90px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '22px',
                    width: '560px',
                    minHeight: '186px',
                    padding: '20px',
                    boxShadow: '-1px 2px 18.3px -4px rgba(124, 124, 124, 0.5)',
                    zIndex: 1000,
                    pointerEvents: 'auto'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px'
                    }}>
                        <h3 style={{
                            color: '#000000',
                            fontFamily: '"Inter", sans-serif',
                            fontSize: '24px',
                            fontWeight: 900,
                            margin: 0,
                            lineHeight: '140%'
                        }}>
                            {selectedReport.address || '상세 주소 정보 없음'}
                        </h3>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <div style={{
                                background: getRiskLevel(selectedReport).color,
                                borderRadius: '11.5px',
                                width: '42px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <span style={{
                                    color: '#ffffff',
                                    fontFamily: '"Inter", sans-serif',
                                    fontSize: '13px',
                                    fontWeight: 900
                                }}>
                                    {getRiskLevel(selectedReport).text}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    padding: '4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div style={{
                        color: '#000000',
                        fontFamily: '"Inter", sans-serif',
                        fontSize: '16px',
                        lineHeight: '140%',
                        marginBottom: '16px'
                    }}>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong>제보 유형:</strong> {selectedReport.type || '일반 제보'}
                        </p>
                        {selectedReport.content && (
                            <p style={{ margin: '0 0 8px 0' }}>
                                <strong>제보 내용:</strong> {selectedReport.content}
                            </p>
                        )}
                    </div>

                    <div style={{
                        textAlign: 'right',
                        fontSize: '11px',
                        color: '#666',
                        borderTop: '1px solid #eee',
                        paddingTop: '8px'
                    }}>
                        {new Date(selectedReport.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
