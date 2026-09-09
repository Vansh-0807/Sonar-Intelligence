let missionMap;
let detectionMarkers = {};
let auvMarker;
let missionRouteLayer;
let targetLayer;
let selectedCoordinateLayer;
let mapTiles;
function markerIcon(type='target'){
  const html=type==='auv'?'<div class="leaflet-auv">●</div>':'<div class="leaflet-target"></div>';
  return L.divIcon({className:'mono-marker',html,iconSize:[18,18],iconAnchor:[9,9]});
}
function initMissionMap(){
 const el=document.getElementById('missionMap');if(!el||missionMap)return;
 missionMap=L.map(el,{zoomControl:false,attributionControl:false}).setView([21.49,72.9],12);
 mapTiles = L.tileLayer(getTileUrl(),{subdomains:'abcd',maxZoom:19}).addTo(missionMap);
 L.control.zoom({position:'bottomright'}).addTo(missionMap);
 missionRouteLayer = L.polyline(APP_DATA.missionRoute,{color:'#6f8796',weight:1.2,dashArray:'6 6',opacity:.75}).addTo(missionMap);
 auvMarker=L.marker([APP_DATA.mission.auv.lat,APP_DATA.mission.auv.lng],{icon:markerIcon('auv')}).addTo(missionMap);auvMarker.bindTooltip('AUV-01',{permanent:true,direction:'right',offset:[8,0],className:'mono-tooltip'});
 targetLayer = L.layerGroup().addTo(missionMap);
 
 // Fetch real detections from the backend API
 fetch('http://127.0.0.1:8000/api/scans/')
   .then(res => res.json())
   .then(scans => {
      scans.forEach(scan => {
        // Use scan coordinates, or simulate them around the starting point if empty
        const lat = scan.latitude || (21.49 + (Math.random() * 0.05 - 0.025));
        const lng = scan.longitude || (72.9 + (Math.random() * 0.05 - 0.025));
        
        scan.detections.forEach(det => {
          addDetection({
            id: `API-${det.id}`,
            lat: lat,
            lng: lng,
            type: det.object_type,
            risk: det.priority,
            confidence: Math.round(det.confidence * 100),
            depth: 'API' // Placeholder for UI
          });
        });
      });
   })
   .catch(err => {
      console.warn("Failed to load API data, using mock data", err);
      APP_DATA.detections.forEach(d=>addDetection(d));
   });
 missionMap.on('mousemove',e=>document.getElementById('cursorCoord').textContent=`${e.latlng.lat.toFixed(4)}° N / ${e.latlng.lng.toFixed(4)}° E`);
 setTimeout(()=>missionMap.invalidateSize(),200);
 window.refreshMissionMap=()=>missionMap?.invalidateSize();
 window.focusDetection=id=>{const m=detectionMarkers[id];const d=APP_DATA.detections.find(x=>x.id===id);if(m&&d){missionMap.setView([d.lat,d.lng],15);m.openPopup()}};
 window.focusMission = (lat, lng) => missionMap?.setView([lat, lng], 12, { animate: true });
 window.setMissionContext = (mission) => {
  if (!missionMap || !auvMarker) return;
  auvMarker.setLatLng([mission.startCoordinates.lat, mission.startCoordinates.lng]);
  missionMap.setView([mission.startCoordinates.lat, mission.startCoordinates.lng], 12, { animate: true });
 };
 window.setMapLayer = (layer) => {
  if (!missionMap) return;
  const showTargets = layer !== 'coverage';
  const showLive = layer !== 'targets';
  if (showTargets && !missionMap.hasLayer(targetLayer)) targetLayer.addTo(missionMap);
  if (!showTargets && missionMap.hasLayer(targetLayer)) missionMap.removeLayer(targetLayer);
  if (showLive && !missionMap.hasLayer(missionRouteLayer)) missionRouteLayer.addTo(missionMap);
  if (showLive && !missionMap.hasLayer(auvMarker)) auvMarker.addTo(missionMap);
  if (!showLive && missionMap.hasLayer(missionRouteLayer)) missionMap.removeLayer(missionRouteLayer);
  if (!showLive && missionMap.hasLayer(auvMarker)) missionMap.removeLayer(auvMarker);
 };
 window.refreshMapTheme = () => {
  if (!missionMap || !mapTiles) return;
  mapTiles.setUrl(getTileUrl());
 };
}
function getTileUrl(){
 return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}
function addDetection(d){
 const marker=L.marker([d.lat,d.lng],{icon:markerIcon()}).addTo(targetLayer);
 marker.bindPopup(`<div class="map-popup"><div class="mono">${d.id}</div><strong>${d.type}</strong><div class="popup-grid"><span>RISK</span><b>${d.risk}</b><span>CONF.</span><b>${d.confidence}%</b><span>DEPTH</span><b>${d.depth} m</b></div><button onclick="openTarget('${d.id}')">INSPECT ↗</button></div>`);
 marker.on('click',()=>{selectedId=d.id;renderTargetInspector(d);navigate('targets')});
 detectionMarkers[d.id]=marker;
}


// Coordinate tools for the Sonar target-location workflow.
function focusCoordinate(lat, lng) {
  if (!missionMap) return;
  if (selectedCoordinateLayer) selectedCoordinateLayer.remove();
  missionMap.setView([lat, lng], 16, { animate: true });

  selectedCoordinateLayer = L.circleMarker([lat, lng], {
    radius: 7,
    color: document.body.classList.contains('light-mode') ? '#111518' : '#dce6ea',
    weight: 1,
    fillColor: document.body.classList.contains('light-mode') ? '#ffffff' : '#10171c',
    fillOpacity: 1
  }).addTo(missionMap)
    .bindTooltip('SELECTED TARGET', {
      permanent: true,
      direction: 'top',
      offset: [0, -8],
      className: 'mono-tooltip'
    })
    .openTooltip();
}

function enableMapCoordinatePick() {
  if (!missionMap) return;

  missionMap.getContainer().classList.add('coordinate-pick-mode');

  const handler = (event) => {
    const lat = event.latlng.lat;
    const lng = event.latlng.lng;

    missionMap.getContainer().classList.remove('coordinate-pick-mode');
    missionMap.off('click', handler);

    window.receiveMapCoordinate?.(lat, lng);

    setTimeout(() => window.navigate?.('sonar'), 50);
  };

  missionMap.on('click', handler);
}

window.focusCoordinate = focusCoordinate;
window.enableMapCoordinatePick = enableMapCoordinatePick;
