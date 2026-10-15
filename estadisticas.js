
(function () {
  const cfg = window.TORNEO_CONFIG || {};
  const awards = document.querySelector("#statistics-awards");
  const tableBody = document.querySelector("#individual-stats");

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
    showError("No se pudo conectar con Supabase.");
    return;
  }

  const db = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );

  function showError(message) {
    if (awards) {
      awards.innerHTML = `<article class="award-card">${esc(message)}</article>`;
    }
    if (tableBody) {
      tableBody.innerHTML =
        `<tr><td colspan="4" class="empty">${esc(message)}</td></tr>`;
    }
  }

  function renderAward(players, field, title, icon, unit, teamMap) {
    const eligible = players.filter(p => Number(p[field] || 0) > 0);

    if (!eligible.length) {
      return `
        <article class="award-card">
          <p class="award-kicker">${icon} ${title}</p>
          <h3>Aún sin registros</h3>
        </article>`;
    }

    const highest = Math.max(...eligible.map(p => Number(p[field] || 0)));
    const leaders = eligible.filter(p => Number(p[field] || 0) === highest);

    return `
      <article class="award-card">
        <p class="award-kicker">${icon} ${title}</p>
        ${leaders.map(p => `
          <div class="award-leader">
            <div class="award-player-icon">${icon}</div>
            <div class="award-player-info">
              <h3>${esc(p.name)}</h3>
              <p>${esc(teamMap[p.team_id] || "Equipo no disponible")}</p>
            </div>
            <strong class="award-total">
              ${Number(p[field] || 0)}
              <small>${unit}</small>
            </strong>
          </div>
        `).join("")}
      </article>`;
  }

  async function loadStatistics() {
    // Las dos consultas se ejecutan simultáneamente.
    const [playersRes, teamsRes] = await Promise.all([
      db.from("players")
        .select("id,name,goals,assists,team_id")
        .order("name"),

      db.from("teams")
        .select("id,name")
    ]);

    if (playersRes.error) throw playersRes.error;
    if (teamsRes.error) throw teamsRes.error;

    const players = playersRes.data || [];
    const teamMap = Object.fromEntries(
      (teamsRes.data || []).map(t => [t.id, t.name])
    );

    // Mostrar la información apenas llegan los datos.
    awards.innerHTML =
      renderAward(players, "goals", "GOLEADOR DEL TORNEO", "⚽", "goles", teamMap) +
      renderAward(players, "assists", "MÁXIMO ASISTENTE", "✦", "asistencias", teamMap);

    const sorted = [...players].sort((a, b) =>
      Number(b.goals || 0) - Number(a.goals || 0) ||
      Number(b.assists || 0) - Number(a.assists || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""), "es")
    );

    tableBody.innerHTML = sorted.map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(teamMap[p.team_id] || "Equipo no disponible")}</td>
        <td>${Number(p.goals || 0)}</td>
        <td>${Number(p.assists || 0)}</td>
      </tr>
    `).join("") || `
      <tr><td colspan="4" class="empty">Aún no hay jugadores registrados.</td></tr>`;
  }

  // No bloquea la página completa mientras se consultan los datos.
  loadStatistics().catch(error => {
    console.error("Error cargando estadísticas:", error);
    showError("No fue posible cargar las estadísticas. Intenta recargar la página.");
  });
})();
