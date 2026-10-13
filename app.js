(function(){
 const cfg=window.TORNEO_CONFIG||{};
 const configured=cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes("PEGA_AQUI");
 if(!configured||!window.supabase){return;}
 const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
 async function load(){
  const {data:teams,error}=await db.from('teams').select('*').order('name');
  if(error)return;
  const teamMap={}; (teams||[]).forEach(t=>teamMap[t.id]=t.name);
  const {data:matches}=await db.from('matches').select('*').order('match_date',{ascending:false});
  const played=(matches||[]).filter(m=>m.status==='played'&&m.home_score!==null&&m.away_score!==null);
  const stats={}; (teams||[]).forEach(t=>stats[t.id]={id:t.id,name:t.name,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0});
  played.forEach(m=>{const h=stats[m.home_team_id],a=stats[m.away_team_id];if(!h||!a)return;h.pj++;a.pj++;h.gf+=m.home_score;h.gc+=m.away_score;a.gf+=m.away_score;a.gc+=m.home_score;if(m.home_score>m.away_score){h.g++;a.p++;h.pts+=3}else if(m.home_score<m.away_score){a.g++;h.p++;a.pts+=3}else{h.e++;a.e++;h.pts++;a.pts++}});
  const ranking=Object.values(stats).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf||a.name.localeCompare(b.name));
  document.querySelector('#standings').innerHTML=ranking.map((t,i)=>`<tr><td>${i+1}</td><td><strong>${esc(t.name)}</strong></td><td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td><td>${t.gf}</td><td>${t.gc}</td><td>${t.gf-t.gc>0?'+':''}${t.gf-t.gc}</td><td><strong>${t.pts}</strong></td></tr>`).join('')||'<tr><td colspan="10" class="empty">Aún no hay equipos registrados.</td></tr>';
  document.querySelector('#teams').innerHTML=(teams||[]).map(t=>`<article class="team-card"><strong>${esc(t.name)}</strong><p class="muted">${esc(t.short_name||'Equipo participante')}</p></article>`).join('')||'<article class="team-card">Aún no hay equipos registrados.</article>';
  const latest=(matches||[]).slice(0,6);
  document.querySelector('#matches').innerHTML=latest.map(m=>`<article class="match-card"><p class="eyebrow">${esc(m.round_name||'Partido')} · ${m.match_date?new Date(m.match_date).toLocaleDateString('es-CO'):'Fecha por definir'}</p><p><strong>${esc(teamMap[m.home_team_id]||'Por definir')}</strong> <b>${m.home_score??'–'} : ${m.away_score??'–'}</b> <strong>${esc(teamMap[m.away_team_id]||'Por definir')}</strong></p><small>${m.status==='played'?'Finalizado':m.status==='scheduled'?'Programado':'Pendiente'}</small></article>`).join('')||'<article class="match-card empty-card">Aún no hay partidos registrados.</article>';
 }
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 load();
})();