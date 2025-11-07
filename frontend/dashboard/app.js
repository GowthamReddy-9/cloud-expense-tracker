const API_URL = "https://qx5ntmlkql.execute-api.us-east-1.amazonaws.com/dev/costs";

async function loadData() {
  const res = await fetch(API_URL);
  const data = await res.json();

  const labels = data.map(d => d.date);
  const values = data.map(d => parseFloat(d.cost));

  new Chart(document.getElementById("costChart"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Daily Cost ($)",
        data: values,
        borderWidth: 2
      }]
    }
  });
}

loadData();
