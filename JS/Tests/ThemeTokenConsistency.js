import fs from "node:fs";
import assert from "node:assert/strict";
const KEYS=["--gp-color-page","--gp-color-surface","--gp-color-elevated","--gp-color-text","--gp-color-text-secondary","--gp-color-text-muted","--gp-color-text-disabled","--gp-color-border","--gp-color-border-strong","--gp-color-accent","--gp-color-accent-contrast","--gp-color-button-bg","--gp-color-success","--gp-color-warning","--gp-color-danger","--gp-color-info-bg","--gp-color-info-text","--gp-color-disabled-bg","--gp-color-focus","--gp-color-overlay","--gp-transition-speed"];
function block(s,selector){const i=s.indexOf(selector),a=s.indexOf("{",i),b=s.indexOf("}",a);assert.ok(i>=0&&a>i&&b>a,"selector "+selector);return s.slice(a+1,b).replace(/\/\*[\s\S]*?\*\//g,"");}
function tokens(s,selector){const out={};for(const row of block(s,selector).split(";")){const p=row.indexOf(":");if(p>0){const k=row.slice(0,p).trim();if(k.startsWith("--"))out[k]=row.slice(p+1).trim();}}return out;}
function inline(h){const a=h.indexOf("<style"),b=h.indexOf(">",a),c=h.indexOf("</style>",b);assert.ok(a>=0&&b>a&&c>b);return h.slice(b+1,c);}
function lum(h){assert.match(h,/^#[0-9a-f]{6}$/i);const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function runThemeTokenConsistencyTests(input){
 const src=[input.style,inline(input.users),inline(input.add)],light=src.map(s=>tokens(s,":root")),dark=src.map(s=>tokens(s,"body.dark-mode"));
 for(let p=0;p<3;p++)for(const k of KEYS){assert.ok(light[p][k],"light "+p+" "+k);assert.ok(dark[p][k],"dark "+p+" "+k);}
 for(let p=1;p<3;p++)for(const k of KEYS){assert.equal(light[p][k],light[0][k],"light mismatch "+k);assert.equal(dark[p][k],dark[0][k],"dark mismatch "+k);}
 for(let p=0;p<3;p++)for(const k of KEYS)if(k!=="--gp-transition-speed")assert.notEqual(light[p][k],dark[p][k],"theme mismatch "+k);
 const maps=[{"--bg-color":"--gp-color-page","--text-color":"--gp-color-text","--card-bg":"--gp-color-surface","--modal-bg":"--gp-color-elevated","--accent-color":"--gp-color-accent","--border-color":"--gp-color-border"},{"--background-color":"--gp-color-page","--text-color":"--gp-color-text","--card-background":"--gp-color-surface","--modal-bg":"--gp-color-elevated","--primary-color":"--gp-color-accent","--error-color":"--gp-color-danger"},{"--bg-color":"--gp-color-page","--text-color":"--gp-color-text","--card-bg":"--gp-color-surface","--primary-color":"--gp-color-accent","--border-color":"--gp-color-border"}];
 for(let p=0;p<3;p++)for(const k of Object.keys(maps[p])){assert.equal(light[p][k],"var("+maps[p][k]+")");assert.equal(dark[p][k],"var("+maps[p][k]+")");}
 for(const theme of [light,dark])for(let p=0;p<3;p++){const t=theme[p];for(const bg of [t["--gp-color-page"],t["--gp-color-surface"]]){assert.ok(contrast(t["--gp-color-text"],bg)>=4.5);assert.ok(contrast(t["--gp-color-text-secondary"],bg)>=4.5);}assert.ok(contrast(t["--gp-color-text-muted"],t["--gp-color-page"])>=4.5);assert.ok(contrast(t["--gp-color-info-text"],t["--gp-color-info-bg"])>=4.5);assert.ok(contrast(t["--gp-color-focus"],t["--gp-color-surface"])>=3);}
 assert.ok(src[1].includes("var(--gp-color-border)")&&src[1].includes("var(--gp-color-border-strong)"));
 for(const k of ["--gp-color-text-muted","--gp-color-focus","--gp-color-disabled-bg","--gp-color-info-bg","--gp-color-info-text","--gp-color-success"])assert.ok(src[2].includes("var("+k+")"));
 for(const k of ["--gp-color-accent","--gp-color-info-bg","--gp-color-success","--gp-color-warning","--gp-color-disabled-bg"])assert.ok(src[0].includes("var("+k+")"));
 return {status:"PASS",checks:12,sharedTokens:KEYS.length,pages:3,themes:2};
}
const result=runThemeTokenConsistencyTests({style:fs.readFileSync("style.css","utf8"),users:fs.readFileSync("users.html","utf8"),add:fs.readFileSync("add_cortes.html","utf8")});
console.log(JSON.stringify(result,null,2));if(result.status!=="PASS")process.exitCode=1;
