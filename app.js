
(function () {
  const cfg = window.TORNEO_CONFIG || {};
  const configured =
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseUrl.includes("PEGA_AQUI");

  if (!configured || !window.supabase) return;

  const db = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );

  async function load() {
    const { data: teams, error: teamsError } = await db
      .from("teams")
      .select("*")
      .order("name");

    if (teamsError) {
      console.error("Error al cargar equipos:", teamsError);
      return;
    }

    const allTeams = teams || [];
    const activeTeams = allTeams.filter(
      team => team.is_withdrawn !== true
    );

    // Conservamos todos los equipos para mostrar el historial.
    const teamMap = {};
    allTeams.forEach(team => {
      teamMap[team.id] = team.name;
    });

    const { data: matches, error: matchesError } = await db
      .from("matches")
      .select("*")
      .order("match_date", { ascending: false });

    if (matchesError) {
      console.error("Error al cargar partidos:", matchesError);
      return;
    }

    const allMatches = matches || [];

    const played = allMatches.filter(
      match =>
        match.status === "played" &&
        match.home_score !== null &&
        match.away_score !== null
    );

    // La clasificación solo incluye los 10 equipos actuales.
    const stats = {};
    activeTeams.forEach(team => {
      stats[team.id] = {
        id: team.id,
        name: team.name,
        pj: 0,
        g: 0,
        e: 0,
        p: 0,
        gf: 0,
        gc: 0,
        pts: 0
      };
    });

  
played.forEach(m => {
  const h = stats[m.home_team_id];
  const a = stats[m.away_team_id];

  if (!h || !a) return;

  // Todo partido jugado cuenta para partidos disputados y goles.
  h.pj++;
  a.pj++;

  h.gf += m.home_score;
  h.gc += m.away_score;
  a.gf += m.away_score;
  a.gc += m.home_score;

  // Los partidos administrativos marcados no_points
  // no conceden puntos ni alteran G/E/P.
  if (m.no_points === true) return;

  if (m.home_score > m.away_score) {
    h.g++;
    a.p++;
    h.pts += 3;
  } else if (m.home_score < m.away_score) {
    a.g++;
    h.p++;
    a.pts += 3;
  } else {
    h.e++;
    a.e++;
    h.pts++;
    a.pts++;
  }
});

    const ranking = Object.values(stats).sort(
      (a, b) =>
        b.pts - a.pts ||
        (b.gf - b.gc) - (a.gf - a.gc) ||
        b.gf - a.gf ||
        a.name.localeCompare(b.name)
    );

    document.querySelector("#standings").innerHTML =
      ranking.map((team, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${esc(team.name)}</strong></td>
          <td>${team.pj}</td>
          <td>${team.g}</td>
          <td>${team.e}</td>
          <td>${team.p}</td>
          <td>${team.gf}</td>
          <td>${team.gc}</td>
          <td>${team.gf - team.gc > 0 ? "+" : ""}${team.gf - team.gc}</td>
          <td><strong>${team.pts}</strong></td>
        </tr>
      `).join("") ||
      '<tr><td colspan="10" class="empty">Aún no hay equipos registrados.</td></tr>';

    document.querySelector("#teams").innerHTML =
      activeTeams.map(team => `
        <article class="team-card">
          <strong>${esc(team.name)}</strong>
          <p class="muted">${esc(team.short_name || "Equipo participante")}</p>
        </article>
      `).join("") ||
      '<article class="team-card">Aún no hay equipos registrados.</article>';

    const latest = allMatches.slice(0, 6);

    document.querySelector("#matches").innerHTML =
      latest.map(match => `
        <article class="match-card">
          <p class="eyebrow">
            ${esc(match.round_name || "Partido")} ·
            ${match.match_date
              ? new Date(match.match_date + "T12:00:00").toLocaleDateString("es-CO")
              : "Fecha por definir"}
          </p>
          <p>
            <strong>${esc(teamMap[match.home_team_id] || "Por definir")}</strong>
            <b>${match.home_score ?? "–"} : ${match.away_score ?? "–"}</b>
            <strong>${esc(teamMap[match.away_team_id] || "Por definir")}</strong>
          </p>
          <small>${
            match.status === "played"
              ? "Finalizado"
              : match.status === "scheduled"
                ? "Programado"
                : "Pendiente"
          }</small>
        </article>
      `).join("") ||
      '<article class="match-card empty-card">Aún no hay partidos registrados.</article>';
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  load();
})();
