(function () {
  const cfg = window.TORNEO_CONFIG || {};
  const $ = s => document.querySelector(s);
  const id = new URLSearchParams(location.search).get('id');

  const esc = v =>
    String(v ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const logo = name => {
    const n = String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (n.includes('diablos')) return 'assets/equipos/diablos-arlequines.png';
    if (n.includes('juliana')) return 'assets/equipos/la-juliana.png';
    if (n.includes('reina')) return 'assets/equipos/reina-de-la-cumbia.png';
    if (n.includes('monocucos')) return 'assets/equipos/monocucos-puperos.png';
    if (n.includes('sabrosura')) return 'assets/equipos/la-sabrosura.png';
    if (n.includes('marimonda')) return 'assets/equipos/marimondas-de-la-29.png';
    if (n.includes('rumbon') || n.includes('runbon')) return 'assets/equipos/rumbon-norteno.png';
    if (n.includes('mamapuerca') || n.includes('mama puer')) return 'assets/equipos/mamapuerca-biker.png';
    if (n.includes('dimension')) return 'assets/equipos/dimension-plateada.png';

    return 'assets/equipos/a-son-de-tambo.svg';
  };

  const date = d =>
    d
      ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : 'Fecha por definir';

  const label = s =>
    s === 'played'
      ? 'Jugado'
      : s === 'scheduled'
        ? 'Programado'
        : s === 'postponed'
          ? 'Aplazado'
          : 'Pendiente por programar';

  if (
    !id ||
    !cfg.supabaseUrl ||
    !cfg.supabaseAnonKey ||
    !window.supabase
  ) {
    $('#team-name').textContent = 'No se pudo cargar el equipo';
    $('#players').innerHTML =
      '<tr><td colspan="8" class="empty">Verifica el enlace y la configuración de Supabase.</td></tr>';
    return;
  }

  const db = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );

  async function run() {
    const [teamRes, teamsRes, matchesRes] = await Promise.all([
      db.from('teams')
        .select('*')
        .eq('id', id)
        .maybeSingle(),

      db.from('teams')
        .select('id,name'),

      db.from('matches')
        .select('*')
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .order('match_date', {
          ascending: false,
          nullsFirst: false
        })
    ]);

    if (teamRes.error || !teamRes.data) {
      $('#team-name').textContent = 'Equipo no encontrado';
      $('#players').innerHTML =
        '<tr><td colspan="8" class="empty">No fue posible encontrar este equipo.</td></tr>';
      return;
    }

    const team = teamRes.data;

    $('#team-name').textContent = team.name;
    $('#team-short').textContent = team.short_name || 'Equipo participante';
    $('#team-logo').src = logo(team.name);
    $('#team-logo').alt = 'Escudo de ' + team.name;
    document.title = team.name + ' | Torneo Folclórico';

    // ==========================================
    // PLANTILLA Y ESTADÍSTICAS ACUMULADAS
    // ==========================================

    const pr = await db
      .from('players')
      .select('*')
      .eq('team_id', id)
      .order('name');

    if (pr.error) {
      $('#players').innerHTML =
        '<tr><td colspan="8" class="empty">No fue posible leer la plantilla. Verifica los permisos y la configuración de Supabase.</td></tr>';

      $('#player-message').textContent =
        'Detalle técnico: ' + pr.error.message;

    } else if (!pr.data || pr.data.length === 0) {
      $('#players').innerHTML =
        '<tr><td colspan="8" class="empty">Aún no hay jugadores registrados para este equipo.</td></tr>';

    } else {
      /*
       * Se utilizan los totales acumulados de la tabla players.
       * No se suman aquí los registros de player_match_stats,
       * porque eso puede mostrar únicamente los datos de los
       * partidos registrados individualmente.
       */

      $('#players').innerHTML = pr.data.map(p => {
        const partidos = Number(p.matches_played || 0);
        const goles = Number(p.goals || 0);
        const asistencias = Number(p.assists || 0);
        const amarillas = Number(p.yellow_cards || 0);
        const rojas = Number(p.red_cards || 0);

        return `
          <tr>
            <td>${esc(p.name)}</td>
            <td>${esc(p.shirt_number ?? '—')}</td>
            <td>${esc(p.position || '—')}</td>
            <td>${partidos}</td>
            <td>${goles}</td>
            <td>${asistencias}</td>
            <td>${amarillas}</td>
            <td>${rojas}</td>
          </tr>
        `;
      }).join('');

      $('#player-message').textContent = '';
    }

    // ==========================================
    // PARTIDOS DEL EQUIPO
    // ==========================================

    const teams = Object.fromEntries(
      (teamsRes.data || []).map(t => [t.id, t.name])
    );

    const matches = matchesRes.data || [];

    const renderMatches = () => {
      const statusFilter = $('#team-match-status').value;

      const filtered = matches.filter(m =>
        statusFilter === 'all' || m.status === statusFilter
      );

      $('#team-matches').innerHTML = filtered.map(m => {
        const home = teams[m.home_team_id] || 'Por definir';
        const away = teams[m.away_team_id] || 'Por definir';

        const score =
          m.home_score != null && m.away_score != null
            ? `${m.home_score} : ${m.away_score}`
            : 'VS';

        return `
          <article class="match-card">
            <p class="match-meta">
              ${esc(m.round_name || 'Fecha sin especificar')}
              · ${esc(date(m.match_date))}
            </p>

            <div class="match-scoreline">
              <div class="match-side">
                <img src="${logo(home)}" alt="">
                <span>${esc(home)}</span>
              </div>

              <strong class="match-score">${score}</strong>

              <div class="match-side">
                <img src="${logo(away)}" alt="">
                <span>${esc(away)}</span>
              </div>
            </div>

            <span class="match-status">${label(m.status)}</span>

            ${m.notes
              ? `<p class="muted">${esc(m.notes)}</p>`
              : ''}
          </article>
        `;
      }).join('') ||
      '<article class="match-card empty-card">No hay partidos para este filtro.</article>';
    };

    $('#team-match-status').addEventListener('change', renderMatches);

    renderMatches();
  }

  run().catch(error => {
    console.error('Error cargando la ficha del equipo:', error);

    $('#team-name').textContent = 'Error cargando la ficha';

    $('#players').innerHTML =
      '<tr><td colspan="8" class="empty">Ocurrió un error al cargar la información. Revisa la consola del navegador.</td></tr>';
  });
})();
