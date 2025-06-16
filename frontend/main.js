import Chart from 'chart.js/auto';

async function fetchChecks() {
  const res = await fetch('/api/checks');
  return res.json();
}

async function fetchSettings() {
  const res = await fetch('/api/settings');
  return res.json();
}

async function saveSettings(s) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s)
  });
}

function initChart(data) {
  const ctx = document.getElementById('chart').getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.checkedAt).toLocaleTimeString()),
      datasets: [{
        label: 'Status',
        data: data.map(d => d.status ? 1 : 0),
        borderColor: 'green'
      }]
    },
    options: {
      scales: {
        y: { min: 0, max: 1 }
      }
    }
  });
}

async function init() {
  const settings = await fetchSettings();
  document.getElementById('frequency').value = settings.frequency;
  document.getElementById('timeframe').value = settings.timeframeHours;

  const data = await fetchChecks();
  const chart = initChart(data);

  document.getElementById('saveSettings').onclick = async () => {
    const s = {
      frequency: parseInt(document.getElementById('frequency').value),
      timeframeHours: parseInt(document.getElementById('timeframe').value)
    };
    await saveSettings(s);
    location.reload();
  };
}

init();
