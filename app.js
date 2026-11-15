(async function () {
  const PEOPLE = window.PEOPLE, STICKERS = window.STICKERS, HOME = window.HOME;
  const WORLD_COUNT = 195;
  const personById = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
  const $ = id => document.getElementById(id);

  // ---------- helpers ----------
  const byCountry = {};
  STICKERS.forEach(s => (byCountry[s.iso] ||= []).push(s));
  const countryIsos = Object.keys(byCountry);

  const haversine = (a, b) => {
    const R = 6371, r = x => x * Math.PI / 180;
    const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const fmt = n => n.toLocaleString("fr-CH").replace(/ | /g, " ");
  const who = s => {
    const p = personById[s.person];
    return `<i style="color:${p.color}">${p.name}</i>`;
  };
  const where = s => s.place && s.place !== s.country ? `${s.place}, ${s.country}` : s.country;

  let filter = null; // person id or null

  // ---------- stats ----------
  $("nCountries").textContent = countryIsos.length;
  $("nCountriesSub").textContent = `pays sur ${WORLD_COUNT} · ${(countryIsos.length / WORLD_COUNT * 100).toFixed(1)} % du monde`;
  $("worldBar").style.width = (countryIsos.length / WORLD_COUNT * 100) + "%";

  const records = [];
  const continents = new Set(STICKERS.map(s => s.continent));
  records.push({ label: "Continents", value: `${continents.size} / 7`, sub: [...continents].join(", "), wide: true });

  const summits = STICKERS.filter(s => s.summit && s.alt);
  if (summits.length) {
    const top = summits.reduce((a, b) => (b.alt > a.alt ? b : a));
    records.push({ label: "⛰️ Sommet le plus haut", value: `${fmt(top.alt)} m`, sub: `${top.place} · ${who(top)}`, wide: true });
  }
  const withAlt = STICKERS.filter(s => s.alt);
  if (withAlt.length) {
    const top = withAlt.reduce((a, b) => (b.alt > a.alt ? b : a));
    records.push({ label: "🎈 Record d'altitude", value: `${fmt(top.alt)} m`, sub: `${top.place} · ${who(top)}`, wide: true });
  }
  const north = STICKERS.reduce((a, b) => (b.lat > a.lat ? b : a));
  const south = STICKERS.reduce((a, b) => (b.lat < a.lat ? b : a));
  records.push({ label: "🧭 Le plus au nord", value: `${north.approx ? "~" : ""}${north.lat.toFixed(1)}° N`, sub: `${where(north)} · ${who(north)}` });
  records.push({ label: "🐧 Le plus au sud", value: `${south.approx ? "~" : ""}${Math.abs(south.lat).toFixed(1)}° S`, sub: `${where(south)} · ${who(south)}` });

  const far = STICKERS.reduce((a, b) => (haversine(HOME, b) > haversine(HOME, a) ? b : a));
  records.push({ label: "✈️ Le plus loin de la Suisse", value: `${far.approx ? "~" : ""}${fmt(Math.round(haversine(HOME, far) / 100) * 100)} km`, sub: `${where(far)} · ${who(far)}` });

  const southCount = new Set(STICKERS.filter(s => s.lat < 0).map(s => s.iso)).size;
  records.push({ label: "🌏 Hémisphère sud", value: `${southCount} pays`, sub: `sur ${countryIsos.length}` });

  // top stickeur (by countries, then spots)
  const perPerson = PEOPLE.map(p => {
    const mine = STICKERS.filter(s => s.person === p.id);
    return { p, spots: mine.length, countries: [...new Set(mine.map(s => s.country))] };
  }).filter(x => x.spots > 0 && x.p.id !== "club")
    .sort((a, b) => b.countries.length - a.countries.length || b.spots - a.spots);
  const best = perPerson[0].countries.length;
  const champs = perPerson.filter(x => x.countries.length === best);
  records.push({ label: "🏆 Top stickeur", value: champs.map(c => `<span style="color:${c.p.color}">${c.p.name}</span>`).join(" & "), sub: `${best} pays chacun`.replace(" chacun", champs.length > 1 ? " chacun" : "") });
  records.push({ label: "📍 Stickers collés", value: STICKERS.length, sub: `par ${perPerson.length} membres` });

  $("records").innerHTML = records.map(r => `
    <div class="stat${r.wide ? " wide" : ""}">
      <div class="label">${r.label}</div>
      <div class="value">${r.value}</div>
      ${r.sub ? `<div class="who">${r.sub}</div>` : ""}
    </div>`).join("");

  // people list
  const clubEntry = PEOPLE.filter(p => p.id === "club" && STICKERS.some(s => s.person === "club"))
    .map(p => ({ p, spots: 1, countries: [...new Set(STICKERS.filter(s => s.person === "club").map(s => s.country))] }));
  $("people").innerHTML = [...perPerson, ...clubEntry].map(x => `
    <div class="person" data-id="${x.p.id}">
      <span class="dot" style="background:${x.p.color};color:${x.p.color}"></span>
      <span class="name">${x.p.name}<span class="flags">${x.countries.join(" · ")}</span></span>
      <span class="count">${x.countries.length} pays</span>
    </div>`).join("");

  // country chips
  $("countryList").innerHTML = countryIsos
    .map(iso => byCountry[iso])
    .sort((a, b) => a[0].country.localeCompare(b[0].country, "fr"))
    .map(list => `<span class="chip" data-iso="${list[0].iso}">${[...new Set(list.map(s => s.person))]
      .map(id => `<span class="dot" style="background:${personById[id].color}"></span>`).join("")}${list[0].country}</span>`).join("");

  // ---------- globe ----------
  const topo = await fetch("countries-110m.json").then(r => r.json());
  const features = topojson.feature(topo, topo.objects.countries).features;

  const colorFor = iso => {
    const list = byCountry[iso];
    if (!list) return null;
    const pick = filter ? list.find(s => s.person === filter) : list[0];
    return pick ? personById[pick.person].color : null;
  };
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  let hovered = null;
  const globe = Globe()($("globe"))
    .backgroundColor("#05070d")
    .showGlobe(true)
    .showAtmosphere(true).atmosphereColor("#5b8cff").atmosphereAltitude(0.18)
    .polygonsData(features)
    .polygonAltitude(f => (f.id === hovered ? 0.03 : colorFor(f.id) ? 0.012 : 0.004))
    .polygonCapColor(f => {
      const c = colorFor(f.id);
      if (c) return hexA(c, f.id === hovered ? 1 : 0.88);
      return f.id === hovered ? "rgba(255,255,255,0.22)" : "rgba(160,175,210,0.13)";
    })
    .polygonSideColor(f => (colorFor(f.id) ? hexA(colorFor(f.id), 0.35) : "rgba(255,255,255,0.03)"))
    .polygonStrokeColor(() => "rgba(255,255,255,0.18)")
    .polygonsTransitionDuration(250)
    .polygonLabel(f => {
      const list = byCountry[f.id];
      const name = list ? list[0].country : f.properties.name;
      if (!list) return `<div class="tooltip">${name}<br><small>Pas encore de sticker</small></div>`;
      const ppl = [...new Set(list.map(s => s.person))].map(id => `<span style="color:${personById[id].color}">${personById[id].name}</span>`).join(", ");
      return `<div class="tooltip"><b>${name}</b><br><small>Sticker par</small> ${ppl}</div>`;
    })
    .onPolygonHover(f => {
      hovered = f ? f.id : null;
      globe.polygonAltitude(globe.polygonAltitude()).polygonCapColor(globe.polygonCapColor());
      $("globe").style.cursor = f ? "pointer" : "grab";
    })
    .onPolygonClick(f => showCountry(f.id, f.properties.name))
    // sticker pins
    .pointsData(STICKERS)
    .pointLat("lat").pointLng("lng")
    .pointColor(s => (!filter || s.person === filter) ? personById[s.person].color : "rgba(255,255,255,0.15)")
    .pointAltitude(s => (s.summit ? 0.09 : 0.04))
    .pointRadius(0.35)
    .pointsMerge(false)
    .pointLabel(s => `<div class="tooltip"><b>${where(s)}</b>${s.alt ? ` · ${fmt(s.alt)} m` : ""}<br><small>${s.approx ? "position approximative · " : ""}par</small> <span style="color:${personById[s.person].color}">${personById[s.person].name}</span></div>`)
    .onPointClick(s => showCountry(s.iso, s.country))
    // pulsing rings on precise spots
    .ringsData(STICKERS.filter(s => !s.approx))
    .ringLat("lat").ringLng("lng")
    .ringColor(s => t => hexA(personById[s.person].color, 1 - t))
    .ringMaxRadius(3).ringPropagationSpeed(1.5).ringRepeatPeriod(1600);

  const mat = globe.globeMaterial();
  mat.color.set("#0b1530"); if (mat.emissive) mat.emissive.set("#060b1c"); mat.shininess = 8;

  const fit = () => globe.width(window.innerWidth).height(window.innerHeight);
  window.addEventListener("resize", fit); fit();

  const controls = globe.controls();
  controls.autoRotate = true; controls.autoRotateSpeed = 0.45;
  controls.enableDamping = true;
  let idleTimer;
  const pauseRotate = () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (controls.autoRotate = true), 8000);
  };
  $("globe").addEventListener("pointerdown", pauseRotate);
  $("globe").addEventListener("wheel", pauseRotate, { passive: true });

  const mobile = () => window.innerWidth <= 760;
  globe.pointOfView({ lat: 25, lng: 10, altitude: mobile() ? 3.2 : 2.3 }, 0);

  const refresh = () => {
    globe.polygonCapColor(globe.polygonCapColor())
      .polygonAltitude(globe.polygonAltitude())
      .polygonSideColor(globe.polygonSideColor())
      .pointColor(globe.pointColor())
      .ringsData(STICKERS.filter(s => !s.approx && (!filter || s.person === filter)));
  };

  // ---------- interactions ----------
  function flyTo(list) {
    pauseRotate();
    const lat = list.reduce((a, s) => a + s.lat, 0) / list.length;
    // average longitudes on the circle
    const x = list.reduce((a, s) => a + Math.cos(s.lng * Math.PI / 180), 0);
    const y = list.reduce((a, s) => a + Math.sin(s.lng * Math.PI / 180), 0);
    const lng = Math.atan2(y, x) * 180 / Math.PI;
    const spread = Math.max(...list.map(s => haversine({ lat, lng }, s)));
    globe.pointOfView({ lat: mobile() ? lat - 12 : lat, lng, altitude: Math.min(3, Math.max(0.9, spread / 3500 + 0.8)) }, 1200);
  }

  function showCountry(iso, fallbackName) {
    const list = byCountry[iso];
    const card = $("card");
    if (!list) {
      card.innerHTML = `<button class="close">×</button><h3>${fallbackName}</h3><div class="none">Pas encore de sticker ici. Qui s'y colle ? 👀</div>`;
    } else {
      card.innerHTML = `<button class="close">×</button><h3>${list[0].country}</h3>` + list.map(s => `
        <div class="entry"><span class="dot" style="background:${personById[s.person].color};color:${personById[s.person].color}"></span>
          <div><b>${personById[s.person].name}</b><small>${s.place}${s.alt ? ` · ${fmt(s.alt)} m` : ""}${s.approx ? " · lieu exact inconnu" : ""}</small></div>
        </div>`).join("");
      flyTo(list);
    }
    card.classList.add("show");
    card.querySelector(".close").onclick = () => card.classList.remove("show");
  }

  document.querySelectorAll(".person").forEach(el => el.addEventListener("click", () => {
    const id = el.dataset.id;
    filter = filter === id ? null : id;
    document.querySelectorAll(".person").forEach(p => p.classList.toggle("active", p.dataset.id === filter));
    $("reset").classList.toggle("show", !!filter);
    refresh();
    if (filter) flyTo(STICKERS.filter(s => s.person === filter));
  }));
  $("reset").onclick = () => {
    filter = null;
    document.querySelectorAll(".person").forEach(p => p.classList.remove("active"));
    $("reset").classList.remove("show");
    refresh();
  };
  document.querySelectorAll(".chip").forEach(el => el.addEventListener("click", () => showCountry(el.dataset.iso)));

  $("toggle").onclick = () => {
    const c = $("panel").classList.toggle("collapsed");
    $("toggle").textContent = c ? "Stats" : "Réduire";
  };
})();
