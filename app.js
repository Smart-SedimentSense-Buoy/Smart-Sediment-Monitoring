// --- Data ---
const buoys = [
    { id: 'B01', name: 'Buoy 01', lat: 8.4735907, lng: 124.8698826, flow: 2.5, sediment: false },
    { id: 'B02', name: 'Buoy 02', lat: 8.5151001, lng: 124.8063018, flow: 1.8, sediment: true },
    { id: 'B03', name: 'Buoy 03', lat: 8.5390109, lng: 124.7704314, flow: 1.2, sediment: false }
  ];
  
  // Colors for combined statuses
  const STATUS_COLORS = { 
    normal: '#28a745', 
    warning: '#ffc107', 
    flood: '#dc3545',
    "normal with sediments": '#146404ff',
    "warning with sediments": '#d86c13ff',
    "flood with sediments": '#b10600ff'
  };
  
  // --- Function to determine status based on flowrate + sediment ---
  function getStatusFromSensors(flow, sediment) {
    let baseStatus;
    if (flow < 2.0) baseStatus = 'normal';
    else if (flow >= 2.0 && flow < 3.5) baseStatus = 'warning';
    else baseStatus = 'flood';
  
    return sediment ? `${baseStatus} with sediments` : baseStatus;
  }
  
  // Assign initial status
  buoys.forEach(b => {
    b.status = getStatusFromSensors(b.flow, b.sediment);
  });
  
  // --- Map ---
  const map = L.map('map').setView([8.49, 124.82], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  const markers = {};
  
  buoys.forEach(b => {
    const marker = L.circleMarker([b.lat, b.lng], {
      radius: 10,
      fillColor: STATUS_COLORS[b.status],
      color: '#000',
      weight: 1,
      fillOpacity: 0.9
    }).addTo(map);
  
    marker.bindPopup(`
      <b>${b.name}</b><br>
      Status: ${b.status}
      <br><button class="btn btn-sm btn-link p-0" onclick="showInfo('${b.id}')">More info</button> | 
      <button class="btn btn-sm btn-link p-0" onclick="openEdit('${b.id}')">Edit buoy</button>
    `);
  
    markers[b.id] = marker;
  });
  
  // --- Status Chart ---
  const statusChart = new Chart(document.getElementById('statusChart'), {
    type: 'pie',
    data: {
      labels: Object.keys(STATUS_COLORS),
      datasets: [{
        data: new Array(Object.keys(STATUS_COLORS).length).fill(0),
        backgroundColor: Object.values(STATUS_COLORS)
      }]
    }
  });
  function updateChart(){
    const counts = {};
    Object.keys(STATUS_COLORS).forEach(k => counts[k] = 0);
    buoys.forEach(b => counts[b.status]++);
    statusChart.data.datasets[0].data = Object.keys(STATUS_COLORS).map(k => counts[k]);
    statusChart.update();
  }
  updateChart();
  
  // --- Flowrate Line Chart ---
  const flowChart = new Chart(document.getElementById('flowChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: buoys.map((b,i) => ({
        label: b.name,
        data: [],
        borderColor: ['#007bff','#fd7e14','#20c997'][i%3],
        fill: false
      }))
    },
    options: {
      scales: { 
        x: { title: { display:true, text:'Time' } }, 
        y: { title: { display:true, text:'Flowrate (m/s)' } } 
      }
    }
  });
  
  // --- Edit Modal ---
  const buoySelect = document.getElementById('buoySelect');
  const statusSelect = document.getElementById('statusSelect');
  buoys.forEach(b => buoySelect.innerHTML += `<option value="${b.id}">${b.name}</option>`);
  const editModal = new bootstrap.Modal(document.getElementById('editModal'));
  
  function openEdit(id){
    buoySelect.value = id;
    statusSelect.value = buoys.find(b => b.id===id).status;
    editModal.show();
  }
  window.openEdit = openEdit;
  
  document.getElementById('editForm').onsubmit = e => {
    e.preventDefault();
    const buoy = buoys.find(x => x.id === buoySelect.value);
    buoy.status = statusSelect.value;
    markers[buoy.id].setStyle({ fillColor: STATUS_COLORS[buoy.status] });
    updateChart();
    editModal.hide();
  };
  
  // --- Info Modal ---
  const infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
  function showInfo(id){
    const b = buoys.find(x => x.id===id);
    document.getElementById('infoContent').innerHTML = `
      <p><b>ID:</b> ${b.id}</p>
      <p><b>Name:</b> ${b.name}</p>
      <p><b>Status:</b> <span style="color:${STATUS_COLORS[b.status]}">${b.status}</span></p>
      <p><b>Current Flowrate:</b> ${b.flow.toFixed(2)} m/s</p>
      <p><b>With Sediment:</b> ${b.sediment ? 'Yes' : 'No'}</p>`;
    infoModal.show();
  }
  window.showInfo = showInfo;
  
  // --- Log + Flow & Sediment updater every 10s ---
  const logBody = document.getElementById('logBody');
  function tick(){
    const now = new Date().toLocaleTimeString();
    flowChart.data.labels.push(now);
    if(flowChart.data.labels.length > 10) flowChart.data.labels.shift();
  
    buoys.forEach((b,i) => {
      b.flow = Math.max(0.1, b.flow + (Math.random()-0.5)*0.4);
      if (Math.random() > 0.7) b.sediment = !b.sediment;
      b.status = getStatusFromSensors(b.flow, b.sediment);
  
      flowChart.data.datasets[i].data.push(b.flow.toFixed(2));
      if(flowChart.data.datasets[i].data.length > 10) {
        flowChart.data.datasets[i].data.shift();
      }
  
      const row = document.createElement('tr');
      row.innerHTML = `<td>${now}</td>
                       <td>${b.name}</td>
                       <td><span class="color-dot" style="background:${STATUS_COLORS[b.status]}"></span> ${b.status}</td>
                       <td>${b.flow.toFixed(2)}</td>
                       <td>${b.sediment ? 'Yes' : 'No'}</td>`;
      logBody.prepend(row);
  
      markers[b.id].setStyle({ fillColor: STATUS_COLORS[b.status] });
      markers[b.id].bindPopup(`
        <b>${b.name}</b><br>
        Status: <span style="color:${STATUS_COLORS[b.status]}">${b.status}</span><br>
        Flowrate: ${b.flow.toFixed(2)} m/s<br>
        With Sediment: ${b.sediment ? 'Yes' : 'No'}
        <br><button class="btn btn-sm btn-link p-0" onclick="showInfo('${b.id}')">More info</button> | 
        <button class="btn btn-sm btn-link p-0" onclick="openEdit('${b.id}')">Edit buoy</button>
      `);
    });
  
    flowChart.update();
    updateChart();
  }
  setInterval(tick, 10000);
  
  // --- Demo Flood Prediction Simulation ---
  let step = 0;
  function floodDemoTick() {
    const now = new Date().toLocaleTimeString();
    flowChart.data.labels.push(now);
    if (flowChart.data.labels.length > 10) flowChart.data.labels.shift();
  
    buoys.forEach((b, i) => {
      const targetFlow = 4.0;
      const increment = (targetFlow - b.flow) / (6 - step);
      if (step < 6) b.flow += increment;
      else b.flow = targetFlow;
      if (step >= 2) b.sediment = true;
      b.status = getStatusFromSensors(b.flow, b.sediment);
  
      flowChart.data.datasets[i].data.push(b.flow.toFixed(2));
      if (flowChart.data.datasets[i].data.length > 10) {
        flowChart.data.datasets[i].data.shift();
      }
  
      const row = document.createElement('tr');
      row.innerHTML = `<td>${now}</td>
                       <td>${b.name}</td>
                       <td><span class="color-dot" style="background:${STATUS_COLORS[b.status]}"></span> ${b.status}</td>
                       <td>${b.flow.toFixed(2)}</td>
                       <td>${b.sediment ? 'Yes' : 'No'}</td>`;
      logBody.prepend(row);
  
      markers[b.id].setStyle({ fillColor: STATUS_COLORS[b.status] });
      markers[b.id].bindPopup(`
        <b>${b.name}</b><br>
        Status: <span style="color:${STATUS_COLORS[b.status]}">${b.status}</span><br>
        Flowrate: ${b.flow.toFixed(2)} m/s<br>
        With Sediment: ${b.sediment ? 'Yes' : 'No'}
        <br><button class="btn btn-sm btn-link p-0" onclick="showInfo('${b.id}')">More info</button> | 
        <button class="btn btn-sm btn-link p-0" onclick="openEdit('${b.id}')">Edit buoy</button>
      `);
    });
  
    flowChart.update();
    updateChart();
  
    step++;
    if (step > 6) clearInterval(floodDemoInterval);
  }
  const floodDemoInterval = setInterval(floodDemoTick, 5000);