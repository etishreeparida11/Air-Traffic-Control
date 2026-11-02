/* Chart.js analytics powered by live API data. */
(() => {
  async function loadAnalytics() {
    const response = await fetch("/api/statistics");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load network analytics.");
    document.getElementById("analyticsDistance").textContent = data.total_network_distance === null
      ? "—" : `${Number(data.total_network_distance).toLocaleString()} km`;
    document.getElementById("analyticsSelected").textContent = data.network_connected
      ? Math.max(data.connected_airports - 1, 0) : "—";
    document.getElementById("analyticsConnected").textContent =
      `${data.connected_airports} / ${data.total_airports}`;
    if (!window.Chart) throw new Error("Chart.js did not load. Check your internet connection and refresh.");
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.color = "#8995a6";
    new Chart(document.getElementById("connectivityChart"), {
      type: "bar",
      data: {
        labels: data.airports.map((airport) => airport.code),
        datasets: [{
          label: "Available connections",
          data: data.airports.map((airport) => data.routes.filter((route) =>
            route.status === "Available" &&
            (route.source_id === airport.id || route.destination_id === airport.id)).length),
          backgroundColor: ["#5d85ed", "#64a9ca", "#8c9feb", "#54b99a", "#81b8df"],
          borderRadius: 5,
          maxBarThickness: 38,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, border: { display: false }, grid: { color: "#eff2f6" }, ticks: { precision: 0 } },
        },
      },
    });
    new Chart(document.getElementById("distanceChart"), {
      type: "bar",
      data: {
        labels: data.routes.map((route) => `${route.source_code}–${route.destination_code}`),
        datasets: [{
          label: "Distance (km)",
          data: data.routes.map((route) => route.distance),
          backgroundColor: data.routes.map((route) => route.status === "Restricted" ? "#e5ba76" : "#7c9bea"),
          borderRadius: 4,
          maxBarThickness: 30,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } },
          y: { beginAtZero: true, border: { display: false }, grid: { color: "#eff2f6" } },
        },
      },
    });
  }
  loadAnalytics().catch((error) => {
    const region = document.getElementById("toastRegion");
    const toast = document.createElement("div");
    toast.className = "toast error";
    toast.textContent = error.message;
    region.append(toast);
  });
})();
