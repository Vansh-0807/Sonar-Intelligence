let currentPage = 'mission';
let selectedId = null;
let activeFilter = 'ALL';
let thermalView = 'field';
let activeMission = APP_DATA.missions.find((mission) => mission.id === APP_DATA.mission.id) || APP_DATA.missions[0];
let appInitialized = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function navigate(page) {
  currentPage = page;

  $$('.page').forEach((panel) => panel.classList.add('is-hidden'));
  const target = $('#page-' + page);
  if (target) target.classList.remove('is-hidden');

  $$('.rail-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.page === page);
  });

  const titles = {
    mission: 'COMMAND CENTER',
    sonar: 'SONAR INTELLIGENCE',
    thermal: 'THERMAL SIGNATURE',
    targets: 'TARGET REGISTRY',
    analytics: 'MISSION ANALYTICS',
    reports: 'MISSION REPORT'
  };

  $('#pageTitle').textContent = titles[page] || 'OCEAN';

  if (page === 'mission') {
    setTimeout(() => window.refreshMissionMap?.(), 80);
  }

  if (page === 'analytics') {
    renderAnalytics();
  }

  if (page === 'targets') {
    renderTargets();
  }

  if (page === 'thermal') {
    requestAnimationFrame(() => drawThermal(thermalView));
  }
}

function animateIntro() {
  $('#enterBtn').addEventListener('click', () => {
    $('#intro').classList.add('is-hidden');
    openMissionHub();
  });
}

function openMissionHub() {
  renderMissionList();
  $('#missionHub').classList.remove('is-hidden');
  $('#app').classList.add('is-hidden');
}

function renderMissionList() {
  $('#missionList').innerHTML = APP_DATA.missions.map((mission) => `
    <button class="mission-option ${mission.id === activeMission.id ? 'is-selected' : ''}" data-mission-id="${mission.id}">
      <span><b>${mission.name}</b><small>${mission.region} / ${mission.auv}</small></span>
      <em>${mission.status}</em>
    </button>
  `).join('');

  $$('.mission-option').forEach((button) => button.addEventListener('click', () => selectMission(button.dataset.missionId)));
}

function selectMission(id) {
  const mission = APP_DATA.missions.find((item) => item.id === id);
  if (!mission) return;

  activeMission = mission;
  APP_DATA.mission.id = mission.id;
  APP_DATA.mission.name = mission.name;
  APP_DATA.mission.area = mission.surveyArea;
  APP_DATA.mission.auv.lat = mission.startCoordinates.lat;
  APP_DATA.mission.auv.lng = mission.startCoordinates.lng;
  updateMissionContext();

  $('#missionHub').classList.add('is-hidden');
  $('#app').classList.remove('is-hidden');
  if (!appInitialized) {
    initAll();
    appInitialized = true;
  } else {
    renderPriority();
    renderTargets();
    renderAnalytics();
    window.refreshMissionMap?.();
  }
  setTimeout(() => window.setMissionContext?.(mission), 120);
  navigate('mission');
}

function updateMissionContext() {
  $('#currentMissionName').textContent = activeMission.name.toUpperCase();
  $('#missionName').textContent = activeMission.name.toUpperCase();
  $('#reportMissionName').textContent = activeMission.name.toUpperCase();
  $('#reportMissionNameHeading').textContent = activeMission.name.toUpperCase();
  $('#missionRegion').textContent = activeMission.region.toUpperCase();
  $('#missionStatus').textContent = activeMission.status;
  $('#missionArea').textContent = `${activeMission.surveyArea} km²`;
}

function createMission(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const mission = {
    id: `MISSION-${String(APP_DATA.missions.length + 1).padStart(2, '0')}`,
    name: form.get('name'),
    region: form.get('region'),
    type: form.get('type'),
    auv: form.get('auv'),
    status: 'DRAFT',
    startCoordinates: { lat: Number(form.get('lat')) || 0, lng: Number(form.get('lng')) || 0 },
    surveyArea: Number(form.get('area')) || 0,
    coverage: 0
  };
  APP_DATA.missions.push(mission);
  selectMission(mission.id);
  pushNotification('MISSION CREATED', `${mission.name} is now the current mission`);
}

function initAll() {
  updateMissionContext();
  renderPriority();
  renderTargets();
  renderTargetDetail(APP_DATA.detections[0]);
  renderAnalytics();
  initSonar();
  initThermal();
  initUploaders();
  initCoordinateTools();
  startClock();
  window.initMissionMap?.();
}

function renderPriority() {
  const list = $('#priorityList');
  const priority = APP_DATA.detections
    .filter((d) => d.risk === 'HIGH')
    .sort((a, b) => b.confidence - a.confidence);

  list.innerHTML = priority.map((d) => `
    <div class="mini-item" data-target="${d.id}">
      <i></i>
      <div><b>${d.id}</b><span>${d.type}</span></div>
      <span>${d.confidence}%</span>
    </div>
  `).join('');

  $$('.mini-item').forEach((item) => {
    item.addEventListener('click', () => openTarget(item.dataset.target));
  });
}

function openTarget(id) {
  const detection = APP_DATA.detections.find((item) => item.id === id);
  if (!detection) return;

  selectedId = id;
  renderTargetDetail(detection);
  renderTargetInspector(detection);
  updateThermalTarget(detection);
  navigate('sonar');
  window.focusDetection?.(detection.id);
}

let rescanTargetId = null;

function getTargetIntelligence(detection) {
  const source = detection.intelligence || {};
  const acousticEvidence = source.acousticEvidence ?? Math.round(detection.sonarReturn * 100);
  const shadowConsistency = source.shadowConsistency ?? Math.max(55, Math.round(detection.confidence - 4));
  const targetShadowMatch = source.targetShadowMatch ?? Math.round((acousticEvidence + shadowConsistency) / 2);
  const temporalConsistency = source.temporalConsistency ?? Math.max(60, Math.round(detection.confidence - 5));
  const geometricConsistency = source.geometricConsistency ?? Math.max(60, Math.round(detection.confidence - 6));

  return {
    model: source.model || 'SONAR-V2',
    acousticEvidence,
    shadowConsistency,
    targetShadowMatch,
    temporalConsistency,
    geometricConsistency,
    positionConfidence: source.positionConfidence ?? Math.max(70, Math.round(detection.confidence - 2)),
    dataQuality: source.dataQuality ?? 88,
    seabed: source.seabed || { sand: 72, rock: 18, vegetation: 10 },
    naturalProbability: source.naturalProbability ?? (detection.category === 'natural' ? 76 : 21),
    manMadeProbability: source.manMadeProbability ?? (detection.category === 'natural' ? 24 : 79),
    falseAlarmRisk: source.falseAlarmRisk || (detection.confidence > 88 ? 'LOW' : 'MODERATE'),
    thermalEvidence: source.thermalEvidence || 'SUPPORTING PATTERN',
    thermalMatch: source.thermalMatch ?? (detection.id === 'MD-042' ? 81 : 64),
    pings: source.pings || [421, 422, 423, 424],
    recommendedAction: source.recommendedAction || (detection.confidence < 85 ? 'SECONDARY SONAR PASS' : 'VERIFY TARGET'),
    recommendedReason: source.recommendedReason || (detection.confidence < 85 ? 'Classification confidence below threshold.' : 'High acoustic and temporal consistency.')
  };
}

function renderEvidenceRows(intelligence) {
  return `
    <div class="evidence-matrix">
      <div class="detail-section-label">ACOUSTIC EVIDENCE</div>
      <div><span>Target Return</span><b>${intelligence.acousticEvidence}%</b></div>
      <div><span>Shadow Consistency</span><b>${intelligence.shadowConsistency}%</b></div>
      <div><span>Target–Shadow Match</span><b>${intelligence.targetShadowMatch}%</b></div>
    </div>
    <div class="pairing-line"><span>TARGET</span><b>+</b><span>SHADOW</span><b>=</b><strong>${intelligence.targetShadowMatch}% MATCH</strong></div>
  `;
}

function renderTargetDetail(d) {
  const intelligence = getTargetIntelligence(d);
  const pings = intelligence.pings;
  const finalConfidence = Math.round((d.confidence + intelligence.acousticEvidence + intelligence.shadowConsistency + intelligence.temporalConsistency + intelligence.geometricConsistency) / 5);

  $('#selectedTarget').innerHTML = `
    <div class="detail-id">${d.id} / ${d.status.toUpperCase()}</div>
    <div class="detail-title">${d.type}</div>
    <div class="atr-block">
      <div class="detail-section-label">AUTOMATIC TARGET RECOGNITION</div>
      <div class="atr-meta"><span>MODEL: ${intelligence.model}</span><b>STATUS: ACTIVE</b></div>
      <div class="atr-class"><span>TARGET CLASS</span><strong>${d.type.toUpperCase()}</strong><span>ATR CONFIDENCE</span><b>${d.confidence}%</b></div>
    </div>
    ${renderEvidenceRows(intelligence)}
    <div class="detail-stat">
      <div><span>RISK</span><b>${d.risk}</b></div>
      <div><span>DEPTH</span><b>${d.depth} m</b></div>
      <div><span>SIZE</span><b>${d.size} m</b></div>
      <div><span>SONAR RETURN</span><b>${Math.round(d.sonarReturn * 100)}%</b></div>
    </div>
    <div class="geo-block">
      <div class="detail-section-label">GEOGRAPHIC POSITION</div>
      <div class="geo-coordinates"><b>${d.lat.toFixed(4)}° N</b><b>${d.lng.toFixed(4)}° E</b></div>
      <span>POSITION CONFIDENCE</span><strong>${intelligence.positionConfidence}%</strong>
    </div>
    <div class="confidence-wrap">
      <div class="confidence-value"><span>FINAL CONFIDENCE</span><b>${finalConfidence}%</b></div>
      <div class="confidence-line"><i style="width:${finalConfidence}%"></i></div>
      <div class="confidence-breakdown">
        <span>AI CLASSIFICATION <b>${d.confidence}%</b></span>
        <span>ACOUSTIC EVIDENCE <b>${intelligence.acousticEvidence}%</b></span>
        <span>SHADOW CONSISTENCY <b>${intelligence.shadowConsistency}%</b></span>
        <span>TEMPORAL CONSISTENCY <b>${intelligence.temporalConsistency}%</b></span>
        <span>GEOMETRIC CONSISTENCY <b>${intelligence.geometricConsistency}%</b></span>
      </div>
    </div>
    <div class="sonar-detail-grid">
      <div class="compact-section"><div class="detail-section-label">TEMPORAL VALIDATION</div>${pings.map((ping) => `<span> PING ${ping} <b>DETECTED</b></span>`).join('')}<strong>PERSISTENCE ${pings.length} / ${pings.length} PINGS</strong><em>${intelligence.temporalConsistency}% CONSISTENCY</em></div>
      <div class="compact-section"><div class="detail-section-label">SEABED CONTEXT</div><span>SAND <b>${intelligence.seabed.sand}%</b></span><span>ROCK <b>${intelligence.seabed.rock}%</b></span><span>VEGETATION <b>${intelligence.seabed.vegetation}%</b></span><strong>NATURAL ${intelligence.naturalProbability}% / MAN-MADE ${intelligence.manMadeProbability}%</strong></div>
      <div class="compact-section"><div class="detail-section-label">DATA QUALITY <b>${intelligence.dataQuality} / 100</b></div><span>✓ SIGNAL QUALITY</span><span>✓ NAVIGATION QUALITY</span><span>✓ STABLE AUV MOTION</span><span>⚠ MODERATE ACOUSTIC NOISE</span></div>
      <div class="compact-section"><div class="detail-section-label">TARGET VALIDATION</div><span>✓ SIGNAL STRENGTH</span><span>✓ ACOUSTIC SHADOW</span><span>✓ SEABED CONTEXT</span><span>✓ TEMPORAL CONSISTENCY</span><strong>FALSE-ALARM RISK ${intelligence.falseAlarmRisk}</strong></div>
    </div>
    <div class="why-detected"><div class="detail-section-label">WHY DETECTED?</div><div>✓ Strong acoustic return</div><div>✓ Distinct acoustic shadow</div><div>✓ Persistent across ${pings.length} pings</div><div>✓ Consistent with target geometry</div><div>✓ Surrounding seabed considered</div></div>
    <div class="lifecycle"><div class="detail-section-label">TARGET LIFECYCLE</div><span>DETECTED ✓</span><span>AI CLASSIFIED ✓</span><span>THERMAL REVIEW ✓</span><span>RE-SCANNED —</span><span>OPERATOR VERIFIED ${d.status === 'Verified' ? '✓' : '—'}</span></div>
    <div class="recommended-action"><div class="detail-section-label">RECOMMENDED ACTION</div><strong>${intelligence.recommendedAction}</strong><span>Reason: ${intelligence.recommendedReason}</span></div>
    ${rescanTargetId === d.id ? `<div class="rescan-request"><div class="detail-section-label">SECONDARY SCAN REQUEST</div><b>TARGET ${d.id}</b><span>REASON / LOW CLASSIFICATION CONFIDENCE</span><span>AUV DISTANCE / 182 m</span><span>TARGET DEPTH / ${d.depth} m</span><strong>RECOMMENDED ACTION / SECONDARY SONAR PASS</strong><button class="black-btn full" onclick="confirmRescan('${d.id}')">CONFIRM RE-SCAN</button></div>` : ''}
    <div class="analysis-reasons"><div>Strong acoustic return</div><div>Distinct shadow detected</div><div>Shadow geometry consistent with target</div></div>
    <div class="action-row"><button class="outline-btn" onclick="requestRescan('${d.id}')">RE-SCAN</button><button class="black-btn" onclick="verifyTarget('${d.id}')">VERIFY</button></div>
  `;
}

function renderTargetInspector(d) {
  $('#targetInspectorEmpty').classList.add('is-hidden');
  $('#targetInspector').classList.remove('is-hidden');
  $('#inspectorId').textContent = d.id;

  $('#targetInspector').innerHTML = `
    <div class="target-card">
      <div class="detail-id">${d.timestamp}</div>
      <h3>${d.type}</h3>
      <div class="target-meta">
        <div><span>CONFIDENCE</span><b>${d.confidence}%</b></div>
        <div><span>RISK</span><b>${d.risk}</b></div>
        <div><span>DEPTH</span><b>${d.depth} m</b></div>
        <div><span>SIZE</span><b>${d.size} m</b></div>
        <div><span>LATITUDE</span><b>${d.lat.toFixed(4)}° N</b></div>
        <div><span>LONGITUDE</span><b>${d.lng.toFixed(4)}° E</b></div>
      </div>
      <p class="target-description">${d.description}</p>
      <div class="evidence-row">
        <span>SECONDARY SENSOR / THERMAL EVIDENCE</span>
        <b>${d.id === 'MD-042' ? 'METALLIC / 81%' : 'NOT CAPTURED'}</b>
      </div>
      <div class="action-row">
        <button class="outline-btn" onclick="openTarget('${d.id}')">OPEN SONAR</button>
        <button class="black-btn" onclick="verifyTarget('${d.id}')">CONFIRM</button>
      </div>
    </div>
  `;
}

function renderTargets() {
  const q = ($('#targetSearch')?.value || '').toLowerCase();

  const rows = APP_DATA.detections
    .filter((d) => activeFilter === 'ALL' || d.risk === activeFilter)
    .filter((d) => !q || `${d.id} ${d.type} ${d.status} ${d.lat} ${d.lng}`.toLowerCase().includes(q))
    .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

  $('#targetTable').innerHTML = `
    <table class="target-table">
      <thead><tr><th>ID</th><th>TYPE</th><th>RISK</th><th>CONF.</th><th>DEPTH</th><th>STATUS</th><th>TIME</th></tr></thead>
      <tbody>
        ${rows.map((d) => `
          <tr data-id="${d.id}">
            <td class="mono">${d.id}</td>
            <td>${d.type}</td>
            <td class="mono">${d.risk}</td>
            <td class="mono">${d.confidence}%</td>
            <td class="mono">${d.depth} m</td>
            <td class="status">${d.status}</td>
            <td class="mono">${d.timestamp}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  $$('#targetTable tr[data-id]').forEach((row) => {
    row.addEventListener('click', () => {
      const detection = APP_DATA.detections.find((d) => d.id === row.dataset.id);
      selectedId = detection.id;
      renderTargetInspector(detection);
      updateThermalTarget(detection);
      window.focusDetection?.(detection.id);
    });
  });
}

function renderAnalytics() {
  const cats = APP_DATA.aiInsights.debrisByType;
  const max = Math.max(...cats.map((item) => item.value));

  $('#categoryBars').innerHTML = cats.map((item) => `
    <div class="category-row">
      <span>${item.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${item.value / max * 100}%"></div></div>
      <b>${item.value}%</b>
    </div>
  `).join('');

  const dist = APP_DATA.aiInsights.confidenceDist;
  const mx = Math.max(...dist.map((item) => item.count));

  $('#confidenceBars').innerHTML = dist.map((item) => `
    <div class="confidence-row">
      <span>${item.range}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${item.count / mx * 100}%"></div></div>
      <b>${item.count}</b>
    </div>
  `).join('');

  const canvas = $('#trendCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;

  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  canvas.width = rect.width * dpr;
  canvas.height = 230 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, 230);

  const vals = APP_DATA.aiInsights.weeklyTrend;
  const maxv = Math.max(...vals) + 5;

  ctx.strokeStyle = '#5b7281';
  ctx.lineWidth = 1;
  ctx.beginPath();

  vals.forEach((value, index) => {
    const x = 18 + index * (rect.width - 36) / (vals.length - 1);
    const y = 210 - (value / maxv) * 165;
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });

  ctx.stroke();
  ctx.fillStyle = '#dce5e9';

  vals.forEach((value, index) => {
    const x = 18 + index * (rect.width - 36) / (vals.length - 1);
    const y = 210 - (value / maxv) * 165;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  });

  ctx.strokeStyle = '#263139';
  [45, 90, 135, 180, 210].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
    ctx.stroke();
  });
}

function initSonar() {
  drawSonar('raw');

  $$('.segmented button[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      $$('.segmented button[data-view]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      drawSonar(button.dataset.view);
    });
  });

  $('#runScanBtn').addEventListener('click', runAnalysis);

  $('#pingSlider').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    $('.sonar-hud.tr b').textContent = Math.round(17000 + value * 23.35);
  });
}

function drawSonar(view) {
  const canvas = $('#sonarCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = rect.width;
  const h = rect.height;
  const image = ctx.createImageData(Math.floor(w), Math.floor(h));

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const noise = Math.random() * 24;
      let value = 12 + noise;
      const band = Math.abs(y - h * 0.56 - (x - w * 0.5) * 0.17);

      if (band < 90) {
        value += Math.max(0, 1 - band / 90) * 62;
      }

      if (view === 'enhanced') value *= 1.22;

      if (view === 'ai' && ((x - w * 0.59) ** 2 + (y - h * 0.36) ** 2) < 3800) {
        value += 110;
      }

      const pixel = (y * Math.floor(w) + x) * 4;
      image.data[pixel] = Math.min(255, value);
      image.data[pixel + 1] = Math.min(255, value * 1.02);
      image.data[pixel + 2] = Math.min(255, value * 1.04);
      image.data[pixel + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = 'rgba(191, 210, 220, .12)';

  for (let index = 0; index < 9; index += 1) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + index * 22, h * 0.5);
    ctx.lineTo(w * 0.5 + (index + 1) * 42, h * 0.94);
    ctx.stroke();
  }

  if (view === 'ai') {
    ctx.strokeStyle = '#e5edf0';
    ctx.strokeRect(w * 0.54, h * 0.28, 95, 72);
    ctx.strokeRect(w * 0.64, h * 0.51, 74, 58);
  }
}

function runAnalysis() {
  if (!window.currentUploadFile) {
    alert('Please upload a sonar image first!');
    return;
  }

  const overlay = $('#analysisOverlay');
  const bar = $('#analysisBar');
  const pct = $('#analysisPct');
  const text = $('#analysisText');
  const status = $('#sonarStatus');
  const stage = $('#sonarStage');

  overlay.classList.remove('is-hidden');
  status.textContent = 'PROCESSING';

  let progress = 0;
  const steps = [
    'Loading sonar frame…',
    'Correcting motion artifacts…',
    'Suppressing seabed noise…',
    'Detecting acoustic signatures…',
    'Classifying target…',
    'Cross-checking thermal layer…',
    'Calculating confidence…',
    'Complete.'
  ];

  const timer = setInterval(() => {
    progress += 10; // Speed up animation a bit
    const index = Math.min(steps.length - 1, Math.floor(progress / 15));
    bar.style.width = Math.min(progress, 100) + '%';
    pct.textContent = Math.min(progress, 100) + '%';
    text.textContent = steps[index];

    if (progress >= 100) {
      clearInterval(timer);
      executeDjangoAnalysis();
    }
  }, 130);
  
  async function executeDjangoAnalysis() {
    const formData = new FormData();
    formData.append('image', window.currentUploadFile);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/scans/', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      status.textContent = 'ANALYSIS COMPLETE';
      setTimeout(() => overlay.classList.add('is-hidden'), 700);
      
      const image = stage.querySelector('.uploaded-sonar-image');
      const imgWidth = image.naturalWidth || image.width;
      const imgHeight = image.naturalHeight || image.height;
      
      data.detections.forEach(d => {
        const frame = document.createElement('div');
        frame.className = 'target-frame dynamic';
        frame.textContent = d.object_type;
        
        const leftPercent = ((d.bbox_x - (d.bbox_w / 2)) / imgWidth) * 100;
        const topPercent = ((d.bbox_y - (d.bbox_h / 2)) / imgHeight) * 100;
        const widthPercent = (d.bbox_w / imgWidth) * 100;
        const heightPercent = (d.bbox_h / imgHeight) * 100;
        
        frame.style.left = `${leftPercent}%`;
        frame.style.top = `${topPercent}%`;
        frame.style.width = `${widthPercent}%`;
        frame.style.height = `${heightPercent}%`;
        frame.style.position = 'absolute';
        
        if(d.priority === 'HIGH') {
          frame.style.borderColor = 'red';
          frame.style.color = 'red';
        }
        
        frame.style.cursor = 'pointer';
        frame.onclick = () => {
          const mappedData = {
            id: `DET-${d.id}`,
            status: 'VERIFIED',
            type: d.object_type,
            confidence: Math.round(d.confidence * 100),
            risk: d.priority,
            depth: 84.2,
            size: (d.bbox_w / 10).toFixed(1),
            sonarReturn: 0.94,
            lat: data.latitude || 21.4872,
            lng: data.longitude || 72.9011,
            intelligence: {
              model: 'YOLOv8-CUSTOM',
              acousticEvidence: 91,
              shadowConsistency: 88,
              targetShadowMatch: 90,
              temporalConsistency: 85,
              geometricConsistency: 89,
              positionConfidence: 94,
              pings: [0.8, 0.9, 0.95, 0.85, 0.9]
            }
          };
          renderTargetDetail(mappedData);
          document.querySelectorAll('.target-frame.dynamic').forEach(f => f.style.boxShadow = 'none');
          frame.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
        };
        
        stage.appendChild(frame);
      });
      
    } catch (error) {
      console.error(error);
      status.textContent = 'API ERROR';
      setTimeout(() => overlay.classList.add('is-hidden'), 700);
    }
  }
}

function initThermal() {
  drawThermal(thermalView);

  $$('[data-thermal-view]').forEach((button) => {
    button.addEventListener('click', () => {
      $$('[data-thermal-view]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      thermalView = button.dataset.thermalView;
      drawThermal(thermalView);
    });
  });

  $('#runThermalBtn').addEventListener('click', runThermalScan);
  $('#thermalResetBtn').addEventListener('click', () => {
    thermalView = 'field';
    $$('[data-thermal-view]').forEach((button) => button.classList.toggle('active', button.dataset.thermalView === 'field'));
    $('#thermalStatus').textContent = 'READY';
    drawThermal('field');
  });

  $('#thermalConfirmBtn').addEventListener('click', () => {
    $('#thermalStatus').textContent = 'EVIDENCE SAVED';
    $('#thermalConfirmBtn').textContent = 'EVIDENCE SAVED';
  });
}

function drawThermal(mode) {
  const canvas = $('#thermalCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = rect.width;
  const h = rect.height;
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#263a47');
  base.addColorStop(.45, '#111a20');
  base.addColorStop(1, '#050708');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const hotspots = [
    { x: .57, y: .42, r: .15, alpha: .92 },
    { x: .67, y: .58, r: .09, alpha: .56 },
    { x: .34, y: .64, r: .12, alpha: .28 }
  ];

  hotspots.forEach((spot) => {
    const gradient = ctx.createRadialGradient(w * spot.x, h * spot.y, 2, w * spot.x, h * spot.y, w * spot.r);
    gradient.addColorStop(0, `rgba(223, 235, 240, ${spot.alpha})`);
    gradient.addColorStop(.35, `rgba(108, 140, 156, ${spot.alpha * .72})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });

  if (mode === 'contrast') {
    ctx.fillStyle = 'rgba(236, 242, 245, .1)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(239, 245, 247, .42)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w * .53, h * .3, w * .2, h * .24);
  }

  if (mode === 'contours') {
    ctx.strokeStyle = 'rgba(220, 235, 241, .28)';
    ctx.lineWidth = 1;
    for (let index = 1; index < 7; index += 1) {
      ctx.beginPath();
      ctx.ellipse(w * .57, h * .42, w * (.055 + index * .023), h * (.075 + index * .021), -0.18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function runThermalScan() {
  const status = $('#thermalStatus');
  status.textContent = 'SCANNING';

  let progress = 0;
  const timer = setInterval(() => {
    progress += 10;
    if (progress >= 100) {
      clearInterval(timer);
      status.textContent = 'SIGNATURE CAPTURED';
      $('#thermalMatch').textContent = '86%';
      drawThermal('contours');
    }
  }, 100);
}

window.currentUploadFile = null;

function initUploaders() {
  const input = $('#uploadSonarBtn');
  if (!input) return;

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    window.currentUploadFile = file;
    $('#sonarStatus').textContent = 'IMAGE READY. CLICK RUN ANALYSIS.';
    const stage = $('#sonarStage');
    
    if (stage) {
      // Clear old image and bounding boxes
      const existing = stage.querySelector('.uploaded-sonar-image');
      if (existing) existing.remove();
      const oldFrames = stage.querySelectorAll('.target-frame.dynamic');
      oldFrames.forEach(f => f.remove());

      const image = document.createElement('img');
      image.className = 'uploaded-sonar-image';
      image.src = URL.createObjectURL(file);
      image.alt = 'Uploaded sonar image';
      stage.appendChild(image);
    }
    navigate('sonar');
  });
}

let coordinatePickMode = false;
let selectedMapCoordinate = null;

function formatCoordinate(lat, lng) {
  return `${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
}

function setTargetCoordinate(lat, lng, source = 'MANUAL') {
  const latInput = $('#targetLatInput');
  const lngInput = $('#targetLngInput');
  const status = $('#coordinateStatus');

  if (!latInput || !lngInput) return;

  latInput.value = Number(lat).toFixed(4);
  lngInput.value = Number(lng).toFixed(4);

  selectedMapCoordinate = {
    lat: Number(lat),
    lng: Number(lng)
  };

  if (status) {
    status.textContent = `${source} / ${formatCoordinate(Number(lat), Number(lng))}`;
  }
}

function locateTargetCoordinate() {
  const lat = Number($('#targetLatInput')?.value);
  const lng = Number($('#targetLngInput')?.value);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    $('#coordinateStatus').textContent = 'INVALID COORDINATES / CHECK LATITUDE & LONGITUDE';
    return;
  }

  selectedMapCoordinate = { lat, lng };
  $('#coordinateStatus').textContent = `TARGET SET / ${formatCoordinate(lat, lng)}`;

  navigate('mission');

  setTimeout(() => {
    window.focusCoordinate?.(lat, lng);
  }, 120);
}

function initCoordinateTools() {
  const locateBtn = $('#locateCoordinateBtn');
  const pickBtn = $('#pickMapCoordinateBtn');

  locateBtn?.addEventListener('click', locateTargetCoordinate);

  pickBtn?.addEventListener('click', () => {
    coordinatePickMode = true;
    $('#coordinateStatus').textContent = 'PICK MODE ACTIVE / CLICK ANYWHERE ON THE MISSION MAP';
    navigate('mission');

    setTimeout(() => {
      window.enableMapCoordinatePick?.();
    }, 120);
  });
}

window.receiveMapCoordinate = (lat, lng) => {
  setTargetCoordinate(lat, lng, 'MAP PICK');
  coordinatePickMode = false;
  navigate('sonar');
};

function startClock() {
  setInterval(() => {
    const d = new Date();
    $('#clock').textContent = d.toLocaleTimeString('en-GB', { hour12: false });
  }, 1000);
}

function openCommand() {
  $('#commandPalette').classList.remove('is-hidden');
  $('#commandInput').value = '';
  renderCommands();
  setTimeout(() => $('#commandInput').focus(), 30);
}

function closeCommand() {
  $('#commandPalette').classList.add('is-hidden');
}

function renderCommands() {
  const query = $('#commandInput').value.toLowerCase();
  const commands = [
    ['Open Mission Control', 'Live mission map and AUV telemetry'],
    ['Open Sonar Intelligence', 'Inspect side-scan imagery'],
    ['Open Thermal Signature', 'Review secondary temperature evidence'],
    ['Open Target Registry', 'Search detections'],
    ['Open Mission Analytics', 'Review model and survey metrics'],
    ['Open Mission Report', 'View export-ready report'],
    ...APP_DATA.detections.map((d) => [`Inspect ${d.id}`, d.type])
  ].filter((item) => item.join(' ').toLowerCase().includes(query)).slice(0, 10);

  $('#commandResults').innerHTML = commands.map((command, index) => `
    <div class="cmd-item" data-cmd="${index}">
      <b>${command[0]}</b>
      <span>${command[1]}</span>
    </div>
  `).join('');

  $$('#commandResults .cmd-item').forEach((element, index) => {
    element.addEventListener('click', () => {
      const command = commands[index][0];
      const page = command.includes('Mission Control') ? 'mission'
        : command.includes('Sonar Intelligence') ? 'sonar'
        : command.includes('Thermal Signature') ? 'thermal'
        : command.includes('Target Registry') ? 'targets'
        : command.includes('Mission Analytics') ? 'analytics'
        : command.includes('Mission Report') ? 'reports'
        : null;

      if (page) {
        navigate(page);
      } else {
        const id = command.split(' ')[1];
        openTarget(id);
      }

      closeCommand();
    });
  });
}

function download(name, text, type) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([text], { type }));
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

$('#brandBtn').addEventListener('click', () => $('#rail').classList.toggle('collapsed'));
$('#currentMissionBtn').addEventListener('click', openMissionHub);
$('#newMissionBtn').addEventListener('click', () => $('#missionForm').classList.toggle('is-hidden'));
$('#missionForm').addEventListener('submit', createMission);
$$('.rail-item').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
$$('[data-page-jump]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.pageJump)));
$$('[data-map-layer]').forEach((button) => button.addEventListener('click', () => {
  $$('[data-map-layer]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  window.setMapLayer?.(button.dataset.mapLayer);
}));
$('#mapFullscreenBtn').addEventListener('click', async () => {
  const mapPanel = document.querySelector('.mission-grid > .map-panel');
  if (!mapPanel) return;

  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await mapPanel.requestFullscreen?.();
  }

  window.refreshMissionMap?.();
});
document.addEventListener('fullscreenchange', () => {
  const button = $('#mapFullscreenBtn');
  if (!button) return;
  const active = Boolean(document.fullscreenElement);
  button.textContent = active ? '⛶ EXIT' : '⛶';
  button.title = active ? 'Exit fullscreen map' : 'Fullscreen map';
  window.refreshMissionMap?.();
});
$('#mobileToggle').addEventListener('click', () => $('#rail').classList.toggle('open'));
$('#notifyBtn').addEventListener('click', () => $('#notifyPanel').classList.toggle('is-hidden'));
$('#closeNotify').addEventListener('click', () => $('#notifyPanel').classList.add('is-hidden'));
$('#clearTarget').addEventListener('click', () => {
  selectedId = null;
  $('#selectedTarget').innerHTML = '<div class="empty-state">Select a target from the map or registry.</div>';
});
$('#exportBtn').addEventListener('click', () => download('ocean-07-targets.json', JSON.stringify(APP_DATA.detections, null, 2), 'application/json'));
$('#themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  window.refreshMapTheme?.();
});
$('#searchBtn').addEventListener('click', openCommand);
$('#commandInput').addEventListener('input', renderCommands);
$('#commandPalette').addEventListener('click', (event) => {
  if (event.target.id === 'commandPalette') closeCommand();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCommand();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openCommand();
  }
});

$('#targetSearch').addEventListener('input', renderTargets);
$$('.filter-pill').forEach((button) => {
  button.addEventListener('click', () => {
    $$('.filter-pill').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    renderTargets();
  });
});

window.addEventListener('resize', () => {
  if (currentPage === 'analytics') renderAnalytics();
  if (currentPage === 'thermal') drawThermal(thermalView);
  if (!$('#app').classList.contains('is-hidden')) {
    const activeSonar = $('.segmented button[data-view].active');
    drawSonar(activeSonar?.dataset.view || 'raw');
    window.refreshMissionMap?.();
  }
});

animateIntro();

function pushNotification(title, message) {
  const panel = $('#notifyPanel');
  panel.classList.remove('is-hidden');
  const alertItem = document.createElement('div');
  alertItem.className = 'alert-item';
  alertItem.innerHTML = `<b>${title}</b><span>${message}</span>`;
  
  panel.insertBefore(alertItem, panel.querySelector('.panel-top').nextSibling);
  setTimeout(() => alertItem.remove(), 4000);
}

function requestRescan(id) {
  rescanTargetId = id;
  const detection = APP_DATA.detections.find((item) => item.id === id);
  if (detection) renderTargetDetail(detection);
  $('#sonarStatus').textContent = `RE-SCAN QUEUED / ${id}`;
  pushNotification(`SECONDARY SCAN REQUEST`, `${id} queued for a secondary sonar pass`);
}

function verifyTarget(id) {
  const detection = APP_DATA.detections.find((item) => item.id === id);
  if (detection) {
    detection.status = 'Verified';
    rescanTargetId = null;
    renderTargetDetail(detection);
    renderTargetInspector(detection);
  }
  $('#sonarStatus').textContent = `VERIFIED / ${id}`;
  pushNotification(`VERIFIED BY OPERATOR`, `${id} marked and sent to evidence store`);
}

function confirmRescan(id) {
  const detection = APP_DATA.detections.find((item) => item.id === id);
  if (detection) {
    detection.status = 'Pending Review';
    rescanTargetId = null;
    renderTargetDetail(detection);
    renderTargetInspector(detection);
  }
  $('#sonarStatus').textContent = `RE-SCAN PLANNED / ${id}`;
  pushNotification('SECONDARY SCAN PLANNED', `${id} marked pending review`);
}

$('#exportReportBtn').addEventListener('click', () => {
  pushNotification('EXPORT INITIATED', 'Generating PDF report...');
});

function updateThermalTarget(detection) {
  if (!$('#thermalTargetName')) return;
  $('#thermalTargetName').textContent = `${detection.id} / ${detection.type.toUpperCase()}`;
  $('#thermalMatch').textContent = `${getTargetIntelligence(detection).thermalMatch}%`;
}

window.navigate = navigate;