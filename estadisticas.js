```javascript
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

  if (
    !cfg.supabaseUrl ||
    !cfg.supabaseAnonKey ||
    !window.supabase
  ) {
    showError("Revisa la configuración de Supabase en config.js.");
    return;
  }

  const db = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );

  function showError(message) {
    if (awards) {
      awards.innerHTML = `
        <article class="award-card">
          <p>${esc(message)}</p>
        </article>`;
    }

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty">${esc(message)}</td>
        </tr>`;
    }
  }

  function renderAward(players, field, title, icon, unit, teamMap) {
    const eligible = players
      .map(player => ({
        ...player,
        total: Number(player[field] || 0)
      }))
      .filter(player => player.total > 0);

    if (!eligible.length) {
      return `
        <article class="award-card">
          <p class="award-kicker">${icon} ${title}</p>
          <h3>Aún sin registros</h3>
          <p class="award-description">
            Este reconocimiento aparecerá cuando se registren ${unit}.
          </p>
        </article>`;
    }

    const highest = Math.max(...eligible.map(p => p.total));
    const leaders = eligible.filter(p => p.total === highest);

    return `
      <article class="award-card">
        <p class="award-kicker">${icon} ${title}</p>

        ${leaders.map(player => `
          <div class="award-leader">
            <div class="award-player-icon" aria-hidden="true">${icon}</div>

            <div class="award-player-info">
              <h3>${esc(player.name)}</h3>
              <p>${esc(teamMap[player.team_id] || "Equipo no disponible")}</p>
            </div>

            <strong class="award-total">
              ${player.total}
              <small>${unit}</small>
            </strong>
          </div>
        `).join("")}
      </article>`;
  }

  async function loadStatistics() {
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
    const teams = teamsRes.data || [];

    const teamMap = Object.fromEntries(
      teams.map(team => [team.id, team.name])
    );

    awards.innerHTML =
      renderAward(players, "goals", "GOLEADOR DEL TORNEO", "⚽", "goles", teamMap) +
      renderAward(players, "assists", "MÁXIMO ASISTENTE", "✦", "asistencias", teamMap);

    const sorted = [...players].sort((a, b) =>
      Number(b.goals || 0) - Number(a.goals || 0) ||
      Number(b.assists || 0) - Number(a.assists || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""), "es")
    );

    tableBody.innerHTML = sorted.map(player => `
      <tr>
        <td>${esc(player.name)}</td>
        <td>${esc(teamMap[player.team_id] || "Equipo no disponible")}</td>
        <td>${Number(player.goals || 0)}</td>
        <td>${Number(player.assists || 0)}</td>
      </tr>
    `).join("") || `
      <tr>
        <td colspan="4" class="empty">Aún no hay jugadores registrados.</td>
      </tr>`;
  }

  loadStatistics().catch(error => {
    console.error("Error al cargar estadísticas:", error);
    showError("No fue posible cargar las estadísticas. Revisa los permisos de lectura de Supabase.");
  });
})();
```
