/* SVG route map with clickable airport nodes and MST highlighting. */
(() => {
  const container = document.getElementById("networkGraph");
  if (!container) return;
  const namespace = "http://www.w3.org/2000/svg";
  const pointFor = (index, count, width, height) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(count, 1);
    const radiusX = Math.min(width * 0.34, 210);
    const radiusY = Math.min(height * 0.34, 95);
    return { x: width / 2 + Math.cos(angle) * radiusX, y: height / 2 + Math.sin(angle) * radiusY };
  };
  const makeSvg = (name, attributes = {}) => {
    const node = document.createElementNS(namespace, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };

  window.renderNetworkGraph = (airports, routes, selectedIds = []) => {
    const bounds = container.getBoundingClientRect();
    const width = Math.max(bounds.width, 320);
    const height = Math.max(bounds.height, 220);
    const svg = makeSvg("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Airport routes network graph" });
    const positions = new Map(airports.map((airport, index) => [airport.id, pointFor(index, airports.length, width, height)]));
    routes.forEach((route) => {
      const start = positions.get(route.source_id);
      const end = positions.get(route.destination_id);
      if (!start || !end) return;
      const isSelected = selectedIds.includes(route.id);
      const line = makeSvg("line", {
        x1: start.x, y1: start.y, x2: end.x, y2: end.y,
        class: `edge-line${route.status === "Restricted" ? " restricted" : ""}${isSelected ? " mst" : ""}`,
      });
      svg.append(line);
      const label = makeSvg("text", {
        x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 5, class: "edge-label",
        "text-anchor": "middle",
      });
      label.textContent = `${Number(route.distance).toLocaleString()} km`;
      svg.append(label);
    });
    airports.forEach((airport, index) => {
      const point = positions.get(airport.id);
      const group = makeSvg("g", { class: "graph-node", tabindex: "0", role: "button", "aria-label": `${airport.name}, ${airport.code}` });
      const circle = makeSvg("circle", { cx: point.x, cy: point.y, r: 13 });
      const name = makeSvg("text", { x: point.x, y: point.y + 29 });
      name.textContent = airport.name;
      const code = makeSvg("text", { x: point.x, y: point.y + 41, class: "node-code" });
      code.textContent = airport.code;
      const announce = () => {
        const old = container.querySelector(".node-announcement");
        if (old) old.remove();
        const message = document.createElement("div");
        message.className = "node-announcement";
        message.textContent = `${airport.name} (${airport.code}) · ${airport.capacity ?? "Airport"} capacity`;
        message.style.cssText = "position:absolute;left:10px;bottom:8px;background:#fff;padding:6px 9px;border:1px solid #e8edf4;border-radius:6px;color:#40516a;font-size:10px;box-shadow:0 3px 12px #17263d12";
        container.append(message);
      };
      group.addEventListener("click", announce);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") announce();
      });
      group.append(circle, name, code);
      svg.append(group);
    });
    container.replaceChildren(svg);
  };
})();
