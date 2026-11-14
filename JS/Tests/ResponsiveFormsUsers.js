import fs from 'node:fs';
import assert from 'node:assert/strict';
const users=fs.readFileSync('users.html','utf8'), add=fs.readFileSync('add_cortes.html','utf8');
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
check('tabla usa ancho disponible',()=>{has(u,'.table-scroll-container { overflow-x: visible; overflow-y: visible; }');has(u,'.user-table { width: 100%; min-width: 0; table-layout: fixed; }');});
check('celdas permiten saltos',()=>has(u,'white-space: normal; overflow-wrap: anywhere;'));
check('anchos de cuatro columnas',()=>{for(const v of ['width: 23%','width: 31%','width: 17%','width: 29%','width: 22%','width: 30%','width: 16%','width: 32%'])has(u,v);});
check('acciones apiladas',()=>{has(u,'.actions-cell { display: flex; flex-direction: column;');has(u,'min-height: 40px;');});
check('modal limitado y con scroll',()=>{has(u,'max-height: calc(100dvh - 24px)');has(u,'overflow-y: auto; overscroll-behavior: contain;');has(u,'width: 100%; margin: 0 auto; padding: 16px;');});
check('controles táctiles',()=>{has(u,'min-height: 44px; font-size: 16px;');has(u,'.modal-content form .btn { width: 100%; min-height: 44px;');});
check('modal horizontal baja',()=>{has(u,'@media (max-height: 520px) and (orientation: landscape)');has(u,'max-height: calc(100dvh - 16px)');});
check('balance CSS',()=>{cssBalance(u);cssBalance(a);});
check('sintaxis JS',()=>{const AF=Object.getPrototypeOf(async function(){}).constructor;for(const html of [users,add]){let code=between(html,'<script type="module">','</script>');code=code.split('\n').filter(x=>!x.trimStart().startsWith('import ')).join('\n');new AF(code);}});
return {status:'PASS',checks:cases.length,cases};}
const result=run();console.log(JSON.stringify(result,null,2));