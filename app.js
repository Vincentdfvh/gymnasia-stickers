(async function () {
  const WORLD_COUNT = 195;
  const HOME = window.HOME || { lat: 46.8, lng: 8.2 };
  const PALETTE = ["#ff6b6b", "#ffb347", "#ffe066", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6", "#2dd4bf",
                   "#fb923c", "#c084fc", "#facc15", "#60a5fa", "#f87171", "#34d399", "#e879f9", "#fda4af"];
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Number(n).toLocaleString("fr-CH").replace(/ | |’/g, " ");
  const frName = new Intl.DisplayNames(["fr"], { type: "region" });
  const numToA2 = Object.fromEntries(Object.entries(window.COUNTRY_META).map(([a2, [num]]) => [num, a2]));

  function toast(msg, isError) {
    const t = $("toast");
    t.textContent = msg; t.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = "toast"), 3500);
  }

  // ================================================================
  //  STORE — Supabase si configuré, sinon localStorage (mode local)
  // ================================================================
  const REMOTE = !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
  const CODE_KEY = "gym-club-code";
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch {} };

  const store = REMOTE ? (() => {
    const base = window.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/";
    async function api(path, { method = "GET", body, code } = {}) {
      const headers = { apikey: window.SUPABASE_ANON_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
      // legacy anon keys are JWTs and go in Authorization too; new "sb_publishable_" keys only in apikey
      if (window.SUPABASE_ANON_KEY.startsWith("eyJ")) headers.Authorization = "Bearer " + window.SUPABASE_ANON_KEY;
      if (code) headers["x-club-code"] = code;
      const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!r.ok) {
        const t = await r.text();
        if (r.status === 401 || r.status === 403 || /row-level security/i.test(t)) throw new Error("Code Gymnasia incorrect");
        throw new Error(t || r.statusText);
      }
      return r.status === 204 ? null : r.json();
    }
    const COLS = "id,person_id,iso,country,continent,place,lat,lng,approx,alt,summit,has_photo,created_at";
    const norm = s => s.person_id === "club" ? { ...s, person: null, place: s.place === "Le QG" ? "Suisse" : s.place } : { ...s, person: s.person_id };
    const code = () => lsGet(CODE_KEY);
    return {
      async load() {
        const [people, stickers] = await Promise.all([
          api("people?select=id,name,color&order=created_at"),
          api(`stickers?select=${COLS}&order=created_at`)]);
        return { people: people.filter(p => p.id !== "club"), stickers: stickers.map(norm) };
      },
      async checkCode(c) { return api("rpc/club_ok", { method: "POST", body: {}, code: c }); },
      async addPerson(p) { return (await api("people", { method: "POST", body: p, code: code() }))[0]; },
      async updatePerson(id, patch) { return (await api(`people?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: patch, code: code() }))[0]; },
      async addSticker(s) {
        const { person, ...rest } = s;
        return norm((await api(`stickers?select=${COLS}`, { method: "POST", body: { ...rest, person_id: person }, code: code() }))[0]);
      },
      async updateSticker(id, patch) { return norm((await api(`stickers?id=eq.${id}&select=${COLS}`, { method: "PATCH", body: patch, code: code() }))[0]); },
      async deleteSticker(id) { await api(`stickers?id=eq.${id}`, { method: "DELETE", code: code() }); },
      async getPhoto(id) { return (await api(`stickers?id=eq.${id}&select=photo`))[0]?.photo; },
    };
  })() : (() => {
    const KEY = "gym-local-v1";
    let db;
    try { db = JSON.parse(lsGet(KEY)); } catch {}
    if (!db) db = {
      people: window.PEOPLE.map(p => ({ ...p })),
      stickers: window.STICKERS.map((s, i) => ({ id: "seed-" + i, has_photo: false, ...s })),
      photos: {},
    };
    db.people = db.people.filter(p => p.id !== "club");
    db.stickers.forEach(s => { if (s.person === "club") { s.person = null; if (s.place === "Le QG") s.place = "Suisse"; } });
    const save = () => { if (!lsSet(KEY, JSON.stringify(db))) throw new Error("Stockage local plein (photo trop lourde ?)"); };
    const uid = () => Math.random().toString(36).slice(2, 10);
    return {
      async load() { return { people: db.people.map(p => ({ ...p })), stickers: db.stickers.map(s => ({ ...s })) }; },
      async checkCode() { return true; },
      async addPerson(p) { const n = { id: uid(), ...p }; db.people.push(n); save(); return { ...n }; },
      async updatePerson(id, patch) { const p = db.people.find(x => x.id === id); Object.assign(p, patch); save(); return { ...p }; },
      async addSticker(s) {
        const { photo, ...rest } = s; const n = { id: uid(), ...rest, has_photo: !!photo };
        if (photo) db.photos[n.id] = photo;
        db.stickers.push(n); save(); return { ...n };
      },
      async updateSticker(id, patch) {
        const s = db.stickers.find(x => x.id === id);
        if (patch.photo) { db.photos[id] = patch.photo; s.has_photo = true; }
        save(); return { ...s };
      },
      async deleteSticker(id) { db.stickers = db.stickers.filter(x => x.id !== id); delete db.photos[id]; save(); },
      async getPhoto(id) { return db.photos[id]; },
    };
  })();

  if (!REMOTE) $("localBanner").classList.add("show");

  // Ask for the club code once (stored on this device)
  async function ensureCode() {
    if (!REMOTE || lsGet(CODE_KEY)) return true;
    const code = await openCodeModal();
    if (!code) return false;
    let ok = false;
    try { ok = await store.checkCode(code); } catch {}
    if (!ok) { toast("Code Gymnasia incorrect", true); return false; }
    lsSet(CODE_KEY, code);
    return true;
  }
  // Runs a write; returns null if the user cancelled the code prompt, throws (after a toast) on error.
  async function guarded(fn) {
    if (!(await ensureCode())) return null;
    try { return await fn(); }
    catch (e) {
      if (/code gymnasia/i.test(e.message)) lsDel(CODE_KEY);
      toast(e.message || "Erreur", true); throw e;
    }
  }

  // ================================================================
  //  STATE
  // ================================================================
  let PEOPLE = [], STICKERS = [], personById = {}, byCountry = {};
  let filter = null;
  try {
    ({ people: PEOPLE, stickers: STICKERS } = await store.load());
  } catch (e) {
    toast("Impossible de charger les données : " + e.message, true);
  }
  function reindex() {
    personById = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
    byCountry = {};
    STICKERS.forEach(s => (byCountry[s.iso] ||= []).push(s));
  }
  const GYMNASIA = { name: "Gymnasia", color: "#2563ff" };
  const person = id => id == null ? GYMNASIA : personById[id] || { name: "?", color: "#888888" };

  // ================================================================
  //  HELPERS
  // ================================================================
  const haversine = (a, b) => {
    const R = 6371, r = x => x * Math.PI / 180;
    const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const who = s => `<i style="color:${esc(person(s.person).color)}">${esc(person(s.person).name)}</i>`;
  const where = s => s.place && s.place !== s.country ? `${esc(s.place)}, ${esc(s.country)}` : esc(s.country);
  const maxBy = (arr, f) => arr.length ? arr.reduce((a, b) => (f(b) > f(a) ? b : a)) : null;
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // ================================================================
  //  PANEL RENDERING
  // ================================================================
  function peopleStats() {
    return PEOPLE.map(p => {
      const mine = STICKERS.filter(s => s.person === p.id);
      return { p, spots: mine.length, countries: [...new Set(mine.map(s => s.country))] };
    }).sort((a, b) => b.countries.length - a.countries.length || b.spots - a.spots);
  }

  function renderStats() {
    const isos = Object.keys(byCountry);
    $("nCountries").textContent = isos.length;
    $("nCountriesSub").innerHTML = `pays sur ${WORLD_COUNT}<br><b>${(isos.length / WORLD_COUNT * 100).toFixed(1)} %</b> du monde stické`;
    $("worldBar").style.width = (isos.length / WORLD_COUNT * 100) + "%";

    const records = [];
    if (STICKERS.length) {
      const continents = new Set(STICKERS.map(s => s.continent).filter(Boolean));
      const topSummit = maxBy(STICKERS.filter(s => s.summit && s.alt), s => s.alt);
      const topAlt = maxBy(STICKERS.filter(s => s.alt), s => s.alt);
      if (topSummit && topSummit === topAlt) {
        records.push({ label: "⛰️ Sommet le plus haut · record d'altitude", value: `${fmt(topSummit.alt)} m`, sub: `${where(topSummit)} · ${who(topSummit)}`, wide: true, hero: true });
      } else {
        if (topSummit) records.push({ label: "⛰️ Sommet le plus haut", value: `${fmt(topSummit.alt)} m`, sub: `${where(topSummit)} · ${who(topSummit)}`, wide: true, hero: true });
        if (topAlt) records.push({ label: "🎈 Record d'altitude", value: `${fmt(topAlt.alt)} m`, sub: `${where(topAlt)} · ${who(topAlt)}`, wide: true });
      }
      records.push({ label: "🌐 Continents", value: `${continents.size} / 7`, sub: [...continents].map(esc).join(" · "), wide: true });
      const north = maxBy(STICKERS, s => s.lat), south = maxBy(STICKERS, s => -s.lat);
      records.push({ label: "🧭 Le plus au nord", value: `${north.approx ? "~" : ""}${Math.abs(north.lat).toFixed(1)}° ${north.lat >= 0 ? "N" : "S"}`, sub: `${where(north)} · ${who(north)}` });
      records.push({ label: "🐧 Le plus au sud", value: `${south.approx ? "~" : ""}${Math.abs(south.lat).toFixed(1)}° ${south.lat >= 0 ? "N" : "S"}`, sub: `${where(south)} · ${who(south)}` });
      const far = maxBy(STICKERS, s => haversine(HOME, s));
      records.push({ label: "✈️ Le plus loin de la Suisse", value: `${far.approx ? "~" : ""}${fmt(Math.round(haversine(HOME, far) / 100) * 100)} km`, sub: `${where(far)} · ${who(far)}` });
      const southCount = new Set(STICKERS.filter(s => s.lat < 0).map(s => s.iso)).size;
      records.push({ label: "🌏 Hémisphère sud", value: `${southCount} pays`, sub: `sur ${isos.length}` });
      const ranked = peopleStats().filter(x => x.countries.length);
      if (ranked.length) {
        const best = ranked[0].countries.length;
        const champs = ranked.filter(x => x.countries.length === best);
        records.push({ label: "🏆 Top stickeur", value: champs.map(c => `<span style="color:${esc(c.p.color)}">${esc(c.p.name)}</span>`).join(" & "), sub: `${best} pays${champs.length > 1 ? " chacun" : ""}` });
      }
      records.push({ label: "📍 Stickers collés", value: STICKERS.length, sub: `par ${new Set(STICKERS.filter(s => s.person != null).map(s => s.person)).size} membres` });
      const withPhoto = STICKERS.filter(s => s.has_photo).length;
      records.push({ label: "📸 Avec photo", value: `${withPhoto} / ${STICKERS.length}`, sub: "preuves en image", wide: true });
    }
    $("records").innerHTML = records.map(r => `
      <div class="stat${r.wide ? " wide" : ""}${r.hero ? " hero" : ""}">
        <div class="label">${r.label}</div>
        <div class="value">${r.value}</div>
        ${r.sub ? `<div class="who">${r.sub}</div>` : ""}
      </div>`).join("") || `<div class="stat wide"><div class="label">Aucun sticker pour l'instant</div></div>`;
  }

  function renderPeople() {
    $("people").innerHTML = peopleStats().map(x => `
      <div class="person${filter === x.p.id ? " active" : ""}" data-id="${esc(x.p.id)}">
        <span class="dot" style="background:${esc(x.p.color)}"></span>
        <span class="name">${esc(x.p.name)}<span class="flags">${x.countries.map(esc).join(" · ") || "Pas encore de sticker"}</span></span>
        <span class="count">${x.countries.length}<small>pays</small></span>
      </div>`).join("");
    document.querySelectorAll(".person").forEach(el => el.addEventListener("click", () => {
      filter = filter === el.dataset.id ? null : el.dataset.id;
      $("reset").classList.toggle("show", !!filter);
      renderPeople(); refreshGlobe();
      const mine = STICKERS.filter(s => s.person === filter);
      if (filter && mine.length) flyTo(mine);
    }));
  }

  function renderCountries() {
    $("countryList").innerHTML = Object.values(byCountry)
      .sort((a, b) => a[0].country.localeCompare(b[0].country, "fr"))
      .map(list => `<span class="chip" data-iso="${esc(list[0].iso)}">${[...new Set(list.map(s => s.person))]
        .map(id => `<span class="dot" style="background:${esc(person(id).color)}"></span>`).join("")}${esc(list[0].country)}</span>`).join("");
    document.querySelectorAll(".chip").forEach(el => el.addEventListener("click", () => showCountry(el.dataset.iso)));
  }

  function renderAll() {
    reindex(); renderStats(); renderPeople(); renderCountries(); refreshGlobe();
    if (openIso && $("card").classList.contains("show")) showCountry(openIso, null, true);
  }

  // ================================================================
  //  GLOBE
  // ================================================================
  const topo = await fetch("countries-110m.json").then(r => r.json());
  const features = topojson.feature(topo, topo.objects.countries).features;
  const BLUE = "#2563ff", BLUE_HI = "#6f9bff";
  const colorFor = iso => {
    const list = byCountry[iso];
    if (!list) return null;
    if (!filter) return BLUE;
    return list.some(s => s.person === filter) ? BLUE_HI : "#1a2c66";
  };
  const countryName = f => numToA2[f.id] ? frName.of(numToA2[f.id]) : f.properties.name;

  let hovered = null, picking = false;
  const globe = Globe()($("globe"))
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true).atmosphereColor("#2563ff").atmosphereAltitude(0.22)
    .polygonsData(features)
    .polygonAltitude(f => (f.id === hovered ? 0.03 : colorFor(f.id) ? 0.012 : 0.004))
    .polygonCapColor(f => {
      const c = colorFor(f.id);
      if (c) return f.id === hovered ? hexA(BLUE_HI, 1) : hexA(c, 0.92);
      return f.id === hovered ? "rgba(120,140,190,0.35)" : "rgba(28,36,58,0.95)";
    })
    .polygonSideColor(f => (colorFor(f.id) ? hexA(colorFor(f.id), 0.45) : "rgba(0,0,0,0.4)"))
    .polygonStrokeColor(f => (byCountry[f.id] ? "rgba(190,210,255,0.55)" : "rgba(90,110,160,0.35)"))
    .polygonsTransitionDuration(250)
    .polygonLabel(f => {
      if (picking) return `<div class="tooltip">📍 ${esc(countryName(f))}</div>`;
      const list = byCountry[f.id];
      const name = list ? list[0].country : countryName(f);
      if (!list) return `<div class="tooltip">${esc(name)}<br><small>Pas encore de sticker</small></div>`;
      const ppl = [...new Set(list.map(s => s.person))].map(id => `<span style="color:${esc(person(id).color)}">${esc(person(id).name)}</span>`).join(", ");
      return `<div class="tooltip"><b>${esc(name)}</b><br><small>Sticker par</small> ${ppl}</div>`;
    })
    .onPolygonHover(f => {
      hovered = f ? f.id : null;
      globe.polygonAltitude(globe.polygonAltitude()).polygonCapColor(globe.polygonCapColor());
      $("globe").style.cursor = picking ? "crosshair" : f ? "pointer" : "grab";
    })
    .onPolygonClick((f, ev, c) => picking ? pickAt(c) : showCountry(f.id, countryName(f)))
    .onGlobeClick(c => { if (picking) pickAt(c); })
    .pointLat("lat").pointLng("lng")
    .pointAltitude(s => (s.summit ? 0.09 : 0.04))
    .pointRadius(0.35)
    .pointsMerge(false)
    .pointLabel(s => `<div class="tooltip"><b>${where(s)}</b>${s.alt ? ` · ${fmt(s.alt)} m` : ""}${s.has_photo ? " 📸" : ""}<br><small>${s.approx ? "position approximative · " : ""}par</small> ${who(s)}</div>`)
    .onPointClick(s => picking ? pickAt(s) : showCountry(s.iso, s.country))
    .ringLat("lat").ringLng("lng")
    .ringColor(() => t => `rgba(111,155,255,${1 - t})`)
    .ringMaxRadius(3).ringPropagationSpeed(1.5).ringRepeatPeriod(1600);

  function refreshGlobe() {
    globe.polygonCapColor(globe.polygonCapColor())
      .polygonAltitude(globe.polygonAltitude())
      .polygonSideColor(globe.polygonSideColor())
      .polygonStrokeColor(globe.polygonStrokeColor())
      .pointsData(STICKERS.slice())
      .pointColor(s => (!filter || s.person === filter) ? person(s.person).color : "rgba(255,255,255,0.12)")
      .ringsData(STICKERS.filter(s => !s.approx && (!filter || s.person === filter)));
  }

  const mat = globe.globeMaterial();
  mat.color.set("#04060d"); if (mat.emissive) mat.emissive.set("#000000"); mat.shininess = 4;

  const mobile = () => window.innerWidth <= 760;
  // On phones the panel covers the bottom: shift the globe so it sits in the middle of the visible area.
  const placeGlobe = () => {
    const el = $("globe");
    if (!mobile()) { el.style.transform = ""; return; }
    const collapsed = $("panel").classList.contains("collapsed");
    const panelH = collapsed ? 92 + 8 : window.innerHeight * 0.48 + 8;
    el.style.transform = `translateY(${-panelH / 2}px)`;
  };
  const fit = () => { globe.width(window.innerWidth + (mobile() ? 0 : 388)).height(window.innerHeight); placeGlobe(); };
  window.addEventListener("resize", fit); fit();

  const controls = globe.controls();
  controls.autoRotate = true; controls.autoRotateSpeed = 0.45; controls.enableDamping = true;
  let idleTimer;
  const pauseRotate = () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (controls.autoRotate = !picking), 8000);
  };
  $("globe").addEventListener("pointerdown", pauseRotate);
  $("globe").addEventListener("wheel", pauseRotate, { passive: true });
  globe.pointOfView({ lat: 25, lng: 10, altitude: mobile() ? 3.2 : 2.3 }, 0);

  function flyTo(list) {
    pauseRotate();
    const lat = list.reduce((a, s) => a + s.lat, 0) / list.length;
    const x = list.reduce((a, s) => a + Math.cos(s.lng * Math.PI / 180), 0);
    const y = list.reduce((a, s) => a + Math.sin(s.lng * Math.PI / 180), 0);
    const lng = Math.atan2(y, x) * 180 / Math.PI;
    const spread = Math.max(...list.map(s => haversine({ lat, lng }, s)));
    globe.pointOfView({ lat, lng, altitude: Math.min(3, Math.max(0.9, spread / 3500 + 0.8)) * (mobile() ? 1.7 : 1) }, 1200);
  }

  // ================================================================
  //  COUNTRY CARD (with photos)
  // ================================================================
  let openIso = null;
  function showCountry(iso, fallbackName, silent) {
    const list = byCountry[iso];
    const card = $("card");
    openIso = list ? iso : null;
    if (!list) {
      if (silent) { card.classList.remove("show"); return; }
      card.innerHTML = `<button class="close" aria-label="Fermer">×</button><h3>${esc(fallbackName || "")}</h3>
        <div class="none">Pas encore de sticker ici. Qui s'y colle ? 👀</div>`;
    } else {
      card.innerHTML = `<button class="close" aria-label="Fermer">×</button><h3>${esc(list[0].country)}</h3>
        <div class="entries">` + list.map(s => `
        <div class="entry" data-id="${esc(s.id)}">
          <span class="dot" style="background:${esc(person(s.person).color)}"></span>
          <div class="entry-body">
            <b>${esc(person(s.person).name)}</b>
            <small>${esc(s.place)}${s.alt ? ` · ${fmt(s.alt)} m` : ""}${s.approx ? " · lieu exact inconnu" : ""}</small>
            ${s.has_photo ? `<div class="photo loading"></div>` : `<label class="link">📷 Ajouter une photo<input type="file" accept="image/*" hidden></label>`}
            <button class="link danger del">Supprimer</button>
          </div>
        </div>`).join("") + `</div>`;
      if (!silent) flyTo(list);
      card.querySelectorAll(".entry").forEach(el => wireEntry(el, list.find(s => String(s.id) === el.dataset.id)));
    }
    card.classList.add("show");
    card.querySelector(".close").onclick = () => { card.classList.remove("show"); openIso = null; };
  }

  const photoCache = {};
  async function wireEntry(el, s) {
    const ph = el.querySelector(".photo");
    if (ph) {
      try {
        const src = photoCache[s.id] ||= await store.getPhoto(s.id);
        if (src) { ph.classList.remove("loading"); ph.innerHTML = `<img src="${esc(src)}" alt="Photo du sticker">`; ph.onclick = () => openLightbox(src); }
        else ph.remove();
      } catch { ph.remove(); }
    }
    const input = el.querySelector("input[type=file]");
    if (input) input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      let photo;
      try { photo = await compressImage(file); } catch (e) { return toast(e.message, true); }
      try {
        const updated = await guarded(() => store.updateSticker(s.id, { photo }));
        if (!updated) return;
        photoCache[s.id] = photo; s.has_photo = true;
        toast("Photo ajoutée 📸"); renderAll();
      } catch {}
    };
    el.querySelector(".del").onclick = async () => {
      if (!confirm(`Supprimer le sticker « ${s.place} » (${person(s.person).name}) ?`)) return;
      try {
        const ok = await guarded(async () => { await store.deleteSticker(s.id); return true; });
        if (!ok) return;
        STICKERS = STICKERS.filter(x => x.id !== s.id);
        toast("Sticker supprimé"); renderAll();
      } catch {}
    };
  }

  function openLightbox(src) {
    $("lightbox").innerHTML = `<img src="${esc(src)}" alt="Photo du sticker">`;
    $("lightbox").classList.add("show");
  }
  $("lightbox").onclick = () => $("lightbox").classList.remove("show");

  // ================================================================
  //  IMAGE COMPRESSION (max 1280 px, JPEG)
  // ================================================================
  function compressImage(file, max = 1280, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let q = quality, data = c.toDataURL("image/jpeg", q);
        while (data.length > 900000 && q > 0.4) { q -= 0.1; data = c.toDataURL("image/jpeg", q); }
        resolve(data);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Format de photo non supporté (essaie en JPEG)")); };
      img.src = url;
    });
  }

  // ================================================================
  //  MODALS
  // ================================================================
  const modal = $("modal"), modalBox = $("modalBox");
  function openModal(html) {
    modalBox.innerHTML = `<button class="close" aria-label="Fermer">×</button>` + html;
    modal.classList.add("show");
    modalBox.querySelector(".close").onclick = closeModal;
  }
  function closeModal() { modal.classList.remove("show"); }
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  function openCodeModal() {
    return new Promise(resolve => {
      openModal(`<h3>Code Gymnasia</h3>
        <p class="muted">Pour ajouter ou modifier, entre le code secret. On ne te le redemandera plus sur cet appareil.</p>
        <form id="codeForm" class="add-row"><input id="codeInput" type="password" autocomplete="off" placeholder="Code" required>
        <button class="btn primary" type="submit">Valider</button></form>`);
      const done = v => { closeModal(); resolve(v); };
      modalBox.querySelector(".close").onclick = () => done(null);
      $("codeForm").onsubmit = e => { e.preventDefault(); done($("codeInput").value.trim()); };
      setTimeout(() => $("codeInput").focus(), 50);
    });
  }

  // ---------- Members ----------
  const nextColor = () => PALETTE.find(c => !PEOPLE.some(p => p.color.toLowerCase() === c)) || PALETTE[PEOPLE.length % PALETTE.length];
  function openMembers() {
    openModal(`<h3>Membres</h3>
      <p class="muted">Clique sur un nom ou une couleur pour le modifier.</p>
      <div class="members">${PEOPLE.map(p => `
        <div class="member" data-id="${esc(p.id)}">
          <input type="color" value="${esc(p.color)}" aria-label="Couleur">
          <input type="text" value="${esc(p.name)}" maxlength="40" aria-label="Nom">
          <span class="saved">✓</span>
        </div>`).join("")}</div>
      <form id="addPerson" class="add-row">
        <input type="color" id="newColor" value="${nextColor()}" aria-label="Couleur">
        <input type="text" id="newName" maxlength="40" placeholder="Nouveau membre" required>
        <button class="btn primary" type="submit">Ajouter</button>
      </form>`);
    modalBox.querySelectorAll(".member").forEach(row => {
      const [color, name] = row.querySelectorAll("input");
      const save = async () => {
        const p = personById[row.dataset.id];
        const patch = {};
        if (name.value.trim() && name.value.trim() !== p.name) patch.name = name.value.trim();
        if (color.value.toLowerCase() !== p.color.toLowerCase()) patch.color = color.value;
        if (!Object.keys(patch).length) { name.value = p.name; return; }
        const revert = () => { name.value = p.name; color.value = p.color; };
        try {
          const ok = await guarded(() => store.updatePerson(p.id, patch));
          if (!ok) return revert();
          Object.assign(p, patch);
          row.querySelector(".saved").classList.add("show");
          setTimeout(() => row.querySelector(".saved").classList.remove("show"), 1500);
          renderAll();
        } catch { revert(); }
      };
      name.addEventListener("change", save);
      name.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); name.blur(); } });
      color.addEventListener("change", save);
    });
    $("addPerson").onsubmit = async e => {
      e.preventDefault();
      const name = $("newName").value.trim(); if (!name) return;
      try {
        const p = await guarded(() => store.addPerson({ name, color: $("newColor").value }));
        if (!p) return;
        PEOPLE.push(p); renderAll(); toast(`${name} a rejoint l'aventure 🎉`); openMembers();
      } catch {}
    };
  }

  // ---------- New sticker ----------
  const draft = { person: lsGet("gym-last-person"), loc: null, place: "", alt: "", summit: false, photo: null, newName: "" };

  function containsPoint(g, x, y) {
    const inRing = r => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const inPoly = p => inRing(p[0]) && !p.slice(1).some(inRing);
    return g.type === "Polygon" ? inPoly(g.coordinates) : g.type === "MultiPolygon" ? g.coordinates.some(inPoly) : false;
  }
  function locFromA2(a2, lat, lng, place) {
    const meta = window.COUNTRY_META[a2];
    let country; try { country = frName.of(a2); } catch { country = a2; }
    const existing = meta && byCountry[meta[0]];
    return { lat: +(+lat).toFixed(4), lng: +(+lng).toFixed(4), iso: meta ? meta[0] : a2,
             country: existing ? existing[0].country : country, continent: meta ? meta[1] : "", place };
  }
  async function reverseGeocode(lat, lng) {
    let a2 = null, place = "";
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=fr`);
      const j = await r.json();
      if (j.address) {
        const ad = j.address;
        a2 = (ad.country_code || "").toUpperCase() || null;
        place = ad.city || ad.town || ad.village || ad.municipality || ad.county || ad.state || j.name || "";
      }
    } catch {}
    if (!a2) { // fallback : quel polygone contient le point ?
      const f = features.find(f => containsPoint(f.geometry, lng, lat));
      if (f && numToA2[f.id]) a2 = numToA2[f.id];
    }
    return a2 ? locFromA2(a2, lat, lng, place) : null;
  }

  function openNewSticker() {
    const known = draft.person && personById[draft.person];
    const opts = PEOPLE.map(p => `<option value="${esc(p.id)}"${draft.person === p.id ? " selected" : ""}>${esc(p.name)}</option>`).join("");
    const loc = draft.loc;
    openModal(`<h3>Nouveau sticker</h3>
      <form id="stickerForm">
        <label class="field"><span>Qui l'a collé ?</span>
          <select id="fPerson" required><option value="" disabled${known || draft.person === "__new" ? "" : " selected"}>Choisir…</option>${opts}
          <option value="__new"${draft.person === "__new" ? " selected" : ""}>➕ Quelqu'un de nouveau…</option></select>
        </label>
        <label class="field" id="newPersonRow"${draft.person === "__new" ? "" : " hidden"}><span>Nom du nouveau membre</span><input id="fNewPerson" maxlength="40" value="${esc(draft.newName)}"></label>

        <div class="field"><span>Où ?</span>
          <div class="loc${loc ? " set" : ""}">${loc
            ? `📍 <b>${esc(loc.country)}</b> <small>${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}</small>`
            : `<small>Pas encore de lieu</small>`}</div>
          <div class="loc-actions">
            <button type="button" class="btn" id="pickBtn">🌍 Choisir sur le globe</button>
            <button type="button" class="btn" id="gpsBtn">📡 Ma position</button>
          </div>
          <div class="search"><input id="fSearch" placeholder="…ou chercher une ville, un sommet" autocomplete="off">
            <button type="button" class="btn" id="searchBtn">Chercher</button></div>
          <div id="results" class="results"></div>
        </div>

        <label class="field"><span>Nom du lieu</span><input id="fPlace" maxlength="120" value="${esc(draft.place)}" placeholder="ex. Sommet du Cervin, un bar à Lisbonne…"></label>

        <div class="field-row">
          <label class="field"><span>Altitude (m) <em>optionnel</em></span><input id="fAlt" type="number" min="-500" max="9000" value="${esc(draft.alt)}"></label>
          <label class="check"><input type="checkbox" id="fSummit"${draft.summit ? " checked" : ""}> C'est un sommet ⛰️</label>
        </div>

        <div class="field"><span>Photo <em>la preuve 😏</em></span>
          <label class="photo-drop">${draft.photo ? `<img src="${draft.photo}" alt="Aperçu">` : `<span>📷 Prendre / choisir une photo</span>`}
            <input type="file" id="fPhoto" accept="image/*" hidden></label>
        </div>

        <button class="btn primary big-btn" type="submit" id="submitBtn">Coller le sticker</button>
      </form>`);

    const sel = $("fPerson");
    const syncDraft = () => {
      draft.person = sel.value || null; draft.place = $("fPlace").value; draft.newName = $("fNewPerson").value;
      draft.alt = $("fAlt").value; draft.summit = $("fSummit").checked;
    };
    sel.onchange = () => { $("newPersonRow").hidden = sel.value !== "__new"; if (sel.value === "__new") $("fNewPerson").focus(); };
    $("pickBtn").onclick = () => { syncDraft(); startPicking(); };
    $("gpsBtn").onclick = () => {
      if (!navigator.geolocation) return toast("Géolocalisation indisponible", true);
      $("gpsBtn").textContent = "📡 Localisation…";
      navigator.geolocation.getCurrentPosition(async pos => {
        syncDraft(); await setLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude);
      }, () => { toast("Position refusée ou indisponible", true); $("gpsBtn").textContent = "📡 Ma position"; },
      { enableHighAccuracy: true, timeout: 15000 });
    };
    const doSearch = async () => {
      const q = $("fSearch").value.trim(); if (!q) return;
      $("results").innerHTML = `<small class="muted">Recherche…</small>`;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&accept-language=fr&q=${encodeURIComponent(q)}`);
        const list = await r.json();
        if (!list.length) { $("results").innerHTML = `<small class="muted">Rien trouvé</small>`; return; }
        $("results").innerHTML = list.map((x, i) => `<button type="button" class="result" data-i="${i}">${esc(x.display_name)}</button>`).join("");
        $("results").querySelectorAll(".result").forEach(b => b.onclick = () => {
          const x = list[+b.dataset.i];
          const a2 = (x.address?.country_code || "").toUpperCase();
          if (!a2) return toast("Pas de pays pour ce résultat", true);
          syncDraft();
          draft.loc = locFromA2(a2, x.lat, x.lon, x.name || "");
          if (!draft.place) draft.place = x.name || "";
          if (/peak|volcano/.test(x.type || "")) draft.summit = true;
          openNewSticker();
        });
      } catch { $("results").innerHTML = `<small class="muted">Recherche indisponible</small>`; }
    };
    $("searchBtn").onclick = doSearch;
    $("fSearch").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } });
    $("fPhoto").onchange = async () => {
      const f = $("fPhoto").files[0]; if (!f) return;
      try { syncDraft(); draft.photo = await compressImage(f); openNewSticker(); }
      catch (e) { toast(e.message, true); }
    };

    $("stickerForm").onsubmit = async e => {
      e.preventDefault(); syncDraft();
      if (!draft.person) return toast("Choisis qui a collé le sticker", true);
      if (draft.person === "__new" && !draft.newName.trim()) return toast("Donne un nom au nouveau membre", true);
      if (!draft.loc) return toast("Choisis où le sticker a été collé", true);
      const btn = $("submitBtn"); btn.disabled = true; btn.textContent = "Envoi…";
      try {
        const s = await guarded(async () => {
          let pid = draft.person;
          if (pid === "__new") {
            const p = await store.addPerson({ name: draft.newName.trim(), color: nextColor() });
            PEOPLE.push(p); pid = p.id; draft.person = pid; draft.newName = "";
          }
          const alt = draft.alt === "" ? null : Math.round(+draft.alt);
          const s = await store.addSticker({
            person: pid, iso: draft.loc.iso, country: draft.loc.country, continent: draft.loc.continent,
            place: draft.place.trim() || draft.loc.place || draft.loc.country, lat: draft.loc.lat, lng: draft.loc.lng,
            approx: false, alt, summit: !!draft.summit && alt != null, photo: draft.photo || null,
          });
          if (draft.photo) photoCache[s.id] = draft.photo;
          STICKERS.push(s);
          lsSet("gym-last-person", pid);
          return s;
        });
        if (!s) { btn.disabled = false; btn.textContent = "Coller le sticker"; return; }
        closeModal();
        Object.assign(draft, { loc: null, place: "", alt: "", summit: false, photo: null });
        renderAll(); showCountry(s.iso);
        toast("Sticker collé ! 🎉");
      } catch { btn.disabled = false; btn.textContent = "Coller le sticker"; }
    };
  }

  async function setLocation(lat, lng, gpsAlt) {
    toast("Recherche du pays…");
    const loc = await reverseGeocode(lat, lng);
    if (!loc) { toast("Ce point est en plein océan 🌊 — réessaie", true); return false; }
    draft.loc = loc;
    if (!draft.place) draft.place = loc.place;
    if (gpsAlt && !draft.alt) draft.alt = Math.round(gpsAlt);
    $("toast").className = "toast";
    openNewSticker();
    return true;
  }

  function startPicking() {
    closeModal();
    picking = true; controls.autoRotate = false;
    document.body.classList.add("picking");
    $("pickBar").classList.add("show");
    $("card").classList.remove("show");
  }
  function stopPicking() {
    picking = false; document.body.classList.remove("picking"); $("pickBar").classList.remove("show");
  }
  async function pickAt(c) {
    if (!c) return;
    stopPicking();
    if (!(await setLocation(c.lat, c.lng))) startPicking();
  }
  $("pickCancel").onclick = () => { stopPicking(); openNewSticker(); };

  // ================================================================
  //  WIRING
  // ================================================================
  $("addBtn").onclick = () => openNewSticker();
  $("membersBtn").onclick = () => openMembers();
  $("reset").onclick = () => { filter = null; $("reset").classList.remove("show"); renderPeople(); refreshGlobe(); };
  $("toggle").onclick = () => {
    const c = $("panel").classList.toggle("collapsed");
    placeGlobe();
    $("toggle").textContent = c ? "Stats" : "Réduire";
  };
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if ($("lightbox").classList.contains("show")) $("lightbox").classList.remove("show");
    else if (picking) { stopPicking(); openNewSticker(); }
    else if (modal.classList.contains("show")) closeModal();
  });

  renderAll();
})();
