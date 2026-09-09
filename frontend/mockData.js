const APP_DATA = {
  mission: {
    id: "OCEAN-07",
    name: "Gulf of Khambhat Survey",
    status: "ACTIVE",
    distance: 32.8,
    area: 84.2,
    surveyedArea: 82.1,
    remainingArea: 22.6,
    sonarPings: 18492,
    detectionCount: 127,
    auv: { depth: 84.2, speed: 2.8, heading: 127, battery: 78, signal: 92, lat: 21.4872, lng: 72.9011 }
  },
  missions: [
    { id: "OCEAN-07", name: "Gulf of Khambhat Survey", region: "Gulf of Khambhat", type: "Marine Debris Survey", auv: "AUV-01", status: "ACTIVE", startCoordinates: { lat: 21.4872, lng: 72.9011 }, surveyArea: 104.7, coverage: 78.4 },
    { id: "PACIFIC-01", name: "Pacific Ocean Exploration", region: "Pacific Ocean", type: "Marine Debris Survey", auv: "AUV-03", status: "PLANNED", startCoordinates: { lat: 34.0522, lng: -120.1936 }, surveyArea: 240.0, coverage: 0 },
    { id: "REDSEA-02", name: "Red Sea Exploration", region: "Red Sea", type: "Underwater Anomaly Survey", auv: "AUV-02", status: "PAUSED", startCoordinates: { lat: 20.1150, lng: 38.5500 }, surveyArea: 128.5, coverage: 46.2 },
    { id: "ARABIAN-04", name: "Arabian Sea Survey", region: "Arabian Sea", type: "Environmental Survey", auv: "AUV-04", status: "COMPLETED", startCoordinates: { lat: 15.2000, lng: 65.4000 }, surveyArea: 318.0, coverage: 100 }
  ],
  statistics: {
    totalScans: 1284, anomaliesDetected: 327, debrisIdentified: 214, aiAccuracy: 94.8, areaAnalyzed: 482
  },
  detections: [
    { id:"MD-042", type:"Metal Debris",       category:"debris",  confidence:96.4, depth:84.2,  lat:21.4872, lng:72.9011, risk:"HIGH",   size:1.8, timestamp:"14:28:31 UTC", status:"Verified", description:"Strong acoustic return with geometric reflection pattern consistent with submerged metallic debris. High angular scattering observed with characteristic specular highlight.", sonarReturn:0.94, intelligence: { model:"SONAR-V2", acousticEvidence:91, shadowConsistency:93, targetShadowMatch:93, geometricConsistency:90, temporalConsistency:92, positionConfidence:94, dataQuality:92, seabed:{sand:72, rock:18, vegetation:10}, naturalProbability:21, manMadeProbability:79, falseAlarmRisk:"LOW", thermalEvidence:"Metallic / Structural Pattern", thermalMatch:81, pings:[421,422,423,424], recommendedAction:"VERIFY TARGET", recommendedReason:"High acoustic and temporal consistency." } },
    { id:"MD-031", type:"Plastic Debris",      category:"debris",  confidence:91.7, depth:62.8,  lat:21.5124, lng:72.8834, risk:"MEDIUM", size:0.6, timestamp:"13:44:18 UTC", status:"Verified", description:"Diffuse acoustic shadow with low backscatter signature. Size and shape consistent with large plastic debris aggregate or discarded packaging material.", sonarReturn:0.71 },
    { id:"AN-118", type:"Unknown Anomaly",     category:"anomaly", confidence:82.1, depth:103.4, lat:21.4521, lng:72.9342, risk:"HIGH",   size:3.2, timestamp:"12:19:55 UTC", status:"Pending",  description:"Unusual acoustic return with no clear classification match in current model. Requires further investigation. Possible structural debris or uncharted equipment.", sonarReturn:0.88 },
    { id:"FD-009", type:"Fishing Equipment",   category:"debris",  confidence:94.3, depth:71.6,  lat:21.5312, lng:72.8621, risk:"HIGH",   size:4.1, timestamp:"11:52:07 UTC", status:"Verified", description:"Extended linear acoustic signature consistent with abandoned fishing net or longline gear. Entanglement hazard for marine megafauna and AUV operations.", sonarReturn:0.82 },
    { id:"NF-217", type:"Natural Formation",   category:"natural", confidence:88.2, depth:91.3,  lat:21.4690, lng:72.8905, risk:"LOW",    size:2.9, timestamp:"11:08:44 UTC", status:"Verified", description:"Smooth continuous acoustic return consistent with rocky reef formation. Natural texture gradient, no debris indicators. Logged for bathymetric record.", sonarReturn:0.65 },
    { id:"MD-058", type:"Container Fragment",  category:"debris",  confidence:89.6, depth:78.4,  lat:21.5021, lng:72.9201, risk:"MEDIUM", size:2.3, timestamp:"10:33:21 UTC", status:"Pending",  description:"Rectangular acoustic shadow consistent with shipping container fragment or structural steel panel. Moderate risk classification pending verification dive.", sonarReturn:0.87 },
    { id:"AN-091", type:"Unknown Anomaly",     category:"anomaly", confidence:76.8, depth:115.7, lat:21.4401, lng:72.8744, risk:"MEDIUM", size:1.1, timestamp:"09:57:12 UTC", status:"Pending",  description:"Small dense acoustic return at depth. Pattern does not match known debris signatures in training corpus. Low confidence—model requests re-scan at lower range setting.", sonarReturn:0.79 },
    { id:"TR-014", type:"Tire / Rubber",       category:"debris",  confidence:93.1, depth:55.3,  lat:21.5442, lng:72.8512, risk:"LOW",    size:0.7, timestamp:"09:18:39 UTC", status:"Verified", description:"Circular acoustic shadow with characteristic hollow-center depression pattern. High confidence match for vehicular tire debris. Common in coastal survey zones.", sonarReturn:0.76 }
  ],
  missionRoute: [
    [21.4401,72.8512],[21.4521,72.8621],[21.4690,72.8744],
    [21.4872,72.8905],[21.5021,72.9011],[21.5124,72.9201],
    [21.5312,72.9342],[21.5442,72.9011]
  ],
  thermal: {
    ambientTempC: 23.4,
    targetDeltaC: 2.7,
    thermalMatch: 81,
    sensor: "TEMP-ARRAY-02",
    status: "AVAILABLE"
  },
  aiInsights: {
    debrisByType: [
      { label:"Metal",       value:38 },
      { label:"Plastic",     value:27 },
      { label:"Fishing Gear",value:19 },
      { label:"Container",   value: 9 },
      { label:"Other",       value: 7 }
    ],
    confidenceDist: [
      { range:"90–100%", count:142 },
      { range:"80–90%",  count: 98 },
      { range:"70–80%",  count: 54 },
      { range:"<70%",    count: 33 }
    ],
    weeklyTrend: [12,18,14,22,19,27,31,24,29,35,28,34,41,37]
  }
};
