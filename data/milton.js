// Simplified Hurricane Milton data. Replace later with real NHC advisory data.
// track rows: [hours before landfall, latitude, longitude, max wind mph]
window.MILTON = {
  landfall: Date.UTC(2024, 9, 10, 0, 30), // Oct 9, 2024 8:30 pm EDT
  track: [
    [108, 21.9, -95.3, 45], [84, 22.3, -93.8, 70], [60, 21.9, -91.8, 150],
    [48, 21.8, -90.6, 175], [36, 22.0, -88.2, 155], [24, 23.2, -86.2, 150],
    [12, 24.5, -84.7, 130], [6, 25.7, -83.9, 130], [0, 27.2, -82.6, 115],
    [-9, 28.4, -80.7, 85], [-14, 29.0, -78.0, 80]
  ],
  steps: [108, 96, 84, 72, 60, 48, 36, 24, 18, 12, 6, 0],
  cities: [
    { name: "St. Petersburg", lat: 27.77, lon: -82.64, surge: true, zone: "If you live in Evacuation Zone A, leave when ordered." },
    { name: "Palm Coast", lat: 29.58, lon: -81.21, surge: false, zone: "Check whether your home is in a flood zone or a mobile home." },
    { name: "Miami", lat: 25.76, lon: -80.19, surge: false, zone: "Know your zone, even if the storm looks far away." }
  ]
};
