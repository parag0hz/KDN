import React, { useEffect, useRef } from "react";

export default function GoogleMapComponent({
  height = 520,
  center = { lat: 35.1409764, lng: 126.9287741 },
  zoom = 15,
  markers = [],
  overlays = [], // 오버레이 데이터 추가
  onMapReady = null // 지도 준비 완료 콜백 추가
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null); // 지도 인스턴스 참조 추가
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true; // 컴포넌트 마운트 상태 확인

    // Google Maps JavaScript API 동적 로딩
    const loadGoogleMapsScript = () => {
      return new Promise((resolve, reject) => {
        // 이미 로드되어 있는지 확인
        if (window.google && window.google.maps) {
          console.log('Google Maps API 이미 로드됨');
          resolve();
          return;
        }

        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

        if (apiKey === 'YOUR_API_KEY_HERE' || !apiKey) {
          reject(new Error('Google Maps API 키가 설정되지 않았습니다. .env 파일을 확인하세요.'));
          return;
        }

        // 기존 스크립트 존재 시 재사용
        const existingScript = document.querySelector('#google-maps-script');
        if (existingScript) {
          console.log('Google Maps 스크립트 이미 존재함, 기다리는 중...');
          // 스크립트가 로드 완료될 때까지 기다림
          const checkLoaded = () => {
            if (window.google && window.google.maps) {
              resolve();
            } else {
              setTimeout(checkLoaded, 100);
            }
          };
          checkLoaded();
          return;
        }

        console.log('Google Maps API 스크립트 로딩 시작');
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.type = 'text/javascript';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization`;

        script.onload = () => {
          console.log('Google Maps API 스크립트 로드 완료');
          if (isMounted) {
            resolve();
          }
        };

        script.onerror = () => {
          console.error('Google Maps API 스크립트 로드 실패');
          if (isMounted) {
            reject(new Error('Google Maps API 스크립트 로드 실패 - 네트워크 오류 또는 잘못된 API 키'));
          }
        };

        document.head.appendChild(script);
      });
    };

    const initMap = () => {
      console.log('Google Maps 초기화 시작');
      console.log('window.google:', !!window.google);
      console.log('window.google.maps:', !!window.google?.maps);

      const mapContainer = mapRef.current;
      console.log('mapContainer:', mapContainer);

      if (!mapContainer) {
        console.error('맵 컨테이너를 찾을 수 없습니다');
        return;
      }

      try {
        const mapOptions = {
          center: new window.google.maps.LatLng(center.lat, center.lng),
          zoom: zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP
        };

        const map = new window.google.maps.Map(mapContainer, mapOptions);
        mapInstanceRef.current = map; // 지도 인스턴스 저장
        console.log('Google Maps 생성 완료:', map);
        setIsLoading(false); // 로딩 완료
        setError(null); // 오류 초기화

        // 지도 준비 완료 콜백 호출
        if (onMapReady && typeof onMapReady === 'function') {
          onMapReady(map);
        }

        // 마커 배열 초기화
        window.mapMarkers = [];

        // 마커 추가 (마커가 있는 경우에만)
        if (markers && markers.length > 0) {
          markers.forEach((markerData, index) => {
            const marker = new window.google.maps.Marker({
              position: new window.google.maps.LatLng(
                markerData.position.lat,
                markerData.position.lng
              ),
              map: map,
              title: markerData.title || `마커 ${index + 1}`
            });

            window.mapMarkers.push(marker);
            console.log(`마커 ${index + 1} 추가됨:`, markerData.title);

            // 인포윈도우 추가
            if (markerData.title) {
              const infoWindow = new window.google.maps.InfoWindow({
                content: `<div style="padding:5px;">${markerData.title}</div>`
              });

              marker.addListener('click', () => {
                infoWindow.open(map, marker);
              });
            }
          });
        }

        // 오버레이 추가 (오버레이가 있는 경우에만)
        if (overlays && overlays.length > 0) {
          overlays.forEach((overlayData, index) => {
            switch (overlayData.type) {
              case 'rainfall':
                // 강수량 히트맵 오버레이
                if (overlayData.heatmapData && window.google.maps.visualization) {
                  const heatmapData = overlayData.heatmapData.map(point => ({
                    location: new window.google.maps.LatLng(point.lat, point.lng),
                    weight: point.intensity || point.rainfall || 1
                  }));

                  const heatmap = new window.google.maps.visualization.HeatmapLayer({
                    data: heatmapData,
                    radius: overlayData.radius || 20,
                    opacity: overlayData.opacity || 0.6,
                    gradient: overlayData.gradient || [
                      'rgba(0, 255, 255, 0)',     // 투명 (강수량 없음)
                      'rgba(0, 255, 255, 1)',     // 하늘색 (약한 비)
                      'rgba(0, 255, 0, 1)',       // 초록 (보통 비)
                      'rgba(255, 255, 0, 1)',     // 노랑 (강한 비)
                      'rgba(255, 165, 0, 1)',     // 주황 (매우 강한 비)
                      'rgba(255, 0, 0, 1)'        // 빨강 (폭우)
                    ]
                  });
                  heatmap.setMap(map);
                  console.log(`강수량 히트맵 오버레이 ${index + 1} 추가됨`);
                }
                break;

              case 'flood_zone':
                // 홍수 위험 구역 오버레이
                const floodPolygon = new window.google.maps.Polygon({
                  paths: overlayData.paths,
                  strokeColor: overlayData.strokeColor || '#FF0000',
                  strokeOpacity: overlayData.strokeOpacity || 0.8,
                  strokeWeight: overlayData.strokeWeight || 3,
                  fillColor: overlayData.fillColor || '#FF0000',
                  fillOpacity: overlayData.fillOpacity || 0.4
                });
                floodPolygon.setMap(map);

                // 홍수 위험도에 따른 정보창
                const floodInfoWindow = new window.google.maps.InfoWindow({
                  content: `
                  <div style="padding: 10px; max-width: 200px;">
                    <h4 style="margin: 0 0 10px 0; color: #d32f2f;">
                      🌊 ${overlayData.title || '홍수 위험 구역'}
                    </h4>
                    <p style="margin: 5px 0;"><strong>위험도:</strong> ${overlayData.riskLevel || '중간'}</p>
                    <p style="margin: 5px 0;"><strong>예상 수위:</strong> ${overlayData.waterLevel || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>대피 경로:</strong> ${overlayData.evacuationRoute || '지자체 안내 확인'}</p>
                  </div>
                `
                });

                floodPolygon.addListener('click', (event) => {
                  floodInfoWindow.setPosition(event.latLng);
                  floodInfoWindow.open(map);
                });
                console.log(`홍수 위험구역 오버레이 ${index + 1} 추가됨`);
                break;

              case 'water_level':
                // 수위 측정소 오버레이
                const waterLevelMarker = new window.google.maps.Marker({
                  position: overlayData.position,
                  map: map,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="18" fill="${overlayData.level === 'danger' ? '#ff1744' :
                        overlayData.level === 'warning' ? '#ff9800' : '#2196f3'}" stroke="#fff" stroke-width="2"/>
                      <text x="20" y="25" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                        ${overlayData.currentLevel || '0m'}
                      </text>
                    </svg>
                  `),
                    scaledSize: new window.google.maps.Size(40, 40)
                  },
                  title: `수위: ${overlayData.currentLevel || '0m'}`
                });

                const waterLevelInfoWindow = new window.google.maps.InfoWindow({
                  content: `
                  <div style="padding: 10px; min-width: 180px;">
                    <h4 style="margin: 0 0 10px 0; color: #1976d2;">
                      📊 ${overlayData.stationName || '수위 측정소'}
                    </h4>
                    <div style="background: ${overlayData.level === 'danger' ? '#ffebee' :
                      overlayData.level === 'warning' ? '#fff3e0' : '#e3f2fd'}; 
                      padding: 8px; border-radius: 4px; margin: 5px 0;">
                      <p style="margin: 2px 0;"><strong>현재 수위:</strong> ${overlayData.currentLevel || '0m'}</p>
                      <p style="margin: 2px 0;"><strong>상태:</strong> 
                        <span style="color: ${overlayData.level === 'danger' ? '#d32f2f' :
                      overlayData.level === 'warning' ? '#f57c00' : '#1976d2'};">
                          ${overlayData.level === 'danger' ? '⚠️ 위험' :
                      overlayData.level === 'warning' ? '⚠️ 주의' : '✅ 정상'}
                        </span>
                      </p>
                      <p style="margin: 2px 0;"><strong>기준 수위:</strong> ${overlayData.baseLevel || 'N/A'}</p>
                      <p style="margin: 2px 0; font-size: 12px; color: #666;">
                        최종 업데이트: ${overlayData.lastUpdate || '방금 전'}
                      </p>
                    </div>
                  </div>
                `
                });

                waterLevelMarker.addListener('click', () => {
                  waterLevelInfoWindow.open(map, waterLevelMarker);
                });
                console.log(`수위 측정소 오버레이 ${index + 1} 추가됨`);
                break;

              case 'drainage':
                // 배수시설 오버레이
                const drainageMarker = new window.google.maps.Marker({
                  position: overlayData.position,
                  map: map,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="26" height="26" fill="${overlayData.status === 'blocked' ? '#f44336' :
                        overlayData.status === 'warning' ? '#ff9800' : '#4caf50'}" rx="3"/>
                      <text x="15" y="20" text-anchor="middle" fill="white" font-size="16">🏗️</text>
                    </svg>
                  `),
                    scaledSize: new window.google.maps.Size(30, 30)
                  },
                  title: overlayData.name || '배수시설'
                });

                const drainageInfoWindow = new window.google.maps.InfoWindow({
                  content: `
                  <div style="padding: 8px;">
                    <h4 style="margin: 0 0 8px 0;">🏗️ ${overlayData.name || '배수시설'}</h4>
                    <p style="margin: 2px 0;"><strong>상태:</strong> 
                      <span style="color: ${overlayData.status === 'blocked' ? '#d32f2f' :
                      overlayData.status === 'warning' ? '#f57c00' : '#388e3c'};">
                        ${overlayData.status === 'blocked' ? '막힘' :
                      overlayData.status === 'warning' ? '주의' : '정상'}
                      </span>
                    </p>
                    <p style="margin: 2px 0;"><strong>용량:</strong> ${overlayData.capacity || 'N/A'}</p>
                  </div>
                `
                });

                drainageMarker.addListener('click', () => {
                  drainageInfoWindow.open(map, drainageMarker);
                });
                console.log(`배수시설 오버레이 ${index + 1} 추가됨`);
                break;

              case 'weather_radar':
                // 기상 레이더 오버레이
                const radarCircle = new window.google.maps.Circle({
                  center: overlayData.center,
                  radius: overlayData.radius || 50000, // 50km 반경
                  strokeColor: overlayData.strokeColor || '#2196F3',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: overlayData.fillColor || '#2196F3',
                  fillOpacity: 0.1
                });
                radarCircle.setMap(map);

                // 레이더 중심점 마커
                const radarMarker = new window.google.maps.Marker({
                  position: overlayData.center,
                  map: map,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="18" fill="#1976d2" stroke="#fff" stroke-width="2"/>
                      <text x="20" y="25" text-anchor="middle" fill="white" font-size="16">📡</text>
                    </svg>
                  `),
                    scaledSize: new window.google.maps.Size(40, 40)
                  }
                });

                const radarInfoWindow = new window.google.maps.InfoWindow({
                  content: `
                  <div style="padding: 10px;">
                    <h4 style="margin: 0 0 8px 0;">📡 ${overlayData.name || '기상 레이더'}</h4>
                    <p><strong>관측 반경:</strong> ${(overlayData.radius / 1000) || 50}km</p>
                    <p><strong>상태:</strong> ${overlayData.status || '정상 작동'}</p>
                  </div>
                `
                });

                radarMarker.addListener('click', () => {
                  radarInfoWindow.open(map, radarMarker);
                });
                console.log(`기상 레이더 오버레이 ${index + 1} 추가됨`);
                break;

              default:
                console.warn(`알 수 없는 오버레이 타입: ${overlayData.type}`);
            }
          });
        }

      } catch (error) {
        console.error('Google Maps 생성 중 오류:', error);
        console.error('오류 타입:', error.name);
        console.error('오류 메시지:', error.message);
        setError(`지도 생성 오류: ${error.message}`);
        setIsLoading(false);
      }
    };

    // API 로드 후 지도 초기화
    loadGoogleMapsScript()
      .then(() => {
        if (!isMounted) return; // 컴포넌트가 언마운트된 경우 실행하지 않음
        console.log('Google Maps API 로드 완료, 지도 생성 시작');
        initMap();
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Google Maps API 로드 실패:', error);
        console.error('API 키를 확인하거나 .env에 REACT_APP_GOOGLE_MAPS_API_KEY를 설정하세요');
        setError(`API 로드 실패: ${error.message}`);
        setIsLoading(false);
      });

    // 클린업 함수
    return () => {
      isMounted = false;
      console.log('GoogleMapComponent 언마운트');
    };

  }, []); // 의존성 배열을 비워서 한 번만 실행되도록 함

  // 지도 props 변경 시 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    console.log('지도 props 업데이트:', { center, zoom });

    // 중심점과 줌 레벨 업데이트
    map.setCenter(new window.google.maps.LatLng(center.lat, center.lng));
    map.setZoom(zoom);

    // 기존 마커들 제거 (선택된 마커 제외)
    if (window.mapMarkers) {
      window.mapMarkers.forEach(marker => marker.setMap(null));
    }
    window.mapMarkers = [];

    // 새 마커들 추가 (마커가 있는 경우에만)
    if (markers && markers.length > 0) {
      markers.forEach((markerData, index) => {
        const marker = new window.google.maps.Marker({
          position: new window.google.maps.LatLng(
            markerData.position.lat,
            markerData.position.lng
          ),
          map: map,
          title: markerData.title || `마커 ${index + 1}`
        });

        window.mapMarkers.push(marker);

        // 인포윈도우 추가
        if (markerData.title) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding:5px;">${markerData.title}</div>`
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        }
      });
    }

  }, [center, zoom, markers]);

  return (
    <div
      style={{
        width: "100%",
        height,
        background: "#f8f9fa",
        border: "1px solid rgba(0,0,0,.1)",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative"
      }}
    >
      {isLoading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.9)",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #2563ca",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 10px"
            }}></div>
            <p style={{ margin: 0, color: "#666" }}>지도를 로딩 중...</p>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          border: "1px solid #ff5722",
          maxWidth: "300px",
          textAlign: "center"
        }}>
          <p style={{ margin: "0 0 10px 0", color: "#d32f2f", fontWeight: "bold" }}>
            ❌ 지도 로딩 실패
          </p>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              background: "#2563ca",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            새로고침
          </button>
        </div>
      )}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%"
        }}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}