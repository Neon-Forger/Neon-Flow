(function () {
  const P = window.PROJECTS || [];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const statusText = (p) => ((p.downloads || []).length ? "Free to download" : "Not public yet");

  // ------------------------------------------------------------------ home: projects along the flow line
  const flow = document.getElementById("flow");
  if (flow) {
    flow.innerHTML = P.map((p) => `
      <article class="station" style="--accent:${p.accent}">
        <span class="node" aria-hidden="true"></span>
        <div class="card">
          <a class="card-link" href="project.html?p=${p.id}">
            <img class="cover" src="${p.cover}" alt="${esc(p.name)} cover" loading="lazy">
            <h2>${p.icon ? `<img src="${p.icon}" alt="">` : ""}${esc(p.name)}</h2>
          </a>
          <p class="tag">${esc(p.tagline)}</p>
          <p class="sum">${esc(p.summary)}</p>
          <div class="row">
            <a class="more" href="project.html?p=${p.id}">Read the full story</a>
            ${(p.downloads || []).slice(0, 1).map((d) => `<a class="dl" href="${d.href}" data-dl="${p.id}-0" download>Download <span class="sz">(${esc(d.size)})</span></a>`).join("")}
          </div>
        </div>
      </article>`).join("");

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "flow-line");
    svg.setAttribute("aria-hidden", "true");
    flow.prepend(svg);
    let pulsed = false;

    function draw() {
      const box = flow.getBoundingClientRect();
      flow.querySelectorAll(".node").forEach((n) => { n.style.transform = ""; });
      const nodes = [...flow.querySelectorAll(".node")].map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      if (!nodes.length) return;
      const W = box.width, H = box.height;
      const narrow = window.innerWidth <= 900;
      // weave: on wide screens the line leans toward each card as it passes it
      const pts = nodes.map((n, i) => ({ x: narrow ? n.x : n.x + (i % 2 === 0 ? -34 : 34), y: n.y }));
      let d = `M ${pts[0].x} 0`;
      let prev = { x: pts[0].x, y: 0 };
      for (const pt of [...pts, { x: pts[pts.length - 1].x, y: H }]) {
        const my = (prev.y + pt.y) / 2;
        d += ` C ${prev.x} ${my}, ${pt.x} ${my}, ${pt.x} ${pt.y}`;
        prev = pt;
      }
      // snap each node onto the curve
      flow.querySelectorAll(".node").forEach((n, i) => { n.style.transform = `translateX(${pts[i].x - nodes[i].x}px)`; });
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = `
        <defs><linearGradient id="fl" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">
          ${P.map((p, i) => `<stop offset="${(i + 0.5) / P.length}" stop-color="${p.accent}"/>`).join("")}
        </linearGradient></defs>
        <path class="glow" d="${d}" fill="none" stroke="url(#fl)"/>
        <path class="core" d="${d}" fill="none" stroke="url(#fl)"/>
        ${reduce || pulsed ? "" : `<path class="pulse" d="${d}" fill="none" stroke="#fff"/>`}`;
      const pulse = svg.querySelector(".pulse");
      if (pulse) {
        pulsed = true;
        const len = pulse.getTotalLength();
        pulse.style.strokeDasharray = `120 ${len}`;
        pulse.animate([{ strokeDashoffset: 120 }, { strokeDashoffset: -len }], { duration: 2600, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" })
          .onfinish = () => pulse.remove();
      }
    }
    draw();
    window.addEventListener("resize", draw);
    flow.querySelectorAll("img").forEach((img) => img.addEventListener("load", draw));
    if (document.fonts) document.fonts.ready.then(draw);
    liveReleases();
  }

  // ------------------------------------------------------------------ newest release for projects published on GitHub Releases
  function liveReleases() {
    P.filter((p) => p.latestFrom).forEach((p) => {
      fetch(`https://api.github.com/repos/${p.latestFrom}/releases/latest`).then((r) => r.json()).then((rel) => {
        if (!rel || !rel.tag_name) return;
        p.downloads.forEach((d, k) => {
          const a = (rel.assets || []).find((x) => x.name.toLowerCase().endsWith(d.match));
          if (!a) return;
          document.querySelectorAll(`[data-dl="${p.id}-${k}"]`).forEach((el) => {
            el.href = a.browser_download_url;
            const mb = a.size >= 1048576 ? `${Math.round(a.size / 1048576)} MB` : `${Math.max(1, Math.round(a.size / 1024))} KB`;
            const sz = el.querySelector(".sz"); if (sz) sz.textContent = el.classList.contains("dl") ? `(${mb})` : mb;
          });
        });
        document.querySelectorAll(`[data-ver="${p.id}"]`).forEach((el) => { el.textContent = rel.tag_name; });
      }).catch(() => {});
    });
  }

  // ------------------------------------------------------------------ project page
  const host = document.getElementById("project");
  if (host) {
    const id = new URLSearchParams(location.search).get("p");
    const i = P.findIndex((p) => p.id === id);
    if (i < 0) {
      host.innerHTML = `<section class="missing"><h1 class="p-title">That project isn't here</h1><p>It may have been renamed. <a href="./">See all projects</a>.</p></section>`;
      return;
    }
    const p = P[i];
    document.title = `${p.name} – Neon Flow`;
    document.body.style.setProperty("--accent", p.accent);
    const prev = P[i - 1], next = P[i + 1];
    const shots = (p.gallery || []).filter((g) => g.src !== p.cover);
    if (!p.coverNote) { const g = (p.gallery || []).find((g) => g.src === p.cover); if (g) p.coverNote = g.caption; }
    host.innerHTML = `
      <section class="p-hero">
        <div>
          <h1>${p.icon ? `<img src="${p.icon}" alt="">` : ""}${esc(p.name)}</h1>
          <p class="tag">${esc(p.tagline)}</p>
          ${(p.downloads || []).length ? `<div class="dls">${p.downloads.map((d, k) => `<a class="btn ${k === 0 ? "solid" : ""}" href="${d.href}" data-dl="${p.id}-${k}" download>Download ${esc(d.label)} <small class="sz">${esc(d.size)}</small></a>`).join("")}</div>
          <p class="hint">${p.downloads.some((d) => d.label === "for Android") ? "Open the Android file on your phone to install it. Android may ask you to allow installs from your browser the first time." : ""} ${esc(p.hint || "")}</p>` : `<span class="status">Not public yet.</span>`}
        </div>
        <figure style="margin:0">
          <img class="cover" src="${p.cover}" alt="${esc(p.name)} cover">
          ${p.coverNote ? `<figcaption class="cap">${esc(p.coverNote)}</figcaption>` : ""}
        </figure>
      </section>

      <dl class="facts">
        <div><dt>Runs on</dt><dd>${esc(p.platform)}</dd></div>
        <div><dt>Latest version</dt><dd data-ver="${p.id}">${esc(p.version)}</dd></div>
        <div><dt>Status</dt><dd>${statusText(p)}</dd></div>
        <div><dt>Built with</dt><dd>${esc(p.built)}</dd></div>
      </dl>

      <div class="body">
        <div class="story">
          ${p.story.map((s) => `<section><h2>${esc(s.h)}</h2>${s.p.map((t) => `<p>${esc(t)}</p>`).join("")}</section>`).join("")}
        </div>
        <aside class="side">
          <h2>What it can do</h2>
          ${p.features.map((g) => `<div class="group"><h3>${esc(g.h)}</h3><ul>${g.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")}
        </aside>
      </div>

      ${shots.length ? `
      <section class="gallery">
        <h2 class="gallery-h">Pictures</h2>
        <div class="shots">
          ${shots.map((g) => `<figure class="${g.phone ? "phone" : ""}"><img src="${g.src}" alt="${esc(g.caption)}" loading="lazy"><figcaption>${esc(g.caption)}</figcaption></figure>`).join("")}
        </div>
      </section>` : ""}

      ${p.history && p.history.length ? `
      <section class="history">
        <h2>Releases, newest first</h2>
        <ol>${p.history.map((h) => `<li><b>${esc(h.v)}</b>${esc(h.title)}</li>`).join("")}</ol>
      </section>` : ""}

      <nav class="pager" aria-label="More projects">
        ${prev ? `<a href="project.html?p=${prev.id}"><small>Previous</small><span>${esc(prev.name)}</span></a>` : ""}
        ${next ? `<a class="next" href="project.html?p=${next.id}"><small>Next</small><span>${esc(next.name)}</span></a>` : ""}
      </nav>`;
  }
  if (host) liveReleases();
})();
