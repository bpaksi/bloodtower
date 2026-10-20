const stage = document.getElementById("stage");
const tabsEl = document.getElementById("tabs");

let ctx = null;
let cleanups = [];

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of [].concat(children)) node.append(c);
  return node;
}

function button(label, onclick) {
  return el("button", { type: "button", textContent: label, onclick });
}

function tone(freq, start, dur, gain = 0.3, type = "sine", pan = 0) {
  const c = audio();
  const osc = c.createOscillator();
  const g = c.createGain();
  const p = c.createStereoPanner();
  osc.type = type;
  osc.frequency.value = freq;
  p.pan.value = pan;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.setValueAtTime(gain, start + dur - 0.02);
  g.gain.linearRampToValueAtTime(0, start + dur);
  osc.connect(g).connect(p).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur);
  return osc;
}

function panel(title, note) {
  const root = el("div", { className: "panel" }, [
    el("h2", { textContent: title }),
    el("p", { className: "note", textContent: note }),
  ]);
  return root;
}

function every(ms, fn) {
  const id = setInterval(fn, ms);
  cleanups.push(() => clearInterval(id));
}

function raf(fn) {
  let id = 0;
  const loop = (t) => {
    fn(t);
    id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  cleanups.push(() => cancelAnimationFrame(id));
}

const tests = {
  Sounds() {
    const root = panel(
      "Sounds",
      "Check each sound reaches the TV, at a comfortable level, and in time with the flash. Sync: the beep and the white flash start together. If the sound lags the picture, note roughly how much.",
    );
    const flash = el("div", { id: "flash" });
    let syncTimer = 0;
    let padNodes = [];
    const stopAll = () => {
      clearInterval(syncTimer);
      syncTimer = 0;
      for (const n of padNodes) n.stop();
      padNodes = [];
      speechSynthesis.cancel();
    };
    cleanups.push(stopAll);
    const beep = () => {
      tone(1000, audio().currentTime, 0.1, 0.4);
      flash.style.opacity = "1";
      setTimeout(() => {
        flash.style.opacity = "0";
      }, 100);
    };
    const row = el("div", { className: "row" }, [
      button("Sync beep + flash (toggle)", () => {
        if (syncTimer) {
          clearInterval(syncTimer);
          syncTimer = 0;
          return;
        }
        beep();
        syncTimer = setInterval(beep, 1000);
      }),
      button("Sweep 50 Hz to 8 kHz", () => {
        const c = audio();
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.setValueAtTime(50, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(8000, c.currentTime + 4);
        g.gain.value = 0.2;
        o.connect(g).connect(c.destination);
        o.start();
        o.stop(c.currentTime + 4);
      }),
      button("Level steps (-40 to -3 dB)", () => {
        const t = audio().currentTime;
        [-40, -30, -20, -10, -3].forEach((db, i) => {
          tone(440, t + i * 1.2, 1, 10 ** (db / 20));
        });
      }),
      button("Left then right", () => {
        const t = audio().currentTime;
        tone(600, t, 0.8, 0.3, "sine", -1);
        tone(900, t + 1, 0.8, 0.3, "sine", 1);
      }),
      button("Low drone (toggle)", () => {
        if (padNodes.length) {
          for (const n of padNodes) n.stop();
          padNodes = [];
          return;
        }
        const t = audio().currentTime;
        padNodes = [55, 82.4, 110, 164.8].map((f) => tone(f, t, 600, 0.08, "sawtooth"));
      }),
      button("Voice line", () => {
        speechSynthesis.speak(
          new SpeechSynthesisUtterance("The tower is awake. Heed my words, traveller."),
        );
      }),
      button("Stop all", stopAll),
    ]);
    root.append(row, el("div", { className: "fill" }, [flash]));
    return root;
  },

  Motion() {
    const root = panel(
      "Moving image",
      "A bar sweeps across a ruled track and the window glow flickers over a dimmed hero. Look for judder, tearing, stutter and lag. The counter shows the frame rate the browser reaches, which is not the same as what the TV shows.",
    );
    const fill = el("div", { className: "fill" });
    const glow = el("div", { className: "glowstack" });
    const imgs = ["a", "b", "c", "d"].map((k) => el("img", { src: `assets/window-glow-${k}.png` }));
    glow.append(...imgs);
    const track = el("div", { className: "track" });
    const bar = el("div", { className: "bar" });
    track.append(bar);
    const fps = el("div", { id: "fps" });
    fill.append(glow, track, fps);
    let frames = 0;
    let last = performance.now();
    raf((t) => {
      const w = track.clientWidth;
      const x = ((t / 2500) % 1) * w * 0.96;
      bar.style.transform = `translateX(${x}px)`;
      frames++;
      if (t - last >= 1000) {
        fps.textContent = `${Math.round((frames * 1000) / (t - last))} fps`;
        frames = 0;
        last = t;
      }
    });
    every(130, () => {
      for (const i of imgs) i.style.opacity = "0";
      imgs[Math.floor(Math.random() * imgs.length)].style.opacity = String(
        0.5 + Math.random() * 0.5,
      );
    });
    root.append(fill);
    return root;
  },

  Pan() {
    const root = panel(
      "Pan image",
      "Slow pan and zoom over the hero image. Look for shimmer, stepping and soft edges. Pick a duration with the buttons.",
    );
    const fill = el("div", { className: "fill" });
    const pan = el("div", { className: "pan" });
    const img = el("img", { src: "assets/hero.webp" });
    pan.append(img);
    fill.append(pan);
    let dur = 30000;
    let anim = null;
    const run = () => {
      anim?.cancel();
      anim = img.animate(
        [
          { transform: "scale(1.3) translate(0, 0)" },
          { transform: "scale(1.3) translate(-23%, -23%)" },
          { transform: "scale(1.3) translate(0, 0)" },
        ],
        { duration: dur, iterations: Number.POSITIVE_INFINITY, easing: "ease-in-out" },
      );
    };
    run();
    cleanups.push(() => anim?.cancel());
    root.append(
      el("div", { className: "row" }, [
        button("Slow 60 s", () => {
          dur = 60000;
          run();
        }),
        button("Medium 30 s", () => {
          dur = 30000;
          run();
        }),
        button("Fast 8 s", () => {
          dur = 8000;
          run();
        }),
      ]),
      fill,
    );
    return root;
  },

  Speak() {
    const root = panel(
      "Speaking image",
      "The Keeper speaks inside the real dialog frame. Check the mouth changes look natural, the text is readable from the couch, and the voice matches the mouth.",
    );
    const visemes = ["AH", "CONS-EE", "EH-AE", "FV", "MBP", "OH-ER", "OO-W"];
    const portrait = el("img", { src: "assets/mouths/REST.jpg" });
    const text = el("p", {
      textContent:
        "The tower is awake. Heed my words, traveller, for the night is long and the dark is patient.",
    });
    const dialog = el("div", { className: "dialog" }, [portrait, text]);
    for (const v of [...visemes, "REST"]) new Image().src = `assets/mouths/${v}.jpg`;
    let mouth = 0;
    const say = () => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.textContent);
      u.onstart = () => {
        mouth = setInterval(() => {
          portrait.src = `assets/mouths/${visemes[Math.floor(Math.random() * visemes.length)]}.jpg`;
        }, 120);
      };
      const done = () => {
        clearInterval(mouth);
        portrait.src = "assets/mouths/REST.jpg";
      };
      u.onend = done;
      u.onerror = done;
      speechSynthesis.speak(u);
    };
    cleanups.push(() => {
      clearInterval(mouth);
      speechSynthesis.cancel();
    });
    root.append(
      el("div", { className: "row" }, [
        button("Speak", say),
        button("Stop", () => speechSynthesis.cancel()),
      ]),
      dialog,
    );
    return root;
  },

  "Black on black"() {
    const root = panel(
      "Black on black",
      "How much dark detail survives? Find the lowest step you can still tell from black, on the TV and on the Mac. Note the picture preset and Game Mode next to the result. Switch the backdrop to see whether the TV crushes blacks or the art is just dark.",
    );
    let bg = "#000";
    const swatches = el("div", { className: "swatches" });
    for (let i = 0; i <= 20; i++) {
      swatches.append(
        el("div", { textContent: String(i), style: `background: rgb(${i},${i},${i})` }),
      );
    }
    const ladder = el("div", { className: "ladder" });
    for (const n of [6, 10, 14, 18, 24, 32, 48]) {
      ladder.append(
        el("p", {
          textContent: `The Keeper watches from the dark (text ${n}/255)`,
          style: `color: rgb(${n},${n},${n})`,
        }),
      );
    }
    const pair = el("div", { className: "pair" }, [
      el("img", { src: "assets/hero.webp", style: "filter: brightness(0.25)" }),
      el("img", { src: "assets/hero.webp", style: "filter: brightness(0.12)" }),
      el("img", { src: "assets/portrait.png", style: "filter: brightness(0.3)" }),
      el("img", { src: "assets/portrait.png", style: "filter: brightness(0.15)" }),
    ]);
    const body = el(
      "div",
      { className: "fill", style: "display:flex;flex-direction:column;gap:0.8rem" },
      [swatches, el("div", { className: "grad" }), ladder, pair],
    );
    const setBg = (c) => {
      bg = c;
      body.style.background = bg;
    };
    root.append(
      el("div", { className: "row" }, [
        el("span", { textContent: "Backdrop:" }),
        button("Black", () => setBg("#000")),
        button("Near black", () => setBg("#0c0c0c")),
        button("Grey", () => setBg("#555")),
      ]),
      body,
    );
    return root;
  },

  Reference() {
    const root = el("div", { className: "panel", style: "padding:0" });
    const sizes = el("div", { className: "sizes" });
    for (const px of [10, 12, 14, 18, 24, 32, 48]) {
      sizes.append(
        el("div", {
          textContent: `${px}px: The quick brown fox jumps over the lazy dog`,
          style: `font-size:${px}px`,
        }),
      );
    }
    const bars = el("div", { className: "bars" });
    for (const c of ["#fff", "#ff0", "#0ff", "#0f0", "#f0f", "#f00", "#00f", "#000"])
      bars.append(el("div", { style: `background:${c}` }));
    const guide = (pct) => el("div", { className: "guide", style: `inset:${pct}%` });
    root.append(
      el("div", { className: "edge" }),
      guide(2.5),
      guide(5),
      el("div", { className: "cross" }),
      bars,
      sizes,
      el("div", { className: "checker" }),
      el("div", { className: "greys" }),
    );
    return root;
  },

  Info() {
    const root = panel(
      "Readout",
      "Run this after moving or fullscreening the window, then paste it into the run log in research/tv-display/tv-experiments.md. Record Chrome zoom and macOS fullscreen by hand.",
    );
    const out = el("pre");
    const refresh = () => {
      out.textContent = JSON.stringify(
        {
          viewportCSS: { width: innerWidth, height: innerHeight },
          screenCSS: { width: screen.width, height: screen.height },
          devicePixelRatio,
          aspect: Number((innerWidth / innerHeight).toFixed(4)),
          documentFullscreen: Boolean(document.fullscreenElement),
          browser: navigator.userAgent,
        },
        null,
        2,
      );
    };
    refresh();
    addEventListener("resize", refresh);
    cleanups.push(() => removeEventListener("resize", refresh));
    root.append(
      el("div", { className: "row" }, [
        button("Refresh", refresh),
        button("Copy", () => navigator.clipboard.writeText(out.textContent)),
      ]),
      out,
    );
    return root;
  },
};

function show(name) {
  for (const c of cleanups) c();
  cleanups = [];
  stage.replaceChildren(tests[name]());
  for (const b of tabsEl.children) b.setAttribute("aria-pressed", String(b.textContent === name));
  location.hash = encodeURIComponent(name);
}

for (const name of Object.keys(tests)) tabsEl.append(button(name, () => show(name)));

document.getElementById("fs").onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
};
const toggleBar = () => document.body.classList.toggle("nobar");
document.getElementById("hide").onclick = toggleBar;
addEventListener("keydown", (e) => {
  if (e.key === "h") toggleBar();
  if (e.key === "f") document.getElementById("fs").click();
});

const start = decodeURIComponent(location.hash.slice(1));
show(start in tests ? start : "Sounds");
