(() => {
const $ = id => document.getElementById(id);
const cfg = window.MLD_CONFIG || {};
let token = sessionStorage.getItem('mld_token') || '';
let currentUser = null, analyticsCache = null, lastGeneration = null;
const titles={dashboard:'Dashboard',historico:'Histórico',frecuencias:'Frecuencias',relaciones:'Parejas y ternas',distribuciones:'Distribuciones',generador:'Generador',montecarlo:'Monte Carlo',backtesting:'Backtesting',ml:'ML experimental',seguimiento:'Seguimiento',prospectiva:'Validación prospectiva',experimentos:'Centro de experimentos',administracion:'Administración'};
function toast(msg,error=false){const el=$('toast');el.textContent=msg;el.classList.remove('hidden','error');if(error)el.classList.add('error');setTimeout(()=>el.classList.add('hidden'),5000);}
async function api(action,data={}) {
  if(!cfg.API_URL || cfg.API_URL.includes('PEGA_AQUI')) throw new Error('Configura la URL del Web App en frontend/config.js.');
  const response=await fetch(cfg.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token,...data})});
  const result=await response.json();
  if(!result.success)throw new Error(result.error||'Error de servicio');
  return result;
}
function showLogin(){ $('login').classList.remove('hidden');$('app').classList.add('hidden'); }
function showApp(user,mustChange=false){currentUser=user;$('login').classList.add('hidden');$('app').classList.remove('hidden');$('user-label').textContent=user.name+' · '+user.role;
document.querySelectorAll('[data-admin]').forEach(x=>x.classList.toggle('hidden',user.role!=='ADMIN'));
if(mustChange){setTimeout(async()=>{const oldPassword=prompt('Tu cuenta requiere cambiar la contraseña temporal.\n\nContraseña temporal actual:');if(oldPassword===null){token='';sessionStorage.removeItem('mld_token');showLogin();return;}const newPassword=prompt('Nueva contraseña (mínimo 12 caracteres):');if(newPassword===null){token='';sessionStorage.removeItem('mld_token');showLogin();return;}try{await api('changePassword',{oldPassword,newPassword});toast('Contraseña actualizada.');loadDashboard();}catch(e){toast(e.message,true);token='';sessionStorage.removeItem('mld_token');showLogin();}},150);return;}
loadDashboard();}
async function login(){ $('login-error').textContent='';try{const r=await api('login',{username:$('login-user').value,password:$('login-pass').value});token=r.token;sessionStorage.setItem('mld_token',token);showApp(r.user,!!r.mustChangePassword);}catch(e){$('login-error').textContent=e.message;}}
async function boot(){if(!token){showLogin();return;}try{const r=await api('validateSession');showApp(r.user,!!r.mustChangePassword);}catch(e){token='';sessionStorage.removeItem('mld_token');showLogin();}}
function nav(view){document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));$('view-'+view).classList.remove('hidden');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===view));$('page-title').textContent=titles[view]||view;
if(view==='historico')loadHistory();if(view==='frecuencias')loadAnalytics();if(view==='relaciones')loadRelations();if(view==='distribuciones')loadAnalytics();if(view==='seguimiento')loadFollowups();if(view==='prospectiva')loadProspective();if(view==='experimentos')loadExperiments();if(view==='administracion')loadAdmin();}
function balls(nums,additional){return `<div class="balls">${nums.map(n=>`<span class="ball">${n}</span>`).join('')}${additional?`<span class="ball additional">${additional}</span>`:''}</div>`;}
function bars(el,items,max){$(el).innerHTML=items.map(x=>`<div class="bar-row"><b>${x.number}</b><div class="bar-track"><div class="bar-fill" style="width:${max?x.count/max*100:0}%"></div></div><span>${x.count}</span></div>`).join('');}
async function loadDashboard(){try{const r=await api('dashboard');$('k-total').textContent=r.totalDraws.toLocaleString('es-MX');$('k-cohort').textContent=r.cohortDraws.toLocaleString('es-MX');$('k-latest').textContent=r.latest?.contest||'—';$('k-date').textContent=r.latest?.date||'—';$('k-expected').textContent=Number(r.expectedPerNumber).toFixed(1);bars('dash-top',r.top,Math.max(...r.top.map(x=>x.count)));bars('dash-bottom',r.bottom,Math.max(...r.bottom.map(x=>x.count)));
const recent=await api('draws',{limit:12});$('dash-recent').innerHTML=recent.draws.map(x=>`<tr><td>${x.contest}</td><td>${x.date}</td><td>${balls(x.nums)}</td><td>${x.additional||'—'}</td><td>${x.jackpot?x.jackpot.toLocaleString('es-MX'):'—'}</td></tr>`).join('');}catch(e){toast(e.message,true);}}
async function loadHistory(){try{const r=await api('draws',{from:$('hist-from').value,to:$('hist-to').value,limit:500});$('history-table').innerHTML=r.draws.map(x=>`<tr><td>${x.contest}</td><td>${x.date}</td><td>${balls(x.nums)}</td><td>${x.additional||'—'}</td><td>${x.jackpot?x.jackpot.toLocaleString('es-MX'):'—'}</td></tr>`).join('');}catch(e){toast(e.message,true);}}
async function loadAnalytics(){try{analyticsCache=await api('analytics',{window:Number($('freq-window')?.value||0)});const f=analyticsCache.frequencies.slice().sort((a,b)=>a.number-b.number);$('freq-bars').innerHTML=f.map(x=>`<div class="freq-cell"><b>${x.number}</b><small>${x.count}</small></div>`).join('');$('freq-table').innerHTML=analyticsCache.frequencies.map(x=>`<tr><td>${x.number}</td><td>${x.count}</td><td>${x.expected.toFixed(1)}</td><td>${x.pct.toFixed(2)}%</td><td>${x.z.toFixed(2)}</td></tr>`).join('');const d=analyticsCache.distribution;$('sum-mean').textContent=d.sumMean.toFixed(2);$('sum-median').textContent=d.sumMedian;$('sum-min').textContent=d.sumMin;$('sum-max').textContent=d.sumMax;simpleBars('even-bars',d.evens.map((v,i)=>({label:i+' pares',count:v})));simpleBars('range-bars',Object.entries(d.ranges).map(([label,count])=>({label,count})));}catch(e){toast(e.message,true);}}
function simpleBars(id,items){const max=Math.max(1,...items.map(x=>x.count));$(id).innerHTML=items.map(x=>`<div class="simple-row"><span>${x.label}</span><div class="bar-track"><div class="bar-fill" style="width:${x.count/max*100}%"></div></div><b>${x.count}</b></div>`).join('');}
async function loadRelations(){try{const r=analyticsCache||await api('analytics');analyticsCache=r;const key=$('relation-type').value,items=key==='pairs'?r.topPairs:r.topTriples;$('relations-table').innerHTML=items.map(x=>`<tr><td>${x.group}</td><td>${x.count}</td><td>${x.expected.toFixed(2)}</td><td>${x.ratio.toFixed(2)}×</td></tr>`).join('');}catch(e){toast(e.message,true);}}
async function generate(){try{const r=await api('generate',{quantity:$('gen-quantity').value,strategy:$('gen-strategy').value,window:$('gen-window').value,seed:$('gen-seed').value,maxOverlap:$('gen-overlap').value});lastGeneration=r;$('generated').innerHTML=r.combinations.map((x,i)=>`<div class="combo-card"><div class="combo-head"><span>COMBINACIÓN ${i+1}</span><b>Score ${x.score}</b></div><div class="combo-balls">${x.numbers.map(n=>`<span class="ball">${n}</span>`).join('')}</div><small>Frecuencia ${x.components.frequency} · Paridad ${x.components.parity} · Dispersión ${x.components.spread}</small></div>`).join('')+`<button id="save-gen" class="primary">Guardar generación</button><p class="muted">${r.caveat}</p>`;$('save-gen').onclick=async()=>{try{const s=await api('saveGeneration',{strategy:r.strategy,window:r.window,seed:r.seed,quantity:r.quantity,result:r});toast('Generación guardada. ID: '+s.id);}catch(e){toast(e.message,true);}};}catch(e){toast(e.message,true);}}
async function loadGenerations(){
  try{
    const r=await api('getGenerations',{limit:50});
    $('saved-generations').innerHTML=`<h3>Generaciones guardadas</h3><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Estrategia</th><th>Cantidad</th><th>ID</th><th></th></tr></thead><tbody>${r.items.map((x,i)=>`<tr><td>${x.createdAt}</td><td>${x.username}</td><td>${x.strategy}</td><td>${x.quantity}</td><td>${x.id}</td><td><button data-view-generation="${i}">Ver combinaciones</button> <button data-copy-id="${x.id}">Copiar ID</button></td></tr>`).join('')}</tbody></table></div><div id="saved-generation-detail"></div>`;
    document.querySelectorAll('[data-copy-id]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyId);toast('ID copiado.');}catch(e){toast('No se pudo copiar el ID.',true);}});
    document.querySelectorAll('[data-view-generation]').forEach(b=>b.onclick=()=>{
      const item=r.items[Number(b.dataset.viewGeneration)], saved=item.payload||{}, result=saved.result||saved;
      const combos=result.combinations||[];
      const target=$('saved-generation-detail');
      if(!combos.length){target.innerHTML='<p class="muted">Este registro no contiene combinaciones recuperables.</p>';return;}
      target.innerHTML=`<article class="panel"><h3>Detalle de generación</h3><p class="muted">${item.strategy} · ${item.quantity} combinaciones · Ventana ${saved.window??result.window??'—'} · Semilla ${saved.seed??result.seed??'—'} · ID ${item.id}</p><div class="combination-list">${combos.map((c,i)=>`<div class="combo-card"><div class="combo-head"><span>COMBINACIÓN ${i+1}</span><b>Score ${c.score}</b></div><div class="combo-balls">${c.numbers.map(n=>`<span class="ball">${n}</span>`).join('')}</div></div>`).join('')}</div></article>`;
    });
  }catch(e){toast(e.message,true);}
}
async function simulate(){try{const r=await api('simulate',{count:$('sim-count').value,seed:$('sim-seed').value});const top=r.frequencies.slice().sort((a,b)=>b.count-a.count).slice(0,10);$('simulation-result').innerHTML=`<div class="kpis"><article class="panel"><label>Sorteos simulados</label><strong>${r.count.toLocaleString()}</strong></article><article class="panel"><label>Esperado por número</label><strong>${r.expectedPerNumber.toFixed(2)}</strong></article><article class="panel"><label>Aciertos esperados</label><strong>${r.expectedHits.toFixed(4)}</strong></article><article class="panel"><label>Apariciones observadas / esperadas</label><strong>${r.observedAppearances.toLocaleString()} / ${r.totalAppearances.toLocaleString()}</strong><small>${r.appearanceCheck?'Integridad correcta':'Revisar total de apariciones'}</small></article></div><h3>Mayores conteos simulados</h3><div class="number-bars">${top.map(x=>`<div class="bar-row"><b>${x.number}</b><div class="bar-track"><div class="bar-fill" style="width:${x.count/Math.max(...top.map(y=>y.count))*100}%"></div></div><span>${x.count}</span></div>`).join('')}</div>`;}catch(e){toast(e.message,true);}}
async function backtest(){
  const btn=$('backtest'), oldText=btn.textContent; btn.disabled=true; btn.textContent='Evaluando…';
  $('backtest-result').innerHTML='<div class="notice">Evaluación en proceso. Espera a que el servidor termine; no es necesario presionar el botón otra vez.</div>';
  try {
    const r = await api('backtest', {
      tests: $('bt-tests').value,
      window: $('bt-window').value,
      seed: $('bt-seed').value
    });

    const rows = Array.isArray(r.rows) ? r.rows : [];
    const stats = r.strategyStats || {};
    const names = [
      ['random','Aleatorio uniforme'],
      ['frequency','Frecuencia ponderada'],
      ['balanced','Balanceado'],
      ['hybrid','Híbrido experimental']
    ];
    const fmt = value => Number.isFinite(Number(value)) ? Number(value).toFixed(4) : '—';
    const ciText = ci => {
      if (Array.isArray(ci) && ci.length >= 2) return `${fmt(ci[0])} a ${fmt(ci[1])}`;
      if (ci && Number.isFinite(Number(ci.low)) && Number.isFinite(Number(ci.high))) return `${fmt(ci.low)} a ${fmt(ci.high)}`;
      return 'No disponible';
    };
    const strategyRows = names.map(([key,label]) => {
      const s = stats[key] || {};
      const diff = Number(s.difference);
      const status = key === 'random' ? 'Control' :
        (Number.isFinite(diff) && diff > 0 ? 'Mayor promedio observado' :
        (Number.isFinite(diff) && diff < 0 ? 'Menor promedio observado' : 'Sin diferencia observada'));
      return `<tr><td>${label}</td><td>${fmt(s.mean)}</td><td>${fmt(s.difference)}</td><td>${ciText(s.ci95)}</td><td>${(s.distribution||[]).map((n,i)=>`${i}:${n??0}`).join(' · ')}</td><td>${status}</td></tr>`;
    }).join('');

    const hybrid = stats.hybrid || {};
    const random = stats.random || {};
    const modelMean = Number(hybrid.mean ?? r.modelMean);
    const randomMean = Number(random.mean ?? r.randomMean);
    const meanDifference = Number(hybrid.difference ?? r.meanDifference);
    const hybridCI = ciText(hybrid.ci95 || r.ci95);

    const detailRows = rows.slice(-30).map(x => `
      <tr>
        <td>${x.contest ?? '—'}</td>
        <td>${x.randomHits ?? '—'}</td>
        <td>${x.frequencyHits ?? '—'}</td>
        <td>${x.balancedHits ?? '—'}</td>
        <td>${x.hybridHits ?? x.modelHits ?? '—'}</td>
      </tr>`).join('');

    $('backtest-result').innerHTML = `
      <div class="kpis">
        <article class="panel"><label>Pruebas</label><strong>${Number(r.tests || rows.length).toLocaleString('es-MX')}</strong></article>
        <article class="panel"><label>Media modelo (híbrido)</label><strong>${fmt(modelMean)}</strong></article>
        <article class="panel"><label>Media aleatoria</label><strong>${fmt(randomMean)}</strong></article>
        <article class="panel"><label>Diferencia híbrido vs. aleatorio</label><strong>${fmt(meanDifference)}</strong></article>
      </div>
      <p>IC HAC aproximado 95% de la diferencia híbrida: ${hybridCI}</p>
      <div class="notice">${r.warning || 'Evaluación walk-forward completada.'} Presupuesto de candidatos por familia: ${r.candidateBudget ?? '—'}.</div>
      <h3>Comparación de las cuatro estrategias</h3>
      <div class="tablewrap"><table>
        <thead><tr><th>Estrategia</th><th>Media aciertos</th><th>Diferencia vs. aleatorio</th><th>IC HAC 95% diferencia</th><th>Distribución (aciertos: sorteos)</th><th>Lectura</th></tr></thead>
        <tbody>${strategyRows || '<tr><td colspan="6">El backend no devolvió strategyStats. Publica la versión 2.4.0 del Apps Script.</td></tr>'}</tbody>
      </table></div>
      <h3>Últimos 30 concursos evaluados</h3>
      <div class="tablewrap"><table>
        <thead><tr><th>Concurso</th><th>Aleatorio</th><th>Frecuencia</th><th>Balanceado</th><th>Híbrido</th></tr></thead>
        <tbody>${detailRows}</tbody>
      </table></div>`;
  } catch(e) {
    toast(e.message, true);
  } finally {
    btn.disabled=false; btn.textContent=oldText;
  }
}
async function runValidationLab(){
  const btn=$('validation-run'), target=$('validation-result');
  const old=btn.textContent; btn.disabled=true; btn.textContent='Ejecutando 4 ventanas…';
  const requested=Number($('vl-tests').value)||200;
  target.innerHTML=`<div class="notice">Evaluación en proceso: ${requested.toLocaleString('es-MX')} concursos objetivo por cada ventana de entrenamiento. Se ejecutan cuatro ventanas y se comparan las mismas fechas objetivo. Mantén esta pestaña abierta; no presiones el botón otra vez. La prueba de 1,000 puede tardar varios minutos.</div>`;
  const started=Date.now();
  try{
    const r=await api('validationLab',{tests:$('vl-tests').value,seed:$('vl-seed').value});
    await api('saveExperiment',{kind:'validationLab',config:{testsPerWindow:Number($('vl-tests').value),seed:Number($('vl-seed').value),windows:[100,250,500,1000]},result:r,fingerprint:String(r.id||''),notes:'Validación histórica V2.6.0; resultados exploratorios.'});
    const labels={random:'Aleatorio uniforme',frequency:'Frecuencia ponderada',balanced:'Balanceado',hybrid:'Híbrido'};
    const fmt=v=>Number.isFinite(Number(v))?Number(v).toFixed(4):'—';
    const ci=s=>s&&s.ci95?`${fmt(s.ci95.low)} a ${fmt(s.ci95.high)}`:'—';
    const rows=[];
    (r.results||[]).forEach(w=>{
      Object.keys(labels).forEach(k=>{
        const s=w.strategyStats?.[k]||{};
        const baseline=k==='random';
        const sig=!baseline&&Number(s.pValueHolm)<0.05&&Number(s.ci95?.low)>0;
        const verdict=baseline?'Control':(sig?'Evidencia positiva exploratoria':(Number(s.difference)>0?'Mejor promedio, no concluyente':(Number(s.difference)<0?'Por debajo del control':'Sin diferencia')));
        rows.push(`<tr><td>${w.window}</td><td>${w.trainingFromContest??'—'}–${w.trainingToContest??'—'}</td><td>${w.fromContest??'—'}–${w.toContest??'—'}</td><td>${labels[k]}</td><td>${fmt(s.mean)}</td><td>${baseline?'0.0000':fmt(s.difference)}</td><td>${baseline?'—':ci(s)}</td><td>${baseline?'—':fmt(s.pValueHolm)}</td><td>${baseline?'—':`${s.wins??0} / ${s.ties??0} / ${s.losses??0}`}</td><td>${verdict}</td></tr>`);
      });
    });
    target.innerHTML=`<div class="kpis"><article class="panel"><label>Pruebas por ventana</label><strong>${r.testsPerWindow}</strong></article><article class="panel"><label>Ventanas evaluadas</label><strong>${r.results?.length||0}</strong></article><article class="panel"><label>Duración</label><strong>${((r.elapsedMs||Date.now()-started)/1000).toFixed(1)} s</strong></article><article class="panel"><label>ID del experimento</label><strong style="font-size:.8rem;overflow-wrap:anywhere">${r.id||'—'}</strong></article></div>
      <div class="notice">${r.interpretation||''}<br><small>${r.warning||''}</small></div>
      <h3>Resultados por ventana y estrategia</h3><p class="muted">Diferencia = estrategia menos aleatorio. IC HAC = intervalo de confianza con corrección por dependencia temporal. p Holm = valor p ajustado por comparaciones múltiples. W/T/L = victorias/empates/derrotas frente al control.</p>
      <div class="tablewrap"><table><thead><tr><th>Ventana de entrenamiento</th><th>Rango de entrenamiento</th><th>Rango de prueba</th><th>Estrategia</th><th>Media</th><th>Diferencia</th><th>IC HAC 95%</th><th>p Holm</th><th>W/T/L</th><th>Lectura</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
      <p class="muted">Metodología: ${r.methodology||''}</p>`;
    toast('Laboratorio completado. ID: '+r.id);
  }catch(e){target.innerHTML=`<div class="notice error">No se pudo completar el laboratorio: ${e.message}</div>`;toast(e.message,true);}
  finally{btn.disabled=false;btn.textContent=old;}
}
async function loadValidationHistory(){
  try{
    const r=await api('validationHistory',{limit:20});
    $('validation-history-result').innerHTML=`<h3>Historial de validaciones</h3><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Semilla</th><th>Pruebas/ventana</th><th>Ventanas</th><th>Conclusión</th></tr></thead><tbody>${(r.items||[]).map(x=>`<tr><td>${x.createdAt}</td><td>${x.username}</td><td>${x.seed}</td><td>${x.testsPerWindow}</td><td>${x.windows}</td><td>${x.interpretation||''}</td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){toast(e.message,true);}
}
function portfolioMetrics(combos){
  const exposure=Array(57).fill(0),pairs={};let overlaps=[];
  combos.forEach(c=>{const ns=c.numbers.slice().sort((x,y)=>x-y);ns.forEach(n=>exposure[n]++);for(let i=0;i<ns.length;i++)for(let j=i+1;j<ns.length;j++){const k=ns[i]+'-'+ns[j];pairs[k]=(pairs[k]||0)+1;}});
  for(let i=0;i<combos.length;i++)for(let j=i+1;j<combos.length;j++)overlaps.push(combos[i].numbers.filter(n=>combos[j].numbers.includes(n)).length);
  return {uniqueNumbers:exposure.filter(x=>x>0).length,pairCoverage:Object.keys(pairs).length,maxExposure:Math.max(0,...exposure),maxOverlap:Math.max(0,...overlaps),meanOverlap:overlaps.length?overlaps.reduce((a,b)=>a+b,0)/overlaps.length:0};
}
async function saveProspective(){
  if(!lastGeneration){toast('Primero genera una combinación.',true);return;}
  try{const r=await api('saveProspective',{targetContest:$('pros-contest').value,targetDate:$('pros-date').value,notes:$('pros-notes').value,result:lastGeneration});toast('Generación congelada. ID: '+r.id);loadProspective();}
  catch(e){toast(e.message,true);}
}
async function loadProspective(){
  try{const r=await api('getProspective');$('pros-list').innerHTML=`<table><thead><tr><th>Fecha registro</th><th>Concurso</th><th>Fecha objetivo</th><th>Estrategia</th><th>Combinaciones</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${(r.items||[]).map(x=>`<tr><td>${x.createdAt}</td><td>${x.targetContest}</td><td>${x.targetDate}</td><td>${x.strategy}</td><td>${x.combinations.length}</td><td>${x.status}</td><td><button data-pros-eval="${x.id}" ${x.status==='EVALUATED'?'disabled':''}>Evaluar resultado</button> <button data-pros-view="${x.id}">Ver</button></td></tr>`).join('')}</tbody></table>`;
    document.querySelectorAll('[data-pros-eval]').forEach(b=>b.onclick=async()=>{try{const x=await api('evaluateProspective',{id:b.dataset.prosEval});renderProspectiveEvaluation(x.evaluation);loadProspective();}catch(e){toast(e.message,true);}});
    document.querySelectorAll('[data-pros-view]').forEach(b=>b.onclick=()=>{const x=r.items.find(y=>y.id===b.dataset.prosView);$('pros-detail').innerHTML=`<h3>Registro congelado · ${x.targetContest}</h3><p>Huella: ${x.fingerprint} · Semilla: ${x.seed} · Estado: ${x.status}</p><div class="combination-list">${x.combinations.map(c=>`<div class="combo-card">#${c.index} ${c.numbers.map(n=>`<span class="ball">${n}</span>`).join('')}</div>`).join('')}</div>`;if(x.evaluation)renderProspectiveEvaluation(x.evaluation);});
  }catch(e){toast(e.message,true);}
}
function renderProspectiveEvaluation(e){$('pros-detail').innerHTML=`<article class="panel"><h3>Evaluación del concurso ${e.contest}</h3><div class="kpis"><article class="panel"><label>Combinaciones</label><strong>${e.combinationCount}</strong></article><article class="panel"><label>Promedio de aciertos</label><strong>${e.meanMainHits.toFixed(3)}</strong></article><article class="panel"><label>Máximo de aciertos</label><strong>${e.bestMainHits}</strong></article><article class="panel"><label>Acierto adicional</label><strong>${e.additionalMatches}</strong></article></div><p>Resultado oficial: ${e.officialNumbers.join(', ')} · Adicional: ${e.additional}</p><div class="tablewrap"><table><thead><tr><th>#</th><th>Combinación</th><th>Aciertos principales</th><th>Adicional</th></tr></thead><tbody>${e.results.map(x=>`<tr><td>${x.index}</td><td>${x.numbers.join(', ')}</td><td>${x.mainHits}</td><td>${x.additionalHit?'Sí':'No'}</td></tr>`).join('')}</tbody></table></div></article>`;}
async function saveExperiment(){
  if(!lastGeneration){toast('Primero genera una combinación.',true);return;}
  try{const metrics=portfolioMetrics(lastGeneration.combinations);const config={strategy:lastGeneration.strategy,window:lastGeneration.window,seed:lastGeneration.seed,quantity:lastGeneration.quantity,maxOverlap:lastGeneration.maxOverlap};const r=await api('saveExperiment',{kind:'generation',config,result:{...lastGeneration,portfolioMetrics:metrics},fingerprint:lastGeneration.fingerprint,notes:'Generación guardada desde el frontend V2.6.0'});toast('Experimento guardado: '+r.id);loadExperiments();}
  catch(e){toast(e.message,true);}
}
async function loadExperiments(){
  try{const r=await api('getExperiments');$('exp-list').innerHTML=`<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Versión</th><th>Huella</th><th>Parámetros</th><th>Detalle</th></tr></thead><tbody>${(r.items||[]).map((x,i)=>`<tr><td>${x.createdAt}</td><td>${x.kind}</td><td>${x.version}</td><td>${x.fingerprint}</td><td>${JSON.stringify(x.config||{})}</td><td><button data-exp-view="${i}">Ver métricas</button></td></tr>`).join('')}</tbody></table><div id="exp-detail"></div>`;document.querySelectorAll('[data-exp-view]').forEach(b=>b.onclick=()=>{const x=r.items[Number(b.dataset.expView)],m=x.result?.portfolioMetrics||{};$('exp-detail').innerHTML=`<article class="panel"><h3>Experimento ${x.id}</h3><p>Huella ${x.fingerprint} · ${x.version}</p><p>Números únicos: ${m.uniqueNumbers??'—'} · Parejas cubiertas: ${m.pairCoverage??'—'} · Exposición máxima: ${m.maxExposure??'—'} · Solapamiento máximo: ${m.maxOverlap??'—'} · Solapamiento medio: ${Number(m.meanOverlap||0).toFixed(2)}</p></article>`;});}
  catch(e){toast(e.message,true);}
}

async function runML(){
  const base=$('ml-url').value.trim().replace(/\/$/,'') || String(cfg.ML_API_URL||'').trim().replace(/\/$/,'');
  if(!base){toast('El motor ML es opcional y no está configurado. Los demás módulos funcionan sin él.',true);return;}
  try{
    const r=await fetch(base+'/ml/benchmark',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tests:Number($('ml-tests').value),window:Number($('ml-window').value),seed:Number($('ml-seed').value)})});
    const data=await r.json();if(!r.ok)throw new Error(data.detail||'Error del motor ML');
    $('ml-result').innerHTML=`<div class="kpis"><article class="panel"><label>Pruebas</label><strong>${data.tests}</strong></article><article class="panel"><label>ML Random Forest</label><strong>${data.means.ml_hits.toFixed(4)}</strong></article><article class="panel"><label>Frecuencia</label><strong>${data.means.frequency_hits.toFixed(4)}</strong></article><article class="panel"><label>Aleatorio</label><strong>${data.means.random_hits.toFixed(4)}</strong></article></div><div class="notice">${data.interpretation}</div>`;
  }catch(e){toast('Motor ML: '+e.message,true);}
}
async function changePassword(){
  const oldPassword=prompt('Contraseña actual:');if(oldPassword===null)return;
  const newPassword=prompt('Nueva contraseña (mínimo 12 caracteres):');if(newPassword===null)return;
  try{await api('changePassword',{oldPassword,newPassword});toast('Contraseña actualizada.');}
  catch(e){toast(e.message,true);}
}
async function loadFollowups(){try{const r=await api('getFollowups');$('follow-list').innerHTML=`<table><thead><tr><th>Concurso</th><th>Fecha</th><th>Números</th><th>Mejor acierto</th><th>Notas</th></tr></thead><tbody>${r.items.map(x=>`<tr><td>${x.contest}</td><td>${x.drawDate}</td><td>${x.numbers}</td><td>${x.hits}</td><td>${x.notes}</td></tr>`).join('')}</tbody></table>`;}catch(e){toast(e.message,true);}}
async function saveFollow(){try{const nums=$('follow-numbers').value.split(',').map(x=>Number(x.trim())).filter(Boolean);const r=await api('saveFollowup',{contest:$('follow-contest').value,drawDate:$('follow-date').value,numbers:nums,generationId:$('follow-generation').value,notes:$('follow-notes').value});toast('Seguimiento guardado. Mejor coincidencia: '+r.bestHits);loadFollowups();}catch(e){toast(e.message,true);}}
async function importCsv(){const file=$('csv-file').files[0];if(!file){toast('Selecciona Melate.csv.',true);return;}try{const text=await file.text(),lines=text.trim().split(/\r?\n/),headers=lines[0].split(',').map(x=>x.replace(/^"|"$/g,''));let parsed=0,inserted=0,invalid=0;
for(let i=1;i<lines.length;i+=200){const batch=lines.slice(i,i+200).map(line=>{const vals=line.split(',').map(x=>x.replace(/^"|"$/g,''));const o={};headers.forEach((h,j)=>o[h]=vals[j]);return o;});const r=await api('importDraws',{rows:batch});parsed+=r.received;inserted+=r.inserted;invalid+=r.duplicatesOrInvalid;}
$('import-result').textContent=`Filas recibidas: ${parsed}. Insertadas: ${inserted}. Duplicadas o inválidas: ${invalid}.`;toast('Importación finalizada.');loadDashboard();}catch(e){toast(e.message,true);}}
async function loadAdmin(){if(currentUser?.role!=='ADMIN')return;try{const r=await api('adminUsers');$('users-table').innerHTML=r.users.map(u=>`<tr><td>${u.username}</td><td>${u.name}</td><td>${u.role}</td><td>${u.active?'Activo':'Suspendido'}</td><td><button data-user="${u.username}" data-active="${!u.active}">${u.active?'Suspender':'Activar'}</button> <button data-reset-user="${u.username}">Restablecer contraseña</button></td></tr>`).join('');document.querySelectorAll('[data-user]').forEach(b=>b.onclick=async()=>{try{await api('adminToggleUser',{username:b.dataset.user,active:b.dataset.active==='true'});loadAdmin();}catch(e){toast(e.message,true);}});document.querySelectorAll('[data-reset-user]').forEach(b=>b.onclick=async()=>{const password=prompt('Contraseña temporal (mínimo 12 caracteres):');if(password===null)return;try{await api('adminResetPassword',{username:b.dataset.resetUser,password});toast('Contraseña restablecida. Comparte la temporal por un canal seguro.');}catch(e){toast(e.message,true);}});}catch(e){toast(e.message,true);}}
async function createUser(){try{await api('adminSaveUser',{username:$('new-username').value,name:$('new-name').value,role:$('new-role').value,password:$('new-password').value});toast('Usuario creado. Debe cambiar su contraseña al primer acceso.');loadAdmin();}catch(e){toast(e.message,true);}}
async function loadAudit(){try{const r=await api('audit',{limit:100});$('audit-list').innerHTML=`<table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${r.items.map(x=>`<tr><td>${x.createdAt}</td><td>${x.username}</td><td>${x.action}</td><td>${x.detail}</td></tr>`).join('')}</tbody></table>`;}catch(e){toast(e.message,true);}}
async function exportCsv(kind){try{let rows=[],headers=[];if(kind==='draws'){let offset=0,total=1;headers=['Concurso','Fecha','N1','N2','N3','N4','N5','N6','Adicional','Bolsa'];while(offset<total){const r=await api('draws',{limit:500,offset});total=r.total;rows.push(...r.draws.map(x=>[x.contest,x.date,...x.nums,x.additional||'',x.jackpot||'']));offset+=r.draws.length;if(!r.draws.length)break;}}else{const r=await api('analytics');rows=r.frequencies;headers=['Numero','Apariciones','Esperadas','Porcentaje','Z'];rows=rows.map(x=>[x.number,x.count,x.expected,x.pct,x.z]);}const csv=[headers,...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\\r\\n');const blob=new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=kind==='draws'?'melate_historico.csv':'melate_frecuencias.csv';a.click();URL.revokeObjectURL(a.href);}catch(e){toast(e.message,true);}}
$('login-btn').onclick=login;$('login-pass').addEventListener('keydown',e=>{if(e.key==='Enter')login();});
$('ml-run').onclick=runML;$('change-password').onclick=changePassword;
$('logout').onclick=async()=>{try{await api('logout');}catch(e){}token='';sessionStorage.removeItem('mld_token');showLogin();};
$('nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)nav(b.dataset.view);});
document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>nav(b.dataset.goto));
$('hist-load').onclick=loadHistory;$('freq-window').onchange=loadAnalytics;$('relation-type').onchange=loadRelations;
$('generate').onclick=generate;$('generations-load').onclick=loadGenerations;$('simulate').onclick=simulate;$('backtest').onclick=backtest;$('validation-run').onclick=runValidationLab;$('validation-history').onclick=loadValidationHistory;$('follow-save').onclick=saveFollow;$('pros-save').onclick=saveProspective;$('pros-refresh').onclick=loadProspective;$('exp-save-generation').onclick=saveExperiment;$('exp-refresh').onclick=loadExperiments;
$('csv-import').onclick=importCsv;$('user-create').onclick=createUser;$('users-refresh').onclick=loadAdmin;$('audit-refresh').onclick=loadAudit;
document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportCsv(b.dataset.export));
boot();
if ('serviceWorker' in navigator && location.protocol==='https:') {
  navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('SW:',err));
}
})();