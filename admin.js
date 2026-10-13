(function(){
 const cfg=window.TORNEO_CONFIG||{},msg=document.getElementById('login-message');
 const configured=cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes("PEGA_AQUI");
 if(!configured||!window.supabase){msg.textContent='Falta conectar Supabase. Sigue los pasos de configuración del archivo README.md.';return;}
 const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
 const loginPanel=document.getElementById('login-panel'),dashboard=document.getElementById('dashboard');
 async function check(){const {data:{session}}=await db.auth.getSession();if(session){loginPanel.classList.add('hidden');dashboard.classList.remove('hidden');}}
 document.getElementById('login-form').addEventListener('submit',async e=>{e.preventDefault();msg.textContent='Verificando acceso…';const {error}=await db.auth.signInWithPassword({email:document.getElementById('email').value,password:document.getElementById('password').value});if(error){msg.textContent='No se pudo iniciar sesión. Revisa el correo y la contraseña.';return;}msg.textContent='';await check();});
 document.getElementById('logout').addEventListener('click',async()=>{await db.auth.signOut();dashboard.classList.add('hidden');loginPanel.classList.remove('hidden');});
 check();
})();