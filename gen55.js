// gen55.js: randomized, auto-graded exam-level question generators for Math 55 (Rosen 8e).
// Units '55-A' … '55-P'. See GENERATOR_SPEC.md. Every answer is computed in code from random params.
// Each question also carries a `meta` object (ignored by the app) used by verify/test_gen55.js.
(function(){
const G = (globalThis.GEN = globalThis.GEN || {});

// ======================= helpers =======================
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){const t=a%b;a=b;b=t;}return a;};
const lcm=(a,b)=>a/gcd(a,b)*b;
const mod=(a,m)=>((a%m)+m)%m;
const powmod=(b,e,m)=>{let B=BigInt(mod(b,m)),E=BigInt(e),M=BigInt(m),res=1n%M;while(E>0n){if(E&1n)res=res*B%M;B=B*B%M;E>>=1n;}return Number(res);};
const isPrime=n=>{if(n<2)return false;if(n%2===0)return n===2;for(let d=3;d*d<=n;d+=2)if(n%d===0)return false;return true;};
const primesUpTo=n=>{const p=[];for(let i=2;i<=n;i++)if(isPrime(i))p.push(i);return p;};
const C=(n,k)=>{if(k<0||k>n||n<0)return 0;k=Math.min(k,n-k);let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r);};
const CB=(n,k)=>{if(k<0||k>n||n<0)return 0n;let r=1n;for(let i=1;i<=k;i++)r=r*BigInt(n-k+i)/BigInt(i);return r;};
const fact=n=>{let r=1;for(let i=2;i<=n;i++)r*=i;return r;};
const P=(n,k)=>{let r=1;for(let i=0;i<k;i++)r*=(n-i);return r;};
const factorize=n=>{const f=[];for(let p=2;p*p<=n;p++){let e=0;while(n%p===0){n/=p;e++;}if(e)f.push([p,e]);}if(n>1)f.push([n,1]);return f;};
const phi=n=>factorize(n).reduce((a,[p,e])=>a*(p-1)*Math.pow(p,e-1),1);
const divisors=n=>{const d=[];for(let i=1;i<=n;i++)if(n%i===0)d.push(i);return d;};
const range=(a,b)=>{const o=[];for(let i=a;i<=b;i++)o.push(i);return o;};
const sum=a=>a.reduce((s,x)=>s+x,0);
const sn=x=>(x<0?'−'+(-x):''+x);                       // number with real minus sign
const sup=e=>`<sup>${e}</sup>`;
const fmtFact=f=>f.map(([p,e])=>e>1?`${p}${sup(e)}`:`${p}`).join(' · ');
// signed term helpers: lin([[3,'x'],[-2,'y'],[5,'']]) → "3x − 2y + 5"
function lin(terms){let s='';for(const [c,v] of terms){if(c===0)continue;const a=Math.abs(c);const body=(a===1&&v!=='')?v:a+v;if(s==='')s=(c<0?'−':'')+body;else s+=(c<0?' − ':' + ')+body;}return s||'0';}
// exact fractions (BigInt)
const bgcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const t=a%b;a=b;b=t;}return a;};
class Fr{constructor(n,d=1n){n=BigInt(n);d=BigInt(d);if(d===0n)throw new Error('zero denominator');if(d<0n){n=-n;d=-d;}const g=bgcd(n,d)||1n;this.n=n/g;this.d=d/g;}
  add(o){o=fr(o);return new Fr(this.n*o.d+o.n*this.d,this.d*o.d);} sub(o){o=fr(o);return new Fr(this.n*o.d-o.n*this.d,this.d*o.d);}
  mul(o){o=fr(o);return new Fr(this.n*o.n,this.d*o.d);} div(o){o=fr(o);return new Fr(this.n*o.d,this.d*o.n);}
  neg(){return new Fr(-this.n,this.d);} eq(o){o=fr(o);return this.n===o.n&&this.d===o.d;} isZero(){return this.n===0n;}
  cmp(o){o=fr(o);const x=this.n*o.d-o.n*this.d;return x<0n?-1:x>0n?1:0;}
  ans(){return this.d===1n?Number(this.n):`${this.n}/${this.d}`;}
  h(){const s=this.n<0n?'−':'';const a=this.n<0n?-this.n:this.n;return this.d===1n?s+a:`${s}${a}/${this.d}`;}
  val(){return Number(this.n)/Number(this.d);} }
const fr=(x,d)=>x instanceof Fr?x:new Fr(x,d===undefined?1:d);
// build a question
const esc=t=>typeof t==='string'?t.replace(/<(?![a-zA-Z\/!])/g,'&lt;'):t;   // a bare '<' (as in x < y) must not open a tag
function Q(prompt,kind,answer,o){const q=Object.assign({prompt,kind,answer},o||{});q.prompt=esc(q.prompt);q.solution=esc(q.solution);q.hint=esc(q.hint);if(q.choices)q.choices=q.choices.map(esc);return q;}
// mc builder: correct + wrongs (deduped, ≥3 distinct wrongs needed) → {choices, answer}
const norm=s=>String(s).replace(/<[^>]*>/g,'').replace(/\s+/g,'');
function mc(r,correct,wrongs,max){max=max||5;const seen=new Set([norm(correct)]);const ch=[correct];
  for(const w of wrongs){if(w==null)continue;const k=norm(w);if(!seen.has(k)){seen.add(k);ch.push(w);}if(ch.length>=max)break;}
  if(ch.length<4)return null;const idx=r.shuffle(ch.map((_,i)=>i));return {choices:idx.map(i=>ch[i]),answer:idx.indexOf(0),order:idx};}
// retry wrapper: f returns a question or null
const rq=f=>function(r){for(let t=0;t<500;t++){const q=f(r);if(q)return q;}throw new Error('generator failed to find parameters');};
const gen=(id,type,f)=>({id,type,make:rq(f)});
const ul=items=>'<ul>'+items.map(x=>`<li>${x}</li>`).join('')+'</ul>';
const ol=items=>'<ol>'+items.map(x=>`<li>${x}</li>`).join('')+'</ol>';
const mat=(rows)=>'<table class="mat">'+rows.map(r=>'<tr>'+r.map(x=>`<td>${x}</td>`).join('')+'</tr>').join('')+'</table>';
const tbl=(head,rows)=>'<table class="mat"><tr>'+head.map(x=>`<th>${x}</th>`).join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(x=>`<td>${x}</td>`).join('')+'</tr>').join('')+'</table>';

// ---------- propositional logic ----------
const VN=['p','q','r','s'];
const OPS={and:'∧',or:'∨',imp:'→',iff:'↔',xor:'⊕'};
const V=i=>['v',i];
const N=a=>a[0]==='not'?a[1]:['not',a];      // negate, removing a double negation
const NN=a=>['not',a];                        // raw negation
const A_=(a,b)=>['and',a,b],O_=(a,b)=>['or',a,b],I_=(a,b)=>['imp',a,b],E_=(a,b)=>['iff',a,b];
function fev(f,a){switch(f[0]){case 'v':return a[f[1]];case 'not':return !fev(f[1],a);case 'and':return fev(f[1],a)&&fev(f[2],a);
  case 'or':return fev(f[1],a)||fev(f[2],a);case 'imp':return !fev(f[1],a)||fev(f[2],a);case 'iff':return fev(f[1],a)===fev(f[2],a);case 'xor':return fev(f[1],a)!==fev(f[2],a);}throw new Error('bad formula');}
const asg=(i,nv)=>{const a=[];for(let j=0;j<nv;j++)a.push(!!((i>>(nv-1-j))&1));return a;};
function tt(f,nv){let m=0;for(let i=0;i<(1<<nv);i++)if(fev(f,asg(i,nv)))m|=(1<<i);return m;}
function fs(f,top=true){if(f[0]==='v')return VN[f[1]];if(f[0]==='not')return '¬'+fs(f[1],false);const s=fs(f[1],false)+' '+OPS[f[0]]+' '+fs(f[2],false);return top?s:'('+s+')';}
function fvars(f,s){s=s||new Set();if(f[0]==='v')s.add(f[1]);else for(let i=1;i<f.length;i++)fvars(f[i],s);return s;}
function fsize(f){if(f[0]==='v')return 1;let s=1;for(let i=1;i<f.length;i++)s+=fsize(f[i]);return s;}
const TF=b=>b?'T':'F';
function ttHTML(fl,nv,labels){const head=VN.slice(0,nv).concat(labels||fl.map(f=>fs(f)));const rows=[];
  for(let i=(1<<nv)-1;i>=0;i--){const a=asg(i,nv);rows.push(a.map(TF).concat(fl.map(f=>TF(fev(f,a)))));}return tbl(head,rows);}
const litR=(r,i)=>r.bool()?V(i):NN(V(i));
function randF(r,nv,d){if(d<=0||(d===1&&r.float()<0.25))return r.float()<0.7?V(r.int(0,nv-1)):NN(V(r.int(0,nv-1)));
  const op=r.pick(['and','or','imp','iff','imp','or','and','not']);
  if(op==='not'){const c=randF(r,nv,d-1);return c[0]==='not'?c:NN(c);}
  return [op,randF(r,nv,d-1),randF(r,nv,r.int(d>1?1:0,d-1))];}
function counterRow(fl,nv){for(let i=(1<<nv)-1;i>=0;i--){const a=asg(i,nv);if(fl(a))return a;}return null;}
const asgStr=(a)=>a.map((v,j)=>`${VN[j]}=${TF(v)}`).join(', ');

let FOL,BIFF;  // shared internals for second-variant generators
// =========================================================
// 55-A  Logic
// =========================================================
const TA=['Truth tables; tautology / contradiction / contingency','Prove equivalences with logical laws (no truth table)','Translate English ↔ logic: only if, unless, necessary, sufficient','Negate nested quantifiers and push ¬ all the way in','Truth value of quantified statements over a given domain','Valid argument forms, rules of inference chains, spotting fallacies'];
const TAUT_S=[(a,b,c)=>I_(A_(I_(a,b),I_(b,c)),I_(a,c)),(a,b)=>I_(A_(a,I_(a,b)),b),(a,b)=>I_(A_(I_(a,b),N(b)),N(a)),(a,b)=>I_(A_(O_(a,b),N(a)),b),
  (a,b)=>E_(I_(a,b),I_(N(b),N(a))),(a,b)=>E_(NN(A_(a,b)),O_(N(a),N(b))),(a,b,c)=>I_(A_(O_(a,b),O_(N(a),c)),O_(b,c)),(a,b,c)=>E_(I_(a,I_(b,c)),I_(A_(a,b),c))];
const FALL_S=[(a,b)=>I_(A_(b,I_(a,b)),a),(a,b)=>I_(A_(I_(a,b),N(a)),N(b)),(a,b,c)=>I_(A_(I_(a,b),I_(c,b)),I_(a,c)),(a,b)=>E_(I_(a,b),I_(b,a)),
  (a,b)=>E_(NN(A_(a,b)),A_(N(a),N(b))),(a,b)=>I_(O_(a,b),A_(a,b)),(a,b,c)=>E_(I_(I_(a,b),c),I_(a,I_(b,c)))];
const CONTRA_S=[(a,b)=>A_(A_(a,I_(a,b)),N(b)),(a,b)=>A_(O_(a,b),A_(N(a),N(b))),(a,b)=>A_(E_(a,b),E_(a,N(b))),(a,b,c)=>A_(A_(I_(a,b),I_(b,c)),A_(a,N(c))),(a,b)=>NN(I_(A_(a,b),a))];
function subs(r){const v=r.shuffle([0,1,2]);const mk=i=>{const t=r.float();if(t<0.55)return V(v[i]);if(t<0.8)return NN(V(v[i]));return [r.pick(['and','or','imp']),litR(r,v[i]),litR(r,v[(i+1)%3])];};return [mk(0),mk(1),mk(2)];}
function classAnswer(m,nv){const tot=1<<nv;let c=0;for(let i=0;i<tot;i++)if(m>>i&1)c++;return c===tot?0:c===0?1:c===tot-1?2:c===1?3:4;}
const CLASS_CH=['Tautology','Contradiction','Contingency, false in exactly one row','Contingency, true in exactly one row','Contingency, true in at least two rows and false in at least two rows'];
G['55-A']=[
 gen('55-A-classify',TA[0],r=>{const src=r.int(0,3);const [a,b,c]=subs(r);let f;
   if(src===0)f=r.pick(TAUT_S)(a,b,c);else if(src===1)f=r.pick(CONTRA_S)(a,b,c);else if(src===2)f=r.pick(FALL_S)(a,b,c);else f=randF(r,3,3);
   if(fvars(f).size<3&&r.float()<0.7)return null;const nv=3;const m=tt(f,nv);const k=classAnswer(m,nv);
   const idx=r.shuffle([0,1,2,3,4]);
   return Q(`<p>Classify the compound proposition</p><p style="text-align:center"><b>${fs(f)}</b></p><p>(Make a truth table over p, q, r or reason with laws.)</p>`,'mc',idx.indexOf(k),{choices:idx.map(i=>CLASS_CH[i]),
     hint:'Look for a row that makes it false (tautology test) and a row that makes it true (contradiction test); count rows if needed.',
     solution:`<p>Truth table:</p>${ttHTML([f],nv)}<p>It is true in ${[...Array(8).keys()].filter(i=>m>>i&1).length} of 8 rows, so the answer is: <b>${CLASS_CH[k]}</b>.</p>`,meta:{f:fs(f),nv}});}),
 gen('55-A-rowcount',TA[0],r=>{const nv=4;const f=randF(r,nv,3);if(fvars(f).size<4||fsize(f)<9)return null;const m=tt(f,nv);let c=0;for(let i=0;i<16;i++)if(m>>i&1)c++;
   if(c<2||c>14)return null;
   return Q(`<p>In how many of the 16 rows of the truth table (variables p, q, r, s) is the following proposition TRUE?</p><p style="text-align:center"><b>${fs(f)}</b></p>`,'num',c,{
     hint:'Split on the main connective: count rows where it is true, e.g. for A → B count rows with A false or B true.',
     solution:`<p>Main connective: <b>${OPS[f[0]]||'¬'}</b>. Evaluating all 16 rows:</p>${ttHTML([f],nv)}<p>Number of T rows = <b>${c}</b>.</p>`,meta:{f:fs(f),nv}});}),
 ...(()=>{
   // equivalence templates: [name, build(a,b,c) → target, [equivalent forms], [mistaken forms]]
   const EQT=[
    ['implication law / contrapositive',(a,b)=>I_(a,b),(a,b)=>[O_(N(a),b),I_(N(b),N(a))],(a,b)=>[I_(b,a),I_(N(a),N(b)),O_(a,N(b)),A_(N(a),b),O_(N(a),N(b))]],
    ['De Morgan',(a,b)=>NN(A_(a,b)),(a,b)=>[O_(N(a),N(b)),I_(a,N(b))],(a,b)=>[A_(N(a),N(b)),O_(N(a),b),I_(N(a),b),A_(a,N(b))]],
    ['De Morgan',(a,b)=>NN(O_(a,b)),(a,b)=>[A_(N(a),N(b))],(a,b)=>[O_(N(a),N(b)),A_(N(a),b),I_(a,N(b)),NN(A_(a,b))]],
    ['negating an implication',(a,b)=>NN(I_(a,b)),(a,b)=>[A_(a,N(b))],(a,b)=>[I_(N(a),N(b)),A_(N(a),b),I_(a,N(b)),O_(N(a),N(b)),A_(N(a),N(b))]],
    ['biconditional',(a,b)=>E_(a,b),(a,b)=>[A_(I_(a,b),I_(b,a)),O_(A_(a,b),A_(N(a),N(b))),E_(N(a),N(b))],(a,b)=>[A_(I_(a,b),I_(N(b),N(a))),O_(A_(a,b),A_(a,N(b))),E_(a,N(b)),A_(I_(a,b),I_(N(a),b)),O_(A_(a,N(b)),A_(N(a),b))]],
    ['distributive law',(a,b,c)=>A_(a,O_(b,c)),(a,b,c)=>[O_(A_(a,b),A_(a,c))],(a,b,c)=>[O_(A_(a,b),c),A_(O_(a,b),O_(a,c)),O_(a,A_(b,c)),A_(O_(a,b),c)]],
    ['distributive law',(a,b,c)=>O_(a,A_(b,c)),(a,b,c)=>[A_(O_(a,b),O_(a,c))],(a,b,c)=>[A_(O_(a,b),c),O_(A_(a,b),A_(a,c)),A_(a,O_(b,c)),O_(A_(a,b),c)]],
    ['exportation',(a,b,c)=>I_(a,I_(b,c)),(a,b,c)=>[I_(A_(a,b),c),I_(b,I_(a,c))],(a,b,c)=>[I_(I_(a,b),c),I_(O_(a,b),c),A_(I_(a,b),I_(b,c)),I_(A_(a,c),b)]],
    ['implication with a disjunctive hypothesis',(a,b,c)=>I_(O_(a,b),c),(a,b,c)=>[A_(I_(a,c),I_(b,c))],(a,b,c)=>[O_(I_(a,c),I_(b,c)),I_(a,O_(b,c)),I_(A_(a,b),c),A_(I_(c,a),I_(c,b))]],
    ['implication with a conjunctive hypothesis',(a,b,c)=>I_(A_(a,b),c),(a,b,c)=>[O_(I_(a,c),I_(b,c)),I_(a,I_(b,c))],(a,b,c)=>[A_(I_(a,c),I_(b,c)),I_(I_(a,b),c),I_(a,A_(b,c)),O_(I_(c,a),I_(c,b))]],
    ['implication with a conjunctive conclusion',(a,b,c)=>I_(a,A_(b,c)),(a,b,c)=>[A_(I_(a,b),I_(a,c))],(a,b,c)=>[O_(I_(a,b),I_(a,c)),I_(A_(a,b),c),A_(I_(b,a),I_(c,a)),I_(O_(a,b),c)]],
   ];
   function build(r){const t=r.pick(EQT);const v=r.shuffle([0,1,2]);const L=v.map(i=>r.float()<0.3?NN(V(i)):V(i));const [a,b,c]=L;
     const T=t[1](a,b,c);const eq=t[2](a,b,c),bad=t[3](a,b,c);const mT=tt(T,3);
     const good=eq.filter(f=>tt(f,3)===mT);const wrong=bad.filter(f=>tt(f,3)!==mT);
     // extra perturbations: flip one literal in the correct form
     return {t,T,mT,good,wrong};}
   function flipLit(r,f){if(f[0]==='v')return NN(f);if(f[0]==='not'&&f[1][0]==='v')return f[1];const g=f.slice();const i=r.int(1,f.length-1);g[i]=flipLit(r,f[i]);return g;}
   return [
    gen('55-A-equiv-mc',TA[1],r=>{const {t,T,mT,good,wrong}=build(r);if(!good.length)return null;const cor=r.pick(good);
      const extra=[];for(let k=0;k<6;k++){const g=flipLit(r,cor);if(tt(g,3)!==mT)extra.push(g);}
      const ws=r.shuffle(wrong).concat(extra).map(f=>fs(f));const m=mc(r,fs(cor),ws);if(!m)return null;
      return Q(`<p>Which proposition is logically equivalent to</p><p style="text-align:center"><b>${fs(T)}</b> ?</p><p>(Use laws: implication p→q ≡ ¬p∨q, De Morgan, distributive, contrapositive, …)</p>`,'mc',m.answer,{choices:m.choices,
        hint:'Rewrite every → as ¬A ∨ B, push ¬ inward with De Morgan, then compare.',
        solution:`<p>Law used: <b>${t[0]}</b>. ${fs(T)} ≡ <b>${fs(cor)}</b>.</p><p>Check (truth table of the target and the correct choice):</p>${ttHTML([T,cor],3)}<p>Every other choice differs from the target in at least one row (e.g. the converse/inverse or a wrong De Morgan).</p>`,meta:{target:fs(T),nv:3}});}),
    gen('55-A-equiv-tf',TA[1],r=>{const {t,T,mT,good,wrong}=build(r);const want=r.bool();const pool=want?good:wrong;if(!pool.length)return null;const S=r.pick(pool);
      const ans=tt(S,3)===mT;let why='';if(!ans){for(let i=7;i>=0;i--){const a=asg(i,3);if(fev(T,a)!==fev(S,a)){why=`They differ at ${asgStr(a)}: left is ${TF(fev(T,a))}, right is ${TF(fev(S,a))}.`;break;}}}
      return Q(`<p>True or false: </p><p style="text-align:center"><b>${fs(T)}</b> &nbsp;≡&nbsp; <b>${fs(S)}</b></p>`,'tf',ans,{hint:'Try to transform one side into the other with laws; if stuck, hunt for a row where they differ.',
        solution:ans?`<p><b>True.</b> This is the ${t[0]}.</p>${ttHTML([T,S],3)}`:`<p><b>False.</b> ${why} (This is a common mis-application of the ${t[0]}.)</p>${ttHTML([T,S],3)}`,meta:{f1:fs(T),f2:fs(S),nv:3}});}),
   ];})(),
 ...(()=>{
   const ATOMS=[['you get the job','you do not get the job'],['you pass the final','you fail the final'],['the alarm sounds','the alarm does not sound'],['it is snowing','it is not snowing'],
    ['the program compiles','the program does not compile'],['you have a ticket','you do not have a ticket'],['the light is on','the light is off'],['you finish the homework','you do not finish the homework'],
    ['the server is up','the server is down'],['n is prime','n is composite'],['the network is congested','the network is not congested'],['you water the plant','you do not water the plant']];
   // phrase(X,Y) with X,Y English clauses; f(a,b) its meaning
   const PH=[['%A only if %B',(a,b)=>I_(a,b)],['%A if %B',(a,b)=>I_(b,a)],['%A unless %B',(a,b)=>I_(N(b),a)],['%B is necessary for %A',(a,b)=>I_(a,b)],
    ['%B is sufficient for %A',(a,b)=>I_(b,a)],['%A whenever %B',(a,b)=>I_(b,a)],['%B is a necessary condition for %A',(a,b)=>I_(a,b)],['%A is sufficient for %B',(a,b)=>I_(a,b)],
    ['%A follows from %B',(a,b)=>I_(b,a)],['%A is necessary and sufficient for %B',(a,b)=>E_(a,b)]];
   const nameOf=s=>s;
   return [gen('55-A-translate',TA[2],r=>{const [X,Y]=r.sample(ATOMS,2);const na=r.bool()&&r.bool(),nb=r.bool()&&r.bool();
     const ph=r.pick(PH);const sa=na?X[1]:X[0],sb=nb?Y[1]:Y[0];
     const a=na?NN(V(0)):V(0),b=nb?NN(V(1)):V(1);const cor=ph[1](a,b);const mC=tt(cor,2);
     const qt=/necessary|sufficient|follows/.test(ph[0]);const sentence=ph[0].replace('%A',qt?`“${sa}”`:sa).replace('%B',qt?`“${sb}”`:sb);const S=sentence.charAt(0)==='“'?sentence:sentence.charAt(0).toUpperCase()+sentence.slice(1);
     const cands=[];for(const p of PH)cands.push(p[1](a,b));cands.push(A_(a,b),O_(a,b),I_(N(a),N(b)),I_(N(b),N(a)),I_(N(a),b),O_(N(a),N(b)),I_(a,N(b)),E_(a,N(b)));
     const wrongs=r.shuffle(cands.filter(f=>tt(f,2)!==mC)).map(f=>fs(f));
     // render correct possibly in an equivalent shape
     const alt=r.pick([cor,cor,cor[0]==='imp'?O_(N(cor[1]),cor[2]):cor]);const m=mc(r,fs(alt),wrongs);if(!m)return null;
     return Q(`<p>Let p: “${X[0]}” and q: “${Y[0]}”. Translate:</p><p style="text-align:center"><i>${S}.</i></p>`,'mc',m.answer,{choices:m.choices,
       hint:'“A only if B” and “B is necessary for A” are A → B; “A if B”, “B is sufficient for A” are B → A; “A unless B” is ¬B → A.',
       solution:`<p>The pattern “${ph[0].replace('%A','A').replace('%B','B')}” means <b>${fs(ph[1](V(0),V(1))).replace(/p/g,'A').replace(/q/g,'B')}</b>. Here A = ${fs(a)}, B = ${fs(b)}, so the statement is <b>${fs(cor)}</b>${alt!==cor?` ≡ <b>${fs(alt)}</b>`:''}.</p>`,meta:{phrase:ph[0],na,nb}});})];})(),
 ...(()=>{
   // first-order: atoms ['at',name,[vars]]
   const qev=(qs,body,M,D,env)=>{if(!qs.length)return bev(body,M,env);const [q,x]=qs[0];const rest=qs.slice(1);
     if(q==='A'){for(const d of D){if(!qev(rest,body,M,D,Object.assign({},env,{[x]:d})))return false;}return true;}
     for(const d of D){if(qev(rest,body,M,D,Object.assign({},env,{[x]:d})))return true;}return false;};
   const bev=(f,M,env)=>{switch(f[0]){case 'at':return M[f[1]][f[2].map(v=>env[v]).join(',')];case 'not':return !bev(f[1],M,env);case 'and':return bev(f[1],M,env)&&bev(f[2],M,env);
     case 'or':return bev(f[1],M,env)||bev(f[2],M,env);case 'imp':return !bev(f[1],M,env)||bev(f[2],M,env);case 'iff':return bev(f[1],M,env)===bev(f[2],M,env);}};
   const bs=(f,top)=>{if(f[0]==='at')return `${f[1]}(${f[2].join(', ')})`;if(f[0]==='not')return '¬'+bs(f[1],false);const s=bs(f[1],false)+' '+OPS[f[0]]+' '+bs(f[2],false);return top?s:'('+s+')';};
   const qsS=qs=>qs.map(([q,x])=>(q==='A'?'∀':'∃')+x).join(' ');
   const stS=(qs,b)=>`${qsS(qs)} (${bs(b,true)})`;
   const flip=qs=>qs.map(([q,x])=>[q==='A'?'E':'A',x]);
   const neg=f=>{switch(f[0]){case 'at':return ['not',f];case 'not':return f[1];case 'and':return ['or',neg(f[1]),neg(f[2])];case 'or':return ['and',neg(f[1]),neg(f[2])];
     case 'imp':return ['and',f[1],neg(f[2])];case 'iff':return ['iff',f[1],neg(f[2])];}};
   function randModel(r,atoms,D){const M={};for(const [nm,ar] of atoms){M[nm]={};const keys=ar===1?D.map(d=>''+d):D.flatMap(a=>D.map(b=>a+','+b));for(const k of keys)M[nm][k]=r.bool();}return M;}
   function allModels(atoms,D){const keys=[];for(const [nm,ar] of atoms){const ks=ar===1?D.map(d=>''+d):D.flatMap(a=>D.map(b=>a+','+b));for(const k of ks)keys.push([nm,k]);}
     const out=[];for(let m=0;m<(1<<keys.length);m++){const M={};for(const [nm] of atoms)M[nm]={};keys.forEach(([nm,k],j)=>M[nm][k]=!!(m>>j&1));out.push(M);}return out;}
   function sameOnModels(r,atoms,A,B,trials){for(const D of [[0],[0,1]])for(const M of allModels(atoms,D))if(qev(A.qs,A.b,M,D,{})!==qev(B.qs,B.b,M,D,{}))return false;
     for(let t=0;t<trials;t++){const D=[0,1,2];const M=randModel(r,atoms,D);if(qev(A.qs,A.b,M,D,{})!==qev(B.qs,B.b,M,D,{}))return false;}return true;}
   FOL={qev,bs,stS,qsS,flip,neg,sameOnModels};
   return [gen('55-A-negate',TA[3],r=>{const three=r.float()<0.35;const qs=three?[[r.pick(['A','E']),'x'],[r.pick(['A','E']),'y'],[r.pick(['A','E']),'z']]:[[r.pick(['A','E']),'x'],[r.pick(['A','E']),'y']];
     if(qs.every(q=>q[0]===qs[0][0]))return null;
     const vs=qs.map(q=>q[1]);const at1=['at','P',three?[vs[0],vs[1]]:[vs[0],vs[1]]];const at2=r.bool()?['at','Q',[r.pick(vs)]]:['at','Q',three?[vs[1],vs[2]]:[vs[1],vs[0]]];
     const atoms=[['P',2],['Q',at2[2].length]];const L=x=>r.float()<0.3?['not',x]:x;const op=r.pick(['imp','imp','and','or','iff']);const body=[op,L(at1),L(at2)];
     const orig={qs,b:body};const cor={qs:flip(qs),b:neg(body)};
     const a=body[1],b=body[2];const wb={imp:[['imp',a,neg(b)],['imp',neg(a),neg(b)],['and',neg(a),b]],and:[['and',neg(a),neg(b)],['imp',a,b]],or:[['or',neg(a),neg(b)],['and',neg(a),b]],iff:[['iff',neg(a),neg(b)],['and',a,neg(b)]]}[op];
     const cands=wb.map(x=>({qs:flip(qs),b:x})).concat([{qs,b:neg(body)},{qs:[flip(qs)[0]].concat(qs.slice(1)),b:neg(body)},{qs:flip(qs),b:body},{qs:qs.slice(1).concat([qs[0]]).map(([q,x])=>[q==='A'?'E':'A',x]),b:neg(body)}]);
     const negOrig={qs:orig.qs,b:['not',orig.b]};
     const wrongs=cands.filter(c=>!sameOnModels(r,atoms,c,negOrig,40)).map(c=>stS(c.qs,c.b));
     const m=mc(r,stS(cor.qs,cor.b),wrongs);if(!m)return null;
     const choiceAst=m.order.map(i=>i===0?cor:null);
     return Q(`<p>Which statement is equivalent to the negation of</p><p style="text-align:center"><b>${stS(qs,body)}</b></p><p>with ¬ pushed all the way in (¬ appears only directly in front of predicates)?</p>`,'mc',m.answer,{choices:m.choices,
       hint:'¬∀ = ∃¬ and ¬∃ = ∀¬ for EVERY quantifier, in order; then ¬(A→B) ≡ A ∧ ¬B, ¬(A∧B) ≡ ¬A∨¬B, ¬(A∨B) ≡ ¬A∧¬B.',
       solution:`<p>¬${qsS(qs)} (…) ≡ ${qsS(flip(qs))} ¬(…): flip every quantifier, keep the order.</p><p>¬(${bs(body,true)}) ≡ ${bs(neg(body),true)}.</p><p>Answer: <b>${stS(cor.qs,cor.b)}</b>.</p>`,
       meta:{orig,choiceAsts:null,atoms,cands:m.choices,corStr:stS(cor.qs,cor.b),candAst:Object.fromEntries([[stS(cor.qs,cor.b),cor]].concat(cands.map(c=>[stS(c.qs,c.b),c])))}});})];})(),
 ...(()=>{
   const QT=[
    {s:c=>`x + y = ${c}`,js:'x+y===c',cr:r=>r.int(-1,4)},{s:c=>`x · y = ${c}`,js:'x*y===c',cr:r=>r.int(-2,4)},{s:c=>`x < y + ${c}`.replace('+ -','− '),js:'x<y+c',cr:r=>r.int(-2,1)},
    {s:c=>`x² ≤ y + ${c}`,js:'x*x<=y+c',cr:r=>r.int(0,3)},{s:c=>`x · y ≥ ${c}`,js:'x*y>=c',cr:r=>r.int(-1,3)},{s:c=>`${c} | (x + y)`,js:'(x+y)%c===0',cr:r=>r.int(2,4)},
    {s:c=>`x ≠ y → x · y < ${c}`,js:'x===y||x*y<c',cr:r=>r.int(0,4)},{s:c=>`x + y ≤ ${c} ∧ x ≠ y`,js:'x+y<=c&&x!==y',cr:r=>r.int(0,3)},{s:c=>`x² + y² = ${c}`,js:'x*x+y*y===c',cr:r=>r.pick([1,2,4,5,8,10])},
    {s:c=>`x · y = x`,js:'x*y===x',cr:r=>0},{s:c=>`(x − y)² < ${c}`,js:'(x-y)*(x-y)<c',cr:r=>r.int(1,5)}];
   const ORD={AxAy:'∀x ∀y',AxEy:'∀x ∃y',EyAx:'∃y ∀x',ExEy:'∃x ∃y',ExAy:'∃x ∀y',AyEx:'∀y ∃x'};
   const evalOrd=(o,D,f)=>{switch(o){case 'AxAy':return D.every(x=>D.every(y=>f(x,y)));case 'AxEy':return D.every(x=>D.some(y=>f(x,y)));case 'EyAx':return D.some(y=>D.every(x=>f(x,y)));
     case 'ExEy':return D.some(x=>D.some(y=>f(x,y)));case 'ExAy':return D.some(x=>D.every(y=>f(x,y)));case 'AyEx':return D.every(y=>D.some(x=>f(x,y)));}};
   function setup(r){const t=r.pick(QT);const c=t.cr(r);const lo=r.int(-3,1),hi=lo+r.int(3,5);const D=range(lo,hi);const fn=new Function('x','y','c','return '+t.js);const f=(x,y)=>fn(x,y,c);return {t,c,D,f,stmt:t.s(c).replace('+ -','− ')};}
   const witness=(o,D,f)=>{// short justification
     switch(o){case 'AxEy':{const lines=[];for(const x of D){const y=D.find(y=>f(x,y));if(y===undefined)return `x = ${x} has no y, so FALSE.`;lines.push(`x=${x}: y=${y}`);}return 'Witnesses '+lines.join('; ')+'.';}
      case 'AyEx':{const lines=[];for(const y of D){const x=D.find(x=>f(x,y));if(x===undefined)return `y = ${y} has no x, so FALSE.`;lines.push(`y=${y}: x=${x}`);}return 'Witnesses '+lines.join('; ')+'.';}
      case 'EyAx':{const y=D.find(y=>D.every(x=>f(x,y)));if(y!==undefined)return `y = ${y} works for every x.`;return 'Every y fails for some x: '+D.map(y=>`y=${y} fails at x=${D.find(x=>!f(x,y))}`).join('; ')+'.';}
      case 'ExAy':{const x=D.find(x=>D.every(y=>f(x,y)));if(x!==undefined)return `x = ${x} works for every y.`;return 'Every x fails for some y: '+D.map(x=>`x=${x} fails at y=${D.find(y=>!f(x,y))}`).join('; ')+'.';}
      case 'AxAy':{for(const x of D)for(const y of D)if(!f(x,y))return `Counterexample x=${x}, y=${y}.`;return 'Every pair works.';}
      case 'ExEy':{for(const x of D)for(const y of D)if(f(x,y))return `Witness x=${x}, y=${y}.`;return 'No pair works.';}}};
   const Dstr=D=>`{${D.map(sn).join(', ')}}`;
   return [
    gen('55-A-quant-tf',TA[4],r=>{const s=setup(r);const want=r.bool();const o=r.pick(['AxEy','EyAx','AyEx','ExAy','AxEy','EyAx']);const v=evalOrd(o,s.D,s.f);if(v!==want)return null;
      // nontrivial: the swapped order should differ sometimes
      if(evalOrd('AxAy',s.D,s.f)||!evalOrd('ExEy',s.D,s.f))return null;
      return Q(`<p>Domain for x and y: ${Dstr(s.D)}. True or false?</p><p style="text-align:center"><b>${ORD[o]} (${s.stmt})</b></p>`,'tf',v,{hint:'∀x∃y: y may depend on x. ∃y∀x: ONE y must work for every x.',
        solution:`<p>${witness(o,s.D,s.f)} So the statement is <b>${v?'true':'false'}</b>.</p>`,meta:{D:s.D,c:s.c,js:s.t.js,ord:o}});}),
    gen('55-A-quant-multi',TA[4],r=>{const s=setup(r);if(evalOrd('AxAy',s.D,s.f)&&r.float()<0.8)return null;if(!evalOrd('ExEy',s.D,s.f))return null;
      const os=r.shuffle(['AxAy','AxEy','EyAx','ExEy','ExAy','AyEx']).slice(0,5);const vals=os.map(o=>evalOrd(o,s.D,s.f));if(vals.every(v=>v)||vals.every(v=>!v))return null;
      return Q(`<p>Domain for x and y: ${Dstr(s.D)}. Let φ(x, y) be “${s.stmt}”. Select ALL true statements.</p>`,'multi',os.map((o,i)=>vals[i]?i:-1).filter(i=>i>=0),{choices:os.map(o=>`${ORD[o]} φ(x, y)`),
        hint:'Evaluate inside-out; the order of mixed quantifiers matters.',solution:ul(os.map((o,i)=>`${ORD[o]} φ: <b>${vals[i]?'T':'F'}</b>. ${witness(o,s.D,s.f)}`)),meta:{D:s.D,c:s.c,js:s.t.js,ords:os}});}),
   ];})(),
 ...(()=>{
   const ARG=[[(a,b)=>[I_(a,b),a],(a,b)=>b,'modus ponens'],[(a,b)=>[I_(a,b),N(b)],(a,b)=>N(a),'modus tollens'],[(a,b,c)=>[I_(a,b),I_(b,c)],(a,b,c)=>I_(a,c),'hypothetical syllogism'],
    [(a,b)=>[O_(a,b),N(a)],(a,b)=>b,'disjunctive syllogism'],[(a,b,c)=>[O_(a,b),O_(N(a),c)],(a,b,c)=>O_(b,c),'resolution'],[(a,b)=>[I_(a,b),b],(a,b)=>a,'the fallacy of affirming the conclusion'],
    [(a,b)=>[I_(a,b),N(a)],(a,b)=>N(b),'the fallacy of denying the hypothesis'],[(a,b)=>[O_(a,b),a],(a,b)=>N(b),'the “exclusive or” fallacy (∨ is inclusive)'],[(a,b,c)=>[I_(a,b),I_(c,b)],(a,b,c)=>I_(a,c),'an invalid chain (both arrows point at the same proposition)'],
    [(a,b,c)=>[I_(a,b),I_(b,c),N(c)],(a,b,c)=>N(a),'hypothetical syllogism + modus tollens'],[(a,b,c)=>[O_(a,b),I_(a,c),N(c)],(a,b,c)=>b,'modus tollens + disjunctive syllogism'],
    [(a,b,c)=>[I_(a,b),I_(b,c),N(a)],(a,b,c)=>N(c),'denying the hypothesis in a chain (fallacy)'],[(a,b,c)=>[O_(a,b),I_(b,c),c],(a,b,c)=>N(a),'affirming the conclusion + exclusive-or misuse (fallacy)'],
    [(a,b,c)=>[I_(A_(a,b),c),a,N(c)],(a,b,c)=>N(b),'modus tollens + De Morgan + disjunctive syllogism'],[(a,b,c)=>[I_(a,O_(b,c)),a,N(b)],(a,b,c)=>c,'modus ponens + disjunctive syllogism'],
    [(a,b,c)=>[I_(a,O_(b,c)),b],(a,b,c)=>a,'affirming the conclusion (fallacy)'],[(a,b,c)=>[I_(O_(a,b),c),N(a)],(a,b,c)=>N(c),'denying the hypothesis (fallacy)']];
   const valid=(prem,conc,nv)=>{for(let i=0;i<(1<<nv);i++){const a=asg(i,nv);if(prem.every(p=>fev(p,a))&&!fev(conc,a))return a;}return null;};
   return [
    gen('55-A-argument-tf',TA[5],r=>{const t=r.pick(ARG);const v=r.shuffle([0,1,2]);const L=v.map(i=>r.float()<0.35?NN(V(i)):V(i));const prem=t[0](...L),conc=t[1](...L);
      const ce=valid(prem,conc,3);const ok=!ce;
      return Q(`<p>Is the following argument form valid?</p>${ul(prem.map(p=>fs(p)))}<p>∴ ${fs(conc)}</p>`,'tf',ok,{hint:'Valid ⇔ no row makes every premise true and the conclusion false.',
        solution:ok?`<p><b>Valid</b> (${t[2]}): every row that makes all premises true makes ${fs(conc)} true.</p>`:`<p><b>Invalid</b> (${t[2]}). Counterexample row: ${asgStr(ce)}: premises ${prem.map(p=>fs(p)).join(', ')} are all T but the conclusion ${fs(conc)} is F.</p>`,
        meta:{prem:prem.map(p=>fs(p)),conc:fs(conc),nv:3}});}),
    gen('55-A-argument-conclude',TA[5],r=>{const SETS=[(a,b,c,d)=>[I_(a,b),I_(b,c),N(c)],(a,b,c,d)=>[O_(a,b),O_(N(a),c),N(c)],(a,b,c,d)=>[I_(a,b),I_(N(a),c),N(b)],(a,b,c,d)=>[I_(A_(a,b),c),a,N(c)],
       (a,b,c,d)=>[I_(a,O_(b,c)),N(b),a],(a,b,c,d)=>[I_(a,b),I_(c,d),O_(a,c),N(b)],(a,b,c,d)=>[O_(a,b),I_(a,c),I_(b,c)],(a,b,c,d)=>[I_(a,b),I_(b,c),I_(c,d),a]];
      const v=r.shuffle([0,1,2,3]);const L=v.map(i=>r.float()<0.3?NN(V(i)):V(i));const prem=r.pick(SETS)(...L);const nv=4;
      const lits=[];for(let i=0;i<4;i++){lits.push(V(i),NN(V(i)));}
      const cands=[...lits];for(const x of lits)for(const y of lits)if(fvars(x).values().next().value!==fvars(y).values().next().value){cands.push(I_(x,y));}
      const pm=prem.map(p=>tt(p,nv));const isPrem=f=>pm.includes(tt(f,nv));
      const tot=(1<<nv)-1;const val=[],inv=[];
      for(const f of cands){const m=tt(f,nv);if(m===((1<<16)-1)>>>0||m===0xFFFF||isPrem(f))continue;(valid(prem,f,nv)?inv:val).push(f);}
      if(!val.length)return null;const lv=val.filter(f=>f[0]!=='imp');const cor=lv.length?r.pick(lv):r.pick(val);
      const usedV=new Set();prem.forEach(p=>fvars(p,usedV));const m=mc(r,fs(cor),r.shuffle(inv.filter(f=>[...fvars(f)].every(x=>usedV.has(x)))).map(f=>fs(f)));if(!m)return null;
      return Q(`<p>From the premises</p>${ul(prem.map(p=>fs(p)))}<p>which conclusion follows validly?</p>`,'mc',m.answer,{choices:m.choices,hint:'Chain rules of inference (modus ponens/tollens, disjunctive syllogism, resolution); test a candidate by looking for a row with all premises T and it F.',
        solution:`<p><b>${fs(cor)}</b> follows: every assignment making all premises true makes it true. Each other choice has a counterexample row (all premises T, choice F).</p>`,meta:{prem:prem.map(p=>fs(p)),nv}});}),
   ];})(),
 gen('55-A-translate-rev',TA[2],r=>{const AT=[['the bridge is open','the bridge is closed'],['you pass the exam','you fail the exam'],['the sensor detects motion','the sensor detects no motion'],['the file is saved','the file is not saved'],
     ['it is a weekday','it is not a weekday'],['the light turns green','the light does not turn green'],['you buy a ticket','you do not buy a ticket'],['the function is continuous','the function is not continuous'],['the battery is charged','the battery is not charged']];
   const PHR=[['%A only if %B',(a,b)=>I_(a,b)],['%A if %B',(a,b)=>I_(b,a)],['%A unless %B',(a,b)=>I_(N(b),a)],['%B is necessary for %A',(a,b)=>I_(a,b)],['%B is sufficient for %A',(a,b)=>I_(b,a)],['%A whenever %B',(a,b)=>I_(b,a)],['%A is necessary and sufficient for %B',(a,b)=>E_(a,b)]];
   const [X,Y]=r.sample(AT,2);const lit=(v,ng)=>ng?NN(V(v)):V(v);const txt=(v,ng)=>(v===0?X:Y)[ng?1:0];
   const mk=(p,vA,nA,vB,nB)=>{const qt=/necessary|sufficient/.test(p[0]);const s=p[0].replace('%A',qt?`“${txt(vA,nA)}”`:txt(vA,nA)).replace('%B',qt?`“${txt(vB,nB)}”`:txt(vB,nB));return {sen:(qt?s:s.charAt(0).toUpperCase()+s.slice(1))+'.',f:p[1](lit(vA,nA),lit(vB,nB)),phrase:p[0],A:(nA?'¬':'')+'pq'[vA],B:(nB?'¬':'')+'pq'[vB]};};
   const ph=r.pick(PHR);const na=r.float()<0.3,nb=r.float()<0.3;const cor=mk(ph,0,na,1,nb);const mT=tt(cor.f,2);
   const show=r.bool()&&cor.f[0]==='imp'?O_(N(cor.f[1]),cor.f[2]):cor.f;
   const cands=[];for(const p of PHR)for(const [vA,vB] of [[0,1],[1,0]])for(const nA of [false,true])for(const nB of [false,true]){const c=mk(p,vA,nA,vB,nB);if(tt(c.f,2)!==mT)cands.push(c);}
   const seen=new Set([cor.sen]);const picks=[];for(const c of r.shuffle(cands)){if(!seen.has(c.sen)){seen.add(c.sen);picks.push(c);}if(picks.length>=4)break;}
   const m=mc(r,cor.sen,picks.map(c=>c.sen));if(!m)return null;const items=[cor].concat(picks);
   return Q(`<p>Let p: “${X[0]}” and q: “${Y[0]}”. Which English sentence expresses <b>${fs(show)}</b>?</p>`,'mc',m.answer,{choices:m.choices,
     hint:'Translate each sentence back: “A only if B” / “B is necessary for A” = A → B; “A if B” / “B is sufficient for A” / “A whenever B” = B → A; “A unless B” = ¬B → A ≡ A ∨ B.',
     solution:`<p>${fs(show)}${show!==cor.f?` ≡ ${fs(cor.f)}`:''}: <i>${cor.sen}</i> Every other sentence translates to a non-equivalent proposition (typically the converse or a wrongly negated version).</p>`,meta:{target:fs(cor.f),items:m.order.map(i=>({phrase:items[i].phrase,A:items[i].A,B:items[i].B}))}});}),
 gen('55-A-negate-tf',TA[3],r=>{const {qev,bs,stS,qsS,flip,neg,sameOnModels}=FOL;const three=r.float()<0.3;const qs=(three?['x','y','z']:['x','y']).map(v=>[r.pick(['A','E']),v]);if(qs.every(q=>q[0]===qs[0][0]))return null;
   const vs=qs.map(q=>q[1]);const at1=['at','P',[vs[0],vs[1]]];const at2=r.bool()?['at','Q',[r.pick(vs)]]:['at','Q',three?[vs[1],vs[2]]:[vs[1],vs[0]]];const atoms=[['P',2],['Q',at2[2].length]];
   const L=x=>r.float()<0.3?['not',x]:x;const op=r.pick(['imp','imp','and','or']);const body=[op,L(at1),L(at2)];const cor={qs:flip(qs),b:neg(body)};const a=body[1],b=body[2];
   const wb={imp:[['imp',a,neg(b)],['imp',neg(a),neg(b)],['and',neg(a),b]],and:[['and',neg(a),neg(b)],['imp',a,b]],or:[['or',neg(a),neg(b)],['and',neg(a),b]]}[op];
   const negOrig={qs,b:['not',body]};const wrongs=wb.map(x=>({qs:flip(qs),b:x})).concat([{qs,b:neg(body)},{qs:[flip(qs)[0]].concat(qs.slice(1)),b:neg(body)}]).filter(c=>!sameOnModels(r,atoms,c,negOrig,40));
   const want=r.bool();if(!want&&!wrongs.length)return null;const S=want?cor:r.pick(wrongs);
   return Q(`<p>True or false: the statement</p><p style="text-align:center"><b>${stS(S.qs,S.b)}</b></p><p>is logically equivalent to the negation of <b>${stS(qs,body)}</b>.</p>`,'tf',want,{
     hint:'Flip EVERY quantifier (∀ ↔ ∃) keeping the order, and negate the body correctly (¬(A → B) ≡ A ∧ ¬B).',solution:`<p>The correct negation is ${stS(cor.qs,cor.b)}. ${want?'The given statement is exactly this: <b>true</b>.':'The given statement differs (wrong quantifier or wrong body negation) and is not equivalent: <b>false</b>.'}</p>`,meta:{orig:{qs,b:body},atoms,S}});}),
];

// =========================================================
// 55-B  Proofs
// =========================================================
const TB=['Direct proof','Contrapositive proof','Contradiction (√2 irrational, infinitely many primes style)','Proof by cases (parity, mod 3)','If-and-only-if proofs (both directions)','Existence (constructive / non-constructive) & uniqueness; disprove by counterexample; find the flaw'];
const quad=(a,b,c,v)=>lin([[a,v+'²'],[b,v],[c,'']]);
G['55-B']=[
 gen('55-B-direct-parity',TB[0],r=>{const a=r.int(1,5),b=r.int(-6,6),c=r.int(-7,7);const odd=r.bool();
   // n = 2k+1 → a(4k²+4k+1)+b(2k+1)+c ; n=2k → 4ak²+2bk+c
   let A,B,c0;if(odd){A=2*a;B=2*a+b;c0=a+b+c;}else{A=2*a;B=b;c0=c;}const D=mod(c0,2),Cc=(c0-D)/2;
   return Q(`<p>Direct proof: let n be ${odd?'odd, n = 2k + 1':'even, n = 2k'}. Then</p><p style="text-align:center">${quad(a,b,c,'n')} = 2(Ak² + Bk + C) + D</p><p>with integers A, B, C and D ∈ {0, 1}. Enter A, B, C, D (so you can read off whether ${quad(a,b,c,'n')} is even or odd).</p>`,'list',[A,B,Cc,D],{
     hint:'Substitute, expand, collect: the constant term c₀ splits as 2·⌊c₀/2⌋ + (c₀ mod 2).',
     solution:`<p>${odd?`(2k+1)² = 4k² + 4k + 1`:`(2k)² = 4k²`}, so ${quad(a,b,c,'n')} = ${lin([[4*a,'k²'],[odd?4*a+2*b:2*b,'k'],[c0,'']])} = 2(${lin([[A,'k²'],[B,'k'],[Cc,'']])}) + ${D}.</p><p>A = ${A}, B = ${B}, C = ${Cc}, D = ${D}: the expression is always <b>${D?'odd':'even'}</b> when n is ${odd?'odd':'even'}.</p>`,meta:{a,b,c,odd}});}),
 gen('55-B-direct-mod3',TB[3],r=>{const a=r.int(1,4),b=r.int(-5,5),c=r.int(-6,6);const m=3;const rs=[0,1,2].map(s=>mod(a*s*s+b*s+c,m));
   if(new Set(rs).size===1&&r.float()<0.7)return null;
   return Q(`<p>Proof by cases mod 3. For n = 3k, 3k + 1, 3k + 2, compute the remainder of ${quad(a,b,c,'n')} on division by 3 in each case. Enter the three remainders in that order.</p>`,'list',rs,{
     hint:'Write n = 3k + s, expand: everything with a k has a factor 3, so only a·s² + b·s + c matters mod 3.',
     solution:`<p>With n = 3k + s: ${quad(a,b,c,'n')} = 3(…) + (${a}s² ${b<0?'−':'+'} ${Math.abs(b)}s ${c<0?'−':'+'} ${Math.abs(c)}).</p>${ul([0,1,2].map(s=>`s = ${s}: ${a*s*s+b*s+c} ≡ <b>${rs[s]}</b> (mod 3)`))}${new Set(rs).size===1?`<p>So 3 | n-expression − ${rs[0]} for every n.</p>`:''}`,meta:{a,b,c}});}),
 gen('55-B-cases-residues',TB[3],r=>{const m=r.pick([5,7,8,9,10,12,13,16]);const e=r.int(2,4);const b=r.int(0,3);
   const vals=[...new Set(range(0,m-1).map(n=>mod(powmod(n,e,m)+b*n,m)))].sort((x,y)=>x-y);if(vals.length===m)return null;
   const ex=b?`n${sup(e)} + ${b===1?'':b}n`:`n${sup(e)}`;
   return Q(`<p>As n ranges over all integers, which remainders can ${ex} leave on division by ${m}? Enter all possible remainders (order doesn't matter).</p>`,'list',vals,{unordered:true,
     hint:`Proof by cases: n ≡ 0, 1, …, ${m-1} (mod ${m}); the remainder only depends on n mod ${m}.`,
     solution:`<p>Cases n ≡ s (mod ${m}):</p>${tbl(['s'].concat(range(0,m-1)),[[ex].concat(range(0,m-1).map(n=>mod(powmod(n,e,m)+b*n,m)))])}<p>Possible remainders: <b>{${vals.join(', ')}}</b>.</p>`,meta:{m,e,b},});}),
 ...(()=>{
   // statements p → (q) with English literals; q may be a disjunction q1 ∨ q2 (classic De Morgan trap)
   const BANK=[
    c=>({P:[`n² + ${2*c+1} is even`,`n² + ${2*c+1} is odd`],Q:[`n is odd`,`n is even`]}),
    c=>({P:[`${c}n + 1 is odd`,`${c}n + 1 is even`],Q:[`n is even`,`n is odd`]}),
    c=>({P:[`x + y ≥ ${2*c}`,`x + y < ${2*c}`],Q1:[`x ≥ ${c}`,`x < ${c}`],Q2:[`y ≥ ${c}`,`y < ${c}`]}),
    c=>({P:[`m·n is even`,`m·n is odd`],Q1:[`m is even`,`m is odd`],Q2:[`n is even`,`n is odd`]}),
    c=>({P:[`n² ≡ 0 (mod ${c})`,`n² ≢ 0 (mod ${c})`],Q:[`n ≡ 0 (mod ${c})`,`n ≢ 0 (mod ${c})`]}),
    c=>({P:[`x is irrational`,`x is rational`],Q1:[`x + ${c} is irrational`,`x + ${c} is rational`]}),
    c=>({P:[`xy > ${c*c}`,`xy ≤ ${c*c}`],Q1:[`x > ${c}`,`x ≤ ${c}`],Q2:[`y > ${c}`,`y ≤ ${c}`]}),
    c=>({P:[`n³ + ${c} is odd`,`n³ + ${c} is even`],Q:[`n is ${c%2?'even':'odd'}`,`n is ${c%2?'odd':'even'}`]}),
   ];
   return [gen('55-B-contrapositive',TB[1],r=>{const c=r.pick([3,5,7,11]);const s=r.pick(BANK)(c);
     const disj=!!s.Q2;const Qe=s.Q||s.Q1;
     // english renderers
     const p=s.P[0],np=s.P[1];const q=disj?`${s.Q1[0]} or ${s.Q2[0]}`:Qe[0];const nq=disj?`${s.Q1[1]} and ${s.Q2[1]}`:Qe[1];
     const nqWrong=disj?`${s.Q1[1]} or ${s.Q2[1]}`:null;
     const F=disj?{p:'p',np:'¬p',q:'(q ∨ r)',nq:'(¬q ∧ ¬r)',nqW:'(¬q ∨ ¬r)'}:{p:'p',np:'¬p',q:'q',nq:'¬q'};
     const items=[[`If ${nq}, then ${np}.`,`${F.nq} → ${F.np}`],[`If ${q}, then ${p}.`,`${F.q} → ${F.p}`],[`If ${np}, then ${nq}.`,`${F.np} → ${F.nq}`],[`${p.charAt(0).toUpperCase()+p.slice(1)} and ${nq}.`,`${F.p} ∧ ${F.nq}`],
       disj?[`If ${nqWrong}, then ${np}.`,`${F.nqW} → ${F.np}`]:[`If ${nq}, then ${p}.`,`${F.nq} → ${F.p}`]];
     const idx=r.shuffle([0,1,2,3,4]);
     return Q(`<p>To prove “If ${p}, then ${q}” <b>by contraposition</b>, which statement do you prove directly?</p>`,'mc',idx.indexOf(0),{choices:idx.map(i=>items[i][0]),
       hint:'The contrapositive of P → Q is ¬Q → ¬P. Negate carefully: ¬(A or B) is (¬A and ¬B).',
       solution:`<p>Contrapositive of P → Q is ¬Q → ¬P: <b>${items[0][0]}</b></p><p>“If ${q}, then ${p}” is the converse, “If ${np}, then ${nq}” is the inverse (both NOT equivalent), and “${p} and ${nq}” is the negation (what a contradiction proof assumes).${disj?' Negating an “or” gives an “and” (De Morgan).':''}</p>`,
       meta:{forms:idx.map(i=>items[i][1]),orig:`${F.p} → ${F.q}`,nv:disj?3:2}});})];})(),
 gen('55-B-irrational',TB[2],r=>{const items=[];
   const sq=()=>{const k=r.int(2,15);return r.bool()?{t:`√${k*k}`,rat:true}:{t:`√${k*k+r.int(1,2*k)}`,rat:false};};
   const cb=()=>{const k=r.int(2,6);return r.bool()?{t:`∛${k*k*k}`,rat:true}:{t:`∛${k*k*k+r.pick([1,-1])*r.int(1,3*k)}`,rat:false};};
   const lg=()=>{const t=r.pick([2,3,5]);const i=r.int(1,3),j=r.int(1,4);if(i===j)return null;if(r.bool())return {t:`log<sub>${Math.pow(t,i)}</sub> ${Math.pow(t,j)}`,rat:true};const o=r.pick([2,3,5,6,7,10].filter(x=>x!==t&&x%t&&t%x));return {t:`log<sub>${Math.pow(t,i)}</sub> ${Math.pow(o,j)}`,rat:false};};
   const fq=()=>{const a=r.int(2,9),b=r.int(2,9);if(a===b)return null;if(r.bool())return {t:`√(${a*a}/${b*b*1})`.replace(/\((\d+)\/(\d+)\)/,'($1/$2)'),rat:true,skip:gcd(a,b)!==1};return {t:`√(${a*a}/${b*b*2})`,rat:false,skip:gcd(a,2*b)!==1};};
   const sm=()=>{const a=r.int(2,7),b=r.int(2,7);if(r.bool())return {t:`√${a*a} + √${b*b}`,rat:true};const k=r.pick([2,3,5]);return {t:`√${k*a*a} + √${k*b*b}`,rat:false};};
   const makers=[sq,cb,lg,fq,sm];for(const f of r.shuffle(makers)){let it=null;for(let t=0;t<10&&!it;t++){it=f();if(it&&it.skip)it=null;}if(!it)return null;items.push(it);}
   if(items.every(x=>x.rat)||items.every(x=>!x.rat))return null;if(new Set(items.map(x=>x.t)).size<5)return null;
   return Q(`<p>Select ALL numbers that are <b>irrational</b>.</p>`,'multi',items.map((x,i)=>x.rat?-1:i).filter(i=>i>=0),{choices:items.map(x=>x.t),
     hint:'√n is rational only for perfect squares (proof by contradiction, as for √2); log_a b is rational only if a and b are powers of a common base.',
     solution:ul(items.map(x=>`${x.t}: ${x.rat?'rational (it simplifies exactly)':'irrational: assuming it equals a/b in lowest terms leads to a contradiction (a prime appears to an odd power on one side / a power of one prime equals a power of another)'}`)),meta:{items:items.map(x=>x.t.replace(/<sub>(\d+)<\/sub>/,'_$1 '))}});}),
 gen('55-B-euclid-primes',TB[2],r=>{const ps=primesUpTo(23);const k=r.int(3,7);const S=r.sample(ps,k).sort((a,b)=>a-b);const sgn=r.pick([1,1,-1]);
   const prod=S.reduce((a,b)=>a*b,1);const Nn=prod+sgn;if(Nn<10||isPrime(Nn))return null;let sp=2;while(Nn%sp)sp++;
   return Q(`<p>In Euclid's proof that there are infinitely many primes, one forms N = p₁p₂⋯pₖ ${sgn>0?'+':'−'} 1. Take the primes ${S.join(', ')}:</p><p style="text-align:center">N = ${S.join('·')} ${sgn>0?'+':'−'} 1 = ${Nn}.</p><p>N is NOT prime here. What is its smallest prime factor? (The proof only needs that this factor is a NEW prime.)</p>`,'num',sp,{
     hint:'None of the listed primes divides N (each leaves remainder ±1), so trial-divide by the other primes in increasing order.',
     solution:`<p>Each listed prime p leaves remainder ${sgn>0?1:'p − 1'} when dividing N, so the smallest prime factor is a prime not in the list. Trial division: ${Nn} = ${sp} · ${Nn/sp}. Smallest prime factor <b>${sp}</b>.</p>`,meta:{N:Nn,S}});}),
 ...(()=>{
   const IFF=[
    {mk:r=>{const k=r.int(2,60);return {k,s:`For every integer n: ${k} | n² ⟺ ${k} | n`,L:'(n*n)%k===0',R:'n%k===0'};},why:(k,v)=>v?`${k} = ${fmtFact(factorize(k))} is squarefree, so if every prime p | k divides n² then p | n (Euclid's lemma), hence k | n. (⇐) is immediate.`:`${k} = ${fmtFact(factorize(k))} has a squared prime factor; take n = ${factorize(k).reduce((a,[p,e])=>a*Math.pow(p,Math.ceil(e/2)),1)}: then ${k} | n² but ${k} ∤ n.`,truth:k=>factorize(k).every(([p,e])=>e===1)},
    {mk:r=>{const a=r.int(2,12),b=r.int(2,12);return {k:a,k2:b,s:`For every integer n: (${a} | n and ${b} | n) ⟺ ${a*b} | n`,L:`n%${a}===0&&n%${b}===0`,R:`n%${a*b}===0`};},why:(k,v,k2)=>v?`gcd(${k}, ${k2}) = 1, so lcm = product.`:`gcd(${k}, ${k2}) = ${gcd(k,k2)} > 1: n = lcm(${k}, ${k2}) = ${lcm(k,k2)} is divisible by both but not by ${k*k2}.`,truth:(k,k2)=>gcd(k,k2)===1},
    {mk:r=>{const k=r.int(3,40);return {k,s:`For every integer n: n² ≡ 1 (mod ${k}) ⟺ n ≡ ±1 (mod ${k})`,L:'((n*n)%k)===1%k',R:'n%k===1%k||n%k===k-1'};},why:(k,v)=>{if(v)return `Checking residues 0…${k-1}, only n ≡ ±1 square to 1 mod ${k}.`;const n=range(2,k-2).find(n=>(n*n)%k===1);return `n = ${n}: ${n}² = ${n*n} ≡ 1 (mod ${k}) but ${n} ≢ ±1.`;},truth:k=>range(0,k-1).filter(n=>(n*n)%k===1%k).length===(k<=2?1:2)},
    {mk:r=>{const k=r.int(2,40);return {k,s:`For all integers x, y: ${k} | xy ⟺ (${k} | x or ${k} | y)`,L:'(x*y)%k===0',R:'x%k===0||y%k===0',two:true};},why:(k,v)=>v?`${k} is prime, so this is Euclid's lemma (⇒); (⇐) is clear.`:`${k} is composite: ${k} = ${divisors(k)[1]}·${k/divisors(k)[1]}, take x = ${divisors(k)[1]}, y = ${k/divisors(k)[1]}.`,truth:k=>isPrime(k)},
   ];
   BIFF=IFF;
   return [gen('55-B-iff-tf',TB[4],r=>{const t=r.pick(IFF);const o=t.mk(r);const v=t.truth(o.k,o.k2);if(!v&&r.float()<0.35)return null;
     return Q(`<p>True or false?</p><p style="text-align:center"><b>${o.s}</b></p><p>(To prove ⟺ you need BOTH directions; one direction failing makes it false.)</p>`,'tf',v,{hint:'One direction is usually easy; test the other direction on small residues for a counterexample.',
       solution:`<p><b>${v?'True':'False'}</b>. ${t.why(o.k,v,o.k2)}</p>`,meta:{L:o.L,R:o.R,k:o.k,two:!!o.two}});})];})(),
 gen('55-B-counterexample',TB[5],r=>{const a=r.int(-10,10),b=r.pick(primesUpTo(200).filter(p=>p>2));const f=n=>n*n+a*n+b;let n=1;while(isPrime(f(n)))n++;if(n<3)return null;
   return Q(`<p>Claim: “For every positive integer n, ${quad(1,a,b,'n')} is prime.” Disprove it: what is the SMALLEST positive integer n that is a counterexample?</p>`,'num',n,{
     hint:'Evaluate n = 1, 2, 3, … and factor each value; a value ≤ 1 also counts as not prime. A good guess for where to look: n where n divides the constant term.',
     solution:`<p>${range(1,n).map(k=>`n=${k}: ${f(k)}${k<n?' (prime)':' = <b>not prime</b>'+(f(k)>1?` (${fmtFact(factorize(f(k)))})`:'')}`).join('; ')}.</p><p>Smallest counterexample: <b>${n}</b>.</p>`,meta:{a,b}});}),
 gen('55-B-witness',TB[5],r=>{const c=r.int(3,12);const k=r.int(1,3);let n=1,F=1n;const C=BigInt(c);const t=r.pick(['fact','pow']);
   if(t==='fact'){while(true){F*=BigInt(n);if(F>C**BigInt(n))break;n++;}
     return Q(`<p>Constructive existence proof: find the smallest positive integer n with n! > ${c}<sup>n</sup>.</p>`,'num',n,{hint:'Compare the ratio: going from n to n+1 multiplies n! by n+1 and the power by '+c+'.',
       solution:`<p>Once n + 1 > ${c} the factorial gains on ${c}ⁿ each step. Checking successive values, the first n with n! > ${c}ⁿ is <b>${n}</b> (${n}! = ${F} &gt; ${c}<sup>${n}</sup> = ${C**BigInt(n)}).</p>`,meta:{t,c}});}
   const d=r.int(2,4),e=r.int(2,4);n=2;while(!(BigInt(d)**BigInt(n)>BigInt(c)*BigInt(n)**BigInt(e)))n++;
   return Q(`<p>Constructive existence proof: find the smallest integer n ≥ 2 with ${d}<sup>n</sup> > ${c}·n<sup>${e}</sup>.</p>`,'num',n,{hint:'Tabulate both sides; exponentials eventually win but may lose for a long time.',
     solution:`<p>Checking n = 2, 3, …: the first n with ${d}ⁿ > ${c}n${sup(e)} is <b>${n}</b> (${d}<sup>${n}</sup> = ${BigInt(d)**BigInt(n)}, ${c}·${n}<sup>${e}</sup> = ${BigInt(c)*BigInt(n)**BigInt(e)}).</p>`,meta:{t,c,d,e}});}),
 gen('55-B-unique-tf',TB[5],r=>{const m=r.int(6,24),a=r.int(2,m-1),b=r.int(1,m-1);const lo=r.int(0,30),hi=lo+m-1+r.pick([0,0,r.int(1,m)]);
   const sols=range(lo,hi).filter(x=>mod(a*x-b,m)===0);const v=sols.length===1;if(!v&&r.float()<0.4)return null;
   return Q(`<p>True or false: there is a <b>unique</b> integer x with ${lo} ≤ x ≤ ${hi} and ${a}x ≡ ${b} (mod ${m}).</p>`,'tf',v,{hint:'Existence AND uniqueness: find all solutions mod m (depends on gcd(a, m)), then count those in the interval.',
     solution:`<p>gcd(${a}, ${m}) = ${gcd(a,m)}. Solutions in [${lo}, ${hi}]: ${sols.length?sols.join(', '):'none'}. So the statement is <b>${v}</b>.</p>`,meta:{m,a,b,lo,hi}});}),
 ...(()=>{
   // bogus proofs: steps are claims; the flaw is the first claim that is FALSE for the concrete values
   const T1=r=>{const t=r.int(2,9);return {intro:`Let a = b = ${t}.`,vars:{a:t,b:t},steps:[['a = b','a===b','given'],['a² = ab','a*a===a*b','multiply both sides by a'],['a² − b² = ab − b²','a*a-b*b===a*b-b*b','subtract b²'],
     ['(a + b)(a − b) = b(a − b)','(a+b)*(a-b)===b*(a-b)','factor both sides'],['a + b = b','a+b===b','divide both sides by (a − b)'],['2b = b','2*b===b','substitute a = b'],['2 = 1','2===1','divide by b']],concl:'2 = 1'};};
   const T2=r=>{const m=r.int(1,9);let n=r.int(1,9);if(n===m)n++;return {intro:`Let m = ${m}, n = ${n} and s = (m + n)/2.`,vars:{m,n},steps:[['−mn = −mn','-m*n===-m*n','true'],['m² − m(m+n) = n² − n(m+n)','m*m-m*(m+n)===n*n-n*(m+n)','add m² resp. n² and rewrite −mn'],
     ['m² − 2ms + s² = n² − 2ns + s²','m*m-m*(m+n)+((m+n)/2)**2===n*n-n*(m+n)+((m+n)/2)**2','add s² to both sides, using m + n = 2s'],['(m − s)² = (n − s)²','(m-(m+n)/2)**2===(n-(m+n)/2)**2','factor perfect squares'],['m − s = n − s','m-(m+n)/2===n-(m+n)/2','take square roots'],['m = n','m===n','add s']],concl:`${m} = ${n}`};};
   const T3=r=>{const k=r.int(2,9);return {intro:`Let k = ${k}.`,vars:{k},steps:[['−k = (−k)¹','-k===Math.pow(-k,1)','x = x¹'],['(−k)¹ = (−k)<sup>2/2</sup>','Math.pow(-k,1)===Math.pow(-k,2/2)','1 = 2/2'],['(−k)<sup>2/2</sup> = ((−k)²)<sup>1/2</sup>','Math.pow(-k,1)===Math.pow((-k)*(-k),1/2)','(xᵃ)ᵇ = x<sup>ab</sup>'],['((−k)²)<sup>1/2</sup> = (k²)<sup>1/2</sup>','Math.pow((-k)*(-k),1/2)===Math.pow(k*k,1/2)','(−k)² = k²'],['(k²)<sup>1/2</sup> = k','Math.pow(k*k,1/2)===k','√(k²) = k for k > 0']],concl:`−${k} = ${k}`};};
   const T4=r=>{const t=r.int(2,6),u=t+r.int(1,4);return {intro:`Let x = −${t} and y = −${u} (so x > y).`,vars:{x:-t,y:-u},steps:[['x > y','x>y','given'],['x² > y²','x*x>y*y','square both sides'],['x² − y² > 0','x*x-y*y>0','subtract y²'],['(x − y)(x + y) > 0','(x-y)*(x+y)>0','factor'],['x + y > 0','x+y>0','divide by x − y > 0']],concl:'a sum of two negatives is positive'};};
   const T5=r=>{const n=r.int(2,9);let a=r.int(1,9);if(a===n)a++;return {intro:`Let n = ${n} and a = ${a}.`,vars:{n,a},steps:[['(n − a)² = n² − 2na + a²','(n-a)**2===n*n-2*n*a+a*a','expand'],['n² − 2na + a² = (a − n)²','n*n-2*n*a+a*a===(a-n)**2','expand (a − n)²'],['(n − a)² = (a − n)²','(n-a)**2===(a-n)**2','combine'],['n − a = a − n','n-a===a-n','take square roots of both sides'],['2n = 2a','2*n===2*a','add n + a'],['n = a','n===a','divide by 2']],concl:`${n} = ${a}`};};
   const T6=r=>{const c=r.int(2,7);const t=-r.int(1,5);return {intro:`Let t = ${sn(t)} and c = ${c}.`,vars:{t,c},steps:[['c < c + 1','c<c+1','true'],['ct < (c + 1)t','c*t<(c+1)*t','multiply both sides by t'],['0 < t','0<t','subtract ct'],['0 < t²','0<t*t','multiply by t'],['0 < t³','0<t*t*t','multiply by t again']],concl:'t³ > 0'};};
   return [gen('55-B-bogus-step',TB[5],r=>{const tp=r.pick([T1,T2,T3,T4,T5,T6])(r);const vs=tp.vars;const fn=e=>new Function(...Object.keys(vs),'return '+e)(...Object.values(vs));
     const bad=tp.steps.findIndex(s=>!fn(s[1]));if(bad<1)return null;
     const choices=tp.steps.slice(1).map((s,i)=>`Step ${i+2}: ${s[0]} (${s[2]})`);let opts=choices.map((c,i)=>i+1);
     if(opts.length>5){const keep=new Set([bad]);for(const i of r.shuffle(opts))if(keep.size<5)keep.add(i);opts=[...keep].sort((a,b)=>a-b);}
     const idx=r.shuffle(opts);
     return Q(`<p>Find the flaw. ${tp.intro} “Proof” that ${tp.concl}:</p>${ol(tp.steps.map(s=>`${s[0]} &nbsp;<i>(${s[2]})</i>`))}<p>Which step is the FIRST invalid one?</p>`,'mc',idx.indexOf(bad),{choices:idx.map(i=>`Step ${i+1}: ${tp.steps[i][0]} (${tp.steps[i][2]})`),
       hint:'Plug in the actual numbers: every valid step keeps a true statement true. Watch for dividing by 0, square roots (x² = y² ⇏ x = y), and multiplying an inequality by a negative.',
       solution:`<p>Evaluate each claim with ${Object.entries(vs).map(([k,v])=>`${k} = ${sn(v)}`).join(', ')}: steps 1–${bad} are true, step ${bad+1} (“${tp.steps[bad][0]}”) is false. The justification “${tp.steps[bad][2]}” is the error${/divide/.test(tp.steps[bad][2])&&tp.intro.includes('a = b')?' (a − b = 0)':''}.</p>`,
       meta:{vars:vs,steps:tp.steps.map(s=>s[1]),choiceStep:idx}});})];})(),
 gen('55-B-direct-mod',TB[0],r=>{const m=r.int(4,13),rr=r.int(1,m-1),e=r.int(2,4),a=r.int(-6,6),b=r.int(-9,9);const v=mod(powmod(rr,e,m)+a*rr+b,m);
   return Q(`<p>Direct proof. Suppose n ≡ ${rr} (mod ${m}). Then n${sup(e)} ${a<0?'−':'+'} ${Math.abs(a)}n ${b<0?'−':'+'} ${Math.abs(b)} ≡ r (mod ${m}) with 0 ≤ r < ${m}. Find r.</p>`,'num',v,{hint:'Write n = '+m+'k + '+rr+'; congruences respect + and ×, so substitute '+rr+' for n and reduce.',
     solution:`<p>n ≡ ${rr} ⇒ n${sup(e)} ≡ ${rr}${sup(e)} = ${Math.pow(rr,e)} ≡ ${powmod(rr,e,m)}; ${a}n ≡ ${a*rr}; total ${powmod(rr,e,m)} + ${a*rr} + ${b} = ${powmod(rr,e,m)+a*rr+b} ≡ <b>${v}</b> (mod ${m}).</p>`,meta:{m,rr,e,a,b}});}),
 gen('55-B-contra-tf',TB[1],r=>{const c=r.pick([3,4,5,7]);const B2=[
    {P:[`n² is odd`,`n² is even`],Q:{op:null,p:[[`n is odd`,`n is even`]]}},{P:[`${c} | n²`,`${c} ∤ n²`],Q:{op:null,p:[[`${c} | n`,`${c} ∤ n`]]}},
    {P:[`x + y > ${2*c}`,`x + y ≤ ${2*c}`],Q:{op:'or',p:[[`x > ${c}`,`x ≤ ${c}`],[`y > ${c}`,`y ≤ ${c}`]]}},{P:[`ab is odd`,`ab is even`],Q:{op:'and',p:[[`a is odd`,`a is even`],[`b is odd`,`b is even`]]}},
    {P:[`xy ≠ 0`,`xy = 0`],Q:{op:'and',p:[[`x ≠ 0`,`x = 0`],[`y ≠ 0`,`y = 0`]]}},{P:[`m + n ≥ ${2*c+1}`,`m + n ≤ ${2*c}`],Q:{op:'or',p:[[`m ≥ ${c+1}`,`m ≤ ${c}`],[`n ≥ ${c+1}`,`n ≤ ${c}`]]}}];
   const s=r.pick(B2);const Qo=s.Q;const two=!!Qo.op;const jn=Qo.op==='or'?' or ':' and ',jnN=Qo.op==='or'?' and ':' or ';const sym=Qo.op==='or'?'∨':'∧',symN=Qo.op==='or'?'∧':'∨';
   const q=two?Qo.p[0][0]+jn+Qo.p[1][0]:Qo.p[0][0];const nq=two?Qo.p[0][1]+jnN+Qo.p[1][1]:Qo.p[0][1];const nqW=two?Qo.p[0][1]+jn+Qo.p[1][1]:null;
   const opQ=Qo.op==='or'?'or':'and',opN=Qo.op==='or'?'and':'or';const pV=V(0),Qf=two?[opQ,V(1),V(2)]:V(1),nQ=two?[opN,NN(V(1)),NN(V(2))]:NN(V(1)),nQW=two?[opQ,NN(V(1)),NN(V(2))]:null;
   const items=[[`If ${nq}, then ${s.P[1]}.`,I_(nQ,NN(pV))],[`If ${q}, then ${s.P[0]}.`,I_(Qf,pV)],[`If ${s.P[1]}, then ${nq}.`,I_(NN(pV),nQ)]];if(two)items.push([`If ${nqW}, then ${s.P[1]}.`,I_(nQW,NN(pV))]);
   items.push([`If ${nq}, then ${s.P[0]}.`,I_(nQ,pV)]);
   const k=r.float()<0.4?0:r.int(1,items.length-1);const origF=I_(pV,Qf);const orig=fs(origF);const nv=two?3:2;const v=tt(items[k][1],nv)===tt(origF,nv);items[k][1]=fs(items[k][1]);
   return Q(`<p>Original statement: “If ${s.P[0]}, then ${q}.” True or false: the statement “${items[k][0]}” is logically equivalent to the original (so proving it would prove the original)?</p>`,'tf',v,{
     hint:'Only the contrapositive ¬Q → ¬P is equivalent to P → Q. Converse and inverse are not. Negating “A or B” gives “not A and not B”.',
     solution:`<p>With p = “${s.P[0]}”${two?`, q, r the two parts of the conclusion`:', q = the conclusion'}: original ${orig}; given statement ${items[k][1]}. ${v?'This is the contrapositive: <b>true</b>.':'This is '+(k===1?'the converse':k===2?'the inverse':'not the contrapositive (check the negation of the compound conclusion)')+': <b>false</b>.'}</p>`,meta:{orig,form:items[k][1],nv}});}),
 gen('55-B-iff-direction',TB[4],r=>{const t=r.pick(BIFF);const o=t.mk(r);let fwd=true,back=true;
   if(o.two){const fl=new Function('x','y','k','return '+o.L),frr=new Function('x','y','k','return '+o.R);for(let x=0;x<2*o.k;x++)for(let y=0;y<2*o.k;y++){const l=fl(x,y,o.k),rr2=frr(x,y,o.k);if(l&&!rr2)fwd=false;if(rr2&&!l)back=false;}}
   else{const fl=new Function('n','k','return '+o.L),frr=new Function('n','k','return '+o.R);const K=o.k*(o.k2||1);for(let n=0;n<4*K+4;n++){const l=fl(n,o.k),rr2=frr(n,o.k);if(l&&!rr2)fwd=false;if(rr2&&!l)back=false;}}
   const CH=['Both directions hold (the ⟺ is true)','Only ⇒ holds','Only ⇐ holds','Neither direction holds'];const k=fwd&&back?0:fwd?1:back?2:3;if(k===0&&r.float()<0.5)return null;const idx=r.shuffle([0,1,2,3]);
   return Q(`<p>Consider</p><p style="text-align:center"><b>${o.s}</b></p><p>Which directions are true?</p>`,'mc',idx.indexOf(k),{choices:idx.map(i=>CH[i]),hint:'Check ⇒ and ⇐ separately: prove each or find a counterexample (small residues).',
     solution:`<p>⇒ is ${fwd?'true':'false'}, ⇐ is ${back?'true':'false'}: <b>${CH[k]}</b>. ${t.why(o.k,fwd&&back,o.k2)}</p>`,meta:{L:o.L,R:o.R,k:o.k,two:!!o.two}});}),
];

// =========================================================
// 55-C  Sets, functions, cardinality
// =========================================================
const TC=['Set identities by element-chasing or membership tables','Sizes of power sets and Cartesian products','Prove injective / surjective / bijective; inverses and compositions','Floor/ceiling facts','Countability: explicit listing/bijection, countable unions','Uncountability by diagonalization; comparing cardinalities'];
const SN=['A','B','C'];
// set expression renderer from propositional AST: and(x,not y) → x − y
function ss(f,top=true){if(f[0]==='v')return SN[f[1]];if(f[0]==='not'){const c=f[1];return (c[0]==='v'?SN[c[1]]:'('+ss(c,true)+')')+'ᶜ';}
  let s;if(f[0]==='and'&&f[2][0]==='not')s=ss(f[1],false)+' − '+ss(f[2][1],false);else s=ss(f[1],false)+' '+{and:'∩',or:'∪',xor:'⊕'}[f[0]]+' '+ss(f[2],false);return top?s:'('+s+')';}
const D_=(a,b)=>A_(a,NN(b)),X_=(a,b)=>['xor',a,b];
const fmtSet=a=>a.length?`{${a.join(', ')}}`:'∅';
G['55-C']=[
 ...(()=>{const T=[
   ['A − (B ∪ C)',(a,b,c)=>D_(a,O_(b,c)),(a,b,c)=>[A_(D_(a,b),D_(a,c)),A_(a,A_(NN(b),NN(c)))],(a,b,c)=>[O_(D_(a,b),D_(a,c)),O_(D_(a,b),c),D_(D_(a,b),NN(c)),D_(O_(a,b),c)]],
   ['A − (B ∩ C)',(a,b,c)=>D_(a,A_(b,c)),(a,b,c)=>[O_(D_(a,b),D_(a,c))],(a,b,c)=>[A_(D_(a,b),D_(a,c)),A_(D_(a,b),c),D_(D_(a,b),c),O_(D_(a,b),c)]],
   ['(A ∪ B)ᶜ',(a,b)=>NN(O_(a,b)),(a,b)=>[A_(NN(a),NN(b)),D_(NN(a),b)],(a,b)=>[O_(NN(a),NN(b)),D_(NN(a),NN(b)),NN(A_(a,b)),O_(D_(a,b),NN(b))]],
   ['A ∩ (B ∪ C)',(a,b,c)=>A_(a,O_(b,c)),(a,b,c)=>[O_(A_(a,b),A_(a,c))],(a,b,c)=>[O_(A_(a,b),c),A_(O_(a,b),O_(a,c)),O_(a,A_(b,c)),A_(O_(a,b),c)]],
   ['(A − B) − C',(a,b,c)=>D_(D_(a,b),c),(a,b,c)=>[D_(a,O_(b,c)),D_(D_(a,c),b)],(a,b,c)=>[D_(a,D_(b,c)),D_(a,A_(b,c)),O_(D_(a,b),D_(a,c)),D_(D_(a,b),NN(c))]],
   ['A ⊕ B',(a,b)=>X_(a,b),(a,b)=>[O_(D_(a,b),D_(b,a)),D_(O_(a,b),A_(a,b))],(a,b)=>[D_(O_(a,b),b),O_(D_(a,b),b),A_(O_(a,b),O_(NN(a),b)),D_(a,b)]],
   ['A − (A − B)',(a,b)=>D_(a,D_(a,b)),(a,b)=>[A_(a,b)],(a,b)=>[b,D_(a,b),O_(a,b),D_(b,a)]],
   ['(A ∪ B) − C',(a,b,c)=>D_(O_(a,b),c),(a,b,c)=>[O_(D_(a,c),D_(b,c))],(a,b,c)=>[O_(a,D_(b,c)),A_(D_(a,c),D_(b,c)),D_(O_(a,b),A_(a,c)),O_(D_(a,c),b)]],
   ['A ∪ (B − A)',(a,b)=>O_(a,D_(b,a)),(a,b)=>[O_(a,b)],(a,b)=>[b,D_(O_(a,b),a),X_(a,b),A_(a,b)]],
   ['(A ∩ B) ∪ (A − B)',(a,b)=>O_(A_(a,b),D_(a,b)),(a,b)=>[a],(a,b)=>[A_(a,b),O_(a,b),b,X_(a,b)]],
   ['(A − C) ∩ (B − C)',(a,b,c)=>A_(D_(a,c),D_(b,c)),(a,b,c)=>[D_(A_(a,b),c)],(a,b,c)=>[A_(a,D_(b,c)),D_(O_(a,b),c),O_(D_(a,c),D_(b,c)),D_(A_(a,b),NN(c))]],
  ];
  function pick(r){const t=r.pick(T);const v=r.shuffle([0,1,2]);const L=v.map(i=>V(i));const T0=t[1](...L);const m=tt(T0,3);return {t,T0,m,good:t[2](...L).filter(f=>tt(f,3)===m),bad:t[3](...L).filter(f=>tt(f,3)!==m)};}
  return [
   gen('55-C-setid-mc',TC[0],r=>{const {t,T0,m,good,bad}=pick(r);if(!good.length)return null;const cor=r.pick(good);const mm=mc(r,ss(cor),r.shuffle(bad).map(f=>ss(f)));if(!mm)return null;
     const rows=[];for(let i=7;i>=0;i--){const a=asg(i,3);rows.push(a.map(x=>x?1:0).concat([fev(T0,a)?1:0,fev(cor,a)?1:0]));}
     return Q(`<p>Which set is equal to <b>${ss(T0)}</b> for ALL sets A, B, C (in a universe U; ᶜ = complement)?</p>`,'mc',mm.answer,{choices:mm.choices,
       hint:'Element-chase: x ∈ A − B means x ∈ A ∧ x ∉ B; or build a membership table with 8 rows.',
       solution:`<p>Membership table (1 = element belongs):</p>${tbl(['A','B','C',ss(T0),ss(cor)],rows)}<p>The columns agree in all 8 rows, so ${ss(T0)} = <b>${ss(cor)}</b>. Each other choice differs in some row (e.g. union vs intersection after De Morgan).</p>`,meta:{target:ss(T0)}});}),
   gen('55-C-setid-count',TC[0],r=>{const n=r.int(12,16);const U=range(1,n);const mk=()=>U.filter(()=>r.float()<0.45);const S=[mk(),mk(),mk()];
     const f=randF(r,3,3);if(fvars(f).size<3||fsize(f)<6||f[0]==='imp'||JSON.stringify(f).includes('imp')||JSON.stringify(f).includes('iff'))return null;
     const res=U.filter(x=>fev(f,S.map(s=>s.includes(x))));if(res.length===0||res.length===n)return null;
     return Q(`<p>Universe U = {1, 2, …, ${n}}. Let</p>${ul(S.map((s,i)=>`${SN[i]} = ${fmtSet(s)}`))}<p>Find |${ss(f)}|. (ᶜ = complement in U.)</p>`,'num',res.length,{
       hint:'Work from the inside out; for complements list U minus the set.',solution:`<p>${ss(f)} = ${fmtSet(res)}, so the size is <b>${res.length}</b>.</p>`,meta:{n,S,expr:ss(f)}});}),
 ];})(),
 gen('55-C-powerset',TC[1],r=>{const t=r.int(0,5);const pool=r.shuffle(['a','b','c','d','e','f','g','h']);
   if(t===0){const a=r.int(2,4),b=r.int(2,3);const A=range(1,a),B=pool.slice(0,b);const ans=Math.pow(2,a*b);
     return Q(`<p>A = ${fmtSet(A)}, B = ${fmtSet(B)}. Find |𝒫(A × B)|.</p>`,'num',ans,{hint:'|A × B| = |A|·|B| and |𝒫(S)| = 2^|S|.',solution:`<p>|A × B| = ${a}·${b} = ${a*b}, so |𝒫(A × B)| = 2<sup>${a*b}</sup> = <b>${ans}</b>.</p>`,meta:{t,a,b}});}
   if(t===1){const a=r.int(2,5),b=r.int(2,5);const ans=Math.pow(2,a+b);
     return Q(`<p>|A| = ${a} and |B| = ${b}. Find |𝒫(A) × 𝒫(B)|.</p>`,'num',ans,{hint:'Cartesian product of the two power sets.',solution:`<p>2<sup>${a}</sup> · 2<sup>${b}</sup> = <b>${ans}</b>.</p>`,meta:{t,a,b}});}
   if(t===2){const U=range(1,9);const A=U.filter(()=>r.float()<0.55),B=U.filter(()=>r.float()<0.55);const I=A.filter(x=>B.includes(x));if(A.length<3||B.length<3)return null;const op=r.pick(['∩','∪−']);
     if(op==='∩'){const ans=Math.pow(2,I.length);return Q(`<p>A = ${fmtSet(A)}, B = ${fmtSet(B)}. Find |𝒫(A) ∩ 𝒫(B)|.</p>`,'num',ans,{hint:'X ⊆ A and X ⊆ B ⇔ X ⊆ A ∩ B.',solution:`<p>𝒫(A) ∩ 𝒫(B) = 𝒫(A ∩ B), A ∩ B = ${fmtSet(I)}, so 2<sup>${I.length}</sup> = <b>${ans}</b>.</p>`,meta:{t,A,B,op}});}
     const Uu=[...new Set(A.concat(B))];const ans=Math.pow(2,Uu.length)-Math.pow(2,A.length);
     return Q(`<p>A = ${fmtSet(A)}, B = ${fmtSet(B)}. How many subsets of A ∪ B are NOT subsets of A? (i.e. |𝒫(A ∪ B) − 𝒫(A)|)</p>`,'num',ans,{hint:'𝒫(A) ⊆ 𝒫(A ∪ B); subtract.',solution:`<p>|A ∪ B| = ${Uu.length}, |A| = ${A.length}: 2<sup>${Uu.length}</sup> − 2<sup>${A.length}</sup> = <b>${ans}</b>.</p>`,meta:{t,A,B,op}});}
   if(t===3){const a=r.int(2,4),b=r.int(2,4),k=r.int(2,a*b-2);const ans=C(a*b,k);
     return Q(`<p>|A| = ${a}, |B| = ${b}. How many subsets of A × B have exactly ${k} elements?</p>`,'num',ans,{hint:'Choose k of the |A||B| ordered pairs.',solution:`<p>C(${a*b}, ${k}) = <b>${ans}</b>.</p>`,meta:{t,a,b,k}});}
   if(t===4){const n=r.int(2,7);const ans=Math.pow(3,n);
     return Q(`<p>|S| = ${n}. How many ordered pairs (X, Y) of subsets of S satisfy X ⊆ Y?</p>`,'num',ans,{hint:'Each element independently: in X (hence in Y), in Y only, or in neither.',solution:`<p>3 choices per element: 3<sup>${n}</sup> = <b>${ans}</b>.</p>`,meta:{t,n}});}
   const n=r.int(2,4);const ans=Math.pow(2,Math.pow(2,n));return Q(`<p>|A| = ${n}. Find |𝒫(𝒫(A))|.</p>`,'num',ans,{hint:'Apply |𝒫(S)| = 2^|S| twice.',solution:`<p>|𝒫(A)| = 2<sup>${n}</sup> = ${1<<n}, so |𝒫(𝒫(A))| = 2<sup>${1<<n}</sup> = <b>${ans}</b>.</p>`,meta:{t,n}});}),
 ...(()=>{const CL=['injective but not surjective','surjective but not injective','bijective','neither injective nor surjective'];
   const cls=(vals,n)=>{const inj=new Set(vals).size===vals.length,sur=new Set(vals).size===n;return inj&&sur?2:inj?0:sur?1:3;};
   return [
   gen('55-C-func-class',TC[2],r=>{const t=r.int(0,2);let prompt,vals,dom,n,sol;
     if(t===0){const m=r.int(4,6);n=m+r.int(-1,1);vals=range(1,m).map(()=>r.int(1,n));dom=range(1,m);
       if(r.float()<0.3){vals=r.shuffle(range(1,n)).slice(0,m);if(vals.length<m)return null;}
       prompt=`<p>f : {1, …, ${m}} → {1, …, ${n}} is given by the table</p>${tbl(['x'].concat(dom),[['f(x)'].concat(vals)])}`;}
     else if(t===1){n=r.int(6,15);const a=r.int(2,n-1),b=r.int(0,n-1);dom=range(0,n-1);vals=dom.map(x=>(a*x+b)%n);prompt=`<p>f : ℤ<sub>${n}</sub> → ℤ<sub>${n}</sub>, f(x) = (${a}x + ${b}) mod ${n}.</p>`;}
     else{const m=r.int(4,10);n=r.int(3,12);if(m===n)return null;const a=r.int(1,6),b=r.int(0,5);dom=range(0,m-1);vals=dom.map(x=>(a*x*x+b*x)%n);prompt=`<p>f : {0, 1, …, ${m-1}} → ℤ<sub>${n}</sub>, f(x) = (${lin([[a,'x²'],[b,'x']])}) mod ${n}.</p>`;}
     const k=cls(vals,n);const idx=r.shuffle([0,1,2,3]);const img=[...new Set(vals)].sort((x,y)=>x-y);
     return Q(prompt+`<p>The function f is:</p>`,'mc',idx.indexOf(k),{choices:idx.map(i=>CL[i]),hint:'Injective: no two inputs share an output. Surjective: every codomain element is hit. Count the image.',
       solution:`<p>Values: ${dom.map((x,i)=>`f(${x})=${vals[i]}`).join(', ')}. Image = {${img.join(', ')}} has ${img.length} of ${n} codomain elements; domain has ${dom.length} elements${t===1?` (gcd(${prompt.match(/\((\d+)x/)[1]}, ${n}) = ${gcd(+prompt.match(/\((\d+)x/)[1],n)})`:''}. So f is <b>${CL[k]}</b>.</p>`,meta:{vals,n}});}),
   gen('55-C-inverse-compose',TC[2],r=>{const n=r.pick([7,9,10,11,12,13,14,15,16,17,19,21,22,23,25,26]);const a=r.int(2,n-1),b=r.int(0,n-1),c=r.int(2,n-1),d=r.int(0,n-1);if(gcd(a,n)!==1||gcd(c,n)!==1)return null;
     const f=x=>mod(a*x+b,n),g=x=>mod(c*x+d,n);const ai=range(1,n-1).find(x=>(a*x)%n===1);const finv=y=>mod(ai*(y-b),n);const t=r.int(0,n-1);const which=r.int(0,2);
     let ans,desc,steps;if(which===0){ans=finv(g(t));desc=`(f⁻¹ ∘ g)(${t})`;steps=`g(${t}) = ${g(t)}; f⁻¹(y) = ${ai}(y − ${b}) mod ${n} since ${a}·${ai} ≡ 1; f⁻¹(${g(t)}) = ${ans}.`;}
     else if(which===1){ans=g(finv(t));desc=`(g ∘ f⁻¹)(${t})`;steps=`${a}⁻¹ ≡ ${ai} (mod ${n}); f⁻¹(${t}) = ${ai}(${t} − ${b}) mod ${n} = ${finv(t)}; g(${finv(t)}) = ${ans}.`;}
     else{const gi=range(1,n-1).find(x=>(c*x)%n===1);ans=finv(mod(gi*(t-d),n));desc=`(g ∘ f)⁻¹(${t})`;steps=`(g ∘ f)⁻¹ = f⁻¹ ∘ g⁻¹. g⁻¹(${t}) = ${gi}(${t} − ${d}) mod ${n} = ${mod(gi*(t-d),n)}; f⁻¹ of that = ${ans}.`;}
     return Q(`<p>On ℤ<sub>${n}</sub> let f(x) = (${a}x + ${b}) mod ${n} and g(x) = (${c}x + ${d}) mod ${n} (both bijections). Compute ${desc}.</p>`,'num',ans,{hint:'Invert y = ax + b: x = a⁻¹(y − b) mod n. (g∘f)⁻¹ = f⁻¹∘g⁻¹ (reverse order).',
       solution:`<p>${steps} Answer: <b>${ans}</b>.</p>`,meta:{n,a,b,c,d,t,which}});}),
 ];})(),
 gen('55-C-floor-sum',TC[3],r=>{const t=r.int(0,2);const N=r.int(20,60);let ans=0,expr,sol;
   if(t===0){const a=r.int(3,7);for(let k=1;k<=N;k++)ans+=Math.floor(k/a);expr=`∑<sub>k=1</sub><sup>${N}</sup> ⌊k/${a}⌋`;const q=Math.floor(N/a);sol=`⌊k/${a}⌋ = j for ${a} consecutive k (k = ${a}j … ${a}j+${a-1}); j = 1…${q-1} contribute ${a}·(1+…+${q-1}) = ${a*(q-1)*q/2}, and j = ${q} appears ${N-a*q+1} times: ${q*(N-a*q+1)}.`;}
   else if(t===1){const a=r.int(3,7);for(let k=1;k<=N;k++)ans+=Math.ceil(k/a);expr=`∑<sub>k=1</sub><sup>${N}</sup> ⌈k/${a}⌉`;sol=`⌈k/${a}⌉ = j for k = ${a}(j−1)+1 … ${a}j; group the terms in blocks of ${a}.`;}
   else{for(let k=1;k<=N;k++)ans+=Math.floor(Math.sqrt(k)+1e-9);expr=`∑<sub>k=1</sub><sup>${N}</sup> ⌊√k⌋`;sol=`⌊√k⌋ = j for j² ≤ k < (j+1)², i.e. 2j + 1 values (last block truncated at ${N}).`;}
   return Q(`<p>Compute ${expr}.</p>`,'num',ans,{hint:'Group the k by the common value of the floor/ceiling.',solution:`<p>${sol} Total = <b>${ans}</b>.</p>`,meta:{t,N,a:+(expr.match(/k\/(\d+)/)||[0,0])[1]}});}),
 gen('55-C-floor-count',TC[3],r=>{const t=r.int(0,2);const N=r.int(30,90);const a=r.int(2,7);let b=r.int(2,9);if(a===b)b++;let pred,txt;
   if(t===0){pred=n=>Math.floor(n/a)===Math.floor(n/b);txt=`⌊n/${a}⌋ = ⌊n/${b}⌋`;}else if(t===1){pred=n=>Math.ceil(n/a)===Math.floor(n/b);txt=`⌈n/${a}⌉ = ⌊n/${b}⌋`;}
   else{pred=n=>n%Math.floor(Math.sqrt(n)+1e-9)===0;txt=`⌊√n⌋ divides n`;}
   const sols=range(1,N).filter(pred);if(!sols.length)return null;
   return Q(`<p>How many integers n with 1 ≤ n ≤ ${N} satisfy ${txt}?</p>`,'num',sols.length,{hint:'Write n = qm + r and see where each side changes value; or organize by the value of the floor.',solution:`<p>They are ${sols.join(', ')}: <b>${sols.length}</b> integers.</p>`,meta:{t,N,a,b}});}),
 gen('55-C-floor-tf',TC[3],r=>{const den=r.pick([2,4,8]);const x=r.int(-30,30)/den,y=r.int(-30,30)/den;const fl=Math.floor,ce=Math.ceil;
   const T=[[`⌊x + y⌋ = ⌊x⌋ + ⌊y⌋`,()=>fl(x+y)===fl(x)+fl(y)],[`⌈x + y⌉ = ⌈x⌉ + ⌈y⌉`,()=>ce(x+y)===ce(x)+ce(y)],[`⌊−x⌋ = −⌊x⌋`,()=>fl(-x)===-fl(x)],[`⌊2x⌋ = 2⌊x⌋`,()=>fl(2*x)===2*fl(x)],
     [`⌊2x⌋ = ⌊x⌋ + ⌊x + 1/2⌋`,()=>fl(2*x)===fl(x)+fl(x+0.5)],[`⌈x⌉ − ⌊x⌋ = 1`,()=>ce(x)-fl(x)===1],[`⌊xy⌋ = ⌊x⌋·⌊y⌋`,()=>fl(x*y)===fl(x)*fl(y)],[`⌈x⌉ = −⌊−x⌋`,()=>ce(x)===-fl(-x)],[`⌊x⌋ + ⌈y⌉ = ⌊x + y⌋ + 1`,()=>fl(x)+ce(y)===fl(x+y)+1]];
   const t=r.int(0,T.length-1);const v=T[t][1]();if(v&&r.float()<0.3)return null;const uses=T[t][0].includes('y');
   return Q(`<p>Let x = ${sn(x)}${uses?` and y = ${sn(y)}`:''}. True or false: <b>${T[t][0]}</b>?</p>`,'tf',v,{hint:'⌊t⌋ is the greatest integer ≤ t (careful with negatives: ⌊−1.5⌋ = −2).',
     solution:`<p>⌊x⌋ = ${sn(fl(x))}, ⌈x⌉ = ${sn(ce(x))}${uses?`, ⌊y⌋ = ${sn(fl(y))}, ⌈y⌉ = ${sn(ce(y))}, x + y = ${sn(x+y)}`:''}, 2x = ${sn(2*x)}, −x = ${sn(-x)}. Evaluating both sides, the statement is <b>${v}</b>.</p>`,meta:{x,y,t}});}),
 gen('55-C-listing',TC[4],r=>{const t=r.int(0,2);
   if(t===0){const a=r.int(0,9),b=r.int(0,9);const d=a+b;const ans=d*(d+1)/2+a;
     return Q(`<p>ℕ × ℕ is listed along diagonals: (0,0), (0,1), (1,0), (0,2), (1,1), (2,0), (0,3), … (diagonal a + b = d is listed in order of increasing first coordinate). Counting the first pair as position 0, at which position does (${a}, ${b}) appear?</p>`,'num',ans,{
       hint:'Diagonals 0…d−1 contain 1 + 2 + … + d = d(d+1)/2 pairs.',solution:`<p>d = ${d}; earlier diagonals contain ${d}·${d+1}/2 = ${d*(d+1)/2} pairs; within diagonal ${d}, (${a}, ${b}) is at offset ${a}. Position <b>${ans}</b>.</p>`,meta:{t,a,b}});}
   if(t===1){const k=r.int(10,80);const val=k%2===0?k/2:-(k-1)/2;
     return Q(`<p>The bijection f : ℤ<sup>+</sup> → ℤ lists ℤ as 0, 1, −1, 2, −2, 3, −3, … (f(1) = 0, f(2) = 1, f(3) = −1, …). What is f(${k})?</p>`,'num',val,{hint:'f(n) = n/2 for even n and −(n−1)/2 for odd n.',solution:`<p>${k} is ${k%2?'odd':'even'}, so f(${k}) = <b>${val}</b>.</p>`,meta:{t,k}});}
   // positive rationals p/q listed by p+q then p, skipping non-reduced
   const p=r.int(1,7),q=r.int(1,7);if(gcd(p,q)!==1)return null;let pos=0,found=0;for(let s=2;!found;s++)for(let a=1;a<s;a++){const b=s-a;if(gcd(a,b)!==1)continue;pos++;if(a===p&&b===q){found=pos;break;}}
   return Q(`<p>The positive rationals are listed by increasing p + q, and for equal sums by increasing p, SKIPPING fractions not in lowest terms: 1/1, 1/2, 2/1, 1/3, 3/1, 1/4, 2/3, 3/2, 4/1, 1/5, … (1/1 is position 1). At which position is ${p}/${q}?</p>`,'num',found,{
     hint:'For each sum s, the reduced fractions a/(s−a) number φ(s).',solution:`<p>Count reduced fractions with smaller sum, then those with sum ${p+q} and numerator ≤ ${p}: position <b>${found}</b>.</p>`,meta:{t,p,q}});}),
 ...(()=>{const POOL=[['ℤ × ℤ',1],['the set of all finite bit strings',1],['the set of all infinite bit strings',0],['𝒫(ℕ)',0],['ℚ',1],['(0, 1) ⊂ ℝ',0],['polynomials with integer coefficients',1],['the irrational numbers',0],
   ['all functions ℕ → {0, 1}',0],['the finite subsets of ℕ',1],['the algebraic numbers',1],['all Java programs',1],['ℝ × ℝ',0],['the set of all real roots of quadratics with rational coefficients',1],['ℕ<sup>ℕ</sup> (all sequences of naturals)',0],
   ['the set of odd negative integers',1],['ℚ × ℤ × ℕ',1],['[0, 1] ∩ ℚ',1],['the set of all lines in the plane',0],['the union of countably many countable sets',1],['the set of all subsets of ℤ of size 3',1],['ℝ − ℚ ∪ {0}',0],['the set of decimal numbers using only digits 3 and 7 (infinite expansions)',0],['the set of all finite sequences of integers',1]];
   return [gen('55-C-countable-multi',TC[5],r=>{const pick=r.sample(POOL,5);const mode=r.bool();if(pick.every(x=>x[1])||pick.every(x=>!x[1]))return null;
     return Q(`<p>Select ALL sets that are <b>${mode?'countable':'uncountable'}</b>.</p>`,'multi',pick.map((x,i)=>(x[1]===1)===mode?i:-1).filter(i=>i>=0),{choices:pick.map(x=>x[0]),
       hint:'Countable: can be listed (finite strings over a finite alphabet, countable unions of countable sets). Uncountable: contains or maps onto infinite bit strings / ℝ (Cantor diagonal).',
       solution:ul(pick.map(x=>`${x[0]}: <b>${x[1]?'countable':'uncountable'}</b>`)),meta:{items:pick.map(x=>x[0]),mode}});})];})(),
 gen('55-C-diagonal',TC[5],r=>{const n=r.int(5,7);const rows=range(1,n).map(()=>range(1,n).map(()=>r.int(0,1)).join(''));if(new Set(rows).size<n)return null;
   const dec=r.bool();if(dec){const dr=range(1,n).map(()=>range(1,n).map(()=>r.int(0,9)).join(''));const ans='0.'+dr.map((s,i)=>s[i]==='4'?'5':'4').join('');
     return Q(`<p>Cantor's diagonal argument (Rosen's rule: the new i-th digit is 4 if the i-th digit of the i-th number is not 4, and 5 if it is 4). Using the first ${n} numbers of a supposed list of (0,1):</p>${ol(dr.map(s=>`r<sub>i</sub> = 0.${s}…`))}<p>Give the first ${n} digits of the diagonal number as 0.d₁d₂…</p>`,'text',[ans],{
       hint:'Look only at digit i of number i.',solution:`<p>Diagonal digits: ${dr.map((s,i)=>s[i]).join(', ')} → <b>${ans}</b>, which differs from every r<sub>i</sub> in the i-th digit.</p>`,meta:{dec,rows:dr}});}
   const ans=rows.map((s,i)=>s[i]==='0'?'1':'0').join('');
   return Q(`<p>Diagonalization: s₁, …, s<sub>${n}</sub> are the first ${n} bits of the first ${n} infinite bit strings of a supposed list:</p>${ol(rows.map(s=>`<code>${s}…</code>`))}<p>Give the first ${n} bits of the string that flips the diagonal (bit i is the opposite of bit i of s<sub>i</sub>).</p>`,'text',[ans],{
     hint:'Read the diagonal bits s₁[1], s₂[2], …, then flip each.',solution:`<p>Diagonal: ${rows.map((s,i)=>s[i]).join('')}; flipped: <b>${ans}</b>. It differs from s<sub>i</sub> in position i, so it is not in the list.</p>`,meta:{dec,rows}});}),
 gen('55-C-cartesian',TC[1],r=>{const A=r.sample(range(1,9),r.int(3,5)).sort((a,b)=>a-b),B=r.sample(range(1,9),r.int(3,5)).sort((a,b)=>a-b);const I=A.filter(x=>B.includes(x));const t=r.int(0,3);let v,desc,sol;
   if(t===0){v=sum(A.map(a=>B.filter(b=>a<b).length));desc='|{(a, b) ∈ A × B : a < b}|';sol=A.map(a=>`a = ${a}: ${B.filter(b=>a<b).length}`).join(', ');}
   else if(t===1){v=I.length*I.length;desc='|(A × B) ∩ (B × A)|';sol=`(A × B) ∩ (B × A) = (A ∩ B) × (A ∩ B), A ∩ B = ${fmtSet(I)}, so ${I.length}²`;}
   else if(t===2){v=A.length*B.length-I.length*I.length;desc='|(A × B) − (B × A)|';sol=`|A × B| − |(A ∩ B) × (A ∩ B)| = ${A.length}·${B.length} − ${I.length}²`;}
   else{v=0;for(const a of A)for(const b of B)for(const c of A)if((a+b+c)%2===0)v++;desc='|{(a, b, c) ∈ A × B × A : a + b + c is even}|';const ea=A.filter(x=>x%2===0).length,eb=B.filter(x=>x%2===0).length,oa=A.length-ea,ob=B.length-eb;sol=`count parity patterns (even/odd): ${ea}·${eb}·${ea} + ${ea}·${ob}·${oa}·2 + ${oa}·${eb}·${oa} = ${ea*eb*ea}+${2*ea*ob*oa}+${oa*eb*oa}`;}
   return Q(`<p>A = ${fmtSet(A)}, B = ${fmtSet(B)}. Find ${desc}.</p>`,'num',v,{hint:'Organize the count by the first coordinate (or by parity classes); (A×B)∩(C×D) = (A∩C)×(B∩D).',solution:`<p>${sol} ⇒ <b>${v}</b>.</p>`,meta:{A,B,t}});}),
 gen('55-C-pairing',TC[4],r=>{const t=r.int(0,2);
   if(t===0){const k=r.int(1,3000);let x=k+1,m=0;while(x%2===0){x/=2;m++;}const n=(x-1)/2;
     return Q(`<p>f : ℕ × ℕ → ℕ, f(m, n) = 2<sup>m</sup>(2n + 1) − 1 is a bijection (ℕ = {0, 1, 2, …}). Find (m, n) with f(m, n) = ${k}. Enter m, n.</p>`,'list',[m,n],{hint:'Every positive integer k + 1 is uniquely 2^m · (odd number).',
       solution:`<p>${k} + 1 = ${k+1} = 2<sup>${m}</sup> · ${x}, so m = ${m} and 2n + 1 = ${x}, n = ${n}. Answer <b>${m}, ${n}</b>.</p>`,meta:{t,k}});}
   if(t===1){const k=r.int(5,400);let d=0;while((d+1)*(d+2)/2<=k)d++;const b=k-d*(d+1)/2,a=d-b;
     return Q(`<p>The Cantor pairing π(a, b) = (a + b)(a + b + 1)/2 + b is a bijection ℕ × ℕ → ℕ. Find (a, b) with π(a, b) = ${k}. Enter a, b.</p>`,'list',[a,b],{hint:'Find the diagonal d = a + b: the largest d with d(d+1)/2 ≤ k; then b = k − d(d+1)/2.',
       solution:`<p>d(d+1)/2 ≤ ${k} < (d+1)(d+2)/2 gives d = ${d}; b = ${k} − ${d*(d+1)/2} = ${b}, a = d − b = ${a}. Answer <b>${a}, ${b}</b>.</p>`,meta:{t,k}});}
   const k=r.int(0,500);const z=k%2===0?k/2:-(k+1)/2;
   return Q(`<p>g : ℤ → ℕ, g(z) = 2z for z ≥ 0 and g(z) = −2z − 1 for z < 0, is a bijection (showing ℤ is countable). Find g<sup>−1</sup>(${k}).</p>`,'num',z,{hint:'Even outputs come from nonnegative z, odd outputs from negative z.',
     solution:`<p>${k} is ${k%2?'odd':'even'}: ${k%2?`−2z − 1 = ${k} ⇒ z = ${z}`:`2z = ${k} ⇒ z = ${z}`}. Answer <b>${z}</b>.</p>`,meta:{t,k}});}),
];

// =========================================================
// 55-D  Divisibility & modular arithmetic
// =========================================================
const TD=['Division algorithm with negative numbers','Congruence arithmetic and last-digit problems','Fast modular exponentiation (successive squaring)','Base conversion','Divisibility proofs (a|b ∧ a|c ⇒ a|(mb+nc))'];
const DIG='0123456789ABCDEF';
const toBase=(n,b)=>{if(n===0)return '0';let s='';while(n>0){s=DIG[n%b]+s;n=Math.floor(n/b);}return s;};
G['55-D']=[
 gen('55-D-divalg',TD[0],r=>{const d=r.int(3,40);const a=-r.int(20,999);if(a%d===0)return null;const q=Math.floor(a/d),rm=a-d*q;const w=r.bool();
   return Q(`<p>Division algorithm: find q = ${sn(a)} <b>div</b> ${d} and r = ${sn(a)} <b>mod</b> ${d}, i.e. ${sn(a)} = ${d}q + r with 0 ≤ r < ${d}. Enter q, r.</p>`,'list',[q,rm],{
     hint:'The remainder must be NON-negative: round the quotient DOWN (toward −∞), not toward 0.',
     solution:`<p>${-a} = ${d}·${Math.floor(-a/d)} + ${(-a)%d}, so ${sn(a)} = ${d}·(${sn(-Math.floor(-a/d))}) − ${(-a)%d} = ${d}·(${sn(q)}) + ${rm}. q = <b>${sn(q)}</b>, r = <b>${rm}</b> (not ${sn(-((-a)%d))}).</p>`,meta:{a,d}});}),
 gen('55-D-divalg-multi',TD[0],r=>{const m=r.int(5,17),a=r.int(-60,60);const cands=new Set();while(cands.size<6){const t=r.float();let x;if(t<0.4)x=a+m*r.int(-8,8);else if(t<0.6)x=-a+m*r.int(-6,6);else x=r.int(-120,120);cands.add(x);}
   const cs=[...cands];const ans=cs.map((x,i)=>mod(x-a,m)===0?i:-1).filter(i=>i>=0);if(!ans.length||ans.length===6)return null;
   return Q(`<p>Select ALL integers congruent to ${sn(a)} modulo ${m}.</p>`,'multi',ans,{choices:cs.map(sn),hint:`x ≡ a (mod m) ⇔ m | (x − a) ⇔ x mod m = a mod m; here ${sn(a)} mod ${m} = ${mod(a,m)}.`,
     solution:ul(cs.map(x=>`${sn(x)} mod ${m} = ${mod(x,m)} ${mod(x-a,m)===0?'✓':'✗'}`)),meta:{a,m,cs}});}),
 gen('55-D-lastdigits',TD[1],r=>{const a=r.int(3,99);if(a%10===0)return null;const e=r.int(100,99999);const two=r.bool();const m=two?100:10;const ans=powmod(a,e,m);
   const per=(()=>{let x=a%m,k=1;const s=x;do{x=x*a%m;k++;}while(x!==s&&k<200);return k-1;})();
   return Q(`<p>What ${two?'are the last two digits':'is the last digit'} of ${a}<sup>${e}</sup>? (Enter as a number ${two?'0–99':'0–9'}.)</p>`,'num',ans,{
     hint:`Work mod ${m}: powers of ${a} mod ${m} eventually cycle; or use successive squaring.`,
     solution:`<p>The powers of ${a} mod ${m} are eventually periodic with period ${per}. Reducing the exponent accordingly (or by successive squaring), ${a}<sup>${e}</sup> ≡ <b>${ans}</b> (mod ${m}).</p>`,meta:{a,e,m}});}),
 gen('55-D-cong-arith',TD[1],r=>{const m=r.int(7,31);const a=r.int(1000,99999),b=r.int(1000,99999),c=r.int(2,50),k=r.int(10,60),d=r.int(100,9999);const ans=mod(mod(a,m)*mod(b,m)+powmod(c,k,m)-d,m);
   return Q(`<p>Compute (${a}·${b} + ${c}<sup>${k}</sup> − ${d}) mod ${m}.</p>`,'num',ans,{hint:'Reduce each piece mod m first: a ≡ a mod m, and (xy) mod m = ((x mod m)(y mod m)) mod m.',
     solution:`<p>${a} ≡ ${mod(a,m)}, ${b} ≡ ${mod(b,m)}, ${c}<sup>${k}</sup> ≡ ${powmod(c,k,m)}, ${d} ≡ ${mod(d,m)} (mod ${m}). So ${mod(a,m)}·${mod(b,m)} + ${powmod(c,k,m)} − ${mod(d,m)} ≡ <b>${ans}</b>.</p>`,meta:{m,a,b,c,k,d}});}),
 gen('55-D-fastexp',TD[2],r=>{const m=r.int(30,999),b=r.int(2,m-1),e=r.int(50,2000);const ans=powmod(b,e,m);
   const bits=e.toString(2);const sq=[];let x=b%m;for(let i=0;i<bits.length;i++){sq.push(x);x=x*x%m;}
   return Q(`<p>Use successive squaring to compute ${b}<sup>${e}</sup> mod ${m}.</p>`,'num',ans,{hint:`Write ${e} in binary, compute ${b}^(2^i) mod ${m} by repeated squaring, multiply the ones you need.`,
     solution:`<p>${e} = (${bits})<sub>2</sub>. Squares: ${sq.map((v,i)=>`${b}<sup>${1<<i}</sup> ≡ ${v}`).join(', ')}. Multiply those with a 1-bit: ${[...bits].reverse().map((c,i)=>c==='1'?sq[i]:null).filter(v=>v!==null).join(' · ')} ≡ <b>${ans}</b> (mod ${m}).</p>`,meta:{b,e,m}});}),
 gen('55-D-squares-list',TD[2],r=>{const m=r.int(20,500),b=r.int(2,m-1),k=r.int(4,6);const L=[];let x=b%m;for(let i=0;i<=k;i++){L.push(x);x=x*x%m;}
   return Q(`<p>Successive squaring mod ${m}: list ${b}<sup>1</sup>, ${b}<sup>2</sup>, ${b}<sup>4</sup>, …, ${b}<sup>${1<<k}</sup> mod ${m} (${k+1} values, each in 0…${m-1}).</p>`,'list',L,{hint:'Each value is the square of the previous one, reduced mod m.',
     solution:`<p>${L.map((v,i)=>i?`${L[i-1]}² = ${L[i-1]*L[i-1]} ≡ ${v}`:`${b} mod ${m} = ${v}`).join('; ')}.</p><p>Answer: <b>${L.join(', ')}</b></p>`,meta:{b,m,k}});}),
 gen('55-D-base-to',TD[3],r=>{const b=r.pick([2,3,5,7,8,16]);const n=b===2?r.int(64,1023):r.int(200,20000);const s=toBase(n,b);
   const steps=[];let x=n;while(x>0){steps.push(`${x} = ${b}·${Math.floor(x/b)} + ${x%b}`);x=Math.floor(x/b);}
   return Q(`<p>Write ${n} (decimal) in base ${b}.${b===16?' Use digits 0–9, A–F.':''}</p>`,'text',[s,s.toLowerCase()],{hint:'Repeatedly divide by the base; remainders are the digits from right to left.',
     solution:`<p>${steps.join('; ')}. Reading remainders bottom-up: <b>${s}</b>.</p>`,meta:{n,b}});}),
 gen('55-D-base-from',TD[3],r=>{const t=r.int(0,1);if(t===0){const b=r.pick([3,4,5,6,7,8,9,16]);const n=r.int(100,40000);const s=toBase(n,b);
     return Q(`<p>Convert (${s})<sub>${b}</sub> to decimal.</p>`,'num',n,{hint:'∑ digit · base^position (rightmost position 0), or Horner: multiply by the base and add the next digit.',
       solution:`<p>Horner: ${[...s].reduce((acc,c,i)=>{const v=acc.v*b+DIG.indexOf(c);acc.t.push(i?`${acc.v}·${b} + ${DIG.indexOf(c)} = ${v}`:`${v}`);acc.v=v;return acc;},{v:0,t:[]}).t.join('; ')}. Answer <b>${n}</b>.</p>`,meta:{t,s,b}});}
   const n=r.int(256,65535);const hx=toBase(n,16),bn=toBase(n,2);const dir=r.bool();
   if(dir)return Q(`<p>Convert (${hx})<sub>16</sub> directly to binary (no leading zeros).</p>`,'text',[bn],{hint:'Each hex digit is exactly 4 bits.',solution:`<p>${[...hx].map(c=>`${c} → ${toBase(DIG.indexOf(c),2).padStart(4,'0')}`).join(', ')}; drop leading zeros: <b>${bn}</b>.</p>`,meta:{t,dir,n}});
   return Q(`<p>Convert (${bn})<sub>2</sub> directly to hexadecimal (digits 0–9, A–F).</p>`,'text',[hx,hx.toLowerCase()],{hint:'Group bits in fours from the right.',solution:`<p>Groups of 4 from the right → <b>${hx}</b>.</p>`,meta:{t,dir,n}});}),
 gen('55-D-divides-multi',TD[4],r=>{const d=r.int(3,12);const exprs=[];const seen=new Set();
   while(exprs.length<6){const t=r.int(0,3);let e;if(t===0){const a=r.int(-6,6),b=r.int(-6,6),c=r.pick([0,0,r.int(-2*d,2*d)]);if(!a&&!b)continue;e={s:lin([[a,'x'],[b,'y'],[c,'']]),c0:c,js:`${a}*x+${b}*y+${c}`};}
     else if(t===1){const c=r.pick([0,d,-d,r.int(1,d-1),2*d]);e={s:lin([[1,'xy'],[c,'']]),c0:c,js:`x*y+${c}`};}
     else if(t===2){const a=r.int(1,4),c=r.pick([0,r.int(1,3*d)]);e={s:lin([[a,'x²'],[-1,'y'],[-c,'']]),c0:-c,js:`${a}*x*x-y-${c}`};}
     else{const a=r.int(2,5),c=r.pick([0,a,d*a,r.int(1,9)]);e={s:`${a}x + ${c}${c%d===0&&c?'':''}`.replace(/ \+ 0$/,''),c0:c,js:`${a}*x+${c}`};}
     if(seen.has(e.s))continue;seen.add(e.s);exprs.push(e);}
   const ans=exprs.map((e,i)=>mod(e.c0,d)===0?i:-1).filter(i=>i>=0);if(!ans.length||ans.length===6)return null;
   return Q(`<p>Suppose ${d} | x and ${d} | y (x, y integers). Which expressions are <b>guaranteed</b> to be divisible by ${d}? Select all.</p>`,'multi',ans,{choices:exprs.map(e=>e.s),
     hint:`Write x = ${d}s, y = ${d}t: every term containing x or y is a multiple of ${d}; only the constant term decides (a | b ∧ a | c ⇒ a | mb + nc).`,
     solution:ul(exprs.map(e=>`${e.s}: constant term ${sn(e.c0)} ${mod(e.c0,d)===0?`is divisible by ${d} ⇒ always divisible`:`is not divisible by ${d} ⇒ fails e.g. at x = y = 0`}`)),meta:{d,js:exprs.map(e=>e.js)}});}),
 gen('55-D-count-divisible',TD[4],r=>{const m=r.int(5,21),a=r.int(-9,9),b=r.int(-20,20);const N=r.int(100,600);const cnt=range(1,N).filter(n=>mod(n*n+a*n+b,m)===0).length;const res=range(0,m-1).filter(s=>mod(s*s+a*s+b,m)===0);
   if(!res.length)return null;
   return Q(`<p>How many integers n with 1 ≤ n ≤ ${N} satisfy ${m} | ${quad(1,a,b,'n')}?</p>`,'num',cnt,{hint:`Divisibility by ${m} depends only on n mod ${m}: find the good residues, then count each in 1…${N}.`,
     solution:`<p>Good residues mod ${m}: {${res.join(', ')}}. ${N} = ${m}·${Math.floor(N/m)} + ${N%m}; each residue class has ${Math.floor(N/m)} or ${Math.floor(N/m)+1} members in 1…${N}. Total <b>${cnt}</b>.</p>`,meta:{m,a,b,N}});}),
];

// =========================================================
// 55-E  Primes, gcd, Euclid, Bézout, linear congruences
// =========================================================
const TE=['Prime factorization; gcd/lcm by factoring and by Euclid','Extended Euclid → Bézout coefficients','Inverse mod m (and when it doesn’t exist)','Solve ax ≡ b (mod m) incl. gcd > 1 (how many solutions)','Proofs with gcd (Euclid’s lemma) and primes'];
function euclidSteps(a,b){const st=[];while(b){st.push(`${a} = ${Math.floor(a/b)}·${b} + ${a%b}`);[a,b]=[b,a%b];}return {g:a,st};}
function egcd(a,b){if(b===0)return [a,1,0];const [g,x,y]=egcd(b,a%b);return [g,y,x-Math.floor(a/b)*y];}
G['55-E']=[
 gen('55-E-gcd-lcm',TE[0],r=>{const ps=r.sample([2,3,5,7,11,13],r.int(3,4));const ea=ps.map(()=>r.int(0,3)),eb=ps.map(()=>r.int(0,3));
   const a=ps.reduce((x,p,i)=>x*Math.pow(p,ea[i]),1),b=ps.reduce((x,p,i)=>x*Math.pow(p,eb[i]),1);if(a<50||b<50||a===b||a>2e6||b>2e6)return null;const g=gcd(a,b),l=lcm(a,b);if(g===1&&r.float()<0.7)return null;
   return Q(`<p>Factor a = ${a} and b = ${b} into primes, then give gcd(a, b) and lcm(a, b). Enter gcd, lcm.</p>`,'list',[g,l],{hint:'gcd: minimum exponent of each prime; lcm: maximum exponent.',
     solution:`<p>${a} = ${fmtFact(factorize(a))}, ${b} = ${fmtFact(factorize(b))}. gcd = ${g===1?'1':fmtFact(factorize(g))} = <b>${g}</b>; lcm = ${fmtFact(factorize(l))} = <b>${l}</b>. (Check: gcd·lcm = ab = ${a*b}.)</p>`,meta:{a,b}});}),
 gen('55-E-euclid',TE[0],r=>{const a=r.int(300,9999),b=r.int(100,a-1);const {g,st}=euclidSteps(a,b);if(st.length<4)return null;
   return Q(`<p>Run the Euclidean algorithm on gcd(${a}, ${b}). Enter the gcd and the number of division steps (lines of the form x = q·y + r, including the last one with remainder 0).</p>`,'list',[g,st.length],{hint:'gcd(a, b) = gcd(b, a mod b); stop when the remainder is 0; the last nonzero remainder is the gcd.',
     solution:`<p>${st.join('<br>')}</p><p>gcd = <b>${g}</b>, using <b>${st.length}</b> divisions.</p>`,meta:{a,b}});}),
 gen('55-E-bezout',TE[1],r=>{const g0=r.pick([1,1,1,2,3,4,5,6,7]);const a=g0*r.int(15,300),b=g0*r.int(15,300);if(a===b)return null;const g=gcd(a,b);const M=b/g;
   const [, x]=egcd(a,b);const s=mod(x,M);const t=(g-a*s)/b;
   return Q(`<p>Find Bézout coefficients for a = ${a}, b = ${b}: integers s, t with ${a}s + ${b}t = gcd(${a}, ${b}). To make the answer unique, take 0 ≤ s < ${M} (= b/gcd). Enter s, t.</p>`,'list',[s,t],{
     hint:'Run Euclid, then back-substitute (or use the extended-Euclid table). All solutions are s + k·b/g, t − k·a/g.',
     solution:`<p>${euclidSteps(a,b).st.join('<br>')}</p><p>gcd = ${g}. Back-substituting gives s = ${x}, t = ${(g-a*x)/b}; shifting by multiples of b/g = ${M}: s = <b>${s}</b>, t = <b>${t}</b>. Check: ${a}·${s} + ${b}·(${t}) = ${g}.</p>`,meta:{a,b}});}),
 gen('55-E-inverse',TE[2],r=>{const m=r.int(11,150),a=r.int(2,m-1);const g=gcd(a,m);if(g>1&&r.float()<0.75)return null;const [, x]=egcd(a,m);const inv=g===1?mod(x,m):0;
   return Q(`<p>Find the inverse of ${a} modulo ${m} as a number in 1…${m-1}. If no inverse exists, enter 0.</p>`,'num',inv,{hint:'An inverse exists iff gcd(a, m) = 1; then the Bézout coefficient of a, reduced mod m, is the inverse.',
     solution:g===1?`<p>gcd(${a}, ${m}) = 1. Extended Euclid: ${a}·(${x}) + ${m}·(${(1-a*x)/m}) = 1, so ${a}⁻¹ ≡ ${x} ≡ <b>${inv}</b> (mod ${m}). Check ${a}·${inv} = ${a*inv} ≡ 1.</p>`:`<p>gcd(${a}, ${m}) = ${g} ≠ 1, so ${a}x ≡ 1 has no solution: every ${a}x − ${m}k is a multiple of ${g}. Answer <b>0</b>.</p>`,meta:{a,m}});}),
 gen('55-E-inverse-multi',TE[2],r=>{const m=r.pick([12,14,15,18,20,21,24,26,28,30,33,35,36,40,42,45]);const as=r.sample(range(2,m-1),6);const ans=as.map((a,i)=>gcd(a,m)===1?i:-1).filter(i=>i>=0);if(!ans.length||ans.length===6)return null;
   return Q(`<p>Modulo ${m}, which of these have a multiplicative inverse? Select all.</p>`,'multi',ans,{choices:as.map(String),hint:`a is invertible mod m ⇔ gcd(a, m) = 1. Here ${m} = ${fmtFact(factorize(m))}.`,
     solution:ul(as.map(a=>`gcd(${a}, ${m}) = ${gcd(a,m)} ${gcd(a,m)===1?`→ invertible (inverse ${range(1,m-1).find(x=>a*x%m===1)})`:'→ no inverse'}`)),meta:{m,as}});}),
 gen('55-E-lincong-count',TE[3],r=>{const m=r.int(12,90),a=r.int(2,m-1),b=r.int(0,m-1);const g=gcd(a,m);if(g===1&&r.float()<0.8)return null;const cnt=b%g===0?g:0;
   return Q(`<p>How many solutions x ∈ {0, 1, …, ${m-1}} does ${a}x ≡ ${b} (mod ${m}) have?</p>`,'num',cnt,{hint:'Let d = gcd(a, m). Solvable iff d | b, and then there are exactly d solutions mod m.',
     solution:`<p>d = gcd(${a}, ${m}) = ${g}. ${b%g===0?`${g} | ${b}, so there are exactly <b>${g}</b> solutions mod ${m}: ${range(0,m-1).filter(x=>(a*x-b)%m===0).join(', ')}.`:`${g} ∤ ${b}, so there are <b>0</b> solutions (the left side is always a multiple of ${g} mod ${m}).`}</p>`,meta:{m,a,b}});}),
 gen('55-E-lincong-solve',TE[3],r=>{const m=r.int(10,80),a=r.int(2,m-1);const g=gcd(a,m);if(g===1&&r.float()<0.6)return null;if(g>6)return null;const b=g*r.int(0,Math.floor((m-1)/g));
   const sols=range(0,m-1).filter(x=>mod(a*x-b,m)===0);const a1=a/g,b1=b/g,m1=m/g;const x0=mod(egcd(a1,m1)[1]*b1,m1);
   return Q(`<p>Solve ${a}x ≡ ${b} (mod ${m}). List ALL solutions in {0, 1, …, ${m-1}} (any order).</p>`,'list',sols,{unordered:true,hint:'Divide a, b, m by d = gcd(a, m), solve the reduced congruence with an inverse, then add multiples of m/d.',
     solution:`<p>d = ${g}. ${g>1?`Reduce: ${a1}x ≡ ${b1} (mod ${m1}). `:''}${a1}⁻¹ ≡ ${mod(egcd(a1,m1)[1],m1)} (mod ${m1}), so x ≡ ${x0} (mod ${m1}). Solutions mod ${m}: <b>${sols.join(', ')}</b>.</p>`,meta:{m,a,b}});}),
 gen('55-E-gcd-values',TE[4],r=>{const a=r.int(1,5),b=r.int(-9,9),c=r.int(1,5),d=r.int(-9,9);const D=Math.abs(a*d-b*c);if(D<4||D>60)return null;
   const vals=[...new Set(range(0,D*3).map(n=>gcd(a*n+b,c*n+d)))].sort((x,y)=>x-y);if(vals.length<2)return null;
   return Q(`<p>As n ranges over all integers, which values can gcd(${lin([[a,'n'],[b,'']])}, ${lin([[c,'n'],[d,'']])}) take? List all (any order).</p>`,'list',vals,{unordered:true,
     hint:`Any common divisor divides ${c}·(${lin([[a,'n'],[b,'']])}) − ${a}·(${lin([[c,'n'],[d,'']])}) = ${sn(c*b-a*d)}; then check which divisors actually occur.`,
     solution:`<p>If g divides both, g | ${c}(${lin([[a,'n'],[b,'']])}) − ${a}(${lin([[c,'n'],[d,'']])}) = ${sn(c*b-a*d)}, so g ∈ divisors of ${D}: {${divisors(D).join(', ')}}. Testing n mod ${D} shows the attained values are <b>{${vals.join(', ')}}</b>.</p>`,meta:{a,b,c,d}});}),
 gen('55-E-lemma-tf',TE[4],r=>{const t=r.int(0,2);let s,v,why,meta;
   if(t===0){const m=r.int(6,60),a=r.int(2,60);v=gcd(a,m)===1;s=`For every integer x: if ${m} | ${a}x then ${m} | x.`;why=v?`gcd(${m}, ${a}) = 1, so by the generalized Euclid lemma ${m} | x.`:`gcd(${m}, ${a}) = ${gcd(a,m)} > 1: x = ${m/gcd(a,m)} gives ${m} | ${a*m/gcd(a,m)} but ${m} ∤ ${m/gcd(a,m)}.`;meta={t,m,a};}
   else if(t===1){const p=r.int(4,50),k=r.int(2,3);v=factorize(p).every(([q,e])=>e===1);s=`For every integer n: if ${p} | n${sup(k)} then ${p} | n.`;const rad=factorize(p).reduce((x,[q])=>x*q,1);
     why=v?`${p} = ${fmtFact(factorize(p))} is squarefree; each prime q | n${sup(k)} ⇒ q | n (Euclid's lemma), so their product divides n.`:`n = ${factorize(p).reduce((x,[q,e])=>x*Math.pow(q,Math.ceil(e/k)),1)} is a counterexample (${p} = ${fmtFact(factorize(p))} is not squarefree).`;meta={t,p,k};}
   else{const a=r.int(2,15),b=r.int(2,15);v=gcd(a,b)===1;s=`For every integer n: if ${a} | n and ${b} | n then ${a*b} | n.`;why=v?`gcd(${a}, ${b}) = 1, so lcm(${a}, ${b}) = ${a*b}.`:`lcm(${a}, ${b}) = ${lcm(a,b)} < ${a*b}: n = ${lcm(a,b)} is a counterexample.`;meta={t,a,b};}
   if(!v&&r.float()<0.3)return null;
   return Q(`<p>True or false?</p><p style="text-align:center"><b>${s}</b></p>`,'tf',v,{hint:'Euclid’s lemma needs coprimality: if m | ab and gcd(m, a) = 1 then m | b.',solution:`<p><b>${v?'True':'False'}</b>. ${why}</p>`,meta});}),
 gen('55-E-diophantine',TE[1],r=>{const g0=r.int(1,4);const a=g0*r.int(2,15),b=g0*r.int(2,15);if(a===b)return null;const g=gcd(a,b);const c=r.int(30,400);if(c%g&&r.float()<0.7)return null;
   let cnt=0,sol;if(c%g){sol=`gcd(${a}, ${b}) = ${g} ∤ ${c}: no integer solutions at all.`;}
   else{const [,x0,y0]=egcd(a,b);const X=x0*c/g,Y=y0*c/g,db=b/g,da=a/g;const ceilDiv=(p,q)=>-Math.floor(-p/q);const lo=ceilDiv(-X,db),hi=Math.floor(Y/da);cnt=Math.max(0,hi-lo+1);
     sol=`gcd = ${g} | ${c}. Bézout: ${a}·(${x0}) + ${b}·(${y0}) = ${g}, so a particular solution is x = ${X}, y = ${Y}. General: x = ${X} + ${db}t, y = ${Y} − ${da}t. x ≥ 0 ⇔ t ≥ ${lo}; y ≥ 0 ⇔ t ≤ ${hi}. Count = ${cnt}.`;}
   return Q(`<p>How many solutions in NONNEGATIVE integers (x, y) does ${a}x + ${b}y = ${c} have?</p>`,'num',cnt,{hint:'Solvable iff gcd(a, b) | c. Find one solution via extended Euclid, write the general solution x = x₀ + (b/g)t, y = y₀ − (a/g)t, and count the t with both ≥ 0.',
     solution:`<p>${sol} Answer <b>${cnt}</b>.</p>`,meta:{a,b,c}});}),
];

// =========================================================
// 55-F  CRT, Fermat, RSA
// =========================================================
const TFt=['CRT systems with 2–3 congruences; check coprimality','Fermat’s little theorem to reduce huge powers; inverses via Fermat','RSA: n, φ(n), d from e; encrypt/decrypt small numbers; why decryption works','Fermat test / pseudoprime concepts'];
const inv=(a,m)=>{const [g,x]=egcd(mod(a,m),m);return g===1?mod(x,m):null;};
G['55-F']=[
 gen('55-F-crt',TFt[0],r=>{const k=r.pick([2,3,3]);const ms=[];while(ms.length<k){const m=r.int(3,k===2?40:19);if(ms.every(x=>gcd(x,m)===1))ms.push(m);}const as=ms.map(m=>r.int(0,m-1));
   const M=ms.reduce((a,b)=>a*b,1);let x=0;const parts=ms.map((m,i)=>{const Mi=M/m,yi=inv(Mi,m);x+=as[i]*Mi*yi;return `M${i+1} = ${Mi}, y${i+1} = ${Mi}⁻¹ mod ${m} = ${yi}`;});x=mod(x,M);
   return Q(`<p>Find the smallest nonnegative x with</p>${ul(ms.map((m,i)=>`x ≡ ${as[i]} (mod ${m})`))}`,'num',x,{hint:'Moduli are pairwise coprime ⇒ CRT: x = ∑ aᵢMᵢyᵢ mod M with Mᵢ = M/mᵢ and yᵢ = Mᵢ⁻¹ mod mᵢ (or back-substitute).',
     solution:`<p>M = ${ms.join('·')} = ${M}. ${parts.join('; ')}. x = ∑ aᵢMᵢyᵢ mod ${M} = <b>${x}</b>.</p>`,meta:{ms,as}});}),
 gen('55-F-crt-noncoprime',TFt[0],r=>{const g=r.int(2,6);const m1=g*r.int(2,9),m2=g*r.int(2,9);if(m1===m2||gcd(m1,m2)===1)return null;const a1=r.int(0,m1-1);const ok=r.bool();const a2=ok?mod(a1+gcd(m1,m2)*r.int(0,20),m2):r.int(0,m2-1);
   const L=lcm(m1,m2);const sol=range(0,L-1).find(x=>x%m1===a1&&x%m2===a2);const ans=sol===undefined?-1:sol;const d=gcd(m1,m2);
   return Q(`<p>Find the smallest nonnegative x with x ≡ ${a1} (mod ${m1}) and x ≡ ${a2} (mod ${m2}). If there is no solution, enter −1.</p>`,'num',ans,{hint:'The moduli are NOT coprime: a solution exists iff gcd(m₁, m₂) | a₁ − a₂; it is then unique mod lcm(m₁, m₂).',
     solution:`<p>gcd(${m1}, ${m2}) = ${d}; a₁ − a₂ = ${sn(a1-a2)} ${(a1-a2)%d===0?`is divisible by ${d}, so a solution exists, unique mod lcm = ${L}: x = <b>${ans}</b>.`:`is not divisible by ${d}: <b>no solution</b> (−1).`}</p>`,meta:{m1,m2,a1,a2}});}),
 gen('55-F-fermat-reduce',TFt[1],r=>{const p=r.pick(primesUpTo(60).filter(x=>x>5));const a=r.int(2,200);if(a%p===0)return null;const k=r.int(6,15),c=r.int(1,999);const E=10n**BigInt(k)+BigInt(c);
   const ans=Number(((()=>{let b=BigInt(a)%BigInt(p),e=E,res=1n;while(e>0n){if(e&1n)res=res*b%BigInt(p);b=b*b%BigInt(p);e>>=1n;}return res;})()));const red=Number(E%BigInt(p-1));
   return Q(`<p>Use Fermat's little theorem to compute ${a}<sup>10<sup>${k}</sup> + ${c}</sup> mod ${p}.</p>`,'num',ans,{hint:`${p} is prime and ${p} ∤ ${a}, so ${a}^${p-1} ≡ 1: reduce the exponent mod ${p-1}.`,
     solution:`<p>10<sup>${k}</sup> + ${c} ≡ ${red} (mod ${p-1}) (note 10<sup>${k}</sup> mod ${p-1} = ${powmod(10,k,p-1)}). So ${a}<sup>…</sup> ≡ ${a%p}<sup>${red}</sup> ≡ <b>${ans}</b> (mod ${p}).</p>`,meta:{p,a,k,c}});}),
 gen('55-F-fermat-inverse',TFt[1],r=>{const p=r.pick(primesUpTo(100).filter(x=>x>10));const a=r.int(2,p-1);const ans=powmod(a,p-2,p);
   return Q(`<p>${p} is prime. Using Fermat's little theorem, a<sup>−1</sup> ≡ a<sup>${p-2}</sup> (mod ${p}). Find the inverse of ${a} modulo ${p} (in 1…${p-1}).</p>`,'num',ans,{hint:`a^(p−1) ≡ 1 ⇒ a·a^(p−2) ≡ 1. Compute ${a}^${p-2} mod ${p} by successive squaring.`,
     solution:`<p>${a}<sup>${p-2}</sup> mod ${p} = <b>${ans}</b>. Check: ${a}·${ans} = ${a*ans} ≡ ${a*ans%p} (mod ${p}).</p>`,meta:{p,a}});}),
 gen('55-F-rsa-d',TFt[2],r=>{const ps=primesUpTo(97).filter(x=>x>10);const p=r.pick(ps);let q=r.pick(ps);if(p===q)return null;const ph=(p-1)*(q-1);const e=r.pick([3,5,7,11,13,17,19,23]);if(gcd(e,ph)!==1)return null;const d=inv(e,ph);
   return Q(`<p>RSA with p = ${p}, q = ${q}, public exponent e = ${e}. Compute the private exponent d (0 < d < φ(n)).</p>`,'num',d,{hint:'n = pq, φ(n) = (p−1)(q−1), d = e⁻¹ mod φ(n) via extended Euclid.',
     solution:`<p>n = ${p*q}, φ(n) = ${p-1}·${q-1} = ${ph}. Extended Euclid on (${e}, ${ph}) gives ${e}·${d} = ${e*d} = ${Math.floor(e*d/ph)}·${ph} + 1, so d = <b>${d}</b>.</p>`,meta:{p,q,e}});}),
 gen('55-F-rsa-crypt',TFt[2],r=>{const ps=primesUpTo(60).filter(x=>x>5);const p=r.pick(ps),q=r.pick(ps);if(p===q)return null;const n=p*q,ph=(p-1)*(q-1);const e=r.pick([3,5,7,11,13,17]);if(gcd(e,ph)!==1)return null;const d=inv(e,ph);
   const enc=r.bool();const M=r.int(2,n-1);const Cc=powmod(M,e,n);
   if(enc)return Q(`<p>RSA public key (n, e) = (${n}, ${e}). Encrypt the message M = ${M}: give C = M<sup>e</sup> mod n.</p>`,'num',Cc,{hint:'Successive squaring mod n.',solution:`<p>C = ${M}<sup>${e}</sup> mod ${n} = <b>${Cc}</b>.</p>`,meta:{n,e,M,enc}});
   return Q(`<p>RSA with p = ${p}, q = ${q}, e = ${e}. You receive ciphertext C = ${Cc}. Decrypt it (find M with 0 ≤ M < n).</p>`,'num',M,{hint:'Find d = e⁻¹ mod (p−1)(q−1), then M = C^d mod n. (Works because M^(ed) = M^(1 + kφ(n)) ≡ M by Fermat/Euler + CRT.)',
     solution:`<p>n = ${n}, φ = ${ph}, d = ${d}. M = ${Cc}<sup>${d}</sup> mod ${n} = <b>${M}</b>. Check: ${M}<sup>${e}</sup> mod ${n} = ${Cc}.</p>`,meta:{n,e,C:Cc,enc,p,q}});}),
 ...(()=>{const PSP=[341,561,645,1105,1387,1729,1905,2047,2465,2701,2821,3277,4033,4369,4371,4681,5461,6601,8321,8481,91,217,15,85,703,1891];
   return [gen('55-F-fermat-test',TFt[3],r=>{const t=r.float();const n=t<0.6?r.pick(PSP):t<0.8?r.pick(primesUpTo(3000).filter(x=>x>100)):r.int(50,3000)|1;const b=r.int(2,12);if(n%b===0)return null;
     const passes=powmod(b,n-1,n)===1;const comp=!isPrime(n);const askPsp=r.bool();const v=askPsp?passes&&comp:passes;if(!v&&r.float()<0.3)return null;
     const fac=comp?fmtFact(factorize(n)):'prime';
     return Q(`<p>True or false: ${askPsp?`${n} is a <b>Fermat pseudoprime to base ${b}</b>`:`${n} <b>passes the Fermat test to base ${b}</b>, i.e. ${b}<sup>${n-1}</sup> ≡ 1 (mod ${n})`}.</p>`,'tf',v,{
       hint:'Compute b^(n−1) mod n by successive squaring (or reduce mod each prime factor and use CRT). A pseudoprime must be COMPOSITE and pass the test.',
       solution:`<p>${b}<sup>${n-1}</sup> mod ${n} = ${powmod(b,n-1,n)} ⇒ ${passes?'passes':'fails'}. ${n} is ${comp?'composite ('+fac+')':'prime'}. So the statement is <b>${v}</b>.</p>`,meta:{n,b,askPsp}});}),
    gen('55-F-fermat-witness',TFt[3],r=>{const n=r.float()<0.7?r.pick(PSP):r.int(30,2000)|1;if(isPrime(n))return null;let b=2;while(powmod(b,n-1,n)===1)b++;if(b<3&&r.float()<0.6)return null;
     return Q(`<p>${n} is composite. What is the smallest base b ≥ 2 that is a <b>Fermat witness</b> for ${n}, i.e. b<sup>${n-1}</sup> ≢ 1 (mod ${n})?</p>`,'num',b,{hint:'Test b = 2, 3, … with successive squaring; any b sharing a factor with n is automatically a witness.',
      solution:`<p>${range(2,b).map(x=>`${x}<sup>${n-1}</sup> ≡ ${powmod(x,n-1,n)}`).join(', ')} (mod ${n}). First failure at b = <b>${b}</b>. (${n} = ${fmtFact(factorize(n))}.)</p>`,meta:{n}});})];})(),
];

// =========================================================
// 55-G  Induction, strong induction, well-ordering
// =========================================================
const TG=['Induction for sums, inequalities, divisibility','Strong induction (postage, prime factorization, games)','Well-ordering proofs','Choosing the right base cases','Find the flaw in a bogus induction'];
const frob=(a,b)=>a*b-a-b;
const formable=(n,st)=>{const ok=[true];for(let x=1;x<=n;x++)ok[x]=st.some(s=>x>=s&&ok[x-s]);return ok;};
G['55-G']=[
 gen('55-G-sum-closed',TG[0],r=>{const a=r.int(1,9),b=r.int(-9,9);if(b===0)return null;const A=2*a,B=a+3*b;
   return Q(`<p>Prove by induction that ∑<sub>i=1</sub><sup>n</sup> (${lin([[a,'i²'],[b,'i']])}) = n(n + 1)(An + B)/6. Find the constants A and B (enter A, B).</p>`,'list',[A,B],{
     hint:'Use n = 1 and n = 2 to get two equations (base case), then check the inductive step F(k) + f(k+1) = F(k+1).',
     solution:`<p>∑ i² = n(n+1)(2n+1)/6 and ∑ i = n(n+1)/2 = 3n(n+1)/6, so the sum is n(n+1)[${a}(2n+1) + ${3*b}]/6 = n(n+1)(${A}n + ${B})/6. A = <b>${A}</b>, B = <b>${B}</b>.</p><p>Inductive step: n(n+1)(${A}n+${B})/6 at n = k plus (${lin([[a,'(k+1)²'],[b,'(k+1)']])}) factors as (k+1)(k+2)(${A}(k+1)+${B})/6.</p>`,meta:{a,b}});}),
 gen('55-G-step-term',TG[0],r=>{const a=r.int(1,5),b=r.int(-6,6),c=r.int(-6,6);const A=a,B=2*a+b,Cc=a+b+c;
   return Q(`<p>Inductive step for a claim ∑<sub>i=1</sub><sup>n</sup> (${lin([[a,'i²'],[b,'i'],[c,'']])}) = F(n): assuming the formula for n = k, we must show F(k) + ▢ = F(k + 1). Writing the missing term ▢ as Ak² + Bk + C, enter A, B, C.</p>`,'list',[A,B,Cc],{
     hint:'The missing term is the (k+1)-st summand: substitute i = k + 1 and expand.',solution:`<p>▢ = ${a}(k+1)² ${b<0?'−':'+'} ${Math.abs(b)}(k+1) ${c<0?'−':'+'} ${Math.abs(c)} = <b>${lin([[A,'k²'],[B,'k'],[Cc,'']])}</b>.</p>`,meta:{a,b,c}});}),
 gen('55-G-div-step',TG[0],r=>{const a=r.int(3,12),b=r.int(2,9);if(a===b)return null;const c=r.int(-4,6);if(c===0)return null;const d=gcd(Math.abs(a+c*b),Math.abs(c*(b-a)));if(d<3)return null;const M=c*(b-a);
   return Q(`<p>Claim: ${d} | ${a}<sup>n</sup> ${c<0?'−':'+'} ${Math.abs(c)===1?'':Math.abs(c)+'·'}${b}<sup>n</sup> for all n ≥ 1. In the inductive step one writes</p><p style="text-align:center">${a}<sup>k+1</sup> ${c<0?'−':'+'} ${Math.abs(c)===1?'':Math.abs(c)+'·'}${b}<sup>k+1</sup> = ${a}·(${a}<sup>k</sup> ${c<0?'−':'+'} ${Math.abs(c)===1?'':Math.abs(c)+'·'}${b}<sup>k</sup>) + M·${b}<sup>k</sup>.</p><p>Find the integer M (it must be a multiple of ${d} for the proof to work).</p>`,'num',M,{
     hint:`Expand ${a}·(${a}ᵏ + c·${b}ᵏ) and subtract it from the left side.`,solution:`<p>${a}·(${a}<sup>k</sup> + ${c}·${b}<sup>k</sup>) = ${a}<sup>k+1</sup> + ${c*a}·${b}<sup>k</sup>, and ${c}·${b}<sup>k+1</sup> = ${c*b}·${b}<sup>k</sup>. So M = ${c*b} − ${c*a} = <b>${M}</b> = ${d}·${M/d}. Base case n = 1: ${a+c*b} = ${d}·${(a+c*b)/d}.</p>`,meta:{a,b,c,d}});}),
 gen('55-G-ineq-base',TG[3],r=>{const t=r.int(0,2);let n0,s,fails;const B=BigInt;
   if(t===0){const c=r.int(0,40),k=r.int(2,3);const P=n=>2n**B(n)>B(n)**B(k)+B(c);let last=-1;for(let n=0;n<=200;n++)if(!P(n))last=n;n0=last+1;s=`2<sup>n</sup> > n${sup(k)}${c?` + ${c}`:''}`;fails=last;}
   else if(t===1){const a=r.int(2,6);const P=n=>{let f=1n;for(let i=2;i<=n;i++)f*=B(i);return f>B(a)**B(n);};let last=-1;for(let n=0;n<=100;n++)if(!P(n))last=n;n0=last+1;s=`n! > ${a}<sup>n</sup>`;fails=last;}
   else{const c=r.int(1,5),k=r.int(2,4);const P=n=>3n**B(n)>B(c)*B(n)**B(k);let last=-1;for(let n=0;n<=200;n++)if(!P(n))last=n;n0=last+1;s=`3<sup>n</sup> > ${c===1?'':c}n${sup(k)}`;fails=last;}
   if(n0<2)return null;
   return Q(`<p>We want to prove ${s} by induction for all n ≥ n₀. What is the smallest n₀ for which the statement is true for EVERY n ≥ n₀ (the base case to use)?</p>`,'num',n0,{hint:'Check small n directly; the inductive step typically works once n is moderately large, but the base case must be the first n after the LAST failure.',
     solution:`<p>The statement fails at n = ${fails} and holds for all n ≥ ${n0} (the ratio of the two sides keeps growing from there, which is what the inductive step shows). Base case n₀ = <b>${n0}</b>.</p>`,meta:{t,s}});}),
 gen('55-G-postage-frobenius',TG[1],r=>{const a=r.int(3,13),b=r.int(a+1,25);if(gcd(a,b)!==1)return null;const F=frob(a,b);
   return Q(`<p>Using only ${a}-cent and ${b}-cent stamps, what is the LARGEST postage amount that CANNOT be formed? (Every larger amount can — that is what the strong-induction proof shows.)</p>`,'num',F,{
     hint:'For coprime a, b the answer is ab − a − b (Sylvester); verify by finding a run of a consecutive formable amounts.',
     solution:`<p>gcd(${a}, ${b}) = 1, so the largest non-formable amount is ${a}·${b} − ${a} − ${b} = <b>${F}</b>. Amounts ${F+1} … ${F+a} are all formable, and adding ${a}-cent stamps covers everything above (strong induction with ${a} base cases).</p>`,meta:{st:[a,b]}});}),
 gen('55-G-postage-three',TG[1],r=>{const st=r.sample(range(4,20),3).sort((x,y)=>x-y);if(gcd(gcd(st[0],st[1]),st[2])!==1)return null;const ok=formable(600,st);let last=-1;for(let x=0;x<=600;x++)if(!ok[x])last=x;if(last<10||last>550)return null;
   return Q(`<p>Stamps come in ${st.join(', ')} cents. What is the largest amount that cannot be made?</p>`,'num',last,{hint:`List formable amounts in order until you find ${st[0]} consecutive ones; everything after follows by adding ${st[0]}-cent stamps.`,
     solution:`<p>Building the table of formable amounts, ${last} is not formable while ${last+1} … ${last+st[0]} all are; adding ${st[0]}-cent stamps (strong induction) gives everything beyond. Answer <b>${last}</b>.</p>`,meta:{st}});}),
 gen('55-G-postage-base',TG[3],r=>{const a=r.int(3,11),b=r.int(a+1,22);if(gcd(a,b)!==1)return null;const n0=frob(a,b)+1;
   return Q(`<p>Prove by strong induction that every amount n ≥ n₀ can be made from ${a}- and ${b}-cent stamps, with the inductive step “P(k + 1 − ${a}) ⇒ P(k + 1)” (add a ${a}-cent stamp). Enter n₀ (the smallest possible) and the number of consecutive base cases n₀, n₀ + 1, … that must be checked.</p>`,'list',[n0,a],{
     hint:'n₀ is one more than the largest non-formable amount; the step reaches back a cents, so the base cases must cover a consecutive values.',
     solution:`<p>Largest non-formable: ${a}·${b} − ${a} − ${b} = ${n0-1}, so n₀ = <b>${n0}</b>. Since P(k+1) uses P(k+1−${a}), we need k + 1 − ${a} ≥ n₀, so the base cases are n₀, …, n₀ + ${a-1}: <b>${a}</b> of them.</p>`,meta:{a,b}});}),
 gen('55-G-wop-gcd',TG[2],r=>{const k=r.int(2,3);const g=r.int(1,9);const ns=range(1,k).map(()=>g*r.int(5,60));if(new Set(ns).size<k)return null;const G0=ns.reduce(gcd);
   const names=['a','b','c'].slice(0,k),vars=['s','t','u'].slice(0,k);
   return Q(`<p>Well-ordering proof of Bézout: S = {${ns.map((n,i)=>`${n}${vars[i]}`).join(' + ')} : ${vars.join(', ')} ∈ ℤ} ∩ ℤ<sup>+</sup> is nonempty, so it has a least element d. What is d?</p>`,'num',G0,{
     hint:'The least positive integer combination is the gcd (d divides each number by the division-algorithm argument, and every common divisor divides d).',
     solution:`<p>The WOP argument shows d divides each of ${ns.join(', ')} (otherwise a remainder would be a smaller positive element) and every common divisor divides d, so d = gcd(${ns.join(', ')}) = <b>${G0}</b>.</p>`,meta:{ns}});}),
 gen('55-G-basecases-mc',TG[3],r=>{const n0=r.int(0,5);const offs=r.sample([1,2,3,4],r.int(1,2)).sort();const mx=Math.max(...offs);if(mx===1&&r.float()<0.7)return null;
   const cor=range(n0,n0+mx-1);const fmt=s=>`P(${s.join('), P(')})`;
   const cands=[range(n0,n0),range(n0,n0+mx),range(n0,n0+Math.max(0,mx-2)),range(n0,n0+offs[0]-1),range(n0+1,n0+mx),[...new Set([n0,n0+mx-1])],range(n0,n0+mx+1)].filter(s=>s.length);
   const m=mc(r,fmt(cor),cands.map(fmt));if(!m)return null;
   return Q(`<p>A sequence is defined for n ≥ ${n0} and the inductive step for P(k + 1) uses ${offs.map(o=>o===1?'P(k)':`P(k + 1 − ${o})`).join(' and ')}. Which base cases are needed (and enough) for a correct strong-induction proof of P(n) for all n ≥ ${n0}?</p>`,'mc',m.answer,{choices:m.choices,
     hint:'The step for P(n) is valid only if every case it uses is ≥ n₀; the n where that fails must be base cases.',
     solution:`<p>The step for P(n) needs n − ${mx} ≥ ${n0}, i.e. n ≥ ${n0+mx}. So n = ${n0}, …, ${n0+mx-1} must be checked directly: <b>${fmt(cor)}</b>.</p>`,meta:{n0,offs,choices:m.choices}});}),
 gen('55-G-ih-mc',TG[3],r=>{const t=r.int(0,2);const n0=r.int(1,3);
   const CH=['P(k)','P(k − 1) and P(k)','P(j) for all j with '+n0+' ≤ j ≤ k','P(k + 1)','P(j) for all j ≥ '+n0];let rec,cor,expl;
   if(t===0){const c=r.int(2,5);rec=`a<sub>n</sub> = ${c}a<sub>n−1</sub> + ${r.int(1,9)}`;cor=0;expl='the step only uses a<sub>k</sub>, so ordinary induction with P(k) suffices';}
   else if(t===1){rec=`a<sub>n</sub> = ${r.int(1,5)}a<sub>n−1</sub> + ${r.int(1,5)}a<sub>n−2</sub>`;cor=1;expl='the step uses the two previous terms, so the hypothesis must include P(k − 1) and P(k)';}
   else{rec=`a<sub>n</sub> = ${r.pick(['2','3',''])}a<sub>⌊n/2⌋</sub> + ${r.pick(['n','1','n²'])}`;cor=2;expl='the step uses a<sub>⌊(k+1)/2⌋</sub>, which can be ANY earlier index, so strong induction is needed';}
   const idx=r.shuffle([0,1,2,3,4]);
   return Q(`<p>To prove a property P(n) of the sequence ${rec} (n > ${n0}) for all n ≥ ${n0}, what is the WEAKEST inductive hypothesis that makes the step “⇒ P(k + 1)” work?</p>`,'mc',idx.indexOf(cor),{choices:idx.map(i=>CH[i]),
     hint:'Look at which earlier terms the recurrence for a_{k+1} uses. Never assume P(k+1) (circular) or P(j) for all j (that is the conclusion).',
     solution:`<p>Here ${expl}: <b>${CH[cor]}</b>. Assuming P(k + 1) or P(j) for all j assumes what we are proving.</p>`,meta:{t,choices:idx.map(i=>CH[i])}});}),
 gen('55-G-bogus',TG[4],r=>{const n0=r.int(0,4);const p=r.pick([2,3,4,-1,-2,5]);const q=1-p;const c=r.int(1,9);let d=r.int(-5,12);if(d===c)return null;
   const seq={};seq[n0-1]=d;seq[n0]=c;for(let n=n0+1;n<=n0+8;n++)seq[n]=p*seq[n-1]+q*seq[n-2];const firstBad=range(n0,n0+8).find(n=>seq[n]!==c);
   const ask=r.bool();const ans=ask?firstBad:firstBad-1;
   return Q(`<p>Let a<sub>${n0-1}</sub> = ${sn(d)}, a<sub>${n0}</sub> = ${c}, and a<sub>n</sub> = ${lin([[p,'a<sub>n−1</sub>'],[q,'a<sub>n−2</sub>']])} for n ≥ ${n0+1}. Bogus “proof” that a<sub>n</sub> = ${c} for all n ≥ ${n0}:</p>
     <p><i>Base case: a<sub>${n0}</sub> = ${c}. Inductive step: assume a<sub>j</sub> = ${c} for all ${n0} ≤ j ≤ k. Then a<sub>k+1</sub> = ${p}·a<sub>k</sub> ${q<0?'−':'+'} ${Math.abs(q)}·a<sub>k−1</sub> = ${p}·${c} ${q<0?'−':'+'} ${Math.abs(q)}·${c} = ${c}.</i></p>
     <p>${ask?'What is the smallest n ≥ '+n0+' for which a<sub>n</sub> ≠ '+c+'?':'For which value of k is the inductive step P('+n0+'), …, P(k) ⇒ P(k + 1) INVALID (the first one)?'}</p>`,'num',ans,{
     hint:'The step uses a_{k−1}; check whether k − 1 is covered by the hypothesis (k − 1 ≥ n₀) for the smallest k.',
     solution:`<p>For k = ${n0} the step uses a<sub>${n0-1}</sub> = ${sn(d)}, which is NOT covered by the hypothesis (only one base case was checked). Indeed a<sub>${n0+1}</sub> = ${p}·${c} ${q<0?'−':'+'} ${Math.abs(q)}·(${sn(d)}) = ${seq[n0+1]} ≠ ${c}. ${ask?`Smallest bad n = <b>${firstBad}</b>.`:`The invalid step is k = <b>${n0}</b>.`} (The fix would need base cases a<sub>${n0}</sub> and a<sub>${n0+1}</sub>, but a<sub>${n0+1}</sub> ≠ ${c}.)</p>`,meta:{n0,p,q,c,d,ask}});}),
 gen('55-G-least-counterexample',TG[2],r=>{const SETS=[['perfect squares (1, 4, 9, …)',n=>{const o=[];for(let i=1;i*i<=n;i++)o.push(i*i);return o;},[2,3]],['positive cubes (1, 8, 27, …)',n=>{const o=[];for(let i=1;i*i*i<=n;i++)o.push(i*i*i);return o;},[2,3,4,5,6,7,8]],
     ['triangular numbers (1, 3, 6, 10, …)',n=>{const o=[];for(let i=1;i*(i+1)/2<=n;i++)o.push(i*(i+1)/2);return o;},[1,2]],['powers of 2 (1, 2, 4, 8, …)',n=>{const o=[];for(let p=1;p<=n;p*=2)o.push(p);return o;},[1,2,3,4,5,6,7]],
     ['Fibonacci numbers (1, 2, 3, 5, 8, …)',n=>{const o=[1,2];while(o[o.length-1]+o[o.length-2]<=n)o.push(o[o.length-1]+o[o.length-2]);return o;},[1,2,3,4]],['numbers that are 1 or prime (1, 2, 3, 5, 7, …)',n=>[1].concat(primesUpTo(n)),[1,2]]];
   const [nm,gen2,ks]=r.pick(SETS);const k=r.pick(ks);const LIM=3000;const S=gen2(LIM);const best=[0];let ans=-1;for(let n=1;n<=LIM;n++){let b=Infinity;for(const s of S){if(s>n)break;b=Math.min(b,best[n-s]+1);}best[n]=b;if(b>k&&ans<0)ans=n;}
   if(ans<0)return null;
   return Q(`<p>Claim: “every positive integer is a sum of at most ${k} ${nm} (repetition allowed).” The claim is false; by the well-ordering principle the set of counterexamples has a LEAST element. Find it.</p>`,'num',ans,{
     hint:'Compute, for n = 1, 2, 3, …, the minimum number of terms needed (each n reuses the answers for n − s), and stop at the first n needing more than k.',
     solution:`<p>Minimum number of terms for n = 1…${ans}: ${best.slice(1,ans+1).join(', ')}. The first n needing more than ${k} is <b>${ans}</b>.</p>`,meta:{nm,k}});}),
 gen('55-G-bogus-base',TG[4],r=>{const T=[{m:2,f:(t,d)=>[[1,2],[2*t+1,1],[d,0]],diff:(t)=>`2(n + ${t+1})`},{m:3,f:(t,d)=>[[1,3],[3*t-1,1],[d,0]],diff:t=>`3(n² + n ${t<0?'−':'+'} ${Math.abs(t)})`},{m:6,f:(t,d)=>[[1,3],[6*t-1,1],[d,0]],diff:t=>`3n(n + 1) ${t<0?'−':'+'} ${Math.abs(6*t)}, and n(n + 1) is even`},{m:5,f:(t,d)=>[[1,5],[5*t-1,1],[d,0]],diff:t=>`5(n⁴ + 2n³ + 2n² + n ${t<0?'−':'+'} ${Math.abs(t)})`}];
   const tp=r.pick(T);const t=r.int(-3,3);if(tp.m===2&&t===-1)return null;const good=r.float()<0.35;const d=good?tp.m*r.int(-3,3):(()=>{let x;do{x=r.int(-9,9);}while(mod(x,tp.m)===0);return x;})();
   const terms=tp.f(t,d);const fstr=terms.map(([c,e])=>[c,e===0?'':e===1?'n':`n${sup(e)}`]);const F=n=>terms.reduce((s,[c,e])=>s+c*Math.pow(n,e),0);
   const CH=['The proof is correct and the statement is true','The base case is false, so the proof fails (in fact the statement is false for EVERY n ≥ 1)','The inductive step is invalid','The base case holds, but the statement fails for some larger n','The proof needs strong induction'];
   const k=mod(F(1),tp.m)===0?0:1;const idx=r.shuffle([0,1,2,3,4]);
   return Q(`<p>Claim: ${tp.m} | f(n) for all n ≥ 1, where f(n) = ${lin(fstr)}.</p><p><i>Proof. Base case: n = 1 is checked by computation. Inductive step: assume ${tp.m} | f(k). Then f(k + 1) − f(k) = ${tp.diff(t).replace(/\bn\b/g,'k')}, a multiple of ${tp.m}; so ${tp.m} | f(k + 1). ∎</i></p><p>Evaluate this argument.</p>`,'mc',idx.indexOf(k),{choices:idx.map(i=>CH[i]),
     hint:'Verify the algebra of the step for yourself, then actually compute the base case f(1).',
     solution:`<p>The step is valid: f(k+1) − f(k) is always a multiple of ${tp.m}, so f(n) mod ${tp.m} is the same for all n. f(1) = ${F(1)} ${k===0?`is divisible by ${tp.m}: the proof is <b>correct</b>.`:`≡ ${mod(F(1),tp.m)} (mod ${tp.m}) is NOT divisible: the base case fails, and since every f(n) ≡ f(1), the statement is false for every n.`}</p>`,meta:{m:tp.m,terms,choices:idx.map(i=>CH[i])}});}),
];

// =========================================================
// 55-H  Recursive definitions, structural induction, recursive algorithms
// =========================================================
const TH=['Recursive definitions of sequences, sets, strings','Structural induction on strings and trees','Correctness of recursive algorithms by induction','Compute recursive values; Hanoi-type counts'];
G['55-H']=[
 gen('55-H-rec2',TH[3],r=>{const a=r.int(-3,4),b=r.int(-3,5),c=r.int(-3,3),d=r.int(-3,3),e=r.int(-3,3);if(!c||!d)return null;const N=r.int(6,9);const f=[a,b];for(let n=2;n<=N;n++)f[n]=c*f[n-1]+d*f[n-2]+e*n;if(Math.abs(f[N])>1e6)return null;
   return Q(`<p>f(0) = ${sn(a)}, f(1) = ${sn(b)}, and f(n) = ${lin([[c,'f(n − 1)'],[d,'f(n − 2)'],[e,'n']])} for n ≥ 2. Compute f(${N}).</p>`,'num',f[N],{hint:'Build the table bottom-up; never recompute.',
     solution:`<p>${f.map((v,i)=>`f(${i}) = ${sn(v)}`).join(', ')}. So f(${N}) = <b>${sn(f[N])}</b>.</p>`,meta:{a,b,c,d,e,N}});}),
 gen('55-H-halving',TH[3],r=>{const k=r.int(1,3),a=r.int(1,5),t=r.pick(['n','1','n²']);const N=r.int(20,120);const g=n=>t==='n'?n:t==='1'?1:n*n;const memo={1:a};
   const F=n=>{if(memo[n]!==undefined)return memo[n];return memo[n]=k*F(Math.floor(n/2))+g(n);};const v=F(N);const chain=[];let x=N;while(x>=1){chain.push(x);x=Math.floor(x/2);}
   return Q(`<p>f(1) = ${a} and f(n) = ${k===1?'':k}f(⌊n/2⌋) + ${t} for n ≥ 2. Compute f(${N}).</p>`,'num',v,{hint:'Only the values on the halving chain N, ⌊N/2⌋, ⌊N/4⌋, … are needed; compute them from the bottom up.',
     solution:`<p>Chain: ${chain.join(' → ')}. Bottom-up: ${chain.slice().reverse().map(n=>`f(${n}) = ${memo[n]}`).join(', ')}. Answer <b>${v}</b>.</p>`,meta:{k,a,t,N}});}),
 gen('55-H-hanoi',TH[3],r=>{const V=[
    {s:'Tower of Hanoi (3 pegs, move n disks, never a larger disk on a smaller)',a:2,b:1,c:1,cf:'2ⁿ − 1'},
    {s:'Hanoi variant where every move must be between ADJACENT pegs (pegs in a row, move the stack from the left peg to the right peg)',a:3,b:2,c:2,cf:'3ⁿ − 1'},
    {s:'“Double Hanoi”: two identical disks of each of n sizes (identical disks may be stacked either way); move the whole stack',a:2,b:2,c:2,cf:'2ⁿ⁺¹ − 2'}];
   if(r.float()<0.3){const n=r.int(4,16),k=r.int(1,n);const v=Math.pow(2,n-k);
     return Q(`<p>In the optimal solution of the classic Tower of Hanoi with ${n} disks (disk 1 = smallest, disk ${n} = largest), how many times does disk ${k} move?</p>`,'num',v,{hint:'Let mₙ(k) be the moves of disk k: the recursion moves the top n−1 disks twice, so disk k < n moves twice as often as in the (n−1)-disk solution; the largest disk moves once.',
       solution:`<p>Disk ${n} moves once; each smaller disk moves twice as often as the next larger one, so disk ${k} moves 2<sup>${n}−${k}</sup> = <b>${v}</b> times. (Check: ∑ 2<sup>n−k</sup> = 2ⁿ − 1.)</p>`,meta:{disk:k,n}});}
   const v=r.pick(V);const n=r.int(3,15);const H=[0,v.c];for(let k=2;k<=n;k++)H[k]=v.a*H[k-1]+v.b;
   return Q(`<p>${v.s}. Let H(n) be the minimum number of moves for n ${v.s.includes('two identical')?'sizes':'disks'}; it satisfies H(1) = ${v.c} and H(n) = ${v.a}H(n − 1) + ${v.b}. Compute H(${n}).</p>`,'num',H[n],{
     hint:'Iterate, or solve the recurrence: H(n) + b/(a−1) grows geometrically.',
     solution:`<p>${H.slice(1).map((x,i)=>`H(${i+1}) = ${x}`).join(', ')}. Closed form: H(n) = ${v.cf}. H(${n}) = <b>${H[n]}</b>.</p>`,meta:{a:v.a,b:v.b,c:v.c,n}});}),
 gen('55-H-recset-num',TH[0],r=>{const x0=r.int(1,6),a=r.int(3,9),b=r.int(2,3);const op=r.pick(['mul','sq']);const BOUND=120;
   // S: x0 ∈ S; x ∈ S ⇒ x + a ∈ S and (b·x ∈ S | x² ∈ S)
   const inS=new Set([x0]);const st=[x0];while(st.length){const x=st.pop();for(const y of [x+a,op==='mul'?b*x:x*x])if(y<=BOUND&&!inS.has(y)){inS.add(y);st.push(y);}}
   const cands=r.sample(range(1,BOUND),6);const ans=cands.map((c,i)=>inS.has(c)?i:-1).filter(i=>i>=0);if(!ans.length||ans.length===6)return null;
   return Q(`<p>S ⊆ ℤ<sup>+</sup> is defined recursively: ${x0} ∈ S; if x ∈ S then x + ${a} ∈ S and ${op==='mul'?b+'x':'x²'} ∈ S. Which of these numbers are in S? Select all.</p>`,'multi',ans,{choices:cands.map(String),
     hint:`Work backwards: n ∈ S iff n = ${x0}, or n − ${a} ∈ S, or ${op==='mul'?`${b} | n and n/${b} ∈ S`:'n is a perfect square whose root is in S'}. Residues mod ${a} help.`,
     solution:ul(cands.map(c=>`${c}: ${inS.has(c)?'in S':'not in S'}`))+`<p>(Elements of S up to ${BOUND}: ${[...inS].sort((x,y)=>x-y).slice(0,40).join(', ')}${inS.size>40?', …':''}.)</p>`,meta:{x0,a,b,op,cands,BOUND}});}),
 gen('55-H-recset-str',TH[0],r=>{const RULES=[['0w1',w=>'0'+w+'1'],['1w0',w=>'1'+w+'0'],['w00',w=>w+'00'],['11w',w=>'11'+w],['0w0',w=>'0'+w+'0'],['w1',w=>w+'1'],['10w',w=>'10'+w],['ww',w=>w+w]];
   const rules=r.sample(RULES,r.int(2,3));const base=r.pick(['λ (the empty string)','0','1']);const b0=base[0]==='λ'?'':base;const n=r.int(6,10);
   const S=new Set([b0]);let frontier=[b0];while(frontier.length){const nf=[];for(const w of frontier)for(const [,f] of rules){const y=f(w);if(y.length<=n&&!S.has(y)){S.add(y);nf.push(y);}}frontier=nf;}
   const cnt=[...S].filter(w=>w.length===n).length;if(cnt<2)return null;
   return Q(`<p>A set S of bit strings is defined recursively: ${base} ∈ S; if w ∈ S then ${rules.map(x=>x[0]).join(', ')} ∈ S${rules.length>1?' (each rule may be applied)':''}. How many strings of length exactly ${n} are in S?</p>`,'num',cnt,{
     hint:'Generate S level by level (or reason about the form of the strings) and keep only distinct strings — different derivations can give the same string.',
     solution:`<p>Strings of length ${n} in S: ${[...S].filter(w=>w.length===n).sort().join(', ')}. Count = <b>${cnt}</b>.</p>`,meta:{rules:rules.map(x=>x[0]),b0,n}});}),
 gen('55-H-struct-tree',TH[1],r=>{const t=r.int(0,2);
   if(t===0){const a=r.int(-3,5),b=r.int(1,6),n=r.int(5,40);const v=a*n+b*(n-1);
     return Q(`<p>For full binary trees define f(single vertex) = ${sn(a)} and f(T₁·T₂) = f(T₁) + f(T₂) + ${b} (a new root joined to T₁ and T₂). By structural induction f(T) depends only on the number of leaves ℓ(T). Compute f(T) for a full binary tree with ${n} leaves.</p>`,'num',v,{
       hint:'Guess f(T) = αℓ(T) + β from small trees and prove it by structural induction (ℓ(T₁·T₂) = ℓ(T₁) + ℓ(T₂)).',solution:`<p>Claim f(T) = ${a}ℓ + ${b}(ℓ − 1): base ℓ = 1 gives ${a}; step: ${a}(ℓ₁+ℓ₂) + ${b}(ℓ₁−1+ℓ₂−1) + ${b} = ${a}ℓ + ${b}(ℓ−1). With ℓ = ${n}: <b>${v}</b>.</p>`,meta:{t,a,b,n}});}
   if(t===1){const h=r.int(2,9);const v=Math.pow(2,h+1)-1;
     return Q(`<p>Structural induction gives n(T) ≤ 2<sup>h(T)+1</sup> − 1 for full binary trees. What is the maximum number of vertices of a full binary tree of height ${h}?</p>`,'num',v,{hint:'n(T₁·T₂) = 1 + n(T₁) + n(T₂) and h(T₁·T₂) = 1 + max(h(T₁), h(T₂)).',solution:`<p>Maximum when both subtrees are maximal of height ${h-1}: N(h) = 1 + 2N(h−1), N(0) = 1, so N(${h}) = 2<sup>${h+1}</sup> − 1 = <b>${v}</b>.</p>`,meta:{t,h}});}
   const i=r.int(3,60);const ask=r.pick(['leaves','vertices']);const v=ask==='leaves'?i+1:2*i+1;
   return Q(`<p>A full binary tree has ${i} internal vertices. How many ${ask} does it have? (Provable by structural induction.)</p>`,'num',v,{hint:'Each internal vertex has exactly 2 children; structural induction gives ℓ = i + 1.',
     solution:`<p>Structural induction: ℓ(T) = i(T) + 1 (base: 1 leaf, 0 internal; step: ℓ₁+ℓ₂ = (i₁+1)+(i₂+1) = (i₁+i₂+1)+1). So ℓ = ${i+1}, n = ℓ + i = ${2*i+1}. Answer <b>${v}</b>.</p>`,meta:{t,i,ask}});}),
 gen('55-H-struct-string',TH[1],r=>{const p=r.int(1,4),m=r.int(2,3),c=r.int(0,3),q=r.int(-2,3);const n=r.int(6,10);const s=range(1,n).map(()=>r.pick(['a','b'])).join('');
   let v=c;const tr=[`f(λ) = ${c}`];let pre='';for(const ch of s){v=ch==='a'?v+p:m*v+q;pre+=ch;tr.push(`f(${pre}) = ${v}`);}
   return Q(`<p>For strings over {a, b} define f(λ) = ${c}, f(wa) = f(w) + ${p}, f(wb) = ${m}·f(w) ${q<0?'−':'+'} ${Math.abs(q)}. Compute f(${s}).</p>`,'num',v,{hint:'The definition peels letters off the RIGHT end; evaluate prefixes from left to right.',
     solution:`<p>${tr.join(', ')}. Answer <b>${v}</b>.</p>`,meta:{p,m,c,q,s}});}),
 gen('55-H-alg-calls',TH[2],r=>{const t=r.int(0,1);
   if(t===0){const n=r.int(20,2000);let calls=0,x=n;while(true){calls++;if(x===0)break;x=x%2===0?x/2:x-1;}
     return Q(`<p>Recursive algorithm:</p><pre class="code">power(a, n):  # n ≥ 0
  if n == 0: return 1
  if n is even: return power(a, n/2)²
  else: return a · power(a, n − 1)</pre><p>How many calls to power (including the first call power(a, ${n})) are made in total?</p>`,'num',calls,{
       hint:'Trace the argument: halve when even, subtract 1 when odd, until 0. (Correctness is by strong induction on n.)',
       solution:`<p>Arguments: ${(()=>{const s=[];let x=n;while(true){s.push(x);if(x===0)break;x=x%2===0?x/2:x-1;}return s.join(' → ');})()}. That is <b>${calls}</b> calls.</p>`,meta:{t,n}});}
   const a=r.int(100,5000),b=r.int(10,a-1);let calls=0,x=a,y=b;while(true){calls++;if(y===0)break;[x,y]=[y,x%y];}
   return Q(`<p>Recursive algorithm:</p><pre class="code">gcd(a, b):  # a ≥ b ≥ 0
  if b == 0: return a
  return gcd(b, a mod b)</pre><p>How many calls (including the first call gcd(${a}, ${b})) are made?</p>`,'num',calls,{hint:'Trace the pairs (a, b) → (b, a mod b) until b = 0.',
     solution:`<p>${(()=>{const s=[];let x=a,y=b;while(true){s.push(`(${x}, ${y})`);if(y===0)break;[x,y]=[y,x%y];}return s.join(' → ');})()}: <b>${calls}</b> calls, returning ${x}.</p>`,meta:{t,a,b}});}),
 gen('55-H-alg-ih',TH[2],r=>{const t=r.int(0,3);const CH=['Alg is correct on input n − 1','Alg is correct on all inputs k with 1 ≤ k < n','Alg is correct on input n','Alg is correct on inputs n − 1 and n − 2','Alg is correct on all inputs k ≥ 1'];
   const algs=[[`fact(n): if n == 1 return 1; else return n · fact(n − 1)`,0],[`fib(n): if n ≤ 2 return 1; else return fib(n − 1) + fib(n − 2)`,3],
     [`bits(n): if n == 1 return 1; else return 1 + bits(⌊n/2⌋)`,1],[`mpow(b, n, m): if n == 1 return b mod m; if n even return mpow(b, n/2, m)² mod m; else return (mpow(b, ⌊n/2⌋, m)² · b) mod m`,1],
     [`sumdigits(n): if n < 10 return n; else return (n mod 10) + sumdigits(⌊n/10⌋)`,1],[`tri(n): if n == 1 return 1; else return n + tri(n − 1)`,0],[`trib(n): if n ≤ 3 return 1; else return trib(n−1)+trib(n−2)+trib(n−3)`,-1]];
   const al=r.pick(algs.filter(x=>x[1]>=0));const idx=r.shuffle([0,1,2,3,4]);
   return Q(`<p>To prove by induction that the recursive algorithm</p><pre class="code">${al[0]}</pre><p>is correct for every n ≥ 1, the inductive step for input n should assume which hypothesis (the weakest one that works)?</p>`,'mc',idx.indexOf(al[1]),{choices:idx.map(i=>CH[i]),
     hint:'Look at the argument(s) of the recursive call(s). If they can be any smaller value (like ⌊n/2⌋), you need strong induction.',
     solution:`<p>The recursive call(s) use ${al[1]===0?'n − 1 only: ordinary induction':al[1]===3?'n − 1 and n − 2: both must be assumed (two base cases)':'⌊n/2⌋ or ⌊n/10⌋, which can be any smaller value: strong induction'} → <b>${CH[al[1]]}</b>. Assuming correctness on n itself or on all inputs is circular.</p>`,meta:{alg:al[0],choices:idx.map(i=>CH[i])}});}),
];

// =========================================================
// 55-I  Counting: product/sum rules, pigeonhole, permutations & combinations
// =========================================================
const TI=['Product / sum / subtraction / division rules; tree diagrams','Pigeonhole and generalized pigeonhole ⌈N/k⌉; choosing the pigeons cleverly','Permutations/combinations with restrictions (adjacent, not adjacent, at least one, committees)','Complement counting'];
const LET='ABCDEFGHIJ';
G['55-I']=[
 gen('55-I-strings',TI[0],r=>{const k=r.int(4,6),v=r.int(1,k-2),n=r.int(4,6);if(Math.pow(k,n)>50000)return null;const t=r.int(0,2);const vow=LET.slice(0,v).split(''),all=LET.slice(0,k).split('');let ans,desc,sol;
   if(t===0){ans=2*v*Math.pow(k,n-1)-v*v*Math.pow(k,n-2);desc=`start with a vowel OR end with a vowel`;sol=`|S| + |E| − |S ∩ E| = ${v}·${k}<sup>${n-1}</sup> + ${v}·${k}<sup>${n-1}</sup> − ${v}²·${k}<sup>${n-2}</sup>`;}
   else if(t===1){ans=k*Math.pow(k-1,n-1);desc=`have no two ADJACENT letters equal`;sol=`product rule: ${k} choices for the first letter, then ${k-1} for each next one: ${k}·${k-1}<sup>${n-1}</sup>`;}
   else{const h=Math.ceil(n/2);ans=v*Math.pow(k,n-1)+Math.pow(k,h)-v*Math.pow(k,h-1);desc=`start with a vowel OR are palindromes`;sol=`|start vowel| = ${v}·${k}<sup>${n-1}</sup>, |palindromes| = ${k}<sup>${h}</sup> (first ⌈n/2⌉ letters determine it), |both| = ${v}·${k}<sup>${h-1}</sup>; subtraction rule`;}
   return Q(`<p>Strings of length ${n} over the alphabet {${all.join(', ')}}, where the vowels are {${vow.join(', ')}}. How many strings ${desc}?</p>`,'num',ans,{hint:'Product rule for each piece; for “or”, add and subtract the overlap (subtraction rule).',
     solution:`<p>${sol} = <b>${ans}</b>.</p>`,meta:{k,v,n,t}});}),
 gen('55-I-circular',TI[0],r=>{const n=r.int(5,9);const t=r.int(0,4);let ans,desc,sol;
   if(t===0){ans=fact(n-1)-2*fact(n-2);desc=`if A and B refuse to sit next to each other`;sol=`Division rule: n!/n = (n−1)! = ${fact(n-1)} seatings. A, B together: glue them (${n-1} units around the table → (${n-2})!, times 2 orders) = ${2*fact(n-2)}. Answer ${fact(n-1)} − ${2*fact(n-2)}`;}
   else if(t===1){ans=fact(n-3)*6;desc=`if A, B and C must occupy three consecutive seats (in any order)`;sol=`Glue A, B, C into a block: ${n-2} units around the table → (${n-3})! = ${fact(n-3)}, times 3! = 6 internal orders`;}
   else if(t===2){ans=fact(n-1)/2;desc=`if seatings that are mirror images (reflections) of each other are ALSO considered the same`;sol=`(n−1)! rotation-classes, each paired with its reflection (no seating of ≥ 3 distinct people is its own mirror image): ${fact(n-1)}/2`;}
   else if(t===3){ans=fact(n-2);desc=`if B must sit immediately to A's right (clockwise neighbour)`;sol=`Fix A's seat (kills rotations); B's seat is forced; the other ${n-2} people fill the rest: (${n-2})!`;}
   else{ans=2*fact(n-3);desc=`if A must sit between B and C (B and C are A's two neighbours)`;sol=`Fix A; B and C take A's two neighbouring seats in 2 orders; the remaining ${n-3} people: 2·(${n-3})!`;}
   return Q(`<p>${n} people (including A, B, C) sit at a round table; seatings that differ only by a rotation are the same. How many seatings are there ${desc}?</p>`,'num',ans,{hint:'Division rule: fix one person to kill rotations ((n−1)! seatings); glue people who must sit together into a block.',
     solution:`<p>${sol} = <b>${ans}</b>.</p>`,meta:{n,t}});}),
 gen('55-I-pigeon-draw',TI[1],r=>{const k=r.int(3,5);const cs=range(1,k).map(()=>r.int(1,9));const rr=r.int(2,Math.max(...cs));const ans=sum(cs.map(c=>Math.min(c,rr-1)))+1;if(cs.every(c=>c>=rr-1)&&r.float()<0.6)return null;
   const cols=['red','blue','green','black','white'].slice(0,k);
   return Q(`<p>A drawer holds ${cs.map((c,i)=>`${c} ${cols[i]}`).join(', ')} socks. Socks are drawn in the dark. What is the minimum number that must be drawn to GUARANTEE ${rr} socks of the same colour?</p>`,'num',ans,{
     hint:'Worst case: draw as many as possible WITHOUT r of one colour (at most r−1 of each colour, but never more than that colour has), then one more.',
     solution:`<p>Worst case takes min(count, ${rr-1}) of each colour: ${cs.map(c=>Math.min(c,rr-1)).join(' + ')} = ${ans-1} socks with no ${rr} alike. The next sock forces it: <b>${ans}</b>.</p>`,meta:{cs,rr}});}),
 gen('55-I-pigeon-numbers',TI[1],r=>{const t=r.int(0,2);
   if(t===0){const N=r.int(8,16),S=r.int(N+2,2*N-1);// pairs {i, S−i} within 1..N
     const pairs=range(1,N).filter(i=>i<S-i&&S-i<=N).length;const ans=N-pairs+1;
     return Q(`<p>How many numbers must be chosen from {1, 2, …, ${N}} to guarantee that two of the chosen numbers add up to ${S}?</p>`,'num',ans,{hint:`Pigeonholes: the pairs {i, ${S}−i} inside the set, plus singletons that have no partner.`,
       solution:`<p>Pairs summing to ${S}: ${range(1,N).filter(i=>i<S-i&&S-i<=N).map(i=>`{${i}, ${S-i}}`).join(', ')} (${pairs} pairs); the other ${N-2*pairs} numbers are partnerless. One can pick ${N-pairs} numbers (all partnerless + one from each pair) with no sum ${S}; so <b>${ans}</b> are needed.</p>`,meta:{t,N,S}});}
   if(t===1){const m=r.int(4,12),N=r.int(m+3,40);const ans=m+1;
     return Q(`<p>What is the least number of integers that must be chosen from {1, …, ${N}} to guarantee that two of them have a difference divisible by ${m}?</p>`,'num',ans,{hint:`Pigeonholes = remainders mod ${m}.`,
       solution:`<p>Two numbers have difference divisible by ${m} iff they have the same remainder; there are ${m} remainders (all occur since ${N} ≥ ${m}). ${m} numbers can have distinct remainders; ${m}+1 cannot: <b>${ans}</b>.</p>`,meta:{t,N,m}});}
   const k=r.int(3,12),rr=r.int(3,9);const what=r.pick([['students','possible letter grades',5],['people','birth months',12],['cards','suits',4],['integers','remainders mod '+k,k]]);const kk=what[2];const ans=kk*(rr-1)+1;
   return Q(`<p>How many ${what[0]} are needed to guarantee that at least ${rr} of them share the same one of ${kk} ${what[1]}?</p>`,'num',ans,{hint:'Generalized pigeonhole: N objects in k boxes ⇒ some box has ≥ ⌈N/k⌉. Find the least N with ⌈N/k⌉ ≥ r.',
     solution:`<p>⌈N/${kk}⌉ ≥ ${rr} ⇔ N > ${kk}·${rr-1} ⇔ N ≥ <b>${ans}</b>.</p>`,meta:{t,kk,rr}});}),
 gen('55-I-line',TI[2],r=>{const n=r.int(5,9);const t=r.int(0,5);let ans,desc,sol,k=0;
   if(t===0){ans=fact(n)-2*fact(n-1);desc='A and B are NOT next to each other';sol=`all ${n}! minus A,B adjacent (glue: 2·(${n-1})!): ${fact(n)} − ${2*fact(n-1)}`;}
   else if(t===1){k=r.int(3,4);ans=fact(n-k+1)*fact(k);desc=`the ${k} people ${LET.slice(0,k).split('').join(', ')} stand together (consecutively, any order)`;sol=`glue them: (${n-k+1})! arrangements of units times ${k}! internal orders = ${fact(n-k+1)}·${fact(k)}`;}
   else if(t===2){ans=fact(n)/2-fact(n-1);desc='A stands somewhere to the left of B, but not directly next to B';sol=`by symmetry half of all orders have A left of B: ${fact(n)/2}; of those, A immediately left of B: (${n-1})! = ${fact(n-1)}; subtract`;}
   else if(t===3){ans=fact(n-2)*(n-2)*(n-3);desc='neither end of the line is occupied by A or B';sol=`choose the people at the two ends from the other ${n-2} (ordered): ${n-2}·${n-3}, then arrange the remaining ${n-2} in the middle: (${n-2})!`;}
   else if(t===4){k=r.int(1,n-3);ans=2*(n-k-1)*fact(n-2);desc=`there are exactly ${k} people standing between A and B`;sol=`positions of the pair (left one at 1…${n-k-1}): ${n-k-1}, times 2 orders of A/B, times (${n-2})! for the rest`;}
   else{ans=fact(n-3)*P(n-2,3);desc='no two of A, B, C stand next to each other';sol=`gap method: arrange the other ${n-3} people ((${n-3})!), then place A, B, C into distinct gaps among the ${n-2} gaps, in order: P(${n-2}, 3) = ${P(n-2,3)}`;}
   return Q(`<p>${n} people, including A, B${t===1&&k>=3||t===5?', C':''}${t===1&&k===4?', D':''}, line up in a row. How many orders are there in which ${desc}?</p>`,'num',ans,{hint:'Glue adjacent people into a block; for “not adjacent” use the complement or the gap method; use symmetry for “left of”.',solution:`<p>${sol} = <b>${ans}</b>.</p>`,meta:{n,t,k}});}),
 gen('55-I-committee',TI[2],r=>{const w=r.int(3,7),m=r.int(3,7),k=r.int(3,Math.min(6,w+m-2));const t=r.int(0,3);let ans,desc,sol;
   if(t===0){ans=C(w+m,k)-C(w,k)-C(m,k);desc='with at least one woman and at least one man';sol=`C(${w+m},${k}) − C(${w},${k}) − C(${m},${k}) (subtract all-women and all-men)`;}
   else if(t===1){ans=C(w+m,k)-C(m,k)-w*C(m,k-1);desc='with at least two women';sol=`complement: C(${w+m},${k}) − C(${m},${k}) − ${w}·C(${m},${k-1}) (subtract 0 or 1 woman)`;}
   else if(t===2){ans=C(w+m,k)-C(w+m-2,k-2);desc='if two particular people (Ann and Bob) refuse to serve together';sol=`C(${w+m},${k}) − C(${w+m-2},${k-2}) (subtract committees containing both)`;}
   else{ans=C(w+m-1,k)-C(w+m-2,k-1)+C(w+m-2,k-2);desc='if Ann will serve only if Bob also serves (Bob may serve without Ann)';sol=`no Ann: C(${w+m-1},${k}); Ann and Bob: C(${w+m-2},${k-2}). Total ${C(w+m-1,k)} + ${C(w+m-2,k-2)}`;ans=C(w+m-1,k)+C(w+m-2,k-2);}
   return Q(`<p>A committee of ${k} is chosen from ${w} women and ${m} men${t>=2?' (Ann and Bob are two of these people)':''}. How many committees are possible ${desc}?</p>`,'num',ans,{hint:'“At least” → complement. Pairs of people with conditions → split into cases by who is in.',solution:`<p>${sol} = <b>${ans}</b>.</p>`,meta:{w,m,k,t}});}),
 gen('55-I-complement',TI[3],r=>{const t=r.int(0,2);let ans,desc,sol,meta;
   if(t===0){const k=r.int(4,7),n=r.int(3,Math.min(k,5));ans=Math.pow(k,n)-P(k,n);desc=`How many strings of length ${n} over a ${k}-letter alphabet have at least one repeated letter?`;sol=`all ${k}<sup>${n}</sup> minus all-distinct P(${k},${n}) = ${Math.pow(k,n)} − ${P(k,n)}`;meta={t,k,n};}
   else if(t===1){const L=r.int(2,4),D=r.int(2,4),n=r.int(4,6);if(Math.pow(L+D,n)>50000)return null;ans=Math.pow(L+D,n)-Math.pow(L,n)-Math.pow(D,n);desc=`A password of length ${n} uses ${L} letters and ${D} digits (repetition allowed). How many contain at least one letter AND at least one digit?`;sol=`(${L+D})<sup>${n}</sup> − ${L}<sup>${n}</sup> − ${D}<sup>${n}</sup>`;meta={t,L,D,n};}
   else{const n=r.int(6,12),k=r.int(2,3);let s=0;for(let j=0;j<k;j++)s+=C(n,j);ans=Math.pow(2,n)-s;desc=`How many bit strings of length ${n} contain at least ${k} ones?`;sol=`2<sup>${n}</sup> − ${range(0,k-1).map(j=>`C(${n},${j})`).join(' − ')}`;meta={t,n,k};}
   return Q(`<p>${desc}</p>`,'num',ans,{hint:'Count the complement (“none”/“all distinct”/“fewer than k”) and subtract from the total.',solution:`<p>${sol} = <b>${ans}</b>.</p>`,meta});}),
 gen('55-I-complement2',TI[3],r=>{const t=r.int(0,2);let v,desc,sol,meta;
   if(t===0){const n=r.int(7,13),k=r.int(3,5),j=r.int(2,4);v=C(n,k)-C(n-j,k);desc=`How many ${k}-element subsets of {1, …, ${n}} contain at least one of 1, …, ${j}?`;sol=`C(${n}, ${k}) − C(${n-j}, ${k})`;meta={t,n,k,j};}
   else if(t===1){const m=r.int(3,5),n=r.int(m,7);if(Math.pow(n,m)>20000)return null;v=Math.pow(n,m)-P(n,m);desc=`How many functions from a ${m}-element set to a ${n}-element set are NOT one-to-one?`;sol=`${n}<sup>${m}</sup> − P(${n}, ${m}) = ${Math.pow(n,m)} − ${P(n,m)}`;meta={t,m,n};}
   else{const n=r.int(4,8);v=fact(n)-2*fact(n-1)+fact(n-2);desc=`How many permutations of 1, 2, …, ${n} have 1 NOT in the first position AND ${n} NOT in the last position?`;sol=`complement + inclusion–exclusion: ${n}! − (${n-1})! − (${n-1})! + (${n-2})!`;meta={t,n};}
   return Q(`<p>${desc}</p>`,'num',v,{hint:'Count the complement (none of the special elements / injective / the bad positions) and subtract.',solution:`<p>${sol} = <b>${v}</b>.</p>`,meta});}),
];

// =========================================================
// 55-J  Binomial theorem, combinatorial proofs, stars & bars, repeated letters
// =========================================================
const TJ=['Binomial coefficients; coefficient of xᵏ in an expansion','Identities (Pascal, Vandermonde, Σ k·C(n,k)) by combinatorial proof','Stars and bars with lower bounds','Permutations with repeated letters','Distinguishable/indistinguishable objects into boxes; lattice paths'];
const stirling2=(n,k)=>{const S=[[1]];for(let i=1;i<=n;i++){S[i]=[0];for(let j=1;j<=i;j++)S[i][j]=(S[i-1][j]||0)*j+(S[i-1][j-1]||0);}return S[n][k]||0;};
const partK=(n,k)=>{// partitions of n into at most k parts
  const f=(n,m,k)=>{if(n===0)return 1;if(k===0)return 0;let s=0;for(let p=Math.min(n,m);p>=1;p--)s+=f(n-p,p,k-1);return s;};return f(n,n,k);};
G['55-J']=[
 gen('55-J-coef',TJ[0],r=>{const n=r.int(5,12),a=r.pick([1,2,3,-1,-2,-3]),b=r.pick([1,2,3,-1,-2,-3]),i=r.int(1,n-1);if(a===1&&b===1)return null;const j=n-i;
   const v=CB(n,j)*BigInt(a)**BigInt(i)*BigInt(b)**BigInt(j);if(v>9007199254740991n||v< -9007199254740991n)return null;
   return Q(`<p>Find the coefficient of x${sup(i)}y${sup(j)} in (${a===1?'':a===-1?'−':sn(a)}x ${b<0?'−':'+'} ${Math.abs(b)===1?'':Math.abs(b)}y)${sup(n)}.</p>`,'num',Number(v),{hint:'Binomial theorem: the term is C(n, j)(ax)^(n−j)(by)^j. Keep the signs.',
     solution:`<p>C(${n}, ${j})·(${sn(a)})<sup>${i}</sup>·(${sn(b)})<sup>${j}</sup> = ${C(n,j)}·${BigInt(a)**BigInt(i)}·${BigInt(b)**BigInt(j)} = <b>${v}</b>.</p>`,meta:{n,a,b,i}});}),
 gen('55-J-coef-laurent',TJ[0],r=>{const p=r.int(1,3),q=r.int(1,3),n=r.int(4,10),c=r.pick([1,2,3,-1,-2]);// (x^p + c/x^q)^n: term C(n,j) c^j x^{p(n−j) − qj}
   const js=range(0,n).filter(j=>true);const j=r.int(0,n);const e=p*(n-j)-q*j;if(j===0||j===n)return null;const v=CB(n,j)*BigInt(c)**BigInt(j);
   return Q(`<p>Find the coefficient of x${e===0?'⁰ (the constant term)':sup(sn(e))} in (x${p>1?sup(p):''} ${c<0?'−':'+'} ${Math.abs(c)}/x${q>1?sup(q):''})${sup(n)}.</p>`,'num',Number(v),{hint:'General term: C(n, j)(x^p)^(n−j)(c·x^(−q))^j; solve p(n−j) − qj = target for j.',
     solution:`<p>Exponent of the j-th term: ${p}(${n} − j) − ${q}j = ${p*n} − ${p+q}j = ${e} ⇒ j = ${j}. Coefficient: C(${n}, ${j})·(${sn(c)})<sup>${j}</sup> = <b>${v}</b>.</p>`,meta:{p,q,n,c,e}});}),
 gen('55-J-identity',TJ[1],r=>{const t=r.int(0,5);let v,expr,sol,meta;
   if(t===0){const n=r.int(6,20);v=n*Math.pow(2,n-1);expr=`∑<sub>k=0</sub><sup>${n}</sup> k·C(${n}, k)`;sol=`Choose a committee and a chair: n·2<sup>n−1</sup> = ${n}·2<sup>${n-1}</sup>`;meta={t,n};}
   else if(t===1){const n=r.int(4,14);v=C(2*n,n);expr=`∑<sub>k=0</sub><sup>${n}</sup> C(${n}, k)²`;sol=`Vandermonde: ∑ C(n,k)C(n,n−k) = C(2n, n) = C(${2*n}, ${n})`;meta={t,n};}
   else if(t===2){const rr=r.int(2,5),n=r.int(rr+4,18);v=C(n+1,rr+1);expr=`∑<sub>j=${rr}</sub><sup>${n}</sup> C(j, ${rr})`;sol=`Hockey stick: choose ${rr+1} elements of {1,…,${n+1}} by their largest element j+1: C(${n+1}, ${rr+1})`;meta={t,rr,n};}
   else if(t===3){const n=r.int(4,14);v=Math.pow(3,n);expr=`∑<sub>k=0</sub><sup>${n}</sup> C(${n}, k)·2<sup>k</sup>`;sol=`Binomial theorem with x = 2: (1 + 2)<sup>${n}</sup>`;meta={t,n};}
   else if(t===4){const n=r.int(4,14);v=n*(n-1)*Math.pow(2,n-2);expr=`∑<sub>k=0</sub><sup>${n}</sup> k(k − 1)·C(${n}, k)`;sol=`Committee with a chair and a different vice-chair: n(n−1)2<sup>n−2</sup>`;meta={t,n};}
   else{const m=r.int(3,9),n=r.int(3,9),rr=r.int(2,Math.min(m,n));v=C(m+n,rr);expr=`∑<sub>k=0</sub><sup>${rr}</sup> C(${m}, k)·C(${n}, ${rr} − k)`;sol=`Vandermonde: choose ${rr} from ${m} men and ${n} women, split by the number k of men: C(${m+n}, ${rr})`;meta={t,m,n,rr};}
   return Q(`<p>Evaluate (use a combinatorial identity, not term-by-term addition): ${expr}</p>`,'num',v,{hint:'Recognize the identity: Σ k·C(n,k) (chairs), Σ C(n,k)² / Σ C(m,k)C(n,r−k) (Vandermonde), Σ C(j,r) (hockey stick), Σ C(n,k)x^k (binomial theorem).',
     solution:`<p>${sol} = <b>${v}</b>.</p>`,meta});}),
 gen('55-J-combproof',TJ[1],r=>{const n=r.int(6,12),k=r.int(2,n-2),m=r.int(3,8);
   const S=[
    {story:`Count committees of ${k} people chosen from ${n}, with one member as chair: choose the committee then the chair, OR choose the chair first then the other ${k-1}.`,
     good:`${k}·C(${n}, ${k}) = ${n}·C(${n-1}, ${k-1})`,bad:[`${k}·C(${n}, ${k}) = ${n}·C(${n-1}, ${k})`,`C(${n}, ${k}) = ${n}·C(${n-1}, ${k-1})`,`${k}·C(${n}, ${k}) = C(${n-1}, ${k-1}) + C(${n-1}, ${k})`,`${k}·C(${n}, ${k}) = ${n}·C(${n}, ${k-1})`]},
    {story:`Count ${k}-subsets of {1, …, ${n}} by whether they contain the element ${n}.`,good:`C(${n}, ${k}) = C(${n-1}, ${k-1}) + C(${n-1}, ${k})`,bad:[`C(${n}, ${k}) = C(${n-1}, ${k-1}) + C(${n-1}, ${k+1})`,`C(${n}, ${k}) = C(${n-1}, ${k}) + C(${n-2}, ${k-1})`,`C(${n}, ${k}) = 2·C(${n-1}, ${k-1})`,`C(${n}, ${k}) = C(${n-1}, ${k-1}) + C(${n}, ${k-1})`]},
    {story:`Count ${k}-person committees chosen from ${n} women and ${m} men by the number j of women on the committee.`,good:`C(${n+m}, ${k}) = ∑<sub>j</sub> C(${n}, j)·C(${m}, ${k} − j)`,bad:[`C(${n+m}, ${k}) = ∑<sub>j</sub> C(${n}, j)·C(${m}, j)`,`C(${n}·${m}, ${k}) = ∑<sub>j</sub> C(${n}, j)·C(${m}, ${k} − j)`,`C(${n+m}, ${k}) = C(${n}, ${k})·C(${m}, ${k})`,`C(${n+m}, ${k}) = C(${n}, ${k}) + C(${m}, ${k})`]},
    {story:`Count the subsets of an ${n}-element set (each element in or out), OR count them by their size.`,good:`2<sup>${n}</sup> = ∑<sub>k=0</sub><sup>${n}</sup> C(${n}, k)`,bad:[`2<sup>${n}</sup> = ∑<sub>k=1</sub><sup>${n}</sup> C(${n}, k)`,`${n}! = ∑<sub>k=0</sub><sup>${n}</sup> C(${n}, k)`,`2<sup>${n}</sup> = ∑<sub>k=0</sub><sup>${n}</sup> k·C(${n}, k)`,`${n}<sup>2</sup> = ∑<sub>k=0</sub><sup>${n}</sup> C(${n}, k)`]},
   ];
   const ev=str=>{str=str.trim();const js=b=>b.replace(/<sup>([^<]*)<\/sup>/g,'**($1)').replace(/·/g,'*').replace(/−/g,'-').replace(/(\d+)!/g,'fact($1)');
     const m=/^∑<sub>(\w)(?:=(\d+))?<\/sub>(?:<sup>(\d+)<\/sup>)?\s*(.*)$/.exec(str);if(m){const f=new Function('C','fact',m[1],'return '+js(m[4]));let t=0;for(let x=+(m[2]||0);x<=(m[3]?+m[3]:60);x++)t+=f(C,fact,x);return t;}
     return new Function('C','fact','return '+js(str))(C,fact);};
   const holds=e=>{const [a,b]=e.split(' = ');return ev(a)===ev(b);};
   const s=r.pick(S);if(!holds(s.good))return null;const m2=mc(r,s.good,r.shuffle(s.bad.filter(b=>!holds(b))));if(!m2)return null;
   return Q(`<p>Combinatorial proof. ${s.story} Which identity does this double count prove?</p>`,'mc',m2.answer,{choices:m2.choices,hint:'Write down the count from each side of the story; both must count the same set. Sanity-check numerically.',
     solution:`<p>The two ways of counting give <b>${s.good}</b>. (The other choices fail numerically, e.g. off-by-one in the lower index.)</p>`,meta:{}});}),
 gen('55-J-stars-lower',TJ[2],r=>{const k=r.int(3,5);const ls=range(1,k).map(()=>r.int(0,4));const L=sum(ls);const n=L+r.int(3,9);if(k===4&&n===15)return null;const v=C(n-L+k-1,k-1);
   return Q(`<p>How many integer solutions does x₁ + ${range(2,k).map(i=>'x'+'₀₁₂₃₄₅₆'[i]).join(' + ')} = ${n} have with ${ls.map((l,i)=>`x${'₀₁₂₃₄₅₆'[i+1]} ≥ ${l}`).join(', ')}?</p>`,'num',v,{hint:'Substitute yᵢ = xᵢ − lᵢ ≥ 0, then stars and bars: C(n′ + k − 1, k − 1).',
     solution:`<p>yᵢ = xᵢ − lᵢ: y₁ + … + y<sub>${k}</sub> = ${n} − ${L} = ${n-L}, yᵢ ≥ 0. Stars and bars: C(${n-L} + ${k-1}, ${k-1}) = C(${n-L+k-1}, ${k-1}) = <b>${v}</b>.</p>`,meta:{k,ls,n}});}),
 gen('55-J-stars-variant',TJ[2],r=>{const t=r.int(0,2);
   if(t===0){const k=r.int(3,4),n=r.int(5,12);const v=C(n+k,k);return Q(`<p>How many solutions in nonnegative integers does x₁ + … + x<sub>${k}</sub> ≤ ${n} have?</p>`,'num',v,{hint:'Add a slack variable x₀ = n − (x₁+…+x_k) ≥ 0 to turn ≤ into =.',
     solution:`<p>Slack: x₁ + … + x<sub>${k}</sub> + s = ${n} with ${k+1} nonnegative variables: C(${n} + ${k}, ${k}) = <b>${v}</b>.</p>`,meta:{t,k,n}});}
   if(t===1){const kinds=r.int(3,6),n=r.int(4,10);const v=C(n+kinds-1,kinds-1);return Q(`<p>A bakery sells ${kinds} kinds of bagels. How many ways are there to choose ${n} bagels (order irrelevant, repetition allowed)?</p>`,'num',v,{hint:'Combinations with repetition: C(n + k − 1, k − 1).',
     solution:`<p>C(${n} + ${kinds-1}, ${kinds-1}) = <b>${v}</b>.</p>`,meta:{t,k:kinds,n}});}
   const k=r.int(3,5),n=r.int(k+3,k+12);const v=C(n-1,k-1);return Q(`<p>In how many ways can ${n} identical coins be given to ${k} children so that every child gets at least one?</p>`,'num',v,{hint:'Give each child one coin first, then distribute the rest freely.',
     solution:`<p>${n-k} remaining coins, ${k} children: C(${n-k} + ${k-1}, ${k-1}) = C(${n-1}, ${k-1}) = <b>${v}</b>.</p>`,meta:{t,k,n}});}),
 ...(()=>{const WORDS=['BANANA','LETTER','COOKIE','PEPPER','BALLOON','ADDRESS','SUCCESS','COFFEE','GEESE','ASSESS','MAMMAL','PAPAYA','DEEDED','TATTOO','BOOKKEEP','CANCEL','ALFALFA','INNING','REFERRED','STATS'];
   const cnt=w=>{const c={};for(const ch of w)c[ch]=(c[ch]||0)+1;return c;};const multinom=w=>{const c=cnt(w);return Object.values(c).reduce((a,x)=>a/fact(x),fact(w.length));};
   return [gen('55-J-letters',TJ[3],r=>{const w=r.pick(WORDS);const c=cnt(w);const t=r.int(0,2);let v,desc,sol;const rep=Object.keys(c).filter(ch=>c[ch]>=2);const tot=multinom(w);
     if(t===0){v=tot;desc=`How many distinct strings can be formed by rearranging all the letters of ${w}?`;sol=`${w.length}! / (${Object.keys(c).filter(ch=>c[ch]>1).map(ch=>`${c[ch]}!`).join('·')}) [${Object.entries(c).map(([k,x])=>`${k}×${x}`).join(', ')}]`;}
     else if(t===1){const L=r.pick(rep);const w2=w.split('').filter(ch=>ch!==L).join('')+'#';const c2=cnt(w2);v=Object.values(c2).reduce((a,x)=>a/fact(x),fact(w2.length));desc=`How many rearrangements of ${w} have all the ${L}'s together (as one block)?`;sol=`glue the ${c[L]} ${L}'s into one block: ${w2.length} symbols, ${w2.length}!/(${Object.entries(c2).filter(([,x])=>x>1).map(([,x])=>x+'!').join('·')||'1'})`;}
     else{const L=r.pick(rep);const w2=w.split('').filter(ch=>ch!==L).join('');if(c[L]>w2.length+1)return null;const c2=cnt(w2);const base=Object.values(c2).reduce((a,x)=>a/fact(x),fact(w2.length));v=base*C(w2.length+1,c[L]);
       desc=`How many rearrangements of ${w} have no two ${L}'s adjacent?`;sol=`arrange the other ${w2.length} letters: ${base} ways; choose ${c[L]} of the ${w2.length+1} gaps for the ${L}'s: C(${w2.length+1}, ${c[L]}) = ${C(w2.length+1,c[L])}; product`;}
     return Q(`<p>${desc}</p>`,'num',v,{hint:'n!/(n₁! n₂! …) for repeated letters; glue a block for “together”; gap method for “not adjacent”.',solution:`<p>${sol} = <b>${v}</b>.</p>`,meta:{w,t,L:desc.match(/the (\w)'s/)?desc.match(/the (\w)'s/)[1]:desc.match(/two (\w)'s/)?desc.match(/two (\w)'s/)[1]:null}});})];})(),
 gen('55-J-boxes',TJ[4],r=>{const t=r.int(0,3);let v,desc,sol,meta;
   if(t===0){const n=r.int(4,7),k=r.int(2,4);v=sum(range(1,k).map(j=>stirling2(n,j)));desc=`${n} DISTINGUISHABLE objects into ${k} INDISTINGUISHABLE boxes (boxes may be empty)`;sol=`∑<sub>j=1</sub><sup>${k}</sup> S(${n}, j) = ${range(1,k).map(j=>stirling2(n,j)).join(' + ')}`;meta={t,n,k};}
   else if(t===1){const n=r.int(5,12),k=r.int(2,4);v=partK(n,k);desc=`${n} INDISTINGUISHABLE objects into ${k} INDISTINGUISHABLE boxes (boxes may be empty)`;sol=`number of partitions of ${n} into at most ${k} parts`;meta={t,n,k};}
   else if(t===2){const parts=range(1,r.int(3,4)).map(()=>r.int(1,3));const n=sum(parts);v=parts.reduce((a,x)=>a/fact(x),fact(n));desc=`${n} DISTINGUISHABLE objects into ${parts.length} DISTINGUISHABLE boxes so that box i gets exactly ${parts.join(', ')} objects respectively`;sol=`multinomial ${n}!/(${parts.map(x=>x+'!').join('·')})`;meta={t,parts};}
   else{const n=r.int(4,6),k=r.int(2,3);v=stirling2(n,k)*fact(k);desc=`${n} DISTINGUISHABLE objects into ${k} DISTINGUISHABLE boxes with NO box empty`;sol=`k!·S(n,k) = ${fact(k)}·${stirling2(n,k)}`;meta={t,n,k};}
   return Q(`<p>In how many ways can you place ${desc}?</p>`,'num',v,{hint:'Four cases: dist→dist kⁿ (or multinomial), indist→dist stars and bars, dist→indist Stirling numbers S(n,j), indist→indist integer partitions.',solution:`<p>${sol} = <b>${v}</b>.</p>`,meta});}),
 gen('55-J-lattice',TJ[4],r=>{const a=r.int(4,8),b=r.int(3,7);const px=r.int(1,a-1),py=r.int(1,b-1);const t=r.int(0,2);let v,desc,sol;
   if(t===0){v=C(px+py,px)*C(a-px+b-py,a-px);desc=`pass through (${px}, ${py})`;sol=`C(${px+py}, ${px})·C(${a-px+b-py}, ${a-px}) = ${C(px+py,px)}·${C(a-px+b-py,a-px)}`;}
   else if(t===1){v=C(a+b,a)-C(px+py,px)*C(a-px+b-py,a-px);desc=`AVOID the point (${px}, ${py})`;sol=`C(${a+b}, ${a}) − C(${px+py}, ${px})·C(${a-px+b-py}, ${a-px}) = ${C(a+b,a)} − ${C(px+py,px)*C(a-px+b-py,a-px)}`;}
   else{v=C(a+b,a)-C(px+py,px)*C(a-px-1+b-py,a-px-1);desc=`do NOT use the unit step from (${px}, ${py}) to (${px+1}, ${py})`;sol=`total minus paths through that edge: C(${a+b}, ${a}) − C(${px+py}, ${px})·C(${a-px-1+b-py}, ${a-px-1})`;}
   return Q(`<p>Lattice paths from (0, 0) to (${a}, ${b}) use unit steps right (+1, 0) and up (0, +1). How many paths ${desc}?</p>`,'num',v,{hint:'Paths to (a, b): C(a + b, a). Through a point: multiply the two legs. Avoid: complement.',solution:`<p>${sol} = <b>${v}</b>.</p>`,meta:{a,b,px,py,t}});}),
 gen('55-J-letters-sub',TJ[3],r=>{const W=['BANANA','LETTER','COOKIE','PEPPER','BALLOON','ADDRESS','SUCCESS','COFFEE','MAMMAL','PAPAYA','TATTOO','BOOKKEEP','ALFALFA','INNING','STATS','MISSISSIPPI','TENNESSEE','COMMITTEE'];
   const w=r.pick(W);const k=r.int(3,5);const cnt={};for(const ch of w)cnt[ch]=(cnt[ch]||0)+1;const letters=Object.keys(cnt);if(letters.length>6)return null;
   // EGF: k! [x^k] ∏ (∑_{i ≤ c} x^i / i!)
   let poly=[fr(1)];for(const L of letters){const c=cnt[L];const np=Array(poly.length+c).fill(null).map(()=>fr(0));poly.forEach((a,i)=>{for(let j=0;j<=c;j++)np[i+j]=np[i+j].add(a.mul(fr(1,fact(j))));});poly=np;}
   const v=Number(poly[k].mul(fact(k)).n);
   return Q(`<p>How many different strings of length ${k} can be formed from the letters of ${w}, using each letter at most as many times as it appears in ${w}?</p>`,'num',v,{hint:'Split into cases by the pattern of repeats (all different, one letter twice, …), counting choices of letters then arrangements n!/(n₁!n₂!…).',
     solution:`<p>Letter supply: ${letters.map(L=>`${L}×${cnt[L]}`).join(', ')}. Summing over repeat patterns (equivalently k!·[x<sup>${k}</sup>] ∏<sub>letters</sub> ∑<sub>i≤cᵢ</sub> xⁱ/i!) gives <b>${v}</b>.</p>`,meta:{w,k}});}),
];

// =========================================================
// 55-K  Probability
// =========================================================
const TK=['Equally-likely counting probabilities (cards, dice, committees)','Complement and union rules','Conditional probability; independence (pairwise vs mutual)','Bernoulli trials / binomial probabilities','Bayes with several causes','Birthday-type problems; probabilistic method existence proofs'];
const diceDist=(k,s)=>{let d=new Map([[0,1]]);for(let i=0;i<k;i++){const nd=new Map();for(const [v,c] of d)for(let f=1;f<=s;f++)nd.set(v+f,(nd.get(v+f)||0)+c);d=nd;}return d;};
G['55-K']=[
 gen('55-K-dice',TK[0],r=>{const k=r.int(2,4),s=r.pick([4,6,8]);if(Math.pow(s,k)>4096)return null;const t=r.int(0,2);const tot=Math.pow(s,k);let num,desc,sol;
   if(t===0){const d=diceDist(k,s);const tg=r.int(k+1,k*s-1);if(k===5&&tg===18)return null;num=d.get(tg)||0;desc=`the sum is ${tg}`;sol=`count the ordered outcomes with sum ${tg} (e.g. stars and bars with upper bound ${s}): ${num}`;}
   else if(t===1){const m=r.int(2,s);num=Math.pow(m,k)-Math.pow(m-1,k);desc=`the largest number rolled is exactly ${m}`;sol=`max ≤ ${m} minus max ≤ ${m-1}: ${m}<sup>${k}</sup> − ${m-1}<sup>${k}</sup> = ${num}`;}
   else{num=P(s,k);desc='all the numbers rolled are different';sol=`${s}·${s-1}⋯ (${k} factors) = ${num}`;}
   const pr=fr(num,tot);return Q(`<p>Roll ${k} fair ${s}-sided dice (faces 1…${s}). What is the probability that ${desc}? (Exact fraction.)</p>`,'num',pr.ans(),{hint:`All ${s}^${k} ordered outcomes are equally likely; count the favorable ones.`,
     solution:`<p>${sol} favorable out of ${tot}: probability <b>${pr.h()}</b>.</p>`,meta:{k,s,t,tg:desc.match(/sum is (\d+)/)?+desc.match(/sum is (\d+)/)[1]:null,m:desc.match(/exactly (\d+)/)?+desc.match(/exactly (\d+)/)[1]:null}});}),
 gen('55-K-cards',TK[0],r=>{const R=r.int(5,9),h=r.int(3,4);const N=4*R;const t=r.int(0,4);let num,desc,sol;const tot=C(N,h);
   if(t===0){num=4*C(R,h);desc='all cards have the same suit';sol=`4·C(${R}, ${h}) = ${num}`;}
   else if(t===1){num=R*C(4,2)*C(R-1,h-2)*Math.pow(4,h-2);desc='there is exactly one pair (exactly two cards share a rank and all other ranks are different)';sol=`rank of pair ${R}·C(4,2), other ${h-2} distinct ranks C(${R-1}, ${h-2}), a suit for each 4<sup>${h-2}</sup>: ${num}`;}
   else if(t===2){num=tot-C(N-4,h);desc='at least one ace';sol=`complement: C(${N}, ${h}) − C(${N-4}, ${h}) = ${num}`;}
   else if(t===3){num=C(R,h)*Math.pow(4,h);desc='all cards have different ranks';sol=`choose ${h} ranks C(${R}, ${h}), a suit for each 4<sup>${h}</sup>: ${num}`;}
   else{num=6*(C(2*R,h)-2*C(R,h));desc='exactly two different suits appear';sol=`choose the 2 suits C(4,2) = 6; hands inside those ${2*R} cards minus the one-suit hands: 6·(C(${2*R}, ${h}) − 2·C(${R}, ${h})) = ${num}`;}
   const pr=fr(num,tot);return Q(`<p>A small deck has ${R} ranks (A, 2, …) in each of 4 suits (${N} cards). Deal ${h} cards. What is the probability that ${desc}?</p>`,'num',pr.ans(),{hint:`|S| = C(${N}, ${h}); count favorable hands with the product rule.`,
     solution:`<p>${sol} favorable hands out of C(${N}, ${h}) = ${tot}: <b>${pr.h()}</b>.</p>`,meta:{R,h,t}});}),
 gen('55-K-union',TK[1],r=>{const t=r.int(0,2);let pr,desc,sol,meta;
   if(t===0){const k=r.int(2,5),s=r.pick([4,6,8]);if(Math.pow(s,k)>5000)return null;pr=fr(1).sub(fr(Math.pow(s-1,k),Math.pow(s,k)));desc=`Roll a fair ${s}-sided die ${k} times. What is the probability of at least one ${s}?`;sol=`1 − (${s-1}/${s})<sup>${k}</sup>`;meta={t,k,s};}
   else if(t===1){const N=r.int(50,300),a=r.int(2,9);let b=r.int(2,12);if(a===b)return null;const cnt=Math.floor(N/a)+Math.floor(N/b)-Math.floor(N/lcm(a,b));pr=fr(cnt,N);desc=`An integer is chosen uniformly from 1…${N}. What is the probability it is divisible by ${a} or ${b}?`;sol=`(⌊${N}/${a}⌋ + ⌊${N}/${b}⌋ − ⌊${N}/${lcm(a,b)}⌋)/${N} = (${Math.floor(N/a)} + ${Math.floor(N/b)} − ${Math.floor(N/lcm(a,b))})/${N} [lcm, not product!]`;meta={t,N,a,b};}
   else{const n=r.int(5,10);desc=`A random bit string of length ${n}. What is the probability that it starts with 1 or ends with 00?`;pr=fr(Math.pow(2,n-1)+Math.pow(2,n-2)-Math.pow(2,n-3),Math.pow(2,n));sol=`P(start 1) + P(end 00) − P(both) = 1/2 + 1/4 − 1/8`;meta={t,n};}
   return Q(`<p>${desc}</p>`,'num',pr.ans(),{hint:'Complement for “at least one”; inclusion–exclusion P(A∪B) = P(A) + P(B) − P(A∩B) for “or”.',solution:`<p>${sol} = <b>${pr.h()}</b>.</p>`,meta});}),
 gen('55-K-conditional',TK[2],r=>{const s=6;const t=r.int(0,2);const outs=[];for(let a=1;a<=s;a++)for(let b=1;b<=s;b++)outs.push([a,b]);let A,B,dA,dB,meta;
   const sv=r.int(5,10),d=r.int(1,6),m=r.int(3,6);
   const EV=[[`the sum is at least ${sv}`,o=>o[0]+o[1]>=sv],[`at least one die shows ${d}`,o=>o[0]===d||o[1]===d],[`the maximum is ${m}`,o=>Math.max(...o)===m],[`the two dice differ`,o=>o[0]!==o[1]],[`the first die is even`,o=>o[0]%2===0],[`the sum is odd`,o=>(o[0]+o[1])%2===1]];
   const [i,j]=r.sample(range(0,EV.length-1),2);[dA,A]=EV[i];[dB,B]=EV[j];const nB=outs.filter(B).length,nAB=outs.filter(o=>A(o)&&B(o)).length;if(!nB||!nAB||nAB===nB)return null;const pr=fr(nAB,nB);
   return Q(`<p>Two fair dice are rolled. Find P(A | B), where A: ${dA}; B: ${dB}.</p>`,'num',pr.ans(),{hint:'P(A | B) = |A ∩ B| / |B| when outcomes are equally likely (reduce the sample space to B).',
     solution:`<p>|B| = ${nB}, |A ∩ B| = ${nAB} (out of 36). P(A | B) = ${nAB}/${nB} = <b>${pr.h()}</b>.</p>`,meta:{i,j,sv,d,m}});}),
 gen('55-K-independence',TK[2],r=>{const n=r.pick([2,3]);const outs=[];for(let m=0;m<(1<<n);m++)outs.push(range(0,n-1).map(i=>(m>>i)&1));
   const POOL=[['the first flip is H',o=>o[0]===1],['the second flip is H',o=>o[1]===1],['the first two flips agree',o=>o[0]===o[1]],['the number of heads is odd',o=>sum(o)%2===1],['at least one H',o=>sum(o)>=1],['the last flip is T',o=>o[n-1]===0],['exactly one H',o=>sum(o)===1]];
   if(n===3)POOL.push(['the last two flips agree',o=>o[1]===o[2]],['the first and last flips differ',o=>o[0]!==o[2]]);
   const ev=r.sample(POOL,3);const p=f=>fr(outs.filter(f).length,outs.length);
   const ind=(f,g)=>p(o=>f(o)&&g(o)).eq(p(f).mul(p(g)));const [E1,E2,E3]=ev.map(x=>x[1]);
   const st=[ind(E1,E2),ind(E1,E3),ind(E2,E3),ind(E1,E2)&&ind(E1,E3)&&ind(E2,E3)&&p(o=>E1(o)&&E2(o)&&E3(o)).eq(p(E1).mul(p(E2)).mul(p(E3)))];
   const ch=['E₁ and E₂ are independent','E₁ and E₃ are independent','E₂ and E₃ are independent','E₁, E₂, E₃ are mutually independent'];
   if(st.every(x=>!x)&&r.float()<0.6)return null;
   return Q(`<p>Flip a fair coin ${n} times. E₁: ${ev[0][0]}; E₂: ${ev[1][0]}; E₃: ${ev[2][0]}. Select ALL true statements.</p>`,'multi',st.map((x,i)=>x?i:-1).filter(i=>i>=0),{choices:ch,
     hint:'Independent ⇔ P(E∩F) = P(E)P(F). Mutual independence needs all pairs AND the triple product. Pairwise does not imply mutual.',
     solution:`<p>P(E₁) = ${p(E1).h()}, P(E₂) = ${p(E2).h()}, P(E₃) = ${p(E3).h()}; P(E₁E₂) = ${p(o=>E1(o)&&E2(o)).h()}, P(E₁E₃) = ${p(o=>E1(o)&&E3(o)).h()}, P(E₂E₃) = ${p(o=>E2(o)&&E3(o)).h()}, P(E₁E₂E₃) = ${p(o=>E1(o)&&E2(o)&&E3(o)).h()}.</p>${ul(ch.map((c,i)=>`${c}: <b>${st[i]?'true':'false'}</b>`))}`,meta:{n,names:ev.map(x=>x[0])}});}),
 gen('55-K-binomial',TK[3],r=>{const n=r.int(4,10),a=r.int(1,4),b=r.pick([2,3,4,5,6]);if(a>=b)return null;const p=fr(a,b),q=fr(b-a,b);const t=r.bool();const k=r.int(1,n-1);let pr=fr(0);
   const term=j=>fr(CB(n,j)).mul(new Fr(BigInt(a)**BigInt(j),BigInt(b)**BigInt(j))).mul(new Fr(BigInt(b-a)**BigInt(n-j),BigInt(b)**BigInt(n-j)));
   if(t)pr=term(k);else for(let j=k;j<=n;j++)pr=pr.add(term(j));
   return Q(`<p>A biased coin shows heads with probability ${p.h()}. It is flipped ${n} times independently. Find the probability of ${t?`exactly ${k}`:`at least ${k}`} heads (exact fraction).</p>`,'num',pr.ans(),{hint:'Binomial: P(exactly j) = C(n, j)p^j(1−p)^(n−j); for “at least k” sum j = k…n (or use the complement).',
     solution:`<p>${t?`C(${n}, ${k})(${p.h()})<sup>${k}</sup>(${q.h()})<sup>${n-k}</sup>`:`∑<sub>j=${k}</sub><sup>${n}</sup> C(${n}, j)(${p.h()})<sup>j</sup>(${q.h()})<sup>${n}−j</sup>`} = <b>${pr.h()}</b>.</p>`,meta:{n,a,b,k,t}});}),
 gen('55-K-bayes',TK[4],r=>{const k=r.int(2,3);let pri=range(1,k).map(()=>r.int(1,8));const S=sum(pri);const rates=range(1,k).map(()=>r.int(1,12));const target=r.int(0,k-1);
   const pP=pri.map(x=>fr(x,S)),pD=rates.map(x=>fr(x,100));let tot=fr(0);pP.forEach((p,i)=>tot=tot.add(p.mul(pD[i])));const post=pP[target].mul(pD[target]).div(tot);
   const names=['A','B','C'];
   return Q(`<p>A factory has ${k} machines. Machine ${names.slice(0,k).map((n,i)=>`${n} makes ${pP[i].h()} of the items`).join(', ')}. The defect rates are ${names.slice(0,k).map((n,i)=>`${rates[i]}% for ${n}`).join(', ')}. A randomly chosen item is defective. What is the probability it came from machine ${names[target]}? (Exact fraction.)</p>`,'num',post.ans(),{
     hint:'Bayes: P(Fᵢ | D) = P(D | Fᵢ)P(Fᵢ) / ∑ⱼ P(D | Fⱼ)P(Fⱼ).',
     solution:`<p>P(D) = ${pP.map((p,i)=>`${p.h()}·${pD[i].h()}`).join(' + ')} = ${tot.h()}. P(${names[target]} | D) = (${pP[target].h()}·${pD[target].h()}) / ${tot.h()} = <b>${post.h()}</b>.</p>`,meta:{pri,rates,target}});}),
 gen('55-K-bayes-test',TK[4],r=>{const prev=r.pick([1,2,5,10,20]),sens=r.int(80,99),fp=r.int(1,15);const pr=fr(prev,100),se=fr(sens,100),f=fr(fp,100);const two=r.bool();
   let ans,sol;if(!two){const num=pr.mul(se),den=num.add(fr(1).sub(pr).mul(f));ans=num.div(den);sol=`(${pr.h()}·${se.h()}) / (${pr.h()}·${se.h()} + ${fr(1).sub(pr).h()}·${f.h()})`;}
   else{const num=pr.mul(fr(1).sub(se)),den=num.add(fr(1).sub(pr).mul(fr(1).sub(f)));ans=num.div(den);sol=`P(D | negative) = (${pr.h()}·${fr(1).sub(se).h()}) / (${pr.h()}·${fr(1).sub(se).h()} + ${fr(1).sub(pr).h()}·${fr(1).sub(f).h()})`;}
   return Q(`<p>${prev}% of a population has a disease. A test is positive for ${sens}% of people with the disease and for ${fp}% of people without it. ${two?'A person tests NEGATIVE. What is the probability they nevertheless have the disease?':'A person tests positive. What is the probability they have the disease?'} (Exact fraction.)</p>`,'num',ans.ans(),{
     hint:'Bayes with the two causes D and Dᶜ; the denominator is the total probability of the observed result.',solution:`<p>${sol} = <b>${ans.h()}</b>.</p>`,meta:{prev,sens,fp,two}});}),
 gen('55-K-birthday',TK[5],r=>{const n=r.int(4,15),k=r.int(3,5);if(k>n)return null;const t=r.int(0,1);
   if(t===1){const pr=fr(1).sub(new Fr(BigInt(n-1)**BigInt(k-1),BigInt(n)**BigInt(k-1)));
     return Q(`<p>Each of ${k} people independently picks one of ${n} equally likely “days”. What is the probability that at least one of the OTHER people picks the same day as person 1? (Exact fraction.)</p>`,'num',pr.ans(),{hint:'Different from the birthday problem: only matches with person 1 count. Complement: everyone else avoids person 1’s day.',
       solution:`<p>1 − ((${n}−1)/${n})<sup>${k-1}</sup> = <b>${pr.h()}</b>.</p>`,meta:{n,k,t}});}
   const pr=fr(1).sub(fr(P(n,k),Math.pow(n,k)));
   return Q(`<p>Each of ${k} people independently picks one of ${n} equally likely “days”. What is the probability that at least two pick the same day? (Exact fraction.)</p>`,'num',pr.ans(),{hint:'Complement: all different has probability n(n−1)⋯(n−k+1)/nᵏ.',
     solution:`<p>1 − (${range(0,k-1).map(i=>n-i).join('·')})/${n}<sup>${k}</sup> = 1 − ${P(n,k)}/${Math.pow(n,k)} = <b>${pr.h()}</b>.</p>`,meta:{n,k,t}});}),
 gen('55-K-probmethod',TK[5],r=>{const t=r.int(0,2);
   if(t===0){const n=r.int(4,6),m=r.int(3,4);if(m>n)return null;const e=fr(C(n,m)).mul(new Fr(1n,1n<<BigInt(C(m,2)-1)));
     return Q(`<p>Probabilistic method: colour each edge of K<sub>${n}</sub> red or blue independently with probability 1/2. What is the expected number of monochromatic K<sub>${m}</sub>'s (copies of K<sub>${m}</sub> whose edges all have the same colour)? (If this is < 1, some colouring has none.)</p>`,'num',e.ans(),{
       hint:'Linearity of expectation over the C(n, m) vertex sets; each is monochromatic with probability 2·2^(−C(m,2)).',solution:`<p>C(${n}, ${m})·2<sup>1−${C(m,2)}</sup> = ${C(n,m)}/${1<<(C(m,2)-1)} = <b>${e.h()}</b>.</p>`,meta:{t,n,m}});}
   if(t===1){const n=r.int(3,5);const e=fr(fact(n),1<<(n-1));
     return Q(`<p>A tournament on ${n} players is random: each game's winner is chosen by a fair coin. A Hamiltonian path is an ordering v₁, …, v<sub>${n}</sub> of all players where each vᵢ beats vᵢ₊₁. What is the expected number of Hamiltonian paths? (Hence some tournament has at least this many.)</p>`,'num',e.ans(),{
       hint:'n! orderings, each a Hamiltonian path with probability (1/2)^(n−1).',solution:`<p>${n}!/2<sup>${n-1}</sup> = ${fact(n)}/${1<<(n-1)} = <b>${e.h()}</b>.</p>`,meta:{t,n}});}
   const n=r.int(5,7),k=r.int(2,3);const E=randGraph(r,n,0.5);if(E.length<4)return null;const mono=r.bool();const e=mono?fr(E.length,k):fr(E.length*(k-1),k);
   return Q(`<p>The graph G has vertices 1…${n} and edges ${fmtE(E)}. Colour each VERTEX independently and uniformly with one of ${k} colours. What is the expected number of ${mono?'monochromatic':'bichromatic (endpoints coloured differently)'} edges? (${mono?'':`So G has a ${k}-colouring with at least this many bichromatic edges, e.g. a cut with ≥ |E|/2 edges when k = 2.`})</p>`,'num',e.ans(),{
     hint:'Indicator per edge: its endpoints get the same colour with probability 1/k.',solution:`<p>|E| = ${E.length}; each edge is ${mono?'monochromatic with probability 1/'+k:'bichromatic with probability '+(k-1)+'/'+k}. Expected value ${e.h()}.</p><p>Answer <b>${e.h()}</b>.</p>`,meta:{t,n,k,E,mono}});}),
 gen('55-K-union3',TK[1],r=>{const x=r.int(4,6),t=r.int(7,11),d=r.int(1,6),g=r.int(2,4);
   const EV=[[`the first die shows at least ${x}`,o=>o[0]>=x],[`the sum is ${t}`,o=>o[0]+o[1]===t],[`the dice show the same number`,o=>o[0]===o[1]],[`at least one die shows ${d}`,o=>o[0]===d||o[1]===d],[`the product is even`,o=>(o[0]*o[1])%2===0],[`the dice differ by at least ${g}`,o=>Math.abs(o[0]-o[1])>=g]];
   const ids=r.sample(range(0,EV.length-1),3);let c=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(ids.some(i=>EV[i][1]([a,b])))c++;const pr=fr(c,36);
   return Q(`<p>Two fair dice are rolled. Find the probability that at least one of the following happens: (1) ${EV[ids[0]][0]}; (2) ${EV[ids[1]][0]}; (3) ${EV[ids[2]][0]}.</p>`,'num',pr.ans(),{hint:'Inclusion–exclusion P(E₁∪E₂∪E₃) = ΣP(Eᵢ) − ΣP(EᵢEⱼ) + P(E₁E₂E₃), or count the outcomes in the union directly (complement helps).',
     solution:`<p>Counting outcomes in the union: ${c} of 36 ⇒ <b>${pr.h()}</b>.</p>`,meta:{ids,x,t,d,g}});}),
 gen('55-K-geometric',TK[3],r=>{const [a,b]=r.pick([[1,6],[1,4],[1,10],[1,5],[2,7],[1,3],[3,10],[1,8],[2,9],[1,20]]);const p=fr(a,b),q=fr(b-a,b);const t=r.int(0,1);
   if(t===0){const k=r.int(2,7);const v=new Fr(BigInt(b-a)**BigInt(k-1)*BigInt(a),BigInt(b)**BigInt(k));
     return Q(`<p>Independent trials each succeed with probability ${p.h()}. What is the probability that the FIRST success happens on trial ${k}?</p>`,'num',v.ans(),{hint:'k − 1 failures then a success: (1 − p)^(k−1)·p.',solution:`<p>(${q.h()})<sup>${k-1}</sup>·${p.h()} = <b>${v.h()}</b>.</p>`,meta:{t,a,b,k}});}
   const [tn,td]=r.pick([[1,2],[3,4],[9,10],[2,3],[19,20]]);let n=1;while(fr(1).sub(new Fr(BigInt(b-a)**BigInt(n),BigInt(b)**BigInt(n))).cmp(fr(tn,td))<0)n++;
   return Q(`<p>Independent trials each succeed with probability ${p.h()}. What is the smallest number n of trials for which P(at least one success) ≥ ${tn}/${td}?</p>`,'num',n,{hint:'P(at least one) = 1 − (1 − p)ⁿ; solve (1 − p)ⁿ ≤ 1 − target.',
     solution:`<p>Need (${q.h()})ⁿ ≤ ${fr(td-tn,td).h()}. n = ${n-1} gives ${fr(1).sub(new Fr(BigInt(b-a)**BigInt(n-1),BigInt(b)**BigInt(n-1))).h()} < ${tn}/${td}; n = ${n} gives ${fr(1).sub(new Fr(BigInt(b-a)**BigInt(n),BigInt(b)**BigInt(n))).h()}. Answer <b>${n}</b>.</p>`,meta:{t,a,b,tn,td}});}),
];

// =========================================================
// 55-L  Expected value, variance, Chebyshev
// =========================================================
const TL=['Distribution of a random variable','Expected value by definition and by linearity/indicators','Independence of random variables; E(XY)','Variance via E(X²) − E(X)²; Bienaymé','Chebyshev bounds (and comparison with the exact value)','Binomial mean & variance'];
const RV2=[['the larger of the two numbers (max)',(a,b)=>Math.max(a,b)],['the smaller of the two numbers (min)',(a,b)=>Math.min(a,b)],['|first − second|',(a,b)=>Math.abs(a-b)],['the sum',(a,b)=>a+b],['the number of even dice',(a,b)=>(a%2===0)+(b%2===0)],['first − second',(a,b)=>a-b]];
G['55-L']=[
 gen('55-L-dist',TL[0],r=>{const s=r.pick([4,5,6]);const ri=r.int(0,4);const [nm,f]=RV2[ri];const cnt=new Map();for(let a=1;a<=s;a++)for(let b=1;b<=s;b++){const v=f(a,b);cnt.set(v,(cnt.get(v)||0)+1);}
   const vals=[...cnt.keys()].sort((x,y)=>x-y);const full=vals.length<=6&&r.bool();
   if(full){const L=vals.map(v=>fr(cnt.get(v),s*s));return Q(`<p>Roll two fair ${s}-sided dice. X = ${nm}. X takes the values ${vals.join(', ')}. Enter P(X = v) for these values in that order (fractions).</p>`,'list',L.map(x=>x.ans()),{hint:`Tabulate all ${s*s} outcomes.`,
     solution:`<p>${vals.map((v,i)=>`P(X=${v}) = ${cnt.get(v)}/${s*s} = ${L[i].h()}`).join('; ')}.</p>`,meta:{s,ri,vals}});}
   const v=r.pick(vals);const pr=fr(cnt.get(v),s*s);return Q(`<p>Roll two fair ${s}-sided dice. X = ${nm}. Find P(X = ${v}).</p>`,'num',pr.ans(),{hint:`Count outcomes in the ${s}×${s} table.`,solution:`<p>${cnt.get(v)} of ${s*s} outcomes: <b>${pr.h()}</b>.</p>`,meta:{s,ri,v}});}),
 gen('55-L-expect-def',TL[1],r=>{const t=r.int(0,1);
   if(t===0){const red=r.int(1,4),blue=r.int(2,6);const e=fr(red+blue+1,red+1);return Q(`<p>An urn has ${red} red and ${blue} blue balls. Balls are drawn one at a time WITHOUT replacement until the first red ball appears. Let X be the number of draws (including the red one). Find E(X).</p>`,'num',e.ans(),{
     hint:'Indicators: X = 1 + (number of blue balls drawn before the first red); each blue ball precedes all reds with probability 1/(r+1).',solution:`<p>E(X) = 1 + ${blue}·1/${red+1} = ${red+blue+1}/${red+1} = <b>${e.h()}</b>.</p>`,meta:{t,red,blue}});}
   const s=6;const pay=range(1,s).map(()=>r.int(-5,10));const cost=r.int(0,4);const e=fr(sum(pay),s).sub(cost);
   return Q(`<p>A game costs $${cost} to play. You roll a fair die and receive ${pay.map((p,i)=>`$${sn(p)} for a ${i+1}`).join(', ')} (negative = you pay). Let X be your net gain. Find E(X).</p>`,'num',e.ans(),{hint:'E(X) = ∑ x·P(X = x); subtract the cost.',solution:`<p>(${pay.map(sn).join(' + ')})/6 − ${cost} = <b>${e.h()}</b>.</p>`,meta:{t,pay,cost}});}),
 gen('55-L-indicator',TL[1],r=>{const t=r.int(0,2);let e,desc,sol,meta;
   if(t===0){const m=r.int(3,6),n=r.int(3,5);if(Math.pow(n,m)>20000)return null;e=fr(n).mul(new Fr(BigInt(n-1)**BigInt(m),BigInt(n)**BigInt(m)));desc=`${m} balls are thrown independently and uniformly into ${n} boxes. Find the expected number of EMPTY boxes.`;sol=`indicator for each box: P(empty) = ((${n}−1)/${n})<sup>${m}</sup>; E = ${n}·(${n-1}/${n})<sup>${m}</sup>`;meta={t,m,n};}
   else if(t===1){const k=r.int(3,6),n=r.int(3,6);if(Math.pow(n,k)>20000)return null;e=fr(n).mul(fr(1).sub(new Fr(BigInt(n-1)**BigInt(k),BigInt(n)**BigInt(k))));desc=`A fair ${n}-sided die is rolled ${k} times. Find the expected number of DISTINCT values that appear.`;sol=`indicator for each face: P(appears) = 1 − ((${n}−1)/${n})<sup>${k}</sup>; E = ${n}·(1 − (${n-1}/${n})<sup>${k}</sup>)`;meta={t,k,n};}
   else{const n=r.int(4,8),a=r.int(2,4);if(Math.pow(a,n)>70000)return null;e=fr(n-1,a);desc=`A string of length ${n} has each letter chosen uniformly from an alphabet of ${a} letters. Find the expected number of positions i (1 ≤ i < ${n}) where letter i equals letter i + 1.`;sol=`${n-1} adjacent pairs, each equal with probability 1/${a}: E = ${n-1}/${a}`;meta={t,n,a};}
   return Q(`<p>${desc}</p>`,'num',e.ans(),{hint:'Write X as a sum of indicator variables and use linearity (no independence needed).',solution:`<p>${sol} = <b>${e.h()}</b>.</p>`,meta});}),
 gen('55-L-EXY',TL[2],r=>{const s=r.pick([4,6]);const [i,j]=r.sample([0,1,3,4,5],2);const fX=RV2[i],fY=RV2[j];const xs=[0,1].map(()=>null);
   let EX=fr(0),EY=fr(0),EXY=fr(0);const N=s*s;for(let a=1;a<=s;a++)for(let b=1;b<=s;b++){const x=fX[1](a,b),y=fY[1](a,b);EX=EX.add(fr(x,N));EY=EY.add(fr(y,N));EXY=EXY.add(fr(x*y,N));}
   const ask=r.int(0,1);if(ask===0)return Q(`<p>Roll two fair ${s}-sided dice. X = ${fX[0]}, Y = ${fY[0]}. Compute E(XY).</p>`,'num',EXY.ans(),{hint:'E(XY) = ∑ x·y·P(outcome) over all outcomes; it equals E(X)E(Y) only if X, Y are uncorrelated (e.g. independent).',
     solution:`<p>Summing xy over the ${N} outcomes and dividing by ${N}: E(XY) = <b>${EXY.h()}</b>. (Compare E(X)E(Y) = ${EX.h()}·${EY.h()} = ${EX.mul(EY).h()}.)</p>`,meta:{s,i,j,ask}});
   const v=EXY.eq(EX.mul(EY));return Q(`<p>Roll two fair ${s}-sided dice. X = ${fX[0]}, Y = ${fY[0]}. True or false: E(XY) = E(X)·E(Y)?</p>`,'tf',v,{hint:'Compute both sides exactly.',solution:`<p>E(XY) = ${EXY.h()}, E(X)E(Y) = ${EX.h()}·${EY.h()} = ${EX.mul(EY).h()}. So <b>${v}</b>.</p>`,meta:{s,i,j,ask}});}),
 gen('55-L-indep',TL[2],r=>{const s=r.pick([4,6]);const POOL=[['the first die',(a,b)=>a],['the second die',(a,b)=>b],['the sum',(a,b)=>a+b],['first die mod 2',(a,b)=>a%2],['the parity of the sum',(a,b)=>(a+b)%2],['the max',(a,b)=>Math.max(a,b)],['second die mod 2',(a,b)=>b%2],['1 if the dice are equal, else 0',(a,b)=>a===b?1:0]];
   const [i,j]=r.sample(range(0,POOL.length-1),2);const X=POOL[i][1],Y=POOL[j][1];const N=s*s;const joint=new Map(),px=new Map(),py=new Map();
   for(let a=1;a<=s;a++)for(let b=1;b<=s;b++){const x=X(a,b),y=Y(a,b);joint.set(x+','+y,(joint.get(x+','+y)||0)+1);px.set(x,(px.get(x)||0)+1);py.set(y,(py.get(y)||0)+1);}
   let ind=true,wit=null;for(const [x,cx] of px)for(const [y,cy] of py){if((joint.get(x+','+y)||0)*N!==cx*cy){ind=false;wit=wit||[x,y,joint.get(x+','+y)||0,cx,cy];}}
   return Q(`<p>Roll two fair ${s}-sided dice. Are X = ${POOL[i][0]} and Y = ${POOL[j][0]} independent random variables?</p>`,'tf',ind,{hint:'Independent ⇔ P(X = x, Y = y) = P(X = x)P(Y = y) for ALL pairs (x, y). One failing pair suffices to say no.',
     solution:ind?`<p><b>Yes.</b> For every pair, the joint count times ${N} equals the product of the marginal counts.</p>`:`<p><b>No.</b> P(X=${wit[0]}, Y=${wit[1]}) = ${wit[2]}/${N} but P(X=${wit[0]})P(Y=${wit[1]}) = (${wit[3]}/${N})(${wit[4]}/${N}).</p>`,meta:{s,i,j}});}),
 gen('55-L-variance',TL[3],r=>{const k=r.int(3,5);const vals=r.sample(range(-4,9),k).sort((x,y)=>x-y);const w=vals.map(()=>r.int(1,5));const W=sum(w);const ps=w.map(x=>fr(x,W));
   let E=fr(0),E2=fr(0);vals.forEach((v,i)=>{E=E.add(ps[i].mul(v));E2=E2.add(ps[i].mul(v*v));});const Vr=E2.sub(E.mul(E));
   return Q(`<p>X has distribution ${vals.map((v,i)=>`P(X = ${sn(v)}) = ${ps[i].h()}`).join(', ')}. Find V(X) (exact fraction).</p>`,'num',Vr.ans(),{hint:'V(X) = E(X²) − E(X)².',solution:`<p>E(X) = ${E.h()}, E(X²) = ${E2.h()}, V(X) = ${E2.h()} − (${E.h()})² = <b>${Vr.h()}</b>.</p>`,meta:{vals,w}});}),
 gen('55-L-bienayme',TL[3],r=>{const t=r.int(0,1);
   if(t===0){const n=r.int(2,5),s=r.pick([4,6,8]);if(n*s>30)return null;const v1=fr(s*s-1,12);const Vr=v1.mul(n);return Q(`<p>X is the sum of ${n} independent fair ${s}-sided dice. Find V(X).</p>`,'num',Vr.ans(),{hint:'Bienaymé: variances of independent variables add. One die: V = (s² − 1)/12.',
     solution:`<p>One die: E = ${fr(s+1,2).h()}, E(X²) = ${fr((s+1)*(2*s+1),6).h()}, V = ${v1.h()}. Sum of ${n}: ${n}·${v1.h()} = <b>${Vr.h()}</b>.</p>`,meta:{t,n,s}});}
   const a=r.int(1,5),b=r.int(2,6);let c=r.int(1,3),d=r.pick([2,3,4]);if(c>=d||a>=b)return null;const m=r.int(2,6),k=r.int(2,6);const Vr=fr(a*(b-a),b*b).mul(m).add(fr(c*(d-c),d*d).mul(k));
   return Q(`<p>X = number of successes in ${m} independent trials with success probability ${fr(a,b).h()}, plus the number of successes in ${k} further independent trials with success probability ${fr(c,d).h()}. Find V(X).</p>`,'num',Vr.ans(),{hint:'Each trial is an indicator with variance p(1 − p); independence ⇒ variances add.',
     solution:`<p>${m}·${fr(a,b).h()}·${fr(b-a,b).h()} + ${k}·${fr(c,d).h()}·${fr(d-c,d).h()} = <b>${Vr.h()}</b>.</p>`,meta:{t,a,b,c,d,m,k}});}),
 gen('55-L-chebyshev',TL[4],r=>{const n=r.int(8,16);const p=r.pick([[1,2],[1,4],[1,3],[2,3],[3,4]]);const pf=fr(p[0],p[1]);const mu=pf.mul(n),Vr=pf.mul(fr(p[1]-p[0],p[1])).mul(n);const tt=r.int(2,Math.max(2,Math.floor(n/3)));
   const bound=Vr.div(tt*tt);if(bound.cmp(1)>=0)return null;const ask=r.bool();
   let ex=fr(0);for(let j=0;j<=n;j++){if(fr(j).sub(mu).cmp(tt)>=0||mu.sub(j).cmp(tt)>=0)ex=ex.add(fr(CB(n,j)).mul(new Fr(BigInt(p[0])**BigInt(j)*BigInt(p[1]-p[0])**BigInt(n-j),BigInt(p[1])**BigInt(n))));}
   const ans=ask?bound:ex;
   return Q(`<p>X = number of successes in ${n} independent trials with success probability ${pf.h()}. ${ask?`Give Chebyshev's upper bound on P(|X − E(X)| ≥ ${tt}).`:`Compute the EXACT value of P(|X − E(X)| ≥ ${tt}) (to compare with Chebyshev's bound ${bound.h()}).`}</p>`,'num',ans.ans(),{
     hint:'Chebyshev: P(|X − μ| ≥ t) ≤ V(X)/t² with μ = np, V = np(1−p). Exact: sum the binomial probabilities of the j with |j − μ| ≥ t.',
     solution:`<p>μ = ${mu.h()}, V = ${Vr.h()}. Chebyshev bound: ${Vr.h()}/${tt*tt} = ${bound.h()}. Exact: sum over j with |j − ${mu.h()}| ≥ ${tt} of C(${n}, j)p<sup>j</sup>(1−p)<sup>${n}−j</sup> = ${ex.h()}. Answer <b>${ans.h()}</b>.</p>`,meta:{n,p,tt,ask}});}),
 gen('55-L-binom-mv',TL[5],r=>{const n=r.int(5,40),a=r.int(1,5),b=r.int(2,9);if(a>=b)return null;const p=fr(a,b);const E=p.mul(n),Vr=p.mul(fr(b-a,b)).mul(n);const t=r.int(0,1);
   if(t===0)return Q(`<p>X ~ Binomial(n = ${n}, p = ${p.h()}). Enter E(X) and V(X).</p>`,'list',[E.ans(),Vr.ans()],{hint:'E = np, V = np(1 − p) (sum of n independent indicators).',solution:`<p>E = ${n}·${p.h()} = <b>${E.h()}</b>, V = ${n}·${p.h()}·${fr(b-a,b).h()} = <b>${Vr.h()}</b>.</p>`,meta:{n,a,b,t}});
   const E2=Vr.add(E.mul(E));return Q(`<p>X ~ Binomial(n = ${n}, p = ${p.h()}). Find E(X²).</p>`,'num',E2.ans(),{hint:'E(X²) = V(X) + E(X)².',solution:`<p>V = ${Vr.h()}, E = ${E.h()}: E(X²) = ${Vr.h()} + (${E.h()})² = <b>${E2.h()}</b>.</p>`,meta:{n,a,b,t}});}),
 gen('55-L-dist-urn',TL[0],r=>{const red=r.int(3,7),blue=r.int(3,7),k=r.int(2,Math.min(4,red,blue));const tot=C(red+blue,k);const L=range(0,k).map(x=>fr(C(red,x)*C(blue,k-x),tot));
   return Q(`<p>An urn has ${red} red and ${blue} blue balls. Draw ${k} balls without replacement; X = number of red balls drawn. Enter P(X = 0), P(X = 1), …, P(X = ${k}).</p>`,'list',L.map(x=>x.ans()),{hint:'Hypergeometric: P(X = x) = C(r, x)C(b, k − x)/C(r + b, k).',
     solution:`<p>${L.map((x,i)=>`P(X=${i}) = C(${red},${i})C(${blue},${k-i})/C(${red+blue},${k}) = ${x.h()}`).join('; ')}.</p>`,meta:{red,blue,k}});}),
 gen('55-L-chebyshev-lower',TL[4],r=>{const s=r.pick([4,6]),n=r.int(2,s===4?5:4);const mu=fr(n*(s+1),2),Vr=fr(n*(s*s-1),12);const t=r.int(2,n*(s-1)/2);if(Vr.cmp(t*t)>=0)return null;const lb=fr(1).sub(Vr.div(t*t));
   return Q(`<p>X is the sum of ${n} fair ${s}-sided dice. Use Chebyshev's inequality to give a LOWER bound for P(|X − ${mu.h()}| < ${t}).</p>`,'num',lb.ans(),{hint:'P(|X − μ| < t) ≥ 1 − V(X)/t², with V(X) = n(s² − 1)/12 by Bienaymé.',
     solution:`<p>E(X) = ${mu.h()}, V(X) = ${n}·(${s}² − 1)/12 = ${Vr.h()}. Bound: 1 − ${Vr.h()}/${t*t} = <b>${lb.h()}</b>.</p>`,meta:{s,n,t}});}),
 gen('55-L-binom-inverse',TL[5],r=>{const n=r.int(4,60),a=r.int(1,8),b=r.int(2,10);if(a>=b||gcd(a,b)!==1)return null;const p=fr(a,b);const E=p.mul(n),Vr=p.mul(fr(b-a,b)).mul(n);
   return Q(`<p>X is binomial with E(X) = ${E.h()} and V(X) = ${Vr.h()}. Find n and p (enter n, p).</p>`,'list',[n,p.ans()],{hint:'V/E = 1 − p, then n = E/p.',solution:`<p>1 − p = V/E = ${Vr.div(E).h()} ⇒ p = ${p.h()}; n = E/p = <b>${n}</b>.</p>`,meta:{E:E.ans(),V:Vr.ans()}});}),
];

// =========================================================
// 55-M  Recurrence relations
// =========================================================
const TM=['Set up recurrences from counting (bit strings, tilings, stairs, regions)','Linear homogeneous: distinct, repeated, degree-3 roots','Nonhomogeneous: particular solutions incl. the resonance case','Use initial conditions; verify a closed form'];
const iterRec=(cs,init,F,N)=>{const a=init.slice();for(let n=init.length;n<=N;n++){let v=F?F(n):fr(0);cs.forEach((c,i)=>v=fr(v).add(fr(a[n-1-i]).mul(c)));a.push(fr(v));}return a.map(fr);};
const recStr=(cs,extra)=>'a<sub>n</sub> = '+lin(cs.map((c,i)=>[c,`a<sub>n−${i+1}</sub>`]))+(extra?` + ${extra}`:'');
const BANNED_REC=new Set(['6,-11,6','6,-9','4,5']);
G['55-M']=[
 gen('55-M-strings',TM[0],r=>{const t=r.int(0,3);const k=t===3?r.int(3,4):r.int(2,4);const n=r.int(5,k===2?14:k===3?9:7);let a,desc,rec;
   // DP independent of enumeration
   if(t===0){const A=[1,k];for(let i=2;i<=n;i++)A[i]=(k-1)*(A[i-1]+A[i-2]);a=A[n];desc=`strings of length ${n} over {0, …, ${k-1}} with NO two consecutive 0s`;rec=`a<sub>n</sub> = ${k-1}a<sub>n−1</sub> + ${k-1}a<sub>n−2</sub> (last symbol nonzero, or last two = x0 with x ≠ 0), a₀ = 1, a₁ = ${k}`;}
   else if(t===1){const A=[1,k,k*k,k*k*k];for(let i=4;i<=n;i++)A[i]=(k-1)*(A[i-1]+A[i-2]+A[i-3]+A[i-4]);a=A[n];desc=`strings of length ${n} over {0, …, ${k-1}} that do NOT contain 0000 (four consecutive 0s)`;rec=`a<sub>n</sub> = ${k-1}(a<sub>n−1</sub> + a<sub>n−2</sub> + a<sub>n−3</sub> + a<sub>n−4</sub>) for n ≥ 4 (condition on the number 0–3 of trailing 0s before the last nonzero symbol), a₀…a₃ = 1, ${k}, ${k*k}, ${k*k*k}`;}
   else if(t===2){const A=[1];for(let i=1;i<=n;i++)A[i]=(k-2)*A[i-1]+Math.pow(k,i-1);a=A[n];desc=`strings of length ${n} over {0, …, ${k-1}} containing an EVEN number of 0s`;rec=`a<sub>n</sub> = ${k-2}a<sub>n−1</sub> + ${k}<sup>n−1</sup> (append a nonzero symbol to a good string, or a 0 to a bad one: ${k}ⁿ⁻¹ − a<sub>n−1</sub>), a₀ = 1`;if(k===2)return null;}
   else{const B=[1,k];for(let i=2;i<=n;i++)B[i]=(k-1)*B[i-1]+(k-2)*B[i-2];a=B[n];desc=`strings of length ${n} over {0, …, ${k-1}} containing neither 00 nor 11`;rec=`a<sub>n</sub> = ${k-1}a<sub>n−1</sub> + ${k-2}a<sub>n−2</sub> (split on whether the last symbol is ≥ 2 or a 0/1), a₀ = 1, a₁ = ${k}`;}
   if(Math.pow(k,n)>70000)return null;
   return Q(`<p>Let a<sub>n</sub> count the ${desc.replace(String(n),'n')}. Set up a recurrence and compute a<sub>${n}</sub>.</p>`,'num',a,{hint:'Condition on how the string ends (last symbol / last block) to get a recurrence; then iterate from the initial conditions.',
     solution:`<p>${rec}. Iterating gives a<sub>${n}</sub> = <b>${a}</b>.</p>`,meta:{t,k,n}});}),
 gen('55-M-tiling',TM[0],r=>{const t=r.int(0,2);
   if(t===0){const c1=r.int(1,3),c2=r.int(1,3),c3=r.int(0,2),n=r.int(5,12);const A=[1];for(let i=1;i<=n;i++)A[i]=c1*A[i-1]+(i>=2?c2*A[i-2]:0)+(i>=3?c3*A[i-3]:0);
     return Q(`<p>Tile a 1 × n strip using 1 × 1 tiles (${c1} colour${c1>1?'s':''}), 1 × 2 tiles (${c2} colour${c2>1?'s':''})${c3?` and 1 × 3 tiles (${c3} colour${c3>1?'s':''})`:''}. Let a<sub>n</sub> be the number of tilings (a₀ = 1). Find a<sub>${n}</sub>.</p>`,'num',A[n],{
       hint:'Condition on the last tile.',solution:`<p>a<sub>n</sub> = ${c1}a<sub>n−1</sub> + ${c2}a<sub>n−2</sub>${c3?` + ${c3}a<sub>n−3</sub>`:''}. Values: ${A.join(', ')}. a<sub>${n}</sub> = <b>${A[n]}</b>.</p>`,meta:{t,c1,c2,c3,n}});}
   if(t===1){const n=r.int(4,10);const A=[1,1];for(let i=2;i<=n;i++)A[i]=A[i-1]+2*A[i-2];
     return Q(`<p>Count the tilings of a 2 × ${n} board with 1 × 2 dominoes (either orientation) and 2 × 2 squares.</p>`,'num',A[n],{hint:'Look at the left end: a vertical domino, two horizontal dominoes, or a 2×2 square.',
       solution:`<p>a<sub>n</sub> = a<sub>n−1</sub> + 2a<sub>n−2</sub>, a₀ = a₁ = 1: ${A.join(', ')}. a<sub>${n}</sub> = <b>${A[n]}</b>.</p>`,meta:{t,n}});}
   const st=r.pick([[1,2],[1,3],[2,3],[1,2,3],[1,4],[1,2,4],[2,3,4]]);const n=r.int(6,15);const A=[1];for(let i=1;i<=n;i++)A[i]=sum(st.map(s=>i>=s?A[i-s]:0));
   return Q(`<p>A child climbs a staircase of ${n} steps, each move going up ${st.join(' or ')} steps. Order matters. In how many ways can the child reach the top?</p>`,'num',A[n],{hint:'Condition on the size of the last move.',
     solution:`<p>a<sub>n</sub> = ${st.map(s=>`a<sub>n−${s}</sub>`).join(' + ')}, a₀ = 1 (a<sub>negative</sub> = 0): ${A.join(', ')}. a<sub>${n}</sub> = <b>${A[n]}</b>.</p>`,meta:{t,st,n}});}),
 gen('55-M-distinct',TM[1],r=>{const r1=r.int(-3,7),r2=r.int(-4,6);if(r1<=r2||r1===0||r2===0)return null;const c1=r1+r2,c2=-r1*r2;if(BANNED_REC.has(c1+','+c2))return null;if(r1===3&&r2===2)return null;
   const al=r.int(-4,5),be=r.int(-4,5);if(!al||!be)return null;const a0=al+be,a1=al*r1+be*r2;
   return Q(`<p>Solve ${recStr([c1,c2])} with a₀ = ${sn(a0)}, a₁ = ${sn(a1)}. Write a<sub>n</sub> = α·r₁ⁿ + β·r₂ⁿ with r₁ > r₂ the characteristic roots. Enter r₁, r₂, α, β.</p>`,'list',[r1,r2,al,be],{
     hint:`Characteristic equation r² − ${sn(c1)}r − ${sn(c2)} = 0; then use a₀, a₁ to solve for α, β.`,
     solution:`<p>r² ${c1<0?'+':'−'} ${Math.abs(c1)}r ${c2<0?'+':'−'} ${Math.abs(c2)} = (r − ${sn(r1)})(r − ${sn(r2)}) ⇒ r₁ = ${r1}, r₂ = ${r2}. α + β = ${a0}, ${r1}α + ${sn(r2)}β = ${a1} ⇒ α = <b>${al}</b>, β = <b>${be}</b>.</p>`,meta:{c:[c1,c2],init:[a0,a1]}});}),
 gen('55-M-repeated',TM[1],r=>{const rt=r.pick([-4,-3,-2,2,4,5,-5]);const c1=2*rt,c2=-rt*rt;if(BANNED_REC.has(c1+','+c2))return null;const al=r.int(-5,6),be=r.int(-4,5);if(!be)return null;const a0=al,a1=(al+be)*rt;
   return Q(`<p>Solve ${recStr([c1,c2])} with a₀ = ${sn(a0)}, a₁ = ${sn(a1)}. Write a<sub>n</sub> = (α + βn)·rⁿ. Enter r, α, β.</p>`,'list',[rt,al,be],{hint:'A repeated root r gives the solutions rⁿ and n·rⁿ.',
     solution:`<p>r² ${c1<0?'+':'−'} ${Math.abs(c1)}r + ${-c2} = (r − ${sn(rt)})² ⇒ r = ${rt}. a₀ = α = ${a0}; a₁ = (α + β)·${sn(rt)} = ${a1} ⇒ β = ${be}. Answer <b>${rt}, ${al}, ${be}</b>.</p>`,meta:{c:[c1,c2],init:[a0,a1]}});}),
 gen('55-M-degree3',TM[1],r=>{const rs=r.sample([-3,-2,-1,1,2,3,4,5],3).sort((x,y)=>x-y);if(rs.join()==='1,2,3')return null;const [x,y,z]=rs;const c1=x+y+z,c2=-(x*y+x*z+y*z),c3=x*y*z;if(BANNED_REC.has([c1,c2,c3].join()))return null;
   const co=[r.int(-3,3),r.int(-3,3),r.int(-3,3)];if(co.filter(v=>v).length<2)return null;const val=n=>co[0]*Math.pow(x,n)+co[1]*Math.pow(y,n)+co[2]*Math.pow(z,n);const init=[val(0),val(1),val(2)];const N=r.int(5,8);const ask=r.bool();
   const pr=`Consider ${recStr([c1,c2,c3])} with a₀ = ${sn(init[0])}, a₁ = ${sn(init[1])}, a₂ = ${sn(init[2])}.`;
   if(ask)return Q(`<p>${pr} Find the three roots of the characteristic equation (any order).</p>`,'list',rs,{unordered:true,hint:'r³ − c₁r² − c₂r − c₃ = 0; try small integer divisors of the constant term.',
     solution:`<p>r³ ${lin([[-c1,'r²'],[-c2,'r'],[-c3,'']])} = (r − ${sn(x)})(r − ${sn(y)})(r − ${sn(z)}) ⇒ roots <b>${rs.join(', ')}</b>.</p>`,meta:{c:[c1,c2,c3],init,ask,rs}});
   return Q(`<p>${pr} Find a closed form and use it (or iterate) to compute a<sub>${N}</sub>.</p>`,'num',val(N),{hint:'Roots of r³ − c₁r² − c₂r − c₃; solve a 3×3 system for the coefficients from a₀, a₁, a₂.',
     solution:`<p>Roots ${rs.join(', ')}; a<sub>n</sub> = ${lin([[co[0],`(${sn(x)})ⁿ`],[co[1],`(${sn(y)})ⁿ`],[co[2],`(${sn(z)})ⁿ`]])}. a<sub>${N}</sub> = <b>${val(N)}</b>.</p>`,meta:{c:[c1,c2,c3],init,ask,N}});}),
 gen('55-M-particular-exp',TM[2],r=>{const r1=r.int(-3,5),r2=r.int(-3,4);if(r1===r2||!r1||!r2)return null;const c1=r1+r2,c2=-r1*r2;if(BANNED_REC.has(c1+','+c2))return null;const res=r.float()<0.5;const s=res?r.pick([r1,r2]):r.pick([2,3,4,5,-2].filter(v=>v!==r1&&v!==r2));const k=r.int(1,9);
   // a_n = c1 a_{n−1} + c2 a_{n−2} + k sⁿ; try A·n^m·sⁿ
   const m=res?1:0;const g=n=>Math.pow(n,m);// plug: A[g(n)sⁿ − c1 g(n−1)sⁿ⁻¹ − c2 g(n−2)sⁿ⁻²] = k sⁿ, at n = 2: divide by s^{n−2}
   const coef=fr(g(2)*s*s-c1*g(1)*s-c2*g(0));if(coef.isZero())return null;const A=fr(k*s*s).div(coef);
   return Q(`<p>Find a particular solution of ${recStr([c1,c2],`${k}·${s<0?'('+sn(s)+')':s}ⁿ`)} of the form A·n<sup>m</sup>·${s<0?'('+sn(s)+')':s}ⁿ with m ≥ 0 as small as possible. Enter m, A.</p>`,'list',[m,A.ans()],{
     hint:`Characteristic roots ${'?'}: if ${sn(s)} is a root of multiplicity t, the trial form gets a factor nᵗ (resonance).`.replace('?','of r² − c₁r − c₂'),
     solution:`<p>Characteristic roots: ${r1}, ${r2}. ${res?`${sn(s)} IS a root (multiplicity 1), so try A·n·${sn(s)}ⁿ (m = 1).`:`${sn(s)} is not a root, so try A·${sn(s)}ⁿ (m = 0).`} Substituting and dividing by ${sn(s)}<sup>n−2</sup> (at n = 2): A·(${coef.h()}) = ${k*s*s} ⇒ A = <b>${A.h()}</b>.</p>`,meta:{c:[c1,c2],k,s}});}),
 gen('55-M-particular-poly',TM[2],r=>{const c=r.int(-3,4);const p=r.int(-5,6),q=r.int(-6,6);if(!p)return null;
   if(c===1){// a_n = a_{n−1} + pn + q ⇒ An² + Bn: A(2n−1) + B = pn + q ⇒ A = p/2, B = q + p/2
     const A=fr(p,2),B=fr(q).add(fr(p,2));return Q(`<p>Find the particular solution of the form a<sub>n</sub><sup>(p)</sup> = An² + Bn for a<sub>n</sub> = ${lin([[1,'a<sub>n−1</sub>'],[p,'n'],[q,'']])}. (Why is An + B not enough?) Enter A, B.</p>`,'list',[A.ans(),B.ans()],{
       hint:'1 is a characteristic root, so the polynomial trial form is multiplied by n.',solution:`<p>An² + Bn − A(n−1)² − B(n−1) = 2An − A + B = ${lin([[p,'n'],[q,'']])} ⇒ A = ${A.h()}, B = ${q} + A = ${B.h()}. (An + B fails because constants solve the homogeneous equation.)</p>`,meta:{c,p,q}});}
   if(c===0)return null;// a_n = c a_{n−1} + pn + q, try An + B: An + B − cA(n−1) − cB = pn + q ⇒ A(1−c) = p; B(1−c) + cA = q
   const A=fr(p,1-c),B=fr(q).sub(A.mul(c)).div(1-c);
   return Q(`<p>Find the particular solution a<sub>n</sub><sup>(p)</sup> = An + B of a<sub>n</sub> = ${lin([[c,'a<sub>n−1</sub>'],[p,'n'],[q,'']])}. Enter A, B.</p>`,'list',[A.ans(),B.ans()],{hint:'Substitute An + B and match coefficients of n and of 1.',
     solution:`<p>An + B = ${sn(c)}(A(n−1) + B) + ${lin([[p,'n'],[q,'']])}. n: A = ${sn(c)}A + ${p} ⇒ A = ${A.h()}. 1: B = ${sn(-c)}A + ${sn(c)}B + ${q} ⇒ B = ${B.h()}.</p>`,meta:{c,p,q}});}),
 gen('55-M-nonhom-value',TM[3],r=>{const c=r.int(-3,4);if(c===0||c===1)return null;const s=r.int(-3,5);if(s===0||s===1)return null;const k=r.int(1,6),a0=r.int(-5,8),N=r.int(4,8);
   // a_n = c a_{n−1} + k sⁿ
   let A;if(s!==c){A=fr(k*s,s-c);const al=fr(a0).sub(A);
     const val=n=>al.mul(new Fr(BigInt(c)**BigInt(n))).add(A.mul(new Fr(BigInt(s)**BigInt(n))));
     return Q(`<p>Solve a<sub>n</sub> = ${lin([[c,'a<sub>n−1</sub>']])} + ${k}·${s<0?'('+sn(s)+')':s}ⁿ with a₀ = ${sn(a0)}, and give a<sub>${N}</sub>.</p>`,'num',val(N).ans(),{hint:'General solution = homogeneous α·cⁿ + particular A·sⁿ; fit α with a₀.',
       solution:`<p>Particular: A·${sn(s)}ⁿ with A = ${k}·${sn(s)}/(${sn(s)} − ${sn(c)}) = ${A.h()}. a<sub>n</sub> = α·(${sn(c)})ⁿ + ${A.h()}·(${sn(s)})ⁿ, α = ${a0} − ${A.h()} = ${al.h()}. a<sub>${N}</sub> = <b>${val(N).h()}</b>.</p>`,meta:{c,s,k,a0,N}});}
   // resonance s = c: particular A n cⁿ with A = k
   const val=n=>fr(a0).add(fr(k*n)).mul(new Fr(BigInt(c)**BigInt(n)));
   return Q(`<p>Solve a<sub>n</sub> = ${lin([[c,'a<sub>n−1</sub>']])} + ${k}·${c<0?'('+sn(c)+')':c}ⁿ with a₀ = ${sn(a0)}, and give a<sub>${N}</sub>.</p>`,'num',val(N).ans(),{hint:'Resonance: the forcing base equals the characteristic root, so try A·n·cⁿ.',
     solution:`<p>A·n·${sn(c)}ⁿ: A·n·cⁿ − c·A(n−1)cⁿ⁻¹ = A·cⁿ = ${k}cⁿ ⇒ A = ${k}. a<sub>n</sub> = (${a0} + ${k}n)·(${sn(c)})ⁿ. a<sub>${N}</sub> = <b>${val(N).h()}</b>.</p>`,meta:{c,s,k,a0,N}});}),
 gen('55-M-verify',TM[3],r=>{const r1=r.int(-3,5),r2=r.int(-4,4);if(r1<=r2||!r1||!r2)return null;const c1=r1+r2,c2=-r1*r2;if(BANNED_REC.has(c1+','+c2))return null;const al=r.int(-3,4),be=r.int(-3,4);if(!al||!be)return null;
   const a0=al+be,a1=al*r1+be*r2;const good=r.bool();let A=al,B=be,R1=r1,R2=r2;
   if(!good){const t=r.int(0,2);if(t===0)A=al+r.pick([-1,1]);else if(t===1)R1=-r1;else{A=be;B=al;}if(A===al&&B===be&&R1===r1)return null;}
   const f=n=>A*Math.pow(R1,n)+B*Math.pow(R2,n);let ok=true;const seq=[a0,a1];for(let n=2;n<=6;n++)seq.push(c1*seq[n-1]+c2*seq[n-2]);for(let n=0;n<=6;n++)if(f(n)!==seq[n])ok=false;
   return Q(`<p>True or false: a<sub>n</sub> = ${lin([[A,`(${sn(R1)})ⁿ`],[B,`(${sn(R2)})ⁿ`]])} is the solution of ${recStr([c1,c2])} with a₀ = ${sn(a0)}, a₁ = ${sn(a1)}.</p>`,'tf',ok,{
     hint:'Check two things: the bases must be characteristic roots, and the formula must match a₀ and a₁.',
     solution:`<p>Characteristic roots: ${r1}, ${r2}. Formula gives a₀ = ${f(0)}, a₁ = ${f(1)}, a₂ = ${f(2)}; the recurrence gives ${seq.slice(0,3).join(', ')}. So <b>${ok}</b>.</p>`,meta:{c:[c1,c2],init:[a0,a1],A,B,R1,R2}});}),
];

// =========================================================
// 55-N  Inclusion–exclusion
// =========================================================
const TN=['Two- and three-set inclusion–exclusion','‘None of’ counts; divisibility with lcm','Bounded integer solutions; dice sums','Derangements; onto functions / surjective assignments','Euler φ via inclusion–exclusion'];
G['55-N']=[
 gen('55-N-venn',TN[0],r=>{// regions: a(A only) b(B only) c(C only) ab ac bc abc
   const g=range(1,7).map(()=>r.int(0,25));const [a,b,c,ab,ac,bc,abc]=g;const A=a+ab+ac+abc,B=b+ab+bc+abc,Cc=c+ac+bc+abc,AB=ab+abc,AC=ac+abc,BC=bc+abc,U=sum(g);const t=r.int(0,2);
   const names=r.pick([['French','German','Spanish'],['calculus','discrete math','data structures'],['soccer','tennis','chess']]);
   const base=`|A| = ${A}, |B| = ${B}, |C| = ${Cc}, |A ∩ B| = ${AB}, |A ∩ C| = ${AC}, |B ∩ C| = ${BC}`;let ask,ans;
   if(t===0){ask=`${base}, |A ∩ B ∩ C| = ${abc}. How many students take at least one of these courses?`;ans=U;}
   else if(t===1){ask=`${base}, and ${U} students take at least one of them. How many take all three?`;ans=abc;}
   else{ask=`${base}, |A ∩ B ∩ C| = ${abc}. How many students take EXACTLY ONE of the three?`;ans=a+b+c;}
   return Q(`<p>A = students taking ${names[0]}, B = ${names[1]}, C = ${names[2]}. ${ask}</p>`,'num',ans,{hint:'|A∪B∪C| = |A|+|B|+|C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|. For “exactly one”, fill in the Venn regions from the inside out.',
     solution:`<p>${t===0?`${A}+${B}+${Cc} − ${AB} − ${AC} − ${BC} + ${abc} = <b>${U}</b>.`:t===1?`${U} = ${A}+${B}+${Cc} − ${AB} − ${AC} − ${BC} + x ⇒ x = <b>${abc}</b>.`:`Regions: only A = ${A} − ${AB} − ${AC} + ${abc} = ${a}, only B = ${b}, only C = ${c}; total <b>${a+b+c}</b>.`}</p>`,meta:{g,t}});}),
 gen('55-N-none',TN[1],r=>{const N=r.int(200,2400);const ds=r.sample(range(2,15),3).sort((x,y)=>x-y);if(gcd(ds[0],ds[1])===1&&gcd(ds[0],ds[2])===1&&gcd(ds[1],ds[2])===1&&r.float()<0.85)return null;
   if(ds.some((d,i)=>ds.some((e,j)=>i!==j&&e%d===0)))return null;if(N===1000&&ds.join()==='4,6,9')return null;const [x,y,z]=ds;
   const fl=d=>Math.floor(N/d);const ans=N-fl(x)-fl(y)-fl(z)+fl(lcm(x,y))+fl(lcm(x,z))+fl(lcm(y,z))-fl(lcm(lcm(x,y),z));
   return Q(`<p>How many integers in {1, 2, …, ${N}} are divisible by NONE of ${x}, ${y}, ${z}?</p>`,'num',ans,{hint:'Inclusion–exclusion on “divisible by d”; intersections use the lcm (not the product!).',
     solution:`<p>${N} − (⌊${N}/${x}⌋ + ⌊${N}/${y}⌋ + ⌊${N}/${z}⌋) + (⌊${N}/${lcm(x,y)}⌋ + ⌊${N}/${lcm(x,z)}⌋ + ⌊${N}/${lcm(y,z)}⌋) − ⌊${N}/${lcm(lcm(x,y),z)}⌋ = ${N} − (${fl(x)} + ${fl(y)} + ${fl(z)}) + (${fl(lcm(x,y))} + ${fl(lcm(x,z))} + ${fl(lcm(y,z))}) − ${fl(lcm(lcm(x,y),z))} = <b>${ans}</b>.</p>`,meta:{N,ds}});}),
 gen('55-N-exactly',TN[1],r=>{const N=r.int(100,1500);const ds=r.sample(range(2,12),3).sort((x,y)=>x-y);if(ds.some((d,i)=>ds.some((e,j)=>i!==j&&e%d===0)))return null;const t=r.int(0,2);const [x,y,z]=ds;const fl=d=>Math.floor(N/d);
   const S1=fl(x)+fl(y)+fl(z),S2=fl(lcm(x,y))+fl(lcm(x,z))+fl(lcm(y,z)),S3=fl(lcm(lcm(x,y),z));const ans=t===0?S1-2*S2+3*S3:t===1?S2-3*S3:S2-2*S3;const what=['exactly one','exactly two','at least two'][t];
   return Q(`<p>How many integers in {1, …, ${N}} are divisible by ${what} of ${x}, ${y}, ${z}?</p>`,'num',ans,{hint:'With S₁ = Σ|Aᵢ|, S₂ = Σ|Aᵢ∩Aⱼ|, S₃ = |A₁∩A₂∩A₃|: exactly one = S₁ − 2S₂ + 3S₃, exactly two = S₂ − 3S₃, at least two = S₂ − 2S₃.',
     solution:`<p>S₁ = ${S1}, S₂ = ${fl(lcm(x,y))} + ${fl(lcm(x,z))} + ${fl(lcm(y,z))} = ${S2} (lcms ${lcm(x,y)}, ${lcm(x,z)}, ${lcm(y,z)}), S₃ = ${S3}. Answer <b>${ans}</b>.</p>`,meta:{N,ds,t}});}),
 gen('55-N-bounded',TN[2],r=>{const k=r.int(3,4);const us=range(1,k).map(()=>r.int(2,8));const n=r.int(Math.max(...us)+1,sum(us)-2);if(k===4&&n===15)return null;
   let ans=0;const terms=[];for(let m=0;m<(1<<k);m++){let s=n,bits=0;for(let i=0;i<k;i++)if(m>>i&1){s-=us[i]+1;bits++;}if(s<0)continue;const v=C(s+k-1,k-1)*(bits%2?-1:1);ans+=v;if(v)terms.push((v<0?'− ':'+ ')+Math.abs(v));}
   return Q(`<p>How many integer solutions of x₁ + … + x<sub>${k}</sub> = ${n} satisfy ${us.map((u,i)=>`0 ≤ x${'₀₁₂₃₄'[i+1]} ≤ ${u}`).join(', ')}?</p>`,'num',ans,{hint:'Complement the upper bounds: subtract solutions with xᵢ ≥ uᵢ + 1 (substitute), add back pairs, …',
     solution:`<p>∑ over subsets S of violated bounds (−1)<sup>|S|</sup> C(${n} − ∑<sub>i∈S</sub>(uᵢ+1) + ${k-1}, ${k-1}): ${terms.join(' ').replace(/^\+ /,'')} = <b>${ans}</b>.</p>`,meta:{k,us,n}});}),
 gen('55-N-dice',TN[2],r=>{const k=r.int(3,5),s=r.pick([4,6,8]);if(Math.pow(s,k)>9000)return null;const t=r.int(k+2,Math.floor(k*(s+1)/2));if(k===5&&s===6&&t===18)return null;
   let ans=0;const terms=[];for(let j=0;j<=k;j++){const m=t-k-j*s;if(m<0)break;const v=(j%2?-1:1)*C(k,j)*C(m+k-1,k-1);ans+=v;terms.push(`${j%2?'−':'+'} C(${k},${j})·C(${m+k-1},${k-1})`);}
   return Q(`<p>In how many ways (ordered outcomes) can ${k} distinguishable ${s}-sided dice show a total of ${t}?</p>`,'num',ans,{hint:`Let yᵢ = dieᵢ − 1 ∈ [0, ${s-1}], ∑ yᵢ = ${t-k}; inclusion–exclusion on yᵢ ≥ ${s}.`,
     solution:`<p>${terms.join(' ').replace(/^\+ /,'')} = <b>${ans}</b>.</p>`,meta:{k,s,t}});}),
 gen('55-N-onto',TN[3],r=>{const m=r.int(4,8),n=r.int(2,Math.min(5,m));if(n===m&&r.float()<0.7)return null;let ans=0;for(let j=0;j<=n;j++)ans+=(j%2?-1:1)*C(n,j)*Math.pow(n-j,m);
   const story=r.pick([`onto functions from a ${m}-element set to a ${n}-element set`,`ways to assign ${m} different jobs to ${n} workers so that every worker gets at least one job`,`ways to put ${m} distinguishable balls into ${n} distinguishable boxes with no box empty`]);
   return Q(`<p>How many ${story} are there?</p>`,'num',ans,{hint:'Inclusion–exclusion over the set of missed targets: ∑ (−1)ʲ C(n, j)(n − j)ᵐ.',
     solution:`<p>${range(0,n).map(j=>`${j%2?'−':'+'} C(${n},${j})·${n-j}<sup>${m}</sup>`).join(' ').replace(/^\+ /,'')} = <b>${ans}</b>.</p>`,meta:{m,n}});}),
 gen('55-N-partial-derange',TN[3],r=>{const n=r.int(5,9);const t=r.int(0,1);
   if(t===1){let ans=0;for(let j=0;j<n;j++)ans+=(j%2?-1:1)*C(n-1,j)*fact(n-j);
     return Q(`<p>How many permutations p of {1, 2, …, ${n}} satisfy p(i) ≠ i + 1 for every i = 1, …, ${n-1}?</p>`,'num',ans,{hint:'Inclusion–exclusion over the n − 1 forbidden assignments i ↦ i+1; any j of them can hold simultaneously (distinct inputs and outputs).',
       solution:`<p>∑<sub>j</sub> (−1)ʲ C(${n-1}, j)(${n} − j)! = <b>${ans}</b>.</p>`,meta:{n,k:0,t}});}
   const k=r.int(2,n-1);let ans=0;for(let j=0;j<=k;j++)ans+=(j%2?-1:1)*C(k,j)*fact(n-j);
   return Q(`<p>How many permutations of {1, 2, …, ${n}} leave NONE of the elements 1, 2, …, ${k} in its original position? (${k+1===n?`Element ${n} may`:`Elements ${k+1}…${n} may`} or may not move.)</p>`,'num',ans,{hint:'Inclusion–exclusion on the k “forbidden fixed points”: ∑ (−1)ʲ C(k, j)(n − j)!.',
     solution:`<p>${range(0,k).map(j=>`${j%2?'−':'+'} C(${k},${j})·${n-j}!`).join(' ').replace(/^\+ /,'')} = <b>${ans}</b>.</p>`,meta:{n,k,t}});}),
 gen('55-N-couples',TN[3],r=>{const t=r.int(0,2);const n=r.int(2,t===0?4:t===1?4:5);const s=r.int(0,2);const N=2*n+s;if(t===0&&N>8||t===1&&(N>9||N<4)||t===2&&N>10)return null;let ans=0;const terms=[];
   for(let j=0;j<=n;j++){const v=t===0?C(n,j)*Math.pow(2,j)*fact(N-j):t===1?C(n,j)*Math.pow(2,j)*fact(N-j-1):C(n,j)*fact(N-j)/Math.pow(2,n-j);ans+=(j%2?-1:1)*v;terms.push(`${j%2?'−':'+'} ${v}`);}
   let pr,hint;if(t===0){pr=`${n} married couples${s?` and ${s} single ${s>1?'people':'person'}`:''} (${N} people) sit in a row of ${N} chairs. In how many arrangements does NO couple sit next to each other?`;hint='Aᵢ = couple i adjacent; glue j couples: 2ʲ(N − j)! arrangements.';}
   else if(t===1){pr=`${n} married couples${s?` and ${s} single ${s>1?'people':'person'}`:''} (${N} people) sit around a round table (rotations are the same). In how many seatings does NO couple sit side by side?`;hint='Glue j couples: N − j units around a table, (N − j − 1)! seatings, times 2ʲ.';}
   else{const L='ABCDE'.slice(0,n).split('');const singles='XYZ'.slice(0,s).split('');pr=`How many arrangements of the letters ${L.map(x=>x+x).join('')}${singles.join('')} have no two identical letters adjacent?`;hint='Aᵢ = the two copies of letter i adjacent (glue them); multiset permutations of N − j symbols with n − j doubled letters.';}
   return Q(`<p>${pr}</p>`,'num',ans,{hint:'Inclusion–exclusion. '+hint,solution:`<p>∑<sub>j=0</sub><sup>${n}</sup> (−1)ʲ·C(${n}, j)·(arrangements with j chosen pairs glued): ${terms.join(' ').replace(/^\+ /,'')} = <b>${ans}</b>.</p>`,meta:{t,n,s}});}),
 gen('55-N-phi',TN[4],r=>{const t=r.int(0,1);
   if(t===0){const ps=r.sample([2,3,5,7,11,13],r.int(2,3));const n=ps.reduce((a,p)=>a*Math.pow(p,r.int(1,2)),1);if(n>20000)return null;const ph=phi(n);
     return Q(`<p>Use inclusion–exclusion to compute φ(${n}), the number of integers in {1, …, ${n}} relatively prime to ${n}.</p>`,'num',ph,{hint:'Remove multiples of each prime factor, add back multiples of products of two, …: φ(n) = n∏(1 − 1/p).',
       solution:`<p>${n} = ${fmtFact(factorize(n))}. φ = ${n}${factorize(n).map(([p])=>`(1 − 1/${p})`).join('')} = <b>${ph}</b>.</p>`,meta:{t,n}});}
   const ps=r.sample([2,3,5,7],r.int(2,3));const M=ps.reduce((a,b)=>a*b,1);const N=r.int(50,500);if(N%M===0)return null;let ans=0;
   for(let m=0;m<(1<<ps.length);m++){let d=1,b=0;ps.forEach((p,i)=>{if(m>>i&1){d*=p;b++;}});ans+=(b%2?-1:1)*Math.floor(N/d);}
   return Q(`<p>How many integers in {1, …, ${N}} are relatively prime to ${M}?</p>`,'num',ans,{hint:`${M} = ${ps.join('·')}; inclusion–exclusion over the primes with ⌊N/d⌋ (N is not a multiple of ${M}, so the φ shortcut does not apply directly).`,
     solution:`<p>∑<sub>d | ${M}</sub> μ(d)⌊${N}/d⌋ = <b>${ans}</b>.</p>`,meta:{t,N,M}});}),
 gen('55-N-strings',TN[0],r=>{const k=r.int(3,5),n=r.int(4,7);if(Math.pow(k,n)>50000)return null;const j=r.int(2,Math.min(3,k));let v=0;for(let i=0;i<=j;i++)v+=(i%2?-1:1)*C(j,i)*Math.pow(k-i,n);const L='abcde'.slice(0,k).split('');
   return Q(`<p>How many strings of length ${n} over {${L.join(', ')}} contain each of ${L.slice(0,j).join(', ')} at least once?</p>`,'num',v,{hint:'Aᵢ = strings missing letter i; inclusion–exclusion over the required letters.',
     solution:`<p>∑<sub>i=0</sub><sup>${j}</sup> (−1)ⁱ C(${j}, i)(${k} − i)<sup>${n}</sup> = ${range(0,j).map(i=>`${i%2?'−':'+'} ${C(j,i)}·${Math.pow(k-i,n)}`).join(' ').replace(/^\+ /,'')} = <b>${v}</b>.</p>`,meta:{k,n,j}});}),
 gen('55-N-phi-inverse',TN[4],r=>{const n0=r.int(3,90);const v=phi(n0);if(v>60)return null;const S=range(1,2*v*v+2).filter(n=>phi(n)===v);
   return Q(`<p>Find ALL positive integers n with φ(n) = ${v} (any order).</p>`,'list',S,{unordered:true,hint:'φ(n) = ∏ p^(e−1)(p − 1): every prime p | n has p − 1 dividing φ(n); this limits the primes, then check exponents.',
     solution:`<p>Possible primes p have p − 1 | ${v}: ${primesUpTo(v+1).filter(p=>v%(p-1)===0).join(', ')}. Checking combinations: <b>${S.join(', ')}</b>.</p>`,meta:{v}});}),
];

// =========================================================
// 55-O  Relations, closures, equivalence relations, partial orders
// =========================================================
const TO=['Decide reflexive/symmetric/antisymmetric/transitive (on ℤ, ℝ, sets, finite lists)','Count relations with given properties','Composition and powers of relations','Reflexive, symmetric and transitive closures (paths / Warshall)','Equivalence relations: prove, list classes, count, partitions','Partial orders: prove, Hasse diagrams, maximal/minimal/greatest/least, bounds, lub/glb, lattices, topological sort'];
const PROPS=['reflexive','irreflexive','symmetric','antisymmetric','transitive'];
function relProps(M,n){const R=(a,b)=>M[a][b];let ref=true,irr=true,sym=true,anti=true,tr=true;
  for(let a=0;a<n;a++){if(!R(a,a))ref=false;else irr=false;for(let b=0;b<n;b++){if(R(a,b)&&!R(b,a))sym=false;if(a!==b&&R(a,b)&&R(b,a))anti=false;for(let c=0;c<n;c++)if(R(a,b)&&R(b,c)&&!R(a,c))tr=false;}}
  return [ref,irr,sym,anti,tr];}
const pairsOf=(M,n)=>{const o=[];for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(M[a][b])o.push([a+1,b+1]);return o;};
const fmtPairs=ps=>ps.length?'{'+ps.map(([a,b])=>`(${a}, ${b})`).join(', ')+'}':'∅';
const zeroM=n=>Array.from({length:n},()=>Array(n).fill(false));
function randRel(r,n){const t=r.int(0,4);let M=zeroM(n);
  if(t===0){for(let a=0;a<n;a++)for(let b=0;b<n;b++)M[a][b]=r.float()<0.35;}
  else if(t===1){const lab=range(0,n-1).map(()=>r.int(0,2));for(let a=0;a<n;a++)for(let b=0;b<n;b++)M[a][b]=lab[a]===lab[b];}
  else if(t===2){const p=r.shuffle(range(0,n-1));for(let a=0;a<n;a++)for(let b=0;b<n;b++)M[a][b]=p.indexOf(a)<=p.indexOf(b)&&r.float()<0.6||a===b;for(let k=0;k<n;k++)for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(M[a][k]&&M[k][b])M[a][b]=true;}
  else if(t===3){for(let a=0;a<n;a++)for(let b=a;b<n;b++){const v=r.float()<0.4;M[a][b]=M[b][a]=v;}}
  else{for(let a=0;a<n;a++)for(let b=0;b<n;b++)M[a][b]=a!==b&&r.float()<0.3;}
  const flips=r.pick([0,0,1,1,2]);for(let i=0;i<flips;i++){const a=r.int(0,n-1),b=r.int(0,n-1);M[a][b]=!M[a][b];}return M;}
const boolMul=(A,B,n)=>{const C2=zeroM(n);for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(A[a][b])for(let c=0;c<n;c++)if(B[b][c])C2[a][c]=true;return C2;};
const countM=M=>M.reduce((s,row)=>s+row.filter(Boolean).length,0);
const warshall=(M,n)=>{const W=M.map(r=>r.slice());for(let k=0;k<n;k++)for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(W[a][k]&&W[k][b])W[a][b]=true;return W;};
const matHTML=M=>mat(M.map(r=>r.map(x=>x?1:0)));
const linExt=(n,less)=>{// DP over subsets: number of linear extensions
  const dp=new Array(1<<n).fill(0);dp[0]=1;for(let m=0;m<(1<<n);m++){if(!dp[m])continue;for(let x=0;x<n;x++){if(m>>x&1)continue;let ok=true;for(let y=0;y<n;y++)if(less(y,x)&&!(m>>y&1))ok=false;if(ok)dp[m|1<<x]+=dp[m];}}return dp[(1<<n)-1];};
G['55-O']=[
 gen('55-O-props-matrix',TO[0],r=>{const n=r.int(4,5);const M=randRel(r,n);const pr=relProps(M,n);const asMat=r.bool();
   const ex=[];if(!pr[0])ex.push(`not reflexive: (${M.findIndex((row,i)=>!row[i])+1}, ${M.findIndex((row,i)=>!row[i])+1}) ∉ R`);
   return Q(`<p>R is a relation on {1, …, ${n}} ${asMat?'with matrix (row a, column b is 1 iff (a, b) ∈ R):':'given by'}</p>${asMat?matHTML(M):`<p>R = ${fmtPairs(pairsOf(M,n))}</p>`}<p>Select ALL properties R has.</p>`,'multi',pr.map((x,i)=>x?i:-1).filter(i=>i>=0),{choices:PROPS,
     hint:'Reflexive: all (a,a). Irreflexive: no (a,a). Symmetric: (a,b) ⇒ (b,a). Antisymmetric: (a,b),(b,a) ⇒ a = b. Transitive: (a,b),(b,c) ⇒ (a,c) — check every pair of chained pairs.',
     solution:`<p>${PROPS.map((p,i)=>`${p}: <b>${pr[i]?'yes':'no'}</b>`).join('; ')}.</p>${(()=>{const w=[];for(let a=0;a<n;a++)for(let b=0;b<n;b++)for(let c=0;c<n;c++)if(M[a][b]&&M[b][c]&&!M[a][c]&&!w.length)w.push(`(${a+1},${b+1}),(${b+1},${c+1}) ∈ R but (${a+1},${c+1}) ∉ R ⇒ not transitive.`);for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(M[a][b]&&!M[b][a]&&w.length<2)w.push(`(${a+1},${b+1}) ∈ R, (${b+1},${a+1}) ∉ R ⇒ not symmetric.`);return w.length?'<p>'+w.join(' ')+'</p>':'';})()}`,meta:{M,n}});}),
 gen('55-O-props-formula',TO[0],r=>{const k=r.int(2,4),c=r.int(5,12);const n=r.int(6,9);
   const POOL=[[`a | b`,'b%a===0'],[`a + b is even`,'(a+b)%2===0'],[`|a − b| ≤ 1`,'Math.abs(a-b)<=1'],[`a ≤ b + 1`,'a<=b+1'],[`a < b`,'a<b'],[`gcd(a, b) = 1`,'g(a,b)===1'],[`a ≡ b (mod ${k})`,`(a-b)%${k}===0`],
     [`⌊a/${k}⌋ = ⌊b/${k}⌋`,`Math.floor(a/${k})===Math.floor(b/${k})`],[`a + b ≤ ${c}`,`a+b<=${c}`],[`a − b ∈ {0, ${k}}`,`a-b===0||a-b===${k}`],[`ab is a perfect square`,'Number.isInteger(Math.sqrt(a*b))'],[`a = b or a + b = ${c}`,`a===b||a+b===${c}`],[`a² ≥ b`,'a*a>=b'],[`max(a, b) ≥ ${Math.ceil(n/2)}`,`Math.max(a,b)>=${Math.ceil(n/2)}`]];
   const [txt,js]=r.pick(POOL);const g2=gcd;const f=new Function('a','b','g','return '+js);const M=zeroM(n);for(let a=0;a<n;a++)for(let b=0;b<n;b++)M[a][b]=!!f(a+1,b+1,g2);const pr=relProps(M,n);
   return Q(`<p>On A = {1, 2, …, ${n}} define a R b ⇔ ${txt}. Select ALL properties of R.</p>`,'multi',pr.map((x,i)=>x?i:-1).filter(i=>i>=0),{choices:PROPS,hint:'Test each property; to refute one, give a concrete counterexample from A.',
     solution:`<p>${PROPS.map((p,i)=>`${p}: <b>${pr[i]?'yes':'no'}</b>`).join('; ')}.</p><p>R = ${fmtPairs(pairsOf(M,n)).slice(0,600)}${fmtPairs(pairsOf(M,n)).length>600?'…':''}</p>`,meta:{js,n}});}),
 gen('55-O-count-rel',TO[1],r=>{const n=r.int(2,4);const bell=k=>sum(range(0,k).map(j=>stirling2(k,j)));
   const T=[['reflexive',Math.pow(2,n*(n-1)),'diagonal forced 1, other n(n−1) entries free: 2<sup>n(n−1)</sup>'],['symmetric',Math.pow(2,n*(n+1)/2),'diagonal free, each off-diagonal pair both-or-none: 2<sup>n(n+1)/2</sup>'],
     ['antisymmetric',Math.pow(2,n)*Math.pow(3,n*(n-1)/2),'diagonal free, each pair one of 3 states (not both): 2ⁿ·3<sup>C(n,2)</sup>'],['both reflexive and symmetric',Math.pow(2,n*(n-1)/2),'diagonal forced, each pair 2 states: 2<sup>C(n,2)</sup>'],
     ['both irreflexive and antisymmetric (asymmetric)',Math.pow(3,n*(n-1)/2),'diagonal 0, pairs 3 states: 3<sup>C(n,2)</sup>'],['both reflexive and antisymmetric',Math.pow(3,n*(n-1)/2),'diagonal 1, pairs 3 states: 3<sup>C(n,2)</sup>'],
     ['neither reflexive nor irreflexive',Math.pow(2,n*n)-2*Math.pow(2,n*(n-1)),'all minus reflexive minus irreflexive: 2<sup>n²</sup> − 2·2<sup>n(n−1)</sup>'],['both symmetric and antisymmetric',Math.pow(2,n),'no off-diagonal pairs at all, diagonal free: 2ⁿ'],
     ['symmetric or reflexive (at least one of the two)',Math.pow(2,n*(n+1)/2)+Math.pow(2,n*(n-1))-Math.pow(2,n*(n-1)/2),'inclusion–exclusion |S| + |R| − |S ∩ R|'],
     ['equivalence relations',bell(n),'equivalence relations ↔ partitions: Bell number B<sub>n</sub>'],['both symmetric and transitive',bell(n+1),'a symmetric transitive relation is an equivalence relation on the subset of elements related to something; ∑ C(n,k)B<sub>k</sub> = B<sub>n+1</sub>'],
     ['partial orders',[1,1,3,19,219][n],'count posets on n labelled points (small cases by hand: n = 2 gives ∅-order + 2 chains = 3)'],['irreflexive and symmetric',Math.pow(2,n*(n-1)/2),'diagonal 0, each pair both-or-none: 2<sup>C(n,2)</sup>'],
     ['NOT symmetric',Math.pow(2,n*n)-Math.pow(2,n*(n+1)/2),'complement: 2<sup>n²</sup> − 2<sup>n(n+1)/2</sup>']];
   const i=r.int(0,T.length-1);const [d,v,why]=T[i];
   return Q(`<p>How many relations on a set with ${n} elements are ${d}?</p>`,'num',v,{hint:'Think of the n×n matrix: decide diagonal entries and each off-diagonal pair {(a,b),(b,a)} independently.',
     solution:`<p>${why} = <b>${v}</b>.</p>`,meta:{n,i}});}),
 gen('55-O-compose',TO[2],r=>{const n=r.int(3,5);const A=randRel(r,n),B=randRel(r,n);const t=r.int(0,2);let res,desc;
   if(t===0){res=boolMul(A,B,n);desc=`|S ∘ R|, where S ∘ R = {(a, c) : ∃b with (a, b) ∈ R and (b, c) ∈ S}`;}
   else if(t===1){res=boolMul(A,A,n);desc='|R²| (R² = R ∘ R)';}else{res=boolMul(boolMul(A,A,n),A,n);desc='|R³|';}
   const v=countM(res);
   return Q(`<p>On {1, …, ${n}}: R = ${fmtPairs(pairsOf(A,n))}${t===0?`, S = ${fmtPairs(pairsOf(B,n))}`:''}. Find ${desc}.</p>`,'num',v,{hint:'Chain pairs: (a,b) then (b,c). With matrices: Boolean product M_R ⊙ M_S gives S ∘ R.',
     solution:`<p>Boolean product gives ${fmtPairs(pairsOf(res,n))}, so the answer is <b>${v}</b>.</p>`,meta:{n,A,B,t}});}),
 gen('55-O-closure',TO[3],r=>{const n=r.int(4,6);const M=zeroM(n);for(let a=0;a<n;a++)for(let b=0;b<n;b++)M[a][b]=a!==b&&r.float()<(n>4?0.2:0.28);if(countM(M)<3)return null;const t=r.int(0,3);let res,desc;
   if(t===0){res=warshall(M,n);desc='the transitive closure R*';}else if(t===1){res=M.map((row,a)=>row.map((x,b)=>x||M[b][a]));desc='the symmetric closure of R';}
   else if(t===2){const S=M.map((row,a)=>row.map((x,b)=>x||M[b][a]||a===b));res=warshall(S,n);desc='the smallest equivalence relation containing R';}
   else{res=warshall(M,n);const v0=countM(res)-countM(M);if(!v0)return null;return Q(`<p>On {1, …, ${n}}, R = ${fmtPairs(pairsOf(M,n))}. How many pairs does the transitive closure ADD to R (|R*| − |R|)?</p>`,'num',v0,{hint:'R* contains (a, b) iff there is a path a → … → b in the digraph of R (Warshall).',
     solution:`<p>R* = ${fmtPairs(pairsOf(res,n))} has ${countM(res)} pairs; R has ${countM(M)}. Added: <b>${v0}</b>.</p>`,meta:{n,M,t}});}
   const v=countM(res);
   return Q(`<p>On {1, …, ${n}}, R = ${fmtPairs(pairsOf(M,n))}. How many ordered pairs are in ${desc}?</p>`,'num',v,{hint:'Transitive closure: all (a, b) with a path from a to b. Equivalence closure: reflexive + symmetric first, then transitive (connected components).',
     solution:`<p>${desc} = ${fmtPairs(pairsOf(res,n))}: <b>${v}</b> pairs.</p>`,meta:{n,M,t}});}),
 gen('55-O-eqclasses',TO[4],r=>{const N=r.int(12,40);const m=r.int(3,11),k=r.int(2,6);
   const POOL=[[`a² ≡ b² (mod ${m})`,a=>a*a%m],[`a and b have the same digit sum`,a=>sum(String(a).split('').map(Number))],[`⌊a/${k}⌋ = ⌊b/${k}⌋`,a=>Math.floor(a/k)],[`a and b have the same number of 1s in binary`,a=>a.toString(2).split('').filter(x=>x==='1').length],
     [`a³ ≡ b³ (mod ${m})`,a=>a*a*a%m],[`gcd(a, ${m*2}) = gcd(b, ${m*2})`,a=>gcd(a,m*2)],[`a and b have the same largest prime factor`,a=>a===1?1:factorize(a).slice(-1)[0][0]]];
   const pi=r.int(0,POOL.length-1);const [txt,f]=POOL[pi];const cls=new Map();for(let a=1;a<=N;a++){const v=f(a);if(!cls.has(v))cls.set(v,[]);cls.get(v).push(a);}const ask=r.bool();
   if(ask){return Q(`<p>On {1, 2, …, ${N}} the equivalence relation a ~ b ⇔ ${txt}. How many equivalence classes are there?</p>`,'num',cls.size,{hint:'a ~ b ⇔ f(a) = f(b): classes correspond to the distinct values of f on the set.',
     solution:`<p>Classes: ${[...cls.values()].map(c=>`{${c.join(', ')}}`).join(', ')}. Number of classes: <b>${cls.size}</b>.</p>`,meta:{N,m,k,pi,ask}});}
   const x=r.int(1,N);const c=cls.get(f(x));return Q(`<p>On {1, 2, …, ${N}} let a ~ b ⇔ ${txt}. How many elements are in [${x}], the equivalence class of ${x}?</p>`,'num',c.length,{hint:'[x] = {a : a ~ x}.',
     solution:`<p>[${x}] = {${c.join(', ')}}: <b>${c.length}</b> elements.</p>`,meta:{N,m,k,pi,ask,x}});}),
 gen('55-O-count-eqrel',TO[4],r=>{const n=r.int(3,9);const bell=n=>sum(range(0,n).map(k=>stirling2(n,k)));const t=r.int(0,3);let v,desc,sol;
   if(t===0){v=bell(n);desc=`equivalence relations on a ${n}-element set`;sol=`Bell number B<sub>${n}</sub> = ∑ S(${n}, k)`;}
   else if(t===1){const k=r.int(2,n-1);v=stirling2(n,k);desc=`equivalence relations on a ${n}-element set with exactly ${k} equivalence classes`;sol=`Stirling number S(${n}, ${k})`;}
   else if(t===2){v=bell(n-1);desc=`equivalence relations on {1, …, ${n}} in which 1 ~ 2`;sol=`merge 1 and 2 into one element: B<sub>${n-1}</sub>`;}
   else{const nos=m=>{let s=0;for(let j=0;j<=m;j++)s+=(j%2?-1:1)*C(m,j)*bell(m-j);return s;};v=nos(n);desc=`partitions of a ${n}-element set with NO singleton block`;sol=`inclusion–exclusion on singletons: ∑ (−1)ʲ C(${n}, j) B<sub>${n}−j</sub>`;}
   return Q(`<p>How many ${desc} are there?</p>`,'num',v,{hint:'Equivalence relations ↔ partitions. S(n, k) = kS(n−1, k) + S(n−1, k−1); B_n = ∑ₖ S(n, k).',solution:`<p>${sol} = <b>${v}</b>.</p>`,meta:{n,t,k:+(desc.match(/exactly (\d+)/)||[0,0])[1]}});}),
 gen('55-O-poset-extremal',TO[5],r=>{const S=r.sample(range(2,60),r.int(6,9)).sort((a,b)=>a-b);const lt=(a,b)=>a!==b&&b%a===0;const t=r.int(0,3);
   const maxi=S.filter(x=>!S.some(y=>lt(x,y))),mini=S.filter(x=>!S.some(y=>lt(y,x)));
   if(t<=1){const L=t===0?maxi:mini;return Q(`<p>In the poset (S, |) with S = {${S.join(', ')}} (divisibility), list all ${t===0?'MAXIMAL':'MINIMAL'} elements (any order).</p>`,'list',L,{unordered:true,
     hint:t===0?'x is maximal if no OTHER element of S is a multiple of x.':'x is minimal if no OTHER element of S divides x.',solution:`<p>${t===0?'Maximal':'Minimal'} elements: <b>${L.join(', ')}</b>. (Maximal: ${maxi.join(', ')}; minimal: ${mini.join(', ')}.)</p>`,meta:{S,t}});}
   const g=t===2?S.find(x=>S.every(y=>y===x||lt(y,x))):S.find(x=>S.every(y=>y===x||lt(x,y)));const v=g===undefined?0:g;
   return Q(`<p>In the poset (S, |) with S = {${S.join(', ')}}, what is the ${t===2?'GREATEST':'LEAST'} element? Enter 0 if there is none.</p>`,'num',v,{hint:'Greatest = divisible by every element of S; least = divides every element. Maximal ≠ greatest!',
     solution:`<p>${t===2?`Maximal elements: ${maxi.join(', ')}`:`Minimal elements: ${mini.join(', ')}`}. ${v?`${v} is ${t===2?'greatest':'least'}.`:`There are ${t===2?maxi.length:mini.length} ${t===2?'maximal':'minimal'} elements, so no ${t===2?'greatest':'least'} element: <b>0</b>.`}</p>`,meta:{S,t}});}),
 gen('55-O-lubglb',TO[5],r=>{const useD=r.bool();let S;if(useD){const n=r.pick([36,48,60,72,84,90,100,120,144,180]);S=divisors(n);}else S=r.sample(range(1,48),r.int(7,10)).sort((a,b)=>a-b);
   const le=(a,b)=>b%a===0;const [a,b]=r.sample(S,2);if(le(a,b)||le(b,a))return null;const lub=r.bool();
   const bounds=S.filter(x=>lub?le(a,x)&&le(b,x):le(x,a)&&le(x,b));const best=bounds.find(x=>bounds.every(y=>lub?le(x,y):le(y,x)));const v=best===undefined?0:best;
   return Q(`<p>In the poset (S, |) with S = ${useD?`D<sub>${S[S.length-1]}</sub> (all positive divisors of ${S[S.length-1]})`:`{${S.join(', ')}}`}, find the ${lub?'least upper bound':'greatest lower bound'} of ${a} and ${b}. Enter 0 if it does not exist.</p>`,'num',v,{
     hint:'Upper bounds of {a, b} in S are the elements of S divisible by both; the lub is an upper bound dividing all other upper bounds (in Dₙ it is lcm; in a general S it may not exist).',
     solution:`<p>${lub?'Upper':'Lower'} bounds in S: {${bounds.join(', ')||'none'}}. ${v?`${v} ${lub?'divides':'is divisible by'} all of them: ${lub?'lub':'glb'} = <b>${v}</b>.`:'No single bound is comparable to all others: <b>does not exist (0)</b>.'}</p>`,meta:{S,a,b,lub}});}),
 gen('55-O-hasse',TO[5],r=>{const useD=r.bool();const S=useD?divisors(r.pick([24,30,36,40,42,48,54,60,72,84,90,96,100,105,108,120])):r.sample(range(1,40),r.int(7,10)).sort((a,b)=>a-b);
   const lt=(a,b)=>a!==b&&b%a===0;let e=0;const cov=[];for(const a of S)for(const b of S)if(lt(a,b)&&!S.some(c=>lt(a,c)&&lt(c,b))){e++;cov.push(`${a}–${b}`);}
   return Q(`<p>How many edges does the Hasse diagram of (S, |) have, where S = ${useD?`the set of positive divisors of ${S[S.length-1]}`:`{${S.join(', ')}}`}?</p>`,'num',e,{hint:'An edge a–b for each COVER: a | b, a ≠ b, and nothing in S strictly between. In Dₙ covers are multiplication by a single prime.',
     solution:`<p>Covering pairs: ${cov.join(', ')}. Total <b>${e}</b>.</p>`,meta:{S}});}),
 gen('55-O-topsort',TO[5],r=>{const S=r.sample(range(1,30),r.int(5,7)).sort((a,b)=>a-b);const lt=(i,j)=>i!==j&&S[j]%S[i]===0;let rel=0;for(let i=0;i<S.length;i++)for(let j=0;j<S.length;j++)if(lt(i,j))rel++;if(rel<3)return null;
   const v=linExt(S.length,lt);
   return Q(`<p>How many topological sorts (linear orders compatible with divisibility) does the poset ({${S.join(', ')}}, |) have?</p>`,'num',v,{hint:'Repeatedly choose a minimal element of what remains; count the choices along all branches (or count by placing elements of chains).',
     solution:`<p>Counting compatible orderings (choose a remaining minimal element at each step and sum over choices) gives <b>${v}</b>.</p>`,meta:{S}});}),
 gen('55-O-lattice-tf',TO[5],r=>{const useD=r.float()<0.35;const S=useD?divisors(r.pick([12,18,20,28,30,36,45,50])):r.sample(range(1,36),r.int(5,8)).sort((a,b)=>a-b);const le=(a,b)=>b%a===0;
   let isL=true,wit=null;for(const a of S)for(const b of S){const ub=S.filter(x=>le(a,x)&&le(b,x)),lb=S.filter(x=>le(x,a)&&le(x,b));const lu=ub.find(x=>ub.every(y=>le(x,y))),gl=lb.find(x=>lb.every(y=>le(y,x)));if(lu===undefined||gl===undefined){isL=false;wit=wit||[a,b,lu===undefined?'lub':'glb'];}}
   if(!isL&&r.float()<0.4)return null;
   return Q(`<p>True or false: ({${S.join(', ')}}, |) is a lattice.</p>`,'tf',isL,{hint:'A lattice needs a lub AND a glb (inside the set) for every pair of elements.',
     solution:isL?`<p><b>True</b>: every pair has a lub and glb in the set${useD?' (lcm and gcd of divisors are divisors)':''}.</p>`:`<p><b>False</b>: ${wit[0]} and ${wit[1]} have no ${wit[2]} in the set.</p>`,meta:{S}});}),
 gen('55-O-count-functions',TO[1],r=>{const n=r.int(2,4);const T=[['functions (each a is related to exactly one b)',Math.pow(n,n),'nⁿ'],['partial functions (each a is related to at most one b)',Math.pow(n+1,n),'(n+1)ⁿ'],
     ['bijections (each a related to exactly one b and each b to exactly one a)',fact(n),'n!'],['left-total (every a is related to at least one b)',Math.pow(Math.pow(2,n)-1,n),'(2ⁿ − 1)ⁿ: each row nonzero']];const i=r.int(0,3);
   return Q(`<p>How many relations R on {1, …, ${n}} are ${T[i][0]}?</p>`,'num',T[i][1],{hint:'Work row by row in the relation matrix: each row (the set of b related to a) is chosen independently.',solution:`<p>${T[i][2]} = <b>${T[i][1]}</b>.</p>`,meta:{n,i}});}),
 gen('55-O-compose-tf',TO[2],r=>{const n=4;const A=randRel(r,n),B=randRel(r,n);const SR=boolMul(A,B,n),RS=boolMul(B,A,n);const cand=[];for(let a=0;a<n;a++)for(let c=0;c<n;c++)if(SR[a][c]!==RS[a][c])cand.push([a,c]);
   let a,c;if(cand.length&&r.float()<0.7)[a,c]=r.pick(cand);else{a=r.int(0,n-1);c=r.int(0,n-1);}const v=SR[a][c];
   return Q(`<p>On {1, 2, 3, 4}: R = ${fmtPairs(pairsOf(A,n))}, S = ${fmtPairs(pairsOf(B,n))}. Using Rosen's convention S ∘ R = {(a, c) : ∃b, (a, b) ∈ R and (b, c) ∈ S}, true or false: (${a+1}, ${c+1}) ∈ S ∘ R?</p>`,'tf',v,{hint:'Apply R FIRST, then S (like function composition). Look for b with (a,b) ∈ R and (b,c) ∈ S.',
     solution:`<p>${(()=>{const bs=range(0,n-1).filter(b=>A[a][b]&&B[b][c]).map(b=>b+1);return bs.length?`b = ${bs.join(' or ')} works: (${a+1}, ${bs[0]}) ∈ R and (${bs[0]}, ${c+1}) ∈ S`:`No b has (${a+1}, b) ∈ R and (b, ${c+1}) ∈ S`;})()}. So <b>${v}</b>.${RS[a][c]!==v?` (Careful: in R ∘ S the answer would be ${RS[a][c]}.)`:''}</p>`,meta:{A,B,a,c}});}),
 gen('55-O-warshall',TO[3],r=>{const n=5;const M=zeroM(n);for(let a=0;a<n;a++)for(let b=0;b<n;b++)M[a][b]=r.float()<0.25;if(countM(M)<4)return null;const k=r.int(1,4);const W=M.map(x=>x.slice());
   for(let kk=0;kk<k;kk++)for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(W[a][kk]&&W[kk][b])W[a][b]=true;const v=countM(W);
   return Q(`<p>R on {1, …, 5} has matrix</p>${matHTML(M)}<p>Warshall's algorithm computes W₀ = M<sub>R</sub>, W₁, …, W₅ (W<sub>k</sub> allows interior vertices from {1, …, k}). How many 1s does W<sub>${k}</sub> contain?</p>`,'num',v,{
     hint:'Step k: w_ij becomes 1 if w_ik and w_kj are both 1 (in the previous matrix). Equivalently: is there a path i → j whose interior vertices are all ≤ k?',solution:`<p>W<sub>${k}</sub> =</p>${matHTML(W)}<p>Number of 1s: <b>${v}</b>.</p>`,meta:{M,k}});}),
];

// =========================================================
// 55-P  Graphs
// =========================================================
const TP=['Degrees and handshaking; impossible degree sequences','Kₙ, Cₙ, Wₙ, Qₙ, Kₘ,ₙ: edge counts, bipartite or not','Bipartite tests (2-colouring, odd cycles)','Adjacency and incidence matrices','Isomorphism: find a bijection or an invariant that differs','Connectivity, components, cut vertices/edges; paths of length r via Aʳ; directed in/out-degree'];
const randGraph=(r,n,p)=>{const E=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(r.float()<p)E.push([i,j]);return E;};
const adjL=(n,E)=>{const A=Array.from({length:n},()=>[]);for(const [a,b] of E){A[a].push(b);A[b].push(a);}return A;};
const fmtE=E=>E.map(([a,b])=>`{${a+1}, ${b+1}}`).join(', ');
const comps=(n,E,skip)=>{const A=adjL(n,E);const seen=Array(n).fill(false);let c=0;for(let s=0;s<n;s++){if(seen[s]||s===skip)continue;c++;const st=[s];seen[s]=true;while(st.length){const x=st.pop();for(const y of A[x])if(!seen[y]&&y!==skip){seen[y]=true;st.push(y);}}}return c;};
function havel(seq){let s=seq.slice().sort((a,b)=>b-a);while(s.length&&s[0]>0){const d=s.shift();if(d>s.length)return false;for(let i=0;i<d;i++){s[i]--;if(s[i]<0)return false;}s.sort((a,b)=>b-a);}return s.every(x=>x===0);}
function twoColor(n,E){const A=adjL(n,E);const col=Array(n).fill(-1);for(let s=0;s<n;s++){if(col[s]>=0)continue;col[s]=0;const q=[s];while(q.length){const x=q.shift();for(const y of A[x]){if(col[y]<0){col[y]=1-col[x];q.push(y);}else if(col[y]===col[x])return null;}}}return col;}
function tarjan(n,E){const A=adjL(n,E);const disc=Array(n).fill(-1),low=Array(n).fill(0);let t=0;const cut=new Set();let bridges=0;
  const dfs=(u,p)=>{disc[u]=low[u]=t++;let ch=0;for(const v of A[u]){if(disc[v]<0){ch++;dfs(v,u);low[u]=Math.min(low[u],low[v]);if(p>=0&&low[v]>=disc[u])cut.add(u);if(low[v]>disc[u])bridges++;}else if(v!==p)low[u]=Math.min(low[u],disc[v]);}if(p<0&&ch>1)cut.add(u);};
  for(let s=0;s<n;s++)if(disc[s]<0)dfs(s,-1);return {cut:[...cut].sort((a,b)=>a-b),bridges};}
const triangles=(n,E)=>{const S=new Set(E.map(([a,b])=>a+','+b));const h=(a,b)=>S.has(Math.min(a,b)+','+Math.max(a,b));let c=0;for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let d=b+1;d<n;d++)if(h(a,b)&&h(b,d)&&h(a,d))c++;return c;};
const degSeq=(n,E)=>{const d=Array(n).fill(0);for(const [a,b] of E){d[a]++;d[b]++;}return d;};
G['55-P']=[
 gen('55-P-graphic',TP[0],r=>{const n=r.int(5,6);let seq;if(r.bool()){const E=randGraph(r,n,0.5);seq=degSeq(n,E);if(r.bool()){const i=r.int(0,n-1),j=(i+r.int(1,n-1))%n;seq[i]++;seq[j]=Math.max(0,seq[j]+r.pick([1,-1]));}}else seq=range(1,n).map(()=>r.int(0,n-1));
   seq.sort((a,b)=>b-a);const s=sum(seq);const g=s%2===0&&havel(seq);if(!g&&r.float()<0.3)return null;
   return Q(`<p>Is there a simple graph with degree sequence ${seq.join(', ')}?</p>`,'tf',g,{hint:'Necessary: even degree sum (handshaking) and max degree ≤ n − 1. Sufficient test: Havel–Hakimi (remove the largest d, subtract 1 from the next d).',
     solution:`<p>Degree sum ${s} ${s%2?'is odd ⇒ impossible (handshaking).':'is even.'} ${s%2?'':(()=>{let st=seq.slice(),lines=[st.join(', ')];while(st.length&&st[0]>0){const d=st.shift();if(d>st.length){lines.push('fails');break;}for(let i=0;i<d;i++)st[i]--;st.sort((a,b)=>b-a);lines.push(st.join(', '));if(st.some(x=>x<0))break;}return 'Havel–Hakimi: '+lines.join(' → ')+'.';})()} Answer: <b>${g?'yes':'no'}</b>.</p>`,meta:{seq}});}),
 gen('55-P-handshake',TP[0],r=>{const t=r.int(0,1);
   if(t===0){const n=r.int(6,20),a=r.int(1,5),b=r.int(2,6);if(a===b)return null;const k=r.int(1,n-1);const s=k*a+(n-k)*b;if(s%2||Math.max(a,b)>n-1)return null;if(!havel(Array(k).fill(a).concat(Array(n-k).fill(b))))return null;
     return Q(`<p>A simple graph has ${n} vertices: ${k} of degree ${a} and the rest of degree ${b}. How many edges does it have?</p>`,'num',s/2,{hint:'Handshaking: ∑ deg = 2|E|.',solution:`<p>∑ deg = ${k}·${a} + ${n-k}·${b} = ${s} = 2|E| ⇒ |E| = <b>${s/2}</b>.</p>`,meta:{t,n,a,b,k}});}
   const a=r.int(2,4),b=a+r.int(1,3);const x=r.int(2,12),y=r.int(2,12);const e=(a*x+b*y)/2;if(!Number.isInteger(e))return null;if(!havel(Array(x).fill(a).concat(Array(y).fill(b))))return null;
   return Q(`<p>A simple graph has ${e} edges. Every vertex has degree ${a} or ${b}, and exactly ${x} vertices have degree ${a}. How many vertices does the graph have?</p>`,'num',x+y,{hint:'2|E| = ∑ deg: solve for the number of degree-'+b+' vertices.',
     solution:`<p>2·${e} = ${2*e} = ${a}·${x} + ${b}·y ⇒ y = ${y}. Total vertices ${x} + ${y} = <b>${x+y}</b>.</p>`,meta:{t,e,a,b,x}});}),
 gen('55-P-special-edges',TP[1],r=>{const t=r.int(0,5);let v,desc,sol,meta;
   if(t===0){const n=r.int(5,30);v=n*(n-1)/2;desc=`K<sub>${n}</sub>`;sol=`C(${n}, 2)`;meta={g:'K',n};}
   else if(t===1){const n=r.int(4,30);v=2*(n-1);desc=`W<sub>${n-1}</sub> (the wheel: C<sub>${n-1}</sub> plus a hub)`;sol=`${n-1} rim edges + ${n-1} spokes`;meta={g:'W',n:n-1};}
   else if(t===2){const n=r.int(2,8);v=n*Math.pow(2,n-1);desc=`Q<sub>${n}</sub>`;sol=`2<sup>${n}</sup> vertices of degree ${n}: ${n}·2<sup>${n}</sup>/2`;meta={g:'Q',n};}
   else if(t===3){const m=r.int(2,12),n=r.int(2,12);v=m*n;desc=`K<sub>${m},${n}</sub>`;sol=`${m}·${n}`;meta={g:'KB',m,n};}
   else if(t===4){const n=r.int(3,9);v=C(Math.pow(2,n),2)-n*Math.pow(2,n-1);desc=`the complement of Q<sub>${n}</sub>`;sol=`C(2<sup>${n}</sup>, 2) − ${n}·2<sup>${n-1}</sup>`;meta={g:'Qc',n};if(n>6)return null;}
   else{const m=r.int(2,9),n=r.int(2,9);v=C(m,2)+C(n,2);desc=`the complement of K<sub>${m},${n}</sub>`;sol=`C(${m}, 2) + C(${n}, 2) (the complement is K<sub>${m}</sub> ∪ K<sub>${n}</sub>)`;meta={g:'KBc',m,n};}
   return Q(`<p>How many edges does ${desc} have?</p>`,'num',v,{hint:'Use handshaking: (number of vertices × common degree)/2, or count directly.',solution:`<p>${sol} = <b>${v}</b>.</p>`,meta});}),
 gen('55-P-special-bip',TP[1],r=>{const mk=[()=>{const n=r.int(2,7);return {s:`K<sub>${n}</sub>`,g:{g:'K',n},b:n<=2};},()=>{const n=r.int(3,10);return {s:`C<sub>${n}</sub>`,g:{g:'C',n},b:n%2===0};},()=>{const n=r.int(3,8);return {s:`W<sub>${n}</sub>`,g:{g:'W',n},b:false};},
   ()=>{const n=r.int(1,4);return {s:`Q<sub>${n}</sub>`,g:{g:'Q',n},b:true};},()=>{const m=r.int(1,5),n=r.int(1,5);return {s:`K<sub>${m},${n}</sub>`,g:{g:'KB',m,n},b:true};},()=>{const n=r.int(4,9);return {s:`P<sub>${n}</sub> (path on ${n} vertices)`,g:{g:'P',n},b:true};}];
   const items=[];const seen=new Set();while(items.length<5){const it=r.pick(mk)();if(seen.has(it.s))continue;seen.add(it.s);items.push(it);}if(items.every(x=>x.b)||items.every(x=>!x.b))return null;
   return Q(`<p>Select ALL bipartite graphs.</p>`,'multi',items.map((x,i)=>x.b?i:-1).filter(i=>i>=0),{choices:items.map(x=>x.s),hint:'Bipartite ⇔ no odd cycle. Kₙ (n ≥ 3) and Wₙ contain triangles; Cₙ is bipartite iff n is even; Qₙ and Kₘ,ₙ always are.',
     solution:ul(items.map(x=>`${x.s}: ${x.b?'bipartite':'not bipartite (odd cycle)'}`)),meta:{gs:items.map(x=>x.g)}});}),
 gen('55-P-bip-random',TP[2],r=>{const n=r.int(6,8);let E;if(r.bool()){const side=range(0,n-1).map(()=>r.int(0,1));E=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(side[i]!==side[j]&&r.float()<0.5)E.push([i,j]);if(r.float()<0.3){const i=r.int(0,n-2),j=r.int(i+1,n-1);if(!E.some(e=>e[0]===i&&e[1]===j))E.push([i,j]);}}
   else E=randGraph(r,n,0.3);if(E.length<n-1)return null;E.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const col=twoColor(n,E);const b=!!col;
   let odd='';if(!b){// find an odd cycle via BFS tree
     const A=adjL(n,E);for(let s=0;s<n&&!odd;s++){const par=Array(n).fill(-2),dep=Array(n).fill(-1);par[s]=-1;dep[s]=0;const q=[s];while(q.length&&!odd){const x=q.shift();for(const y of A[x]){if(dep[y]<0){dep[y]=dep[x]+1;par[y]=x;q.push(y);}else if(dep[y]===dep[x]&&y>x){const p1=[x],p2=[y];let u=x,v=y;while(u!==v){u=par[u];v=par[v];p1.push(u);p2.push(v);}odd=p1.concat(p2.slice(0,-1).reverse()).map(z=>z+1).join('–');break;}}}}}
   return Q(`<p>Is the graph with vertices 1…${n} and edges ${fmtE(E)} bipartite?</p>`,'tf',b,{hint:'Try to 2-colour by BFS; a conflict reveals an odd cycle.',
     solution:b?`<p><b>Yes.</b> Parts: {${col.map((c,i)=>c===0?i+1:null).filter(x=>x).join(', ')}} and {${col.map((c,i)=>c===1?i+1:null).filter(x=>x).join(', ')}}.</p>`:`<p><b>No.</b> Odd cycle: ${odd}${odd?'–'+odd.split('–')[0]:''}.</p>`,meta:{n,E}});}),
 gen('55-P-walks',TP[5],r=>{const n=r.int(4,5);const dir=r.bool();const A=Array.from({length:n},()=>Array(n).fill(0));for(let i=0;i<n;i++)for(let j=dir?0:i+1;j<n;j++){if(i===j)continue;const v=r.float()<0.45?1:0;A[i][j]=v;if(!dir)A[j][i]=v;}
   const k=r.int(3,4);let P=A.map(row=>row.slice());for(let t=1;t<k;t++){const Np=Array.from({length:n},()=>Array(n).fill(0));for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(let l=0;l<n;l++)Np[i][j]+=P[i][l]*A[l][j];P=Np;}
   const i=r.int(0,n-1),j=r.int(0,n-1);if(P[i][j]===0&&r.float()<0.7)return null;
   return Q(`<p>The ${dir?'directed ':''}graph on vertices 1…${n} has adjacency matrix</p>${mat(A)}<p>How many walks of length ${k} are there from vertex ${i+1} to vertex ${j+1}?</p>`,'num',P[i][j],{hint:'The (i, j) entry of Aᵏ counts walks of length k (Rosen Thm 10.4.2).',
     solution:`<p>A<sup>${k}</sup> = </p>${mat(P)}<p>Entry (${i+1}, ${j+1}) = <b>${P[i][j]}</b>.</p>`,meta:{A,k,i,j}});}),
 gen('55-P-matrices',TP[3],r=>{const t=r.int(0,2);
   if(t===0){const n=r.int(4,6);const M=Array.from({length:n},()=>Array(n).fill(0));for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!==j&&r.float()<0.4)M[i][j]=1;const ins=range(0,n-1).map(j=>sum(M.map(row=>row[j])));const out=M.map(row=>sum(row));const which=r.bool();
     return Q(`<p>A directed graph on vertices 1…${n} has adjacency matrix (entry (i, j) = 1 iff there is an edge i → j):</p>${mat(M)}<p>List the ${which?'in-degrees':'out-degrees'} of vertices 1, …, ${n} in order.</p>`,'list',which?ins:out,{hint:'Out-degree = row sum; in-degree = column sum.',
       solution:`<p>Row sums (out): ${out.join(', ')}; column sums (in): ${ins.join(', ')}. Answer <b>${(which?ins:out).join(', ')}</b>.</p>`,meta:{t,M,which}});}
   const n=r.int(4,6);const E=randGraph(r,n,0.5);if(E.length<3)return null;const I=range(0,n-1).map(v=>E.map(([a,b])=>a===v||b===v?1:0));
   if(t===1){const v=r.int(0,n-1);const d=sum(I[v]);return Q(`<p>An undirected simple graph has incidence matrix (rows = vertices 1…${n}, columns = edges e₁…e<sub>${E.length}</sub>):</p>${mat(I)}<p>What is the degree of vertex ${v+1}, and how many edges does the graph have? Enter degree, number of edges.</p>`,'list',[d,E.length],{
     hint:'Each row sum is a degree; each column has exactly two 1s (one edge).',solution:`<p>Row ${v+1} sum = ${d}; columns = ${E.length} edges. Answer <b>${d}, ${E.length}</b>.</p>`,meta:{t,I,v}});}
   const A=Array.from({length:n},()=>Array(n).fill(0));E.forEach(([a,b])=>{A[a][b]=A[b][a]=1;});const tri=triangles(n,E);
   return Q(`<p>A simple graph has adjacency matrix</p>${mat(A)}<p>How many triangles (3-cycles, as vertex sets) does it contain? (Hint: trace(A³) = 6 × #triangles.)</p>`,'num',tri,{hint:'Count closed walks of length 3: each triangle gives 6 (3 starting points × 2 directions).',
     solution:`<p>Triangles: ${tri}. (trace(A³) = ${6*tri}.) Answer <b>${tri}</b>.</p>`,meta:{t,A}});}),
 gen('55-P-iso',TP[4],r=>{const n=r.int(5,6);const E1=randGraph(r,n,0.45);if(E1.length<4)return null;let E2;const iso=r.float()<0.35;
   if(iso){const p=r.shuffle(range(0,n-1));E2=E1.map(([a,b])=>[Math.min(p[a],p[b]),Math.max(p[a],p[b])]);}
   else{if(r.bool()){E2=E1.map(e=>e.slice());// rewire one edge keeping edge count
       const i=r.int(0,E2.length-1);let a,b;do{a=r.int(0,n-1);b=r.int(0,n-1);}while(a===b||E2.some(e=>e[0]===Math.min(a,b)&&e[1]===Math.max(a,b)));E2[i]=[Math.min(a,b),Math.max(a,b)];const p=r.shuffle(range(0,n-1));E2=E2.map(([a,b])=>[Math.min(p[a],p[b]),Math.max(p[a],p[b])]);}
     else E2=randGraph(r,n,0.45);}
   E2.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);if(E2.length!==E1.length)return null;
   const inv=E=>{const d=degSeq(n,E).sort((a,b)=>b-a).join(',');return [d,triangles(n,E),comps(n,E,-1),!!twoColor(n,E)];};const i1=inv(E1),i2=inv(E2);
   // brute isomorphism
   const key=E=>E.map(e=>e.join('-')).sort().join('|');const k1=key(E1);let isIso=false;for(const p of (function*(){const a=range(0,n-1);const rec=function*(i){if(i===n){yield a.slice();return;}for(let j=i;j<n;j++){[a[i],a[j]]=[a[j],a[i]];yield* rec(i+1);[a[i],a[j]]=[a[j],a[i]];}};yield* rec(0);})()){if(key(E2.map(([x,y])=>[Math.min(p[x],p[y]),Math.max(p[x],p[y])]))===k1){isIso=true;break;}}
   const CH=['Isomorphic','Not isomorphic: the degree sequences differ','Not isomorphic: same degree sequence, but different numbers of triangles','Not isomorphic: same degree sequence and triangle count, but different numbers of connected components','Not isomorphic: same degree sequence, triangles and components, but only one of them is bipartite'];
   let k;if(isIso)k=0;else if(i1[0]!==i2[0])k=1;else if(i1[1]!==i2[1])k=2;else if(i1[2]!==i2[2])k=3;else if(i1[3]!==i2[3])k=4;else return null;
   const idx=r.shuffle([0,1,2,3,4]);
   return Q(`<p>G has vertices 1…${n} and edges ${fmtE(E1)}.<br>H has vertices 1…${n} and edges ${fmtE(E2)}.<br>Are G and H isomorphic? Choose the correct statement (the first invariant in the list that differs, if any).</p>`,'mc',idx.indexOf(k),{choices:idx.map(i=>CH[i]),
     hint:'Compare invariants in order: degree sequence, triangles, components, bipartiteness; if all agree, try to build a bijection matching degrees and neighbourhoods.',
     solution:`<p>Degree sequences: G: ${i1[0]}, H: ${i2[0]}. Triangles: ${i1[1]} vs ${i2[1]}. Components: ${i1[2]} vs ${i2[2]}. Bipartite: ${i1[3]} vs ${i2[3]}. ${isIso?'A degree-preserving bijection maps every edge to an edge, so they are isomorphic.':''} Answer: <b>${CH[k]}</b>.</p>`,meta:{n,E1,E2,choices:idx.map(i=>CH[i])}});}),
 gen('55-P-components',TP[5],r=>{const n=r.int(8,12);const E=randGraph(r,n,1.6/n);const c=comps(n,E,-1);if(c<2)return null;
   return Q(`<p>A graph has vertices 1…${n} and edges ${E.length?fmtE(E):'(none)'}. How many connected components does it have?</p>`,'num',c,{hint:'Explore from each unvisited vertex (BFS/DFS); isolated vertices count as components.',
     solution:`<p>Components: ${(()=>{const A=adjL(n,E);const seen=Array(n).fill(false);const out=[];for(let s=0;s<n;s++){if(seen[s])continue;const cc=[];const st=[s];seen[s]=true;while(st.length){const x=st.pop();cc.push(x+1);for(const y of A[x])if(!seen[y]){seen[y]=true;st.push(y);}}out.push('{'+cc.sort((a,b)=>a-b).join(', ')+'}');}return out.join(', ');})()}: <b>${c}</b>.</p>`,meta:{n,E}});}),
 gen('55-P-cut',TP[5],r=>{const n=r.int(6,9);const E=randGraph(r,n,2.2/n);if(comps(n,E,-1)!==1)return null;const {cut,bridges}=tarjan(n,E);const t=r.int(0,2);
   if(t===0){if(!cut.length)return null;return Q(`<p>The connected graph with vertices 1…${n} and edges ${fmtE(E)}. List all cut vertices (vertices whose removal disconnects the graph), any order.</p>`,'list',cut.map(x=>x+1),{unordered:true,
     hint:'Remove each vertex in turn and check connectivity — or use DFS low-points.',solution:`<p>Cut vertices: <b>${cut.map(x=>x+1).join(', ')}</b>.</p>`,meta:{n,E,t}});}
   if(t===1)return Q(`<p>The connected graph with vertices 1…${n} and edges ${fmtE(E)}. How many cut vertices does it have?</p>`,'num',cut.length,{hint:'A vertex is a cut vertex iff removing it increases the number of components.',
     solution:`<p>Cut vertices: ${cut.length?cut.map(x=>x+1).join(', '):'none'} → <b>${cut.length}</b>.</p>`,meta:{n,E,t}});
   return Q(`<p>The connected graph with vertices 1…${n} and edges ${fmtE(E)}. How many cut edges (bridges) does it have?</p>`,'num',bridges,{hint:'An edge is a bridge iff it lies on no cycle.',solution:`<p>Bridges (edges on no cycle): <b>${bridges}</b>.</p>`,meta:{n,E,t}});}),
 gen('55-P-bip-parts',TP[2],r=>{const n=r.int(6,10);const side=range(0,n-1).map(()=>r.int(0,1));const E=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(side[i]!==side[j]&&r.float()<0.45)E.push([i,j]);if(comps(n,E,-1)!==1)return null;
   const col=twoColor(n,E);const s0=col.filter(c=>c===0).length;const v=Math.max(s0,n-s0);
   return Q(`<p>The connected graph with vertices 1…${n} and edges ${fmtE(E)} is bipartite. How many vertices are in the LARGER part of its (unique) bipartition?</p>`,'num',v,{hint:'2-colour by BFS from vertex 1; a connected bipartite graph has exactly one bipartition.',
     solution:`<p>BFS colouring: {${col.map((c,i)=>c===0?i+1:null).filter(x=>x).join(', ')}} and {${col.map((c,i)=>c===1?i+1:null).filter(x=>x).join(', ')}}. Larger part: <b>${v}</b>.</p>`,meta:{n,E}});}),
 gen('55-P-A2',TP[3],r=>{const n=r.int(5,6);const E=randGraph(r,n,0.45);if(E.length<4)return null;const A=Array.from({length:n},()=>Array(n).fill(0));E.forEach(([a,b])=>{A[a][b]=A[b][a]=1;});
   const A2=A.map((row,i)=>row.map((_,j)=>sum(range(0,n-1).map(l=>A[i][l]*A[l][j]))));const t=r.int(0,2);let v,desc,sol;
   if(t===0){const [i,j]=r.sample(range(0,n-1),2);v=A2[i][j];desc=`the (${i+1}, ${j+1}) entry of A²`;sol=`common neighbours of ${i+1} and ${j+1}: ${range(0,n-1).filter(l=>A[i][l]&&A[l][j]).map(x=>x+1).join(', ')||'none'}`;}
   else if(t===1){v=sum(A2.map(row=>sum(row)));desc='the sum of ALL entries of A²';sol=`∑ (A²)<sub>ij</sub> = ∑<sub>v</sub> deg(v)² = ${degSeq(n,E).map(d=>d+'²').join(' + ')}`;}
   else{v=sum(range(0,n-1).map(i=>A2[i][i]));desc='the trace of A²';sol=`(A²)<sub>ii</sub> = deg(i), so trace = ∑ deg = 2|E| = ${2*E.length}`;}
   return Q(`<p>A simple graph has adjacency matrix A =</p>${mat(A)}<p>Find ${desc}.</p>`,'num',v,{hint:'(A²)ᵢⱼ counts walks of length 2 from i to j, i.e. common neighbours (and deg(i) on the diagonal).',solution:`<p>${sol} ⇒ <b>${v}</b>.</p>`,meta:{A,t,desc}});}),
 gen('55-P-automorphisms',TP[4],r=>{const n=r.int(4,6);const E=randGraph(r,n,0.5);const Adj=Array.from({length:n},()=>Array(n).fill(false));E.forEach(([a,b])=>{Adj[a][b]=Adj[b][a]=true;});const d=degSeq(n,E);
   let cnt=0;const p=Array(n).fill(-1),used=Array(n).fill(false);const rec=i=>{if(i===n){cnt++;return;}for(let v=0;v<n;v++){if(used[v]||d[v]!==d[i])continue;let ok=true;for(let j=0;j<i;j++)if(Adj[i][j]!==Adj[v][p[j]]){ok=false;break;}if(!ok)continue;used[v]=true;p[i]=v;rec(i+1);used[v]=false;}};rec(0);
   if(cnt===fact(n)&&r.float()<0.8)return null;
   return Q(`<p>How many automorphisms (isomorphisms from the graph to itself, including the identity) does the graph with vertices 1…${n} and edges ${E.length?fmtE(E):'(none)'} have?</p>`,'num',cnt,{
     hint:'An automorphism must map each vertex to one of the same degree and preserve adjacency; build it vertex by vertex.',solution:`<p>Degrees: ${d.join(', ')}. Counting adjacency-preserving bijections (degree classes restrict the choices) gives <b>${cnt}</b>.</p>`,meta:{n,E}});}),
];

})();
