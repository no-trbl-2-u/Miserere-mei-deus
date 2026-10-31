/* Generated plates: every number and name below is read from ATLAS (atlas.json,
   inlined at build). Nothing here restates a library constant. */
const ATLAS=JSON.parse(document.getElementById('atlas-data').textContent);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LANE_VARS=['--muted','--blood','--lapis','--heal','--murex'];
const laneList=ATLAS.lanes.map(l=>({id:l.id,name:l.name}));
if(ATLAS.cards.some(c=>!c.laneId))laneList.push({id:'',name:'No lane'});
const laneVar=id=>LANE_VARS[Math.max(0,laneList.findIndex(l=>l.id===id))%LANE_VARS.length];
const typeIcon={attack:'⚔',skill:'⛨',spell:'✶',global:'⟳',curse:'☠'};
const cards=ATLAS.cards.map(c=>Object.assign({},c,{lane:c.laneId||''}));
const kwTotals={};cards.forEach(c=>c.keywords.forEach(k=>{kwTotals[k]=(kwTotals[k]||0)+1;}));
const kwUsed=Object.keys(kwTotals).sort((a,b)=>kwTotals[b]-kwTotals[a]||a.localeCompare(b));
const typesUsed=[...new Set(cards.map(c=>c.type))];

/* Cards: lane to keyword graph */
const state={lane:null,kw:null,type:null};
let setFilter=()=>{};
const kwNodes=[];
(function(){
 const kwSvg=document.getElementById('d-kw');if(!kwSvg||!kwUsed.length||!laneList.length)return;
 const KH=Math.max(520,kwUsed.length*26+60);kwSvg.setAttribute('viewBox','0 0 1040 '+KH);
 const laneY=i=>laneList.length>1?70+i*((KH-140)/(laneList.length-1)):KH/2;
 const kwY=i=>kwUsed.length>1?36+i*((KH-60)/(kwUsed.length-1)):KH/2;
 const edges=[];const gE=el('g',null,kwSvg),gN=el('g',null,kwSvg);
 laneList.forEach((l,li)=>{kwUsed.forEach((k,ki)=>{const n=cards.filter(c=>c.lane===l.id&&c.keywords.includes(k)).length;if(!n)return;
  const y1=laneY(li),y2=kwY(ki);
  const p=el('path',{d:'M250,'+y1+' C520,'+y1+' 520,'+y2+' 760,'+y2,fill:'none',stroke:'var('+laneVar(l.id)+')','stroke-width':1+n*0.9,'stroke-opacity':.55,class:'kwe'},gE);
  if(!reduce){p.style.strokeDasharray='900';p.style.strokeDashoffset='900';p.animate([{strokeDashoffset:900},{strokeDashoffset:0}],{duration:1200,delay:li*220+ki*25,fill:'forwards',easing:'ease-out'});}
  el('title',null,p,l.name+' x '+k+': '+n+' card'+(n>1?'s':''));edges.push({lid:l.id,p});});});
 laneList.forEach((l,li)=>{const g=el('g',{class:'d-node',tabindex:0},gN);const y=laneY(li);const tot=cards.filter(c=>c.lane===l.id).length;
  el('rect',{class:'box',x:40,y:y-30,width:210,height:60,rx:4,style:'stroke:var('+laneVar(l.id)+');stroke-width:1.8'},g);
  el('text',{x:145,y:y-4,'text-anchor':'middle',class:'ttl'},g,l.name);el('text',{x:145,y:y+15,'text-anchor':'middle',class:'tech'},g,tot+' cards');
  const act=()=>{const on=g.classList.toggle('sel');gN.querySelectorAll('.d-node').forEach(x=>{if(x!==g)x.classList.remove('sel');});
   edges.forEach(e=>e.p.setAttribute('stroke-opacity',!on?.55:(e.lid===l.id?.95:.06)));setFilter({lane:on?l.id:null});};
  g.addEventListener('click',act);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();act();}});});
 kwUsed.forEach((k,ki)=>{const g=el('g',{class:'d-node',tabindex:0},gN);const y=kwY(ki);
  el('rect',{class:'box',x:760,y:y-11,width:170,height:22,rx:3},g);el('text',{x:772,y:y+4,class:'attr'},g,k);el('text',{x:920,y:y+4,'text-anchor':'end',class:'attr'},g,String(kwTotals[k]));
  const act=()=>{setFilter({kw:state.kw===k?null:k});};g.addEventListener('click',act);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();act();}});g.dataset.kw=k;kwNodes.push(g);});
 el('text',{x:145,y:20,'text-anchor':'middle',class:'chart-t'},kwSvg,'LANES');el('text',{x:845,y:16,'text-anchor':'middle',class:'chart-t'},kwSvg,'KEYWORDS · cards');
})();

/* Cards: the ledger filter over the server-rendered articles */
(function(){
 const filt=document.getElementById('filters'),grid=document.getElementById('cardgrid'),count=document.getElementById('count');
 if(!filt||!grid)return;
 const arts=[...grid.querySelectorAll('.card')];
 function chips(){filt.innerHTML='';
  const mk=(label,key,val)=>{const b=document.createElement('button');b.className='chip'+(state[key]===val?' on':'');b.textContent=label;
   b.addEventListener('click',()=>setFilter({[key]:state[key]===val?null:val}));filt.appendChild(b);};
  laneList.forEach(l=>mk(l.name,'lane',l.id));typesUsed.forEach(t=>mk((typeIcon[t]||'·')+' '+t,'type',t));
  if(state.kw){mk('× '+state.kw,'kw',state.kw);}}
 setFilter=function(p){Object.assign(state,p);chips();let n=0;
  arts.forEach(a=>{const ok=(state.lane===null||a.dataset.lane===state.lane)&&(state.kw===null||(' '+a.dataset.kw+' ').includes(' '+state.kw+' '))&&(state.type===null||a.dataset.type===state.type);
   a.hidden=!ok;if(ok)n++;});
  count.textContent=n+' of '+arts.length+' cards'+(state.kw?' print '+state.kw:'');
  kwNodes.forEach(g=>g.classList.toggle('sel',g.dataset.kw===state.kw));};
 const heat=document.getElementById('heat');
 if(heat)heat.addEventListener('click',ev=>{const td=ev.target.closest('[data-kw]');if(!td)return;
  setFilter({kw:td.dataset.kw,lane:td.dataset.lane!==undefined?td.dataset.lane:null});
  filt.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});});
 setFilter({});
})();

/* Relics: relic to signature to lane */
(function(){
 if(!ATLAS.relics.length)return;
 const sigs={};ATLAS.signatures.forEach(s=>{sigs[s.id]=s;});
 const laneName={};ATLAS.lanes.forEach(l=>{laneName[l.id]=l.name;});
 const order=[null].concat(ATLAS.lanes.map(l=>l.id));
 const rel=ATLAS.relics.slice().sort((a,b)=>order.indexOf(a.laneId)-order.indexOf(b.laneId));
 const nodes=[],edges=[];const rowH=58,top=30;const laneRows={};
 const palette={blood:'blood',lapis:'lapis',heal:'heal'};
 rel.forEach((r,i)=>{const y=top+i*rowH;const sg=sigs[r.signatureId];
  const stat=r.statLines.length?r.statLines.join(' · '):'—';
  const first=(r.statLines[0]||'').split(' ')[0];const k2=['body','mind','heart'].includes(first)?first:'gold';
  nodes.push({id:'r'+i,x:20,y,w:270,h:46,kind:'container',k2,title:r.name,small:1,desc:stat,info:esc(stat)+'. Source: '+esc(r.relicSource||'none')+(sg?'. Grants <b>'+esc(sg.name)+'</b> (◆'+sg.cost+').':'.')});
  nodes.push({id:'s'+i,x:400,y,w:290,h:46,kind:'state',k2:'gold',title:sg?sg.name+' ◆'+sg.cost:r.signatureId||'no signature',small:1,desc:sg?(sg.description.length>64?sg.description.slice(0,61)+'...':sg.description):'',info:sg?'<b>'+esc(sg.name)+'</b>, ◆'+sg.cost+' Conviction: '+esc(sg.description):''});
  edges.push({a:'r'+i,b:'s'+i});
  const key=r.laneId||'';(laneRows[key]=laneRows[key]||[]).push(i);});
 Object.keys(laneRows).forEach((lid,li)=>{const idxs=laneRows[lid];const y0=top+idxs[0]*rowH,y1=top+idxs[idxs.length-1]*rowH+46;
  const nm=lid?(laneName[lid]||lid):'No lane';
  nodes.push({id:'l'+li,x:800,y:(y0+y1)/2-32,w:220,h:64,kind:lid?'focus':'ext',title:nm,desc:lid?'opens the lane while worn':'opens no lane',
   info:lid?'While any of these is worn, <code>'+esc(lid)+'</code> joins the reward pool and adds a guaranteed lane slot.':'These relics open no reward lane.'});
  idxs.forEach(i=>edges.push({a:'s'+i,b:'l'+li,k:palette[LANE_VARS[Math.max(0,laneList.findIndex(l=>l.id===lid))%LANE_VARS.length].slice(2)]}));});
 diagram('d-relic',{w:1040,h:top+rel.length*rowH+10,label:'Relics',intro:'s0',nodes,edges},'i-relic');
})();

/* Stats: calculators over formulas */
(function(){
 const F=ATLAS.formulas,RM=F.RESOURCE_MULTIPLIERS;const g=id=>+document.getElementById(id).value;
 const byStat={};F.scaling.forEach(r=>{byStat[r.stat]=r;});
 function upd(){['b','m','h'].forEach(k=>{document.getElementById('o'+k).value=g('s'+k);});
  document.getElementById('vitae').textContent=F.PLAYER_VITAE_BASE+RM.VITAE_PER_BODY*g('sb')+RM.VITAE_PER_MIND*g('sm')+RM.VITAE_PER_HEART*g('sh');
  const row=(fam,stat,lbl)=>{const s=g(stat),r=byStat[s]||{oneShot:'?',repeating:'?'};return '<tr><td>'+fam+'</td><td class="mono">'+lbl+' '+s+'</td><td class="n">'+r.oneShot+'</td><td class="n">'+r.repeating+'</td></tr>';};
  document.getElementById('s3').innerHTML='<tr><th>family</th><th>stat</th><th>one-shot</th><th>repeating</th></tr>'+row('damage to the foe (DEAL)','sb','body')+row('on you (GUARD, HEAL)','sm','mind')+row('on the foe (VULNERABLE, LEECH)','sh','heart');}
 ['sb','sm','sh'].forEach(i=>document.getElementById(i).addEventListener('input',upd));upd();
})();

/* Stats: the XP curve */
(function(){
 const svg=document.getElementById('d-xp'),X=ATLAS.xp;if(!svg||X.length<2)return;
 const W=900,H=300,m={l:72,r:20,t:20,b:40};svg.setAttribute('viewBox','0 0 '+W+' '+H);
 const maxL=X[X.length-1].level,maxV=X[X.length-1].total||1;
 const raw=maxV/4,mag=Math.pow(10,Math.floor(Math.log10(raw)));const step=[1,2,5,10].map(f=>f*mag).find(s=>s>=raw);const top=Math.ceil(maxV/step)*step;
 const x=l=>m.l+(l-1)/(maxL-1)*(W-m.l-m.r),y=v=>H-m.b-v/top*(H-m.t-m.b);
 const gr=el('g',{class:'grid'},svg);const ax=el('g',{class:'ax'},svg);
 for(let v=0;v<=top;v+=step){el('line',{x1:m.l,x2:W-m.r,y1:y(v),y2:y(v)},gr);el('text',{x:m.l-8,y:y(v)+3,'text-anchor':'end'},ax,v.toLocaleString());}
 const lv=[1];for(let l=10;l<maxL;l+=10)lv.push(l);lv.push(maxL);
 lv.forEach(l=>{el('text',{x:x(l),y:H-m.b+16,'text-anchor':'middle'},ax,'L'+l);});
 el('text',{x:m.l,y:H-6,class:'chart-t'},svg,'level');el('text',{x:m.l-60,y:m.t-6,class:'chart-t'},svg,'total XP');
 const pts=X.map(r=>[x(r.level),y(r.total)]);
 el('path',{class:'area',d:'M'+pts.map(p=>p.join(',')).join(' L')+' L'+x(maxL)+','+y(0)+' L'+x(1)+','+y(0)+' z'},svg);
 const c=el('path',{class:'curve',d:'M'+pts.map(p=>p.join(',')).join(' L')},svg);
 if(!reduce){const len=c.getTotalLength();c.style.strokeDasharray=len;c.animate([{strokeDashoffset:len},{strokeDashoffset:0}],{duration:1600,easing:'ease-out'});}
})();

/* World: the region chain, from the map registry */
(function(){
 const R=ATLAS.regions;if(!R.length)return;
 const act=R.filter(r=>r.act1),off=R.filter(r=>!r.act1);
 const nodes=[],edges=[];const per=4,nw=210,nh=100,gx=(1000-per*nw)/(per-1);
 const kinds=r=>Object.keys(r.nodesByKind).sort((a,b)=>r.nodesByKind[b]-r.nodesByKind[a]);
 const info=r=>'<code>'+esc(r.map)+'</code> in <code>'+esc(r.continent)+'</code>: '+r.nodeCount+' nodes. '+kinds(r).map(k=>esc(k)+' '+r.nodesByKind[k]).join(', ')+'.';
 const place=(list,y0,kind)=>list.forEach((r,i)=>{const col=i%per,row=Math.floor(i/per);
  nodes.push({id:r.map,kind,x:20+col*(nw+gx),y:y0+row*(nh+50),w:nw,h:nh,title:r.map,tech:r.nodeCount+' nodes · '+r.continent,desc:kinds(r).slice(0,3).map(k=>k+' '+r.nodesByKind[k]).join(' · '),info:info(r)});});
 place(act,30,'container');
 const actRows=Math.ceil(act.length/per);const offY=30+actRows*(nh+50)+10;
 place(off,offY,'ext');
 for(let i=1;i<act.length;i++)edges.push({a:act[i-1].map,b:act[i].map});
 const offRows=Math.ceil(off.length/per);
 diagram('d-world',{w:1040,h:offY+(off.length?offRows*(nh+50):0)+10,label:'Act 1 route',intro:(act[0]||R[0]).map,nodes,edges},'i-world');
})();

/* World: each questline as a step chain */
(function(){
 ATLAS.questlines.forEach((q,qi)=>{
  if(!q.steps.length)return;
  const per=4,nw=220,nh=110,gx=(1000-per*nw)/(per-1);const nodes=[],edges=[];
  q.steps.forEach((s,i)=>{const col=i%per,row=Math.floor(i/per);
   nodes.push({id:'q'+i,kind:'state',k2:i===q.steps.length-1?'gold':undefined,x:20+col*(nw+gx),y:20+row*(nh+40),w:nw,h:nh,title:'step '+s.step,
    desc:s.objectives.join('; ')+' → '+s.rewards.join(', '),info:'<b>Objectives</b>: '+esc(s.objectives.join('; '))+'. <b>Rewards</b>: '+esc(s.rewards.join(', '))+'.'});
   if(i)edges.push({a:'q'+(i-1),b:'q'+i});});
  diagram('d-quest-'+qi,{w:1040,h:20+Math.ceil(q.steps.length/per)*(nh+40),label:q.name||q.id,intro:'q0',nodes,edges},'i-quest-'+qi);});
})();

/* Contents bar */
(function(){
 const toc=document.getElementById('toc');const secs=[...document.querySelectorAll('section[data-toc]')];
 secs.forEach(s=>{const a=document.createElement('a');a.href='#'+s.id;a.textContent=s.dataset.toc;toc.appendChild(a);});
 const links=[...toc.querySelectorAll('a')];
 const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+e.target.id));}});},{rootMargin:'-40% 0px -55% 0px'});
 secs.forEach(s=>io.observe(s));
})();
