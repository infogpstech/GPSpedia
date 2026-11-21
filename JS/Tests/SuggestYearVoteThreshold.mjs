import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const feedback=readFileSync(resolve(root,"JS/Services/feedback.js"),"utf8");
function extract(name){
 const start=feedback.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const end=feedback.indexOf("\n}",start)+2;
 assert.ok(end>start,"No se pudo delimitar "+name);
 return feedback.slice(start,end);
}
const columns={ID_vehiculo:3,Problema:4,Respuesta:5,anoSugerido:9};
const actorCheck=new Function(extract("isVerifiedSuggestionActorKey_")+"\nreturn isVerifiedSuggestionActorKey_;")();
const positiveCheck=new Function("COLS_FEEDBACKS",extract("isPositiveYearSuggestionRow")+"\nreturn isPositiveYearSuggestionRow;")(columns);
const countVotes=new Function("COLS_FEEDBACKS","isVerifiedSuggestionActorKey_","isPositiveYearSuggestionRow",
 extract("countVerifiedPositiveYearSuggestionVotes_")+"\nreturn countVerifiedPositiveYearSuggestionVotes_;")(columns,actorCheck,positiveCheck);
const handler=extract("handleSuggestYearLocked");
const threshold=Number(feedback.match(/const YEAR_SUGGESTION_VOTE_THRESHOLD_\s*=\s*(\d+)/)?.[1]);
function row(vehicle,year,actor,problem,answer){
 const value=Array(10).fill("");
 value[2]=vehicle;value[8]=year;value[9]=actor;value[3]=problem;value[4]=answer;
 return value;
}
const positive=[
 row("VEH-1",2025,"user:U1","Sugerencia de ampliar rango al año 2025","La información funciona para el año 2025."),
 row("VEH-1",2025,"user:U2","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025."),
 row("VEH-1",2025,"user:U3","Modelo sin generaciones recientes registradas","El usuario confirmó que se trata de una generación más reciente.")
];
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("el umbral de aplicación automática permanece en tres aportantes verificados",()=>{
 assert.equal(threshold,3);
 assert.match(handler,/countVerifiedPositiveYearSuggestionVotes_\(allData, normalizedVehicleId, year, actorColumn\)/);
 assert.match(handler,/voteCount < YEAR_SUGGESTION_VOTE_THRESHOLD_/);
});
test("cuenta actores verificados distintos y respuestas positivas para el mismo vehículo/año",()=>{
 assert.equal(countVotes(positive,"VEH-1",2025,10),3);
});
test("no duplica votos de un actor ni cuenta aportes anónimos o claves de aplicación",()=>{
 const rows=[...positive,positive[0],
  row("VEH-1",2025,"anon:unverified","Sugerencia de ampliar rango al año 2025","La información funciona para el año 2025."),
  row("VEH-1",2025,"applied:user:U4","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.")];
 assert.equal(countVotes(rows,"VEH-1",2025,10),3);
});
test("excluye respuestas negativas y votos de otro vehículo o año",()=>{
 const rows=[...positive,
  row("VEH-1",2025,"user:U4","Reporte de información no funcional","La información no funciona para el año 2025."),
  row("VEH-2",2025,"user:U5","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025."),
  row("VEH-1",2024,"user:U6","Confirmación de funcionamiento para año 2024","La información funciona para el año 2024.")];
 assert.equal(countVotes(rows,"VEH-1",2025,10),3);
});
test("la primera respuesta física de un actor prevalece ante votos contradictorios",()=>{
 const negativeFirst=[
  row("VEH-1",2025,"user:U4","Reporte de información no funcional","La información no funciona para el año 2025."),
  row("VEH-1",2025,"user:U4","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.")
 ];
 assert.equal(countVotes(negativeFirst,"VEH-1",2025,10),0);
 const positiveFirst=[
  row("VEH-1",2025,"user:U5","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025."),
  row("VEH-1",2025,"user:U5","Reporte de información no funcional","La información no funciona para el año 2025.")
 ];
 assert.equal(countVotes(positiveFirst,"VEH-1",2025,10),1);
});
test("dos votos verificados no alcanzan el umbral aunque exista una sugerencia anónima",()=>{
 const rows=[positive[0],positive[1],row("VEH-1",2025,"anon:unverified","Sugerencia de ampliar rango al año 2025","La información funciona para el año 2025.")];
 const count=countVotes(rows,"VEH-1",2025,10);
 assert.equal(count,2);assert.ok(count<threshold);
});
test("la ruta anónima mantiene límite de frecuencia y nunca aplica automáticamente",()=>{
 assert.match(handler,/if \(isAnonymousActor\) enforceFeedbackRateLimit_\("anonymous_year_suggestion", 30, 3600\)/);
 assert.match(handler,/if \(isAnonymousActor\) \{[\s\S]*?no cuenta para modificar automáticamente el catálogo/);
});

test("un voto positivo repetido se reconoce sin depender de una variable fuera de alcance",()=>{
 assert.match(handler,/const hasVerifiedPositiveVote = allData\.some\(/);
 assert.match(handler,/isVerifiedSuggestionActorKey_\(actorKey\)/);
 assert.match(handler,/if \(alreadyReported && !hasVerifiedPositiveVote\)/);
 assert.doesNotMatch(handler,/voteActors\.has\(actorKey\)/);
});

console.log("SuggestYearVoteThreshold: "+passed+"/"+passed+" PASS");
