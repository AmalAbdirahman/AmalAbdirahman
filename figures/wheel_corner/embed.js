(function(){
  var root = document.querySelector("[data-wheel-corner]"); if (!root) return;
  var stage = root.querySelector(".iso-stage"), svg = stage.querySelector("svg"), needle = svg.querySelector('[data-part="needle"]');
  var holes = [].slice.call(svg.querySelectorAll("[data-hole]")), cap = root.querySelector("[data-readout]"), face = root.closest(".face");
  var M = {"maxAge":40,"base":0.05,"growth":0.0016666666666666668,"life":44}, still = typeof reduce !== "undefined" ? reduce : matchMedia("(prefers-reduced-motion: reduce)").matches;
  var OX = 292.48269068162404,OY = 257.90681223540577, SA = 0.5877852522924731, CA = 0.8090169943749475, SE = 0.49999999999999994, CE = 0.8660254037844387, K = 1.278921049661766;
  var DX = 38, DY = 0, RN = 11.6, Z = 222.2, SWEEP = 0.82;
  function pt(x, y){ return (OX + (x * SA - y * CA) * K).toFixed(1) + " " + (OY + ((x * CA + y * SA) * SE - Z * CE) * K).toFixed(1); }
  function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
  function rate(n){ return M.base + M.growth * n; }
  var age = 18, target = age, frame = 0, last = 0, clock = 0, touring = !still, visible = false, idle = 0, shown = "";
  var STINT = 9, HOLD = 1.6, RESET = 1.2, CYCLE = STINT + HOLD + RESET;
  function tourAt(t){ var c = t % CYCLE; return c < STINT ? c / STINT * M.maxAge : c < STINT + HOLD ? M.maxAge : M.maxAge * (1 - (c - STINT - HOLD) / RESET); }
  function open(){ return visible && !(face && face.classList.contains("off")); }
  function draw(){
    var wear = clamp(age / M.life, 0, 1), a = wear * SWEEP * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    needle.setAttribute("d", "M" + pt(DX - s * 2.6, DY + c * 2.6) + "L" + pt(DX + s * RN, DY - c * RN));
    holes.forEach(function(h, i){ h.setAttribute("opacity", Math.pow(clamp(1 - wear * (1.08 + i * 0.05), 0, 1), 0.8).toFixed(3)); });
    var n = Math.round(age), text = n + " laps · deg " + rate(n).toFixed(2) + " s/lap · illustrative";
    if (text !== shown){ cap.textContent = text; shown = text; stage.setAttribute("aria-valuenow", String(n)); stage.setAttribute("aria-valuetext", "tyre age " + n + " laps, degradation " + rate(n).toFixed(2) + " seconds per lap (illustrative)"); }
  }
  function tick(now){
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    if (touring){ clock += dt; target = tourAt(clock); }
    age = still ? target : age + (target - age) * (1 - Math.exp(-dt / 0.22));
    if (Math.abs(target - age) < 0.01) age = target;
    draw();
    frame = open() && (touring || age !== target) ? requestAnimationFrame(tick) : 0;
  }
  function run(){ if (!frame && open()){ last = 0; frame = requestAnimationFrame(tick); } }
  function steer(n){ touring = false; target = clamp(n, 0, M.maxAge); clearTimeout(idle); idle = setTimeout(function(){ touring = !still; clock = target / M.maxAge * STINT; run(); }, 3200); run(); }
  new IntersectionObserver(function(e){ visible = e[e.length - 1].isIntersecting; run(); }, { rootMargin: "80px 0px" }).observe(stage);
  if (face) new MutationObserver(run).observe(face, { attributes: true, attributeFilter: ["class"] });
  stage.addEventListener("pointermove", function(e){ var b = svg.getBoundingClientRect(); steer(clamp(((e.clientX - b.left) / b.width - 0.15) / 0.7, 0, 1) * M.maxAge); });
  stage.addEventListener("keydown", function(e){
    var step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
    if (e.key === "Home") steer(0); else if (e.key === "End") steer(M.maxAge); else if (step) steer(Math.round(target) + step); else return;
    e.preventDefault();
  });
  draw();
})();