(function(){
  var root = document.querySelector("[data-f1-car]"); if (!root) return;
  var stage = root.querySelector(".iso-stage"), svg = stage.querySelector("svg"), cap = root.querySelector("[data-readout]"), face = root.closest(".face");
  var X = {"floor":{"dir":[0,0,-14],"delay":0,"name":"floor"},"wheelRL":{"dir":[0,-24,0],"delay":0.05,"name":"rear-right wheel"},"wheelFL":{"dir":[0,-24,0],"delay":0.08,"name":"front-right wheel"},"podFar":{"dir":[0,-26,0],"delay":0.12,"name":"sidepods"},"rearWing":{"dir":[-38,0,10],"delay":0.16,"name":"rear wing"},"gearbox":{"dir":[-18,0,40],"delay":0.2,"name":"gearbox"},"pu":{"dir":[28,0,74],"delay":0.24,"name":"power unit"},"nose":{"dir":[22,0,6],"delay":0.28,"name":"nose"},"halo":{"dir":[0,0,30],"delay":0.32,"name":"halo"},"podNear":{"dir":[0,26,0],"delay":0.12,"name":"sidepods"},"wheelRR":{"dir":[0,24,0],"delay":0.05,"name":"rear-left wheel"},"wheelFR":{"dir":[0,24,0],"delay":0.08,"name":"front-left wheel"},"frontWing":{"dir":[48,0,0],"delay":0.36,"name":"front wing"}}, M = {"age":18,"base":0.05,"growth":0.0016666666666666668}, still = typeof reduce !== "undefined" ? reduce : matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SA = 0.8480480961564261, CA = 0.5299192642332049, SE = 0.49999999999999994, CE = 0.8660254037844387, K = 1.6381194399876664;
  function shift(d){ return "translate(" + ((d[0] * SA - d[1] * CA) * K).toFixed(2) + " " + (((d[0] * CA + d[1] * SA) * SE - d[2] * CE) * K).toFixed(2) + ")"; }
  var groups = [].slice.call(svg.querySelectorAll("[data-asm]")).map(function(el){ return { el: el, key: el.getAttribute("data-asm"), name: el.getAttribute("data-name"), x: X[el.getAttribute("data-asm")], e: 0, v: 0 }; });
  var order = ["frontWing", "nose", "halo", "podNear", "floor", "pu", "gearbox", "rearWing", "wheelFR", "wheelRR", "wheelFL", "wheelRL"];
  var target = 0, since = 0, frame = 0, last = 0, clock = 0, touring = !still, visible = false, idle = 0, lit, shown = "";
  function say(t){ if (t !== shown){ cap.textContent = t; shown = t; } }
  function light(key){
    if (key === lit) return; lit = key;
    groups.forEach(function(g){ var on = g.key === key || (/pod/.test(key || "") && /pod/.test(g.key)); [].forEach.call(g.el.querySelectorAll(".iso-solid"), function(s){ if (on) s.setAttribute("data-lit", ""); else s.removeAttribute("data-lit"); }); });
    if (!key){ say(target ? "12 assemblies" : "hover to take it apart"); return; }
    var g = groups.filter(function(g){ return g.key === key; })[0];
    say(/wheel/.test(key) ? "tyre " + M.age + " laps · deg " + (M.base + M.growth * M.age).toFixed(2) + " s/lap · illustrative" : g.name);
  }
  function open(){ return visible && !(face && face.classList.contains("off")); }
  function tick(now){
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now; since += dt;
    if (touring){ clock += dt; var c = clock % 12, want = c > 1.5 && c < 9.5 ? 1 : 0; if (want !== target){ target = want; since = 0; } light(target && c > 3 && c < 9.2 ? order[Math.floor((c - 3) / 0.52) % order.length] : null); }
    var moving = false;
    groups.forEach(function(g){
      var delay = target ? g.x.delay : 0.36 - g.x.delay, want = since > delay ? target : 1 - target;
      if (still){ g.e = want; g.v = 0; } else { for (var i = 0; i < 4; i++){ g.v += ((want - g.e) * 90 - g.v * 17) * dt / 4; g.e += g.v * dt / 4; } }
      if (Math.abs(want - g.e) < 0.0005 && Math.abs(g.v) < 0.0005){ g.e = want; g.v = 0; } else moving = true;
      g.el.setAttribute("transform", shift([g.x.dir[0] * g.e, g.x.dir[1] * g.e, g.x.dir[2] * g.e]));
    });
    frame = open() && (touring || moving || since < 0.5) ? requestAnimationFrame(tick) : 0;
  }
  function run(){ if (!frame && open()){ last = 0; frame = requestAnimationFrame(tick); } }
  function set(t){ touring = false; clearTimeout(idle); if (t !== target){ target = t; since = 0; } if (!t || !lit){ lit = undefined; light(null); } run(); }
  new IntersectionObserver(function(e){ visible = e[e.length - 1].isIntersecting; run(); }, { rootMargin: "80px 0px" }).observe(stage);
  if (face) new MutationObserver(run).observe(face, { attributes: true, attributeFilter: ["class"] });
  stage.addEventListener("pointerenter", function(){ set(1); });
  stage.addEventListener("pointerleave", function(){ set(0); idle = setTimeout(function(){ touring = !still; clock = 0; run(); }, 4000); });
  stage.addEventListener("pointermove", function(e){ if (!target) set(1); var g = e.target.closest("[data-asm]"); light(g ? g.getAttribute("data-asm") : null); });
  stage.addEventListener("keydown", function(e){
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); set(target ? 0 : 1); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); if (!target) set(1); var i = order.indexOf(lit), n = order.length; light(order[i < 0 ? (e.key === "ArrowRight" ? 0 : n - 1) : (i + (e.key === "ArrowRight" ? 1 : n - 1)) % n]); }
  });
  light(null);
})();