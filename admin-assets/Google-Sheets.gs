// Clown Club — archivio condiviso cifrato. Incolla in Estensioni > Apps Script.
// 1. Cambia il token sotto (minimo 24 caratteri casuali), esegui setup una volta.
// 2. Distribuisci come web app: esegui come te, accesso Chiunque.
// 3. Inserisci URL /exec e token nell'app. Non condividere il foglio pubblicamente.
function setup() {
  const token = 'SOSTITUISCI-CON-UN-TOKEN-CASUALE-DI-ALMENO-24-CARATTERI';
  if (token.indexOf('SOSTITUISCI') === 0 || token.length < 24) throw new Error('Imposta un token casuale');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('CC_TOKEN', token);
  props.setProperty('CC_SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
  const book = SpreadsheetApp.openById(props.getProperty('CC_SHEET_ID'));
  if (!book.getSheetByName('ClownVault')) book.insertSheet('ClownVault');
}
function reply_(data) {return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function authenticate_(token) {const expected=PropertiesService.getScriptProperties().getProperty('CC_TOKEN');if(!expected||typeof token!=='string'||token!==expected)throw new Error('Token non valido');}
function sheet_() {return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('CC_SHEET_ID')).getSheetByName('ClownVault');}
function snapshot_() {const s=sheet_(),n=s.getLastRow();if(!n)return {ok:true,revision:0,envelope:null};const values=s.getRange(1,1,n,2).getValues();return {ok:true,revision:Number(values[0][1]),envelope:JSON.parse(values.slice(1).map(r=>r[1]).join(''))};}
function doGet(e) {let lock;try {authenticate_(e.parameter.token);lock=LockService.getScriptLock();lock.waitLock(20000);return reply_(snapshot_());}catch(err){return reply_({ok:false,error:String(err.message)});}finally{if(lock&&lock.hasLock())lock.releaseLock();}}
function doPost(e) {let lock;try {const data=JSON.parse(e.postData.contents);authenticate_(data.token);const env=data.envelope;if(!env||env.format!=='clown-v1'||typeof env.cipher!=='string'||typeof env.iv!=='string'||typeof env.salt!=='string')throw new Error('Archivio cifrato non valido');const text=JSON.stringify(env);if(text.length>5000000)throw new Error('Archivio oltre 5 MB');lock=LockService.getScriptLock();lock.waitLock(20000);const current=snapshot_();if(current.revision!==data.expectedRevision)return reply_({ok:false,conflict:true,revision:current.revision});const chunks=[];for(let i=0;i<text.length;i+=40000)chunks.push(['chunk-'+chunks.length,text.slice(i,i+40000)]);const rows=[['revision',current.revision+1]].concat(chunks);const s=sheet_(),old=s.getLastRow();if(s.getMaxRows()<rows.length)s.insertRowsAfter(s.getMaxRows(),rows.length-s.getMaxRows());s.getRange(1,1,rows.length,2).setValues(rows);if(old>rows.length)s.getRange(rows.length+1,1,old-rows.length,2).clearContent();SpreadsheetApp.flush();return reply_({ok:true,revision:current.revision+1});}catch(err){return reply_({ok:false,error:String(err.message)});}finally{if(lock&&lock.hasLock())lock.releaseLock();}}
