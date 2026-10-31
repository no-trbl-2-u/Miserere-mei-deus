const NS='http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function el(tag,attrs,parent,text){const e=document.createElementNS(NS,tag);if(attrs)for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;if(parent)parent.appendChild(e);return e;}
function wrap(text,max){const words=String(text).split(/\s+/);const lines=[];let cur='';for(const w of words){if((cur+' '+w).trim().length>max&&cur){lines.push(cur);cur=w}else cur=(cur+' '+w).trim()}if(cur)lines.push(cur);return lines;}
function defs(svg){const d=el('defs',null,svg);
  const m=(id,path,cls,w=10,h=10,rx=9,ry=5)=>{const mk=el('marker',{id,viewBox:`0 0 ${w} ${h}`,refX:rx,refY:ry,markerWidth:w*0.9,markerHeight:h*0.9,orient:'auto-start-reverse',markerUnits:'userSpaceOnUse'},d);el('path',{d:path,class:cls},mk);};
  m(svg.id+'-arr','M0,0 L10,5 L0,10 z','mk');
  m(svg.id+'-tri','M0,0 L12,6 L0,12 z','mk-hollow',12,12,11,6);
  m(svg.id+'-dia','M0,6 L7,0 L14,6 L7,12 z','mk',14,12,1,6);
  return d;}
function rectEdge(n,tx,ty){const cx=n.x+n.w/2,cy=n.y+n.h/2,dx=tx-cx,dy=ty-cy;if(!dx&&!dy)return[cx,cy];const sx=Math.abs(dx)/(n.w/2),sy=Math.abs(dy)/(n.h/2);const s=Math.max(sx,sy);return[cx+dx/s,cy+dy/s];}
function diamondEdge(n,tx,ty){const cx=n.x+n.w/2,cy=n.y+n.h/2,dx=tx-cx,dy=ty-cy;const s=Math.abs(dx)/(n.w/2)+Math.abs(dy)/(n.h/2);return[cx+dx/s,cy+dy/s];}

/* Generic box-and-arrow renderer shared by every C4, UML and flow plate. */
function diagram(svgId,spec,inspId){
  const svg=document.getElementById(svgId);svg.setAttribute('viewBox',`0 0 ${spec.w} ${spec.h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',spec.label||svgId);
  defs(svg);const byId={};const gG=el('g',null,svg),gE=el('g',null,svg),gN=el('g',null,svg);
  (spec.groups||[]).forEach(g=>{const gg=el('g',{class:'d-group'},gG);el('rect',{x:g.x,y:g.y,width:g.w,height:g.h,rx:6},gg);el('text',{x:g.x+12,y:g.y+18},gg,g.label);});
  spec.nodes.forEach(n=>{byId[n.id]=n;
    if(n.kind==='class'){const lines=n.attrs||[];n.h=n.h||(34+lines.length*16+10);}
    const g=el('g',{class:'d-node k-'+(n.kind||'container')+(n.k2?' k-'+n.k2:''),tabindex:0,'data-id':n.id},gN);n.g=g;
    if(n.kind==='store'){const r=10;el('path',{class:'box',d:`M${n.x},${n.y+r} a${n.w/2},${r} 0 0 0 ${n.w},0 a${n.w/2},${r} 0 0 0 ${-n.w},0 v${n.h-2*r} a${n.w/2},${r} 0 0 0 ${n.w},0 v${-(n.h-2*r)}`},g);}
    else if(n.kind==='decision'){el('path',{class:'box',d:`M${n.x+n.w/2},${n.y} L${n.x+n.w},${n.y+n.h/2} L${n.x+n.w/2},${n.y+n.h} L${n.x},${n.y+n.h/2} z`},g);}
    else if(n.kind==='start'){el('circle',{cx:n.x+n.w/2,cy:n.y+n.h/2,r:n.w/2,class:'pin'},g);}
    else if(n.kind==='end'){el('circle',{cx:n.x+n.w/2,cy:n.y+n.h/2,r:n.w/2,fill:'none',stroke:'var(--fg)','stroke-width':1.5},g);el('circle',{cx:n.x+n.w/2,cy:n.y+n.h/2,r:n.w/2-4,class:'pin'},g);}
    else el('rect',{class:'box',x:n.x,y:n.y,width:n.w,height:n.h,rx:n.kind==='state'?14:(n.kind==='person'?12:4)},g);
    const cx=n.x+n.w/2;
    if(n.kind==='class'){
      el('text',{x:cx,y:n.y+21,'text-anchor':'middle',class:'ttl'},g,n.title);
      if(n.stereo)el('text',{x:cx,y:n.y+8+0,'text-anchor':'middle',class:'tech',dy:-2},g,'');
      el('line',{x1:n.x,x2:n.x+n.w,y1:n.y+30,y2:n.y+30,class:'sep'},g);
      (n.attrs||[]).forEach((a,i)=>{const t=el('text',{x:n.x+10,y:n.y+48+i*16,class:'attr'},g);const k=a.indexOf('|');const nm=k<0?a:a.slice(0,k),ty=k<0?'':a.slice(k+1);el('tspan',null,t,nm);if(ty)el('tspan',{class:'ty'},t,': '+ty);});
    } else if(n.kind!=='start'&&n.kind!=='end'){
      const parts=[];if(n.kind==='person')parts.push(['tech','◉ person']);
      if(n.title)parts.push(['ttl',n.title]);if(n.tech)parts.push(['tech','['+n.tech+']']);
      const dl=n.desc?wrap(n.desc,Math.max(14,Math.floor(n.w/6.6))):[];dl.forEach(l=>parts.push(['desc',l]));
      const lh={ttl:19,tech:14,desc:15};let total=parts.reduce((s,p)=>s+lh[p[0]],0);let y=n.y+n.h/2-total/2;
      parts.forEach(p=>{y+=lh[p[0]];el('text',{x:cx,y:y-4,'text-anchor':'middle',class:p[0]},g,p[1]);});
    }
    if(n.small){g.querySelectorAll('.ttl').forEach(t=>t.style.fontSize='14px');}
  });
  const edges=[];
  spec.edges.forEach((e,i)=>{const a=byId[e.a],b=byId[e.b];const g=el('g',{class:'d-edge'+(e.solid?' solid':'')+(e.k?' k-'+e.k:'')},gE);let d,mx,my;
    if(e.a===e.b){const x=a.x+a.w*(e.side==='left'?0.15:0.7),y=a.y;d=`M${x},${y} C${x-30},${y-55} ${x+50},${y-55} ${x+22},${y}`;mx=x+10;my=y-44;}
    else{const ac=[a.x+a.w/2,a.y+a.h/2],bc=[b.x+b.w/2,b.y+b.h/2];
      const fa=a.kind==='decision'?diamondEdge:rectEdge,fb=b.kind==='decision'?diamondEdge:rectEdge;
      let bend=e.bend||0;const vx=bc[0]-ac[0],vy=bc[1]-ac[1],L=Math.hypot(vx,vy)||1;const px=-vy/L,py=vx/L;
      const ctrl=[(ac[0]+bc[0])/2+px*bend,(ac[1]+bc[1])/2+py*bend];
      const p1=(e.ax!=null)?[e.ax,e.ay]:fa(a,ctrl[0],ctrl[1]);const p2=(e.bx!=null)?[e.bx,e.by]:fb(b,ctrl[0],ctrl[1]);
      const c=[(p1[0]+p2[0])/2+px*bend,(p1[1]+p2[1])/2+py*bend];
      d=`M${p1[0].toFixed(1)},${p1[1].toFixed(1)} Q${c[0].toFixed(1)},${c[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      mx=0.25*p1[0]+0.5*c[0]+0.25*p2[0];my=0.25*p1[1]+0.5*c[1]+0.25*p2[1];}
    const p=el('path',{class:'ln',d,id:svgId+'-e'+i},g);
    const mt=e.mark||'arr';
    if(mt==='arr')p.setAttribute('marker-end',`url(#${svgId}-arr)`);
    if(mt==='both'){p.setAttribute('marker-end',`url(#${svgId}-arr)`);p.setAttribute('marker-start',`url(#${svgId}-arr)`);}
    if(mt==='tri')p.setAttribute('marker-end',`url(#${svgId}-tri)`);
    if(mt==='dia'){p.setAttribute('marker-start',`url(#${svgId}-dia)`);p.setAttribute('marker-end',`url(#${svgId}-arr)`);}
    if(e.label){const lx=mx+(e.lx||0),ly=my+(e.ly||0);const lines=String(e.label).split('\n');const wmax=Math.max(...lines.map(l=>l.length))*6.4+10;
      el('rect',{class:'lbg',x:lx-wmax/2,y:ly-8-(lines.length-1)*6.5,width:wmax,height:14+(lines.length-1)*13,rx:3},g);
      lines.forEach((l,j)=>el('text',{x:lx,y:ly+3.5-(lines.length-1)*6.5+j*13,'text-anchor':'middle'},g,l));}
    if(!reduce&&!e.solid&&spec.sparks!==false){const s=el('circle',{r:2.6,class:'spark'},g);const am=el('animateMotion',{dur:(2.6+(i%5)*0.35)+'s',repeatCount:'indefinite',begin:(i*0.31%2.5)+'s'},s);el('mpath',{href:'#'+svgId+'-e'+i},am);}
    edges.push({e,g});});
  const insp=inspId&&document.getElementById(inspId);
  function show(n){if(!insp)return;insp.innerHTML='';const t=document.createElement('div');t.className='t';t.textContent=n.title||n.id;insp.appendChild(t);
    if(n.path){const p=document.createElement('div');p.className='p';p.textContent=n.path;insp.appendChild(p);}
    const d=document.createElement('div');d.className='d';d.innerHTML=n.info||n.desc||'';insp.appendChild(d);}
  function light(id){svg.classList.toggle('dim',!!id);spec.nodes.forEach(n=>n.g.classList.toggle('lit',n.id===id));
    edges.forEach(({e,g})=>{const on=id&&(e.a===id||e.b===id);g.classList.toggle('lit',!!on);if(on){byId[e.a].g.classList.add('lit');byId[e.b].g.classList.add('lit');}});}
  let sel=null;
  spec.nodes.forEach(n=>{n.g.addEventListener('mouseenter',()=>light(n.id));n.g.addEventListener('mouseleave',()=>light(sel));
    const pick=()=>{sel=sel===n.id?null:n.id;spec.nodes.forEach(m=>m.g.classList.toggle('sel',m.id===sel));light(sel);show(n);};
    n.g.addEventListener('click',pick);n.g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();pick();}});});
  if(insp){const first=spec.nodes.find(n=>n.id===spec.intro)||spec.nodes.find(n=>n.info);if(first)show(first);}
  const api={svg,byId,edges,spec,
    trace(){if(api._t)return;let i=0;const seq=spec.trace||edges.map((_,k)=>k);svg.classList.add('dim');
      const step=()=>{edges.forEach(x=>x.g.classList.remove('pulse','lit'));spec.nodes.forEach(n=>n.g.classList.remove('pulse','lit'));
        if(i>=seq.length){svg.classList.remove('dim');api._t=null;light(sel);return;}
        const {e,g}=edges[seq[i]];g.classList.add('pulse','lit');byId[e.a].g.classList.add('pulse','lit');byId[e.b].g.classList.add('lit');show(byId[e.b]);i++;api._t=setTimeout(step,reduce?400:900);};
      step();}};
  return api;}
const D={};
document.querySelectorAll('[data-trace]').forEach(b=>b.addEventListener('click',()=>D[b.dataset.trace]&&D[b.dataset.trace].trace()));

