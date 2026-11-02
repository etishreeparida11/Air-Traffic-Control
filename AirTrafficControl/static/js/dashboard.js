/* Shared dashboard behavior and API-backed airport/route management. */
(() => {
  const page = document.body.dataset.page;
  const toastRegion = document.getElementById("toastRegion");
  let airportCache = [];
  let routeCache = [];

  function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " error" : ""}`;
    toast.textContent = message;
    toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || data.message || "The request could not be completed.");
      error.result = data;
      throw error;
    }
    return data;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function routeEndpoint(name, code) {
    const endpoint = element("div", "route-endpoint");
    endpoint.append(element("span", "airport-name", name), element("span", "code-chip", code));
    return endpoint;
  }

  function statusBadge(status) {
    return element("span", `status-badge ${status.toLowerCase()}`, status);
  }

  function renderRouteRows(tbody, routes, withActions) {
    tbody.replaceChildren();
    if (!routes.length) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = withActions ? 5 : 4;
      cell.className = "empty-state";
      cell.textContent = "No flight routes found.";
      return;
    }
    routes.forEach((route) => {
      const row = tbody.insertRow();
      row.insertCell().append(routeEndpoint(route.source_name, route.source_code));
      row.insertCell().append(routeEndpoint(route.destination_name, route.destination_code));
      row.insertCell().textContent = `${Number(route.distance).toLocaleString()} km`;
      row.insertCell().append(statusBadge(route.status));
      if (withActions) {
        const actionCell = row.insertCell();
        const button = element("button", "action-button");
        button.type = "button";
        button.title = "Delete route";
        button.setAttribute("aria-label", `Delete route ${route.source_code} to ${route.destination_code}`);
        button.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
        button.addEventListener("click", () => deleteRecord(`/api/routes/${route.id}`, "Route deleted."));
        actionCell.append(button);
      }
    });
  }

  async function loadDashboard() {
    const stats = await api("/api/statistics");
    const airports = stats.airports;
    const routes = stats.routes.sort((a, b) =>
      a.source_name.localeCompare(b.source_name) ||
      a.destination_name.localeCompare(b.destination_name));
    airportCache = airports;
    routeCache = routes;
    document.getElementById("statAirports").textContent = stats.total_airports;
    document.getElementById("statRoutes").textContent =
      stats.available_routes + stats.restricted_routes;
    document.getElementById("statDistance").textContent = stats.total_network_distance === null
      ? "—" : `${Number(stats.total_network_distance).toLocaleString()} km`;

    const airportRows = document.getElementById("airportList");
    airportRows.replaceChildren();
    airports.forEach((airport) => {
      const row = airportRows.insertRow();
      row.insertCell().append(element("span", "airport-name", airport.name));
      row.insertCell().append(element("span", "code-chip", airport.code));
      row.insertCell().textContent = airport.location;
    });
    if (!airports.length) {
      const row = airportRows.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.className = "empty-state";
      cell.textContent = "No airports found.";
    }

    const startSelect = document.getElementById("startAirport");
    startSelect.replaceChildren();
    airports.forEach((airport) => {
      const option = element("option", "", `${airport.name} (${airport.code})`);
      option.value = airport.id;
      startSelect.append(option);
    });
    if (!airports.length) {
      startSelect.append(element("option", "", "No airports available"));
    }
    document.getElementById("optimizeButton").disabled = !airports.length;
    renderRouteRows(document.getElementById("recentRoutes"), routes, false);
    document.getElementById("optimizeButton").addEventListener("click", calculateOptimalRoutes);
  }

  function showOptimizationResult(resultBox, result) {
    resultBox.classList.toggle("error", !result.connected);
    resultBox.replaceChildren();
    resultBox.append(element("strong", "", result.message));
    resultBox.append(element(
      "p",
      "optimization-summary",
      `Minimum distance: ${Number(result.total_distance).toLocaleString()} km · ` +
        `${result.connected_airports} of ${result.airports.length} airports connected`,
    ));

    const routes = document.createElement("ul");
    routes.className = "optimization-routes";
    result.routes.forEach((route) => {
      routes.append(element(
        "li",
        "",
        `${route.source_name} — ${route.destination_name}: ` +
          `${Number(route.distance).toLocaleString()} km`,
      ));
    });
    if (!result.routes.length) {
      routes.append(element("li", "", "No available connections from this airport."));
    }
    resultBox.append(routes);
  }

  async function calculateOptimalRoutes() {
    const resultBox = document.getElementById("optimizationResult");
    const button = document.getElementById("optimizeButton");
    resultBox.hidden = false;
    resultBox.classList.remove("error");
    resultBox.textContent = "Calculating the optimal network…";
    button.disabled = true;
    try {
      const result = await api("/api/optimize", {
        method: "POST",
        body: JSON.stringify({ start_id: Number(document.getElementById("startAirport").value) }),
      });
      showOptimizationResult(resultBox, result);
      showToast("Optimal routes calculated successfully.");
    } catch (error) {
      if (error.result && error.result.routes) {
        showOptimizationResult(resultBox, error.result);
      }
      resultBox.classList.add("error");
      showToast(error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadAirports() {
    airportCache = await api("/api/airports");
    const tbody = document.getElementById("airportsTable");
    const search = document.getElementById("airportSearch");
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const filtered = airportCache.filter((airport) =>
        [airport.name, airport.code, airport.location].some((value) => value.toLowerCase().includes(query)));
      document.getElementById("airportCount").textContent = filtered.length;
      tbody.replaceChildren();
      if (!filtered.length) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.className = "empty-state";
        cell.textContent = "No airports match your search.";
        return;
      }
      filtered.forEach((airport) => {
        const row = tbody.insertRow();
        const name = element("span", "airport-name", airport.name);
        row.insertCell().append(name);
        row.insertCell().append(element("span", "code-chip", airport.code));
        row.insertCell().textContent = `${Number(airport.capacity).toLocaleString()} flights/day`;
        row.insertCell().textContent = airport.location;
        const actionCell = row.insertCell();
        const button = element("button", "action-button");
        button.type = "button";
        button.title = "Delete airport";
        button.setAttribute("aria-label", `Delete ${airport.name}`);
        button.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
        button.addEventListener("click", () => deleteRecord(`/api/airports/${airport.id}`, "Airport deleted."));
        actionCell.append(button);
      });
    };
    search.addEventListener("input", render);
    render();
  }

  async function loadRoutes() {
    const [routes, airports] = await Promise.all([api("/api/routes"), api("/api/airports")]);
    routeCache = routes;
    airportCache = airports;
    const tbody = document.getElementById("routesTable");
    const search = document.getElementById("routeSearch");
    document.getElementById("routeTotal").textContent = routes.length;
    document.getElementById("routeAvailable").textContent = routes.filter((route) => route.status === "Available").length;
    document.getElementById("routeRestricted").textContent = routes.filter((route) => route.status === "Restricted").length;
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const filtered = routeCache.filter((route) =>
        [route.source_name, route.source_code, route.destination_name, route.destination_code, route.status]
          .some((value) => value.toLowerCase().includes(query)));
      renderRouteRows(tbody, filtered, true);
    };
    search.addEventListener("input", render);
    render();
    const source = document.getElementById("routeSource");
    const destination = document.getElementById("routeDestination");
    [source, destination].forEach((select) => {
      select.replaceChildren();
      airports.forEach((airport) => {
        const option = element("option", "", `${airport.name} (${airport.code})`);
        option.value = airport.id;
        select.append(option);
      });
    });
  }

  async function deleteRecord(url, successMessage) {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api(url, { method: "DELETE" });
      showToast(successMessage);
      if (page === "airports") await loadAirports();
      if (page === "routes") await loadRoutes();
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function setupDialogs() {
    const airportDialog = document.getElementById("airportDialog");
    if (airportDialog) {
      document.getElementById("openAirportForm").addEventListener("click", () => airportDialog.showModal());
      document.getElementById("airportForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form));
        data.capacity = Number(data.capacity);
        try {
          await api("/api/airports", { method: "POST", body: JSON.stringify(data) });
          airportDialog.close();
          form.reset();
          showToast("Airport added successfully.");
          await loadAirports();
        } catch (error) {
          showToast(error.message, true);
        }
      });
    }
    const routeDialog = document.getElementById("routeDialog");
    if (routeDialog) {
      document.getElementById("openRouteForm").addEventListener("click", () => routeDialog.showModal());
      document.getElementById("routeForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form));
        data.source_id = Number(data.source_id);
        data.destination_id = Number(data.destination_id);
        data.distance = Number(data.distance);
        try {
          await api("/api/routes", { method: "POST", body: JSON.stringify(data) });
          routeDialog.close();
          form.reset();
          showToast("Flight route added successfully.");
          await loadRoutes();
        } catch (error) {
          showToast(error.message, true);
        }
      });
    }
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => button.closest("dialog").close());
    });
  }

  const date = document.getElementById("currentDate");
  if (date) {
    date.textContent = new Intl.DateTimeFormat("en", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    }).format(new Date());
  }
  const dashboardDate = document.getElementById("dashboardDate");
  if (dashboardDate) {
    dashboardDate.textContent = new Intl.DateTimeFormat("en", {
      weekday: "long", month: "long", day: "2-digit", year: "numeric",
    }).format(new Date()).toUpperCase();
  }
  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  }
  setupDialogs();

  const loaders = { dashboard: loadDashboard, airports: loadAirports, routes: loadRoutes };
  if (loaders[page]) {
    loaders[page]().catch((error) => showToast(error.message, true));
  }
})();
