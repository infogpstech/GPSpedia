import fs from 'node:fs';
import assert from 'node:assert/strict';
const users=fs.readFileSync('HTML/users.html','utf8'), add=fs.readFileSync('HTML/add_cortes.html','utf8');
function between(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i);return s.slice(i+a.length,j);}
function cssBalance(s){let b=0,p=0,state=0,q='';for(let i=0;i<s.length;i++){const c=s[i],n=s[i+1];if(state===1){if(c==='*'&&n==='/'){state=0;i++;}continue;}if(state===2){if(c==='\\\\'){i++;continue;}if(c===q)state=0;continue;}if(c==='/'&&n==='*'){state=1;i++;continue;}if(c==="'"||c==='"'){state=2;q=c;continue;}if(c==='{')b++;if(c==='}')b--;if(c==='(')p++;if(c===')')p--;assert.ok(b>=0&&p>=0);}assert.equal(b,0);assert.equal(p,0);assert.equal(state,0);}
function run(){const u=between(users,'<style>','</style>'),a=between(add,'<style>','</style>'),cases=[],has=(s,v)=>assert.ok(s.includes(v),v),check=(n,fn)=>{fn();cases.push(n);};
check('grid de una columna a 760px',()=>{has(a,'@media (max-width: 760px)');has(a,'.form-grid { grid-template-columns: minmax(0, 1fr); }');});
check('elementos de formulario encogibles',()=>has(a,'.form-grid > *, .form-group, .match-card-info { min-width: 0; }'));
check('acciones reorganizables',()=>{has(a,'.btn-container { flex-wrap: wrap; }');has(a,'.btn-container > * { flex: 1 1 140px; min-width: 0; white-space: normal; }');has(a,'.btn-container > * { flex-basis: 100%; }');});
check('tarjetas adaptables',()=>{has(a,'.match-card-header { flex-wrap: wrap; }');has(a,'width: clamp(88px, 30%, 120px)');});
check('carga de imágenes adaptable',()=>{has(a,'.image-upload-group { flex-wrap: wrap; min-width: 0; }');has(a,'.image-upload-group > * { min-width: 0; max-width: 100%; }');});
check('mensajes y acordeones adaptables',()=>{has(a,'.info-msg { align-items: flex-start; flex-wrap: wrap; }');has(a,'.accordion-header { align-items: flex-start; gap: 10px; }');});
check('campos móviles legibles',()=>has(a,'input, select, textarea { min-width: 0; font-size: 16px; }'));
check('tabla ocupa todo el ancho y no permite scroll horizontal',()=>{has(u,'overflow-x: hidden;');has(u,'width: 100%;');has(u,'table-layout: fixed;');assert.doesNotMatch(u,/width:\s*max-content/);});
check('encabezados usan los nombres solicitados',()=>{has(users,'<th>Usuario</th>');has(users,'<th>Nombre</th>');has(users,'<th>Rol</th>');has(users,'<th>acciones</th>');assert.doesNotMatch(users,/<th>Nombre de Usuario<\/th>|<th>Nombre Completo<\/th>/);});
check('rol conserva palabras completas sin saltos internos',()=>{has(u,'white-space: nowrap; overflow-wrap: normal; word-break: normal;');has(u,'font-size: .64rem; white-space: nowrap; overflow-wrap: normal; word-break: normal;');});
check('anchos de cuatro columnas',()=>{for(const v of ['width: 18%','width: 20%','width: 25%','width: 37%','width: 16%','width: 31%'])has(u,v);});
check('acciones horizontales compactas con iconos',()=>{has(u,'.actions-cell { display:flex; flex-direction:row;');has(u,'.user-primary-actions { display:flex; flex-direction:row;');has(u,'flex-wrap:nowrap;');has(users,'fa-pen-to-square');has(users,'fa-trash-can');has(users,'fa-arrow-right-from-bracket');has(users,"resetSessionsButton.setAttribute('aria-label'");has(u,'flex:0 0 34px; width:34px; min-width:34px; height:36px;');has(u,'.user-table td:nth-child(3) { font-size: .68rem;');has(users,'USERS_CACHE_TTL_MS = 5 * 60 * 1000');has(users,'!cached.stale');});
check('modal limitado y con scroll',()=>{has(u,'max-height: calc(100dvh - 24px)');has(u,'overflow-y: auto; overscroll-behavior: contain;');has(u,'width: 100%; margin: 0 auto; padding: 16px;');});
check('controles táctiles',()=>{has(u,'min-height: 44px; font-size: 16px;');has(u,'.modal-content form .btn { width: 100%; min-height: 44px;');});
check('modal horizontal baja',()=>{has(u,'@media (max-height: 520px) and (orientation: landscape)');has(u,'max-height: calc(100dvh - 16px)');});
check('balance CSS',()=>{cssBalance(u);cssBalance(a);});
check('sintaxis JS',()=>{const AF=Object.getPrototypeOf(async function(){}).constructor;for(const html of [users,add]){let code=between(html,'<script type="module">','</script>');code=code.split('\n').filter(x=>!x.trimStart().startsWith('import ')).join('\n');new AF(code);}});
return {status:'PASS',checks:cases.length,cases};}
const result=run();console.log(`${result.checks}/${result.checks} PASS`);console.log(JSON.stringify(result,null,2));