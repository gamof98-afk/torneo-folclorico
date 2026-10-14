(function () {
  const cfg = window.TORNEO_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes("PEGA_AQUI");
  if (!configured || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const teamLogo = name => {
    const n = String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (n.includes("diablos")) return "assets/equipos/diablos-arlequines.png";
    if (n.includes("juliana")) return "assets/equipos/la-juliana.png";
    if (n.includes("reina")) return "assets/equipos/reina-de-la-cumbia.png";
    if (n.includes("monocucos")) return "assets/equipos/monocucos-puperos.png";
    if (n.includes("sabrosura")) return "assets/equipos/la-sabrosura.png";
    if (n.includes("marimondas") || n.includes("marimonda")) return "assets/equipos/marimondas-de-la-29.png";
    if (n.includes("rumbon") || n.includes("runbon")) return "assets/equipos/rumbon-norteno.png";
    if (n.includes("mamapuerca") || n.includes("mama purca") || n.includes("mama puer")) return "assets/equipos/mamapuerca-biker.png";
    if (n.includes("dimension")) return "assets/equipos/dimension-plateada.png";
    if (n.includes("son de tambo")) return "assets/equipos/a-son-de-tambo.svg";
    return "assets/equipos/a-son-de-tambo.svg";
  };

  async function load() {
    const { data: teams, error: teamsError } = await db.from("teams").select("*").order("name");
    if (teamsError) { console.error("Error al cargar equipos:", teamsError); return; }
    const allTeams = teams || [];
    const activeTeams = allTeams.filter(team => team.is_withdrawn !== true);
    const teamMap = {};
    allTeams.forEach(team => { teamMap[team.id] = team.name; });

    const { data: matches, error: matchesError } = await db.from("matches").select("*").order("match_date", { ascending: false });
    if (matchesError) { console.error("Error al cargar partidos:", matchesError); return; }
    const allMatches = matches || [];
    const played = allMatches.filter(m => m.status === "played" && m.home_score !== null && m.away_score !== null);
    const stats = {};
    activeTeams.forEach(team => { stats[team.id] = {id:team.id,name:team.name,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}; });

    played.forEach(m => {
      const h = stats[m.home_team_id], a = stats[m.away_team_id];
      if (m.no_points === true) { if (h) h.pj++; if (a) a.pj++; return; }
      if (h) {
        h.pj++; h.gf += m.home_score; h.gc += m.away_score;
        if (m.home_score > m.away_score) { h.g++; h.pts += 3; }
        else if (m.home_score < m.away_score) h.p++;
        else { h.e++; h.pts++; }
      }
      if (a) {
        a.pj++; a.gf += m.away_score; a.gc += m.home_score;
        if (m.away_score > m.home_score) { a.g++; a.pts += 3; }
        else if (m.away_score < m.home_score) a.p++;
        else { a.e++; a.pts++; }
      }
    });

    const ranking = Object.values(stats).sort((a,b) => b.pts-a.pts || (b.gf-b.gc)-(a.gf-a.gc) || b.gf-a.gf || a.name.localeCompare(b.name));
    document.querySelector("#standings").innerHTML = ranking.map((t,i) => `
      <tr class="rank-${i+1}"><td><span class="rank-number">${i+1}</span></td><td><span class="team-name-cell"><img class="team-logo" src="${teamLogo(t.name)}" alt="" loading="lazy"><span>${esc(t.name)}</span></span></td>
      <td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td><td>${t.gf}</td><td>${t.gc}</td><td>${t.gf-t.gc>0?"+":""}${t.gf-t.gc}</td><td><span class="points-badge">${t.pts}</span></td></tr>`).join("") ||
      '<tr><td colspan="10" class="empty">Aún no hay equipos registrados.</td></tr>';

    document.querySelector("#teams").innerHTML = activeTeams.map(team => `
      <article class="team-card"><img class="team-logo-large" src="${teamLogo(team.name)}" alt="Escudo de ${esc(team.name)}" loading="lazy">
      <div><strong>${esc(team.name)}</strong><p class="muted">${esc(team.short_name || "Equipo participante")}</p></div></article>`).join("") ||
      '<article class="team-card">Aún no hay equipos registrados.</article>';

    const latest = allMatches.slice(0,6);
    document.querySelector("#matches").innerHTML = latest.map(m => {
      const home = teamMap[m.home_team_id] || "Por definir", away = teamMap[m.away_team_id] || "Por definir";
      const date = m.match_date ? new Date(m.match_date+"T12:00:00").toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}) : "Fecha por definir";
      const score = m.home_score !== null && m.away_score !== null ? `${m.home_score} : ${m.away_score}` : "VS";
      return `<article class="match-card"><p class="match-meta">${esc(m.round_name || "Partido")} · ${esc(date)}</p>
      <div class="match-scoreline"><div class="match-side"><img src="${teamLogo(home)}" alt="" loading="lazy"><span>${esc(home)}</span></div>
      <strong class="match-score">${score}</strong><div class="match-side"><img src="${teamLogo(away)}" alt="" loading="lazy"><span>${esc(away)}</span></div></div>
      <span class="match-status">${m.status === "played" ? "Finalizado" : m.status === "scheduled" ? "Programado" : "Pendiente"}${m.no_points === true ? " · Sin puntos" : ""}</span></article>`;
    }).join("") || '<article class="match-card empty-card">Aún no hay partidos registrados.</article>';
  }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  load();
})();
