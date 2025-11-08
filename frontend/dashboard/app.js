const API_URL = "https://qx5ntmlkql.execute-api.us-east-1.amazonaws.com/dev/costs"; // Replace with your deployed AWS API Gateway endpoint
let chart;

// Fetch and display AWS cost data
async function fetchCostData() {
  const display = document.getElementById("data-display");
  const button = document.getElementById("refresh-btn");
  const ctx = document.getElementById("costChart").getContext("2d");

  display.innerHTML = "<p>Fetching latest cost data...</p>";
  button.disabled = true;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("API Error");
    const data = await response.json();

    // If Lambda returns only one day
    if (!data.history) {
      display.innerHTML = `
        <h3>📅 Date: ${data.date}</h3>
        <h2>💰 Total Cost: $${parseFloat(data.cost).toFixed(2)}</h2>
      `;
      if (chart) chart.destroy();
      return;
    }

    // For multiple days (chart view)
    const dates = data.history.map(item => item.date);
    const costs = data.history.map(item => parseFloat(item.cost).toFixed(2));

    display.innerHTML = `
      <h2>💰 Latest Cost: $${costs[costs.length - 1]}</h2>
      <p>Last updated: ${dates[dates.length - 1]}</p>
    `;

    if (chart) chart.destroy(); // Reset existing chart

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          label: "AWS Daily Cost ($)",
          data: costs,
          borderWidth: 2,
          fill: false,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  } catch (err) {
    display.innerHTML = `<p style="color:red;">❌ Failed to fetch data: ${err.message}</p>`;
  } finally {
    button.disabled = false;
  }
}

document.getElementById("refresh-btn").addEventListener("click", fetchCostData);
window.onload = fetchCostData;
