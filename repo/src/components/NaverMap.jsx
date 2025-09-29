import React, { useEffect, useRef } from "react";

export default function KakaoMapComponent({
  height = 520,
  center = { lat: 37.5665, lng: 126.9780 }, // 서울시청
  zoom = 3,
  markers = []
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // 카카오 지도 스크립트 동적 로딩 (env 기반, autoload=false 사용)
    const loadKakaoMapScript = () => {
      return new Promise((resolve, reject) => {
        // 이미 로드되어 있는지 확인
        if (window.kakao && window.kakao.maps) {
          resolve();
          return;
        }

        const appkey = process.env.REACT_APP_KAKAO_MAPS_API_KEY;
        if (!appkey) {
          reject(new Error('REACT_APP_KAKAO_MAPS_API_KEY가 설정되어 있지 않습니다 (.env에 추가 후 dev 서버 재시작 필요)'));
          return;
        }

        // 기존 스크립트 존재 시 재사용
        const existingScript = document.querySelector('#kakao-map-script');
        if (existingScript) {
          existingScript.addEventListener('load', resolve, { once: true });
          existingScript.addEventListener('error', reject, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.id = 'kakao-map-script';
        script.type = 'text/javascript';
        // autoload=false로 로드 후 kakao.maps.load로 초기화
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${appkey}`;

        script.onload = () => {
          console.log('카카오 지도 SDK 스크립트 로드됨');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('카카오 지도 SDK 스크립트 로드 실패 (네트워크/403/키오류 가능)'));
        };

        document.head.appendChild(script);
      });
    };

    const initMap = () => {
      console.log('카카오 지도 초기화 시작');

      const mapContainer = mapRef.current;
      console.log('지도 컨테이너:', mapContainer);
      console.log('카카오 API 상태:', window.kakao);

      try {
        const mapOption = {
          center: new window.kakao.maps.LatLng(center.lat, center.lng),
          level: zoom
        };

        console.log('지도 옵션:', mapOption);
        console.log('API 키 확인:', window.kakao.maps);

        const map = new window.kakao.maps.Map(mapContainer, mapOption);
        console.log('지도 생성 완료:', map);

        // 마커 추가
        const defaultMarkers = markers.length > 0 ? markers : [
          { position: center, title: "기본 위치" }
        ];

        defaultMarkers.forEach((markerData, index) => {
          const markerPosition = new window.kakao.maps.LatLng(
            markerData.position.lat,
            markerData.position.lng
          );

          const marker = new window.kakao.maps.Marker({
            position: markerPosition
          });

          marker.setMap(map);
          console.log(`마커 ${index + 1} 추가됨`);

          // 인포윈도우 추가
          if (markerData.title) {
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:5px;">${markerData.title}</div>`
            });

            window.kakao.maps.event.addListener(marker, 'click', () => {
              infowindow.open(map, marker);
            });
          }
        });
      } catch (error) {
        console.error('지도 생성 중 상세 오류:', error);
        console.error('오류 타입:', error.name);
        console.error('오류 메시지:', error.message);
        console.error('오류 스택:', error.stack);

        if (error.message && error.message.includes('403')) {
          alert('카카오 지도 API 403 오류: 도메인 설정을 확인해주세요.\n카카오 개발자 콘솔에서 http://localhost:3000 도메인을 등록하세요.');
        }
      }
    };

    // API 로드 후 지도 초기화 (autoload=false → kakao.maps.load 사용)
    loadKakaoMapScript()
      .then(() => {
        if (!(window.kakao && window.kakao.maps && window.kakao.maps.load)) {
          throw new Error('kakao.maps.load가 존재하지 않습니다 (SDK 로드 실패)');
        }
        window.kakao.maps.load(() => {
          console.log('카카오 지도 API 초기화, 지도 생성 시작');
          initMap();
        });
      })
      .catch((error) => {
        console.error('카카오 지도 API 로드/초기화 실패:', error);
        // 403 가능성에 대한 명확한 안내
        const msg = [
          '카카오 지도를 로드할 수 없습니다.',
          '- 네트워크 차단 또는 403(도메인 미등록/잘못된 키) 가능성',
          '- 카카오 개발자 콘솔에서 Web 플랫폼 도메인에 http://localhost:3000 등록 여부 확인',
          '- .env의 REACT_APP_KAKAO_MAPS_API_KEY가 해당 앱의 JavaScript 키인지 확인',
          '- .env 변경 후 개발 서버 재시작 필요'
        ].join('\n');
        // alert는 과할 수 있어 콘솔 안내 위주. 필요시 아래 주석 해제
        // alert(msg);
      });

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
      }}
    >
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}