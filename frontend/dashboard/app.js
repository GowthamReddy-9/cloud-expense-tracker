const API_BASE = "https://qx5ntmlkql.execute-api.us-east-1.amazonaws.com/dev";
const COST_URL = `${API_BASE}/costs`;
const HISTORY_URL = `${API_BASE}/history`;
let chart;

async function fetchCostData() {
  const display = document.getElementById("data-display");
  display.innerHTML = "Fetching latest cost data...";

  try {
    const [costRes, historyRes] = await Promise.all([
      fetch(COST_URL),
      fetch(HISTORY_URL)
    ]);

    const costData = await costRes.json();
    const historyData = await historyRes.json();

    const latest = costData.cost?.toFixed(2) || "0.00";
    display.innerHTML = `<h2>💰 Current Cost: $${latest}</h2>`;

    renderChart(historyData.history);
  } catch (err) {
    display.innerHTML = `<p style="color:red;">❌ Failed to fetch data: ${err.message}</p>`;
  }
}

function renderChart(history) {
  const ctx = document.getElementById("costChart").getContext("2d");
  const labels = history.map(item => item.date);
  const values = history.map(item => item.cost);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "AWS Daily Cost ($)",
          data: values,
          borderWidth: 2,
          tension: 0.3
        }
      ]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

window.onload = fetchCostData;
document.getElementById("refresh-btn").addEventListener("click", fetchCostData);
