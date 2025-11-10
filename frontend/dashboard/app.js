// Replace API_BASE with your actual API Gateway base invoke URL (no trailing slash)
const API_BASE = "https://qx5ntmlkql.execute-api.us-east-1.amazonaws.com/dev";
const COST_URL = `${API_BASE}/costs`;
const HISTORY_URL = `${API_BASE}/history`;

const display = document.getElementById('data-display');
const refreshBtn = document.getElementById('refresh-btn');
const chartCanvas = document.getElementById('costChart');
let chart = null;

function safeParseApiResponse(jsonOrWrapped) {
  // API Gateway + Lambda proxy sometimes returns an object with .body as string
  if (!jsonOrWrapped) return null;
  if (jsonOrWrapped.body) {
    try {
      return JSON.parse(jsonOrWrapped.body);
    } catch (e) {
      // body might already be parsed or be a plain string
      try { return JSON.parse(String(jsonOrWrapped.body)); } catch (_) { return null; }
    }
  }
  // otherwise assume it's already the payload
  return jsonOrWrapped;
}

function showError(msg) {
  display.innerHTML = `<p class="error">✖ Failed to fetch data: ${msg}</p>`;
  if (chart) { chart.destroy(); chart = null; }
}

async function fetchJson(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function renderChart(history) {
  if (!Array.isArray(history) || history.length === 0) {
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  const labels = history.map(i => i.date);
  const values = history.map(i => Number(i.cost));

  if (chart) chart.destroy();
  chart = new Chart(chartCanvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'AWS Daily Cost ($)',
        data: values,
        borderWidth: 2,
        tension: 0.25,
        fill: false,
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function fetchCostData() {
  display.innerHTML = `<p class="muted">Fetching latest cost data...</p>`;
  refreshBtn.disabled = true;

  try {
    // parallel fetch
    const [costRaw, historyRaw] = await Promise.allSettled([fetchJson(COST_URL), fetchJson(HISTORY_URL)]);

    // parse cost
    if (costRaw.status === 'fulfilled') {
      const costPayload = safeParseApiResponse(costRaw.value);
      const current = (costPayload && (costPayload.cost ?? costPayload.body?.cost)) ?? null;
      display.innerHTML = `<h2>$${current !== null ? Number(current).toFixed(2) : '0.00'}</h2><p class="muted">Latest daily cost</p>`;
    } else {
      // if cost fails, show a warning but try history
      display.innerHTML = `<p class="muted">Could not load latest cost (${costRaw.reason}). Showing history if available.</p>`;
    }

    // parse history
    if (historyRaw.status === 'fulfilled') {
      const historyPayload = safeParseApiResponse(historyRaw.value);
      const history = historyPayload?.history ?? null;
      if (!history) {
        // some backends might return history directly
        if (Array.isArray(historyRaw.value)) renderChart(historyRaw.value);
        else renderChart([]);
      } else {
        renderChart(history);
      }
    } else {
      // history failed
      renderChart([]);
      console.warn('history fetch error', historyRaw.reason);
    }
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', fetchCostData);
window.addEventListener('load', fetchCostData);
