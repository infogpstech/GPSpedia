const LEVEL_PRIORITY=Object.freeze({debug:10,info:20,warn:30,error:40});
const ALLOWED_STAGES=new Set(['recovery','submit','vin-validation','catalog-refresh','image-preview','supplementary']);
const ALLOWED_STATUSES=new Set(['processing','failed','completed','offline','visible','write-confirmed','restored','confirmed']);
const SAFE_ERROR_CODES=new Set(['StorageError','RecoveryError','OperationError','ValidationError','SuggestionError','CatalogRefreshError','QuotaExceededError','FileReadError','FileReadAborted','CatalogVerificationError','NetworkError','TypeError','Error','SecurityError','AbortError','NotAllowedError','InvalidStateError','UnknownError','EmptyFile']);
const SAFE_EVENT=/^[a-z][a-z0-9.-]{0,63}$/;
const SAFE_OPERATION_ID=/^OP-[A-Za-z0-9_-]{1,100}$/;
/** En producción solo warn/error; ?gpDebug=1 habilita debug/info. Lista permitida, nunca objetos/payloads. */
export function createDiagnosticLogger({debugEnabled=false,consoleRef=globalThis.console}={}){
 const minimum=debugEnabled===true?LEVEL_PRIORITY.debug:LEVEL_PRIORITY.warn;
 function emit(level,event,context={}){
  if(LEVEL_PRIORITY[level]<minimum)return false;
  const entry={source:'GPSpedia:add_cortes',level,event:SAFE_EVENT.test(String(event||''))?String(event):'diagnostic.invalid-event'};
  if(context&&typeof context==='object'){
   if(ALLOWED_STAGES.has(context.stage))entry.stage=context.stage;
   if(SAFE_OPERATION_ID.test(String(context.opId||'')))entry.opId=String(context.opId);
   if(ALLOWED_STATUSES.has(context.status))entry.status=context.status;
   if(typeof context.online==='boolean')entry.online=context.online;
   if(Number.isInteger(context.attempt)&&context.attempt>=1&&context.attempt<=20)entry.attempt=context.attempt;
   if(SAFE_ERROR_CODES.has(context.errorCode))entry.errorCode=context.errorCode;
  }
  const target=consoleRef&&(typeof consoleRef[level]==='function'?consoleRef[level]:consoleRef.log);
  if(typeof target==='function')target.call(consoleRef,entry);
  return true;
 }
 return Object.freeze({debug:(e,c)=>emit('debug',e,c),info:(e,c)=>emit('info',e,c),warn:(e,c)=>emit('warn',e,c),error:(e,c)=>emit('error',e,c)});
}
