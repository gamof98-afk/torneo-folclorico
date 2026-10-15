(function(){
  const cfg=window.TORNEO_CONFIG||{};
  const configured=cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes('PEGA_AQUI');
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const logo=name=>{const n=String(name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(n.includes('diablos'))return'assets/equipos/diablos-arlequines.png';if(n.includes('juliana'))return'assets/equipos/la-juliana.png';if(n.includes('reina'))return'assets/equipos/reina-de-la-cumbia.png';if(n.includes('monocucos'))return'assets/equipos/monocucos-puperos.png';if(n.includes('sabrosura'))return'assets/equipos/la-sabrosura.png';if(n.includes('marimonda'))return'assets/equipos/marimondas-de-la-29.png';if(n.includes('rumbon')||n.includes('runbon'))return'assets/equipos/rumbon-norteno.png';if(n.includes('mamapuerca')||n.includes('mama purca')||n.includes('mama puer'))return'assets/equipos/mamapuerca-biker.png';if(n.includes('dimension'))return'assets/equipos/dimension-plateada.png';return'assets/equipos/a-son-de-tambo.svg'};
  const date=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'Fecha por definir';
  const statusLabel=s=>s==='played'?'Jugado':s==='scheduled'?'Programado':s==='postponed'?'Aplazado':'Pendiente por programar';
  if(!configured||!window.supabase){['#standings','#teams','#matches','#all-matches'].forEach(s=>{if($(s))$(s).innerHTML='<p class="empty">Configura las credenciales de Supabase en config.js para cargar la información oficial.</p>'});return}
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
    async function loadAwards() {
    const container = document.querySelector("#home-awards");
    if (!container) return;

    const [playersRes, teamsRes] = await Promise.all([
      db.from("players")
        .select("id,name,goals,assists,team_id")
        .order("name"),
      db.from("teams")
        .select("id,name")
    ]);

    if (playersRes.error || teamsRes.error) {
      console.error("Error al cargar reconocimientos:", playersRes.error || teamsRes.error);
      container.innerHTML = `
        <article class="award-card">
          <p>No fue posible cargar los reconocimientos.</p>
        </article>`;
      return;
    }

    const players = playersRes.data || [];
    const teamMap = Object.fromEntries(
      (teamsRes.data || []).map(team => [team.id, team.name])
    );

    function renderLeaders(field, title, icon, unit) {
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
            <p class="award-description">Los datos aparecerán cuando se registren ${unit}.</p>
          </article>`;
      }

      const highest = Math.max(...eligible.map(player => player.total));
      const leaders = eligible.filter(player => player.total === highest);

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

    container.innerHTML =
      renderLeaders("goals", "GOLEADOR DEL TORNEO", "⚽", "goles") +
      renderLeaders("assists", "MÁXIMO ASISTENTE", "✦", "asistencias");
  }
  async function load(){
    const [tr,mr]=await Promise.all([db.from('teams').select('*').order('name'),db.from('matches').select('*').order('match_date',{ascending:false,nullsFirst:false})]);
    if(tr.error||mr.error){console.error(tr.error||mr.error);return}
    const teams=tr.data||[],matches=mr.data||[],active=teams.filter(t=>t.is_withdrawn!==true),map=Object.fromEntries(teams.map(t=>[t.id,t.name]));
    const stats=Object.fromEntries(active.map(t=>[t.id,{...t,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]));
    matches.filter(m=>m.status==='played'&&m.home_score!=null&&m.away_score!=null).forEach(m=>{const h=stats[m.home_team_id],a=stats[m.away_team_id];if(m.no_points===true){if(h)h.pj++;if(a)a.pj++;return}if(h){h.pj++;h.gf+=m.home_score;h.gc+=m.away_score;if(m.home_score>m.away_score){h.g++;h.pts+=3}else if(m.home_score<m.away_score)h.p++;else{h.e++;h.pts++}}if(a){a.pj++;a.gf+=m.away_score;a.gc+=m.home_score;if(m.away_score>m.home_score){a.g++;a.pts+=3}else if(m.away_score<m.home_score)a.p++;else{a.e++;a.pts++}}});
    const ranking=Object.values(stats).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf||a.name.localeCompare(b.name));
    if($('#standings'))$('#standings').innerHTML=ranking.map((t,i)=>`<tr class="rank-${i+1}"><td><span class="rank-number">${i+1}</span></td><td><a class="team-name-cell team-link" href="equipo.html?id=${encodeURIComponent(t.id)}"><img class="team-logo" src="${logo(t.name)}" alt=""><span>${esc(t.name)}</span></a></td><td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td><td>${t.gf}</td><td>${t.gc}</td><td>${t.gf-t.gc>0?'+':''}${t.gf-t.gc}</td><td><span class="points-badge">${t.pts}</span></td></tr>`).join('')||'<tr><td colspan="10" class="empty">Aún no hay equipos registrados.</td></tr>';
    if($('#teams'))$('#teams').innerHTML=active.map(t=>`<a class="team-card team-card-link" href="equipo.html?id=${encodeURIComponent(t.id)}"><img class="team-logo-large" src="${logo(t.name)}" alt="Escudo de ${esc(t.name)}"><div><strong>${esc(t.name)}</strong><p class="muted">${esc(t.short_name||'Ver plantilla y estadísticas')} · Ver equipo ↗</p></div></a>`).join('')||'<article class="team-card">Aún no hay equipos registrados.</article>';
    const card=m=>{const home=map[m.home_team_id]||'Por definir',away=map[m.away_team_id]||'Por definir',score=m.home_score!=null&&m.away_score!=null?`${m.home_score} : ${m.away_score}`:'VS';return `<article class="match-card" data-status="${esc(m.status||'pending')}" data-round="${esc(m.round_name||'')}" data-home="${esc(home.toLowerCase())}" data-away="${esc(away.toLowerCase())}"><p class="match-meta">${esc(m.round_name||'Fecha sin especificar')} · ${esc(date(m.match_date))}</p><div class="match-scoreline"><a class="match-side" href="equipo.html?id=${encodeURIComponent(m.home_team_id||'')}"><img src="${logo(home)}" alt=""><span>${esc(home)}</span></a><strong class="match-score">${score}</strong><a class="match-side" href="equipo.html?id=${encodeURIComponent(m.away_team_id||'')}"><img src="${logo(away)}" alt=""><span>${esc(away)}</span></a></div><span class="match-status">${statusLabel(m.status)}${m.no_points===true?' · Sin puntos':''}</span>${m.notes?`<p class="muted">${esc(m.notes)}</p>`:''}</article>`};
    if($('#matches'))$('#matches').innerHTML=matches.slice(0,6).map(card).join('')||'<article class="match-card">Aún no hay partidos registrados.</article>';
    if ($('#all-matches')) {
      const allMatches = $('#all-matches');
      const roundFilter = $('#match-round-filter');
      const statusFilter = $('#match-status-filter');
      const teamFilter = $('#match-team-filter');
      const toggleButton = $('#toggle-calendar');
      const calendarContent = $('#calendar-content');
      const toggleIcon = $('#calendar-toggle-icon');
    
      // Construye las opciones con las jornadas existentes.
      const rounds = [...new Set(
        matches
          .map(m => String(m.round_name || '').trim())
          .filter(Boolean)
      )].sort((a, b) =>
        a.localeCompare(b, 'es', {
          numeric: true,
          sensitivity: 'base'
        })
      );
    
      if (roundFilter) {
        roundFilter.innerHTML =
          '<option value="all">Todas las fechas</option>' +
          rounds.map(round =>
            `<option value="${esc(round)}">${esc(round)}</option>`
          ).join('');
      }
    
      allMatches.innerHTML = matches.map(card).join('') ||
        '<article class="match-card">Aún no hay partidos registrados.</article>';
    
      const matchCards = [...allMatches.querySelectorAll('.match-card')];
    
      // Busca la jornada más reciente que tenga al menos un partido jugado.
      const latestPlayedMatch = matches.find(m =>
        m.status === 'played' &&
        m.round_name &&
        m.match_date
      );
    
      const latestPlayedRound = latestPlayedMatch
        ? String(latestPlayedMatch.round_name).trim()
        : '';
    
      // Si existe una última jornada jugada, se selecciona automáticamente.
      // Si no hay partidos jugados, se muestran todos los encuentros.
      if (roundFilter) {
        roundFilter.value = latestPlayedRound
          ? latestPlayedRound
          : 'all';
      }
    
      // Al cargar la página, el calendario permanece plegado.
      if (calendarContent && toggleButton) {
        calendarContent.hidden = true;
        toggleButton.setAttribute('aria-expanded', 'false');
      }
    
      if (toggleButton && calendarContent) {
        toggleButton.addEventListener('click', () => {
          const opening = calendarContent.hidden;
    
          calendarContent.hidden = !opening;
          toggleButton.setAttribute('aria-expanded', String(opening));
          toggleButton.innerHTML = opening
            ? 'Ocultar calendario <span id="calendar-toggle-icon">−</span>'
            : 'Ver calendario <span id="calendar-toggle-icon">＋</span>';
        });
      }
    
      const apply = () => {
        const status = statusFilter?.value || 'all';
        const round = roundFilter?.value || 'all';
        const query = (teamFilter?.value || '').trim().toLowerCase();
    
        matchCards.forEach(el => {
          const matchesStatus =
            status === 'all' || el.dataset.status === status;
    
          const matchesRound =
            round === 'all' || el.dataset.round === round;
    
          const matchesTeam =
            !query ||
            el.dataset.home.includes(query) ||
            el.dataset.away.includes(query);
    
          el.hidden = !(
            matchesStatus &&
            matchesRound &&
            matchesTeam
          );
        });
      };
    
      statusFilter?.addEventListener('change', apply);
      roundFilter?.addEventListener('change', apply);
      teamFilter?.addEventListener('input', apply);
    
      apply();
    }
  }
  load();
  loadAwards().catch(error => {
    console.error("Error cargando reconocimientos:", error);
  });
})();
