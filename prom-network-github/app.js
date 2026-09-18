(() => {
  const data = window.PROM_NETWORK_DATA;
  if (!data || typeof cytoscape === "undefined") {
    document.getElementById("network").textContent = "The network could not be loaded.";
    return;
  }

  const elements = [
    ...data.nodes.map((node) => ({ group: "nodes", data: node })),
    ...data.edges.map((edge) => ({ group: "edges", data: edge })),
  ];

  const cy = cytoscape({
    container: document.getElementById("network"),
    elements,
    minZoom: 0.18,
    maxZoom: 3.2,
    wheelSensitivity: 0.18,
    style: [
      {
        selector: "node",
        style: {
          width: "data(nodeSize)",
          height: "data(nodeSize)",
          "background-color": "#6b5ca5",
          "border-width": 1,
          "border-color": "#ffffff",
          label: "data(label)",
          "font-size": 9,
          color: "#202326",
          "text-background-color": "#ffffff",
          "text-background-opacity": 0.88,
          "text-background-padding": 2,
          "text-wrap": "ellipsis",
          "text-max-width": 105,
          "text-valign": "bottom",
          "text-margin-y": 5,
          "min-zoomed-font-size": 7,
          "overlay-opacity": 0,
        },
      },
      { selector: 'node[stage1 = "Stressor exposure"]', style: { "background-color": "#3f7cac" } },
      { selector: 'node[stage1 = "Subjective stress experience"]', style: { "background-color": "#c05a47" } },
      { selector: 'node[stage1 = "Stressor exposure and subjective stress experience"]', style: { "background-color": "#6b5ca5" } },
      {
        selector: "edge",
        style: {
          width: "mapData(weight, 1, 10, 0.8, 5.5)",
          "line-color": "#9ba3a7",
          opacity: 0.42,
          "curve-style": "bezier",
          "overlay-opacity": 0,
        },
      },
      { selector: ".faded", style: { opacity: 0.08, "text-opacity": 0 } },
      { selector: "node.highlighted", style: { "border-width": 4, "border-color": "#d89b2b", "z-index": 20 } },
      { selector: "edge.highlighted", style: { opacity: 0.95, "line-color": "#d89b2b", "z-index": 19 } },
      { selector: ":selected", style: { "border-width": 4, "border-color": "#d89b2b" } },
    ],
  });

  const layoutOptions = {
    name: "cose",
    animate: false,
    randomize: true,
    nodeRepulsion: 145000,
    idealEdgeLength: (edge) => Math.max(65, 145 - edge.data("weight") * 9),
    edgeElasticity: 110,
    nestingFactor: 1.1,
    gravity: 0.22,
    numIter: 1300,
    componentSpacing: 65,
  };

  const searchInput = document.getElementById("search-input");
  const stage1Select = document.getElementById("stage1-select");
  const stage2Select = document.getElementById("stage2-select");
  const minCountRange = document.getElementById("min-count-range");
  const minCountValue = document.getElementById("min-count-value");
  const edgeWeightSelect = document.getElementById("edge-weight-select");
  const isolatesCheckbox = document.getElementById("isolates-checkbox");
  const emptyState = document.getElementById("empty-state");

  const fillSelect = (select, values) => {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  };
  fillSelect(stage1Select, data.meta.stage1Values);
  fillSelect(stage2Select, data.meta.stage2Values);

  const text = (id, value) => { document.getElementById(id).textContent = value; };

  function visibleNeighborhood(node) {
    return node.closedNeighborhood().filter(":visible");
  }

  function showDetails(node) {
    const d = node.data();
    text("detail-name", d.name);
    text("detail-description", d.description || "No description reported.");
    text("detail-count", String(d.recordCount));
    text("detail-stage1", d.stage1);
    text("detail-stage2", d.stage2);
    text("detail-type", d.promType);
    text("detail-degree", String(node.connectedEdges(":visible").length));
    text("detail-records", d.records.length ? d.records.join("; ") : "No author–year identifiers reported.");
    document.getElementById("detail-fields").hidden = false;
    document.getElementById("detail-records-block").hidden = false;
  }

  function clearHighlight() {
    cy.elements().removeClass("faded highlighted");
  }

  function highlightNode(node) {
    clearHighlight();
    const neighborhood = visibleNeighborhood(node);
    cy.elements(":visible").difference(neighborhood).addClass("faded");
    neighborhood.addClass("highlighted");
    node.select();
    showDetails(node);
  }

  cy.on("tap", "node", (event) => highlightNode(event.target));
  cy.on("tap", (event) => {
    if (event.target === cy) {
      cy.$(":selected").unselect();
      clearHighlight();
    }
  });

  function applyFilters({ rerunLayout = false } = {}) {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const stage1 = stage1Select.value;
    const stage2 = stage2Select.value;
    const minCount = Number(minCountRange.value);
    const minEdgeWeight = Number(edgeWeightSelect.value);
    const showIsolates = isolatesCheckbox.checked;
    minCountValue.textContent = String(minCount);
    clearHighlight();
    cy.elements().hide();

    const candidateNodes = cy.nodes().filter((node) => {
      const d = node.data();
      const matchesText = !query || `${d.name} ${d.developer}`.toLocaleLowerCase().includes(query);
      return matchesText
        && (stage1 === "all" || d.stage1 === stage1)
        && (stage2 === "all" || d.stage2 === stage2)
        && d.recordCount >= minCount;
    });

    candidateNodes.show();
    cy.edges().forEach((edge) => {
      if (edge.data("weight") >= minEdgeWeight && edge.source().visible() && edge.target().visible()) {
        edge.show();
      }
    });

    if (!showIsolates) {
      candidateNodes.forEach((node) => {
        if (node.connectedEdges(":visible").length === 0) node.hide();
      });
    }

    const visibleNodes = cy.nodes(":visible");
    const visibleEdges = cy.edges(":visible").filter((edge) => edge.source().visible() && edge.target().visible());
    text("visible-node-count", String(visibleNodes.length));
    text("visible-edge-count", String(visibleEdges.length));
    emptyState.hidden = visibleNodes.length > 0;

    if (visibleNodes.length && rerunLayout) {
      cy.layout({ ...layoutOptions, fit: true, padding: 42, randomize: false }).run();
    } else if (visibleNodes.length) {
      cy.fit(visibleNodes, 42);
    }

    if (query && visibleNodes.length === 1) highlightNode(visibleNodes[0]);
  }

  let filterTimer;
  searchInput.addEventListener("input", () => {
    window.clearTimeout(filterTimer);
    filterTimer = window.setTimeout(() => applyFilters(), 100);
  });
  [stage1Select, stage2Select, edgeWeightSelect, isolatesCheckbox].forEach((control) => {
    control.addEventListener("change", () => applyFilters({ rerunLayout: true }));
  });
  minCountRange.addEventListener("input", () => applyFilters());

  document.getElementById("reset-button").addEventListener("click", () => {
    searchInput.value = "";
    stage1Select.value = "all";
    stage2Select.value = "all";
    minCountRange.value = "2";
    edgeWeightSelect.value = "1";
    isolatesCheckbox.checked = false;
    cy.$(":selected").unselect();
    applyFilters({ rerunLayout: true });
  });

  cy.ready(() => {
    cy.layout(layoutOptions).run();
    applyFilters({ rerunLayout: true });
  });
})();
