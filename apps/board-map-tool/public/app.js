// Board map entry: drag a neighbour onto an open slot or the tray, or add one by typing a name.
// Every change goes to the server, which keeps the draft and refuses anything that breaks the rules.
const KINGDOM = { N: "Arisilon", E: "Brynthia", S: "Durnin", W: "Zenon" };
// RtDT names kingdoms with their direction: "N Arisilon".
const kingdomLabel = (k) => `${k} ${KINGDOM[k]}`;
const state = {
  data: null,
  selected: null,
  editing: null,
  picked: null,
  query: "",
  highlight: 0,
  dragging: null,
};
const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k === "class") node.className = v;
    else if (k === "value") node.value = v;
    else if (k === "checked") node.checked = v;
    else if (k === "selected" || k === "disabled") node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c ?? "");
  return node;
}

function spaceById(id) {
  return state.data.spaces.find((s) => s.id === id);
}
function regionName(id) {
  return state.data.regions.find((r) => r.id === id)?.name ?? "no region";
}
function nameOf(id) {
  return spaceById(id)?.name ?? id;
}

function message(text, bad = false) {
  $("message").textContent = text;
  $("message").className = bad ? "error" : "muted";
}

async function post(path, body = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) message(path === "/api/export" ? `Exported to ${data.exported}` : "Saved");
  else message(data.error ?? "Failed", true);
  state.data = data;
  render();
  return res.ok;
}

// Type-ahead matching: every word typed must appear in the name, the ID, or the kingdom.
function matches(space, query) {
  const hay = `${space.name} ${space.id} ${space.kingdom} ${KINGDOM[space.kingdom]}`.toLowerCase();
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

function rank(list, query) {
  const q = query.toLowerCase().trim();
  return [...list].sort((a, b) => {
    const sa = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const sb = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return sa - sb || a.name.localeCompare(b.name);
  });
}

function renderSpaces() {
  const list = $("spaces");
  list.replaceChildren();
  const filter = $("spaceFilter").value;
  const shown = state.data.spaces.filter((s) => matches(s, filter));
  for (const k of ["N", "E", "S", "W"]) {
    const group = shown.filter((s) => s.kingdom === k);
    if (group.length === 0) continue;
    list.append(el("h2", {}, `${kingdomLabel(k)} (${group.length})`));
    for (const s of group) {
      list.append(
        el(
          "div",
          {
            class: `space-row${state.selected === s.id ? " sel" : ""}`,
            onclick: () => selectSpace(s.id),
          },
          el("span", {}, s.completed ? `✓ ${s.name}` : s.name),
          el("span", { class: "tag" }, s.region ? regionName(s.region) : "no region"),
        ),
      );
    }
  }
}

function selectSpace(id) {
  state.selected = id;
  state.editing = null;
  state.picked = null;
  state.query = "";
  render();
}

function renderRegions() {
  const ul = $("regions");
  ul.replaceChildren();
  for (const r of state.data.regions) {
    const count = state.data.spaces.filter((s) => s.region === r.id).length;
    ul.append(el("li", {}, `${r.name} (${count} spaces)`));
  }
}

function renderChecks() {
  const c = state.data.check;
  const box = $("checks");
  box.replaceChildren(
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

// What is being dragged: a neighbour space, or a non-space object (river or tower).
function startDrag(e, drag) {
  state.dragging = drag;
  e.dataTransfer.setData("text/plain", drag.id);
}

// A slot takes the dragged thing only if it is open and the thing is allowed there.
// Completed spaces cannot be dragged or dropped on.
function dragAttr() {
  return spaceById(state.selected)?.completed ? "false" : "true";
}

function canDrop(slot) {
  const d = state.dragging;
  if (!d) return false;
  if (spaceById(state.selected)?.completed) return false;
  if (slot === null) return true;
  const s = spaceById(state.selected);
  const taken =
    s.neighbours.some((n) => n.slot === slot && n.to !== d.id) ||
    Object.entries(s.objects ?? {}).some(([kind, at]) => at === slot && kind !== d.id);
  if (taken) return false;
  if (d.type === "object")
    return state.data.objectKinds.find((k) => k.id === d.id).slots.includes(slot);
  return true;
}

function onDrop(e, node, slot) {
  e.preventDefault();
  node.classList.remove("drop");
  const d = state.dragging;
  state.dragging = null;
  if (!d) return;
  if (d.type === "object") return post("/api/object", { space: state.selected, kind: d.id, slot });
  const current = currentNeighbour(d.id);
  if (!current) return;
  post("/api/edge", {
    from: state.selected,
    to: d.id,
    slot,
    river: current.river,
    note: current.note,
  });
}

// One neighbour as a draggable chip.
function chip(n) {
  return el(
    "div",
    {
      class: `chip${n.unconfirmed ? " unsure" : ""}`,
      draggable: dragAttr(),
      ondragstart: (e) => startDrag(e, { type: "neighbour", id: n.to }),
      onclick: () => {
        state.editing = n.to;
        render();
      },
      title: "Drag to an open slot, or click to edit",
    },
    el("span", {}, nameOf(n.to)),
    n.river ? el("span", { class: "badge" }, "river") : null,
    n.note ? el("span", { class: "badge" }, n.note) : null,
  );
}

// A river or the tower, dragged from the tray onto a slot it is allowed on.
function objectToken(kind) {
  return el(
    "div",
    {
      class: "chip object",
      draggable: dragAttr(),
      ondragstart: (e) => startDrag(e, { type: "object", id: kind.id }),
      title: `Drag onto ${kind.slots.join(", ")}`,
    },
    el("span", {}, kind.label),
    el("span", { class: "badge" }, kind.slots.length === 1 ? "always N" : "W, E or a diagonal"),
  );
}

// Drop targets: an open slot takes a neighbour or an object; the tray takes it off the cross.
function dropTarget(node, slot) {
  node.addEventListener("dragover", (e) => {
    if (!canDrop(slot)) return;
    e.preventDefault();
    node.classList.add("drop");
  });
  node.addEventListener("dragleave", () => node.classList.remove("drop"));
  node.addEventListener("drop", (e) => {
    if (!canDrop(slot)) return;
    onDrop(e, node, slot);
  });
  return node;
}

function currentNeighbour(to) {
  return spaceById(state.selected) && spaceById(state.selected).neighbours.find((n) => n.to === to);
}

function renderCross(s) {
  const bySlot = {};
  for (const n of s.neighbours)
    if (n.slot)
      bySlot[n.slot] = {
        type: "neighbour",
        id: n.to,
        name: nameOf(n.to),
        note: [n.river ? "river" : "", n.note].filter(Boolean).join(" · "),
        n,
      };
  for (const [kind, slot] of Object.entries(s.objects ?? {})) {
    bySlot[slot] = {
      type: "object",
      id: kind,
      name: state.data.objectKinds.find((k) => k.id === kind).label,
      note: "",
    };
  }
  const grid = el("div", { class: "cross" });
  const order = ["NW", "N", "NE", "W", null, "E", "SW", "S", "SE"];
  for (const slot of order) {
    if (slot === null) {
      grid.append(el("div", { class: "cell center" }, el("span", { class: "name" }, s.name)));
      continue;
    }
    const item = bySlot[slot];
    if (item) {
      grid.append(
        el(
          "div",
          {
            class: `cell filled${item.type === "object" ? " object" : ""}`,
            draggable: dragAttr(),
            title: "Drag to another open slot or the tray, or click to edit",
            ondragstart: (e) => startDrag(e, { type: item.type, id: item.id }),
            onclick: () => {
              if (item.type === "neighbour") {
                state.editing = item.id;
                render();
              }
            },
          },
          el("span", { class: "slot" }, slot),
          el("span", { class: "name" }, item.name),
          item.note ? el("span", { class: "badge" }, item.note) : null,
        ),
      );
    } else {
      grid.append(
        dropTarget(
          el(
            "div",
            { class: "cell open" },
            el("span", { class: "slot" }, slot),
            el("span", {}, "open — drop here"),
          ),
          slot,
        ),
      );
    }
  }
  return grid;
}

function renderTray(s) {
  const loose = s.neighbours.filter((n) => !n.slot);
  const tray = dropTarget(el("div", { class: "tray" }), null);
  if (loose.length === 0)
    tray.append(el("span", { class: "muted" }, "Drop a neighbour here to take it off the cross."));
  for (const n of loose) tray.append(chip(n));
  tray.append(el("div", { class: "divider" }, "Not spaces: drag onto a slot"));
  for (const kind of state.data.objectKinds) tray.append(objectToken(kind));
  return tray;
}

// Clear any drop highlight left behind when a drag ends outside a target.
document.addEventListener("dragend", () => {
  state.dragging = null;
  document.querySelectorAll(".drop").forEach((n) => {
    n.classList.remove("drop");
  });
});

function renderEditor(s) {
  const n = state.editing && s.neighbours.find((x) => x.to === state.editing);
  if (!n) return null;
  const river = el("input", { type: "checkbox", checked: n.river });
  const note = el("input", { value: n.note ?? "", placeholder: "optional note" });
  const box = el(
    "div",
    { class: "editor" },
    el("h2", {}, `${s.name} and ${nameOf(n.to)}`),
    el("div", { class: "row" }, el("label", { class: "row" }, river, " River between")),
    el("div", { class: "row" }, el("label", { class: "stack" }, "Note", note)),
    el(
      "div",
      { class: "row" },
      el(
        "button",
        {
          type: "button",
          class: "primary",
          onclick: () =>
            post("/api/edge", {
              from: s.id,
              to: n.to,
              slot: n.slot,
              river: river.checked,
              note: note.value.trim(),
            }),
        },
        "Save",
      ),
      el(
        "button",
        { type: "button", onclick: () => post("/api/edge/remove", { a: s.id, b: n.to }) },
        "Remove neighbour",
      ),
      el(
        "button",
        {
          type: "button",
          onclick: () => {
            state.editing = null;
            render();
          },
        },
        "Close",
      ),
    ),
  );
  return box;
}

function renderPicker(s) {
  const input = el("input", {
    id: "neighbourFind",
    placeholder: "Type a space name, e.g. howl",
    autocomplete: "off",
    value: state.query,
    oninput: (e) => {
      state.query = e.target.value;
      state.highlight = 0;
      updateResults(s);
    },
    onkeydown: (e) => onPickerKey(e, s),
  });
  const results = el("div", { id: "results", class: "results" });
  const picker = el("div", { class: "picker" }, input, results);
  queueMicrotask(() => {
    input.focus();
    updateResults(s);
  });
  return el(
    "div",
    { class: "stack" },
    el("h2", {}, "Add a neighbour"),
    picker,
    el(
      "div",
      { class: "row" },
      el("label", { class: "stack" }, "Slot", slotSelect()),
      el(
        "button",
        { type: "button", class: "primary", onclick: () => addPicked(s) },
        state.picked ? `Add ${state.picked.name}` : "Add",
      ),
    ),
  );
}

function slotSelect() {
  const sel = el(
    "select",
    { id: "slotPick" },
    el("option", { value: "auto" }, "first open slot"),
    el("option", { value: "" }, "under the cross"),
  );
  for (const k of state.data.slots) sel.append(el("option", { value: k }, k));
  return sel;
}

function filteredSpaces(s) {
  return rank(
    state.data.spaces.filter((x) => x.id !== s.id && matches(x, state.query)),
    state.query,
  ).slice(0, 8);
}

function updateResults(s) {
  const box = $("results");
  if (!box) return;
  box.replaceChildren();
  const list = filteredSpaces(s);
  if (list.length === 0) return box.append(el("div", { class: "none" }, "No space matches"));
  list.forEach((x, i) => {
    box.append(
      el(
        "div",
        {
          class: i === state.highlight ? "hi" : "",
          onmousedown: (e) => {
            e.preventDefault();
            pick(x);
          },
        },
        `${x.name}  `,
        el("span", { class: "tag" }, `${kingdomLabel(x.kingdom)}`),
      ),
    );
  });
}

function onPickerKey(e, s) {
  const count = filteredSpaces(s).length;
  if (e.key === "ArrowDown") {
    state.highlight = Math.min(state.highlight + 1, count - 1);
    updateResults(s);
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    state.highlight = Math.max(state.highlight - 1, 0);
    updateResults(s);
    e.preventDefault();
  } else if (e.key === "Enter") {
    const x = filteredSpaces(s)[state.highlight];
    if (x) pick(x);
    e.preventDefault();
  } else if (e.key === "Escape") {
    state.query = "";
    state.picked = null;
    render();
  }
}

function pick(x) {
  state.picked = x;
  state.query = x.name;
  render();
}

function addPicked(s) {
  if (!state.picked) return message("Type and pick a space first", true);
  const choice = $("slotPick").value;
  const slot = choice === "" ? null : choice;
  const to = state.picked.id;
  state.picked = null;
  state.query = "";
  post("/api/edge", { from: s.id, to, slot, river: false, note: "" });
}

function renderDetail() {
  const detail = $("detail");
  detail.replaceChildren();
  const s = state.selected && state.data.spaces.find((x) => x.id === state.selected);
  if (!s) return detail.append(el("p", { class: "muted" }, "Pick a space on the left."));
  const wrap = el("div", { class: "wrap" });
  detail.append(wrap);

  const terrain = el(
    "select",
    {
      disabled: s.completed,
      onchange: (e) => post("/api/terrain", { space: s.id, terrain: e.target.value }),
    },
    ...state.data.terrains.map((t) => el("option", { value: t, selected: t === s.terrain }, t)),
  );
  const region = el(
    "select",
    {
      disabled: s.completed,
      onchange: (e) => post("/api/assign", { space: s.id, region: e.target.value || null }),
    },
    el("option", { value: "" }, "no region"),
    ...state.data.regions.map((r) =>
      el("option", { value: r.id, selected: r.id === s.region }, `${r.name}`),
    ),
  );

  wrap.append(
    el("h1", { style: "font-size: 24px; margin: 0 0 6px" }, s.name),
    el(
      "p",
      { class: "muted", style: "margin: 0 0 18px" },
      `${s.id} · ${kingdomLabel(s.kingdom)}${s.building ? ` · ${s.building}` : ""}`,
    ),
    el(
      "div",
      { class: "row" },
      el(
        "button",
        {
          type: "button",
          class: s.completed ? "" : "primary",
          onclick: () => post("/api/complete", { space: s.id, on: !s.completed }),
        },
        s.completed ? "Completed: reopen" : "Mark completed",
      ),
      s.completed
        ? el("span", { class: "muted" }, "Read-only. Reopen to change it.")
        : el("span", { class: "muted" }, "Changes are saved as you make them."),
    ),
    el(
      "div",
      { class: "row" },
      el("label", { class: "stack" }, "Terrain", terrain),
      el("label", { class: "stack" }, "Region", region),
    ),
    el("h2", {}, "Compass cross"),
    el(
      "p",
      { class: "muted", style: "margin: 0" },
      "Drag a neighbour onto an open slot. Click one to edit it.",
    ),
    renderCross(s),
    el("h2", {}, "Not on a slot"),
    renderTray(s),
  );
  const editor = s.completed ? null : renderEditor(s);
  if (editor) detail.append(el("div", { style: "margin-top: 24px" }, editor));
  if (!s.completed) wrap.append(el("div", { style: "margin-top: 28px" }, renderPicker(s)));
}

function renderProgress() {
  const p = state.data.progress;
  const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
  const bar = (label, n, d) =>
    el(
      "div",
      {},
      el("div", { class: "stat" }, el("span", {}, label), el("span", {}, `${n} of ${d}`)),
      el("div", { class: "meter" }, el("span", { style: `width: ${pct(n, d)}%` })),
    );
  const box = $("progress");
  box.replaceChildren(
    el("p", { class: "section-title" }, "Progress"),
    bar("Spaces with a region", p.withRegion, p.spaces),
    bar("Spaces with neighbours", p.withNeighbours, p.spaces),
    bar("Spaces completed", p.completed, p.spaces),
    bar("Sides on a slot", p.sidesPlaced, p.sidesPlaced + p.sidesInTray),
    el("p", { class: "section-title", style: "margin-top: 18px" }, "By kingdom"),
    ...Object.entries(p.kingdoms).map(([k, v]) => bar(kingdomLabel(k), v.withRegion, v.total)),
  );
}

function render() {
  if (!state.data) return;
  renderProgress();
  renderSpaces();
  renderRegions();
  renderChecks();
  renderDetail();
}

$("spaceFilter").addEventListener("input", renderSpaces);
// A region is added by typing its name and pressing Enter.
$("newRegion").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const name = e.target.value;
  if (!name.trim()) return message("A region needs a name", true);
  e.target.value = "";
  post("/api/region", { name });
});
$("export").onclick = () => post("/api/export");

fetch("/api/state")
  .then((r) => r.json())
  .then((d) => {
    state.data = d;
    render();
  });
