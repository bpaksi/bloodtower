// The sound review page. Step 1 connects and calibrates the tower; step 2 plays each sound, times
// it from the Play press to the Stopped press, and saves what Bob says about it. The page reaches
// the tower only through POST /api/command with {capabilityId, params}.

const LENGTH_MAX_MS = 60_000;
const NO_SOUND = new Set(["rejected", "failed", "timed-out"]);

const $ = (id) => document.getElementById(id);
let state;
/** The play being timed: { index, pressedAt }. */
let timing;
/** The sound whose play command is under way. */
let playing;
/** The sound being reviewed now, kept in the list when "only not reviewed" is on. */
let current;
const rows = new Map();

const unavailable = (value) => value ?? "unavailable";

const lengthLabel = (ms) => {
  if (ms === undefined) return "unavailable";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
};

const problemText = (problem) => `${problem.message} (${problem.code})`;

let toastTimer;
/** Shows an error to Bob with its code, and logs it. */
function showError(problem) {
  console.error(`[${problem.code}] ${problem.message}`);
  const toast = $("toast");
  toast.textContent = problemText(problem);
  toast.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 8000);
}

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const problem = {
      code: "server-unreachable",
      message: `The tool's server is not reachable: ${error.message}`,
    };
    throw Object.assign(new Error(problem.message), { problem });
  }
  const data = await res.json();
  if (data.sounds) apply(data);
  if (!res.ok) {
    const problem = data.error ?? {
      code: `http-${res.status}`,
      message: "The server refused the request.",
    };
    throw Object.assign(new Error(problem.message), { problem });
  }
  return data;
}

const problemOf = (error) => error.problem ?? { code: "page-error", message: error.message };

// Step 1: the tower.

const CONNECTION_WORDS = {
  "bluetooth-unavailable": "Bluetooth unavailable",
  disconnected: "not connected",
  scanning: "looking for the tower…",
  connecting: "connecting…",
  connected: "connected",
  disconnecting: "disconnecting…",
  error: "error",
};

function renderTower() {
  const { connection, busy } = state;
  $("conn").textContent = unavailable(CONNECTION_WORDS[connection.state]);
  $("calib").textContent =
    connection.state === "connected" ? connection.calibration : "unavailable";
  const connected = connection.state === "connected";
  const canConnect = ["disconnected", "error", "bluetooth-unavailable"].includes(connection.state);
  const lost = connection.error?.code === "unexpected-disconnect";
  for (const button of $("tower-buttons").querySelectorAll("button")) {
    const action = button.dataset.action;
    if (action === "connect") button.hidden = lost;
    if (action === "reconnect") button.hidden = !lost;
    if (action === "connect" || action === "reconnect") button.disabled = !canConnect;
    if (action === "calibrate") {
      button.disabled = !connected || connection.calibration === "calibrating" || busy;
      button.textContent =
        connection.calibration === "calibrated" ? "Calibrate again" : "Calibrate";
      button.classList.toggle("primary", connected && connection.calibration === "uncalibrated");
    }
    if (action === "disconnect")
      button.disabled =
        !connected && connection.state !== "connecting" && connection.state !== "scanning";
  }
  const problem = $("tower-problem");
  if (connection.error) {
    problem.hidden = false;
    problem.textContent = `${connection.error.message}${connection.error.actionable ? ` ${connection.error.actionable}` : ""} (${connection.error.code})`;
  } else problem.hidden = true;
}

$("tower-buttons").addEventListener("click", async (event) => {
  const action = event.target.closest("button")?.dataset.action;
  if (!action) return;
  try {
    await call("POST", `/api/tower/${action}`);
  } catch (error) {
    showError(problemOf(error));
  }
});

// Step 2: the sounds.

function buildRow(sound) {
  const el = document.createElement("div");
  el.className = "sound";
  el.innerHTML = `
    <div class="title"><span class="id"></span><span class="name"></span><span class="muted cat"></span><span class="done"></span></div>
    <div class="row">
      <button type="button" class="play primary">Play</button>
      <button type="button" class="stop">Stopped</button>
      <span class="length"></span>
      <span class="tones" role="group" aria-label="Tone"></span>
    </div>
    <input type="text" class="words" maxlength="500" placeholder="Sounds like: growl, coins, metal on metal">`;
  el.querySelector(".id").textContent = `SND-${String(sound.index).padStart(3, "0")}`;
  el.querySelector(".name").textContent = sound.name;
  el.querySelector(".cat").textContent = sound.category ?? "";
  const label = `${sound.index} ${sound.name}`;
  el.querySelector(".play").setAttribute("aria-label", `Play ${label}`);
  el.querySelector(".stop").setAttribute("aria-label", `Stopped ${label}`);
  const words = el.querySelector(".words");
  words.setAttribute("aria-label", `Sounds like, ${label}`);
  const tones = el.querySelector(".tones");
  for (const tone of state.tones) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = tone;
    button.textContent = tone;
    button.dataset.tone = tone;
    tones.append(button);
  }

  el.querySelector(".play").addEventListener("click", () => play(sound.index));
  el.querySelector(".stop").addEventListener("click", () => stopped(sound.index));
  tones.addEventListener("click", (event) => {
    const tone = event.target.closest("button")?.dataset.tone;
    if (!tone) return;
    current = sound.index;
    const saved = recordOf(sound.index)?.tone;
    save({ index: sound.index, tone: saved === tone ? null : tone });
  });
  words.addEventListener("focus", () => {
    current = sound.index;
  });
  const saveWords = () => {
    const next = words.value.trim();
    if (next !== (recordOf(sound.index)?.soundsLike ?? "")) {
      save({ index: sound.index, soundsLike: next === "" ? null : next });
    }
  };
  words.addEventListener("blur", saveWords);
  words.addEventListener("keydown", (event) => {
    if (event.key === "Enter") words.blur();
  });
  return el;
}

const recordOf = (index) => state.sounds[index - 1]?.record;
const reviewed = (record) =>
  record !== undefined &&
  (record.soundsLike !== undefined || record.tone !== undefined || record.lengthMs !== undefined);

function renderSounds() {
  const list = $("sounds");
  if (rows.size === 0)
    for (const sound of state.sounds) {
      const el = buildRow(sound);
      rows.set(sound.index, el);
      list.append(el);
    }
  const query = $("search").value.trim().toLowerCase();
  const onlyUnreviewed = $("unreviewed").checked;
  const canPlay = state.connection.state === "connected" && playing === undefined && !state.busy;
  for (const sound of state.sounds) {
    const el = rows.get(sound.index);
    const record = sound.record;
    const text =
      `${sound.index} snd-${String(sound.index).padStart(3, "0")} ${sound.name} ${sound.category ?? ""}`.toLowerCase();
    el.hidden =
      (query !== "" && !text.includes(query)) ||
      (onlyUnreviewed && reviewed(record) && sound.index !== current);
    el.classList.toggle("timing", timing?.index === sound.index);
    el.querySelector(".play").disabled = !canPlay;
    el.querySelector(".play").textContent = playing === sound.index ? "Playing…" : "Play";
    el.querySelector(".stop").disabled = timing?.index !== sound.index;
    el.querySelector(".length").textContent = lengthLabel(record?.lengthMs);
    el.querySelector(".done").textContent = reviewed(record) ? "reviewed" : "";
    for (const button of el.querySelectorAll(".tones button")) {
      button.setAttribute("aria-pressed", String(record?.tone === button.dataset.tone));
    }
    const words = el.querySelector(".words");
    if (document.activeElement !== words) words.value = record?.soundsLike ?? "";
  }
}

async function play(index) {
  // Bob's press, before anything else: the length runs from here.
  const pressedAt = Date.now();
  current = index;
  timing = { index, pressedAt };
  playing = index;
  render();
  try {
    const result = await call("POST", "/api/command", {
      capabilityId: "sound.play",
      params: { soundIndex: index },
    });
    const end = result.stages.at(-1);
    if (NO_SOUND.has(end.stage)) {
      if (timing?.pressedAt === pressedAt) timing = undefined;
      showError({
        code: `play-${end.stage}`,
        message: `Sound ${index} did not play: ${end.reason ?? end.stage}.`,
      });
    }
  } catch (error) {
    if (timing?.pressedAt === pressedAt) timing = undefined;
    showError(problemOf(error));
  } finally {
    playing = undefined;
    render();
  }
}

function stopped(index) {
  if (timing?.index !== index) return;
  const lengthMs = Math.max(1, Math.round(Date.now() - timing.pressedAt));
  timing = undefined;
  render();
  if (lengthMs > LENGTH_MAX_MS) {
    showError({
      code: "too-long",
      message: "Longer than a minute, so it was not recorded. Play it again.",
    });
    return;
  }
  save({ index, lengthMs });
  rows.get(index)?.querySelector(".words").focus();
}

async function save(change) {
  try {
    await call("POST", "/api/sound", change);
  } catch (error) {
    showError(problemOf(error));
  }
}

$("export").addEventListener("click", async () => {
  try {
    const result = await call("POST", "/api/export");
    const toast = $("toast");
    toast.style.color = "var(--good)";
    toast.style.borderColor = "var(--good)";
    toast.textContent = `Exported ${result.count} sounds to ${result.exported}`;
    toast.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.display = "none";
      toast.style.color = "";
      toast.style.borderColor = "";
    }, 5000);
  } catch (error) {
    showError(problemOf(error));
  }
});

$("search").addEventListener("input", () => render());
$("unreviewed").addEventListener("change", () => {
  current = undefined;
  render();
});

function apply(next) {
  state = next;
  render();
}

function render() {
  if (!state) return;
  renderTower();
  renderSounds();
  $("progress").textContent = `${state.reviewed} of ${state.total} reviewed`;
  $("meter").style.width = `${(100 * state.reviewed) / state.total}%`;
}

// The tower's status changes on its own (calibration ends, the link drops), so the page asks for
// it each second. Asking moves nothing.
let pollFailing = false;
async function poll() {
  try {
    await call("GET", "/api/state");
    pollFailing = false;
  } catch (error) {
    // One toast per outage, not one a second; the next success clears it.
    if (!pollFailing) showError(problemOf(error));
    pollFailing = true;
  } finally {
    setTimeout(poll, 1000);
  }
}
poll();
