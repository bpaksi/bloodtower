// Board map entry: one space at a time. Every change goes to the server, which keeps the draft.
const state = { data: null, selected: null };
const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "onclick" || k === "onchange") node[k] = v;
    else if (k === "class") node.className = v;
    else if (k === "value") node.value = v;
    else if (k === "checked") node.checked = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c ?? "");
  return node;
}

async function post(path, body = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) message(data.error ?? "Failed", true);
  else message(path === "/api/export" ? `Exported to ${data.exported}` : "Saved");
  state.data = data;
  render();
  return res.ok;
}

function message(text, bad = false) {
  $("message").textContent = text;
  $("message").className = bad ? "error" : "muted";
}

function spaceName(id) {
  return state.data.spaces.find((s) => s.id === id)?.name ?? id;
}

function renderSpaces() {
  const list = $("spaces");
  list.replaceChildren();
  const byKingdom = {};
  for (const s of state.data.spaces) {
    byKingdom[s.kingdom] ??= [];
    byKingdom[s.kingdom].push(s);
  }
  for (const k of ["N", "E", "S", "W"]) {
    list.append(el("h2", {}, `${k} (${byKingdom[k]?.length ?? 0})`));
    for (const s of byKingdom[k] ?? []) {
      const row = el(
        "div",
        {
          class: `space${state.selected === s.id ? " sel" : ""}`,
          onclick: () => {
            state.selected = s.id;
            render();
          },
        },
        el("span", {}, s.name),
        el("span", { class: "reg" }, s.region ? s.region.replace("REG-", "R") : "no region"),
      );
      list.append(row);
    }
  }
}

function renderRegions() {
  const ul = $("regions");
  ul.replaceChildren();
  for (const r of state.data.regions) {
    const count = state.data.spaces.filter((s) => s.region === r.id).length;
    ul.append(el("li", {}, `${r.id} ${r.name} (${count} spaces)`));
  }
}

function renderChecks() {
  const c = state.data.check;
  const box = $("checks");
  box.replaceChildren();
  box.append(
    el(
      "p",
      { class: c.complete ? "ok" : "error" },
      c.complete ? "Complete: ready to export" : `${c.errors.length} to fix before export`,
    ),
  );
  const ul = el("ul", { class: "list" });
  for (const e of c.errors) ul.append(el("li", { class: "error" }, e));
  for (const w of c.warnings) ul.append(el("li", { class: "muted" }, w));
  box.append(ul);
}

function renderDetail() {
  const s = state.data.spaces.find((x) => x.id === state.selected);
  const detail = $("detail");
  detail.replaceChildren();
  if (!s) return detail.append(el("p", { class: "muted" }, "Pick a space on the left."));

  detail.append(
    el("h1", {}, `${s.name}`),
    el(
      "p",
      { class: "muted" },
      `${s.id} · kingdom ${s.kingdom}${s.building ? ` · ${s.building}` : ""}`,
    ),
  );

  const terrain = el(
    "select",
    { onchange: (e) => post("/api/terrain", { space: s.id, terrain: e.target.value }) },
    ...state.data.terrains.map((t) =>
      el("option", { value: t, ...(t === s.terrain ? { selected: "" } : {}) }, t),
    ),
  );
  const region = el(
    "select",
    { onchange: (e) => post("/api/assign", { space: s.id, region: e.target.value || null }) },
    el("option", { value: "" }, "no region"),
    ...state.data.regions.map((r) =>
      el(
        "option",
        { value: r.id, ...(r.id === s.region ? { selected: "" } : {}) },
        `${r.id} ${r.name}`,
      ),
    ),
  );
  detail.append(
    el(
      "div",
      { class: "row" },
      el("label", {}, "Terrain ", terrain),
      el("label", {}, "Region ", region),
    ),
  );

  detail.append(el("h2", {}, "Compass cross"));
  const byslot = {};
  const list = [];
  for (const n of s.neighbours) {
    if (n.slot) byslot[n.slot] = n;
    else list.push(n);
  }
  const grid = el("div", { class: "cross" });
  const order = ["NW", "N", "NE", "W", null, "E", "SW", "S", "SE"];
  for (const slot of order) {
    if (slot === null) {
      grid.append(el("div", { class: "cell center" }, s.name));
      continue;
    }
    const n = byslot[slot];
    grid.append(
      el(
        "div",
        {
          class: `cell${n ? " filled" : ""}`,
          title: n ? "Edit this neighbour" : "Add a neighbour here",
          onclick: () => {
            state.form = { slot, to: n?.to ?? "" };
            render();
          },
        },
        el("strong", {}, slot),
        n
          ? el("small", {}, `${spaceName(n.to)}${n.river ? " · river" : ""}`)
          : el("small", {}, "empty"),
      ),
    );
  }
  detail.append(grid);

  detail.append(el("h2", {}, "Under the cross (no slot)"));
  const ul = el("ul", { class: "list" });
  for (const n of list)
    ul.append(
      el("li", {}, `${spaceName(n.to)}${n.river ? " · river" : ""}${n.note ? ` · ${n.note}` : ""}`),
    );
  if (list.length === 0) ul.append(el("li", { class: "muted" }, "none"));
  detail.append(ul);

  detail.append(el("h2", {}, "Add or change a neighbour"));
  detail.append(neighbourForm(s));
}

function neighbourForm(s) {
  const f = state.form ?? { slot: "N", to: "" };
  const to = el(
    "select",
    {},
    el("option", { value: "" }, "pick a space"),
    ...state.data.spaces
      .filter((x) => x.id !== s.id)
      .map((x) =>
        el(
          "option",
          { value: x.id, ...(x.id === f.to ? { selected: "" } : {}) },
          `${x.name} (${x.kingdom})`,
        ),
      ),
  );
  const slot = el(
    "select",
    {},
    el("option", { value: "" }, "under the cross"),
    ...state.data.slots.map((k) =>
      el("option", { value: k, ...(k === f.slot ? { selected: "" } : {}) }, k),
    ),
  );
  const river = el("input", { type: "checkbox", id: "river", checked: Boolean(f.river) });
  const note = el("input", { id: "note", placeholder: "optional note", value: f.note ?? "" });
  const save = el(
    "button",
    {
      class: "primary",
      onclick: () => {
        if (!to.value) return message("Pick the neighbour first", true);
        post("/api/edge", {
          from: s.id,
          to: to.value,
          slot: slot.value || null,
          river: river.checked,
          note: note.value,
        });
      },
    },
    "Save neighbour",
  );
  const remove = el(
    "button",
    {
      onclick: () => {
        if (!to.value) return message("Pick the neighbour to remove", true);
        post("/api/edge/remove", { a: s.id, b: to.value });
      },
    },
    "Remove",
  );
  return el(
    "div",
    {},
    el("div", { class: "row" }, el("label", {}, "Neighbour ", to), el("label", {}, "Slot ", slot)),
    el("div", { class: "row" }, el("label", {}, river, " River between"), note),
    el("div", { class: "row" }, save, remove),
    el(
      "p",
      { class: "muted" },
      "A slot taken by another neighbour is refused. Move that neighbour under the cross first, then save.",
    ),
  );
}

function render() {
  if (!state.data) return;
  renderSpaces();
  renderRegions();
  renderChecks();
  renderDetail();
}

$("addRegion").onclick = () => {
  const name = $("newRegion").value;
  if (!name.trim()) return message("A region needs a name", true);
  $("newRegion").value = "";
  post("/api/region", { name });
};
$("export").onclick = () => post("/api/export");

fetch("/api/state")
  .then((r) => r.json())
  .then((d) => {
    state.data = d;
    render();
  });
