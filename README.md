# Torneo folclórico — portal web inicial

Este proyecto es una base visual independiente para el torneo. No copia el código privado de Copa Fácil. La URL pública de referencia solo permitió identificar el título "Torneo folclórico"; por eso los datos reales del campeonato aún deben importarse y verificarse.

## Qué incluye
- Página pública adaptable a móviles.
- Vista de tabla de posiciones calculada a partir de partidos finalizados.
- Listado de equipos y partidos.
- Pantalla de inicio de sesión conectada a Supabase Auth.
- Esquema SQL con políticas de lectura pública y escritura restringida a administradores.

## Antes de publicar
1. Crea un proyecto en https://supabase.com/.
2. En Supabase abre SQL Editor y ejecuta `supabase/schema.sql`.
3. En Authentication crea el usuario administrador usando correo y contraseña.
4. Copia el UUID de ese usuario desde Authentication → Users.
5. En SQL Editor ejecuta el `insert` de administrador que está comentado al final de `supabase/schema.sql`, sustituyendo UUID y nombre.
6. En Project Settings → API copia la Project URL y la publishable/anon key. Pégalas en `config.js`.
7. Desactiva el registro público de usuarios en Authentication si solo tú administrarás el torneo.
8. Sube los archivos a un repositorio GitHub y conecta ese repositorio a Cloudflare Pages. Para un sitio estático, deja el comando de compilación vacío y el directorio raíz como raíz del proyecto.
9. Prueba el inicio de sesión y el acceso público antes de compartir la URL.

## Datos del torneo
Para asegurar que la información sea correcta, se necesita una exportación desde Copa Fácil (CSV/Excel/PDF) o capturas legibles de equipos, tabla, calendario, resultados, goleadores y sanciones. La página de referencia no expuso esos datos en el acceso de lectura disponible. No se deben inventar ni dar por importados.

## Limitación del prototipo
El inicio de sesión está conectado a Supabase cuando se configura. El panel de administración todavía no incluye formularios CRUD completos para editar equipos, partidos y resoluciones. Debe completarse y probarse antes de usarlo como sistema oficial.
