// gen54.js — randomized, auto-graded exam-level generators for Math 54 (Lay + Nagle), units 54-1 … 54-14.
// Spec: GENERATOR_SPEC.md. Plain JS, no imports. Registers into globalThis.GEN.
(function(){
'use strict';
const G = (globalThis.GEN = globalThis.GEN || {});

// ---------------------------------------------------------------- core utils
const RETRY = { retry: true };
function need(c){ if(!c) throw RETRY; }
function mk(id, unit, ti, f){
  const type = TY[unit][ti];
  if(type === undefined) throw new Error('bad type index '+unit+' '+ti);
  return { id, type, make(r){
    const want = r.bool(); // True/False generators are balanced 50/50: retry until the truth value matches
    for(let i=0;i<4000;i++){
      try { const q = f(r); if(q.kind==='tf' && q.answer!==want) continue; return q; }
      catch(e){ if(e !== RETRY) throw e; }
    }
    throw new Error('retry exhausted: '+id);
  }};
}
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=a%b; a=b; b=t; } return a; }
class F {
  constructor(n, d){
    if(d === undefined) d = 1;
    if(!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error('bad fraction '+n+'/'+d);
    if(d < 0){ n = -n; d = -d; }
    const g = gcd(n, d) || 1; n /= g; d /= g;
    if(!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw RETRY; // overflow -> regenerate
    this.n = n === 0 ? 0 : n; this.d = d;
  }
  static of(x){ return x instanceof F ? x : new F(x, 1); }
  add(o){ o=F.of(o); return new F(this.n*o.d + o.n*this.d, this.d*o.d); }
  sub(o){ o=F.of(o); return new F(this.n*o.d - o.n*this.d, this.d*o.d); }
  mul(o){ o=F.of(o); return new F(this.n*o.n, this.d*o.d); }
  div(o){ o=F.of(o); if(o.n===0) throw new Error('div by 0'); return new F(this.n*o.d, this.d*o.n); }
  neg(){ return new F(-this.n, this.d); }
  eq(o){ o=F.of(o); return this.n===o.n && this.d===o.d; }
  isZero(){ return this.n === 0; }
  isInt(){ return this.d === 1; }
  sign(){ return Math.sign(this.n); }
  abs(){ return new F(Math.abs(this.n), this.d); }
  toNum(){ return this.n/this.d; }
  toString(){ return this.d===1 ? String(this.n) : this.n+'/'+this.d; }
}
const F0 = new F(0), F1 = new F(1);
const fr = (n,d) => new F(n, d===undefined?1:d);

// formatting
const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'};
const SUB = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
const sup = n => String(n).split('').map(c=>SUP[c]).join('');
const sub = n => String(n).split('').map(c=>SUB[c]).join('');
function fs(x){ x = F.of(x); const s = x.d===1 ? String(Math.abs(x.n)) : Math.abs(x.n)+'/'+x.d; return (x.n<0?'−':'')+s; }
function fsp(x){ x=F.of(x); return (x.d!==1 || x.n<0) ? '('+fs(x)+')' : fs(x); }
function ans(x){ if(typeof x === 'number') return x; x = F.of(x); return x.d===1 ? x.n : x.n+'/'+x.d; }
const ansL = v => v.map(ans);
function mat(A, augAt){
  return '<table class="mat">'+A.map(r=>'<tr>'+r.map((x,j)=>'<td'+(augAt!==undefined && j===augAt?' style="border-left:1px solid currentColor;padding-left:6px"':'')+'>'+(typeof x==='string'?x:fs(x))+'</td>').join('')+'</tr>').join('')+'</table>';
}
const aug = (A,b) => mat(A.map((r,i)=>r.concat([b[i]])), A[0].length);
const col = v => mat(v.map(x=>[x]));
const tup = v => '('+v.map(fs).join(', ')+')';
// linear combination  c1*n1 + c2*n2 ...  (coefs numbers/F, names strings)
function lin(coefs, names, constFirst){
  let s = '';
  coefs.forEach((c,i)=>{
    c = F.of(c); if(c.isZero()) return;
    const nm = names[i]; const a = c.abs();
    const body = nm==='' ? fs(a) : (a.eq(1) ? nm : (a.d!==1 ? '('+fs(a)+')'+nm : fs(a)+nm));
    if(s===''){ s = (c.sign()<0?'−':'')+body; }
    else s += (c.sign()<0?' − ':' + ')+body;
  });
  return s===''?'0':s;
}
// polynomial in t from coefficient array [c0,c1,c2,...]
function poly(c, v){ v = v||'t'; const names = c.map((_,i)=> i===0?'':(i===1?v:v+sup(i))); return lin(c, names); }
const xs = n => Array.from({length:n},(_,i)=>'x'+sub(i+1));
function cxS(a,b){ a=F.of(a); b=F.of(b); if(b.isZero()) return fs(a); const bs=(b.abs().eq(1)?'':fs(b.abs()))+'i'; if(a.isZero()) return (b.sign()<0?'−':'')+bs; return fs(a)+(b.sign()<0?' − ':' + ')+bs; }
const dn = x => String(x).replace('-','−');
function r6(x){ return Math.round(x*1e6)/1e6; }
function f3(x){ return (Math.round(x*1000)/1000).toFixed(3).replace('-','−'); }
function fnum(x){ return Number.isInteger(x)? fs(x) : f3(x); }

// ---------------------------------------------------------------- random helpers
function rnz(r,a,b){ let x; do { x = r.int(a,b); } while(x===0); return x; }
function rvec(r,n,a,b){ return Array.from({length:n},()=>r.int(a,b)); }
function rpick(r, arr){ return arr[r.int(0, arr.length-1)]; }
function shuffled(r, arr){ return r.shuffle(arr.slice()); }
function mc(r, correct, distractors, fillers){
  const all = [correct];
  for(const d of distractors.concat(fillers||[])) if(all.length<5 && !all.includes(d)) all.push(d);
  need(all.length >= 4);
  const ch = r.shuffle(all.slice());
  return { choices: ch, answer: ch.indexOf(correct) };
}

// ---------------------------------------------------------------- integer / rational linear algebra
const eyeI = n => Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
const toF = A => A.map(r=>r.map(x=>F.of(x)));
const zerosF = (m,n) => Array.from({length:m},()=>Array.from({length:n},()=>F0));
function imul(A,B){ return A.map(r=>B[0].map((_,j)=>r.reduce((s,a,k)=>s+a*B[k][j],0))); }
function imv(A,v){ return A.map(r=>r.reduce((s,a,k)=>s+a*v[k],0)); }
function fmul(A,B){ return A.map(r=>B[0].map((_,j)=>r.reduce((s,a,k)=>s.add(F.of(a).mul(B[k][j])),F0))); }
function fmv(A,v){ return A.map(r=>r.reduce((s,a,k)=>s.add(F.of(a).mul(v[k])),F0)); }
const T_ = A => A[0].map((_,j)=>A.map(r=>r[j]));
const maxAbs = A => Math.max(...A.flat().map(x=>Math.abs(typeof x==='number'?x:F.of(x).toNum())));
const dotF = (u,v) => u.reduce((s,a,i)=>s.add(F.of(a).mul(v[i])),F0);
const doti = (u,v) => u.reduce((s,a,i)=>s+a*v[i],0);
function rref(A){
  const R = A.map(r=>r.map(x=>F.of(x)));
  const m = R.length, n = R[0].length, piv = [];
  let row = 0;
  for(let c=0;c<n && row<m;c++){
    let p=-1; for(let i=row;i<m;i++) if(!R[i][c].isZero()){ p=i; break; }
    if(p<0) continue;
    [R[row],R[p]] = [R[p],R[row]];
    const pv = R[row][c]; R[row] = R[row].map(x=>x.div(pv));
    for(let i=0;i<m;i++) if(i!==row && !R[i][c].isZero()){ const f=R[i][c]; R[i]=R[i].map((x,j)=>x.sub(f.mul(R[row][j]))); }
    piv.push(c); row++;
  }
  return { R, piv };
}
const rank = A => rref(A).piv.length;
function det(A){
  const n = A.length; const M = A.map(r=>r.map(x=>F.of(x))); let d = F1;
  for(let c=0;c<n;c++){
    let p=-1; for(let i=c;i<n;i++) if(!M[i][c].isZero()){ p=i; break; }
    if(p<0) return F0;
    if(p!==c){ [M[c],M[p]]=[M[p],M[c]]; d=d.neg(); }
    d = d.mul(M[c][c]);
    for(let i=c+1;i<n;i++){ const f=M[i][c].div(M[c][c]); if(!f.isZero()) M[i]=M[i].map((x,j)=>x.sub(f.mul(M[c][j]))); }
  }
  return d;
}
function inv(A){
  const n = A.length;
  const Au = A.map((r,i)=>r.map(x=>F.of(x)).concat(Array.from({length:n},(_,j)=>i===j?F1:F0)));
  const {R, piv} = rref(Au);
  if(piv.length<n || piv[n-1]!==n-1) throw new Error('singular');
  return R.map(r=>r.slice(n));
}
function nullBasis(A){
  const {R, piv} = rref(A); const n = A[0].length;
  const free = []; for(let j=0;j<n;j++) if(!piv.includes(j)) free.push(j);
  const vecs = free.map(f=>{ const v = Array(n).fill(F0); v[f]=F1; piv.forEach((pc,i)=>{ v[pc]=R[i][f].neg(); }); return v; });
  return { free, vecs, R, piv };
}
function randUnimod(r, n, maxE, steps){
  maxE = maxE||5;
  for(let tries=0;tries<1000;tries++){
    const A = eyeI(n); const k = steps || (n*2+1);
    for(let s=0;s<k;s++){
      const i = r.int(0,n-1); let j = r.int(0,n-2); if(j>=i) j++;
      const c = rnz(r,-2,2); for(let t=0;t<n;t++) A[i][t] += c*A[j][t];
    }
    let B = r.shuffle(A.map(x=>x.slice()));
    if(r.bool()){ const i=r.int(0,n-1); B[i]=B[i].map(x=>-x); }
    const z = B.flat().filter(x=>x===0).length;
    if(maxAbs(B)<=maxE && z <= Math.floor(n*n/3) ) return B;
  }
  throw RETRY;
}
// random m×n integer matrix with given rank and pivot columns piv (sorted). Returns {A, R(rref ints), piv}
function randRank(r, m, n, rk, maxE, piv){
  maxE = maxE||9;
  piv = piv || [0].concat(r.sample(Array.from({length:n-1},(_,i)=>i+1), rk-1)).sort((a,b)=>a-b);
  const R = Array.from({length:m},()=>Array(n).fill(0));
  for(let i=0;i<rk;i++){ R[i][piv[i]]=1; for(let j=piv[i]+1;j<n;j++) if(!piv.includes(j)) R[i][j]=r.int(-3,3); }
  const E = randUnimod(r, m, 4);
  const A = imul(E, R);
  need(maxAbs(A)<=maxE);
  for(let j=0;j<n;j++) need(A.some(row=>row[j]!==0));
  return { A, R, piv, E };
}
function pythQuads(){ // primitive-ish integer vectors in R^3 with integer norm
  return [[1,2,2,3],[2,3,6,7],[1,4,8,9],[4,4,7,9],[2,6,9,11],[6,6,7,11],[2,10,11,15],[3,4,12,13],[2,5,14,15]];
}
function signPerm3(r, v){ const p = r.shuffle([0,1,2]); return p.map(i=>v[i]*(r.bool()?1:-1)); }
function cross(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
// random orthogonal integer basis of R^3 with small entries: a, b ⟂ a, c = a×b / g
function orthoBasis3(r, maxE){
  maxE = maxE || 6;
  for(let t=0;t<500;t++){
    const a = rvec(r,3,-2,2); if(a.every(x=>x===0)) continue;
    const b = rvec(r,3,-3,3); if(b.every(x=>x===0) || doti(a,b)!==0) continue;
    let c = cross(a,b); const g = gcd(gcd(c[0],c[1]),c[2]); c = c.map(x=>x/g);
    const B=[a,b,c]; if(maxAbs(B)>maxE) continue;
    if(B.flat().filter(x=>x===0).length>3) continue;
    return B;
  }
  throw RETRY;
}
const TY = {
"54-1": [
"Row reduce to echelon/RREF; name pivot positions & free variables",
"Decide consistency and number of solutions from the augmented echelon form",
"Parameter problems: for which h, k is the system inconsistent / unique / infinite",
"Write solution sets in parametric vector form (nonhomogeneous = particular + Nul A)",
"Is b in Span{v₁,…,vₖ}? Do the columns span ℝᵐ (pivot in every row)?",
"True/False on existence & uniqueness with a one-line reason or counterexample"
],
"54-2": [
"Test linear independence (pivot in every column) and find a dependence relation",
"Parameter for which a set is dependent",
"Standard matrix of T from T(eᵢ) or from geometry (rotation, reflection, shear, projection)",
"Decide one-to-one / onto for T(x)=Ax and justify with pivots",
"True/False: sets containing 0, more vectors than entries, subsets/supersets of dependent sets"
],
"54-3": [
"Matrix algebra rules: (AB)ᵀ, (AB)⁻¹, non-commutativity, AB=AC ⇏ B=C",
"Inverse by row reducing [A I]; 2×2 formula",
"Solve matrix equations for X (e.g. AXB = C)",
"Elementary matrices: what they do and their inverses",
"Invertible Matrix Theorem chains: given one fact, list everything that follows",
"True/False with counterexamples"
],
"54-4": [
"Cofactor expansion along the best row/column",
"Determinant via row reduction, tracking swaps and scalings",
"det(AB), det(Aᵀ), det(A⁻¹), det(cA)=cⁿdet A",
"Parameter values making det 0 (non-invertible)",
"Area/volume of parallelograms/parallelepipeds and of their images under T (|det|·area)"
],
"54-5": [
"Is it a subspace? (zero vector, closed under + and scalar ·) in ℝⁿ, ℙₙ, matrices, functions",
"Basis for Nul A (parametric form) and Col A (pivot columns of the ORIGINAL A)",
"Is a map linear? Find its kernel and range (e.g. p ↦ (p(0), p(1)))",
"Is a vector in Nul A / Col A?",
"True/False on subspaces"
],
"54-6": [
"Is a set a basis? Spanning-set and basis theorems",
"Coordinate vectors [x]_B in ℝⁿ and ℙₙ; isomorphism with ℝⁿ",
"Dimension of Nul, Col, Row; rank theorem rank + dim Nul = n and its consequences",
"Change of basis P_{C←B} and converting coordinates",
"All True/False from Lay 4.5"
],
"54-7": [
"Verify an eigenvector / eigenvalue",
"Characteristic polynomial for 2×2, 3×3, triangular matrices",
"Eigenspace bases; algebraic vs geometric multiplicity",
"Diagonalize A = PDP⁻¹ or prove it is impossible",
"Compute Aᵏ via diagonalization",
"Similarity invariants; True/False"
],
"54-8": [
"Matrix of T relative to bases B and C; matrix of differentiation on ℙₙ",
"B-matrix of x ↦ Ax; connection to diagonalization",
"Complex eigenvalues and eigenvectors of a real 2×2",
"Write A = PCP⁻¹ with C = [a −b; b a]; find r = |λ| and the angle",
"Long-run behaviour of Aᵏx (spiral in / out / circle)"
],
"54-9": [
"Dot product, length, distance, unit vectors, angle",
"Orthogonal complement W⊥ (as a null space); Row A ⊥ Nul A; (Col A)⊥ = Nul Aᵀ",
"Check orthogonal / orthonormal sets; coordinates via dot products",
"Projection onto a line and onto a subspace (needs an ORTHOGONAL basis)",
"Distance from a point to a subspace; orthogonal decomposition y = ŷ + z",
"Matrices with orthonormal columns (UᵀU = I); True/False"
],
"54-10": [
"Gram–Schmidt in ℝⁿ and in ℙₙ with an integral inner product",
"QR factorization (R = QᵀA)",
"Least squares via AᵀAx̂ = Aᵀb and via QR (Rx̂ = Qᵀb); least-squares error",
"Line/curve of best fit set-up",
"When the least-squares solution is unique",
"Check inner-product axioms; norms/projections in C[a,b]"
],
"54-11": [
"Orthogonally diagonalize a symmetric matrix (incl. repeated eigenvalue → Gram–Schmidt inside the eigenspace)",
"Spectral decomposition A = Σ λᵢuᵢuᵢᵀ",
"Why symmetric ⇒ real eigenvalues and orthogonal eigenvectors",
"SVD by hand for 2×2, 3×2, 2×3; singular values from AᵀA",
"Bases for Col A, Nul A, Row A, Nul Aᵀ and the rank from an SVD; True/False"
],
"54-12": [
"General solution for distinct real, repeated, and complex roots",
"Initial value problems",
"Find the ODE given its solutions",
"Undetermined coefficients: trial forms incl. products like t·eᵗcos t, and the ×tˢ resonance rule",
"‘Write the form only, do not solve’ questions",
"Superposition for sums of forcing terms; Wronskian/independence; damping regimes"
],
"54-13": [
"Convert a higher-order ODE or a coupled system to x′ = Ax",
"Verify solutions; Wronskian of vector functions; fundamental matrix",
"Solve x′ = Ax with distinct real eigenvalues + IVP",
"Repeated eigenvalue with a full eigenspace",
"Complex eigenvalues → two real solutions (real & imaginary parts)",
"Long-term behaviour (→0, saddle, spiral) and which initial vectors decay; True/False"
],
"54-14": [
"Fourier series of a piecewise function on [−L, L]",
"Use even/odd symmetry to skip integrals",
"Value the series converges to at jumps and endpoints (average)",
"Cosine and sine series on [0, L] (even/odd extensions)",
"Evaluate a numerical series by plugging a point into a Fourier series",
"Orthogonality integrals"
]
};

// ================================================================ 54-1  Lay 1.1–1.5
G['54-1'] = [
mk('54-1-pivot-cols','54-1',0,r=>{
  const m = r.int(3,4), n = r.int(m===3?4:4,5), rk = r.int(2,Math.min(m,n)-1+ (m===3?1:0));
  const {A, piv} = randRank(r,m,n,rk,9);
  const {R} = rref(A);
  const free = []; for(let j=0;j<n;j++) if(!piv.includes(j)) free.push(j);
  return { prompt:`<p>Row reduce the matrix</p>${mat(A)}<p>Which columns of A are <b>pivot columns</b>? Enter the column numbers (1–${n}), comma-separated.</p>`,
    kind:'list', unordered:true, answer: piv.map(p=>p+1),
    hint:'Reduce to echelon form; a pivot column is one containing a leading entry. Pivot positions are read off the echelon form but refer to columns of A.',
    solution:`<p>RREF(A) = </p>${mat(R)}<p>Leading 1s sit in columns ${piv.map(p=>p+1).join(', ')}, so those are the pivot columns (${rk} pivots). For the system Ax = 0 the free variables are ${free.map(f=>'x'+sub(f+1)).join(', ')} (${n-rk} of them).</p>`,
    _d:{A} };
}),
mk('54-1-rref-row','54-1',0,r=>{
  const n = 5, rk = 3; const {A, piv} = randRank(r,3,n,rk,9,[0,1,3].map(x=>x));
  const {R} = rref(A); const k = r.int(1,3);
  return { prompt:`<p>Find the reduced row echelon form of</p>${mat(A)}<p>Enter <b>row ${k}</b> of RREF(A) (5 entries).</p>`,
    kind:'list', answer: ansL(R[k-1]),
    hint:'Forward-eliminate to echelon form, then clear above each pivot and scale pivots to 1.',
    solution:`<p>Row reducing gives RREF(A) = </p>${mat(R)}<p>Pivot columns: ${piv.map(p=>p+1).join(', ')}; x${sub(3)} and x${sub(5)} are free. Row ${k} is ${tup(R[k-1])}.</p>`,
    _d:{A,k} };
}),
mk('54-1-consistency','54-1',1,r=>{
  const outcome = r.pick(['none','unique','inf','inf']);
  let m, n, piv;
  if(outcome==='unique'){ n = r.int(2,3); m = n + r.int(0,1); piv = Array.from({length:n},(_,i)=>i); }
  else if(outcome==='none'){ n = r.int(3,4); m = r.int(3,4); const rk = r.int(1,Math.min(m,n+1)-1);
    piv = r.sample(Array.from({length:n},(_,i)=>i), rk).sort((a,b)=>a-b).concat([n]); need(piv[0]===0); }
  else { n = r.int(3,4); m = r.int(3,4); const rk = r.int(1,Math.min(m,n-1)); piv = [0].concat(r.sample(Array.from({length:n-1},(_,i)=>i+1), rk-1)).sort((a,b)=>a-b); }
  need(piv.length <= m);
  const {A:Ab} = randRank(r,m,n+1,piv.length,9,piv);
  const A = Ab.map(x=>x.slice(0,n)), b = Ab.map(x=>x[n]);
  const {R} = rref(Ab); const rkA = piv.filter(p=>p<n).length;
  const L = { none:'No solution (inconsistent)', unique:'Exactly one solution', inf1:'Infinitely many solutions, with 1 free variable', inf2:'Infinitely many solutions, with 2 free variables', inf3:'Infinitely many solutions, with 3 free variables'};
  const correct = outcome==='none'?L.none : outcome==='unique'?L.unique : L['inf'+(n-rkA)];
  const o = mc(r, correct, [L.none,L.unique,L.inf1,L.inf2], [L.inf3]);
  const why = outcome==='none' ? `the augmented column is a pivot column (a row [0 … 0 | nonzero]), so the system is inconsistent`
    : outcome==='unique' ? `it is consistent and every one of the ${n} variable columns has a pivot, so there are no free variables`
    : `it is consistent (no pivot in the last column) and ${n}−${rkA} = ${n-rkA} variable column(s) lack a pivot`;
  return { prompt:`<p>The augmented matrix of a linear system in ${n} unknowns is</p>${aug(A,b)}<p>How many solutions does the system have?</p>`,
    kind:'mc', ...o, hint:'Reduce to echelon form. Pivot in the augmented column ⇒ inconsistent; otherwise count variable columns without pivots.',
    solution:`<p>RREF of the augmented matrix:</p>${mat(R, n)}<p>Here ${why}. Answer: ${correct}.</p>`, _d:{A,b,outcome,correct} };
}),
...['h','k'].map(which=>mk('54-1-param-'+which,'54-1',2,r=>{
  const r1 = rvec(r,3,-4,4), r2 = rvec(r,3,-4,4); need(r1[0]*r2[1]-r1[1]*r2[0]!==0); need(r1[0]!==0);
  const b1 = r.int(-6,6), b2 = r.int(-6,6), al = rnz(r,-3,3), be = rnz(r,-3,3);
  const h0 = al*r1[2]+be*r2[2], k0 = al*b1+be*b2; need(h0!==0 && r1[2]!==0);
  const row3 = [al*r1[0]+be*r2[0], al*r1[1]+be*r2[1]];
  need(Math.abs(row3[0])<=12 && Math.abs(row3[1])<=12 && Math.abs(h0)<=20 && Math.abs(k0)<=30);
  const disp = [r1.concat([b1]), r2.concat([b2]), row3.concat(['h','k'])].map(x=>x.map(y=>typeof y==='string'?y:fs(y)));
  const M = '<table class="mat">'+disp.map(row=>'<tr>'+row.map((x,j)=>'<td'+(j===3?' style="border-left:1px solid currentColor;padding-left:6px"':'')+'>'+x+'</td>').join('')+'</tr>').join('')+'</table>';
  const sol = `<p>Row 3 is built from rows 1–2: R₃ − (${fs(al)})R₁ − (${fs(be)})R₂ turns row 3 into [0 0 h − ${fsp(h0)} | k − ${fsp(k0)}] (rows 1–2 already have pivots in columns 1–2 since ${fs(r1[0])}·${fsp(r2[1])} − ${fsp(r1[1])}·${fsp(r2[0])} ≠ 0).</p>
  <p>• h ≠ ${fs(h0)}: pivot in column 3 ⇒ unique solution for every k.<br>• h = ${fs(h0)}, k ≠ ${fs(k0)}: row [0 0 0 | nonzero] ⇒ inconsistent.<br>• h = ${fs(h0)}, k = ${fs(k0)}: x₃ free ⇒ infinitely many.</p>`;
  if(which==='h') return { prompt:`<p>Consider the system with augmented matrix</p>${M}<p>Find the value of h for which the system does <b>not</b> have a unique solution (for any k).</p>`,
    kind:'num', answer:h0, hint:'Eliminate below the first two pivots; the (3,3) entry becomes h minus a constant.', solution:sol, _d:{r1,r2,row3,b1,b2,which,h0} };
  return { prompt:`<p>Consider the system with augmented matrix</p>${M}<p>Suppose h is chosen so that the coefficient matrix is singular. For which value of k is the system then <b>consistent</b> (infinitely many solutions)?</p>`,
    kind:'num', answer:k0, hint:'After elimination, row 3 reads [0 0 h−h₀ | k−k₀]. With h = h₀ you need k − k₀ = 0.', solution:sol, _d:{r1,r2,row3,b1,b2,which,h0,k0} };
})),
...['p','u'].map(which=>mk('54-1-pvf-'+which,'54-1',3,r=>{
  const n = r.int(4,5), m = 3, rk = r.int(2, 3); need(n-rk>=1 && n-rk<=3);
  const {A, piv} = randRank(r,m,n,rk,8);
  const x0 = rvec(r,n,-3,3); const b = imv(A,x0); need(maxAbs([b])<=20);
  const Ab = A.map((row,i)=>row.concat([b[i]]));
  const {R} = rref(Ab);
  const free = []; for(let j=0;j<n;j++) if(!piv.includes(j)) free.push(j);
  const p = Array(n).fill(F0); piv.forEach((pc,i)=>{ p[pc]=R[i][n]; });
  const fj = r.pick(free);
  const u = Array(n).fill(F0); u[fj]=F1; piv.forEach((pc,i)=>{ u[pc]=R[i][fj].neg(); });
  const allU = free.map(f=>{ const w=Array(n).fill(F0); w[f]=F1; piv.forEach((pc,i)=>{ w[pc]=R[i][f].neg(); }); return w; });
  const form = 'x = p + '+free.map(f=>'x'+sub(f+1)+'·u'+sub(f+1)).join(' + ');
  const sol = `<p>RREF of [A | b]:</p>${mat(R,n)}<p>Basic variables x${piv.map(q=>sub(q+1)).join(', x')}; free variables ${free.map(f=>'x'+sub(f+1)).join(', ')}. Solving each row for its basic variable and writing x in terms of the free variables:</p><p>${form}, with p = ${tup(p)}${free.map((f,i)=>', u'+sub(f+1)+' = '+tup(allU[i])).join('')}.</p><p>p solves Ax = b (free variables = 0); the u's span Nul A.</p>`;
  const q = which==='p' ? `Enter the particular vector <b>p</b> (the solution with all free variables = 0).` : `Enter the vector <b>u${sub(fj+1)}</b> that multiplies the free variable x${sub(fj+1)}.`;
  return { prompt:`<p>Solve Ax = b where</p><p>A = ${mat(A)} &nbsp; b = ${col(b)}</p><p>Write the solution set in parametric vector form ${form}. ${q}</p>`,
    kind:'list', answer: ansL(which==='p'?p:u), hint:'Row reduce [A | b] to RREF, solve for basic variables, and split x into constant part + free-variable parts.',
    solution: sol, _d:{A,b,which,fj,free} };
})),
mk('54-1-span-param','54-1',4,r=>{
  const v1 = rvec(r,3,-4,4), v2 = rvec(r,3,-4,4); const nn = cross(v1,v2); need(nn[2]!==0 && nn[0]!==0);
  const a = rnz(r,-2,2), c = rnz(r,-2,2); const v3 = v1.map((x,i)=>a*x+c*v2[i]); need(maxAbs([v3])<=10);
  const b1 = r.int(-6,6), b2 = r.int(-6,6);
  const h0 = fr(-(nn[0]*b1+nn[1]*b2), nn[2]);
  const bs = [fs(b1),fs(b2),'h'];
  return { prompt:`<p>Let v₁ = ${tup(v1)}, v₂ = ${tup(v2)}, v₃ = ${tup(v3)} and b = (${bs.join(', ')}).</p><p>For what value of h is b in Span{v₁, v₂, v₃}?</p>`,
    kind:'num', answer: ans(h0), hint:'Row reduce [v₁ v₂ v₃ | b]. The span is only a plane (v₃ depends on v₁, v₂), so a zero row appears; set the augmented entry there to 0.',
    solution:`<p>Note v₃ = ${fs(a)}v₁ + ${fsp(c)}v₂, so the span is the plane through 0 spanned by v₁, v₂. Row reducing [v₁ v₂ v₃ | b] leaves a row [0 0 0 | expression in h], and consistency needs it to be 0. Equivalently b must be orthogonal to the normal n = v₁ × v₂ = ${tup(nn)}: ${fs(nn[0])}·${fsp(b1)} + ${fsp(nn[1])}·${fsp(b2)} + ${fsp(nn[2])}h = 0 ⇒ h = ${fs(h0)}.</p>`,
    _d:{V:[v1,v2,v3], b1, b2} };
}),
mk('54-1-span-cols','54-1',4,r=>{
  const m = r.int(3,4), n = r.int(3,5); const full = r.bool();
  const rk = full ? m : r.int(2, m-1); need(rk<=n);
  const {A} = randRank(r,m,n,rk,9);
  const {R} = rref(A);
  return { prompt:`<p>Let A = </p>${mat(A)}<p>True or false: the columns of A span ℝ${sup(m)} (equivalently, Ax = b is consistent for every b in ℝ${sup(m)}).</p>`,
    kind:'tf', answer: rk===m, hint:'Columns span ℝᵐ ⇔ A has a pivot in every ROW. Having more columns than rows is not enough.',
    solution:`<p>RREF(A) = </p>${mat(R)}<p>There are ${rk} pivots and ${m} rows, so ${rk===m?'every row has a pivot: the columns span ℝ'+sup(m)+'. TRUE.':'some row has no pivot (a zero row), so some b give [0 … 0 | nonzero]: the columns do NOT span ℝ'+sup(m)+'. FALSE.'+(n>m?' (Trap: '+n+' columns in ℝ'+sup(m)+' still need not span.)':'')}</p>`,
    _d:{A, m} };
}),
mk('54-1-tf-exist','54-1',5,r=>{
  const m = r.int(2,5), n = r.int(2,5), p = r.int(1,Math.min(m,n)); const k = r.int(0,3);
  const st = r.pick(['all_b','atmost1','nontriv','span','free','unique']);
  const S = { all_b:`Ax = b has a solution for every b in ℝ${sup(m)}.`, atmost1:`For every b, Ax = b has at most one solution.`,
    nontriv:`Ax = 0 has a nontrivial solution.`, span:`The columns of A span ℝ${sup(m)}.`, free:`Whenever Ax = b is consistent, its general solution has exactly ${k} free variable${k===1?'':'s'}.`,
    unique:`Ax = b has exactly one solution for every b in ℝ${sup(m)}.` };
  const truth = { all_b:p===m, atmost1:p===n, nontriv:p<n, span:p===m, free:k===n-p, unique:p===m&&p===n }[st];
  const reason = { all_b:`consistent for all b ⇔ pivot in every row ⇔ p = m; here p = ${p}, m = ${m}.`, atmost1:`at most one solution ⇔ no free variables ⇔ pivot in every column ⇔ p = n; here p = ${p}, n = ${n}.`,
    nontriv:`nontrivial solution ⇔ a free variable ⇔ p < n; here p = ${p}, n = ${n}.`, span:`span ℝᵐ ⇔ pivot in every row ⇔ p = m; here p = ${p}, m = ${m}.`,
    free:`#free variables = n − p = ${n} − ${p} = ${n-p} (for any consistent b).`, unique:`unique solution for all b needs a pivot in every row AND every column (p = m = n); here m = ${m}, n = ${n}, p = ${p}.` }[st];
  return { prompt:`<p>A is a ${m}×${n} matrix whose echelon form has exactly ${p} pivot position${p===1?'':'s'}.</p><p>True or false: ${S[st]}</p>`,
    kind:'tf', answer: truth, hint:'Pivot in every row ⇔ existence for all b. Pivot in every column ⇔ uniqueness. #free = n − #pivots.',
    solution:`<p>${truth?'TRUE':'FALSE'}: ${reason}</p>`, _d:{m,n,p,k,st} };
}),
];

// ================================================================ 54-2  Lay 1.7–1.9
function detLinearH(r, n, maxE){ // n×n integer matrix with one entry 'h'; returns {M, pos, h0(F)} with det linear in h, coefficient ≠ 0
  const M = Array.from({length:n},()=>rvec(r,n,-4,4));
  const i = r.int(0,n-1), j = r.int(0,n-1);
  const M0 = M.map(x=>x.slice()); M0[i][j]=0; const M1 = M.map(x=>x.slice()); M1[i][j]=1;
  const D = det(M0), C = det(M1).sub(D); need(!C.isZero()); const h0 = D.neg().div(C);
  need(Math.abs(h0.toNum())<=30 && h0.d<=6);
  const disp = M.map((row,a)=>row.map((x,b)=>(a===i&&b===j)?'h':fs(x)));
  return { M, i, j, h0, D, C, disp };
}
G['54-2'] = [
mk('54-2-dep-relation','54-2',0,r=>{
  const {A} = randRank(r,4,3,3,6); const V = T_(A); const c = [rnz(r,-3,3),rnz(r,-3,3),r.int(-3,3)];
  const v4 = V[0].map((_,i)=>c[0]*V[0][i]+c[1]*V[1][i]+c[2]*V[2][i]); need(maxAbs([v4])<=20);
  const all = T_([...V, v4]); const {R} = rref(all);
  return { prompt:`<p>The vectors v₁ = ${tup(V[0])}, v₂ = ${tup(V[1])}, v₃ = ${tup(V[2])}, v₄ = ${tup(v4)} in ℝ⁴ are linearly dependent. Find the weights with v₄ = c₁v₁ + c₂v₂ + c₃v₃. Enter c₁, c₂, c₃.</p>`,
    kind:'list', answer:c, hint:'Row reduce [v₁ v₂ v₃ v₄]; the last column of the RREF holds the weights.',
    solution:`<p>RREF[v₁ v₂ v₃ v₄] = </p>${mat(R)}<p>x₄ is free; setting x₄ = −1 gives the dependence relation ${fs(c[0])}v₁ + ${fsp(c[1])}v₂ + ${fsp(c[2])}v₃ − v₄ = 0, i.e. (c₁,c₂,c₃) = ${tup(c)}.</p>`, _d:{V, v4} };
}),
mk('54-2-indep-tf','54-2',0,r=>{
  const n = r.int(3,4), k = r.int(3,n); const ind = r.bool(); const rk = ind?k:k-1;
  let V; if(ind){ V = T_(randRank(r,n,k,k,7).A); } else { const W = T_(randRank(r,n,k-1,k-1,6).A); const a=rnz(r,-2,2), b=rnz(r,-2,2); const [i,j]=r.sample(Array.from({length:k-1},(_,t)=>t),2); W.push(W[i].map((x,t)=>a*x+b*W[j][t])); V = r.shuffle(W); }
  for(const v of V) need(v.some(x=>x!==0)); need(maxAbs(V)<=12); const A = T_(V);
  for(let a=0;a<k;a++) for(let b=a+1;b<k;b++){ need(rank([V[a],V[b]])===2); } // no obvious multiples
  const {R} = rref(A);
  return { prompt:`<p>True or false: the set {${V.map(tup).join(', ')}} in ℝ${sup(n)} is linearly independent.</p>`,
    kind:'tf', answer: ind, hint:'Put the vectors as columns and row reduce: independent ⇔ pivot in every column.',
    solution:`<p>RREF of [v₁ … v${sub(k)}] = </p>${mat(R)}<p>${ind?'Every column has a pivot ⇒ only the trivial solution ⇒ INDEPENDENT (TRUE).':'A column lacks a pivot ⇒ free variable ⇒ nontrivial dependence relation ⇒ DEPENDENT (FALSE), even though no vector is a multiple of another.'}</p>`, _d:{V} };
}),
...[3,4].map(n=>mk('54-2-param-dep'+n,'54-2',1,r=>{
  const {M,i,j,h0,D,C,disp} = detLinearH(r,n);
  const cols = T_(disp);
  return { prompt:`<p>For what value of h are the columns of the matrix</p>${mat(disp)}<p>linearly <b>dependent</b>?</p>`,
    kind:'num', answer: ans(h0), hint:'n vectors in ℝⁿ are dependent ⇔ det = 0 (⇔ some column lacks a pivot). Expand / row reduce keeping h.',
    solution:`<p>det is linear in h: det = ${fs(C)}·h ${D.sign()<0?'−':'+'} ${fs(D.abs())} (expand along row ${i+1} or column ${j+1}, or row reduce). Dependent ⇔ det = 0 ⇔ h = ${fs(h0)}.</p>`, _d:{M,i,j} };
})),
mk('54-2-std-geom','54-2',2,r=>{
  const k = rnz(r,-3,3);
  const OPS = [
    {d:'rotation by 90° counterclockwise', m:[[0,-1],[1,0]], t:{rot:90}},
    {d:'rotation by 90° clockwise', m:[[0,1],[-1,0]], t:{rot:-90}},
    {d:'rotation by 180°', m:[[-1,0],[0,-1]], t:{rot:180}},
    {d:'reflection across the x₁-axis', m:[[1,0],[0,-1]], t:{refl:0}},
    {d:'reflection across the x₂-axis', m:[[-1,0],[0,1]], t:{refl:90}},
    {d:'reflection across the line x₂ = x₁', m:[[0,1],[1,0]], t:{refl:45}},
    {d:'reflection across the line x₂ = −x₁', m:[[0,-1],[-1,0]], t:{refl:-45}},
    {d:`horizontal shear sending e₂ to e₂ + ${fsp(k)}e₁`, m:[[1,k],[0,1]], t:{hs:k}},
    {d:`vertical shear sending e₁ to e₁ + ${fsp(k)}e₂`, m:[[1,0],[k,1]], t:{vs:k}},
    {d:'projection onto the x₁-axis', m:[[1,0],[0,0]], t:{proj:0}},
  ];
  const [o1,o2] = r.sample(OPS,2);
  const Mx = imul(o2.m, o1.m); need(!(Mx[0][0]===Mx[1][1] && Mx[0][1]===0 && Mx[1][0]===0 && Mx[0][0]===1));
  return { prompt:`<p>T: ℝ² → ℝ² first performs a <b>${o1.d}</b> and then a <b>${o2.d}</b>. Find the standard matrix of T. Enter its entries row by row (a₁₁, a₁₂, a₂₁, a₂₂).</p>`,
    kind:'list', answer: Mx.flat(), hint:'Standard matrix = [T(e₁) T(e₂)]. For a composition, the matrix of the step done FIRST goes on the RIGHT.',
    solution:`<p>Matrix of step 1: ${mat(o1.m)}, step 2: ${mat(o2.m)}. T(x) = B(Ax), so the standard matrix is BA = ${mat(Mx)} (not AB — order matters). Check: T(e₁) = ${tup([Mx[0][0],Mx[1][0]])}, T(e₂) = ${tup([Mx[0][1],Mx[1][1]])}.</p>`, _d:{t1:o1.t, t2:o2.t} };
}),
mk('54-2-std-images','54-2',2,r=>{
  const U = randUnimod(r,2,4); const u = [U[0][0],U[1][0]], v = [U[0][1],U[1][1]];
  need(!(Math.abs(u[0])+Math.abs(u[1])===1 && Math.abs(v[0])+Math.abs(v[1])===1));
  const m = r.int(2,3); const A = Array.from({length:m},()=>rvec(r,2,-4,4)); need(rank(A)>=1);
  const p = imv(A,u), q = imv(A,v);
  return { prompt:`<p>A linear transformation T: ℝ² → ℝ${sup(m)} satisfies T${tup(u)} = ${tup(p)} and T${tup(v)} = ${tup(q)}. Find the standard matrix A of T. Enter its entries row by row.</p>`,
    kind:'list', answer: A.flat(), hint:'Write e₁ and e₂ as combinations of the given inputs (invert [u v]) and use linearity; or A = [T(u) T(v)]·[u v]⁻¹.',
    solution:`<p>A[u v] = [T(u) T(v)], so A = [T(u) T(v)][u v]⁻¹. Here [u v] = ${mat(U)}, det = ${fs(det(U))}, inverse ${mat(inv(U))}. Then A = ${mat(T_([p,q]))}·${mat(inv(U))} = ${mat(A)}.</p>`, _d:{u,v,p,q} };
}),
mk('54-2-onto-11','54-2',3,r=>{
  const m = r.int(2,4), n = r.int(2,4); const rk = r.int(Math.max(1,Math.min(m,n)-1), Math.min(m,n));
  const {A} = randRank(r,m,n,rk,8); const {R} = rref(A);
  const one = rk===n, onto = rk===m;
  const L = ['One-to-one and onto','One-to-one but not onto','Onto but not one-to-one','Neither one-to-one nor onto'];
  const correct = L[one&&onto?0:one?1:onto?2:3];
  const o = mc(r, correct, L.filter(x=>x!==correct));
  return { prompt:`<p>Let T(x) = Ax with A = </p>${mat(A)}<p>so T: ℝ${sup(n)} → ℝ${sup(m)}. Which describes T?</p>`, kind:'mc', ...o,
    hint:'One-to-one ⇔ pivot in every column; onto ⇔ pivot in every row.',
    solution:`<p>RREF(A) = ${mat(R)} has ${rk} pivots. Columns: ${n} ⇒ ${one?'every column has a pivot ⇒ one-to-one':'a free variable ⇒ not one-to-one'}. Rows: ${m} ⇒ ${onto?'pivot in every row ⇒ onto':'a zero row ⇒ not onto'}.</p>`, _d:{A, correct} };
}),
mk('54-2-formula-11','54-2',3,r=>{
  const m = r.int(2,4), n = r.int(2,4); const rk = r.int(Math.max(1,Math.min(m,n)-1), Math.min(m,n));
  const {A} = randRank(r,m,n,rk,6); const {R} = rref(A);
  const one = rk===n, onto = rk===m;
  const L = ['One-to-one and onto','One-to-one but not onto','Onto but not one-to-one','Neither one-to-one nor onto'];
  const correct = L[one&&onto?0:one?1:onto?2:3];
  const o = mc(r, correct, L.filter(x=>x!==correct));
  const comps = A.map(row=>lin(row, xs(n)));
  return { prompt:`<p>Define T: ℝ${sup(n)} → ℝ${sup(m)} by T(${xs(n).join(', ')}) = (${comps.join(', ')}).</p><p>Which describes T?</p>`, kind:'mc', ...o,
    hint:'Write the standard matrix (coefficients row by row), then count pivots.',
    solution:`<p>Standard matrix A = ${mat(A)}, RREF ${mat(R)}: ${rk} pivots for ${n} columns and ${m} rows. ${one?'Pivot in every column ⇒ one-to-one.':'Free variable ⇒ T(x)=0 has nontrivial solutions ⇒ not one-to-one.'} ${onto?'Pivot in every row ⇒ onto.':'Zero row ⇒ not onto.'}</p>`, _d:{A, correct} };
}),
mk('54-2-tf-sets','54-2',4,r=>{
  const kind = r.pick(['zero','toomany','multiple','indep','depcombo','subset','superset']);
  let V, n, claimDep = r.bool(), note='';
  if(kind==='zero'){ n=r.int(3,4); const k=r.int(2,3); V = Array.from({length:k},()=>rvec(r,n,-5,5)); V.splice(r.int(0,k),0,Array(n).fill(0)); note='The set contains the zero vector, which always makes it dependent (1·0 = 0 is a nontrivial relation).'; }
  else if(kind==='toomany'){ n=r.int(2,3); const k=n+1; V = Array.from({length:k},()=>rvec(r,n,-5,5)); note=`${k} vectors in ℝ${sup(n)}: more vectors than entries ⇒ dependent (Theorem 8), no computation needed.`; }
  else if(kind==='multiple'){ n=r.int(3,4); const a=rvec(r,n,-4,4); const c=rnz(r,-3,3); const b=rvec(r,n,-5,5); V=r.shuffle([a,a.map(x=>c*x),b]); note='One vector is a multiple of another ⇒ dependent.'; }
  else if(kind==='indep'){ n=r.int(3,4); const {A}=randRank(r,n,3,3,6); V=T_(A); note='Row reducing [v₁ v₂ v₃] gives a pivot in every column ⇒ independent.'; }
  else if(kind==='depcombo'){ n=r.int(3,4); const {A}=randRank(r,n,3,2,6); V=T_(A); for(let a=0;a<3;a++) for(let b=a+1;b<3;b++) need(rank([V[a],V[b]])===2); note='Row reducing [v₁ v₂ v₃] leaves a column without a pivot ⇒ dependent (no vector is a multiple of another, but one is a combination of the other two).'; }
  else if(kind==='subset'){ n=r.int(3,4); const {A}=randRank(r,n,3,3,6); V=T_(A).slice(0,2); note='These two vectors are not multiples of each other ⇒ independent (any subset of an independent set is independent).'; }
  else { n=r.int(3,4); const a=rvec(r,n,-4,4); const c=rnz(r,-3,3); V=[a,a.map(x=>c*x),rvec(r,n,-5,5),rvec(r,n,-5,5)]; V=r.shuffle(V); note='A superset of a dependent set is dependent: two of these vectors are multiples.'; }
  for(const v of V) if(kind!=='zero') need(v.some(x=>x!==0));
  const isDep = rank(V) < V.length;
  const answer = claimDep ? isDep : !isDep;
  return { prompt:`<p>True or false: the set {${V.map(tup).join(', ')}} in ℝ${sup(n)} is linearly <b>${claimDep?'dependent':'independent'}</b>.</p>`, kind:'tf', answer,
    hint:'First look for the quick tests: zero vector? more vectors than entries? a multiple? Otherwise row reduce.',
    solution:`<p>${note} So the set is ${isDep?'dependent':'independent'} and the statement is ${answer?'TRUE':'FALSE'}.</p>`, _d:{V, claimDep} };
}),
];

// ================================================================ 54-3  Lay 2.1–2.3
function elemRandom(r, n){
  const t = r.pick(['swap','scale','rep','rep']); const E = eyeI(n).map(x=>x.map(F.of));
  const i = r.int(0,n-1); let j = r.int(0,n-2); if(j>=i) j++;
  let d;
  if(t==='swap'){ [E[i],E[j]]=[E[j],E[i]]; d=`R${sub(i+1)} ↔ R${sub(j+1)}`; }
  else if(t==='scale'){ const c = r.pick([2,3,-2,-3,-1]); E[i][i]=F.of(c); d=`R${sub(i+1)} ← ${fs(c)}R${sub(i+1)}`; }
  else { const c = rnz(r,-4,4); E[i][j]=F.of(c); d=`R${sub(i+1)} ← R${sub(i+1)} ${c<0?'−':'+'} ${Math.abs(c)===1?'':Math.abs(c)}R${sub(j+1)}`; }
  return {E, d, t};
}
function fmatI(A){ return A.map(r=>r.map(x=>F.of(x))); }
G['54-3'] = [
mk('54-3-inv-product','54-3',0,r=>{
  const Ai = randUnimod(r,2,4), Bi = randUnimod(r,2,4);
  const ex = r.pick(['AB','ABt','BAt','AAB','AtB']);
  const A = inv(Ai), B = inv(Bi); const AiF=fmatI(Ai), BiF=fmatI(Bi);
  let X, disp, how;
  if(ex==='AB'){ X = fmul(BiF,AiF); disp='(AB)⁻¹'; how='(AB)⁻¹ = B⁻¹A⁻¹'; }
  else if(ex==='ABt'){ X = T_(fmul(BiF,AiF)); disp='((AB)ᵀ)⁻¹'; how='((AB)ᵀ)⁻¹ = ((AB)⁻¹)ᵀ = (B⁻¹A⁻¹)ᵀ'; }
  else if(ex==='BAt'){ X = fmul(T_(AiF),BiF); disp='(BAᵀ)⁻¹'; how='(BAᵀ)⁻¹ = (Aᵀ)⁻¹B⁻¹ = (A⁻¹)ᵀB⁻¹'; }
  else if(ex==='AAB'){ X = fmul(fmul(BiF,AiF),AiF); disp='(A²B)⁻¹'; how='(A·A·B)⁻¹ = B⁻¹A⁻¹A⁻¹'; }
  else { X = fmul(BiF,T_(AiF)); disp='(AᵀB)⁻¹'; how='(AᵀB)⁻¹ = B⁻¹(Aᵀ)⁻¹ = B⁻¹(A⁻¹)ᵀ'; }
  need(maxAbs(X)<=60);
  return { prompt:`<p>A and B are invertible 2×2 matrices with</p><p>A⁻¹ = ${mat(Ai)} &nbsp; B⁻¹ = ${mat(Bi)}</p><p>Compute ${disp} without finding A or B. Enter the entries row by row.</p>`,
    kind:'list', answer: ansL(X.flat()), hint:'Inverse of a product reverses the order; inverse and transpose commute.',
    solution:`<p>${how}. Multiplying the given matrices: ${disp} = ${mat(X)}. (Trap: A⁻¹B⁻¹ is wrong — matrix products don't commute.)</p>`, _d:{Ai,Bi,ex} };
}),
mk('54-3-cancel-trap','54-3',0,r=>{
  const u = rvec(r,2,-3,3), w = rvec(r,2,-3,3); need(u.some(x=>x) && w.some(x=>x));
  const A = [[u[0]*w[0],u[0]*w[1]],[u[1]*w[0],u[1]*w[1]]]; need(A.flat().filter(x=>x===0).length<=1);
  const g = gcd(w[0],w[1]); const nv = [-w[1]/g, w[0]/g];
  const B = [rvec(r,2,-5,5), rvec(r,2,-5,5)]; const z = [rnz(r,-2,2), rnz(r,-2,2)];
  const C = B.map((row,i)=>row.map((x,j)=>x+nv[i]*z[j]));
  const i = r.int(0,1), j = r.int(0,1); need(nv[i]!==0 && nv[1-i]!==0);
  const x = C[i][j];
  const Cd = C.map((row,a)=>row.map((v,b)=>(a===i&&b===j)?'x':fs(v)));
  const AB = imul(A,B);
  return { prompt:`<p>Let A = ${mat(A)}, B = ${mat(B)}, C = ${mat(Cd)}.</p><p>Find x such that AB = AC. (Notice the answer makes C ≠ B.)</p>`, kind:'num', answer:x,
    hint:'AB = AC ⇔ A(C − B) = 0, so every column of C − B must lie in Nul A. A is singular, so cancellation fails.',
    solution:`<p>A has rank 1 (det = 0), Nul A = Span{${tup(nv)}}. AB = AC ⇔ A(C − B) = 0 ⇔ each column of C − B is a multiple of ${tup(nv)}. Column ${j+1} of C − B has known entry ${fs(C[1-i][j]-B[1-i][j])} in row ${2-i}, so the multiple is t = ${fs(z[j])}, and row ${i+1} must be t·${fsp(nv[i])} = ${fs(nv[i]*z[j])}: x = ${fs(B[i][j])} + ${fsp(nv[i]*z[j])} = ${fs(x)}. Indeed AB = AC = ${mat(AB)} though B ≠ C.</p>`,
    _d:{A,B,C,i,j} };
}),
mk('54-3-inverse-3x3','54-3',1,r=>{
  const A = randUnimod(r,3,5); const Ai = inv(A); need(maxAbs(Ai)<=15); const k = r.int(1,3); const byRow = r.bool();
  const entries = byRow ? Ai[k-1] : Ai.map(x=>x[k-1]);
  return { prompt:`<p>Find the inverse of</p>${mat(A)}<p>by row reducing [A | I]. Enter <b>${byRow?'row':'column'} ${k}</b> of A⁻¹.</p>`, kind:'list', answer: ansL(entries),
    hint:'Row reduce the 3×6 matrix [A | I] until the left block is I; the right block is A⁻¹. Check AA⁻¹ = I.',
    solution:`<p>[A | I] ~ [I | A⁻¹] with A⁻¹ = </p>${mat(Ai)}<p>(det A = ${fs(det(A))}, which is why all entries are integers.) ${byRow?'Row':'Column'} ${k}: ${tup(entries)}.</p>`, _d:{A, k, byRow} };
}),
mk('54-3-inverse-frac','54-3',1,r=>{
  const A = Array.from({length:3},()=>rvec(r,3,-3,3)); const d = det(A); need([2,3,4,5,6].includes(Math.abs(d.n)) && d.d===1);
  const Ai = inv(A); const i = r.int(0,2), j = r.int(0,2); need(!Ai[i][j].isInt());
  const cof = (a,b)=>{ const m=A.filter((_,x)=>x!==a).map(row=>row.filter((_,y)=>y!==b)); return ((a+b)%2?-1:1)*(m[0][0]*m[1][1]-m[0][1]*m[1][0]); };
  return { prompt:`<p>Let A = </p>${mat(A)}<p>Find the (${i+1}, ${j+1}) entry of A⁻¹.</p>`, kind:'num', answer: ans(Ai[i][j]),
    hint:'Either row reduce [A | I], or use (A⁻¹)ᵢⱼ = Cⱼᵢ / det A (note the transposed cofactor).',
    solution:`<p>det A = ${fs(d)}. (A⁻¹)${sub(i+1)}${sub(j+1)} = C${sub(j+1)}${sub(i+1)}/det A = ${fs(cof(j,i))}/${fsp(d)} = ${fs(Ai[i][j])}. Full inverse:</p>${mat(Ai)}`, _d:{A,i,j} };
}),
mk('54-3-matrix-eq','54-3',2,r=>{
  const form = r.pick(['AXB','XA','AX2X','AXt','conj']);
  const X = [rvec(r,2,-4,4), rvec(r,2,-4,4)]; need(X.flat().filter(x=>x!==0).length>=3);
  const A = randUnimod(r,2,4), B = randUnimod(r,2,4); const Ai = inv(A).map(x=>x.map(y=>y.n)); const Bi = inv(B).map(x=>x.map(y=>y.n));
  let disp, given, steps, C, M=null;
  if(form==='AXB'){ C = imul(imul(A,X),B); disp='AXB = C'; given=`A = ${mat(A)}, B = ${mat(B)}, C = ${mat(C)}`; steps=`X = A⁻¹CB⁻¹ with A⁻¹ = ${mat(Ai)}, B⁻¹ = ${mat(Bi)} (multiply A⁻¹ on the LEFT and B⁻¹ on the RIGHT).`; }
  else if(form==='XA'){ C = imul(X,A); disp='XA = C'; given=`A = ${mat(A)}, C = ${mat(C)}`; steps=`X = CA⁻¹ (right-multiply; A⁻¹C is wrong) with A⁻¹ = ${mat(Ai)}.`; }
  else if(form==='AX2X'){ M = A.map((row,i)=>row.map((x,j)=>x+(i===j?2:0))); C = imul(A,X); disp='MX = C + 2X'; given=`M = ${mat(M)}, C = ${mat(C)}`; steps=`MX − 2X = C ⇒ (M − 2I)X = C ⇒ X = (M − 2I)⁻¹C. Here M − 2I = ${mat(A)} with inverse ${mat(Ai)}. (Trap: writing M − 2 or factoring X on the wrong side.)`; }
  else if(form==='AXt'){ C = T_(imul(A,X)); disp='(AX)ᵀ = C'; given=`A = ${mat(A)}, C = ${mat(C)}`; steps=`AX = Cᵀ ⇒ X = A⁻¹Cᵀ, A⁻¹ = ${mat(Ai)}.`; }
  else { C = imul(imul(A,X),Ai); disp='AXA⁻¹ = C'; given=`A = ${mat(A)}, C = ${mat(C)}`; steps=`X = A⁻¹CA with A⁻¹ = ${mat(Ai)}.`; }
  return { prompt:`<p>Solve for the 2×2 matrix X: &nbsp; ${disp}, where</p><p>${given}</p><p>Enter X row by row.</p>`, kind:'list', answer:X.flat(),
    hint:'Isolate X using inverses on the correct side; never "divide" by a matrix.', solution:`<p>${steps}</p><p>X = ${mat(X)}.</p>`, _d:{form, A, B, C, M} };
}),
mk('54-3-solve-AXB','54-3',2,r=>{
  const A = randUnimod(r,3,4); const X = Array.from({length:3},()=>rvec(r,2,-3,3)); const B = imul(A,X); need(maxAbs(B)<=25);
  const Ab = A.map((row,i)=>row.concat(B[i]));
  return { prompt:`<p>Solve AX = B for the 3×2 matrix X, where</p><p>A = ${mat(A)}, B = ${mat(B)}</p><p>Enter X row by row (6 numbers).</p>`, kind:'list', answer:X.flat(),
    hint:'Row reduce [A | B] (both columns of B at once); the right block becomes X = A⁻¹B.',
    solution:`<p>[A | B] = ${mat(Ab,3)} ~ [I | X] with X = ${mat(X)}.</p>`, _d:{A,B} };
}),
mk('54-3-elem-inverse','54-3',3,r=>{
  const e1 = elemRandom(r,3), e2 = elemRandom(r,3); const P = fmul(e2.E, e1.E); const X = inv(P);
  return { prompt:`<p>E₁ and E₂ are the elementary matrices</p><p>E₁ = ${mat(e1.E)}, E₂ = ${mat(e2.E)}</p><p>Find (E₂E₁)⁻¹. Enter its entries row by row.</p>`, kind:'list', answer: ansL(X.flat()),
    hint:'(E₂E₁)⁻¹ = E₁⁻¹E₂⁻¹, and each Eᵢ⁻¹ undoes its row operation.',
    solution:`<p>E₁ does ${e1.d}; E₂ does ${e2.d}. Their inverses undo those operations: E₁⁻¹ = ${mat(inv(e1.E))}, E₂⁻¹ = ${mat(inv(e2.E))}. (E₂E₁)⁻¹ = E₁⁻¹E₂⁻¹ = ${mat(X)}.</p>`, _d:{E1:e1.E, E2:e2.E} };
}),
mk('54-3-elem-identify','54-3',3,r=>{
  const A = Array.from({length:3},()=>rvec(r,3,-4,4)); need(rank(A)===3);
  const i = r.int(0,2); let j = r.int(0,1); if(j>=i) j++; const c = rnz(r,-3,3); need(Math.abs(c)>=2);
  const opR = (a,b,k)=>({t:'R',a,b,k}), opC = (a,b,k)=>({t:'C',a,b,k});
  const desc = o => `${o.t}${sub(o.a+1)} ← ${o.t}${sub(o.a+1)} ${o.k<0?'−':'+'} ${Math.abs(o.k)}${o.t}${sub(o.b+1)}`;
  const apply = (M,o)=>{ const X = M.map(x=>x.slice()); if(o.t==='R'){ X[o.a]=X[o.a].map((v,t)=>v+o.k*M[o.b][t]); } else { for(let t=0;t<3;t++) X[t][o.a]=M[t][o.a]+o.k*M[t][o.b]; } return X; };
  const ops = [opR(i,j,c), opR(j,i,c), opR(i,j,-c), opC(i,j,c), opC(j,i,c)];
  const B = apply(A, ops[0]);
  const same = (X,Y)=>X.every((row,a)=>row.every((v,b)=>v===Y[a][b]));
  ops.slice(1).forEach(o=>need(!same(apply(A,o),B)));
  const E = eyeI(3); E[i][j]=c;
  const o = mc(r, desc(ops[0]), ops.slice(1).map(desc));
  const opMap = {}; ops.forEach(x=>opMap[desc(x)]=x);
  return { prompt:`<p>Let A = ${mat(A)} and B = ${mat(B)}. There is an elementary matrix E with B = EA. Which row operation does E perform?</p>`, kind:'mc', ...o,
    hint:'Compare A and B row by row: which row changed, and by what multiple of which other row? Left-multiplication acts on ROWS.',
    solution:`<p>Only row ${i+1} changed: new R${sub(i+1)} − old R${sub(i+1)} = ${tup(B[i].map((v,t)=>v-A[i][t]))} = ${fs(c)}·R${sub(j+1)}. So E performs ${desc(ops[0])}, i.e. E = ${mat(E)} (I with that same operation applied). Column operations would correspond to AE, not EA.</p>`, _d:{A,B,opMap} };
}),
mk('54-3-imt','54-3',4,r=>{
  const n = r.int(3,6); const invt = r.bool();
  const FI = [`Ax = 0 has only the trivial solution`, `the columns of A span ℝ${sup(n)}`, `Aᵀ has ${n} pivot positions`, `there is an ${n}×${n} matrix C with CA = I`, `the linear map x ↦ Ax is one-to-one`, `Ax = b has at least one solution for each b in ℝ${sup(n)}`];
  const FS = [`the columns of A are linearly dependent`, `Ax = b is inconsistent for some b in ℝ${sup(n)}`, `the echelon form of A has a row of zeros`, `x ↦ Ax does not map ℝ${sup(n)} onto ℝ${sup(n)}`, `A has only ${n-1} pivot positions`, `Aᵀx = 0 has a nontrivial solution`];
  const fact = r.pick(invt?FI:FS);
  const POOL = [ // [text, true-when-invertible]
    ['A is row equivalent to the identity matrix', true, 'rowI'], ['the rows of A are linearly independent', true, 'rowsInd'],
    [`Ax = b has a unique solution for every b in ℝ${sup(n)}`, true, 'unique'], ['Ax = 0 has a nontrivial solution', false, 'nontriv'],
    ['Aᵀ is invertible', true, 'Atinv'], [`there is a b in ℝ${sup(n)} for which Ax = b has no solution`, false, 'nosol'],
    ['the columns of A form a linearly independent set', true, 'colsInd'], [`the columns of A form a basis of ℝ${sup(n)}`, true, 'basis'],
    ['the equation Ax = 0 has a free variable', false, 'free'], ['there is a nonzero x with Aᵀx = 0', false, 'AtNul'],
    [`x ↦ Ax maps ℝ${sup(n)} onto ℝ${sup(n)}`, true, 'onto'], [`there is a matrix D with AD = I`, true, 'rightInv'] ];
  const pool = POOL.filter(p=>!fact.toLowerCase().includes(p[0].slice(0,18).toLowerCase()));
  const chosen = r.sample(pool, 5);
  const correct = chosen.map((p,ix)=>(p[1]===invt)?ix:-1).filter(x=>x>=0);
  return { prompt:`<p>A is a ${n}×${n} matrix and ${fact}. Select <b>all</b> statements that must then be true.</p>`, kind:'multi',
    choices: chosen.map(p=>p[0]), answer: correct, hint:'For a SQUARE matrix the IMT statements are all equivalent: either all true (invertible) or all false (singular).',
    solution:`<p>"${fact}" ${invt?'is one of the IMT conditions, so A is invertible':'negates an IMT condition, so A is NOT invertible'}. Then every IMT statement is ${invt?'true':'false'} and every negated one ${invt?'false':'true'}:</p><ul>${chosen.map(p=>'<li>'+p[0]+' — '+((p[1]===invt)?'TRUE':'FALSE')+'</li>').join('')}</ul>`,
    _d:{n, invt, ids: chosen.map(p=>p[2])} };
}),
mk('54-3-tf-commute','54-3',5,r=>{
  const A = [rvec(r,2,-3,3), rvec(r,2,-3,3)]; need(rank(A)===2 && !(A[0][1]===0&&A[1][0]===0));
  let B; if(r.bool()){ const p=rnz(r,-2,2), q=r.int(-3,3); B = A.map((row,i)=>row.map((x,j)=>p*x+(i===j?q:0))); } else B = [rvec(r,2,-3,3), rvec(r,2,-3,3)];
  need(rank(B)===2);
  need(!B.every((row,i)=>row.every((x,j)=>x===A[i][j])));
  const AB = imul(A,B), BA = imul(B,A); const comm = AB.every((row,i)=>row.every((x,j)=>x===BA[i][j]));
  const st = r.pick(['comm','sq','diffsq','tt','inv']);
  const S = { comm:'AB = BA', sq:'(A + B)² = A² + 2AB + B²', diffsq:'(A + B)(A − B) = A² − B²', tt:'(AB)ᵀ = AᵀBᵀ', inv:'(AB)⁻¹ = A⁻¹B⁻¹' };
  const why = { comm:'compare AB and BA directly', sq:'(A+B)² = A² + AB + BA + B², equal to A²+2AB+B² iff AB = BA', diffsq:'(A+B)(A−B) = A² − AB + BA − B², equal to A²−B² iff AB = BA',
    tt:'(AB)ᵀ = BᵀAᵀ, which equals AᵀBᵀ iff (AB)ᵀ = (BA)ᵀ iff AB = BA', inv:'(AB)⁻¹ = B⁻¹A⁻¹, which equals A⁻¹B⁻¹ iff BA = AB' }[st];
  return { prompt:`<p>Let A = ${mat(A)} and B = ${mat(B)}.</p><p>True or false (for these specific matrices): ${S[st]}.</p>`, kind:'tf', answer: comm,
    hint:'Each identity reduces to whether AB = BA. Compute both products.',
    solution:`<p>${why}. Here AB = ${mat(AB)}, BA = ${mat(BA)}, so ${comm?'AB = BA and the statement is TRUE (B is a polynomial in A here, so they commute).':'AB ≠ BA and the statement is FALSE — a concrete counterexample to the "algebra rule".'}</p>`, _d:{A,B,st} };
}),
];

// ================================================================ 54-4  Lay 3.1–3.3
G['54-4'] = [
mk('54-4-cofactor4','54-4',0,r=>{
  const A = Array.from({length:4},()=>rvec(r,4,-4,4));
  const byRow = r.bool(), k = r.int(0,3); const keep = r.int(0,3);
  for(let t=0;t<4;t++) if(t!==keep && r.float()<0.85){ if(byRow) A[k][t]=0; else A[t][k]=0; }
  if(byRow) need(A[k].filter(x=>x===0).length>=2); else need(A.filter(x=>x[k]===0).length>=2);
  const d = det(A); need(!d.isZero());
  const nzc = A.map(row=>row.filter(x=>x===0).length);
  return { prompt:`<p>Compute det A for</p>${mat(A)}<p>Choose the row or column with the most zeros.</p>`, kind:'num', answer: ans(d),
    hint:'det A = Σⱼ aᵢⱼCᵢⱼ with Cᵢⱼ = (−1)^{i+j}Mᵢⱼ. Expand along the line with most zeros; remember the checkerboard signs.',
    solution:`<p>Expanding along ${byRow?'row':'column'} ${k+1} (most zeros), only the nonzero entries contribute: ${(byRow?A[k]:A.map(x=>x[k])).map((a,t)=>a===0?null:(fs(a)+'·('+(((byRow?k+t:t+k)%2)?'−':'+')+'M'+sub(byRow?k+1:t+1)+sub(byRow?t+1:k+1)+')')).filter(Boolean).join(' + ')}. Evaluating the 3×3 minors gives det A = ${fs(d)}.</p>`, _d:{A} };
}),
mk('54-4-cofactor5','54-4',0,r=>{
  const A = Array.from({length:5},()=>rvec(r,5,-3,3));
  const r1 = r.int(0,4), c1 = r.int(0,4); for(let t=0;t<5;t++) if(t!==r1) A[t][c1]=0; A[r1][c1]=rnz(r,-3,3);
  let r2 = r.int(0,3); if(r2>=r1) r2++; let c2 = r.int(0,3); if(c2>=c1) c2++;
  for(let t=0;t<5;t++) if(t!==c2) A[r2][t]=0; A[r2][c2]=rnz(r,-3,3);
  const d = det(A); need(!d.isZero());
  return { prompt:`<p>Compute det A for the 5×5 matrix</p>${mat(A)}`, kind:'num', answer: ans(d),
    hint:'Find a column (or row) with a single nonzero entry and expand; repeat on the 4×4 minor, then finish the 3×3.',
    solution:`<p>Column ${c1+1} has a single nonzero entry ${fs(A[r1][c1])} in row ${r1+1}: det A = ${fs(A[r1][c1])}·(−1)^${r1+c1+2}·det(minor). In that minor, the row coming from row ${r2+1} of A has a single nonzero entry ${fs(A[r2][c2])}; expand again (watch the position-dependent sign in the smaller matrix), leaving a 3×3 determinant. Result: det A = ${fs(d)}.</p>`, _d:{A} };
}),
mk('54-4-rowops','54-4',1,r=>{
  const D = rnz(r,-9,9);
  const perm = r.shuffle([0,1,2]); const s = r.pick([2,3,-2,-3,-1,4]); const si = r.int(0,2);
  const M = perm.map((p,i)=>{ const row=[0,0,0]; row[p]=1; return row; });
  M[si] = M[si].map(x=>x*s);
  const ti = r.int(0,2); let tj = r.int(0,1); if(tj>=ti) tj++; const c = rnz(r,-4,4);
  M[ti] = M[ti].map((x,t)=>x+c*M[tj][t]);
  const L = [['a','b','c'],['d','e','f'],['g','h','i']];
  const entry = (i,j)=>lin([M[i][0],M[i][1],M[i][2]], [L[0][j],L[1][j],L[2][j]]);
  const Bd = [0,1,2].map(i=>[0,1,2].map(j=>entry(i,j)));
  const dM = det(M); const ansv = dM.mul(D);
  return { prompt:`<p>Given det${mat(L)} = ${fs(D)}, find</p><p>det${mat(Bd)}</p>`, kind:'num', answer: ans(ansv),
    hint:'Undo it as row operations: a swap flips the sign, scaling a row scales det, adding a multiple of another row changes nothing.',
    solution:`<p>Rows of the new matrix in terms of the old rows r₁ = (a,b,c), r₂, r₃: ${[0,1,2].map(i=>'('+lin(M[i],['r₁','r₂','r₃'])+')').join(', ')}. Replacement (adding a multiple of another row) doesn't change det; the factor ${fs(s)} multiplies det by ${fs(s)}; the row order is a permutation with sign ${fs(dM.div(s))}. Total factor = ${fs(dM)}, so det = ${fs(dM)}·${fsp(D)} = ${fs(ansv)}.</p>`, _d:{M, D} };
}),
mk('54-4-rr-det','54-4',1,r=>{
  const L = eyeI(4), U = eyeI(4).map(x=>x.slice());
  for(let i=1;i<4;i++) for(let j=0;j<i;j++) L[i][j]=r.int(-2,2);
  for(let i=0;i<4;i++){ U[i][i]=rnz(r,-3,3); for(let j=i+1;j<4;j++) U[i][j]=r.int(-3,3); }
  let A = imul(L,U); let sw = r.bool(); if(sw){ const a=r.int(1,3); [A[0],A[a]]=[A[a],A[0]]; }
  need(maxAbs(A)<=12 && A.flat().filter(x=>x===0).length<=4);
  const d = det(A); const ud = U[0][0]*U[1][1]*U[2][2]*U[3][3];
  return { prompt:`<p>Use row reduction to compute det A for</p>${mat(A)}`, kind:'num', answer: ans(d),
    hint:'Reduce to triangular form using only row replacements (and track swaps: each flips the sign). det = (±1)·product of the diagonal.',
    solution:`<p>${sw?'One row swap brings a convenient pivot to the top (sign −1). ':''}Row replacements reduce A to the upper-triangular U = ${mat(U)}, without changing det. det A = ${sw?'−':''}(${[0,1,2,3].map(i=>fs(U[i][i])).join(')(')}) = ${fs(d)}.</p>`, _d:{A} };
}),
mk('54-4-props','54-4',2,r=>{
  const n = r.int(3,4); const a = rnz(r,-4,4), b = rnz(r,-3,3); need(Math.abs(a)>1||Math.abs(b)>1);
  const tpls = [
    { disp:c=>`det(${c}Aᵀ B⁻¹)`, sc:c=>c, f:[{M:'A',t:1,e:1},{M:'B',t:0,e:-1}] },
    { disp:c=>`det(${c}A⁻¹ B²)`, sc:c=>c, f:[{M:'A',t:0,e:-1},{M:'B',t:0,e:2}] },
    { disp:c=>`det((${c}A)⁻¹ Bᵀ)`, sc:c=>fr(1,c), f:[{M:'A',t:0,e:-1},{M:'B',t:1,e:1}] },
    { disp:c=>`det(${c}B⁻¹A³B)`, sc:c=>c, f:[{M:'B',t:0,e:-1},{M:'A',t:0,e:3},{M:'B',t:0,e:1}] },
    { disp:c=>`det(${c}AᵀA B⁻¹)`, sc:c=>c, f:[{M:'A',t:1,e:1},{M:'A',t:0,e:1},{M:'B',t:0,e:-1}] },
    { disp:c=>`det((${c}Bᵀ)⁻¹ A²)`, sc:c=>fr(1,c), f:[{M:'B',t:1,e:-1},{M:'A',t:0,e:2}] },
  ];
  const tp = r.pick(tpls); const c = r.pick([2,3,-1,-2]);
  const scal = F.of(tp.sc(c));
  let v = F1; for(let t=0;t<n;t++) v = v.mul(scal);
  const pw = (x,e)=>{ let y=F1; for(let t=0;t<Math.abs(e);t++) y=y.mul(x); return e<0?F1.div(y):y; };
  for(const f of tp.f) v = v.mul(pw(F.of(f.M==='A'?a:b), f.e));
  need(Math.abs(v.n)<=100000);
  return { prompt:`<p>A and B are ${n}×${n} matrices with det A = ${fs(a)} and det B = ${fs(b)}. Compute ${tp.disp(c===-1?'−':c)}.</p>`, kind:'num', answer: ans(v),
    hint:`det is multiplicative; det(Aᵀ) = det A; det(A⁻¹) = 1/det A; det(cA) = cⁿ det A with n = ${n} (not c·det A).`,
    solution:`<p>The scalar ${fs(scal)} multiplies all ${n} rows: factor (${fs(scal)})${sup(n)} = ${fs(pw(scal,n))}. The matrix factors contribute ${tp.f.map(f=>'(det '+f.M+')'+(f.e===1?'':sup(f.e))).join('·')} (transposes don't change det). Total: ${fs(v)}.</p>`, _d:{n,a,b,scal,f:tp.f} };
}),
mk('54-4-param-quad','54-4',3,r=>{
  const n = 3; const M = Array.from({length:n},()=>rvec(r,n,-4,4));
  const [i1,i2] = r.sample([0,1,2],2); const [j1,j2] = r.sample([0,1,2],2);
  const at = h => M.map((row,a)=>row.map((x,b)=>((a===i1&&b===j1)||(a===i2&&b===j2))?h:x));
  const d0 = det(at(0)), d1 = det(at(1)), dm = det(at(-1));
  const c0 = d0, c2 = d1.add(dm).div(2).sub(d0), c1 = d1.sub(dm).div(2);
  need(!c2.isZero());
  const disc = c1.mul(c1).sub(c2.mul(c0).mul(4)); need(disc.isInt() && disc.n>0);
  const sq = Math.round(Math.sqrt(disc.n)); need(sq*sq===disc.n);
  const r1 = c1.neg().add(sq).div(c2.mul(2)), r2 = c1.neg().sub(sq).div(c2.mul(2));
  need(r1.d<=3 && r2.d<=3 && Math.abs(r1.toNum())<=12 && Math.abs(r2.toNum())<=12);
  const disp = at('h').map(row=>row.map(x=>x==='h'?'h':fs(x)));
  return { prompt:`<p>Find all values of h for which the matrix</p>${mat(disp)}<p>is <b>not</b> invertible. Enter them comma-separated.</p>`, kind:'list', unordered:true, answer: ansL([r1,r2]),
    hint:'Not invertible ⇔ det = 0. Expand (h appears twice, so det is quadratic in h) and solve.',
    solution:`<p>det = ${poly([c0,c1,c2],'h')} (cofactor expansion). Setting it to 0: h = ${fs(r1)} or h = ${fs(r2)}.</p>`, _d:{M:at(null), i1,j1,i2,j2} };
}),
mk('54-4-param-lin4','54-4',3,r=>{
  const {M,i,j,h0,D,C,disp} = detLinearH(r,4);
  return { prompt:`<p>For which value of h is det A = 0, where A = </p>${mat(disp)}`, kind:'num', answer: ans(h0),
    hint:'h appears once, so det A = (cofactor of h)·h + (det with h = 0). Compute those two numbers.',
    solution:`<p>Expanding along row ${i+1}: det A = h·C${sub(i+1)}${sub(j+1)} + (rest) = ${fs(C)}h ${D.sign()<0?'−':'+'} ${fs(D.abs())}. It vanishes for h = ${fs(h0)}.</p>`, _d:{M,i,j} };
}),
mk('54-4-area','54-4',4,r=>{
  const P = rvec(r,2,-4,4), u = rvec(r,2,-4,4), v = rvec(r,2,-4,4); const du = u[0]*v[1]-u[1]*v[0]; need(du!==0);
  const A = [rvec(r,2,-4,4), rvec(r,2,-4,4)]; const dA = A[0][0]*A[1][1]-A[0][1]*A[1][0]; need(dA!==0);
  const V = [P, [P[0]+u[0],P[1]+u[1]], [P[0]+u[0]+v[0],P[1]+u[1]+v[1]], [P[0]+v[0],P[1]+v[1]]];
  const area = Math.abs(du*dA);
  return { prompt:`<p>A parallelogram has vertices ${V.map(tup).join(', ')} (in order). Let T(x) = Ax with A = ${mat(A)}. Find the area of the image T(parallelogram).</p>`, kind:'num', answer: area,
    hint:'Translate a vertex to the origin to get the edge vectors; area = |det[edges]|. Then area(T(S)) = |det A|·area(S).',
    solution:`<p>Edges from ${tup(P)}: ${tup(u)} and ${tup(v)}; area = |det[${tup(u)} ${tup(v)}]| = |${du}| = ${Math.abs(du)}. det A = ${fs(dA)}. Image area = |${fs(dA)}|·${Math.abs(du)} = ${area}.</p>`, _d:{A, V} };
}),
mk('54-4-volume','54-4',4,r=>{
  const V = Array.from({length:3},()=>rvec(r,3,-3,3)); const dv = det(T_(V)); need(!dv.isZero());
  const useT = r.bool(); let A = null, dA = F1; if(useT){ A = Array.from({length:3},()=>rvec(r,3,-2,2)); dA = det(A); need(!dA.isZero() && Math.abs(dA.n)<=12); }
  const vol = Math.abs(dv.mul(dA).n);
  return { prompt:`<p>A parallelepiped S has one vertex at the origin and adjacent vertices ${V.map(tup).join(', ')}.${useT?` Let T(x) = Ax with A = ${mat(A)}.`:''} Find the volume of ${useT?'T(S)':'S'}.</p>`, kind:'num', answer: vol,
    hint:'Volume = |det[v₁ v₂ v₃]|; under T it gets multiplied by |det A|.',
    solution:`<p>det[v₁ v₂ v₃] = ${fs(dv)} ⇒ vol(S) = ${Math.abs(dv.n)}.${useT?` det A = ${fs(dA)} ⇒ vol(T(S)) = |${fs(dA)}|·${Math.abs(dv.n)} = ${vol}.`:''}</p>`, _d:{V, A} };
}),
];

// ================================================================ 54-5  Lay 4.1–4.2
const R_ = () => Math.round((Math.random()*10-5)*1000)/1000 || 1.3;
function subspacePool(r){
  const P = [];
  { const a=rnz(r,-4,4), b=r.int(-4,4), c=r.int(-4,4), d=r.bool()?0:rnz(r,-6,6);
    P.push({ t:`{(x, y, z) ∈ ℝ³ : ${lin([a,b,c],['x','y','z'])} = ${fs(d)}}`, sub:d===0, why:d===0?'it is Nul of a 1×3 matrix':'the zero vector does not satisfy the equation (0 ≠ '+fs(d)+')',
      mem:v=>Math.abs(a*v[0]+b*v[1]+c*v[2]-d)<1e-7, smp:()=>{ const y=R_(), z=R_(); return [(d-b*y-c*z)/a, y, z]; } }); }
  P.push({ t:'{(x, y, z) ∈ ℝ³ : xy = 0}', sub:false, why:'(1,0,0) and (0,1,0) are in it but their sum (1,1,0) is not', mem:v=>Math.abs(v[0]*v[1])<1e-7, smp:()=>{ const v=[R_(),R_(),R_()]; v[Math.random()<0.5?0:1]=0; return v; } });
  P.push({ t:'{(x, y, z) ∈ ℝ³ : x ≥ 0}', sub:false, why:'not closed under scalar multiplication: (1,0,0) is in it but (−1)(1,0,0) is not', mem:v=>v[0]>=-1e-12, smp:()=>[Math.abs(R_()),R_(),R_()] });
  { const k = rnz(r,-3,3); P.push({ t:`{(x, y, z) ∈ ℝ³ : z = ${k===1?'':k===-1?'−':fs(k)}x²}`, sub:false, why:'not closed under scalar multiplication (the condition is not linear): (1,0,'+fs(k)+') is in it but 2·(1,0,'+fs(k)+') is not', mem:v=>Math.abs(v[2]-k*v[0]*v[0])<1e-7, smp:()=>{ const x=R_(); return [x,R_(),k*x*x]; } }); }
  { const u=rvec(r,3,-3,3), w=rvec(r,3,-3,3); need(rank([u,w])===2); const inSpan = r.int(0,2)===0;
    const c0 = inSpan ? u.map((x,i)=>r.int(-2,2)*0 + rnz(r,1,1)*x + w[i]) : rvec(r,3,-3,3); if(!inSpan) need(rank([u,w,c0])===3); need(c0.some(x=>x!==0));
    const comp = [0,1,2].map(i=>lin([u[i],w[i],c0[i]],['s','t','']));
    P.push({ t:`{(${comp.join(', ')}) : s, t ∈ ℝ}`, sub:inSpan, why: inSpan?'the constant vector '+tup(c0)+' = u + w already lies in Span{u, w}, so this is just Span{'+tup(u)+', '+tup(w)+'} (shift s → s − 1, t → t − 1) — a subspace (trap!)':'it is a plane shifted by '+tup(c0)+', which is not in Span{'+tup(u)+', '+tup(w)+'}; 0 is not in the set',
      mem:v=>{ const d=v.map((x,i)=>x-c0[i]); const M=[u,w,d]; const det3 = M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]); return Math.abs(det3)<1e-6; },
      smp:()=>{ const s=R_(), t=R_(); return [0,1,2].map(i=>s*u[i]+t*w[i]+c0[i]); } }); }
  { const a=rnz(r,-3,3); P.push({ t:`{p ∈ ℙ₂ : p(${fs(a)}) = 0}`, sub:true, why:'evaluation p ↦ p('+fs(a)+') is linear, and this is its kernel', mem:v=>Math.abs(v[0]+v[1]*a+v[2]*a*a)<1e-7, smp:()=>{ const x=R_(), y=R_(); return [-a*x, x-a*y, y]; } }); }
  { const a=r.int(-3,3), k=rnz(r,-4,4); P.push({ t:`{p ∈ ℙ₂ : p(${fs(a)}) = ${fs(k)}}`, sub:false, why:'the zero polynomial has p('+fs(a)+') = 0 ≠ '+fs(k), mem:v=>Math.abs(v[0]+v[1]*a+v[2]*a*a-k)<1e-7, smp:()=>{ const x=R_(), y=R_(); return [k-a*x, x-a*y, y]; } }); }
  { const a=rnz(r,1,3); P.push({ t:`{p ∈ ℙ₂ : p(0) = p(${a})}`, sub:true, why:'it is the kernel of the linear map p ↦ p(0) − p('+a+')', mem:v=>Math.abs(v[1]*a+v[2]*a*a)<1e-7, smp:()=>{ const c=R_(), b=R_(); return [c, -a*b, b]; } }); }
  P.push({ t:'{p ∈ ℙ₂ : p has degree exactly 2}', sub:false, why:'the zero polynomial is not in it (also t² + (−t²) = 0 leaves the set)', mem:v=>Math.abs(v[2])>1e-12, smp:()=>[R_(),R_(),R_()] });
  P.push({ t:'{A ∈ M₂ₓ₂ : Aᵀ = A}', sub:true, why:'(A+B)ᵀ = Aᵀ+Bᵀ and (cA)ᵀ = cAᵀ, and 0 is symmetric', mem:v=>Math.abs(v[1]-v[2])<1e-9, smp:()=>{ const b=R_(); return [R_(),b,b,R_()]; } });
  P.push({ t:'{A ∈ M₂ₓ₂ : trace A = 0}', sub:true, why:'trace is linear; this is its kernel', mem:v=>Math.abs(v[0]+v[3])<1e-9, smp:()=>{ const a=R_(); return [a,R_(),R_(),-a]; } });
  P.push({ t:'{A ∈ M₂ₓ₂ : det A = 0}', sub:false, why:'[1 0; 0 0] and [0 0; 0 1] are singular but their sum I is not', mem:v=>Math.abs(v[0]*v[3]-v[1]*v[2])<1e-7, smp:()=>{ const x=[R_(),R_()], y=[R_(),R_()]; return [x[0]*y[0],x[0]*y[1],x[1]*y[0],x[1]*y[1]]; } });
  P.push({ t:'{A ∈ M₂ₓ₂ : A is invertible}', sub:false, why:'the zero matrix is not invertible', mem:v=>Math.abs(v[0]*v[3]-v[1]*v[2])>1e-12, smp:()=>[R_()+9,R_(),R_(),R_()+9] });
  P.push({ t:'{f ∈ C[0,1] : ∫₀¹ f(t) dt = 0}', sub:true, why:'integration is linear; this is its kernel', mem:v=>Math.abs(v[0]+v[1]/2+v[2]/3+v[3]/4)<1e-7, smp:()=>{ const v=[0,R_(),R_(),R_()]; v[0]=-(v[1]/2+v[2]/3+v[3]/4); return v; } });
  { const k=rnz(r,1,3); P.push({ t:`{f ∈ C[0,1] : f(0) = ${k===1?'':k}f(1) + 1}`, sub:false, why:'the zero function gives 0 = 1, false', mem:v=>Math.abs(v[0]-k*(v[0]+v[1]+v[2]+v[3])-1)<1e-7, smp:()=>{ const v=[0,R_(),R_(),R_()]; if(k===1){ v[1]=-(v[2]+v[3])-1; v[0]=R_(); } else v[0]=(k*(v[1]+v[2]+v[3])+1)/(1-k); return v; } }); }
  return P;
}
G['54-5'] = [
mk('54-5-subspace-multi','54-5',0,r=>{
  const P = subspacePool(r); const ch = r.sample(P,5); need(ch.some(x=>x.sub) && ch.some(x=>!x.sub));
  return { prompt:`<p>Select <b>all</b> sets that are subspaces (of ℝ³, ℙ₂, M₂ₓ₂ or C[0,1] respectively).</p>`, kind:'multi', choices: ch.map(x=>x.t), answer: ch.map((x,i)=>x.sub?i:-1).filter(i=>i>=0),
    hint:'Check (i) 0 is in the set, (ii) closed under +, (iii) closed under scalars. Kernels of linear maps are always subspaces; a single counterexample kills one.',
    solution:'<ul>'+ch.map(x=>`<li>${x.t}: ${x.sub?'SUBSPACE':'NOT a subspace'} — ${x.why}.</li>`).join('')+'</ul>', _d:{sets: ch} };
}),
mk('54-5-nul-basis','54-5',1,r=>{
  const m = r.int(3,4), n = 5, rk = r.int(2,3); const {A, piv} = randRank(r,m,n,rk,9);
  const {free, vecs, R} = nullBasis(A); const k = r.int(0,free.length-1);
  return { prompt:`<p>Find a basis for Nul A, where</p>${mat(A)}<p>Use the standard free-variable method: the basis vector belonging to a free variable xⱼ has xⱼ = 1 and the other free variables 0. Enter the basis vector belonging to <b>x${sub(free[k]+1)}</b>.</p>`,
    kind:'list', answer: ansL(vecs[k]), hint:'Row reduce A to RREF, solve Ax = 0 for the basic variables, and write x as a combination of free variables.',
    solution:`<p>RREF(A) = ${mat(R)} ⇒ free variables ${free.map(f=>'x'+sub(f+1)).join(', ')}. General solution x = ${free.map((f,i)=>'x'+sub(f+1)+tup(vecs[i])).join(' + ')}. Basis of Nul A: {${vecs.map(tup).join(', ')}}, dim Nul A = ${free.length}.</p>`, _d:{A, free, fj:free[k]} };
}),
mk('54-5-col-basis','54-5',1,r=>{
  const m = 4, n = 5, rk = 3; const {A, piv} = randRank(r,m,n,rk,9); const {R} = rref(A);
  const cols = T_(A), rcols = T_(R.map(x=>x.map(y=>y.n)));
  const nonp = [0,1,2,3,4].filter(j=>!piv.includes(j));
  const sets = {};
  const show = (vs)=>'{'+vs.map(tup).join(', ')+'}';
  const corr = show(piv.map(p=>cols[p])); sets[corr] = piv.map(p=>cols[p]);
  const trap = show(piv.map(p=>rcols[p])); sets[trap] = piv.map(p=>rcols[p]);
  need(rank(A.map((row,i)=>row.concat(piv.map(p=>rcols[p][i])))) > rk);
  let bad = null; for(let t=0;t<30 && !bad;t++){ const s = r.sample([0,1,2,3,4],3).sort(); if(rank(s.map(j=>cols[j]))<3) bad = s; }
  need(bad); const d2 = show(bad.map(j=>cols[j])); sets[d2] = bad.map(j=>cols[j]);
  const d3 = show(cols); sets[d3] = cols;
  const d4s = piv.slice(0,2).map(p=>cols[p]); const d4 = show(d4s); sets[d4] = d4s;
  const o = mc(r, corr, [trap, d2, d3, d4]);
  return { prompt:`<p>A = </p>${mat(A)}<p>row reduces to</p>${mat(R)}<p>Which set is a basis for Col A?</p>`, kind:'mc', ...o,
    hint:'Pivot columns of the ORIGINAL A form a basis for Col A. Row operations change the column space, so RREF columns don\'t work.',
    solution:`<p>Pivots are in columns ${piv.map(p=>p+1).join(', ')}, so a basis of Col A is columns ${piv.map(p=>p+1).join(', ')} of A itself: ${corr}. The RREF columns ${trap} span Col(RREF), a different subspace (all its vectors have last entry 0). All five columns are dependent; two vectors can't span a 3-dimensional space; and ${d2} is dependent.</p>`, _d:{A, sets} };
}),
mk('54-5-kernel-poly','54-5',2,r=>{
  const v = r.pick(['two','deriv','three']);
  let pr, ker, kdesc, deg, pts;
  if(v==='two'){ const [a,b] = r.sample([-3,-2,-1,0,1,2,3,4],2); deg=2; pr=`T: ℙ₂ → ℝ², T(p) = (p(${fs(a)}), p(${fs(b)}))`; ker=[a*b, -(a+b), 1]; pts=[a,b]; kdesc=`(t ${a<0?'+':'−'} ${Math.abs(a)})(t ${b<0?'+':'−'} ${Math.abs(b)})`; }
  else if(v==='deriv'){ const a = rnz(r,-3,3); deg=2; pr=`T: ℙ₂ → ℝ², T(p) = (p(${fs(a)}), p′(${fs(a)}))`; ker=[a*a,-2*a,1]; pts=[a]; kdesc=`(t ${a<0?'+':'−'} ${Math.abs(a)})²`; }
  else { const [a,b,c] = r.sample([-2,-1,0,1,2,3],3); deg=3; pr=`T: ℙ₃ → ℝ³, T(p) = (p(${fs(a)}), p(${fs(b)}), p(${fs(c)}))`; ker=[-a*b*c, a*b+a*c+b*c, -(a+b+c), 1]; pts=[a,b,c]; kdesc=`(t ${a<0?'+':'−'} ${Math.abs(a)})(t ${b<0?'+':'−'} ${Math.abs(b)})(t ${c<0?'+':'−'} ${Math.abs(c)})`; }
  return { prompt:`<p>Let ${pr}. T is linear and its kernel is one-dimensional, spanned by a monic polynomial of degree ${deg}. Enter its coefficients c₀, c₁, …, c${sub(deg)} (constant term first).</p>`,
    kind:'list', answer:ker, hint:'p is in the kernel iff each listed condition gives 0 — i.e. p has those roots (a double root if p and p′ both vanish).',
    solution:`<p>T(p) = 0 forces ${v==='deriv'?'a double root at '+fs(-ker[1]/2):'roots at each evaluation point'}, so ker T = Span{${kdesc}} = Span{${poly(ker)}}. By rank–nullity, dim range T = ${deg+1} − 1 = ${deg} = dim of the codomain, so T is onto. Coefficients: ${tup(ker)}.</p>`, _d:{v, pts, deg} };
}),
mk('54-5-is-linear','54-5',2,r=>{
  const a = rnz(r,-3,3), b = r.int(-3,3), k = rnz(r,-4,4), c = rnz(r,2,4);
  const POOL = [
    {t:`T: ℙ₂ → ℝ², T(p) = (p(${fs(a)}), p′(${fs(b)}))`, lin:true, dim:3, f:p=>[p[0]+p[1]*a+p[2]*a*a, p[1]+2*p[2]*b]},
    {t:`T: ℙ₂ → ℙ₃, T(p) = t·p(t)`, lin:true, dim:3, f:p=>[0,p[0],p[1],p[2]]},
    {t:`T: ℙ₂ → ℙ₂, T(p) = p(t + 1) − p(t)`, lin:true, dim:3, f:p=>[p[1]+p[2], 2*p[2], 0]},
    {t:`T: M₂ₓ₂ → M₂ₓ₂, T(A) = A − Aᵀ`, lin:true, dim:4, f:m=>[0,m[1]-m[2],m[2]-m[1],0]},
    {t:`T: ℝ³ → ℝ², T(x₁,x₂,x₃) = (${lin([1,a],['x₁','x₂'])}, ${lin([c,1],['x₃','x₁'])})`, lin:true, dim:3, f:x=>[x[0]+a*x[1], c*x[2]+x[0]]},
    {t:`T: ℙ₂ → ℝ, T(p) = p(${fs(a)})·p(${fs(b)})`, lin:false, dim:3, f:p=>[(p[0]+p[1]*a+p[2]*a*a)*(p[0]+p[1]*b+p[2]*b*b)]},
    {t:`T: ℙ₂ → ℙ₂, T(p) = p + ${fs(Math.abs(k))}`, lin:false, dim:3, f:p=>[p[0]+Math.abs(k),p[1],p[2]]},
    {t:`T: ℝ² → ℝ², T(x₁,x₂) = (x₁ ${k<0?'−':'+'} ${Math.abs(k)}, x₂)`, lin:false, dim:2, f:x=>[x[0]+k,x[1]]},
    {t:`T: M₂ₓ₂ → ℝ, T(A) = det A`, lin:false, dim:4, f:m=>[m[0]*m[3]-m[1]*m[2]]},
    {t:`T: ℝ² → ℝ², T(x₁,x₂) = (|x₁|, x₂)`, lin:false, dim:2, f:x=>[Math.abs(x[0]),x[1]]},
    {t:`T: ℝ² → ℝ, T(x₁,x₂) = ${fs(c)}x₁ − x₂²`, lin:false, dim:2, f:x=>[c*x[0]-x[1]*x[1]]},
    {t:`T: ℙ₂ → ℝ, T(p) = ∫₀${sup(c)} p(t) dt`, lin:true, dim:3, f:p=>[p[0]*c+p[1]*c*c/2+p[2]*c*c*c/3]},
  ];
  const ch = r.sample(POOL,5); need(ch.some(x=>x.lin) && ch.some(x=>!x.lin));
  return { prompt:'<p>Select <b>all</b> maps that are linear transformations.</p>', kind:'multi', choices: ch.map(x=>x.t), answer: ch.map((x,i)=>x.lin?i:-1).filter(i=>i>=0),
    hint:'Linear ⇔ T(u+v) = T(u)+T(v) and T(cu) = cT(u). Quick test: T(0) must be 0. Products, absolute values, squares and added constants break linearity.',
    solution:'<ul>'+ch.map(x=>`<li>${x.t}: ${x.lin?'linear (built from evaluations/derivatives/integrals/matrix operations, each linear)':'NOT linear ('+(/\+ \d|x₁ [−+] \d/.test(x.t)?'T(0) ≠ 0':'fails T(cu) = cT(u), e.g. take c = −1 or 2')+')'}</li>`).join('')+'</ul>', _d:{maps: ch} };
}),
mk('54-5-in-nul-col','54-5',3,r=>{
  const {A} = randRank(r,3,3,2,9); const {vecs} = nullBasis(A); const nv = vecs[0]; need(nv.every(x=>x.isInt()));
  const uIn = r.bool(), wIn = r.bool();
  const u = uIn ? nv.map(x=>x.n*rnz(r,-2,2)) : rvec(r,3,-4,4); const w = wIn ? imv(A, rvec(r,3,-2,2)) : rvec(r,3,-6,6);
  need(u.some(x=>x) && w.some(x=>x));
  const inN = v=>imv(A,v).every(x=>x===0), inC = v=>rank(A.map((row,i)=>row.concat([v[i]])))===2;
  const st = [['u is in Nul A', inN(u)], ['u is in Col A', inC(u)], ['w is in Nul A', inN(w)], ['w is in Col A', inC(w)]];
  return { prompt:`<p>Let A = ${mat(A)}, u = ${tup(u)}, w = ${tup(w)}. Select <b>all</b> true statements.</p>`, kind:'multi', choices: st.map(x=>x[0]), answer: st.map((x,i)=>x[1]?i:-1).filter(i=>i>=0),
    hint:'Nul A: just compute Av (is it 0?). Col A: is Ax = v consistent? (row reduce [A | v]).',
    solution:`<p>Au = ${tup(imv(A,u))} ⇒ u ${inN(u)?'∈':'∉'} Nul A. Aw = ${tup(imv(A,w))} ⇒ w ${inN(w)?'∈':'∉'} Nul A. A has rank 2, so Col A is a plane; row reducing [A | u] and [A | w] shows u ${inC(u)?'∈':'∉'} Col A and w ${inC(w)?'∈':'∉'} Col A.</p>`, _d:{A,u,w} };
}),
mk('54-5-col-param','54-5',3,r=>{
  const {A} = randRank(r,3,4,2,8); const cs = T_(A); let n0=null;
  for(let a=0;a<4 && !n0;a++) for(let b=a+1;b<4 && !n0;b++){ const c = cross(cs[a],cs[b]); if(c.some(x=>x!==0)) n0=c; }
  need(n0 && n0[2]!==0); const w1 = r.int(-6,6), w2 = r.int(-6,6); const h0 = fr(-(n0[0]*w1+n0[1]*w2), n0[2]);
  return { prompt:`<p>Let A = ${mat(A)}. For what value of h is w = (${fs(w1)}, ${fs(w2)}, h) in Col A?</p>`, kind:'num', answer: ans(h0),
    hint:'w ∈ Col A ⇔ Ax = w is consistent. Row reduce [A | w]; rank A = 2, so a zero row appears whose augmented entry must vanish.',
    solution:`<p>A has rank 2, so Col A is a plane through 0 with normal vector n = ${tup(n0)} (cross product of two independent columns). w ∈ Col A ⇔ n·w = 0: ${fs(n0[0])}·${fsp(w1)} + ${fsp(n0[1])}·${fsp(w2)} + ${fsp(n0[2])}h = 0 ⇒ h = ${fs(h0)}. (Row reducing [A | w] gives the same condition.)</p>`, _d:{A,w1,w2} };
}),
mk('54-5-tf','54-5',4,r=>{
  const st = r.pick(['axb','col','nul','line','poly']);
  let text, truth, why, d = {st};
  if(st==='axb'){ const {A} = randRank(r,2,3,2,6); const b = r.bool()? [0,0] : rvec(r,2,-5,5); d.A=A; d.b=b;
    text = `The solution set of Ax = b, with A = ${mat(A)} and b = ${tup(b)}, is a subspace of ℝ³.`; truth = b.every(x=>x===0);
    why = truth ? 'b = 0, so the solution set is Nul A — a subspace.' : 'b ≠ 0, so x = 0 is not a solution: the set is a translate of Nul A, not a subspace.'; }
  else if(st==='col' || st==='nul'){ const m = r.int(2,5); let n = r.int(2,5); if(n===m) n++; const k = r.bool()? (st==='col'?m:n) : (st==='col'?n:m); d.m=m; d.n=n; d.k=k;
    text = `For any ${m}×${n} matrix A, ${st==='col'?'Col A':'Nul A'} is a subspace of ℝ${sup(k)}.`; truth = st==='col' ? k===m : k===n;
    why = st==='col' ? `Col A consists of vectors Ax ∈ ℝ${sup(m)} (one entry per ROW), so it lives in ℝ${sup(m)}.` : `Nul A consists of x with Ax = 0, x ∈ ℝ${sup(n)} (one entry per COLUMN).`; }
  else if(st==='line'){ const m = rnz(r,-4,4), c = r.bool()?0:rnz(r,-4,4); d.c=c; text = `The line {(x, y) : y = ${lin([m,c],['x',''])}} is a subspace of ℝ².`; truth = c===0; why = c===0?'it passes through the origin: it is Span{(1, '+fs(m)+')}.':'it does not contain (0, 0).'; }
  else { const n = r.int(2,4), a = r.int(-2,2), c = r.bool()?0:rnz(r,-3,3); d.c=c; text = `{p ∈ ℙ${sub(n)} : p(${fs(a)}) = ${fs(c)}} is a subspace of ℙ${sub(n)}.`; truth = c===0; why = c===0?'it is the kernel of the linear map p ↦ p('+fs(a)+').':'the zero polynomial is not in it.'; }
  return { prompt:`<p>True or false: ${text}</p>`, kind:'tf', answer: truth, hint:'Subspace test: contains 0, closed under + and scalar multiplication. Col A ⊆ ℝ^(#rows), Nul A ⊆ ℝ^(#cols).',
    solution:`<p>${truth?'TRUE':'FALSE'}: ${why}</p>`, _d:d };
}),
];

// ================================================================ 54-6  Lay 4.3–4.6
G['54-6'] = [
mk('54-6-is-basis','54-6',0,r=>{
  const n = r.int(3,4); const k = r.pick([n-1,n,n,n+1]); const rk = r.int(Math.max(1,Math.min(n,k)-1), Math.min(n,k));
  const {A} = randRank(r,n,k,rk,7); const V = T_(A); for(const v of V) need(v.some(x=>x));
  for(let a=0;a<k;a++) for(let b=a+1;b<k;b++) need(rank([V[a],V[b]])===2);
  const ind = rk===k, span = rk===n;
  const L = [`A basis of ℝ${sup(n)}`, `Linearly independent but does not span ℝ${sup(n)}`, `Spans ℝ${sup(n)} but is linearly dependent`, `Neither linearly independent nor spanning ℝ${sup(n)}`];
  const correct = L[ind&&span?0:ind?1:span?2:3]; const o = mc(r, correct, L.filter(x=>x!==correct));
  return { prompt:`<p>Classify the set {${V.map(tup).join(', ')}} in ℝ${sup(n)}.</p>`, kind:'mc', ...o,
    hint:'Matrix with these columns: independent ⇔ pivot in every column; spans ⇔ pivot in every row. Basis ⇔ both.',
    solution:`<p>RREF of [v₁ … v${sub(k)}] = ${mat(rref(A).R)}: ${rk} pivots, ${k} columns, ${n} rows. ${ind?'Pivot in every column ⇒ independent.':'Some column lacks a pivot ⇒ dependent.'} ${span?'Pivot in every row ⇒ spans.':'Some row lacks a pivot ⇒ does not span.'} Answer: ${correct}.</p>`, _d:{V, n, correct} };
}),
mk('54-6-basis-param','54-6',0,r=>{
  const {M,i,j,h0,D,C} = detLinearH(r,3); // row i = coefficients of p_{i+1}
  const nm = ['','t','t²'];
  const pstr = M.map((row,a)=>{ let s=''; row.forEach((c,b)=>{ if(a===i&&b===j){ s += (s?' + ':'')+'h'+nm[b]; return; } if(c===0) return; const body = (Math.abs(c)===1&&b>0)?nm[b]:Math.abs(c)+nm[b]; s += s ? (c<0?' − ':' + ')+body : (c<0?'−':'')+body; }); return s||'0'; });
  return { prompt:`<p>Let p₁ = ${pstr[0]}, p₂ = ${pstr[1]}, p₃ = ${pstr[2]} in ℙ₂. For which value of h is {p₁, p₂, p₃} <b>not</b> a basis of ℙ₂?</p>`, kind:'num', answer: ans(h0),
    hint:'Use coordinate vectors relative to {1, t, t²}: three polynomials form a basis of ℙ₂ ⇔ the 3×3 matrix of their coordinate vectors is invertible.',
    solution:`<p>Coordinate vectors (constant, t, t²) as columns give a 3×3 matrix whose determinant is ${fs(C)}h ${D.sign()<0?'−':'+'} ${fs(D.abs())}. Since dim ℙ₂ = 3, the set is a basis ⇔ det ≠ 0 ⇔ h ≠ ${fs(h0)}.</p>`, _d:{M,i,j} };
}),
mk('54-6-coords-Rn','54-6',1,r=>{
  const B = randUnimod(r,3,4); const c = rvec(r,3,-4,4); need(c.filter(x=>x).length>=2); const x = imv(B,c); need(maxAbs([x])<=30);
  const bs = T_(B);
  return { prompt:`<p>B = {b₁, b₂, b₃} with b₁ = ${tup(bs[0])}, b₂ = ${tup(bs[1])}, b₃ = ${tup(bs[2])} is a basis of ℝ³. Find [x]_B for x = ${tup(x)}.</p>`, kind:'list', answer:c,
    hint:'Solve P_B c = x where P_B = [b₁ b₂ b₃]: row reduce [b₁ b₂ b₃ | x].', solution:`<p>Row reduce [P_B | x] = ${aug(B,x)} to [I | c] with c = ${tup(c)}. Check: ${fs(c[0])}b₁ + ${fsp(c[1])}b₂ + ${fsp(c[2])}b₃ = x.</p>`, _d:{B,x} };
}),
mk('54-6-coords-poly','54-6',1,r=>{
  const Bm = randUnimod(r,3,3); const c = rvec(r,3,-3,3); need(c.filter(x=>x).length>=2); const p = imv(Bm,c);
  const bs = T_(Bm); need(bs.every(v=>v.filter(x=>x).length>=1));
  return { prompt:`<p>B = {${bs.map(v=>poly(v)).join(', ')}} is a basis of ℙ₂. Find the coordinate vector [p]_B of p(t) = ${poly(p)}.</p>`, kind:'list', answer:c,
    hint:'Write p = c₁b₁ + c₂b₂ + c₃b₃ and match coefficients of 1, t, t² — a 3×3 linear system (coordinate isomorphism with ℝ³).',
    solution:`<p>Matching coefficients of 1, t, t² gives the system with augmented matrix ${aug(Bm,p)}, whose solution is c = ${tup(c)}. Check: ${c.map((ci,i)=>fsp(ci)+'('+poly(bs[i])+')').join(' + ')} = ${poly(p)}.</p>`, _d:{Bm,p} };
}),
mk('54-6-rank-abstract','54-6',2,r=>{
  const m = r.int(3,9), n = r.int(3,9); const rk = r.int(1, Math.min(m,n)); const k = n-rk;
  const giv = r.pick(['nul','rank','nulT']); const ask = r.pick(['rank','nul','nulT','row'].filter(x=>x!==giv));
  const val = { rank:rk, nul:k, nulT:m-rk, row:rk };
  const G_ = { nul:`dim Nul A = ${k}`, rank:`rank A = ${rk}`, nulT:`dim Nul Aᵀ = ${m-rk}` }[giv];
  const Q_ = { rank:'rank A', nul:'dim Nul A', nulT:'dim Nul Aᵀ', row:'dim Row A' }[ask];
  return { prompt:`<p>A is a ${m}×${n} matrix with ${G_}. Find ${Q_}.</p>`, kind:'num', answer: val[ask],
    hint:'rank A = dim Col A = dim Row A; rank + dim Nul A = #columns; for Aᵀ, rank + dim Nul Aᵀ = #rows.',
    solution:`<p>From ${G_}: rank A = ${rk} (rank + dim Nul A = n = ${n}; rank + dim Nul Aᵀ = m = ${m}). Hence dim Nul A = ${k}, dim Row A = ${rk}, dim Nul Aᵀ = ${m-rk}. ${Q_} = ${val[ask]}.</p>`, _d:{m,n,rk,ask} };
}),
mk('54-6-rank-matrix','54-6',2,r=>{
  const m = 4, n = r.int(5,6), rk = r.int(2,3); const {A} = randRank(r,m,n,rk,9);
  return { prompt:`<p>For A = </p>${mat(A)}<p>find rank A, dim Nul A, and dim Nul Aᵀ (enter the three numbers in that order).</p>`, kind:'list', answer:[rk, n-rk, m-rk],
    hint:'Row reduce to count pivots; then rank + dim Nul A = n and rank + dim Nul Aᵀ = m.', solution:`<p>RREF(A) = ${mat(rref(A).R)} has ${rk} pivots ⇒ rank A = ${rk}, dim Nul A = ${n} − ${rk} = ${n-rk}, dim Nul Aᵀ = ${m} − ${rk} = ${m-rk}.</p>`, _d:{A} };
}),
mk('54-6-change-basis','54-6',3,r=>{
  const C = randUnimod(r,2,5); const B = [rvec(r,2,-5,5), rvec(r,2,-5,5)]; need(det(B).n!==0);
  const P = fmul(inv(C), B); const cs = T_(C), bs = T_(B);
  return { prompt:`<p>Let B = {b₁, b₂}, C = {c₁, c₂} be bases of ℝ² with b₁ = ${tup(bs[0])}, b₂ = ${tup(bs[1])}, c₁ = ${tup(cs[0])}, c₂ = ${tup(cs[1])}. Find the change-of-coordinates matrix P<sub>C←B</sub>. Enter its entries row by row.</p>`, kind:'list', answer: ansL(P.flat()),
    hint:'Columns of P_{C←B} are [b₁]_C and [b₂]_C: row reduce [c₁ c₂ | b₁ b₂] to [I | P_{C←B}].',
    solution:`<p>[c₁ c₂ | b₁ b₂] = ${mat(C.map((row,i)=>row.concat(B[i])),2)} ~ [I | P] with P<sub>C←B</sub> = ${mat(P)}. (So P<sub>C←B</sub> = C⁻¹B; the trap is B⁻¹C, which is P<sub>B←C</sub>.)</p>`, _d:{B,C} };
}),
mk('54-6-convert-coords','54-6',3,r=>{
  const P = [rvec(r,2,-4,4), rvec(r,2,-4,4)]; const dP = det(P); need(!dP.isZero() && Math.abs(dP.n)<=3);
  const dir = r.bool(); // true: given [x]_B find [x]_C ; false: given [x]_C find [x]_B
  let given, out;
  if(dir){ given = rvec(r,2,-4,4); need(given.some(x=>x)); out = fmv(P, given); }
  else { const xb = rvec(r,2,-4,4); need(xb.some(x=>x)); given = imv(P,xb); out = xb.map(F.of); }
  const eq = k => lin([P[0][k],P[1][k]],['c₁','c₂']);
  return { prompt:`<p>In a vector space V, bases B = {b₁, b₂} and C = {c₁, c₂} satisfy b₁ = ${eq(0)} and b₂ = ${eq(1)}. ${dir?`If [x]_B = ${tup(given)}, find [x]_C.`:`If [x]_C = ${tup(given)}, find [x]_B.`}</p>`, kind:'list', answer: ansL(out),
    hint:'P_{C←B} has columns [b₁]_C, [b₂]_C (the coefficients above, written as COLUMNS). [x]_C = P_{C←B}[x]_B; going back uses its inverse.',
    solution:`<p>P<sub>C←B</sub> = ${mat(P)} (columns = coefficient vectors; writing them as rows is the classic trap). ${dir?`[x]_C = P<sub>C←B</sub>[x]_B = ${tup(out)}.`:`[x]_B = (P<sub>C←B</sub>)⁻¹[x]_C; solving ${mat(P)}y = ${tup(given)} gives ${tup(out)}.`}</p>`, _d:{P, given, dir} };
}),
mk('54-6-tf','54-6',4,r=>{
  const st = r.pick(['indep','dep','spanbasis','Rm','Pn','Mmn','plane','rankNul']);
  const n = r.int(2,6); let text, truth, why; const d = {st};
  if(st==='indep'){ const k = r.pick([n,n-1,n+1].filter(x=>x>=1)); d.k=k; d.n=n; text=`Any linearly independent set of ${k} vectors in ℝ${sup(n)} is a basis of ℝ${sup(n)}.`; truth = k===n; why = truth?'Basis Theorem: in an n-dimensional space, n independent vectors automatically span.':(k<n?`${k} vectors cannot span an ${n}-dimensional space.`:`${k} > ${n} vectors in ℝ${sup(n)} cannot be independent, so the hypothesis never holds — but if read as "such a set is a basis", it's vacuous; we follow Lay: the statement is false because such sets don't exist / don't span.`); if(k>n){ text=`Some set of ${k} vectors in ℝ${sup(n)} is linearly independent.`; truth=false; why=`Any set of more than ${n} vectors in ℝ${sup(n)} is linearly dependent.`; } }
  else if(st==='dep'){ const k = r.int(Math.max(1,n-2), n+2); d.k=k; d.n=n; text=`If dim V = ${n}, then every set of ${k} vectors in V is linearly dependent.`; truth = k>n; why = truth?`More than dim V = ${n} vectors are always dependent.`:`A basis of V contains ${n} independent vectors, and any ${k} ≤ ${n} of them are independent.`; }
  else if(st==='spanbasis'){ const k = r.pick([n,n+1,n+2]); d.k=k; d.n=n; text=`If dim V = ${n}, then any set of ${k} vectors that spans V is a basis of V.`; truth = k===n; why = truth?'Basis Theorem: n vectors spanning an n-dimensional space are a basis.':`${k} > ${n} vectors in V are dependent, so they cannot be a basis.`; }
  else if(st==='Rm'){ const m = r.int(1,n-1); d.m=m; d.n=n; text=`ℝ${sup(m)} is a subspace of ℝ${sup(n)}.`; truth=false; why=`ℝ${sup(m)} is not even a subset of ℝ${sup(n)} (its vectors have ${m} entries, not ${n}); it is only isomorphic to a subspace.`; }
  else if(st==='Pn'){ const k = r.pick([n,n+1]); d.k=k; d.n=n; text=`dim ℙ${sub(n)} = ${k}.`; truth = k===n+1; why=`The standard basis {1, t, …, t${sup(n)}} has ${n+1} elements.`; }
  else if(st==='Mmn'){ const m = r.int(2,4), q = r.int(2,4); const k = r.pick([m*q, m+q, m*q-1]); d.k=k; d.m=m; d.q=q; text=`The vector space of all ${m}×${q} matrices has dimension ${k}.`; truth = k===m*q; why=`The ${m*q} matrices with a single 1 form a basis.`; }
  else if(st==='plane'){ const a=rnz(r,-4,4), b=r.int(-4,4), c=r.int(-4,4); const k = r.int(1,3); d.k=k; text=`The subspace {(x,y,z) : ${lin([a,b,c],['x','y','z'])} = 0} of ℝ³ has dimension ${k}.`; truth = k===2; why='It is Nul of the 1×3 matrix ['+[a,b,c].map(fs).join(' ')+'], rank 1, so dim = 3 − 1 = 2.'; }
  else { const m = r.int(3,7), q = r.int(3,8), rk = r.int(1,Math.min(m,q)); const k = r.pick([q-rk, m-rk, rk]); d.m=m; d.q=q; d.rk=rk; d.k=k; text=`If A is ${m}×${q} with rank ${rk}, then dim Nul A = ${k}.`; truth = k===q-rk; why=`Rank theorem: dim Nul A = (#columns) − rank = ${q} − ${rk} = ${q-rk}.`; }
  return { prompt:`<p>True or false: ${text}</p>`, kind:'tf', answer: truth, hint:'Use dimension counting: Basis Theorem, "more than dim V vectors are dependent", "fewer can\'t span", rank + nullity = n.',
    solution:`<p>${truth?'TRUE':'FALSE'}. ${why}</p>`, _d:d };
}),
];

// ================================================================ 54-7  Lay 5.1–5.3
function diagMat(r, n, opts){ // A = P D P^{-1}, integer, P unimodular
  opts = opts||{};
  const P = randUnimod(r, n, opts.pmax||3);
  let D = opts.D || (()=>{ const vals = opts.vals || [-3,-2,-1,0,1,2,3,4]; return r.sample(vals, n); })();
  const J = eyeI(n).map((row,i)=>row.map((x,j)=>i===j?D[i]:0));
  if(opts.jordan){ J[0][1] = 1; }
  const Pi = inv(P).map(x=>x.map(y=>y.n));
  const A = imul(imul(P,J),Pi);
  need(maxAbs(A) <= (opts.amax||12));
  return {A, P, D, J, Pi};
}
function charPoly3(A){ // det(λI − A) = λ³ + a λ² + b λ + c
  const tr = A[0][0]+A[1][1]+A[2][2];
  const m2 = (A[0][0]*A[1][1]-A[0][1]*A[1][0]) + (A[0][0]*A[2][2]-A[0][2]*A[2][0]) + (A[1][1]*A[2][2]-A[1][2]*A[2][1]);
  const dt = det(A).n;
  return [-tr, m2, -dt];
}
G['54-7'] = [
mk('54-7-eigval-of-vec','54-7',0,r=>{
  const {A,P,D} = diagMat(r,3); const k = r.int(0,2); const s = rnz(r,-2,2); const v = P.map(row=>row[k]*s);
  return { prompt:`<p>Let A = ${mat(A)} and v = ${tup(v)}. Given that v is an eigenvector of A, find its eigenvalue.</p>`, kind:'num', answer: D[k],
    hint:'Compute Av and compare it to v entrywise: Av = λv.', solution:`<p>Av = ${tup(imv(A,v))} = ${fs(D[k])}·${tup(v)}, so λ = ${fs(D[k])}.</p>`, _d:{A,v} };
}),
mk('54-7-is-eigenvalue','54-7',0,r=>{
  const {A,D} = diagMat(r,3); const yes = r.bool(); let lam;
  if(yes) lam = r.pick(D); else { const diag = [A[0][0],A[1][1],A[2][2]].filter(x=>!D.includes(x)); const cands = diag.length? diag : [-4,-3,-2,-1,0,1,2,3,4,5].filter(x=>!D.includes(x)); lam = r.pick(cands); }
  const M = A.map((row,i)=>row.map((x,j)=>x-(i===j?lam:0))); const dM = det(M);
  return { prompt:`<p>Let A = ${mat(A)}. True or false: λ = ${fs(lam)} is an eigenvalue of A.</p>`, kind:'tf', answer: dM.isZero(),
    hint:'λ is an eigenvalue ⇔ (A − λI)x = 0 has a nontrivial solution ⇔ A − λI is singular. Diagonal entries of a non-triangular A are NOT eigenvalues in general.',
    solution:`<p>A − ${fsp(lam)}I = ${mat(M)}, det = ${fs(dM)}. ${dM.isZero()?'Singular ⇒ nontrivial null space ⇒ λ = '+fs(lam)+' IS an eigenvalue.':'Invertible ⇒ only the trivial solution ⇒ NOT an eigenvalue.'} (The eigenvalues are ${D.slice().sort((a,b)=>a-b).map(fs).join(', ')}.)</p>`, _d:{A,lam} };
}),
mk('54-7-charpoly','54-7',1,r=>{
  let A; if(r.bool()) A = diagMat(r,3).A; else { A = Array.from({length:3},()=>rvec(r,3,-3,3)); }
  need(A.flat().filter(x=>x===0).length<=3);
  const [a,b,c] = charPoly3(A);
  return { prompt:`<p>Find the characteristic polynomial of A = ${mat(A)} in the form det(λI − A) = λ³ + aλ² + bλ + c. Enter a, b, c.</p>`, kind:'list', answer:[a,b,c],
    hint:'Expand det(λI − A) by cofactors. Checks: a = −trace A, c = −det A, b = sum of the principal 2×2 minors.',
    solution:`<p>det(λI − A) = λ³ ${a<0?'−':'+'} ${Math.abs(a)}λ² ${b<0?'−':'+'} ${Math.abs(b)}λ ${c<0?'−':'+'} ${Math.abs(c)}. Checks: trace A = ${-a} ⇒ a = ${a}; sum of principal 2×2 minors = ${b}; det A = ${-c} ⇒ c = ${c}.</p>`, _d:{A} };
}),
mk('54-7-eig-triangular','54-7',1,r=>{
  const B = diagMat(r,2,{amax:8}); need(B.A[0][1]!==0 && B.A[1][0]!==0);
  const second = r.bool(); let Dm, ev2;
  if(second){ const B2 = diagMat(r,2,{amax:8}); Dm = B2.A; ev2 = B2.D; } else { const p=r.int(-3,4), q=r.int(-3,4); Dm = [[p, r.int(-4,4)],[0,q]]; ev2=[p,q]; }
  const X = [rvec(r,2,-4,4), rvec(r,2,-4,4)];
  const A = [B.A[0].concat(X[0]), B.A[1].concat(X[1]), [0,0].concat(Dm[0]), [0,0].concat(Dm[1])];
  const ev = B.D.concat(ev2);
  return { prompt:`<p>Find all eigenvalues of the block upper-triangular matrix</p>${mat(A)}<p>Enter them with multiplicity, comma-separated.</p>`, kind:'list', unordered:true, answer: ev,
    hint:'det(A − λI) = det(B − λI)·det(D − λI) for block-triangular [B X; 0 D]. The diagonal entries of a NON-triangular 2×2 block are not its eigenvalues.',
    solution:`<p>Top-left block ${mat(B.A)}: λ² − ${fsp(B.A[0][0]+B.A[1][1])}λ + ${fsp(B.A[0][0]*B.A[1][1]-B.A[0][1]*B.A[1][0])} = 0 ⇒ λ = ${B.D.map(fs).join(', ')}. Bottom-right block ${mat(Dm)} ⇒ λ = ${ev2.map(fs).join(', ')}. All eigenvalues: ${ev.map(fs).join(', ')}.</p>`, _d:{A} };
}),
mk('54-7-multiplicity','54-7',2,r=>{
  const jordan = r.bool(); const [l,m] = r.sample([-3,-2,-1,1,2,3,4],2);
  const {A} = diagMat(r,3,{D:[l,l,m], jordan, amax:14});
  const g = jordan?1:2;
  return { prompt:`<p>A = ${mat(A)} has characteristic polynomial (λ − ${fsp(l)})²(λ − ${fsp(m)}) (up to sign). What is the <b>geometric</b> multiplicity of λ = ${fs(l)} (the dimension of its eigenspace)?</p>`, kind:'num', answer:g,
    hint:'dim Nul(A − λI) = 3 − rank(A − λI). It can be smaller than the algebraic multiplicity (2).',
    solution:`<p>A − ${fsp(l)}I = ${mat(A.map((row,i)=>row.map((x,j)=>x-(i===j?l:0))))} has rank ${3-g}, so the eigenspace has dimension 3 − ${3-g} = ${g}. ${g===1?'Geometric (1) < algebraic (2) ⇒ A is NOT diagonalizable.':'Geometric = algebraic = 2 (and 1 for λ = '+fs(m)+') ⇒ A is diagonalizable.'}</p>`, _d:{A,l} };
}),
mk('54-7-eigenspace-basis','54-7',2,r=>{
  const [l,m] = r.sample([-3,-2,-1,1,2,3,4],2); const {A} = diagMat(r,3,{D:[l,l,m], amax:14});
  const M = A.map((row,i)=>row.map((x,j)=>x-(i===j?l:0))); const {free, vecs, R} = nullBasis(M); need(free.length===2);
  const k = r.int(0,1);
  return { prompt:`<p>λ = ${fs(l)} is an eigenvalue of A = ${mat(A)}. Find a basis for its eigenspace by the free-variable method (each basis vector has its own free variable = 1, the other = 0). Enter the vector for free variable <b>x${sub(free[k]+1)}</b>.</p>`, kind:'list', answer: ansL(vecs[k]),
    hint:'Row reduce A − λI and write the general solution of (A − λI)x = 0 in parametric vector form.',
    solution:`<p>A − ${fsp(l)}I ~ ${mat(R)}: one pivot, two free variables (geometric multiplicity 2). Eigenspace = Span{${vecs.map(tup).join(', ')}}.</p>`, _d:{A,l,free,fj:free[k]} };
}),
mk('54-7-diagonalizable','54-7',3,r=>{
  const kind = r.pick(['distinct','full','jordan','jordan','tri']); let A;
  if(kind==='distinct') A = diagMat(r,3,{amax:12}).A;
  else if(kind==='full'){ const [l,m] = r.sample([-3,-2,-1,1,2,3],2); A = diagMat(r,3,{D:[l,l,m],amax:14}).A; }
  else if(kind==='jordan'){ const [l,m] = r.sample([-3,-2,-1,1,2,3],2); A = diagMat(r,3,{D:[l,l,m],jordan:true,amax:14}).A; }
  else { const l = r.int(-3,3), m = r.int(-3,3); A = [[l, r.int(-3,3), r.int(-3,3)],[0, r.bool()?l:m, r.int(-3,3)],[0,0,m]]; }
  // decide exactly
  const ev = []; for(let x=-20;x<=20;x++){ const M=A.map((row,i)=>row.map((y,j)=>y-(i===j?x:0))); if(det(M).isZero()) ev.push([x, 3-rank(M)]); }
  const g = ev.reduce((s,e)=>s+e[1],0); const diag = g===3;
  return { prompt:`<p>True or false: A = ${mat(A)} is diagonalizable.</p>`, kind:'tf', answer: diag,
    hint:'Find the eigenvalues; for each, dim Nul(A − λI). Diagonalizable ⇔ the eigenspace dimensions add up to n.',
    solution:`<p>Eigenvalues and eigenspace dimensions: ${ev.map(e=>'λ = '+fs(e[0])+': dim '+e[1]).join('; ')}. Total = ${g} ${diag?'= 3 ⇒ diagonalizable (TRUE).':'< 3 ⇒ not enough independent eigenvectors ⇒ NOT diagonalizable (FALSE).'}</p>`, _d:{A} };
}),
mk('54-7-diagonalize-P','54-7',3,r=>{
  const {A,P,D} = diagMat(r,3); const k = r.int(0,2); const v = P.map(row=>row[k]); const nz = [0,1,2].filter(i=>v[i]!==0); const j = r.pick(nz);
  const w = v.map(x=>fr(x, v[j]));
  return { prompt:`<p>A = ${mat(A)} has eigenvalues ${D.slice().sort((a,b)=>a-b).map(fs).join(', ')}. To diagonalize A = PDP⁻¹, find the column of P belonging to λ = ${fs(D[k])}, scaled so that its entry ${j+1} equals 1.</p>`, kind:'list', answer: ansL(w),
    hint:'Solve (A − λI)x = 0; the eigenspace is a line, then rescale.', solution:`<p>Row reducing A − ${fsp(D[k])}I gives a 1-dimensional null space spanned by ${tup(v)}; scaling so entry ${j+1} is 1: ${tup(w)}. With P = [eigenvectors] and D = diag(eigenvalues in the same order), A = PDP⁻¹.</p>`, _d:{A, lam:D[k], j} };
}),
mk('54-7-power','54-7',4,r=>{
  const n = r.int(2,3); const {A,P,D,Pi} = diagMat(r,n,{vals:[-2,-1,0,1,2,3], pmax:3, amax:10}); const k = r.int(4,9);
  need(!(D.every(x=>Math.abs(x)<=1)));
  const Dk = D.map(x=>Math.pow(x,k)); const Ak = imul(imul(P, eyeI(n).map((row,i)=>row.map((x,j)=>i===j?Dk[i]:0))), Pi);
  need(maxAbs(Ak) < 1e12); const i = r.int(0,n-1), j = r.int(0,n-1);
  return { prompt:`<p>A = ${mat(A)} satisfies A = PDP⁻¹ with P = ${mat(P)}, D = ${mat(eyeI(n).map((row,a)=>row.map((x,b)=>a===b?D[a]:0)))}. Compute the (${i+1}, ${j+1}) entry of A${sup(k)}.</p>`, kind:'num', answer: Ak[i][j],
    hint:'Aᵏ = PDᵏP⁻¹, and Dᵏ just raises the diagonal entries to the k-th power.',
    solution:`<p>P⁻¹ = ${mat(Pi)}, D${sup(k)} = diag(${Dk.map(fs).join(', ')}). A${sup(k)} = PD${sup(k)}P⁻¹ = ${mat(Ak)}, so the (${i+1},${j+1}) entry is ${fs(Ak[i][j])}.</p>`, _d:{A,k,i,j} };
}),
mk('54-7-similar-tf','54-7',5,r=>{
  const kind = r.pick(['conj','conj','jordan','trace','charsame']);
  let A, B, truth, why;
  const [l,m] = r.sample([-2,-1,1,2,3],2);
  if(kind==='conj'){ A = [rvec(r,2,-3,3), rvec(r,2,-3,3)]; const Q = randUnimod(r,2,3); const Qi = inv(Q).map(x=>x.map(y=>y.n)); B = imul(imul(Q,A),Qi); truth=true; why=`B = QAQ⁻¹ with Q = ${mat(Q)}, so they are similar by definition.`; }
  else if(kind==='jordan'){ A = diagMat(r,2,{D:[l,l],jordan:true,amax:9}).A; B = [[l,0],[0,l]]; truth=false; why=`Both have eigenvalue ${fs(l)} twice (same characteristic polynomial), but B = ${fs(l)}I is only similar to itself (QBQ⁻¹ = B for every Q), and A ≠ B. Equal characteristic polynomials do not imply similarity.`; }
  else if(kind==='trace'){ A = diagMat(r,2,{D:[l,m],amax:9}).A; B = diagMat(r,2,{D:[l,m+1],amax:9}).A; need(m+1!==l); truth=false; why=`trace A = ${A[0][0]+A[1][1]} ≠ trace B = ${B[0][0]+B[1][1]}; similar matrices share trace (and determinant, eigenvalues).`; }
  else { A = diagMat(r,2,{D:[l,m],amax:9}).A; B = diagMat(r,2,{D:[m,l],amax:9}).A; truth=true; why=`Both have distinct eigenvalues ${fs(l)}, ${fs(m)}, so both are similar to diag(${fs(l)}, ${fs(m)}), hence to each other.`; }
  need(!(A[0][0]===B[0][0]&&A[0][1]===B[0][1]&&A[1][0]===B[1][0]&&A[1][1]===B[1][1]));
  return { prompt:`<p>True or false: A = ${mat(A)} and B = ${mat(B)} are similar.</p>`, kind:'tf', answer: truth,
    hint:'Similar ⇒ same characteristic polynomial (trace, det, eigenvalues). The converse fails; with distinct eigenvalues both are similar to the same diagonal matrix.',
    solution:`<p>${truth?'TRUE':'FALSE'}. ${why}</p>`, _d:{A,B} };
}),
];

// ================================================================ 54-8  Lay 5.4–5.5
// polynomial helpers (coefficient arrays, low degree first)
const pAdd = (a,b)=>{ const n=Math.max(a.length,b.length); return Array.from({length:n},(_,i)=>(a[i]||0)+(b[i]||0)); };
const pMul = (a,b)=>{ const o=Array(a.length+b.length-1).fill(0); a.forEach((x,i)=>b.forEach((y,j)=>{ o[i+j]+=x*y; })); return o; };
const pDer = a => a.slice(1).map((x,i)=>x*(i+1));
const pPad = (a,n)=>Array.from({length:n},(_,i)=>a[i]||0);
G['54-8'] = [
mk('54-8-deriv-matrix','54-8',0,r=>{
  const kind = r.pick(['dp','pcp','tap','tp','shift']); const a = rnz(r,-3,3), c = rnz(r,-3,3);
  let dom, cod, desc, f;
  if(kind==='dp'){ dom=3; cod=2; desc=`T: ℙ₃ → ℙ₂, T(p) = p′ ${c<0?'−':'+'} ${Math.abs(c)}p″`; f=p=>pAdd(pDer(p), pDer(pDer(p)).map(x=>x*c)); }
  else if(kind==='pcp'){ dom=2; cod=2; desc=`T: ℙ₂ → ℙ₂, T(p) = p′ ${c<0?'−':'+'} ${Math.abs(c)}p`; f=p=>pAdd(pDer(p), p.map(x=>x*c)); }
  else if(kind==='tap'){ dom=2; cod=2; desc=`T: ℙ₂ → ℙ₂, T(p) = (t ${a<0?'−':'+'} ${Math.abs(a)})p′(t)`; f=p=>pMul([a,1], pDer(p)); }
  else if(kind==='tp'){ dom=2; cod=3; desc=`T: ℙ₂ → ℙ₃, T(p) = (t ${a<0?'−':'+'} ${Math.abs(a)})p(t)`; f=p=>pMul([a,1], p); }
  else { dom=2; cod=2; desc=`T: ℙ₂ → ℙ₂, T(p) = p(t ${a<0?'−':'+'} ${Math.abs(a)})`; f=p=>{ let o=[0]; let pw=[1]; for(let i=0;i<p.length;i++){ o=pAdd(o, pw.map(x=>x*p[i])); pw=pMul(pw,[a,1]); } return o; }; }
  const cols = Array.from({length:dom+1},(_,j)=>pPad(f(eyeI(dom+1)[j]), cod+1));
  const M = T_(cols);
  return { prompt:`<p>Let ${desc}. Find the matrix of T relative to the standard bases {1, t, …} of the domain and codomain. Enter it row by row (${cod+1}×${dom+1}).</p>`, kind:'list', answer: M.flat(),
    hint:'Column j of the matrix is the coordinate vector of T(tʲ) in the codomain basis.',
    solution:`<p>${cols.map((cl,j)=>'T('+(j===0?'1':j===1?'t':'t'+sup(j))+') = '+poly(cl)+' → '+tup(cl)).join('; ')}. These are the columns: ${mat(M)}</p>`, _d:{kind,a,c,dom,cod} };
}),
mk('54-8-T-BC','54-8',0,r=>{
  const M = [rvec(r,3,-4,4), rvec(r,3,-4,4)]; need(M.flat().filter(x=>x).length>=4); const x = rvec(r,3,-3,3); need(x.filter(y=>y).length>=2);
  const y = imv(M,x); const T = j => lin([M[0][j],M[1][j]],['c₁','c₂']);
  return { prompt:`<p>Let B = {b₁, b₂, b₃} be a basis of V and C = {c₁, c₂} a basis of W. A linear T: V → W satisfies T(b₁) = ${T(0)}, T(b₂) = ${T(1)}, T(b₃) = ${T(2)}. For x = ${lin(x,['b₁','b₂','b₃'])}, find [T(x)]_C.</p>`, kind:'list', answer:y,
    hint:'The matrix of T relative to B and C has columns [T(bⱼ)]_C; then [T(x)]_C = M[x]_B.',
    solution:`<p>M = [[T(b₁)]_C [T(b₂)]_C [T(b₃)]_C] = ${mat(M)} (coefficients go in COLUMNS). [x]_B = ${tup(x)}, so [T(x)]_C = M[x]_B = ${tup(y)}.</p>`, _d:{M,x} };
}),
mk('54-8-B-matrix','54-8',1,r=>{
  const n = r.int(2,3); const P = randUnimod(r,n,3); const A = Array.from({length:n},()=>rvec(r,n,-3,3)); const Pi = inv(P);
  const Mb = fmul(fmul(Pi,A),P); need(maxAbs(Mb)<=20); const bs = T_(P);
  return { prompt:`<p>Let T(x) = Ax with A = ${mat(A)}, and let B = {${bs.map(tup).join(', ')}}. Find the B-matrix [T]_B. Enter it row by row.</p>`, kind:'list', answer: ansL(Mb.flat()),
    hint:'[T]_B = P⁻¹AP where P = [b₁ … bₙ]; equivalently column j is [A bⱼ]_B.',
    solution:`<p>P = ${mat(P)}, P⁻¹ = ${mat(Pi)}. [T]_B = P⁻¹AP = ${mat(Mb)}. (Check: AP = P[T]_B.)</p>`, _d:{A,P} };
}),
mk('54-8-B-to-standard','54-8',1,r=>{
  const eig = r.bool(); const P = randUnimod(r,2,3); const Pi = inv(P).map(x=>x.map(y=>y.n));
  const Mb = eig ? (()=>{ const [l,m] = r.sample([-3,-2,-1,1,2,3,4],2); return [[l,0],[0,m]]; })() : [rvec(r,2,-3,3), rvec(r,2,-3,3)];
  const A = imul(imul(P,Mb),Pi); need(maxAbs(A)<=25); const bs = T_(P);
  return { prompt:`<p>A linear map T: ℝ² → ℝ² has matrix [T]_B = ${mat(Mb)} relative to the basis B = {${bs.map(tup).join(', ')}}. Find the standard matrix A of T (row by row).</p>`, kind:'list', answer: A.flat(),
    hint:'[T]_B = P⁻¹AP, so A = P[T]_B P⁻¹ with P = [b₁ b₂].',
    solution:`<p>A = P[T]_B P⁻¹ with P = ${mat(P)}, P⁻¹ = ${mat(Pi)}: A = ${mat(A)}.${eig?' Since [T]_B is diagonal, b₁ and b₂ are eigenvectors of A — this is exactly a diagonalization A = PDP⁻¹.':''}</p>`, _d:{Mb,P} };
}),
mk('54-8-complex-eigvals','54-8',2,r=>{
  const a = r.int(-4,4), b = rnz(r,1,4); const P = randUnimod(r,2,3); const Pi = inv(P).map(x=>x.map(y=>y.n));
  const A = imul(imul(P,[[a,-b],[b,a]]),Pi); need(maxAbs(A)<=15 && A[0][1]!==0);
  const tr = 2*a, dt = a*a+b*b;
  return { prompt:`<p>Find the complex eigenvalues λ = a ± bi of A = ${mat(A)}. Enter a and b (with b > 0).</p>`, kind:'list', answer:[a,b],
    hint:'λ² − (trace)λ + det = 0, then the quadratic formula with a negative discriminant.',
    solution:`<p>trace = ${tr}, det = ${dt}: λ² ${tr<0?'+':'−'} ${Math.abs(tr)}λ + ${dt} = 0 ⇒ λ = (${tr} ± √(${tr*tr} − ${4*dt}))/2 = ${fs(a)} ± ${b===1?'':b}i.</p>`, _d:{A} };
}),
mk('54-8-complex-eigvec','54-8',3,r=>{
  const a = r.int(-4,4), b = rnz(r,1,4); const P = randUnimod(r,2,3); const Pi = inv(P).map(x=>x.map(y=>y.n));
  const A = imul(imul(P,[[a,-b],[b,a]]),Pi); need(maxAbs(A)<=15 && A[0][1]!==0);
  // eigenvalue λ = a − bi; eigenvector v = (x, 1): (A11 − λ)x + A12 = 0 → x = −A12/(A11 − a + bi)
  const p = A[0][0]-a, den = p*p+b*b; const re = fr(-A[0][1]*p, den), im = fr(A[0][1]*b, den);
  return { prompt:`<p>A = ${mat(A)} has eigenvalue λ = ${cxS(a,-b)}. Find the eigenvector of the form v = (x, 1), and enter Re x and Im x. (Then P = [Re v  Im v] gives A = PCP⁻¹ with C = ${mat([[a,-b],[b,a]])}.)</p>`, kind:'list', answer: ansL([re,im]),
    hint:'Use the first row of (A − λI)v = 0: (a₁₁ − λ)x + a₁₂·1 = 0, then rationalize the denominator.',
    solution:`<p>(${fs(A[0][0])} − (${cxS(a,-b)}))x + ${fsp(A[0][1])} = 0 ⇒ x = ${fs(-A[0][1])}/(${cxS(p,b)}) = ${fs(-A[0][1])}(${cxS(p,-b)})/${den} = ${fs(re)} + ${fsp(im)}i. So v = (${fs(re)} + ${fsp(im)}i, 1), P = [Re v Im v] = ${mat([[re,im],[1,0]])}.</p>`, _d:{A,a,b} };
}),
mk('54-8-rot-scale','54-8',3,r=>{
  const a = r.int(-4,4), b = rnz(r,1,4); const P = randUnimod(r,2,3); const Pi = inv(P).map(x=>x.map(y=>y.n));
  const A = imul(imul(P,[[a,-b],[b,a]]),Pi); need(maxAbs(A)<=15);
  const askR = r.bool(); const rr = Math.sqrt(a*a+b*b), phi = Math.atan2(b,a)*180/Math.PI;
  const rInt = Number.isInteger(rr);
  return { prompt:`<p>A = ${mat(A)} is similar to C = ${mat([['a','−b'],['b','a']])} where λ = a − bi (b > 0) is an eigenvalue of A. C = r·(rotation by φ). ${askR?`Find the scale factor r${rInt?'':' to 3 decimal places'}.`:'Find the rotation angle φ in degrees (0° < φ < 180°), to 3 decimal places.'}</p>`, kind:'num', answer: askR ? (rInt?rr:r6(rr)) : r6(phi),
    hint:'Find a and b from trace = 2a and det = a² + b². Then r = |λ| = √(a² + b²) = √det A, and φ is the argument of a + bi.',
    solution:`<p>trace A = ${2*a} ⇒ a = ${a}; det A = ${a*a+b*b} = a² + b² ⇒ b = ${b}. r = √${a*a+b*b} ${rInt?'= '+rr:'≈ '+rr.toFixed(4)}; φ = atan2(${b}, ${a}) ≈ ${phi.toFixed(4)}°.</p>`, _d:{A, askR} };
}),
mk('54-8-long-run','54-8',4,r=>{
  const s = r.pick([1,2,2,5]); const M = [rvec(r,2,-5,5), rvec(r,2,-5,5)]; const A = M.map(row=>row.map(x=>fr(x,s)));
  const tr = A[0][0].add(A[1][1]), dt = A[0][0].mul(A[1][1]).sub(A[0][1].mul(A[1][0]));
  const disc = tr.mul(tr).sub(dt.mul(4)); need(!dt.isZero());
  let cls;
  if(disc.sign()<0){ cls = dt.eq(1)?'circle': (dt.toNum()<1?'in':'out'); }
  else { const sq = Math.sqrt(disc.toNum()); const l1 = Math.abs((tr.toNum()+sq)/2), l2 = Math.abs((tr.toNum()-sq)/2); const mx = Math.max(l1,l2); need(Math.abs(mx-1)>1e-6 && Math.abs(Math.min(l1,l2)-1)>1e-6); cls = mx<1?'decay':'grow'; need(r.int(0,2)===0); }
  const L = { in:'Spirals inward toward 0', out:'Spirals outward (grows without bound)', circle:'Rotates around a closed ellipse (neither grows nor shrinks)', decay:'Tends to 0 without rotating (real eigenvalues)', grow:'Grows without rotating (real eigenvalues, no spiral)' };
  const o = mc(r, L[cls], Object.values(L).filter(x=>x!==L[cls]));
  return { prompt:`<p>Let A = ${mat(A)} and x<sub>k+1</sub> = Ax<sub>k</sub> with a generic nonzero x₀. Describe the long-run behaviour of the points x<sub>k</sub>.</p>`, kind:'mc', ...o,
    hint:'Complex eigenvalues ⇒ rotation; |λ|² = det A decides in/out. Real eigenvalues ⇒ no rotation; compare |λ| with 1.',
    solution:`<p>trace = ${fs(tr)}, det = ${fs(dt)}, discriminant trace² − 4det = ${fs(disc)} ${disc.sign()<0?'< 0 ⇒ complex eigenvalues with |λ|² = det A = '+fs(dt)+' ('+(cls==='circle'?'= 1':cls==='in'?'< 1':'> 1')+')':'≥ 0 ⇒ real eigenvalues, largest |λ| '+(cls==='decay'?'< 1':'> 1')}. Hence: ${L[cls]}.</p>`, _d:{A, cls, label:L[cls]} };
}),
];

// ================================================================ 54-9  Lay 6.1–6.3
function pythVec(r){ const q = rpick(r, pythQuads()); return { v: signPerm3(r, q.slice(0,3)), n: q[3] }; }
function orthonormal3(r){ // integer matrix M (3x3) with orthogonal rows of norm 3 (so M/3 is orthogonal)
  const base = [[1,2,2],[2,1,-2],[2,-2,1]];
  const perm = r.shuffle([0,1,2]); const sg = [0,1,2].map(()=>r.bool()?1:-1); const rs = [0,1,2].map(()=>r.bool()?1:-1);
  return r.shuffle(base).map((row,i)=>perm.map((p,j)=>row[p]*sg[j]*rs[i]));
}
function intOrtho4(r){ // three mutually orthogonal integer vectors in R^4, small entries
  for(let t=0;t<400;t++){
    const v1 = rvec(r,4,-2,2); if(v1.filter(x=>x).length<2) continue;
    const v2 = rvec(r,4,-2,2); if(doti(v1,v2)!==0 || v2.filter(x=>x).length<2 || rank([v1,v2])<2) continue;
    const {vecs} = nullBasis([v1,v2]); // 2-dim
    let v3 = vecs[0].map(x=>x); const L = v3.reduce((l,x)=>l*x.d/gcd(l,x.d),1); v3 = v3.map(x=>x.mul(L).n);
    const g = v3.reduce((a,x)=>gcd(a,x),0); v3 = v3.map(x=>x/g);
    if(maxAbs([v3])>4 || v3.filter(x=>x).length<2) continue;
    return [v1,v2,v3];
  }
  throw RETRY;
}
const normSq = v => v.reduce((s,x)=>s.add(F.of(x).mul(F.of(x))),F0);
function projF(y, basis){ let p = y.map(()=>F0); for(const u of basis){ const c = dotF(y,u).div(normSq(u)); p = p.map((x,i)=>x.add(c.mul(u[i]))); } return p; }
function sqrtF(x){ x=F.of(x); const a=Math.round(Math.sqrt(x.n)), b=Math.round(Math.sqrt(x.d)); return (a*a===x.n && b*b===x.d) ? fr(a,b) : null; }
G['54-9'] = [
mk('54-9-cos-angle','54-9',0,r=>{
  const a = pythVec(r), b = pythVec(r); const s1 = a.n<=9 ? rnz(r,1,2) : 1; const u = a.v.map(x=>x*s1); const v = b.v; const nu = a.n*s1, nv = b.n;
  const dp = doti(u,v); need(dp!==0); const c = fr(dp, nu*nv);
  return { prompt:`<p>Let u = ${tup(u)} and v = ${tup(v)}. Find cos θ, where θ is the angle between u and v (exact fraction).</p>`, kind:'num', answer: ans(c),
    hint:'cos θ = (u·v)/(‖u‖‖v‖). These vectors happen to have integer lengths.',
    solution:`<p>u·v = ${dp}; ‖u‖ = √${nu*nu} = ${nu}; ‖v‖ = √${nv*nv} = ${nv}. cos θ = ${dp}/(${nu}·${nv}) = ${fs(c)}${c.sign()<0?' (obtuse angle)':''}.</p>`, _d:{u,v} };
}),
mk('54-9-dist-unit','54-9',0,r=>{
  const w = pythVec(r); const s = w.n<=9 ? rnz(r,1,2) : 1; const wv = w.v.map(x=>x*s), N = w.n*s; const v = rvec(r,3,-5,5); const u = v.map((x,i)=>x+wv[i]);
  const ask = r.bool() ? 'dist' : 'unit'; const k = r.int(0,2);
  const val = ask==='dist' ? F.of(N) : fr(wv[k], N);
  return { prompt:`<p>Let u = ${tup(u)} and v = ${tup(v)}. ${ask==='dist'?'Find dist(u, v).':`Let w be the unit vector in the direction of u − v. Find entry ${k+1} of w.`}</p>`, kind:'num', answer: ans(val),
    hint:'dist(u,v) = ‖u − v‖; the unit vector is (u − v)/‖u − v‖.',
    solution:`<p>u − v = ${tup(wv)}, ‖u − v‖ = √${N*N} = ${N}. ${ask==='dist'?`dist(u,v) = ${N}.`:`w = ${tup(wv.map(x=>fr(x,N)))}, entry ${k+1} = ${fs(val)}.`}</p>`, _d:{u,v,ask,k} };
}),
mk('54-9-complement','54-9',1,r=>{
  const {A} = randRank(r,2,4,2,6); const {free, vecs, R} = nullBasis(A); const k = r.int(0,1);
  return { prompt:`<p>Let W = Span{w₁, w₂} with w₁ = ${tup(A[0])}, w₂ = ${tup(A[1])} in ℝ⁴. Find a basis for W⊥ using the free-variable method on the matrix with ROWS w₁, w₂. Enter the basis vector belonging to free variable <b>x${sub(free[k]+1)}</b>.</p>`, kind:'list', answer: ansL(vecs[k]),
    hint:'x ∈ W⊥ ⇔ w₁·x = 0 and w₂·x = 0 ⇔ x ∈ Nul [w₁ᵀ; w₂ᵀ]. (Row A)⊥ = Nul A.',
    solution:`<p>W⊥ = Nul ${mat(A)}. RREF ${mat(R)}; free variables ${free.map(f=>'x'+sub(f+1)).join(', ')}; basis {${vecs.map(tup).join(', ')}} (dim W⊥ = 4 − 2 = 2). Check: each is orthogonal to w₁ and w₂.</p>`, _d:{A, free, fj:free[k]} };
}),
mk('54-9-colperp','54-9',1,r=>{
  const {A} = randRank(r,3,3,2,8); const nT = nullBasis(T_(A)).vecs[0], nA = nullBasis(A).vecs[0];
  const intv = v=>{ const L = v.reduce((l,x)=>l*x.d/gcd(l,x.d),1); return v.map(x=>x.mul(L).n); };
  const zT = intv(nT), zA = intv(nA); need(maxAbs([zT,zA])<=12);
  const inT = v => imv(T_(A),v).every(x=>x===0);
  need(!inT(zA)); const k = rnz(r,-2,2); const z2 = zT.map(x=>x*k);
  const c1 = T_(A)[r.int(0,2)]; need(c1.some(x=>x) && !inT(c1)); const rv = rvec(r,3,-4,4); need(!inT(rv));
  const vs = r.shuffle([zT, z2, zA, c1, rv]); const S = vs.map(tup); need(new Set(S).size===5);
  return { prompt:`<p>Let A = ${mat(A)}. Select <b>all</b> vectors that lie in (Col A)⊥.</p>`, kind:'multi', choices:S, answer: vs.map((v,i)=>inT(v)?i:-1).filter(i=>i>=0),
    hint:'(Col A)⊥ = Nul Aᵀ: test whether Aᵀv = 0 (i.e. v is orthogonal to every COLUMN of A). Nul A is a different subspace.',
    solution:`<p>(Col A)⊥ = Nul Aᵀ = Span{${tup(zT)}}. Vectors passing Aᵀv = 0: ${vs.filter(inT).map(tup).join(', ')}. Trap: ${tup(zA)} spans Nul A = (Row A)⊥, not (Col A)⊥; a column of A is in Col A itself.</p>`, _d:{A, vs} };
}),
mk('54-9-orth-coords','54-9',2,r=>{
  const U = orthoBasis3(r,5); const y = rvec(r,3,-6,6); need(y.filter(x=>x).length>=2);
  const c = U.map(u=>fr(doti(y,u), doti(u,u)));
  return { prompt:`<p>{u₁, u₂, u₃} with u₁ = ${tup(U[0])}, u₂ = ${tup(U[1])}, u₃ = ${tup(U[2])} is an orthogonal basis of ℝ³. Find the coordinates of y = ${tup(y)}: y = c₁u₁ + c₂u₂ + c₃u₃. Enter c₁, c₂, c₃.</p>`, kind:'list', answer: ansL(c),
    hint:'For an orthogonal basis cⱼ = (y·uⱼ)/(uⱼ·uⱼ) — no row reduction needed. (First check the uⱼ really are orthogonal.)',
    solution:`<p>${U.map((u,i)=>'c'+sub(i+1)+' = '+doti(y,u)+'/'+doti(u,u)+' = '+fs(c[i])).join('; ')}.</p>`, _d:{U,y} };
}),
mk('54-9-orth-set-tf','54-9',2,r=>{
  const claim = r.pick(['orthogonal','orthonormal']); let V, truth, why;
  if(claim==='orthogonal'){ const U = orthoBasis3(r,5); const pert = r.bool(); V = U.map(v=>v.map(F.of)); if(pert){ const i=r.int(0,2), j=r.int(0,2); V[i][j]=V[i][j].add(rnz(r,-1,1)); }
    const bad = []; for(let a=0;a<3;a++) for(let b=a+1;b<3;b++) if(!dotF(V[a],V[b]).isZero()) bad.push([a,b]);
    truth = bad.length===0; why = truth?'all three pairwise dot products are 0.':`u${sub(bad[0][0]+1)}·u${sub(bad[0][1]+1)} = ${fs(dotF(V[bad[0][0]],V[bad[0][1]]))} ≠ 0.`; }
  else { const M = orthonormal3(r); const k = r.int(2,3); const W = M.slice(0,k); const unscale = r.bool(); const ui = r.int(0,k-1);
    V = W.map((v,i)=>v.map(x=>(unscale&&i===ui)?F.of(x):fr(x,3))); truth = !unscale; why = truth?'pairwise dot products are 0 and each vector has length 1 (entries² sum to 9/9).':`the set is orthogonal, but u${sub(ui+1)} has length 3, not 1.`; }
  const vf = V.map(v=>v.map(x=>x.toNum()));
  return { prompt:`<p>True or false: the set {${V.map(tup).join(', ')}} is ${claim}.</p>`, kind:'tf', answer: truth,
    hint:'Orthogonal: every pair has dot product 0. Orthonormal: additionally every vector has length 1.', solution:`<p>${truth?'TRUE':'FALSE'}: ${why}</p>`, _d:{V:vf, claim} };
}),
mk('54-9-proj-line','54-9',3,r=>{
  const n = r.int(2,3); const u = rvec(r,n,-4,4), y = rvec(r,n,-6,6); need(u.filter(x=>x).length>=2 && rank([u,y])===2);
  const c = fr(doti(y,u), doti(u,u)); need(!c.isZero()); const p = u.map(x=>c.mul(x));
  return { prompt:`<p>Find the orthogonal projection of y = ${tup(y)} onto the line L = Span{u}, u = ${tup(u)}.</p>`, kind:'list', answer: ansL(p),
    hint:'ŷ = (y·u)/(u·u) · u.', solution:`<p>y·u = ${doti(y,u)}, u·u = ${doti(u,u)}; ŷ = ${fs(c)}·${tup(u)} = ${tup(p)}. Check: y − ŷ = ${tup(y.map((x,i)=>F.of(x).sub(p[i])))} is orthogonal to u.</p>`, _d:{y,u} };
}),
mk('54-9-proj-subspace','54-9',3,r=>{
  const n = r.int(3,4); let u1, u2;
  if(n===3){ const U = orthoBasis3(r,5); [u1,u2] = [U[0],U[1]]; } else { const V = intOrtho4(r); [u1,u2] = [V[0],V[1]]; }
  const y = rvec(r,n,-6,6); const trap = r.bool(); const k = rnz(r,-2,2);
  const b2 = trap ? u2.map((x,i)=>x+k*u1[i]) : u2;
  const p = projF(y,[u1,u2]);
  return { prompt:`<p>Let W = Span{${tup(u1)}, ${tup(b2)}} and y = ${tup(y)}. Find the orthogonal projection ŷ = proj<sub>W</sub> y.</p>`, kind:'list', answer: ansL(p),
    hint:'The projection formula Σ (y·uᵢ)/(uᵢ·uᵢ) uᵢ needs an ORTHOGONAL basis. Check first; if not orthogonal, Gram–Schmidt (or solve the normal equations).',
    solution:`<p>${trap?`The given spanning vectors are NOT orthogonal (dot product ${doti(u1,b2)}). Replace the second by its component orthogonal to the first: ${tup(b2)} − (${doti(b2,u1)}/${doti(u1,u1)})${tup(u1)} = ${tup(u2)}. `:'The two vectors are orthogonal. '}ŷ = (${doti(y,u1)}/${doti(u1,u1)})${tup(u1)} + (${doti(y,u2)}/${doti(u2,u2)})${tup(u2)} = ${tup(p)}.</p>`, _d:{y, basis:[u1,b2]} };
}),
mk('54-9-distance','54-9',4,r=>{
  const U = orthoBasis3(r,5); const y = rvec(r,3,-6,6); const p = projF(y,[U[0],U[1]]); const z = y.map((x,i)=>F.of(x).sub(p[i])); const d2 = normSq(z); need(!d2.isZero());
  const s = sqrtF(d2); const dval = s ? ans(s) : r6(Math.sqrt(d2.toNum()));
  return { prompt:`<p>Find the distance from y = ${tup(y)} to the plane W = Span{${tup(U[0])}, ${tup(U[1])}}${s?'':' (to 3 decimal places)'}.</p>`, kind:'num', answer: dval,
    hint:'Distance = ‖y − ŷ‖ where ŷ = proj_W y (the spanning vectors are orthogonal). Alternatively project y onto the normal direction.',
    solution:`<p>ŷ = ${tup(p)}, z = y − ŷ = ${tup(z)}, ‖z‖² = ${fs(d2)}, distance = ${s?fs(s):'√('+fs(d2)+') ≈ '+Math.sqrt(d2.toNum()).toFixed(4)}.</p>`, _d:{y, W:[U[0],U[1]]} };
}),
mk('54-9-decomp','54-9',4,r=>{
  const n = r.int(3,4); let W; if(n===3){ const U = orthoBasis3(r,5); W = [U[0],U[1]]; } else { const V = intOrtho4(r); W = r.bool()?[V[0],V[1]]:[V[0],V[1],V[2]]; }
  const y = rvec(r,n,-6,6); const p = projF(y,W); const z = y.map((x,i)=>F.of(x).sub(p[i])); need(z.some(x=>!x.isZero()));
  return { prompt:`<p>Let W = Span{${W.map(tup).join(', ')}} (an orthogonal set) and y = ${tup(y)}. Write y = ŷ + z with ŷ ∈ W and z ∈ W⊥. Enter z.</p>`, kind:'list', answer: ansL(z),
    hint:'ŷ = proj_W y using the orthogonal basis, then z = y − ŷ. Check z·wᵢ = 0.',
    solution:`<p>ŷ = ${W.map(u=>'('+doti(y,u)+'/'+doti(u,u)+')'+tup(u)).join(' + ')} = ${tup(p)}; z = y − ŷ = ${tup(z)}. Check: ${W.map((u,i)=>'z·w'+sub(i+1)+' = 0').join(', ')}.</p>`, _d:{y,W} };
}),
mk('54-9-orthonormal-cols','54-9',5,r=>{
  const M = orthonormal3(r); const U = T_(M.slice(0,2)).map(row=>row.map(x=>fr(x,3))); // 3x2
  const ask = r.bool()?'norm':'dot';
  let x, y, val;
  if(ask==='norm'){ const pt = r.pick([[3,4],[6,8],[5,12],[8,6],[4,3],[1,0],[12,5]]); x = [pt[0]*(r.bool()?1:-1), pt[1]*(r.bool()?1:-1)]; val = Math.hypot(x[0],x[1]); }
  else { x = rvec(r,2,-5,5); y = rvec(r,2,-5,5); val = doti(x,y); }
  const Ux = fmv(U,x);
  return { prompt:`<p>U = ${mat(U)} has orthonormal columns. ${ask==='norm'?`For x = ${tup(x)}, find ‖Ux‖.`:`For x = ${tup(x)} and y = ${tup(y)}, find (Ux)·(Uy).`}</p>`, kind:'num', answer: val,
    hint:'UᵀU = I implies ‖Ux‖ = ‖x‖ and (Ux)·(Uy) = x·y — no need to multiply out.',
    solution:`<p>Since UᵀU = I: ${ask==='norm'?`‖Ux‖ = ‖x‖ = √(${x[0]*x[0]} + ${x[1]*x[1]}) = ${val}. (Directly: Ux = ${tup(Ux)}.)`:`(Ux)·(Uy) = xᵀUᵀUy = x·y = ${val}.`}</p>`, _d:{U:U.map(rw=>rw.map(v=>v.toNum())), x, y, ask} };
}),
mk('54-9-tf','54-9',5,r=>{
  const M = orthonormal3(r); const st = r.pick(['UtU','UUt','UUt','rows','rows','inv']); const k = st==='inv' ? 3 : (st==='UUt'||st==='rows') ? r.pick([2,2,3]) : r.pick([2,3]);
  const U = T_(M.slice(0,k)).map(row=>row.map(x=>fr(x,3)));
  const S = { UtU:'UᵀU = I', UUt:'UUᵀ = I', rows:'the rows of U are orthonormal', inv:'U⁻¹ = Uᵀ' };
  const truth = st==='UtU' ? true : k===3;
  const why = { UtU:'orthonormal columns ⇔ UᵀU = I (entries are dot products of columns).', UUt: k===3?'U is square with orthonormal columns (an orthogonal matrix), so Uᵀ = U⁻¹ and UUᵀ = I too.':'U is 3×2: UUᵀ is the 3×3 projection onto Col U, which has rank 2, so it is not I.',
    rows: k===3?'a square matrix with orthonormal columns also has orthonormal rows.':'U is 3×2; three vectors in ℝ² cannot be orthonormal.', inv:'U is square with orthonormal columns, so UᵀU = I gives U⁻¹ = Uᵀ.' }[st];
  return { prompt:`<p>Let U = ${mat(U)}. True or false: ${S[st]}.</p>`, kind:'tf', answer: truth, hint:'Columns orthonormal ⇔ UᵀU = I. UUᵀ = I (and orthonormal rows) needs U to be square.',
    solution:`<p>${truth?'TRUE':'FALSE'}: ${why}</p>`, _d:{U:U.map(rw=>rw.map(v=>v.toNum())), st} };
}),
];

// ================================================================ 54-10  Lay 6.4–6.5, 6.7
// polynomial with Fraction coefficients; inner product via moments m[k] = <1, t^k>
function ipMoments(spec){ const m=[]; for(let k=0;k<=6;k++){ if(spec.pts) m.push(spec.pts.reduce((s,t)=>s.add(F.of(Math.pow(t,k))),F0)); else m.push(fr(Math.pow(spec.b,k+1)-Math.pow(spec.a,k+1), k+1)); } return m; }
function ipPoly(p,q,m){ let s=F0; p.forEach((a,i)=>q.forEach((b,j)=>{ s = s.add(F.of(a).mul(F.of(b)).mul(m[i+j])); })); return s; }
function ipDesc(spec){ return spec.pts ? `⟨p, q⟩ = ${spec.pts.map(t=>'p('+fs(t)+')q('+fs(t)+')').join(' + ')}` : `⟨p, q⟩ = ∫${spec.a<0?'₋'+sub(-spec.a):sub(spec.a)}${sup(spec.b)} p(t)q(t) dt`; }
G['54-10'] = [
mk('54-10-gs-Rn','54-10',0,r=>{
  const [v1,v2,v3] = intOrtho4(r); const a = rnz(r,-2,2), b = rnz(r,-2,2), c = r.int(-2,2);
  const x1 = v1, x2 = v2.map((x,i)=>x+a*v1[i]), x3 = v3.map((x,i)=>x+b*v1[i]+c*v2[i]);
  const which = r.bool()?3:2; const out = which===3?v3:v2;
  return { prompt:`<p>Apply Gram–Schmidt to x₁ = ${tup(x1)}, x₂ = ${tup(x2)}, x₃ = ${tup(x3)} (v₁ = x₁, no normalizing). Enter v${sub(which)}.</p>`, kind:'list', answer: out,
    hint:'v₂ = x₂ − (x₂·v₁)/(v₁·v₁) v₁;  v₃ = x₃ − (x₃·v₁)/(v₁·v₁) v₁ − (x₃·v₂)/(v₂·v₂) v₂ (project onto the v\'s, not the x\'s).',
    solution:`<p>v₁ = ${tup(v1)}. v₂ = x₂ − (${doti(x2,v1)}/${doti(v1,v1)})v₁ = ${tup(v2)}. v₃ = x₃ − (${doti(x3,v1)}/${doti(v1,v1)})v₁ − (${doti(x3,v2)}/${doti(v2,v2)})v₂ = ${tup(v3)}. Check: v's pairwise orthogonal.</p>`, _d:{X:[x1,x2,x3], which} };
}),
mk('54-10-gs-poly','54-10',0,r=>{
  const spec = r.bool() ? { pts: r.sample([-3,-2,-1,0,1,2,3],r.int(3,4)).sort((a,b)=>a-b) } : (()=>{ const c = r.int(1,3); return r.bool()?{a:-c,b:c}:{a:0,b:c}; })();
  const m = ipMoments(spec);
  const p0 = [F1], t = [F0,F1], t2 = [F0,F0,F1];
  const c10 = ipPoly(t,p0,m).div(ipPoly(p0,p0,m)); const p1 = [c10.neg(), F1];
  const c20 = ipPoly(t2,p0,m).div(ipPoly(p0,p0,m)), c21 = ipPoly(t2,p1,m).div(ipPoly(p1,p1,m));
  const p2 = [c20.neg().sub(c21.mul(p1[0])), c21.neg(), F1];
  const which = r.int(0,3)===0 ? 1 : 2; const out = which===1?p1:p2;
  return { prompt:`<p>On ℙ₂ use the inner product ${ipDesc(spec)}. Apply Gram–Schmidt to 1, t, t² (no normalizing) to get p₀ = 1, p₁, p₂. Enter the coefficients of p${sub(which)} (constant term first; it is monic).</p>`, kind:'list', answer: ansL(out),
    hint:'p₁ = t − ⟨t,1⟩/⟨1,1⟩·1;  p₂ = t² − ⟨t²,1⟩/⟨1,1⟩·1 − ⟨t²,p₁⟩/⟨p₁,p₁⟩·p₁.',
    solution:`<p>⟨1,1⟩ = ${fs(m[0])}, ⟨t,1⟩ = ${fs(m[1])} ⇒ p₁ = ${poly(p1)}. ⟨t²,1⟩ = ${fs(m[2])}, ⟨t²,p₁⟩ = ${fs(ipPoly(t2,p1,m))}, ⟨p₁,p₁⟩ = ${fs(ipPoly(p1,p1,m))} ⇒ p₂ = ${poly(p2)}.</p>`, _d:{spec, which} };
}),
mk('54-10-qr','54-10',1,r=>{
  const useH = r.bool(); let Qi, s, m, n;
  if(useH){ const H = [[1,1,1,1],[1,-1,1,-1],[1,1,-1,-1],[1,-1,-1,1]]; const cols = r.sample([0,1,2,3], n = r.int(2,3)); const rs = r.shuffle([0,1,2,3]); Qi = rs.map(i=>cols.map(j=>H[i][j])); s = 2; m = 4; }
  else { const M = orthonormal3(r); n = 2; Qi = T_(M.slice(0,2)); s = 3; m = 3; }
  const Rp = Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=> j<i?0 : j===i ? r.int(1,3) : r.int(-2,2)));
  const R = Rp.map(row=>row.map(x=>x*s)); const A = imul(Qi, Rp); // A = (Qi/s)(s Rp)
  const Q = Qi.map(row=>row.map(x=>fr(x,s)));
  return { prompt:`<p>A = ${mat(A)} has QR factorization A = QR with Q = ${mat(Q)} (orthonormal columns). Find R. Enter it row by row (${n}×${n}, including the zeros).</p>`, kind:'list', answer: R.flat(),
    hint:'Since QᵀQ = I, R = QᵀA. R is upper triangular with positive diagonal.',
    solution:`<p>R = QᵀA = ${mat(R)}. (Its diagonal entries are the lengths of the Gram–Schmidt vectors.)</p>`, _d:{A} };
}),
mk('54-10-lsq-normal','54-10',2,r=>{
  const m = r.int(3,4); const A = Array.from({length:m},()=>rvec(r,2,-3,3)); need(rank(A)===2); const b = rvec(r,m,-5,5);
  const AtA = imul(T_(A),A), Atb = imv(T_(A),b); const x = fmv(inv(AtA), Atb);
  need(rank(A.map((row,i)=>row.concat([b[i]])))===3); need(x.every(v=>v.d<=60));
  return { prompt:`<p>Find the least-squares solution x̂ of Ax = b, where A = ${mat(A)}, b = ${col(b)}.</p>`, kind:'list', answer: ansL(x),
    hint:'Solve the normal equations AᵀA x̂ = Aᵀb.',
    solution:`<p>AᵀA = ${mat(AtA)}, Aᵀb = ${tup(Atb)}. Solving: x̂ = ${tup(x)}.</p>`, _d:{A,b} };
}),
mk('54-10-lsq-error','54-10',2,r=>{
  const m = r.int(3,4); const A = Array.from({length:m},()=>rvec(r,2,-3,3)); need(rank(A)===2); const b = rvec(r,m,-5,5);
  const AtA = imul(T_(A),A), Atb = imv(T_(A),b); const x = fmv(inv(AtA), Atb); need(x.every(v=>v.d<=60));
  const res = b.map((bi,i)=>F.of(bi).sub(dotF(A[i],x))); const e2 = normSq(res); need(!e2.isZero());
  const s = sqrtF(e2);
  return { prompt:`<p>Find the least-squares error ‖b − Ax̂‖ for A = ${mat(A)}, b = ${col(b)}${s?'':' (to 3 decimal places)'}.</p>`, kind:'num', answer: s?ans(s):r6(Math.sqrt(e2.toNum())),
    hint:'First find x̂ from AᵀAx̂ = Aᵀb, then compute the residual b − Ax̂ and its length.',
    solution:`<p>AᵀA = ${mat(AtA)}, Aᵀb = ${tup(Atb)} ⇒ x̂ = ${tup(x)}. Ax̂ = ${tup(A.map(row=>dotF(row,x)))}, residual = ${tup(res)}, ‖residual‖² = ${fs(e2)} ⇒ error = ${s?fs(s):'≈ '+Math.sqrt(e2.toNum()).toFixed(4)}.</p>`, _d:{A,b} };
}),
mk('54-10-lsq-qr','54-10',2,r=>{
  const M = orthonormal3(r); const Qi = T_(M.slice(0,2)); const Q = Qi.map(row=>row.map(x=>fr(x,3)));
  const R = [[r.int(1,4), r.int(-3,3)],[0, r.int(1,4)]]; const b = rvec(r,3,-6,6);
  const Qtb = fmv(T_(Q), b); const x = fmv(inv(R), Qtb);
  return { prompt:`<p>A = QR with Q = ${mat(Q)} and R = ${mat(R)}. Use the QR factorization to find the least-squares solution of Ax = b, b = ${tup(b)}.</p>`, kind:'list', answer: ansL(x),
    hint:'x̂ solves Rx̂ = Qᵀb (back-substitution); no need to form A or AᵀA.',
    solution:`<p>Qᵀb = ${tup(Qtb)}. Back-substitute R x̂ = Qᵀb: x₂ = ${fs(Qtb[1])}/${R[1][1]} = ${fs(x[1])}, x₁ = (${fs(Qtb[0])} − ${fsp(R[0][1])}·${fsp(x[1])})/${R[0][0]} = ${fs(x[0])}.</p>`, _d:{Q:Q.map(rw=>rw.map(v=>v.toNum())), R, b} };
}),
mk('54-10-best-fit','54-10',3,r=>{
  const quad = r.int(0,2)===0; let xsv, X;
  if(quad){ xsv = r.pick([[-2,-1,0,1,2],[-1,0,1,2],[-2,-1,1,2]]); X = xsv.map(x=>[1,x,x*x]); }
  else { const n = r.int(4,5); xsv = r.sample([-3,-2,-1,0,1,2,3,4],n).sort((a,b)=>a-b); X = xsv.map(x=>[1,x]); }
  const ys = xsv.map(()=>r.int(-5,6));
  const XtX = imul(T_(X),X), Xty = imv(T_(X),ys); const beta = fmv(inv(XtX), Xty); need(beta.every(v=>v.d<=200));
  if(!quad) need(!beta[1].isZero());
  return { prompt:`<p>Find the least-squares ${quad?'parabola y = β₀ + β₁x + β₂x²':'line y = β₀ + β₁x'} for the data points ${xsv.map((x,i)=>'('+fs(x)+', '+fs(ys[i])+')').join(', ')}. Enter ${quad?'β₀, β₁, β₂':'β₀, β₁'}.</p>`, kind:'list', answer: ansL(beta),
    hint:`Design matrix X with rows [1 x${quad?' x²':''}], observation vector y; solve XᵀXβ = Xᵀy.`,
    solution:`<p>X = ${mat(X)}, y = ${tup(ys)}. XᵀX = ${mat(XtX)}, Xᵀy = ${tup(Xty)}. Solving gives β = ${tup(beta)}.</p>`, _d:{X, ys} };
}),
mk('54-10-unique','54-10',4,r=>{
  const m = r.int(3,5), n = r.int(2,3); need(m>n); const rk = r.bool()? n : n-1; const {A} = randRank(r,m,n,rk,7); const b = rvec(r,m,-5,5);
  const st = r.pick(['unique','AtA']);
  return { prompt:`<p>Let A = ${mat(A)}, b = ${tup(b)}. True or false: ${st==='unique'?'the equation Ax = b has a unique least-squares solution.':'AᵀA is invertible.'}</p>`, kind:'tf', answer: rk===n,
    hint:'Unique least-squares solution ⇔ columns of A linearly independent ⇔ AᵀA invertible. (It always has at least one.)',
    solution:`<p>RREF(A) = ${mat(rref(A).R)}: rank ${rk} with ${n} columns ⇒ columns are ${rk===n?'independent ⇒ AᵀA invertible ⇒ unique x̂ = (AᵀA)⁻¹Aᵀb. TRUE.':'dependent ⇒ AᵀA singular ⇒ infinitely many least-squares solutions. FALSE.'}</p>`, _d:{A} };
}),
mk('54-10-ip-axioms','54-10',5,r=>{
  const kind = r.pick(['weighted','points']); let text, truth, why, d = {kind};
  if(kind==='weighted'){ const a = r.int(-2,4), b = r.int(-2,4), c = r.int(-3,3); d.G=[[a,c],[c,b]];
    text = `⟨x, y⟩ = ${lin([a,c,c,b],['x₁y₁','x₁y₂','x₂y₁','x₂y₂'])} defines an inner product on ℝ².`; truth = a>0 && a*b-c*c>0;
    why = truth ? `⟨x,x⟩ = xᵀGx with G = [${a} ${c}; ${c} ${b}], a = ${a} > 0 and det G = ${a*b-c*c} > 0, so G is positive definite.` : `positivity fails: G = [${a} ${c}; ${c} ${b}] has ${a<=0?'a₁₁ = '+a+' ≤ 0, e.g. x = (1,0) gives ⟨x,x⟩ = '+a:'det G = '+(a*b-c*c)+' ≤ 0, so some nonzero x has ⟨x,x⟩ ≤ 0'}.`; }
  else { const n = r.int(1,3); const k = r.int(n, n+2); const pts = r.sample([-3,-2,-1,0,1,2,3],k).sort((a,b)=>a-b); d.n=n; d.pts=pts;
    text = `⟨p, q⟩ = ${pts.map(t=>'p('+fs(t)+')q('+fs(t)+')').join(' + ')} defines an inner product on ℙ${sub(n)}.`; truth = k>=n+1;
    why = truth ? `symmetry and linearity are clear; ⟨p,p⟩ = Σp(tᵢ)² ≥ 0 and = 0 only if p has ${k} roots, impossible for a nonzero p of degree ≤ ${n} since ${k} > ${n}.` : `p(t) = ${pts.map(t=>'(t '+(t<0?'+ '+(-t):'− '+t)+')').join('')} is a nonzero polynomial in ℙ${sub(n)} with ⟨p,p⟩ = 0.`; }
  return { prompt:`<p>True or false: ${text}</p>`, kind:'tf', answer: truth, hint:'Check symmetry, linearity, and positivity: ⟨v,v⟩ > 0 for every v ≠ 0 (this is the one that usually fails).',
    solution:`<p>${truth?'TRUE':'FALSE'}: ${why}</p>`, _d:d };
}),
mk('54-10-cab-norm','54-10',5,r=>{
  const ab = r.pick([[0,1],[-1,1],[0,2]]); const spec = {a:ab[0], b:ab[1]}; const m = ipMoments(spec);
  const p = [r.int(-3,3), rnz(r,-3,3)].concat(r.bool()?[r.int(-2,2)]:[]); const q = [rnz(r,-3,3), r.int(-3,3)];
  const ask = r.pick(['norm2','ip','projc']);
  let val, txt, sol;
  if(ask==='norm2'){ val = ipPoly(p,p,m); txt = `‖f‖² for f(t) = ${poly(p)}`; sol = `‖f‖² = ∫ f(t)² dt = ${fs(val)}.`; }
  else if(ask==='ip'){ val = ipPoly(p,q,m); txt = `⟨f, g⟩ for f(t) = ${poly(p)} and g(t) = ${poly(q)}`; sol = `⟨f,g⟩ = ∫ f(t)g(t) dt = ${fs(val)}.`; }
  else { val = ipPoly(p,q,m).div(ipPoly(q,q,m)); txt = `the coefficient c in proj<sub>g</sub> f = c·g, for f(t) = ${poly(p)} and g(t) = ${poly(q)}`; sol = `c = ⟨f,g⟩/⟨g,g⟩ = ${fs(ipPoly(p,q,m))}/${fsp(ipPoly(q,q,m))} = ${fs(val)}.`; }
  return { prompt:`<p>In C[${ab[0]}, ${ab[1]}] with ⟨f, g⟩ = ∫${ab[0]<0?'₋'+sub(-ab[0]):sub(ab[0])}${sup(ab[1])} f(t)g(t) dt, compute ${txt}.</p>`, kind:'num', answer: ans(val),
    hint:'Multiply out the polynomials and integrate term by term: ∫ tᵏ dt = (b^{k+1} − a^{k+1})/(k+1).', solution:`<p>${sol}</p>`, _d:{ab,p,q,ask} };
}),
];

// ================================================================ 54-11  Lay 7.1, 7.4
function symMat(r, repeated){ // A = aI + b u uᵀ + c w wᵀ, u ⟂ w integer
  for(let t=0;t<200;t++){
    const U = orthoBasis3(r,3); const [u,w,z] = U;
    const a = r.int(-3,3), b = rnz(r,-1,1), c = repeated?0:rnz(r,-1,1);
    const A = [0,1,2].map(i=>[0,1,2].map(j=>(i===j?a:0)+b*u[i]*u[j]+c*w[i]*w[j]));
    const ev = [a+b*doti(u,u), a+c*doti(w,w), a];
    if(maxAbs(A)>12) continue; if(!repeated && new Set(ev).size<3) continue; if(repeated && ev[0]===a) continue;
    if(A.flat().filter(x=>x===0).length>3) continue;
    return {A, U, ev, a, b, c};
  }
  throw RETRY;
}
G['54-11'] = [
mk('54-11-eigvals-sym','54-11',0,r=>{
  const rep = r.bool(); const {A, ev} = symMat(r, rep);
  return { prompt:`<p>The symmetric matrix A = ${mat(A)} is orthogonally diagonalizable. Find its eigenvalues (with multiplicity), comma-separated.</p>`, kind:'list', unordered:true, answer: ev,
    hint:'Find det(A − λI) = 0. Shortcut checks: sum = trace, product = det. If A − λI has rank 1, λ is a double eigenvalue.',
    solution:`<p>Characteristic polynomial roots: ${ev.map(fs).join(', ')} (trace = ${A[0][0]+A[1][1]+A[2][2]} = sum ✓, det = ${fs(det(A))} = product ✓).${rep?' The repeated eigenvalue has a 2-dimensional eigenspace (symmetric matrices are always diagonalizable).':''}</p>`, _d:{A} };
}),
mk('54-11-gs-eigenspace','54-11',0,r=>{
  const {A, a} = symMat(r, true); const M = A.map((row,i)=>row.map((x,j)=>x-(i===j?a:0)));
  const {vecs, free} = nullBasis(M); need(vecs.length===2); let [v1,v2] = vecs; need(!dotF(v1,v2).isZero());
  const c = dotF(v2,v1).div(normSq(v1)); const z = v2.map((x,i)=>x.sub(c.mul(v1[i])));
  return { prompt:`<p>A = ${mat(A)} has the repeated eigenvalue λ = ${fs(a)} with eigenspace basis v₁ = ${tup(v1)}, v₂ = ${tup(v2)}. These are not orthogonal. To orthogonally diagonalize A, apply Gram–Schmidt inside the eigenspace: enter z = v₂ − proj<sub>v₁</sub>v₂.</p>`, kind:'list', answer: ansL(z),
    hint:'z = v₂ − (v₂·v₁)/(v₁·v₁) v₁. z is still an eigenvector for λ (it stays in the eigenspace).',
    solution:`<p>v₂·v₁ = ${fs(dotF(v2,v1))}, v₁·v₁ = ${fs(normSq(v1))}: z = v₂ − (${fs(c)})v₁ = ${tup(z)}. Then normalize v₁, z and the eigenvector of the other eigenvalue to build the orthogonal P.</p>`, _d:{A, a, v1:v1.map(x=>x.toNum()), v2:v2.map(x=>x.toNum())} };
}),
mk('54-11-spectral','54-11',1,r=>{
  const p = rnz(r,-3,3), q = rnz(r,-3,3); const N = p*p+q*q; const l2 = r.int(-4,4); const k = rnz(r,-1,1); const l1 = l2 + k*N;
  const A = [[l2+k*p*p, k*p*q],[k*p*q, l2+k*q*q]]; const big = Math.max(l1,l2);
  const uu = big===l1 ? [p,q] : [-q,p];
  const P = [[fr(uu[0]*uu[0],N), fr(uu[0]*uu[1],N)],[fr(uu[0]*uu[1],N), fr(uu[1]*uu[1],N)]];
  return { prompt:`<p>Write A = ${mat(A)} as A = λ₁u₁u₁ᵀ + λ₂u₂u₂ᵀ (spectral decomposition) with λ₁ > λ₂ and unit eigenvectors u₁, u₂. Enter the projection matrix u₁u₁ᵀ row by row.</p>`, kind:'list', answer: ansL(P.flat()),
    hint:'Find the eigenvalues, a unit eigenvector u₁ for the larger one, then u₁u₁ᵀ (it does not depend on the sign of u₁).',
    solution:`<p>Eigenvalues ${fs(Math.max(l1,l2))} > ${fs(Math.min(l1,l2))}. Eigenvector for λ₁: ${tup(uu)}, length √${N}, so u₁u₁ᵀ = (1/${N})${mat([[uu[0]*uu[0],uu[0]*uu[1]],[uu[0]*uu[1],uu[1]*uu[1]]])} = ${mat(P)}. Check: λ₁u₁u₁ᵀ + λ₂(I − u₁u₁ᵀ) = A.</p>`, _d:{A, l1:big} };
}),
mk('54-11-spectral-entry','54-11',1,r=>{
  const M = orthonormal3(r); const lam = rvec(r,3,-4,5); need(new Set(lam).size>=2); const i = r.int(0,2), j = r.int(0,2);
  const val = [0,1,2].reduce((s,k)=>s.add(fr(lam[k]*M[k][i]*M[k][j], 9)), F0);
  const us = M.map(v=>tup(v.map(x=>fr(x,3))));
  return { prompt:`<p>A symmetric matrix has spectral decomposition A = ${lam.map((l,k)=>fsp(l)+'u'+sub(k+1)+'u'+sub(k+1)+'ᵀ').join(' + ')} with u₁ = ${us[0]}, u₂ = ${us[1]}, u₃ = ${us[2]}. Find the (${i+1}, ${j+1}) entry of A.</p>`, kind:'num', answer: ans(val),
    hint:'The (i,j) entry of uuᵀ is uᵢuⱼ, so aᵢⱼ = Σₖ λₖ (uₖ)ᵢ(uₖ)ⱼ.',
    solution:`<p>a${sub(i+1)}${sub(j+1)} = ${[0,1,2].map(k=>fsp(lam[k])+'·('+fs(fr(M[k][i],3))+')('+fs(fr(M[k][j],3))+')').join(' + ')} = ${fs(val)}.</p>`, _d:{M, lam, i, j} };
}),
mk('54-11-sym-orth','54-11',2,r=>{
  const v1 = rvec(r,3,-3,3); need(v1[2]!==0 && v1.filter(x=>x).length>=2); const a = r.int(-4,4), b = r.int(-4,4); const h = fr(-(v1[0]*a+v1[1]*b), v1[2]); need(!(a===0&&b===0));
  const [l1,l2] = r.sample([-3,-2,-1,1,2,4,5,6],2);
  return { prompt:`<p>A is a 3×3 <b>symmetric</b> matrix with eigenvalues ${fs(l1)} and ${fs(l2)} (and possibly others). v₁ = ${tup(v1)} is an eigenvector for λ = ${fs(l1)}, and v₂ = (${fs(a)}, ${fs(b)}, h) is an eigenvector for λ = ${fs(l2)}. Find h.</p>`, kind:'num', answer: ans(h),
    hint:'For a symmetric matrix, eigenvectors from different eigenspaces are orthogonal: λ₁(v₁·v₂) = (Av₁)·v₂ = v₁·(Av₂) = λ₂(v₁·v₂) ⇒ v₁·v₂ = 0.',
    solution:`<p>Since A = Aᵀ and ${fs(l1)} ≠ ${fs(l2)}, v₁·v₂ = 0: ${fs(v1[0])}·${fsp(a)} + ${fsp(v1[1])}·${fsp(b)} + ${fsp(v1[2])}h = 0 ⇒ h = ${fs(h)}.</p>`, _d:{v1,a,b} };
}),
mk('54-11-singular-values','54-11',3,r=>{
  const shape = r.pick([[2,2],[3,2],[2,3]]); const A = Array.from({length:shape[0]},()=>rvec(r,shape[1],-3,3)); need(rank(A)===2);
  const G2 = shape[0]===2&&shape[1]===3 ? imul(A,T_(A)) : imul(T_(A),A);
  const tr = G2[0][0]+G2[1][1], dt = G2[0][0]*G2[1][1]-G2[0][1]*G2[1][0]; const disc = tr*tr-4*dt;
  const e1 = (tr+Math.sqrt(disc))/2, e2 = (tr-Math.sqrt(disc))/2; const which = r.bool()?1:2; const s = Math.sqrt(which===1?e1:e2);
  const exact = Number.isInteger(Math.round(s*1e9)/1e9) ? Math.round(s) : null;
  return { prompt:`<p>Find the ${which===1?'largest':'smallest nonzero'} singular value of A = ${mat(A)}${exact!==null?'':' (to 3 decimal places)'}.</p>`, kind:'num', answer: exact!==null?exact:r6(s),
    hint:`Singular values are square roots of the eigenvalues of ${shape[0]===2&&shape[1]===3?'AAᵀ (the smaller Gram matrix; same nonzero eigenvalues as AᵀA)':'AᵀA'}.`,
    solution:`<p>${shape[0]===2&&shape[1]===3?'AAᵀ':'AᵀA'} = ${mat(G2)}: λ² − ${tr}λ + ${dt} = 0 ⇒ λ = (${tr} ± √${disc})/2 ≈ ${e1.toFixed(4)}, ${e2.toFixed(4)}. σ = √λ ≈ ${Math.sqrt(e1).toFixed(4)}, ${Math.sqrt(e2).toFixed(4)}.</p>`, _d:{A, which} };
}),
mk('54-11-svd-sq','54-11',3,r=>{
  const shape = r.pick([[2,2],[3,2]]); const A = Array.from({length:shape[0]},()=>rvec(r,2,-3,3)); need(rank(A)===2);
  const G2 = imul(T_(A),A); const tr = G2[0][0]+G2[1][1], dt = G2[0][0]*G2[1][1]-G2[0][1]*G2[1][0]; const disc = tr*tr-4*dt;
  const sq = Math.round(Math.sqrt(disc)); need(sq*sq===disc && (tr+sq)%2===0 && G2[0][1]!==0);
  const e1 = (tr+sq)/2, e2 = (tr-sq)/2;
  const v = [G2[0][1], e1-G2[0][0]]; const v1 = [F1, fr(v[1], v[0])];
  const ask = r.bool() ? 'sq' : 'v';
  return { prompt:`<p>For A = ${mat(A)}, ${ask==='sq'?'find σ₁² and σ₂² (the squares of the singular values, larger first).':'find the right singular vector v₁ (for the largest singular value), scaled so its first entry is 1.'}</p>`, kind:'list', answer: ask==='sq'?[e1,e2]:ansL(v1),
    hint:'Eigen-decompose AᵀA: its eigenvalues are σᵢ², its unit eigenvectors are the right singular vectors vᵢ.',
    solution:`<p>AᵀA = ${mat(G2)}, eigenvalues ${e1}, ${e2} ⇒ σ₁² = ${e1}, σ₂² = ${e2}. (AᵀA − ${e1}I)v = 0 gives v₁ ∥ ${tup(v)} ∝ ${tup(v1)}.</p>`, _d:{A, ask} };
}),
mk('54-11-svd-bases','54-11',4,r=>{
  const m = r.int(3,5), n = r.int(3,5), rk = r.int(1, Math.min(m,n)-1);
  const target = r.pick(['Col A','Nul A','Row A','Nul Aᵀ']);
  const cl = (w,k,M)=>k===1?`the ${w} column of ${M}`:`the ${w} ${k} columns of ${M}`;
  const L = { 'Col A':cl('first',rk,'U'), 'Nul Aᵀ':cl('last',m-rk,'U'), 'Row A':cl('first',rk,'V'), 'Nul A':cl('last',n-rk,'V') };
  const o = mc(r, L[target], Object.values(L).filter(x=>x!==L[target]), [`all ${n} columns of V`]);
  const sv = Array.from({length:rk},()=>r.int(1,9)).sort((a,b)=>b-a);
  return { prompt:`<p>A is ${m}×${n} with SVD A = UΣVᵀ, where Σ has nonzero singular values ${sv.join(', ')} (so rank A = ${rk}). Which vectors form an orthonormal basis for <b>${target}</b>?</p>`, kind:'mc', ...o,
    hint:'Av_i = σᵢuᵢ. The uᵢ for σᵢ ≠ 0 span Col A; the vᵢ for σᵢ = 0 span Nul A; Row A = (Nul A)⊥; Nul Aᵀ = (Col A)⊥.',
    solution:`<p>Av_i = σᵢu_i: for i ≤ ${rk} this gives Col A = Span{u₁…u${sub(rk)}} and the remaining v's (σ = 0) give Nul A = Span{v${sub(rk+1)}…v${sub(n)}}. Orthogonal complements: Row A = Span{v₁…v${sub(rk)}}, Nul Aᵀ = Span{u${sub(rk+1)}…u${sub(m)}}. Answer: ${L[target]}.</p>`, _d:{m,n,rk,target,L} };
}),
mk('54-11-svd-rank','54-11',4,r=>{
  const m = r.int(2,6), n = r.int(2,6); const rk = r.int(1, Math.min(m,n)); const sv = Array.from({length:Math.min(m,n)},(_,i)=>i<rk?r.int(1,12):0).sort((a,b)=>b-a);
  const ask = r.pick(['rank','nul','nulT']); const val = {rank:rk, nul:n-rk, nulT:m-rk}[ask];
  const Q = {rank:'rank A', nul:'dim Nul A', nulT:'dim Nul Aᵀ'}[ask];
  return { prompt:`<p>A is ${m}×${n} with singular values ${sv.join(', ')}. Find ${Q}.</p>`, kind:'num', answer: val,
    hint:'rank A = number of NONZERO singular values; then use rank + dim Nul A = n and rank + dim Nul Aᵀ = m.',
    solution:`<p>${rk} nonzero singular values ⇒ rank A = ${rk}; dim Nul A = ${n} − ${rk} = ${n-rk}; dim Nul Aᵀ = ${m} − ${rk} = ${m-rk}. ${Q} = ${val}.</p>`, _d:{m,n,sv,ask} };
}),
mk('54-11-tf','54-11',4,r=>{
  const {A} = symMat(r, r.bool()); const B = A.map(x=>x.slice()); const sym = r.bool();
  if(!sym){ const i = r.int(0,1), j = r.int(i+1,2); B[i][j] += rnz(r,-2,2); }
  const st = r.pick(['orth','realorth']);
  return { prompt:`<p>True or false: the matrix ${mat(B)} is orthogonally diagonalizable${st==='realorth'?' (has an orthonormal basis of ℝ³ consisting of eigenvectors)':''}.</p>`, kind:'tf', answer: sym,
    hint:'Spectral theorem: a real matrix is orthogonally diagonalizable ⇔ it is symmetric.',
    solution:`<p>${sym?'The matrix equals its transpose, so by the spectral theorem it is orthogonally diagonalizable. TRUE.':'It is not symmetric (compare the entries mirrored across the diagonal). If A = PDPᵀ with P orthogonal then Aᵀ = PDᵀPᵀ = A, so a non-symmetric matrix can never be orthogonally diagonalized. FALSE.'}</p>`, _d:{A:B} };
}),
];

// ================================================================ 54-12  Nagle 4.2–4.5
// Exponential-trig-polynomial term algebra: expression = Map "m|c" / "m|s" -> F, meaning coef·tᵐ·e^{kt}·cos(ωt) (or sin), k, ω fixed.
function exAdd(A,B,sc){ const o = new Map(A); for(const [key,v] of B){ const nv = (o.get(key)||F0).add(sc===undefined?v:v.mul(sc)); if(nv.isZero()) o.delete(key); else o.set(key,nv); } return o; }
function exD(E,k,w){ const o = new Map(); const put=(m,t,v)=>{ if(v.isZero()) return; const key=m+'|'+t; const nv=(o.get(key)||F0).add(v); if(nv.isZero()) o.delete(key); else o.set(key,nv); };
  for(const [key,v] of E){ const [ms,t] = key.split('|'); const m=+ms;
    if(m>0) put(m-1,t,v.mul(m)); put(m,t,v.mul(k));
    if(w!==0){ if(t==='c') put(m,'s',v.mul(-w)); else put(m,'c',v.mul(w)); } }
  return o; }
function exL(E,L,k,w){ const d1 = exD(E,k,w), d2 = exD(d1,k,w); return exAdd(exAdd(new Map([...E].map(([a,v])=>[a,v.mul(L.c)])), d1, F.of(L.b)), d2, F.of(L.a)); }
function exEval(E,k,w,t){ let s=0; for(const [key,v] of E){ const [ms,tt]=key.split('|'); s += v.toNum()*Math.pow(t,+ms)*Math.exp(k*t)*(w===0?1:(tt==='c'?Math.cos(w*t):Math.sin(w*t))); } return s; }
function charMult(L,k,w){ const re = L.a*(k*k-w*w)+L.b*k+L.c, im = (2*L.a*k+L.b)*w; if(w!==0) return (re===0&&im===0)?1:0; if(re!==0) return 0; return (2*L.a*k+L.b===0)?2:1; }
// try to solve L[Σ xᵢ φᵢ] = g with basis terms [[m,'c'|'s'],...]; returns coefficient array (F) or null
function ucTry(L,k,w,g,basis){
  const imgs = basis.map(([m,t])=>exL(new Map([[m+'|'+t,F1]]),L,k,w));
  const keys = new Set([...g.keys()]); imgs.forEach(I=>I.forEach((_,key)=>keys.add(key)));
  const rows = [...keys].map(key=>imgs.map(I=>I.get(key)||F0).concat([g.get(key)||F0]));
  if(!rows.length) return null;
  const {R, piv} = rref(rows); const n = basis.length;
  if(piv.includes(n) || piv.length<n) return null;
  return basis.map((_,i)=>R[i][n]);
}
function gExpr(Pg,Qg){ const g=new Map(); Pg.forEach((v,m)=>{ if(v) g.set(m+'|c',F.of(v)); }); (Qg||[]).forEach((v,m)=>{ if(v) g.set(m+'|s',F.of(v)); }); return g; }
function ucSolve(L,k,w,Pg,Qg){
  const s = charMult(L,k,w); const d = Math.max(Pg.length, (Qg||[]).length)-1;
  const basis = []; for(let j=d;j>=0;j--){ basis.push([s+j,'c']); if(w!==0) basis.push([s+j,'s']); }
  const g = gExpr(Pg,Qg); const x = ucTry(L,k,w,g,basis); if(!x) throw new Error('uc failed');
  const E = new Map(); basis.forEach(([m,t],i)=>{ if(!x[i].isZero()) E.set(m+'|'+t,x[i]); });
  return { s, d, basis, x, E, g };
}
function expS(k){ return k===0?'':`e<sup>${k===1?'':k===-1?'−':fs(k)}t</sup>`; }
function trigS(w,t){ return w===0?'':(t==='c'?'cos ':'sin ')+(w===1?'t':w+'t'); }
function termS(m,k,w,t){ const p = [m===0?'':(m===1?'t':'t'+sup(m)), expS(k), trigS(w,t)].filter(x=>x); return p.length?p.join(' '):'1'; }
function exprS(E,k,w){ const keys=[...E.keys()].sort((a,b)=>(+b.split('|')[0])-(+a.split('|')[0])||a.localeCompare(b)); return lin(keys.map(x=>E.get(x)), keys.map(x=>{ const [m,t]=x.split('|'); const s=termS(+m,k,w,t); return s==='1'?'':s; })); }
function odeS(L){ return lin([L.a,L.b,L.c],['y″','y′','y']); }
function pickRoots(r, kind){
  kind = kind || r.pick(['real','rep','cx']);
  if(kind==='real'){ const [r1,r2] = r.sample([-4,-3,-2,-1,0,1,2,3],2); return {kind,r1,r2,b:-(r1+r2),c:r1*r2}; }
  if(kind==='rep'){ const r0 = rnz(r,-3,3); return {kind,r:r0,b:-2*r0,c:r0*r0}; }
  const al = r.int(-2,2), be = r.int(1,3); return {kind,al,be,b:-2*al,c:al*al+be*be};
}
function homInfo(R){ // basis functions, their values & derivatives at 0, and display string
  if(R.kind==='real') return { f:[t=>Math.exp(R.r1*t), t=>Math.exp(R.r2*t)], v0:[[1,R.r1],[1,R.r2]], s:`c₁${expS(R.r1)||''} + c₂${expS(R.r2)||''}`.replace(/c₁ \+/,'c₁ +'), roots:`r = ${fs(R.r1)}, ${fs(R.r2)}` };
  if(R.kind==='rep') return { f:[t=>Math.exp(R.r*t), t=>t*Math.exp(R.r*t)], v0:[[1,R.r],[0,1]], s:`(c₁ + c₂t)${expS(R.r)}`, roots:`r = ${fs(R.r)} (double)` };
  return { f:[t=>Math.exp(R.al*t)*Math.cos(R.be*t), t=>Math.exp(R.al*t)*Math.sin(R.be*t)], v0:[[1,R.al],[0,R.be]], s:`${expS(R.al)}(c₁ ${trigS(R.be,'c')} + c₂ ${trigS(R.be,'s')})`, roots:`r = ${fs(R.al)} ± ${R.be===1?'':R.be}i` };
}
function trialS(s,k,w,d,letters){ // display trial form
  let li = 0; const L = letters || 'ABCDEFGH';
  const pol = ()=>{ const terms=[]; for(let j=d;j>=0;j--) terms.push(L[li++]+(j===0?'':j===1?'t':'t'+sup(j))); return terms.length>1?'('+terms.join(' + ')+')':terms[0]; };
  const pre = (s===0?'':s===1?'t':'t'+sup(s));
  if(w===0){ const P = pol(); const core = P.startsWith('(') ? pre+P : P+pre; return [core, expS(k)].filter(x=>x).join(' '); }
  const P = pol(), Q = pol();
  return `${pre}${expS(k)?(pre?' ':'')+expS(k):''}${pre||expS(k)?'·':''}[${P} ${trigS(w,'c')} + ${Q} ${trigS(w,'s')}]`;
}
function forcingCase(r, L, opts){ // returns {k,w,Pg,Qg}
  opts = opts||{};
  const t = r.pick(opts.types || ['exp','poly','trig','texp','exptrig']);
  if(t==='exp'){ const k = r.pick([r.int(-3,3), ...(opts.res?[]:[])]); return {k, w:0, Pg:[rnz(r,-6,6)], Qg:[]}; }
  if(t==='poly'){ need(L.c!==0); const deg = r.int(1,2); return {k:0, w:0, Pg:Array.from({length:deg+1},(_,i)=>i===deg?rnz(r,-4,4):r.int(-4,4)), Qg:[]}; }
  if(t==='trig'){ const w = r.int(1,3); return {k:0, w, Pg:[r.int(-5,5)], Qg:[r.int(-5,5)]}; }
  if(t==='texp'){ const k = r.int(-2,2); return {k, w:0, Pg:[r.int(-4,4), rnz(r,-4,4)], Qg:[]}; }
  const k = r.int(-2,2), w = r.int(1,2); return {k, w, Pg:[r.int(-4,4)], Qg:[r.int(-4,4)]};
}
function fcS(fc){ return exprS(gExpr(fc.Pg,fc.Qg), fc.k, fc.w); }
G['54-12'] = [
mk('54-12-gen-form','54-12',0,r=>{
  const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c}; const H = homInfo(R);
  const opts = []; const add = (txt,fns)=>{ if(!opts.some(o=>o.txt===txt)) opts.push({txt,fns}); };
  const E = (k)=>t=>Math.exp(k*t);
  add(`y = ${H.s}`, H.f);
  if(R.kind==='real'){ if(!(R.r1===-R.r2)) add(`y = c₁${expS(-R.r1)} + c₂${expS(-R.r2)}`, [E(-R.r1),E(-R.r2)]); add(`y = (c₁ + c₂t)${expS(R.r1)}`, [E(R.r1), t=>t*Math.exp(R.r1*t)]); add(`y = c₁${expS(R.r1)} ${trigS(Math.abs(R.r2)||1,'c')} + c₂${expS(R.r1)} ${trigS(Math.abs(R.r2)||1,'s')}`, [t=>Math.exp(R.r1*t)*Math.cos((Math.abs(R.r2)||1)*t), t=>Math.exp(R.r1*t)*Math.sin((Math.abs(R.r2)||1)*t)]); { const A1=[R.r1+R.r2,R.r1*R.r2].sort(), B1=[R.r1,R.r2].sort(); if(A1[0]!==A1[1] && !(A1[0]===B1[0]&&A1[1]===B1[1])) add(`y = c₁${expS(R.r1+R.r2)} + c₂${expS(R.r1*R.r2)}`, [E(R.r1+R.r2),E(R.r1*R.r2)]); } }
  else if(R.kind==='rep'){ add(`y = c₁${expS(R.r)} + c₂${expS(-R.r)}`, [E(R.r),E(-R.r)]); add(`y = (c₁ + c₂t)${expS(-R.r)}`, [E(-R.r), t=>t*Math.exp(-R.r*t)]); add(`y = c₁${expS(R.r)} + c₂t²${expS(R.r)}`, [E(R.r), t=>t*t*Math.exp(R.r*t)]); add(`y = c₁${expS(2*R.r)} + c₂t${expS(2*R.r)}`, [E(2*R.r), t=>t*Math.exp(2*R.r*t)]); }
  else { const {al,be} = R; add(`y = ${expS(be)}(c₁ ${trigS(Math.abs(al)||2,'c')} + c₂ ${trigS(Math.abs(al)||2,'s')})`, [t=>Math.exp(be*t)*Math.cos((Math.abs(al)||2)*t), t=>Math.exp(be*t)*Math.sin((Math.abs(al)||2)*t)]);
    add(`y = ${expS(-al)}(c₁ ${trigS(be,'c')} + c₂ ${trigS(be,'s')})`, [t=>Math.exp(-al*t)*Math.cos(be*t), t=>Math.exp(-al*t)*Math.sin(be*t)]);
    add(`y = c₁${expS(al+be)} + c₂${expS(al-be)}`, [E(al+be),E(al-be)]);
    add(`y = ${expS(al)}(c₁ ${trigS(2*be,'c')} + c₂ ${trigS(2*be,'s')})`, [t=>Math.exp(al*t)*Math.cos(2*be*t), t=>Math.exp(al*t)*Math.sin(2*be*t)]); }
  need(opts.length>=4);
  const o = mc(r, opts[0].txt, opts.slice(1).map(x=>x.txt)); const fmap = {}; opts.forEach(x=>fmap[x.txt]=x.fns);
  return { prompt:`<p>Find the general solution of ${odeS(L)} = 0.</p>`, kind:'mc', ...o,
    hint:'Auxiliary equation r² + br + c = 0: distinct real roots → two exponentials; repeated root r → (c₁ + c₂t)e^{rt}; complex α ± βi → e^{αt}(c₁cos βt + c₂sin βt).',
    solution:`<p>Auxiliary equation r² ${lin([L.b,L.c],['r',''])==='0'?'':'+ ('+lin([L.b,L.c],['r',''])+')'} = 0 ⇒ ${H.roots}. General solution: y = ${H.s}.</p>`, _d:{L, fmap} };
}),
mk('54-12-char-roots','54-12',0,r=>{
  const p = r.int(1,3), q = r.int(1,3), u = rnz(r,-5,5), v = r.int(-5,5); const r1 = fr(u,p), r2 = fr(v,q); need(!r1.eq(r2) && (p>1||q>1));
  const a = p*q, b = -(p*v+q*u), c = u*v; const g = gcd(gcd(a,b),c); const L = {a:a/g, b:b/g, c:c/g};
  return { prompt:`<p>The equation ${odeS(L)} = 0 has solutions of the form y = e<sup>rt</sup>. Find both values of r.</p>`, kind:'list', unordered:true, answer: ansL([r1,r2]),
    hint:'Substitute y = e^{rt}: ar² + br + c = 0. Factor or use the quadratic formula.',
    solution:`<p>Auxiliary equation ${lin([L.a,L.b,L.c],['r²','r',''])} = 0 factors as (${lin([p,-u],['r',''])})(${lin([q,-v],['r',''])}) = 0 (up to a constant) ⇒ r = ${fs(r1)}, ${fs(r2)}. General solution y = c₁e<sup>${fs(r1)}t</sup> + c₂e<sup>${fs(r2)}t</sup>.</p>`, _d:{L} };
}),
mk('54-12-ivp-hom','54-12',1,r=>{
  const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c}; const H = homInfo(R); const y0 = r.int(-4,4), v0 = r.int(-5,5); need(y0||v0);
  const M = [[H.v0[0][0],H.v0[1][0]],[H.v0[0][1],H.v0[1][1]]]; const c = fmv(inv(M),[y0,v0]);
  const t1 = r.pick([1,0.5]); const val = c[0].toNum()*H.f[0](t1)+c[1].toNum()*H.f[1](t1); need(Math.abs(val)<1e5);
  return { prompt:`<p>Solve ${odeS(L)} = 0, y(0) = ${fs(y0)}, y′(0) = ${fs(v0)}. Give y(${t1}) to 3 decimal places.</p>`, kind:'num', answer: r6(val),
    hint:'Roots of the auxiliary equation → general solution; then use y(0), y′(0) to get c₁, c₂.',
    solution:`<p>${H.roots} ⇒ y = ${H.s}. y(0) = ${fs(y0)} and y′(0) = ${fs(v0)} give c₁ = ${fs(c[0])}, c₂ = ${fs(c[1])}. Then y(${t1}) ≈ ${val.toFixed(4)}.</p>`, _d:{L,y0,v0,t1} };
}),
mk('54-12-ivp-forced','54-12',1,r=>{
  const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c}; const H = homInfo(R);
  const fc = forcingCase(r, L, {types:['exp','poly','trig']}); need(charMult(L,fc.k,fc.w)===0);
  const U = ucSolve(L,fc.k,fc.w,fc.Pg,fc.Qg); const yp0 = F.of(0).add([...U.E].reduce((s,[key,v])=>{ const [m,t]=key.split('|'); return (+m===0&&t==='c')?s.add(v):s; },F0));
  const D1 = exD(U.E,fc.k,fc.w); const yp1 = [...D1].reduce((s,[key,v])=>{ const [m,t]=key.split('|'); return (+m===0&&t==='c')?s.add(v):s; },F0);
  const y0 = r.int(-3,3), v0 = r.int(-4,4);
  const M = [[H.v0[0][0],H.v0[1][0]],[H.v0[0][1],H.v0[1][1]]]; const c = fmv(inv(M),[F.of(y0).sub(yp0), F.of(v0).sub(yp1)]);
  const t1 = r.pick([1,0.5]); const val = c[0].toNum()*H.f[0](t1)+c[1].toNum()*H.f[1](t1)+exEval(U.E,fc.k,fc.w,t1); need(Math.abs(val)<1e5);
  return { prompt:`<p>Solve the IVP ${odeS(L)} = ${fcS(fc)}, y(0) = ${fs(y0)}, y′(0) = ${fs(v0)}. Give y(${t1}) to 3 decimal places.</p>`, kind:'num', answer: r6(val),
    hint:'y = y_h + y_p: find y_p by undetermined coefficients FIRST, then apply the initial conditions to the whole y (not to y_h alone).',
    solution:`<p>${H.roots} ⇒ y_h = ${H.s}. Undetermined coefficients: y_p = ${exprS(U.E,fc.k,fc.w)}. Initial conditions on y = y_h + y_p: c₁ = ${fs(c[0])}, c₂ = ${fs(c[1])}. y(${t1}) ≈ ${val.toFixed(4)}.</p>`, _d:{L,fc,y0,v0,t1} };
}),
mk('54-12-find-ode','54-12',2,r=>{
  const R = pickRoots(r); const H = homInfo(R);
  const desc = R.kind==='real' ? `${expS(R.r1)||'1'} and ${expS(R.r2)||'1'}` : R.kind==='rep' ? `${expS(R.r)} and t${expS(R.r)}` : `${expS(R.al)}${R.al?' ':''}${trigS(R.be,'c')} and ${expS(R.al)}${R.al?' ':''}${trigS(R.be,'s')}`;
  return { prompt:`<p>The functions ${desc} form a fundamental solution set of y″ + by′ + cy = 0. Find b and c.</p>`, kind:'list', answer:[R.b, R.c],
    hint:'Read off the roots of the auxiliary equation, then (r − r₁)(r − r₂) = r² + br + c.',
    solution:`<p>The solutions correspond to ${H.roots}. Auxiliary polynomial ${R.kind==='cx'?'(r − α)² + β²':'(r − r₁)(r − r₂)'} = r² ${lin([R.b,R.c],['r',''])==='0'?'':'+ ('+lin([R.b,R.c],['r',''])+')'} ⇒ b = ${R.b}, c = ${R.c}.</p>`, _d:{fns:H.f} };
}),
mk('54-12-uc-coef','54-12',3,r=>{
  const res = r.int(0,2)>0; const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c};
  let fc;
  if(res){ // force resonance: forcing exponent / frequency matches a root
    if(R.kind==='real'){ const k = r.pick([R.r1,R.r2]); fc = r.bool()? {k,w:0,Pg:[rnz(r,-6,6)],Qg:[]} : {k,w:0,Pg:[r.int(-4,4),rnz(r,-4,4)],Qg:[]}; }
    else if(R.kind==='rep'){ fc = {k:R.r,w:0,Pg:[rnz(r,-6,6)],Qg:[]}; }
    else fc = {k:R.al, w:R.be, Pg:[r.int(-5,5)], Qg:[r.int(-5,5)]};
  } else fc = forcingCase(r, L);
  need(fc.Pg.some(x=>x)||fc.Qg.some(x=>x));
  const U = ucSolve(L,fc.k,fc.w,fc.Pg,fc.Qg); const nz = U.basis.map((b,i)=>i).filter(i=>!U.x[i].isZero()); need(nz.length>0);
  const i = r.pick(nz); const [m,t] = U.basis[i]; need(Math.abs(U.x[i].n)<=2000 && U.x[i].d<=2000);
  return { prompt:`<p>Use undetermined coefficients to find a particular solution of ${odeS(L)} = ${fcS(fc)}. (Use the standard trial form with the smallest power tˢ that works; it contains no solutions of the homogeneous equation.) What is the coefficient of <b>${termS(m,fc.k,fc.w,t)}</b> in y_p?</p>`, kind:'num', answer: ans(U.x[i]),
    hint:'Trial form tˢ·e^{kt}(polynomial·cos + polynomial·sin), where s = multiplicity of k + iω as a root of the auxiliary equation. Substitute and match coefficients.',
    solution:`<p>Auxiliary roots: ${homInfo(R).roots}. ${fc.w===0?'k = '+fc.k:'k + iω = '+fc.k+' + '+fc.w+'i'} is a root of multiplicity s = ${U.s}${U.s?' (resonance ⇒ multiply by t'+(U.s>1?sup(U.s):'')+')':''}. Trial: y_p = ${trialS(U.s,fc.k,fc.w,U.d)}. Substituting and matching coefficients gives y_p = ${exprS(U.E,fc.k,fc.w)}. Coefficient of ${termS(m,fc.k,fc.w,t)}: ${fs(U.x[i])}.</p>`,
    _d:{L, fc, basis:U.basis, x:U.x.map(v=>v.toNum()), i} };
}),
mk('54-12-trial-form','54-12',3,r=>{
  const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c}; let fc;
  if(r.int(0,2)>0){ if(R.kind==='real'){ const k=r.pick([R.r1,R.r2]); fc={k,w:0,Pg:Array.from({length:r.int(1,2)},(_,j)=>rnz(r,-4,4)),Qg:[]}; } else if(R.kind==='rep') fc={k:R.r,w:0,Pg:Array.from({length:r.int(1,2)},()=>rnz(r,-4,4)),Qg:[]}; else fc={k:R.al,w:R.be,Pg:Array.from({length:r.int(1,2)},()=>rnz(r,-3,3)),Qg:[rnz(r,-3,3)]}; }
  else fc = forcingCase(r, L);
  const s = charMult(L,fc.k,fc.w); const d = Math.max(fc.Pg.length,fc.Qg.length)-1; const g = gExpr(fc.Pg,fc.Qg); need(g.size>0);
  const mkBasis = (ss,dd,both,full)=>{ const b=[]; for(let j=dd;j>=0;j--){ if(!full && j<dd) continue; b.push([ss+j,'c']); if(fc.w!==0 && both) b.push([ss+j,'s']); } return b; };
  const cands = [];
  const disp = (ss,dd,both,full)=>{ if(fc.w===0||both){ if(full) return trialS(ss,fc.k,fc.w,dd); const pre=(ss+dd===0?'':ss+dd===1?'t':'t'+sup(ss+dd)); return fc.w===0?('A'+pre+(expS(fc.k)?' '+expS(fc.k):'')).replace(/^A$/,'A'):`${pre}${expS(fc.k)?' '+expS(fc.k):''}·[A ${trigS(fc.w,'c')} + B ${trigS(fc.w,'s')}]`; }
    let li=0; const L2='ABCDEFGH'; const terms=[]; for(let j=dd;j>=0;j--) terms.push(L2[li++]+(j===0?'':j===1?'t':'t'+sup(j))); const P=terms.length>1?'('+terms.join(' + ')+')':terms[0]; const pre=(ss===0?'':ss===1?'t':'t'+sup(ss)); return `${pre}${expS(fc.k)?(pre?' ':'')+expS(fc.k):''}${pre||expS(fc.k)?'·':''}${P} ${trigS(fc.w,'c')}`; };
  const correct = disp(s,d,true,true); const meta = {}; meta[correct] = {basis:mkBasis(s,d,true,true), k:fc.k};
  const tryAdd = (ss,dd,both,full,kk)=>{ if(ss<0) return; const txt = kk===undefined?disp(ss,dd,both,full):disp(ss,dd,both,full).replace(expS(fc.k), expS(kk)); const basis = mkBasis(ss,dd,both,full);
    if(txt===correct || meta[txt]) return; if((kk===undefined||kk===fc.k) && ucTry(L,fc.k,fc.w,g,basis)) return; meta[txt]={basis, k:kk===undefined?fc.k:kk}; cands.push(txt); };
  tryAdd(s-1,d,true,true); tryAdd(s+1,d,true,true); tryAdd(s,d,false,true); if(d>0) tryAdd(s,d,true,false); tryAdd(s+2,d,true,true); if(fc.k!==0 && expS(-fc.k)) tryAdd(s,d,true,true,-fc.k); if(s>0) tryAdd(s-1,d,false,true);
  need(cands.length>=3);
  const o = mc(r, correct, cands);
  return { prompt:`<p>Which is the correct form of the trial particular solution for ${odeS(L)} = ${fcS(fc)} (undetermined coefficients; do not solve)?</p>`, kind:'mc', ...o,
    hint:'Match the forcing term: keep every lower power of t and BOTH cos and sin; then multiply by tˢ where s = multiplicity of k + iω as an auxiliary root.',
    solution:`<p>Auxiliary roots: ${homInfo(R).roots}. The forcing has ${fc.w===0?'exponent k = '+fc.k:'k + iω = '+fc.k+' + '+fc.w+'i'} and polynomial degree ${d}, so s = ${s}. Trial: y_p = ${correct}. ${s?'Without the factor t'+(s>1?sup(s):'')+' the trial would contain homogeneous solutions and the coefficients could not be matched.':''}</p>`, _d:{L, fc, meta} };
}),
mk('54-12-form-count','54-12',4,r=>{
  const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c};
  const pieces = []; const n = 2; const used = new Set();
  for(let p=0;p<n;p++){ let fc; if(p===0 && r.bool()){ fc = R.kind==='real'?{k:r.pick([R.r1,R.r2]),w:0,Pg:Array.from({length:r.int(1,3)},()=>rnz(r,-3,3)),Qg:[]} : R.kind==='rep'?{k:R.r,w:0,Pg:[rnz(r,-3,3)],Qg:[]} : {k:R.al,w:R.be,Pg:Array.from({length:r.int(1,2)},()=>rnz(r,-3,3)),Qg:[]}; } else fc = forcingCase(r,L); const key = fc.k+'|'+fc.w; need(!used.has(key)); used.add(key); pieces.push(fc); }
  const info = pieces.map(fc=>({s:charMult(L,fc.k,fc.w), d:Math.max(fc.Pg.length,fc.Qg.length)-1, cnt:(Math.max(fc.Pg.length,fc.Qg.length))*(fc.w?2:1)}));
  const total = info.reduce((s,x)=>s+x.cnt,0);
  let li = 0; const letters='ABCDEFGHIJKLMN'; const forms = pieces.map((fc,i)=>{ const f = trialS(info[i].s,fc.k,fc.w,info[i].d,letters.slice(li)); li += info[i].cnt; return f; });
  return { prompt:`<p>For ${odeS(L)} = ${pieces.map(fcS).map(x=>'('+x+')').join(' + ')}, write down (do not solve) the trial form of y_p for undetermined coefficients. How many undetermined coefficients does it contain in total?</p>`, kind:'num', answer: total,
    hint:'Superposition: one trial block per forcing type. A degree-d polynomial factor needs d+1 coefficients, doubled when both cos and sin appear. The tˢ factor doesn\'t change the count.',
    solution:`<p>Auxiliary roots: ${homInfo(R).roots}. Blocks: ${pieces.map((fc,i)=>`for ${fcS(fc)}: ${forms[i]} (s = ${info[i].s}, ${info[i].cnt} coefficient${info[i].cnt>1?'s':''})`).join('; ')}. Total = ${total}.</p>`, _d:{L, pieces} };
}),
mk('54-12-form-power','54-12',4,r=>{
  const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c}; let fc;
  const roll = r.int(0,3);
  if(roll===0) fc = forcingCase(r,L); else if(R.kind==='real') fc={k:r.pick([R.r1,R.r2]),w:0,Pg:[r.int(-3,3),rnz(r,-3,3)].slice(0,r.int(1,2)),Qg:[]}; else if(R.kind==='rep') fc={k:R.r,w:0,Pg:[rnz(r,-3,3)],Qg:[]}; else fc={k:R.al,w:R.be,Pg:[rnz(r,-3,3)],Qg:[r.int(-3,3)]};
  if(!fc.Pg.some(x=>x)) fc.Pg[fc.Pg.length-1]=1;
  const s = charMult(L,fc.k,fc.w);
  return { prompt:`<p>For ${odeS(L)} = ${fcS(fc)}, the trial particular solution must be multiplied by tˢ. Find s.</p>`, kind:'num', answer: s,
    hint:'s = number of times k + iω (from the forcing e^{kt}cos ωt / sin ωt) occurs as a root of the auxiliary equation: 0, 1 or 2.',
    solution:`<p>Auxiliary roots: ${homInfo(R).roots}. Forcing number ${fc.w===0?fs(fc.k):fc.k+' + '+fc.w+'i'} is a root of multiplicity ${s}. So s = ${s}: y_p = ${trialS(s,fc.k,fc.w,Math.max(fc.Pg.length,fc.Qg.length)-1)}.</p>`, _d:{L, fc} };
}),
mk('54-12-superposition','54-12',5,r=>{
  const R = pickRoots(r); const L = {a:1,b:R.b,c:R.c}; const H = homInfo(R);
  const fc = forcingCase(r,L,{types:['exp','trig','poly']}); need(charMult(L,fc.k,fc.w)===0); const U = ucSolve(L,fc.k,fc.w,fc.Pg,fc.Qg);
  const alpha = r.pick([2,3,-1,-2,4]);
  // given: y1 = U.E solves L[y] = g ; ask IVP L[y] = alpha*g, y(0)=0, y'(0)=v0
  const y0 = r.int(-2,2), v0 = r.int(-3,3);
  const at0 = E => [...E].reduce((s,[key,v])=>{ const [m,t]=key.split('|'); return (+m===0&&t==='c')?s.add(v):s; },F0);
  const yp0 = at0(U.E).mul(alpha), yp1 = at0(exD(U.E,fc.k,fc.w)).mul(alpha);
  const M = [[H.v0[0][0],H.v0[1][0]],[H.v0[0][1],H.v0[1][1]]]; const c = fmv(inv(M),[F.of(y0).sub(yp0), F.of(v0).sub(yp1)]);
  const val = c[0].toNum()*H.f[0](1)+c[1].toNum()*H.f[1](1)+alpha*exEval(U.E,fc.k,fc.w,1); need(Math.abs(val)<1e5);
  const gA = gExpr(fc.Pg.map(x=>x*alpha), fc.Qg.map(x=>x*alpha));
  return { prompt:`<p>Given that y₁ = ${exprS(U.E,fc.k,fc.w)} is a solution of ${odeS(L)} = ${fcS(fc)}, solve ${odeS(L)} = ${exprS(gA,fc.k,fc.w)}, y(0) = ${fs(y0)}, y′(0) = ${fs(v0)}. Give y(1) to 3 decimal places.</p>`, kind:'num', answer: r6(val),
    hint:'Superposition: if L[y₁] = g then L[αy₁] = αg. So y = y_h + αy₁; then fit the initial conditions.',
    solution:`<p>The new forcing is ${alpha}·(old forcing), so y_p = ${alpha}y₁. ${H.roots} ⇒ y_h = ${H.s}. Initial conditions on y_h + ${alpha}y₁: c₁ = ${fs(c[0])}, c₂ = ${fs(c[1])}. y(1) ≈ ${val.toFixed(4)}.</p>`, _d:{L, fc, alpha, y0, v0} };
}),
mk('54-12-damping','54-12',5,r=>{
  const cls = r.pick(['over','crit','under','undamped']); const m = r.int(1,4); let b, k;
  if(cls==='crit'){ const q = r.int(1,4); k = m*q*q; b = 2*m*q; } // b² = 4mk
  else if(cls==='undamped'){ b = 0; k = r.int(1,20); }
  else { k = r.int(1,12); b = r.int(1,12); const D = b*b-4*m*k; need(cls==='over'?D>0:D<0); }
  const L = { over:'Overdamped', crit:'Critically damped', under:'Underdamped (oscillates with decaying amplitude)', undamped:'Undamped (simple harmonic motion)' };
  const o = mc(r, L[cls], Object.values(L).filter(x=>x!==L[cls]));
  return { prompt:`<p>A mass–spring system satisfies ${lin([m,b,k],['y″','y′','y'])} = 0 (m = ${m}, b = ${b}, k = ${k}). Classify the motion.</p>`, kind:'mc', ...o,
    hint:'Compare b² with 4mk: > overdamped, = critically damped, < underdamped; b = 0 undamped.',
    solution:`<p>b² − 4mk = ${b*b} − ${4*m*k} = ${b*b-4*m*k}${b===0?' with b = 0':''}. ⇒ ${L[cls]}.</p>`, _d:{m,b,k,cls,label:L[cls]} };
}),
mk('54-12-wronskian','54-12',5,r=>{
  const R = pickRoots(r); const H = homInfo(R); const t0 = r.pick([0,0,1,-1,0.5]);
  const W = t => { if(R.kind==='real') return (R.r2-R.r1)*Math.exp((R.r1+R.r2)*t); if(R.kind==='rep') return Math.exp(2*R.r*t); return R.be*Math.exp(2*R.al*t); };
  const val = W(t0); need(Math.abs(val)<1e5 && Math.abs(val)>1e-4);
  const desc = R.kind==='real' ? `y₁ = ${expS(R.r1)||'1'}, y₂ = ${expS(R.r2)||'1'}` : R.kind==='rep' ? `y₁ = ${expS(R.r)}, y₂ = t${expS(R.r)}` : `y₁ = ${expS(R.al)}${R.al?' ':''}${trigS(R.be,'c')}, y₂ = ${expS(R.al)}${R.al?' ':''}${trigS(R.be,'s')}`;
  const exact = Number.isInteger(val);
  return { prompt:`<p>Compute the Wronskian W[y₁, y₂](${dn(t0)}) for ${desc}${exact?'':' (to 3 decimal places)'}. (A nonzero value shows they are linearly independent solutions.)</p>`, kind:'num', answer: exact?val:r6(val),
    hint:'W = y₁y₂′ − y₁′y₂.', solution:`<p>W(t) = y₁y₂′ − y₁′y₂ = ${R.kind==='real'?`(${R.r2} − ${fsp(R.r1)})e<sup>${R.r1+R.r2}t</sup>`:R.kind==='rep'?`e<sup>${2*R.r}t</sup>`:`${R.be}e<sup>${2*R.al}t</sup>`}. At t = ${dn(t0)}: ${exact?val:val.toFixed(4)} ≠ 0, so {y₁, y₂} is a fundamental set.</p>`, _d:{fns:H.f, t0} };
}),
];

// ================================================================ 54-13  Nagle 9.1, 9.4–9.6
function expm2(P, D, Pi, t){ // P diag(e^{D t}) P^{-1}, floats
  const n = P.length; const E = D.map(d=>Math.exp(d*t));
  return P.map((row,i)=>Array.from({length:n},(_,j)=>row.reduce((s,p,k)=>s+p*E[k]*Pi[k][j].toNum(),0)));
}
const mvF = (A,v)=>A.map(row=>row.reduce((s,a,k)=>s+a*v[k],0));
G['54-13'] = [
mk('54-13-convert','54-13',0,r=>{
  const lead = r.pick([1,1,2]); const co = [r.int(-5,5), r.int(-5,5), r.int(-5,5)]; need(co.some(x=>x));
  const A = [[F0,F1,F0],[F0,F0,F1],[fr(-co[2],lead), fr(-co[1],lead), fr(-co[0],lead)]];
  return { prompt:`<p>Convert ${lin([lead,...co],['y‴','y″','y′','y'])} = 0 to a first-order system x′ = Ax with x₁ = y, x₂ = y′, x₃ = y″. Enter A row by row (9 entries).</p>`, kind:'list', answer: ansL(A.flat()),
    hint:'x₁′ = x₂, x₂′ = x₃, and x₃′ = y‴ solved from the equation (divide by the leading coefficient!).',
    solution:`<p>x₁′ = x₂, x₂′ = x₃, x₃′ = y‴ = ${lin([fr(-co[2],lead),fr(-co[1],lead),fr(-co[0],lead)],['x₁','x₂','x₃'])}. So A = ${mat(A)} (companion matrix).</p>`, _d:{lead, co} };
}),
mk('54-13-convert-system','54-13',0,r=>{
  const p = r.int(-4,4), q = rnz(r,-4,4), s = r.int(-4,4), u = rnz(r,-4,4), e = r.int(-3,3), f = r.int(-3,3);
  // x'' = p x + q y + e x' ;  y'' = u x + s y + f y'
  const A = [[0,1,0,0],[p,e,q,0],[0,0,0,1],[u,0,s,f]];
  return { prompt:`<p>Write the coupled system x″ = ${lin([p,e,q],['x','x′','y'])}, &nbsp; y″ = ${lin([u,s,f],['x','y','y′'])} as a first-order system z′ = Az with z = (x, x′, y, y′). Enter A row by row (16 entries).</p>`, kind:'list', answer: A.flat(),
    hint:'Introduce z₁ = x, z₂ = x′, z₃ = y, z₄ = y′; then z₁′ = z₂, z₃′ = z₄, and z₂′, z₄′ come from the equations.',
    solution:`<p>z₁′ = z₂; z₂′ = x″ = ${lin([p,e,q],['z₁','z₂','z₃'])}; z₃′ = z₄; z₄′ = y″ = ${lin([u,s,f],['z₁','z₃','z₄'])}. A = ${mat(A)}.</p>`, _d:{p,q,s,u,e,f} };
}),
mk('54-13-wronskian','54-13',1,r=>{
  const {A,P,D} = diagMat(r,2,{amax:10}); const v1 = P.map(x=>x[0]), v2 = P.map(x=>x[1]); const t0 = r.pick([0,0,1,0.5,-1]);
  const dv = det(P).n; const W = dv*Math.exp((D[0]+D[1])*t0); need(Math.abs(W)<1e6);
  const ex = Number.isInteger(W);
  return { prompt:`<p>x₁(t) = ${expS(D[0])||''}${tup(v1)} and x₂(t) = ${expS(D[1])||''}${tup(v2)} are solutions of x′ = Ax for A = ${mat(A)}. Compute their Wronskian W(t) = det[x₁(t) x₂(t)] at t = ${dn(t0)}${ex?'':' (to 3 decimal places)'}.</p>`, kind:'num', answer: ex?W:r6(W),
    hint:'W(t) = det[x₁ x₂] = e^{(λ₁+λ₂)t}·det[v₁ v₂]. Nonzero ⇒ fundamental set.',
    solution:`<p>W(t) = e<sup>${D[0]+D[1]}t</sup>·det${mat(P)} = ${dv}e<sup>${D[0]+D[1]}t</sup>; at t = ${dn(t0)}: ${ex?W:W.toFixed(4)}. Never zero ⇒ x₁, x₂ form a fundamental set (fundamental matrix X(t) = [x₁ x₂]).</p>`, _d:{v1,v2,l:D,t0} };
}),
mk('54-13-verify','54-13',1,r=>{
  const {A,P,D} = diagMat(r,2,{amax:10}); const kind = r.pick(['true','true','swap','wrongr']); const j = r.int(0,1);
  let lam = D[j], v = P.map(x=>x[j]*(r.bool()?1:-1));
  if(kind==='swap') lam = D[1-j]; if(kind==='wrongr'){ lam = D[j] + r.pick([1,-1,2]); need(!D.includes(lam)); }
  const Av = imv(A,v); const truth = Av.every((x,i)=>x===lam*v[i]);
  return { prompt:`<p>True or false: x(t) = ${expS(lam)||''}${tup(v)} is a solution of x′ = Ax, A = ${mat(A)}.</p>`, kind:'tf', answer: truth,
    hint:'x = e^{λt}v solves x′ = Ax ⇔ λe^{λt}v = e^{λt}Av ⇔ Av = λv.',
    solution:`<p>x′ = ${fs(lam)}e<sup>${fs(lam)}t</sup>v and Ax = e<sup>${fs(lam)}t</sup>Av with Av = ${tup(Av)}, while ${fs(lam)}v = ${tup(v.map(x=>lam*x))}. ${truth?'Equal ⇒ TRUE.':'Not equal ⇒ FALSE (the eigenvalue and eigenvector must match).'}</p>`, _d:{A,lam,v} };
}),
mk('54-13-ivp-coef','54-13',2,r=>{
  const {A,P,D} = diagMat(r,2,{amax:10}); const s = [rnz(r,-2,2), rnz(r,-2,2)]; const V = P.map(row=>row.map((x,j)=>x*s[j]));
  const c = [rnz(r,-3,3), r.int(-3,3)]; const x0 = imv(V,c);
  return { prompt:`<p>A = ${mat(A)} has eigenvalues ${fs(D[0])}, ${fs(D[1])} with eigenvectors v₁ = ${tup(V.map(x=>x[0]))}, v₂ = ${tup(V.map(x=>x[1]))}. The solution of x′ = Ax, x(0) = ${tup(x0)} is x(t) = c₁${expS(D[0])||''}v₁ + c₂${expS(D[1])||''}v₂. Find c₁, c₂.</p>`, kind:'list', answer:c,
    hint:'At t = 0 the exponentials are 1: solve c₁v₁ + c₂v₂ = x(0).', solution:`<p>[v₁ v₂ | x(0)] = ${aug(V,x0)} ⇒ c₁ = ${c[0]}, c₂ = ${c[1]}.</p>`, _d:{A,V,l:D,x0} };
}),
mk('54-13-ivp-value','54-13',2,r=>{
  const n = r.int(2,3); const {A,P,D,Pi} = diagMat(r,n,{vals:[-3,-2,-1,1,2],amax:10}); const x0 = rvec(r,n,-3,3); need(x0.some(x=>x));
  const t1 = r.pick([0.5,1]); const X = expm2(P,D,inv(P),t1); const xt = mvF(X,x0); const k = r.int(0,n-1); need(Math.abs(xt[k])<1e5);
  const c = fmv(inv(P),x0);
  return { prompt:`<p>Solve x′ = Ax, x(0) = ${tup(x0)}, where A = ${mat(A)} (eigenvalues ${D.slice().sort((a,b)=>a-b).map(fs).join(', ')}). Give component ${k+1} of x(${t1}) to 3 decimal places.</p>`, kind:'num', answer: r6(xt[k]),
    hint:'Find an eigenvector for each eigenvalue, write x(0) = Σcᵢvᵢ, then x(t) = Σcᵢe^{λᵢt}vᵢ.',
    solution:`<p>Eigenvectors (columns of P = ${mat(P)}) for λ = ${D.map(fs).join(', ')}. x(0) = ${c.map((ci,i)=>fsp(ci)+'v'+sub(i+1)).join(' + ')}. So x(t) = ${c.map((ci,i)=>fsp(ci)+'e<sup>'+fs(D[i])+'t</sup>v'+sub(i+1)).join(' + ')}; at t = ${t1}, component ${k+1} ≈ ${xt[k].toFixed(4)}.</p>`, _d:{A,x0,t1,k} };
}),
mk('54-13-repeated-full','54-13',3,r=>{
  const [l,m] = r.sample([-2,-1,1,2],2); const {A,P} = diagMat(r,3,{D:[l,l,m],amax:12}); const x0 = rvec(r,3,-3,3); need(x0.some(x=>x));
  const t1 = r.pick([0.5,1]); const xt = mvF(expm2(P,[l,l,m],inv(P),t1),x0); const k = r.int(0,2);
  const Ml = A.map((row,i)=>row.map((x,j)=>x-(i===j?l:0)));
  return { prompt:`<p>A = ${mat(A)} has a double eigenvalue λ = ${fs(l)} and a simple eigenvalue ${fs(m)}. Solve x′ = Ax, x(0) = ${tup(x0)}, and give component ${k+1} of x(${t1}) to 3 decimal places.</p>`, kind:'num', answer: r6(xt[k]),
    hint:'Check dim Nul(A − λI): if it is 2 you get two independent eigenvectors and x = c₁e^{λt}v₁ + c₂e^{λt}v₂ + c₃e^{μt}v₃ — no t·e^{λt} terms needed.',
    solution:`<p>A − ${fsp(l)}I = ${mat(Ml)} has rank 1 ⇒ eigenspace for ${fs(l)} is 2-dimensional (full). Eigenvectors: columns of ${mat(P)}. Expanding x(0) in this basis and attaching e<sup>λt</sup> to each term gives component ${k+1} of x(${t1}) ≈ ${xt[k].toFixed(4)}.</p>`, _d:{A,x0,t1,k} };
}),
mk('54-13-repeated-tf','54-13',3,r=>{
  const jordan = r.bool(); const [l,m] = r.sample([-2,-1,1,2,3],2); const {A} = diagMat(r,3,{D:[l,l,m],jordan,amax:12});
  return { prompt:`<p>A = ${mat(A)} has characteristic polynomial −(${lin([1,-l],['λ',''])})²(${lin([1,-m],['λ',''])}). True or false: every solution of x′ = Ax has the form x = c₁${expS(l)}v₁ + c₂${expS(l)}v₂ + c₃${expS(m)}v₃ with v₁, v₂, v₃ eigenvectors (no t·${expS(l)} terms).</p>`, kind:'tf', answer: !jordan,
    hint:'This works exactly when the eigenspace of the double eigenvalue is 2-dimensional (a full set of eigenvectors).',
    solution:`<p>rank(A − ${fsp(l)}I) = ${jordan?2:1} ⇒ eigenspace dimension ${jordan?1:2}. ${jordan?'Only one eigenvector for λ = '+fs(l)+' ⇒ a generalized eigenvector and a t·e^{λt} term are needed. FALSE.':'Two independent eigenvectors ⇒ the pure-exponential form gives a fundamental set. TRUE.'}</p>`, _d:{A,l} };
}),
mk('54-13-complex-value','54-13',4,r=>{
  const al = r.int(-2,1), be = r.int(1,3); const P = randUnimod(r,2,3); const Pi = inv(P).map(x=>x.map(y=>y.n));
  const A = imul(imul(P,[[al,-be],[be,al]]),Pi); need(maxAbs(A)<=12);
  const x0 = rvec(r,2,-3,3); need(x0.some(x=>x)); const t1 = r.pick([0.5,1]); const k = r.int(0,1);
  const ct = Math.cos(be*t1), st = Math.sin(be*t1), ea = Math.exp(al*t1); const E = [[ea*ct,-ea*st],[ea*st,ea*ct]];
  const y0 = imv(Pi,x0); const yt = mvF(E,y0); const xval = mvF(P,yt);
  return { prompt:`<p>Solve x′ = Ax, x(0) = ${tup(x0)}, where A = ${mat(A)} (eigenvalues ${fs(al)} ± ${be===1?'':be}i). Give component ${k+1} of x(${t1}) to 3 decimal places.</p>`, kind:'num', answer: r6(xval[k]),
    hint:'Take an eigenvector v = a + ib for λ = α + iβ; the real solutions are e^{αt}(a cos βt − b sin βt) and e^{αt}(a sin βt + b cos βt). Fit x(0).',
    solution:`<p>Real fundamental solutions come from Re and Im of e<sup>(${cxS(al,be)})t</sup>v. Equivalently A = PCP⁻¹ with P = ${mat(P)}, C = ${mat([[al,-be],[be,al]])}, and e<sup>Ct</sup> = e<sup>${al}t</sup>[cos ${be}t, −sin ${be}t; sin ${be}t, cos ${be}t]. x(t) = P e<sup>Ct</sup>P⁻¹x(0); component ${k+1} at t = ${t1} ≈ ${xval[k].toFixed(4)}.</p>`, _d:{A,x0,t1,k} };
}),
mk('54-13-complex-real','54-13',4,r=>{
  const al = r.int(-2,2), be = r.int(1,3); const P = randUnimod(r,2,3); const Pi = inv(P).map(x=>x.map(y=>y.n));
  const A = imul(imul(P,[[al,-be],[be,al]]),Pi); need(maxAbs(A)<=12 && A[0][1]!==0);
  // eigenvector (1, w) for λ = α + iβ : (a11 − λ) + a12 w = 0 ⇒ w = (λ − a11)/a12
  const wr = fr(al-A[0][0], A[0][1]), wi = fr(be, A[0][1]);
  const t1 = r.pick([0.5,1]); const comp = 1;
  const x1 = t => [Math.exp(al*t)*Math.cos(be*t), Math.exp(al*t)*(wr.toNum()*Math.cos(be*t)-wi.toNum()*Math.sin(be*t))];
  const val = x1(t1)[comp];
  return { prompt:`<p>For A = ${mat(A)} take the eigenvalue λ = ${cxS(al,be)} and its eigenvector of the form v = (1, w). Let x₁(t) = Re(e<sup>λt</sup>v), a real solution of x′ = Ax. Give component ${comp+1} of x₁(${t1}) to 3 decimal places.</p>`, kind:'num', answer: r6(val),
    hint:'First row of (A − λI)v = 0 gives w. Then e^{λt}v = e^{αt}(cos βt + i sin βt)(1, w); take the real part.',
    solution:`<p>(${fs(A[0][0])} − λ)·1 + ${fsp(A[0][1])}w = 0 ⇒ w = (λ − ${fsp(A[0][0])})/${fsp(A[0][1])} = ${fs(wr)} + ${fsp(wi)}i. Re(e<sup>λt</sup>v) = ${expS(al)}(cos ${be}t, ${fs(wr)}cos ${be}t − ${fsp(wi)}sin ${be}t). At t = ${t1}: component ${comp+1} ≈ ${val.toFixed(4)}.</p>`, _d:{A,al,be,t1,comp} };
}),
mk('54-13-long-term','54-13',5,r=>{
  const cls = r.pick(['saddle','sink','source','spsink','spsource','center']); let A;
  if(['saddle','sink','source'].includes(cls)){ const vals = cls==='saddle'?[r.pick([-3,-2,-1]), r.pick([1,2,3])] : cls==='sink'? r.sample([-4,-3,-2,-1],2) : r.sample([1,2,3,4],2); A = diagMat(r,2,{D:vals,amax:12}).A; }
  else { const al = cls==='spsink'?r.int(-3,-1):cls==='spsource'?r.int(1,3):0; const be = r.int(1,3); const P = randUnimod(r,2,3); const Pi = inv(P).map(x=>x.map(y=>y.n)); A = imul(imul(P,[[al,-be],[be,al]]),Pi); need(maxAbs(A)<=12); }
  const L = { saddle:'Saddle point (unstable; most solutions blow up)', sink:'Nodal sink (all solutions → 0, no spiraling)', source:'Nodal source (all nonzero solutions blow up, no spiraling)', spsink:'Spiral sink (solutions spiral into 0)', spsource:'Spiral source (solutions spiral outward)', center:'Center (closed orbits)' };
  const o = mc(r, L[cls], r.sample(Object.values(L).filter(x=>x!==L[cls]),4));
  const tr = A[0][0]+A[1][1], dt = A[0][0]*A[1][1]-A[0][1]*A[1][0];
  return { prompt:`<p>Classify the origin for x′ = Ax, A = ${mat(A)}.</p>`, kind:'mc', ...o,
    hint:'Eigenvalues from λ² − (tr)λ + det = 0. Real opposite signs → saddle; real same sign → node; complex → spiral (Re λ ≠ 0) or center (Re λ = 0).',
    solution:`<p>trace = ${tr}, det = ${dt}, discriminant = ${tr*tr-4*dt}. ${tr*tr-4*dt>=0?'Real eigenvalues '+((tr+Math.sqrt(tr*tr-4*dt))/2)+', '+((tr-Math.sqrt(tr*tr-4*dt))/2):'Complex eigenvalues with real part '+fs(fr(tr,2))}. ⇒ ${L[cls]}.</p>`, _d:{A, cls, label:L[cls]} };
}),
mk('54-13-decay','54-13',5,r=>{
  const ln = r.pick([-3,-2,-1]), lp = r.pick([1,2,3]); const {A,P} = diagMat(r,2,{D:[ln,lp],amax:12});
  const v = P.map(x=>x[0]); need(v[0]!==0); const h = fr(v[1],v[0]);
  return { prompt:`<p>For x′ = Ax with A = ${mat(A)} (eigenvalues ${fs(ln)} and ${fs(lp)}), find h such that the solution with x(0) = (1, h) tends to 0 as t → ∞.</p>`, kind:'num', answer: ans(h),
    hint:'x(t) = c₁e^{λ₁t}v₁ + c₂e^{λ₂t}v₂ → 0 only if the coefficient of the growing mode is 0, i.e. x(0) lies on the eigenvector line of the NEGATIVE eigenvalue.',
    solution:`<p>Eigenvector for λ = ${ln}: (A − ${fsp(ln)}I)v = 0 ⇒ v ∥ ${tup(v)}. x(0) = (1, h) must be a multiple of it: h = ${fs(v[1])}/${fsp(v[0])} = ${fs(h)}. Then x(t) = e<sup>${ln}t</sup>(1, h) → 0; any other h excites the e<sup>${lp}t</sup> mode (saddle).</p>`, _d:{A, ln} };
}),
];

// ================================================================ 54-14  Nagle 10.3–10.4  (f ~ a₀/2 + Σ aₙcos(nπx/L) + bₙsin(nπx/L))
// piecewise quadratic pieces: {x0,x1, c:[q,m,r]} meaning q + m x + r x² on (x0,x1)
function pieceInt(p, w, kind){ // ∫_{x0}^{x1} f(x)·cos(wx) or sin(wx) or 1
  const [q,m,rr] = [p.c[0]||0, p.c[1]||0, p.c[2]||0];
  const F_ = x => { if(kind==='one') return q*x + m*x*x/2 + rr*x*x*x/3;
    const s = Math.sin(w*x), c = Math.cos(w*x);
    if(kind==='cos') return (q+m*x+rr*x*x)*s/w + (m+2*rr*x)*c/(w*w) - 2*rr*s/(w*w*w);
    return -(q+m*x+rr*x*x)*c/w + (m+2*rr*x)*s/(w*w) + 2*rr*c/(w*w*w); };
  return F_(p.x1) - F_(p.x0);
}
function fourierCoef(pieces, L, which, n){ // which: 'a0' | 'a' | 'b'
  const w = n*Math.PI/L; let s = 0;
  for(const p of pieces) s += pieceInt(p, w, which==='a0'?'one':which==='a'?'cos':'sin');
  return s/L;
}
function kA(j,L){ if(L===Math.PI) return (j===1?'':j)+'x'; if(j%L===0) return (j/L===1?'':j/L)+'πx'; return (j===1?'':j)+'πx/'+L; }
function nA(L){ return L===Math.PI?'nx':L===1?'nπx':'nπx/'+L; }
function Ls(L){ return L===Math.PI ? 'π' : fs(L); }
function xS(v, L){ // display a breakpoint value
  if(L!==Math.PI) return fs(new F(Math.round(v*4),4));
  const k = Math.round(v/Math.PI*2); return k===0?'0':k===2?'π':k===-2?'−π':k===1?'π/2':k===-1?'−π/2':fs(fr(k,2))+'π';
}
function pieceS(p){ return poly(p.c.map(x=>x||0),'x'); }
function pwS(pieces, L){ return '<table class="mat" style="border:none">'+pieces.map(p=>`<tr><td style="text-align:left">${pieceS(p)}</td><td style="text-align:left">, &nbsp;${xS(p.x0,L)} &lt; x &lt; ${xS(p.x1,L)}</td></tr>`).join('')+'</table>'; }
const pEv = (p,x)=>(p.c[0]||0)+(p.c[1]||0)*x+(p.c[2]||0)*x*x;
function randPieces(r, L, opts){
  opts = opts||{}; const cuts = r.pick(opts.halfOnly?[[0,L]]:[[-L,0,L],[-L,0,L],[-L,-L/2,L/2,L],[-L,L/2,L]]);
  const pieces = []; for(let i=0;i+1<cuts.length;i++){ const kind = r.pick(opts.const?['c']:['c','c','lin']); pieces.push({x0:cuts[i], x1:cuts[i+1], c: kind==='c'?[r.int(-4,4)]:[r.int(-3,3), rnz(r,-2,2)]}); }
  return pieces;
}
G['54-14'] = [
mk('54-14-fs-coef','54-14',0,r=>{
  const L = r.pick([Math.PI, 1, 2]); const pieces = randPieces(r,L); need(pieces.some(p=>p.c.some(x=>x)));
  const which = r.pick(['a0','a','b','b','a']); const n = which==='a0'?0:r.int(1,5);
  const v = fourierCoef(pieces,L,which,n); need(Math.abs(v)>1e-9 || r.int(0,4)===0);
  const nm = which==='a0'?'a₀':(which==='a'?'a':'b')+sub(n);
  return { prompt:`<p>Let f be defined on [−${Ls(L)}, ${Ls(L)}] by</p>f(x) = ${pwS(pieces,L)}<p>with Fourier series a₀/2 + Σ [aₙcos(${nA(L)}) + bₙsin(${nA(L)})]. Find ${nm} to 3 decimal places.</p>`, kind:'num', answer: Math.abs(v)<1e-9?0:r6(v),
    hint:`aₙ = (1/L)∫₋L^L f(x)cos(nπx/L)dx, bₙ = (1/L)∫₋L^L f(x)sin(nπx/L)dx, a₀ = (1/L)∫₋L^L f(x)dx — split the integral at the breakpoints.`,
    solution:`<p>${nm} = (1/${Ls(L)})·[${pieces.map(p=>'∫'+'('+xS(p.x0,L)+' to '+xS(p.x1,L)+') ('+pieceS(p)+')'+(which==='a0'?'':which==='a'?' cos('+kA(n,L)+')':' sin('+kA(n,L)+')')+' dx').join(' + ')}]. Integrating each piece (by parts for the linear pieces) gives ${nm} ≈ ${v.toFixed(5)}.</p>`, _d:{L,pieces,which,n} };
}),
mk('54-14-fs-poly','54-14',0,r=>{
  const L = r.pick([Math.PI,1,2]); const c = [r.int(-3,3), r.int(-3,3), rnz(r,-2,2)]; const pieces = [{x0:-L,x1:L,c}];
  const which = r.pick(['a','b','a0']); const n = which==='a0'?0:r.int(1,4); if(which==='b') need(c[1]!==0);
  const v = fourierCoef(pieces,L,which,n); const nm = which==='a0'?'a₀':(which==='a'?'a':'b')+sub(n);
  return { prompt:`<p>Find ${nm} (to 3 decimal places) in the Fourier series a₀/2 + Σ [aₙcos(${nA(L)}) + bₙsin(${nA(L)})] of f(x) = ${pieceS(pieces[0])} on [−${Ls(L)}, ${Ls(L)}].</p>`, kind:'num', answer: r6(v),
    hint:'Split f into even part (constant and x² terms → only aₙ) and odd part (x term → only bₙ). Integrate by parts (twice for x²).',
    solution:`<p>Even part ${poly([c[0],0,c[2]],'x')} contributes to a's; odd part ${poly([0,c[1]],'x')} to b's. Useful formulas on [−L, L]: for x², aₙ = 4L²(−1)ⁿ/(n²π²), a₀ = 2L²/3; for x, bₙ = 2L(−1)ⁿ⁺¹/(nπ); constants only affect a₀. Result: ${nm} ≈ ${v.toFixed(5)}.</p>`, _d:{L,pieces,which,n} };
}),
mk('54-14-even-odd','54-14',1,r=>{
  const k = r.int(1,3), c = rnz(r,-3,3), A = rnz(r,-3,3);
  const POOL = [
    {t:`f(x) = x³ ${c<0?'+':'−'} ${Math.abs(c)}x`, f:x=>x**3-c*x, cls:'odd'},
    {t:`f(x) = |x| ${c<0?'−':'+'} ${Math.abs(c)}`, f:x=>Math.abs(x)+c, cls:'even'},
    {t:`f(x) = x² sin(${k===1?'':k}x)`, f:x=>x*x*Math.sin(k*x), cls:'odd'},
    {t:`f(x) = x cos(${k===1?'':k}x)`, f:x=>x*Math.cos(k*x), cls:'odd'},
    {t:`f(x) = x|x|`, f:x=>x*Math.abs(x), cls:'odd'},
    {t:`f(x) = x² ${c<0?'−':'+'} ${Math.abs(c)}x`, f:x=>x*x+c*x, cls:'both'},
    {t:`f(x) = e<sup>x</sup>`, f:x=>Math.exp(x), cls:'both'},
    {t:`f(x) = ${fs(A)} for −π &lt; x &lt; 0, ${fs(-A)} for 0 &lt; x &lt; π`, f:x=>x<0?A:-A, cls:'odd'},
    {t:`f(x) = ${fs(A)} for −π &lt; x &lt; 0, ${fs(A+c)} for 0 &lt; x &lt; π`, f:x=>x<0?A:A+c, cls:(A+c===-A)?'odd':'both'},
    {t:`f(x) = x sin(${k===1?'':k}x) ${c<0?'−':'+'} ${Math.abs(c)}`, f:x=>x*Math.sin(k*x)+c, cls:'even'},
    {t:`f(x) = cos²(${k===1?'':k}x)`, f:x=>Math.cos(k*x)**2, cls:'even'},
  ];
  const P = r.pick(POOL);
  const Lb = { odd:'Only sine terms (a₀ and every aₙ are 0)', even:'Only cosine terms and a₀/2 (every bₙ is 0)', both:'Both sine and cosine terms appear', zero:'No terms at all: every coefficient is 0' };
  const o = mc(r, Lb[P.cls], Object.values(Lb).filter(x=>x!==Lb[P.cls]));
  return { prompt:`<p>Without computing any integrals, describe the Fourier series of ${P.t} on [−π, π].</p>`, kind:'mc', ...o,
    hint:'Odd f ⇒ aₙ = 0 (all n, including a₀). Even f ⇒ bₙ = 0. Check f(−x) against f(x) and −f(x).',
    solution:`<p>f(−x) ${P.cls==='odd'?'= −f(x): f is odd, so f·cos is odd and integrates to 0 ⇒ sine series':P.cls==='even'?'= f(x): f is even, so f·sin is odd and integrates to 0 ⇒ cosine series (plus a₀/2)':'is neither f(x) nor −f(x): f is neither even nor odd, so both kinds of terms appear'}. ${Lb[P.cls]}.</p>`, _d:{f:P.f, cls:P.cls, label:Lb[P.cls]} };
}),
mk('54-14-symmetry-coef','54-14',1,r=>{
  const L = r.pick([Math.PI,1,2]); const sym = r.pick(['odd','even']); const A = rnz(r,-4,4), m = rnz(r,-3,3), q = r.int(-3,3);
  let pieces;
  if(sym==='odd') pieces = r.bool() ? [{x0:-L,x1:0,c:[-A]},{x0:0,x1:L,c:[A]}] : [{x0:-L,x1:0,c:[-q, m]},{x0:0,x1:L,c:[q, m]}];
  else pieces = r.bool() ? [{x0:-L,x1:0,c:[q,-m]},{x0:0,x1:L,c:[q,m]}] : [{x0:-L,x1:-L/2,c:[0]},{x0:-L/2,x1:L/2,c:[A]},{x0:L/2,x1:L,c:[0]}];
  const which = r.pick(['a','b']); const n = r.int(1,5); const v = fourierCoef(pieces,L,which,n);
  if(Math.abs(v)<1e-9 && ((sym==='odd'&&which==='b')||(sym==='even'&&which==='a'))) throw RETRY;
  const nm = (which==='a'?'a':'b')+sub(n); const zero = Math.abs(v)<1e-9;
  return { prompt:`<p>f(x) = </p>${pwS(pieces,L)}<p>on [−${Ls(L)}, ${Ls(L)}]. Find the Fourier coefficient ${nm} (to 3 decimal places; it may be 0).</p>`, kind:'num', answer: zero?0:r6(v),
    hint:'Check symmetry first: odd f ⇒ aₙ = 0 and bₙ = (2/L)∫₀^L f sin; even f ⇒ bₙ = 0 and aₙ = (2/L)∫₀^L f cos.',
    solution:`<p>f is ${sym}. ${zero?`So ${nm} = 0 by symmetry (the integrand is odd).`:`So ${nm} = (2/${Ls(L)})∫₀^${Ls(L)} f(x)${which==='a'?'cos':'sin'}(${kA(n,L)})dx ≈ ${v.toFixed(5)}.`}</p>`, _d:{L,pieces,which,n} };
}),
mk('54-14-converge','54-14',2,r=>{
  const L = r.pick([1,2,3,4]); const pieces = randPieces(r,L); need(pieces.some(p=>p.c.some(x=>x)));
  const bps = [...new Set(pieces.flatMap(p=>[p.x0,p.x1]))];
  const kind = r.pick(['jump','end','end','interior']);
  let x0; if(kind==='jump'){ const inner = bps.filter(b=>b>-L&&b<L); x0 = r.pick(inner); } else if(kind==='end') x0 = r.pick([-L,L]); else { const p = r.pick(pieces); x0 = (p.x0+p.x1)/2; }
  const fAt = (x,side)=>{ // one-sided limit with periodic extension
    let y = x; if(side>0 && y>=L) y -= 2*L; if(side<0 && y<=-L) y += 2*L;
    const p = pieces.find(pp=> side>0 ? (y>=pp.x0 && y<pp.x1) : (y>pp.x0 && y<=pp.x1)); return fr(Math.round(pEv(p,y)*4),4); };
  const lo = fAt(x0,-1), hi = fAt(x0,1); const val = lo.add(hi).div(2); if(kind!=='interior') need(!lo.eq(hi)); need(new Set(pieces.map(p=>p.c.join(','))).size>1);
  return { prompt:`<p>f(x) = </p>${pwS(pieces,L)}<p>on [−${L}, ${L}], extended periodically with period ${2*L}. To what value does the Fourier series of f converge at x = ${xS(x0,L)}?</p>`, kind:'num', answer: ans(val),
    hint:'At every point the series converges to [f(x⁻) + f(x⁺)]/2. At x = ±L use the periodic extension: average f(L⁻) and f(−L⁺).',
    solution:`<p>Left limit f(${xS(x0,L)}⁻) = ${fs(lo)}${Math.abs(x0)===L?' (from the '+(x0>0?'right end of the interval':'periodic copy: f(L⁻)')+')':''}, right limit f(${xS(x0,L)}⁺) = ${fs(hi)}${Math.abs(x0)===L?' (periodic extension)':''}. Average: (${fs(lo)} + ${fsp(hi)})/2 = ${fs(val)}.${lo.eq(hi)?' (f is continuous there, so it is just f(x).)':''}</p>`, _d:{L,pieces,x0} };
}),
mk('54-14-converge-ext','54-14',2,r=>{
  const L = r.pick([1,2,3,4]); const typ = r.pick(['sine','cosine']); const two = r.bool();
  const pieces = two ? [{x0:0,x1:L/2,c:[r.int(-3,3), r.int(-2,2)]},{x0:L/2,x1:L,c:[r.int(-4,4)]}] : [{x0:0,x1:L,c:[r.int(-3,3), rnz(r,-2,2)]}];
  const pts = [0, L, -L/2, L/2, -L, -L/4]; const x0 = r.pick(pts);
  const fOn = (y,side)=>{ const p = pieces.find(pp=> side>0 ? (y>=pp.x0 && y<pp.x1) : (y>pp.x0 && y<=pp.x1)); return fr(Math.round(pEv(p,y)*4),4); };
  const ext = (x,side)=>{ // odd/even extension on (−L, L), periodic 2L
    let y = x; if(side>0 && y>=L) y -= 2*L; if(side<0 && y<=-L) y += 2*L;
    if(y>0 || (y===0 && side>0)) return fOn(y,side);
    const v = fOn(-y,-side); return typ==='sine' ? v.neg() : v; };
  const lo = ext(x0,-1), hi = ext(x0,1); const val = lo.add(hi).div(2);
  return { prompt:`<p>f is defined on [0, ${L}] by</p>${pwS(pieces,L)}<p>To what value does the <b>${typ}</b> series of f (period ${2*L}) converge at x = ${xS(x0,L)}?</p>`, kind:'num', answer: ans(val),
    hint:`The ${typ} series is the Fourier series of the ${typ==='sine'?'ODD':'EVEN'} 2L-periodic extension of f; take the average of the one-sided limits of that extension.`,
    solution:`<p>Use the ${typ==='sine'?'odd':'even'} extension f̃(−x) = ${typ==='sine'?'−':''}f(x), then extend with period ${2*L}. At x = ${xS(x0,L)}: f̃(x⁻) = ${fs(lo)}, f̃(x⁺) = ${fs(hi)}, average = ${fs(val)}.${typ==='sine'&&(x0===0||Math.abs(x0)===L)?' (A sine series always gives 0 at x = 0 and x = ±L.)':''}</p>`, _d:{L,pieces,typ,x0} };
}),
mk('54-14-half-range-coef','54-14',3,r=>{
  const L = r.pick([Math.PI,1,2]); const typ = r.pick(['cos','sin']); const two = r.bool();
  const pieces = two ? [{x0:0,x1:L/2,c:[r.int(-3,3)]},{x0:L/2,x1:L,c:[r.int(-3,3), rnz(r,-2,2)]}] : [{x0:0,x1:L,c:[r.int(-3,3), rnz(r,-2,2)]}];
  need(pieces.some(p=>p.c.some(x=>x)));
  const n = r.int(1,5); const w = n*Math.PI/L; const v = (2/L)*pieces.reduce((s,p)=>s+pieceInt(p,w,typ==='cos'?'cos':'sin'),0);
  need(Math.abs(v)>1e-9);
  const nm = (typ==='cos'?'a':'b')+sub(n);
  return { prompt:`<p>f(x) = </p>${pwS(pieces,L)}<p>on [0, ${Ls(L)}]. Find the coefficient ${nm} of its <b>${typ==='cos'?'cosine':'sine'} series</b> f ~ ${typ==='cos'?'a₀/2 + Σ aₙcos('+nA(L)+')':'Σ bₙsin('+nA(L)+')'}, to 3 decimal places.</p>`, kind:'num', answer: r6(v),
    hint:`Half-range ${typ==='cos'?'cosine':'sine'} series: ${nm.replace(/[₀-₉]/g,'')}ₙ = (2/L)∫₀^L f(x)${typ==='cos'?'cos':'sin'}(nπx/L)dx (the ${typ==='cos'?'even':'odd'} extension doubles the half-integral).`,
    solution:`<p>${nm} = (2/${Ls(L)})∫₀^${Ls(L)} f(x)${typ==='cos'?'cos':'sin'}(${kA(n,L)})dx, split at the breakpoints and integrate by parts: ${nm} ≈ ${v.toFixed(5)}.</p>`, _d:{L,pieces,typ,n} };
}),
mk('54-14-half-range-a0','54-14',3,r=>{
  const L = r.pick([1,2,3,4]); const two = r.bool();
  const pieces = two ? [{x0:0,x1:L/2,c:[r.int(-3,3)]},{x0:L/2,x1:L,c:[r.int(-3,3), rnz(r,-2,2)]}] : [{x0:0,x1:L,c:[r.int(-3,3), rnz(r,-2,2)]}];
  // a0/2 = (1/L)∫0^L f  — exact
  let I = F0; for(const p of pieces){ const P_ = x=>F.of(p.c[0]||0).mul(x).add(F.of(p.c[1]||0).mul(x).mul(x).div(2)); I = I.add(P_(fr(Math.round(p.x1*2),2)).sub(P_(fr(Math.round(p.x0*2),2)))); }
  const val = I.div(L);
  return { prompt:`<p>f(x) = </p>${pwS(pieces,L)}<p>on [0, ${L}]. In its cosine series a₀/2 + Σ aₙcos(${nA(L)}), find the constant term a₀/2.</p>`, kind:'num', answer: ans(val),
    hint:'a₀ = (2/L)∫₀^L f(x)dx, so a₀/2 is the average value of f on [0, L].',
    solution:`<p>∫₀^${L} f(x)dx = ${fs(I)}, so a₀ = (2/${L})·${fsp(I)} = ${fs(I.mul(2).div(L))} and a₀/2 = ${fs(val)} (the average of f).</p>`, _d:{L,pieces} };
}),
mk('54-14-numeric-series','54-14',4,r=>{
  const fam = r.pick(['x2end','x2zero','abs','x','step']); const k = r.pick([1,2,3,4,6,8]);
  let series, point, target, termF, start=1, exact, steps;
  if(fam==='x2end'){ series='x² = π²/3 + 4 Σ<sub>n≥1</sub> (−1)ⁿ cos(nx)/n² on [−π, π]'; point='x = π'; termF=n=>k/(n*n); target=`Σ<sub>n=1</sub><sup>∞</sup> ${k}/n²`; exact=k*Math.PI**2/6; steps=`At x = π: π² = π²/3 + 4Σ(−1)ⁿ(−1)ⁿ/n² = π²/3 + 4Σ1/n² ⇒ Σ1/n² = π²/6`; }
  else if(fam==='x2zero'){ series='x² = π²/3 + 4 Σ<sub>n≥1</sub> (−1)ⁿ cos(nx)/n² on [−π, π]'; point='x = 0'; termF=n=>k*(n%2?1:-1)/(n*n); target=`Σ<sub>n=1</sub><sup>∞</sup> ${k===1?'':k}(−1)ⁿ⁺¹/n²`; exact=k*Math.PI**2/12; steps=`At x = 0: 0 = π²/3 + 4Σ(−1)ⁿ/n² ⇒ Σ(−1)ⁿ⁺¹/n² = π²/12`; }
  else if(fam==='abs'){ series='|x| = π/2 − (4/π) Σ<sub>n odd</sub> cos(nx)/n² on [−π, π]'; point='x = 0'; termF=n=>k/((2*n-1)**2); target=`Σ<sub>n=1</sub><sup>∞</sup> ${k}/(2n − 1)²`; exact=k*Math.PI**2/8; steps=`At x = 0 (f continuous): 0 = π/2 − (4/π)Σ1/(2n−1)² ⇒ Σ1/(2n−1)² = π²/8`; }
  else if(fam==='x'){ series='x = 2 Σ<sub>n≥1</sub> (−1)ⁿ⁺¹ sin(nx)/n on (−π, π)'; point='x = π/2'; termF=n=>k*((n-1)%2?-1:1)/(2*n-1); target=`Σ<sub>n=1</sub><sup>∞</sup> ${k===1?'':k}(−1)ⁿ⁺¹/(2n − 1)`; exact=k*Math.PI/4; steps=`At x = π/2: sin(nπ/2) = 0 for even n and alternates ±1 for odd n, so π/2 = 2(1 − 1/3 + 1/5 − …) ⇒ Σ(−1)ⁿ⁺¹/(2n−1) = π/4`; }
  else { series='f(x) = 0 (−π &lt; x &lt; 0), 1 (0 &lt; x &lt; π) has Fourier series 1/2 + (2/π) Σ<sub>n odd</sub> sin(nx)/n'; point='x = π/2'; termF=n=>k*((n-1)%2?-1:1)/(2*n-1); target=`Σ<sub>n=1</sub><sup>∞</sup> ${k===1?'':k}(−1)ⁿ⁺¹/(2n − 1)`; exact=k*Math.PI/4; steps=`At x = π/2 (f continuous, f = 1): 1 = 1/2 + (2/π)(1 − 1/3 + 1/5 − …) ⇒ Σ(−1)ⁿ⁺¹/(2n−1) = π/4`; }
  if(r.bool() && fam!=='x' && fam!=='step'){ start = 2; exact -= termF(1); target = target.replace('n=1','n=2'); }
  return { prompt:`<p>Given ${series}, evaluate ${target} by plugging a suitable point into the series. Give the value to 3 decimal places.</p>`, kind:'num', answer: r6(exact),
    hint:`Plug in ${point} (check that f is continuous there, or use the average at a jump), then isolate the numerical series.`,
    solution:`<p>${steps}. Multiply by ${k}${start===2?' and subtract the n = 1 term ('+fnum(termF(1))+')':''}: ${target} = ${exact.toFixed(5)}.</p>`, _d:{termF, start, fam, k} };
}),
mk('54-14-orthogonality','54-14',5,r=>{
  const L = r.pick([1,2,3,Math.PI]); const kind = r.pick(['cc','ss','cs','sq']);
  const m = r.int(1,4); const n = r.bool()?m:r.int(1,4);
  let txt, val, f;
  const arg = j=>kA(j,L);
  if(kind==='cc'){ txt=`∫₋${Ls(L)}^${Ls(L)} cos(${arg(m)}) cos(${arg(n)}) dx`; val = m===n?L:0; f=x=>Math.cos(m*Math.PI*x/L)*Math.cos(n*Math.PI*x/L); }
  else if(kind==='ss'){ txt=`∫₋${Ls(L)}^${Ls(L)} sin(${arg(m)}) sin(${arg(n)}) dx`; val = m===n?L:0; f=x=>Math.sin(m*Math.PI*x/L)*Math.sin(n*Math.PI*x/L); }
  else if(kind==='cs'){ txt=`∫₋${Ls(L)}^${Ls(L)} cos(${arg(m)}) sin(${arg(n)}) dx`; val = 0; f=x=>Math.cos(m*Math.PI*x/L)*Math.sin(n*Math.PI*x/L); }
  else { const a = r.int(-3,3), b = rnz(r,-3,3), c = rnz(r,-3,3); const p = r.int(1,3); let q = r.int(1,3);
    txt=`∫₋${Ls(L)}^${Ls(L)} [${lin([a,b,c],['',`cos(${arg(p)})`,`sin(${arg(q)})`])}]² dx`; val = 2*L*a*a + L*b*b + L*c*c; f=x=>(a+b*Math.cos(p*Math.PI*x/L)+c*Math.sin(q*Math.PI*x/L))**2; }
  const isPi = L===Math.PI;
  return { prompt:`<p>Evaluate ${txt}${isPi&&val!==0?' (to 3 decimal places)':''}.</p>`, kind:'num', answer: isPi?r6(val):val,
    hint:'On [−L, L]: ∫cos(mπx/L)cos(nπx/L) = ∫sin·sin = L if m = n ≥ 1, else 0; ∫cos·sin = 0 always; ∫1² = 2L. Expand squares and use these.',
    solution:`<p>${kind==='sq'?'Expanding the square, all cross terms integrate to 0 by orthogonality; the squared terms give 2L·(const)² + L·(cos coeff)² + L·(sin coeff)²':'By orthogonality of the trigonometric system'}: value = ${isPi?(val/Math.PI)+'π ≈ '+val.toFixed(4):val}.</p>`, _d:{f, L} };
}),
mk('54-14-orth-coef','54-14',5,r=>{
  const m = r.int(1,3), n = r.int(1,3), p = rnz(r,-3,3), q = r.int(-3,3), s = rnz(r,-3,3), u = r.int(-3,3);
  // f(x) = (p cos(mx) + q)(s sin(nx) + u) on [−π, π]
  const f = x => (p*Math.cos(m*x)+q)*(s*Math.sin(n*x)+u);
  // expand: ps cos(mx)sin(nx) + pu cos(mx) + qs sin(nx) + qu ; cos(mx)sin(nx) = [sin((n+m)x) + sin((n−m)x)]/2
  const a = new Map(), b = new Map(); const add=(M,j,v)=>M.set(j,(M.get(j)||F0).add(v));
  add(a,0,F.of(2*q*u)); add(a,m,F.of(p*u)); add(b,n,F.of(q*s)); add(b,n+m,fr(p*s,2)); if(n!==m){ const j=n-m; add(b,Math.abs(j),fr(p*s*Math.sign(j),2)); }
  const which = r.pick(['a','b','b']); const keys = [...(which==='a'?a:b).keys()].filter(j=>j>0 || which==='a'); const j = r.pick(keys.concat([r.int(1,6)]));
  const val = ((which==='a'?a:b).get(j)) || F0;
  const nm = (which==='a'?'a':'b')+sub(j);
  return { prompt:`<p>Find the Fourier coefficient ${nm} of f(x) = (${lin([p,q],[`cos(${m===1?'':m}x)`,''])})(${lin([s,u],[`sin(${n===1?'':n}x)`,''])}) on [−π, π] (convention a₀/2 + Σ aₙcos nx + bₙsin nx).</p>`, kind:'num', answer: ans(val),
    hint:'Do not integrate: expand f into a finite trig sum using cos A sin B = [sin(A+B) − sin(A−B)]/2; by orthogonality the coefficients are read off directly (remember a₀/2 is the constant term).',
    solution:`<p>f(x) = ${fs(q*u)} + ${fsp(p*u)}cos(${m}x) + ${fsp(q*s)}sin(${n}x) + ${fsp(fr(p*s,2))}[sin(${n+m}x) + sin(${n-m}x)]. Collecting terms (sin(−kx) = −sin(kx), sin 0 = 0) and matching with a₀/2 + Σ…: ${nm} = ${fs(val)}.</p>`, _d:{f, which, j} };
}),
];

// ================================================================ additional generators (second/third setups per type)
const range = n => Array.from({length:n},(_,i)=>i);
const CONS_L = { none:'No solution (inconsistent)', unique:'Exactly one solution', inf1:'Infinitely many solutions, with 1 free variable', inf2:'Infinitely many solutions, with 2 free variables', inf3:'Infinitely many solutions, with 3 free variables'};
G['54-1'].push(
mk('54-1-consistency-echelon','54-1',1,r=>{
  const outcome = r.pick(['none','unique','inf','inf']); const n = r.int(3,4); let piv;
  if(outcome==='unique') piv = range(n);
  else if(outcome==='none'){ piv = r.sample(range(n), r.int(1,n-1)).sort((a,b)=>a-b).concat([n]); }
  else piv = r.sample(range(n), r.int(1,n-1)).sort((a,b)=>a-b);
  const m = Math.max(piv.length, r.int(3,4)); need(m<=4);
  const M = Array.from({length:m},()=>Array(n+1).fill(0));
  piv.forEach((p,i)=>{ M[i][p]=rnz(r,-4,4); for(let j=p+1;j<=n;j++) M[i][j]=r.int(-5,5); });
  const A = M.map(x=>x.slice(0,n)), b = M.map(x=>x[n]); const rkA = piv.filter(p=>p<n).length;
  const correct = outcome==='none'?CONS_L.none : outcome==='unique'?CONS_L.unique : CONS_L['inf'+(n-rkA)];
  const o = mc(r, correct, [CONS_L.none,CONS_L.unique,CONS_L.inf1,CONS_L.inf2], [CONS_L.inf3]);
  const free = range(n).filter(j=>!piv.includes(j));
  return { prompt:`<p>An augmented matrix has been reduced to the echelon form</p>${aug(A,b)}<p>(${n} unknowns x₁…x${sub(n)}). How many solutions does the system have?</p>`, kind:'mc', ...o,
    hint:'No further row reduction is needed: look for a row [0 … 0 | nonzero], then count the variable columns that have no pivot.',
    solution:`<p>Pivot positions are in columns ${piv.map(p=>p===n?'(augmented)':p+1).join(', ')}. ${outcome==='none'?'A pivot in the augmented column means a row 0 = '+fs(M[piv.length-1][n])+': inconsistent.':outcome==='unique'?'Every variable column has a pivot and the augmented column has none: exactly one solution (back-substitute).':'Consistent; free variable(s) '+free.map(f=>'x'+sub(f+1)).join(', ')+' ⇒ infinitely many solutions.'} Answer: ${correct}.</p>`, _d:{A,b} };
}),
mk('54-1-tf-wide','54-1',5,r=>{
  const m = r.int(2,3), n = m + r.int(1,2), rk = r.int(1,m); const {A} = randRank(r,m,n,rk,8);
  let b; if(rk===m || r.bool()) b = imv(A, rvec(r,n,-2,2)); else { b = rvec(r,m,-6,6); need(rank(A.map((row,i)=>row.concat([b[i]])))>rk); }
  const cons = rank(A.map((row,i)=>row.concat([b[i]])))===rk;
  const {R} = rref(A.map((row,i)=>row.concat([b[i]])));
  return { prompt:`<p>The system with augmented matrix</p>${aug(A,b)}<p>has more unknowns (${n}) than equations (${m}). True or false: it has infinitely many solutions.</p>`, kind:'tf', answer: cons,
    hint:'More unknowns than equations guarantees a free variable — but only IF the system is consistent. Check for a row [0 … 0 | nonzero].',
    solution:`<p>RREF: ${mat(R,n)} ${cons?'No inconsistent row, and at least '+(n-rk)+' free variable(s) ⇒ infinitely many solutions. TRUE.':'There is a row [0 … 0 | nonzero] ⇒ NO solution. FALSE: "more unknowns than equations" does not by itself force solutions to exist.'}</p>`, _d:{A,b} };
}),
);

G['54-2'].push(
mk('54-2-tf-abstract','54-2',4,r=>{
  const kind = r.pick(['super','sub','subind','pairwise','count','span','zero']); const n = (kind==='sub'||kind==='subind') ? r.int(3,4) : r.int(2,4);
  const vs = k => range(k).map(i=>'v'+sub(i+1)).join(', ');
  let text, truth, why, k = 3;
  if(kind==='super'){ text=`If {${vs(3)}} in ℝ${sup(n)} is linearly dependent, then {${vs(4)}} is linearly dependent.`; truth=true; why='the dependence relation for v₁, v₂, v₃ (with weight 0 on v₄) is a nontrivial relation for the larger set.'; }
  else if(kind==='sub'){ text=`If {${vs(4)}} in ℝ${sup(n)} is linearly dependent, then {${vs(3)}} is linearly dependent.`; truth=false; why='counterexample: v₁, v₂, v₃ independent and v₄ = v₁ (or v₄ = 0).'; }
  else if(kind==='subind'){ text=`If {${vs(3)}} in ℝ${sup(n)} is linearly independent, then {${vs(2)}} is linearly independent.`; truth=true; why='a relation c₁v₁ + c₂v₂ = 0 would also be a relation for the three vectors (c₃ = 0), forcing c₁ = c₂ = 0.'; k=3; }
  else if(kind==='pairwise'){ text=`If no vector in {${vs(3)}} ⊂ ℝ${sup(n)} is a multiple of another, then the set is linearly independent.`; truth=false; why='counterexample: v₁ = e₁, v₂ = e₂, v₃ = e₁ + e₂ (pairwise non-parallel but v₃ = v₁ + v₂).'; }
  else if(kind==='count'){ k = r.pick([n, n+1, n+2, n-1].filter(x=>x>=1)); text=`Every set of ${k} vectors in ℝ${sup(n)} is linearly dependent.`; truth = k>n; why = truth?`${k} > ${n}: more vectors than entries ⇒ a free variable in [v₁ … v${sub(k)}].`:`the first ${k} standard basis vectors are independent.`; }
  else if(kind==='span'){ k = r.pick([n-1,n,n+1].filter(x=>x>=1)); text=`Some set of ${k} vector${k>1?'s':''} spans ℝ${sup(n)}.`; truth = k>=n; why = truth?`e.g. e₁, …, e${sub(n)}${k>n?' together with any other vector':''}.`:`spanning ℝ${sup(n)} needs a pivot in each of the ${n} rows of [v₁ … v${sub(k)}], hence at least ${n} columns; ${k} < ${n}.`; }
  else { k = r.int(2,4); text=`Any set of ${k} vectors in ℝ${sup(n)} that contains the zero vector is linearly dependent.`; truth=true; why='1·0 = 0 is a nontrivial dependence relation.'; }
  return { prompt:`<p>True or false: ${text}</p>`, kind:'tf', answer: truth, hint:'For a FALSE statement produce a counterexample; for a TRUE one recall the theorem (supersets of dependent sets, Theorem 8, zero vector).',
    solution:`<p>${truth?'TRUE':'FALSE'}: ${why}</p>`, _d:{kind,n,k} };
}),
);

const IMT_POOL = n => [
  ['A is row equivalent to the identity matrix', true, 'rowI'], ['the rows of A are linearly independent', true, 'rowsInd'],
  [`Ax = b has a unique solution for every b in ℝ${sup(n)}`, true, 'unique'], ['Ax = 0 has a nontrivial solution', false, 'nontriv'],
  ['Aᵀ is invertible', true, 'Atinv'], [`there is a b in ℝ${sup(n)} for which Ax = b has no solution`, false, 'nosol'],
  ['the columns of A form a linearly independent set', true, 'colsInd'], [`the columns of A form a basis of ℝ${sup(n)}`, true, 'basis'],
  ['the equation Ax = 0 has a free variable', false, 'free'], ['there is a nonzero x with Aᵀx = 0', false, 'AtNul'],
  [`x ↦ Ax maps ℝ${sup(n)} onto ℝ${sup(n)}`, true, 'onto'], ['there is a matrix D with AD = I', true, 'rightInv'] ];
G['54-3'].push(
mk('54-3-imt-concrete','54-3',4,r=>{
  const n = 3; const invt = r.bool(); let A;
  if(invt){ A = Array.from({length:3},()=>rvec(r,3,-4,4)); need(!det(A).isZero() && A.flat().filter(x=>x===0).length<=2); }
  else { A = randRank(r,3,3,2,8).A; need(A.flat().filter(x=>x===0).length<=2); }
  const chosen = r.sample(IMT_POOL(n),5); const d = det(A);
  return { prompt:`<p>Let A = ${mat(A)}. Select <b>all</b> statements that are true for this A.</p>`, kind:'multi', choices: chosen.map(p=>p[0]), answer: chosen.map((p,i)=>(p[1]===invt)?i:-1).filter(i=>i>=0),
    hint:'Decide ONE thing — is A invertible (det ≠ 0 / 3 pivots)? — then the IMT settles every statement at once.',
    solution:`<p>det A = ${fs(d)} ⇒ A is ${invt?'invertible':'singular (rank 2)'}. Hence:</p><ul>${chosen.map(p=>'<li>'+p[0]+' — '+((p[1]===invt)?'TRUE':'FALSE')+'</li>').join('')}</ul>`, _d:{A, ids: chosen.map(p=>p[2])} };
}),
mk('54-3-tf-zeroprod','54-3',5,r=>{
  const u = rvec(r,2,-3,3), w = rvec(r,2,-3,3); need(u.some(x=>x) && w.some(x=>x));
  const A = [[u[0]*w[0],u[0]*w[1]],[u[1]*w[0],u[1]*w[1]]];
  const z = rvec(r,2,-3,3); need(z.some(x=>x)); let nv;
  if(r.bool()){ const g = gcd(w[0],w[1]); nv = [-w[1]/g, w[0]/g].map(x=>x*rnz(r,-2,2)); } else { nv = rvec(r,2,-3,3); need(nv.some(x=>x)); }
  const B = [[nv[0]*z[0],nv[0]*z[1]],[nv[1]*z[0],nv[1]*z[1]]]; need(maxAbs(A)<=9 && maxAbs(B)<=9);
  const which = r.pick(['AB','BA']); const P = which==='AB'?imul(A,B):imul(B,A); const zero = P.flat().every(x=>x===0);
  return { prompt:`<p>Let A = ${mat(A)} and B = ${mat(B)} (both nonzero). True or false: ${which==='AB'?'AB':'BA'} = 0.</p>`, kind:'tf', answer: zero,
    hint:'Just multiply. For matrices, a product can be 0 with neither factor 0 (unlike numbers), and AB = 0 does not imply BA = 0.',
    solution:`<p>${which} = ${mat(P)}. ${zero?'TRUE — a product of two NONZERO matrices can be the zero matrix (each column of the right factor lies in the null space of the left one).':'FALSE.'}</p>`, _d:{A,B,which} };
}),
);

G['54-4'].push(
mk('54-4-props-solve','54-4',2,r=>{
  const n = r.int(2,4), a = rnz(r,-4,4), b = rnz(r,-3,3), c = r.pick([2,-1,-2,3]);
  const tp = r.pick([
    { disp:(cs)=>`det(${cs}Aᵀ B⁻¹)`, f:[{M:'A',t:1,e:1},{M:'B',t:0,e:-1}] },
    { disp:(cs)=>`det(${cs}A⁻¹ Bᵀ)`, f:[{M:'A',t:0,e:-1},{M:'B',t:1,e:1}] },
    { disp:(cs)=>`det(${cs}A³ B)`, f:[{M:'A',t:0,e:3},{M:'B',t:0,e:1}] },
  ]);
  const pw = (x,e)=>{ let y=F1; for(let t=0;t<Math.abs(e);t++) y=y.mul(x); return e<0?F1.div(y):y; };
  let v = pw(F.of(c),n); for(const f of tp.f) v = v.mul(pw(F.of(f.M==='A'?a:b), f.e));
  const cs = c===-1?'−':(c<0?'−'+(-c):String(c));
  return { prompt:`<p>A and B are ${n}×${n} matrices with det B = ${fs(b)} and ${tp.disp(cs)} = ${fs(v)}. Find det A.</p>`, kind:'num', answer: a,
    hint:`Write the given determinant in terms of det A using det(cM) = cⁿdet M (n = ${n}), det(Mᵀ) = det M, det(M⁻¹) = 1/det M; then solve.`,
    solution:`<p>${tp.disp(cs)} = (${fs(c)})${sup(n)}·${tp.f.map(f=>'(det '+f.M+')'+(f.e===1?'':sup(f.e))).join('·')} = ${fs(pw(F.of(c),n))}·${tp.f.map(f=>f.M==='A'?'(det A)'+(f.e===1?'':sup(f.e)):'('+fs(b)+')'+(f.e===1?'':sup(f.e))).join('·')}. Setting this equal to ${fs(v)} and solving: det A = ${fs(a)}.</p>`, _d:{n,b,c,f:tp.f,v:v.toNum()} };
}),
);

G['54-5'].push(
mk('54-5-nul-equations','54-5',1,r=>{
  const m = r.int(2,3), n = 5; const {A} = randRank(r,m,n,m,6); const {free, vecs, R} = nullBasis(A); const k = r.int(0,free.length-1);
  return { prompt:`<p>Let H = {x ∈ ℝ⁵ : ${A.map(row=>lin(row,xs(5))+' = 0').join(', &nbsp;')}}. H is a subspace (it is Nul A for the coefficient matrix). Find a basis of H by the free-variable method and enter the basis vector belonging to <b>x${sub(free[k]+1)}</b>.</p>`,
    kind:'list', answer: ansL(vecs[k]), hint:'Write the coefficient matrix, row reduce, solve for basic variables, and read off one vector per free variable.',
    solution:`<p>Coefficient matrix ${mat(A)} ~ ${mat(R)}. Free variables ${free.map(f=>'x'+sub(f+1)).join(', ')}; basis of H: {${vecs.map(tup).join(', ')}}, dim H = ${free.length}.</p>`, _d:{A, free, fj:free[k]} };
}),
mk('54-5-col-span-set','54-5',1,r=>{
  const rk = r.int(2,3); const {A, piv} = randRank(r,4,5,rk,9); const V = T_(A);
  return { prompt:`<p>Let v₁ = ${tup(V[0])}, v₂ = ${tup(V[1])}, v₃ = ${tup(V[2])}, v₄ = ${tup(V[3])}, v₅ = ${tup(V[4])}. Find a basis for W = Span{v₁,…,v₅} consisting of some of the vᵢ, using the pivot columns of [v₁ … v₅]. Enter the indices i of the vectors you keep.</p>`,
    kind:'list', unordered:true, answer: piv.map(p=>p+1), hint:'W = Col[v₁ … v₅]. Row reduce; the vectors in pivot positions (taken from the ORIGINAL list) form a basis.',
    solution:`<p>RREF[v₁ … v₅] = ${mat(rref(A).R)}. Pivot columns ${piv.map(p=>p+1).join(', ')} ⇒ basis {${piv.map(p=>'v'+sub(p+1)).join(', ')}}, dim W = ${rk}. The others are combinations of earlier vectors (read the weights from the RREF).</p>`, _d:{A} };
}),
mk('54-5-subspace-param','54-5',0,r=>{
  const [s,t] = r.sample([-4,-3,-2,-1,0,1,2,3,4,5],2); const a=rnz(r,-4,4), b=r.int(-4,4), c=r.int(-4,4);
  const rhs = lin([1,-(s+t),s*t],['k²','k','']);
  return { prompt:`<p>For which values of k is S = {(x, y, z) ∈ ℝ³ : ${lin([a,b,c],['x','y','z'])} = ${rhs}} a subspace of ℝ³? Enter all such k.</p>`, kind:'list', unordered:true, answer:[s,t],
    hint:'A plane ax + by + cz = d is a subspace exactly when it passes through 0, i.e. d = 0.',
    solution:`<p>S contains 0 ⇔ ${rhs} = 0 ⇔ (k ${s<0?'+ '+(-s):'− '+s})(k ${t<0?'+ '+(-t):'− '+t}) = 0 ⇔ k = ${s} or k = ${t}. For those k, S = Nul[${[a,b,c].map(fs).join(' ')}] is a subspace; otherwise 0 ∉ S.</p>`, _d:{s,t} };
}),
mk('54-5-tf-sets','54-5',4,r=>{
  const st = r.pick(['cent','amn','dot','union']); let text, truth, why; const d = {st};
  if(st==='cent'){ const M = [rvec(r,2,-3,3), rvec(r,2,-3,3)]; text=`{A ∈ M₂ₓ₂ : AM = MA}, where M = ${mat(M)}, is a subspace of M₂ₓ₂.`; truth=true; why='0 commutes with M, and if A, B commute with M so do A + B and cA. (It is the kernel of the linear map A ↦ AM − MA.)'; }
  else if(st==='amn'){ const M = [rvec(r,2,-3,3), rvec(r,2,-3,3)]; const N = [rvec(r,2,-3,3), rvec(r,2,-3,3)]; need(N.flat().some(x=>x)); d.N=N; text=`{A ∈ M₂ₓ₂ : AM = N}, where M = ${mat(M)} and N = ${mat(N)}, is a subspace of M₂ₓ₂.`; truth=false; why='the zero matrix gives 0·M = 0 ≠ N, so 0 is not in the set.'; }
  else if(st==='dot'){ const u = rvec(r,3,-3,3); need(u.some(x=>x)); const c = r.bool()?0:rnz(r,-5,5); d.c=c; text=`{x ∈ ℝ³ : x·${tup(u)} = ${fs(c)}} is a subspace of ℝ³.`; truth = c===0; why = c===0?'it is the orthogonal complement of '+tup(u)+' (a plane through 0).':'x = 0 gives 0 ≠ '+fs(c)+'.'; }
  else { const u = rvec(r,2,-3,3); need(u.some(x=>x)); const v = r.bool()? u.map(x=>x*rnz(r,-2,2)) : rvec(r,2,-3,3); need(v.some(x=>x)); d.u=u; d.v=v; truth = u[0]*v[1]-u[1]*v[0]===0;
    text=`Span{${tup(u)}} ∪ Span{${tup(v)}} is a subspace of ℝ².`; why = truth?'the two vectors are parallel, so both spans are the same line through 0.':`it is two different lines; ${tup(u)} + ${tup(v)} = ${tup([u[0]+v[0],u[1]+v[1]])} lies on neither, so it is not closed under addition.`; }
  return { prompt:`<p>True or false: ${text}</p>`, kind:'tf', answer: truth, hint:'Test 0 ∈ H first; then closure under + and scalars (unions are the usual trap: they are rarely closed under +).',
    solution:`<p>${truth?'TRUE':'FALSE'}: ${why}</p>`, _d:d };
}),
);

G['54-6'].push(
mk('54-6-rank-param','54-6',2,r=>{
  const r1 = rvec(r,4,-4,4), r2 = rvec(r,4,-4,4); need(rank([r1,r2])===2); const al = rnz(r,-2,2), be = rnz(r,-2,2); const j = r.int(0,3);
  const r3 = r1.map((x,i)=>al*x+be*r2[i]); const h0 = r3[j]; need(maxAbs([r3])<=12); need(rank([r1,r2,range(4).map(i=>i===j?1:0)])===3);
  const disp = [r1.map(fs), r2.map(fs), r3.map((x,i)=>i===j?'h':fs(x))];
  return { prompt:`<p>Let A = ${mat(disp)}. A has rank 3 except for one value of h. Find that value of h, and dim Nul A for that h. Enter: h, dim Nul A.</p>`, kind:'list', answer:[h0, 2],
    hint:'Row 3 depends on the h-entry. Eliminate rows 1–2 from row 3: rank drops to 2 exactly when row 3 becomes 0. Then use rank + dim Nul A = 4.',
    solution:`<p>R₃ − (${fs(al)})R₁ − (${fs(be)})R₂ leaves only the entry h − ${fsp(h0)} in column ${j+1}. So rank A = 2 ⇔ h = ${fs(h0)} (else 3). Then dim Nul A = 4 − 2 = 2.</p>`, _d:{r1,r2,r3,j} };
}),
mk('54-6-rank-consequence','54-6',2,r=>{
  const sc = r.pick(['allb','trivial','nulk']); let m, n, rk, text;
  if(sc==='allb'){ m = r.int(3,7); n = m + r.int(0,4); rk = m; text = `A is ${m}×${n} and Ax = b is consistent for every b in ℝ${sup(m)}.`; }
  else if(sc==='trivial'){ n = r.int(3,7); m = n + r.int(0,4); rk = n; text = `A is ${m}×${n} and Ax = 0 has only the trivial solution.`; }
  else { m = r.int(3,8); n = r.int(3,8); const k = r.int(Math.max(1,n-m), n-1); rk = n-k; text = `A is ${m}×${n} and the solution set of Ax = 0 is spanned by ${k} linearly independent vectors.`; }
  const ask = r.pick(['rank','nul','nulT','row']); const val = {rank:rk, nul:n-rk, nulT:m-rk, row:rk}[ask]; const Q = {rank:'rank A', nul:'dim Nul A', nulT:'dim Nul Aᵀ', row:'dim Row A'}[ask];
  return { prompt:`<p>${text} Find ${Q}.</p>`, kind:'num', answer: val,
    hint:'Translate the hypothesis into a rank: consistent for all b ⇔ pivot in every row (rank = m); only trivial solution ⇔ pivot in every column (rank = n); dim Nul A = n − rank.',
    solution:`<p>${sc==='allb'?'Pivot in every row ⇒ rank A = '+m:sc==='trivial'?'Pivot in every column ⇒ rank A = '+n:'dim Nul A = '+(n-rk)+' ⇒ rank A = '+n+' − '+(n-rk)+' = '+rk}. Then dim Nul A = ${n-rk}, dim Row A = ${rk}, dim Nul Aᵀ = ${m} − ${rk} = ${m-rk}. ${Q} = ${val}.</p>`, _d:{sc,m,n,rk,ask} };
}),
mk('54-6-tf-concrete','54-6',4,r=>{
  const rk = r.int(2,4); const {A} = randRank(r,4,5,rk,8); const st = r.pick(['nul','colR4','row','nulT']); const k = r.pick([rk-1,rk,rk+1,5-rk,4-rk]);
  let text, truth;
  if(st==='nul'){ text=`dim Nul A = ${k}`; truth = k===5-rk; } else if(st==='colR4'){ text='Col A = ℝ⁴'; truth = rk===4; } else if(st==='row'){ text=`dim Row A = ${k}`; truth = k===rk; } else { text=`dim Nul Aᵀ = ${k}`; truth = k===4-rk; }
  return { prompt:`<p>Let A = ${mat(A)}. True or false: ${text}.</p>`, kind:'tf', answer: truth, hint:'Row reduce to find rank A; then dim Row = dim Col = rank, dim Nul A = 5 − rank, dim Nul Aᵀ = 4 − rank.',
    solution:`<p>RREF(A) = ${mat(rref(A).R)} ⇒ rank A = ${rk}: dim Row A = ${rk}, dim Nul A = ${5-rk}, dim Nul Aᵀ = ${4-rk}, Col A ${rk===4?'=':'≠'} ℝ⁴. So "${text}" is ${truth?'TRUE':'FALSE'}.</p>`, _d:{A,st,k} };
}),
);

G['54-7'].push(
mk('54-7-power-limit','54-7',4,r=>{
  const P = randUnimod(r,2,3); const Pi = inv(P); const lam = r.pick([fr(1,2),fr(-1,2)]);
  const A = fmul(fmul(toF(P), [[F1,F0],[F0,lam]]), Pi); need(maxAbs(A)<=8);
  const Lm = fmul(fmul(toF(P), [[F1,F0],[F0,F0]]), Pi); const i = r.int(0,1), j = r.int(0,1);
  return { prompt:`<p>Let A = ${mat(A)}. Its eigenvalues are 1 and ${fs(lam)}. Find the (${i+1}, ${j+1}) entry of lim<sub>k→∞</sub> A<sup>k</sup>.</p>`, kind:'num', answer: ans(Lm[i][j]),
    hint:'Diagonalize A = PDP⁻¹; then Aᵏ = PDᵏP⁻¹ and Dᵏ → diag(1, 0) because |λ| < 1 for the second eigenvalue.',
    solution:`<p>Eigenvectors: for λ = 1, ${tup(P.map(x=>x[0]))}; for λ = ${fs(lam)}, ${tup(P.map(x=>x[1]))}. With P = ${mat(P)}, P⁻¹ = ${mat(Pi)}: lim Aᵏ = P·diag(1, 0)·P⁻¹ = ${mat(Lm)}. Entry (${i+1},${j+1}) = ${fs(Lm[i][j])}.</p>`, _d:{A:A.map(x=>x.map(y=>y.toNum())), i, j} };
}),
mk('54-7-similar-inv','54-7',5,r=>{
  const dg = rvec(r,3,-3,4); const B = [[dg[0], r.int(-3,3), r.int(-3,3)],[0,dg[1],r.int(-3,3)],[0,0,dg[2]]];
  const st = r.pick(['trace','det','eig','rank']); const tr = dg[0]+dg[1]+dg[2], dt = dg[0]*dg[1]*dg[2], rkB = rank(B);
  let v, text, truth;
  if(st==='trace'){ v = r.pick([tr, tr+1, tr-1, -tr]); text=`trace A = ${fs(v)}`; truth = v===tr; }
  else if(st==='det'){ v = r.pick([dt, dt+1, -dt, 2*dt]); text=`det A = ${fs(v)}`; truth = v===dt; }
  else if(st==='eig'){ v = r.pick([r.pick(dg), r.int(-3,4)]); text=`${fs(v)} is an eigenvalue of A`; truth = dg.includes(v); }
  else { v = r.pick([rkB, 3, 2]); text=`rank A = ${v}`; truth = v===rkB; }
  return { prompt:`<p>A is similar to B = ${mat(B)}. True or false: ${text}.</p>`, kind:'tf', answer: truth,
    hint:'Similar matrices share the characteristic polynomial (hence eigenvalues, trace, determinant) and the rank. B is triangular, so read its eigenvalues off the diagonal.',
    solution:`<p>B triangular ⇒ eigenvalues ${dg.map(fs).join(', ')}, trace ${tr}, det ${dt}; rank B = ${rkB}. A = PBP⁻¹ has the same invariants, so "${text}" is ${truth?'TRUE':'FALSE'}.</p>`, _d:{B,st,v} };
}),
);

G['54-8'].push(
mk('54-8-B-poly','54-8',1,r=>{
  const kind = r.pick(['pcp','shift','tap']); const a = rnz(r,-2,2), c = rnz(r,-3,3); let desc, f;
  if(kind==='pcp'){ desc=`T(p) = p′ ${c<0?'−':'+'} ${Math.abs(c)}p`; f=p=>pAdd(pDer(p), p.map(x=>x*c)); }
  else if(kind==='shift'){ desc=`T(p) = p(t ${a<0?'−':'+'} ${Math.abs(a)})`; f=p=>{ let o=[0]; let pw=[1]; for(let i=0;i<p.length;i++){ o=pAdd(o, pw.map(x=>x*p[i])); pw=pMul(pw,[a,1]); } return o; }; }
  else { desc=`T(p) = (t ${a<0?'−':'+'} ${Math.abs(a)})p′(t)`; f=p=>pMul([a,1], pDer(p)); }
  const M = T_(range(3).map(j=>pPad(f(eyeI(3)[j]),3)));
  const P = randUnimod(r,3,2); const bs = T_(P); need(bs.every(v=>v.some(x=>x)));
  const X = fmul(fmul(inv(P), M), P); need(maxAbs(X)<=20);
  return { prompt:`<p>Let T: ℙ₂ → ℙ₂, ${desc}, and B = {${bs.map(v=>poly(v)).join(', ')}}. Find the B-matrix [T]_B (row by row).</p>`, kind:'list', answer: ansL(X.flat()),
    hint:'Column j of [T]_B is [T(bⱼ)]_B. Or: [T]_B = P⁻¹MP with M the standard matrix of T and P the coordinate matrix of B.',
    solution:`<p>Standard matrix (basis 1, t, t²): M = ${mat(M)}. P = [[b₁] [b₂] [b₃]] = ${mat(P)}, P⁻¹ = ${mat(inv(P))}. [T]_B = P⁻¹MP = ${mat(X)}.</p>`, _d:{kind,a,c,P} };
}),
mk('54-8-complex-random','54-8',2,r=>{
  const A = [rvec(r,2,-5,5), rvec(r,2,-5,5)]; const tr = A[0][0]+A[1][1], dt = A[0][0]*A[1][1]-A[0][1]*A[1][0]; need(tr*tr-4*dt<0 && tr%2!==0);
  const re = fr(tr,2);
  return { prompt:`<p>A = ${mat(A)} has a pair of complex eigenvalues λ, λ̄. Find Re λ and |λ|². Enter both.</p>`, kind:'list', answer: ansL([re, F.of(dt)]),
    hint:'λ + λ̄ = 2 Re λ = trace A and λλ̄ = |λ|² = det A — no square roots needed.',
    solution:`<p>Characteristic polynomial λ² − ${fsp(tr)}λ + ${fsp(dt)}; discriminant ${tr*tr-4*dt} < 0. Re λ = trace/2 = ${fs(re)}, |λ|² = det A = ${dt}. (λ = ${fs(re)} ± (√${4*dt-tr*tr}/2)i.)</p>`, _d:{A} };
}),
mk('54-8-long-run-norm','54-8',4,r=>{
  const base = r.pick([[3,4],[4,3]]).map(x=>x*(r.bool()?1:-1)); const c = r.pick([4,6,10,5,3]);
  const A2 = [[fr(c*base[0],25), fr(-c*base[1],25)],[fr(c*base[1],25), fr(c*base[0],25)]];
  const x0 = r.pick([[3,4],[-4,3],[5,0],[0,-5],[6,8],[-8,6]]); const N = Math.hypot(x0[0],x0[1]); const k = r.int(2,5);
  let val = F.of(N); for(let t=0;t<k;t++) val = val.mul(fr(c,5));
  return { prompt:`<p>Let A = ${mat(A2)}, x₀ = ${tup(x0)} and x<sub>k+1</sub> = Ax<sub>k</sub>. Find ‖x${sub(k)}‖ (exact).</p>`, kind:'num', answer: ans(val),
    hint:'A = r·(rotation matrix) with r = √(a² + b²) = √det A. Rotations preserve length, so ‖Aᵏx₀‖ = rᵏ‖x₀‖.',
    solution:`<p>A has the form [a −b; b a] with a = ${fs(A2[0][0])}, b = ${fs(A2[1][0])}: r = √(a² + b²) = ${fs(fr(c,5))}. Each step rotates and scales by r, so ‖x${sub(k)}‖ = (${fs(fr(c,5))})${sup(k)}·${N} = ${fs(val)}. ${c<5?'(r < 1: spiral inward.)':c>5?'(r > 1: spiral outward.)':'(r = 1: stays on a circle.)'}</p>`, _d:{A:A2.map(x=>x.map(y=>y.toNum())), x0, k} };
}),
);

G['54-10'].push(
mk('54-10-gs-normalize','54-10',0,r=>{
  const M = orthonormal3(r); const a = rnz(r,-2,2), k = rnz(r,-2,2); const x1 = M[0], x2 = M[1].map((x,i)=>k*x+a*M[0][i]);
  const u2 = M[1].map(x=>fr(Math.sign(k)*x,3));
  return { prompt:`<p>Apply Gram–Schmidt to x₁ = ${tup(x1)}, x₂ = ${tup(x2)} and NORMALIZE, producing an orthonormal basis {u₁, u₂} of Span{x₁, x₂}. Enter u₂.</p>`, kind:'list', answer: ansL(u2),
    hint:'v₂ = x₂ − (x₂·x₁)/(x₁·x₁) x₁, then u₂ = v₂/‖v₂‖ (normalize at the end).',
    solution:`<p>x₂·x₁ = ${doti(x2,x1)}, x₁·x₁ = 9 ⇒ v₂ = x₂ − (${fs(fr(doti(x2,x1),9))})x₁ = ${tup(M[1].map(x=>k*x))}, ‖v₂‖ = ${3*Math.abs(k)}, u₂ = ${tup(u2)}. (u₁ = x₁/3.)</p>`, _d:{x1,x2} };
}),
mk('54-10-qr-Q','54-10',1,r=>{
  const M = orthonormal3(r); const Qi = T_(M.slice(0,2)); const Rp = [[r.int(1,3), r.int(-3,3)],[0, r.int(1,3)]]; const A = imul(Qi,Rp);
  const q2 = M[1].map(x=>fr(x,3));
  return { prompt:`<p>Find the QR factorization of A = ${mat(A)} (Q with orthonormal columns, R upper triangular with positive diagonal). Enter the <b>second column of Q</b>.</p>`, kind:'list', answer: ansL(q2),
    hint:'Q comes from Gram–Schmidt on the columns of A, normalized. R positive-diagonal fixes the signs.',
    solution:`<p>a₁ = ${tup(A.map(x=>x[0]))}, ‖a₁‖ = ${3*Rp[0][0]} ⇒ q₁ = ${tup(M[0].map(x=>fr(x,3)))}. v₂ = a₂ − (a₂·q₁)q₁ = ${tup(M[1].map(x=>x*Rp[1][1]))}, ‖v₂‖ = ${3*Rp[1][1]} ⇒ q₂ = ${tup(q2)}. (R = QᵀA = ${mat([[3*Rp[0][0],3*Rp[0][1]],[0,3*Rp[1][1]]])}.)</p>`, _d:{A} };
}),
mk('54-10-best-fit-trig','54-10',3,r=>{
  const xsv = [0,1,2,3]; const lbl = ['0','π/2','π','3π/2']; const X = [[1,1,0],[1,0,1],[1,-1,0],[1,0,-1]]; const ys = xsv.map(()=>r.int(-5,6));
  const XtX = imul(T_(X),X), Xty = imv(T_(X),ys); const beta = fmv(inv(XtX), Xty);
  return { prompt:`<p>Fit y = β₀ + β₁cos x + β₂sin x by least squares to the data (x, y): ${xsv.map((_,i)=>'('+lbl[i]+', '+fs(ys[i])+')').join(', ')}. Enter β₀, β₁, β₂.</p>`, kind:'list', answer: ansL(beta),
    hint:'Design matrix rows [1, cos xᵢ, sin xᵢ]. Here its columns are orthogonal, so XᵀX is diagonal.',
    solution:`<p>X = ${mat(X)}, y = ${tup(ys)}. XᵀX = ${mat(XtX)} (diagonal: orthogonal columns), Xᵀy = ${tup(Xty)} ⇒ β = ${tup(beta)}.</p>`, _d:{X, ys} };
}),
mk('54-10-unique-param','54-10',4,r=>{
  const c1 = rvec(r,3,-4,4); need(c1.filter(x=>x).length>=2); const k = rnz(r,-3,3); const j = r.int(0,2); need(c1[j]!==0);
  const c2 = c1.map(x=>k*x); const h0 = c2[j]; const disp = [0,1,2].map(i=>[fs(c1[i]), i===j?'h':fs(c2[i])]); const b = rvec(r,3,-5,5);
  return { prompt:`<p>Let A = ${mat(disp)}, b = ${tup(b)}. For which value of h does Ax = b fail to have a unique least-squares solution?</p>`, kind:'num', answer: h0,
    hint:'The least-squares solution is unique ⇔ the columns of A are linearly independent (⇔ AᵀA invertible).',
    solution:`<p>Column 2 matches ${fs(k)}·(column 1) in the other two entries, so the columns are dependent exactly when h = ${fs(k)}·${fsp(c1[j])} = ${fs(h0)}. Then AᵀA is singular and there are infinitely many least-squares solutions; for any other h they are unique.</p>`, _d:{c1,c2,j} };
}),
);

G['54-11'].push(
mk('54-11-sym-apply','54-11',2,r=>{
  const v1 = rvec(r,3,-2,2); need(v1.filter(x=>x).length>=2); const [l1,l2] = r.sample([-3,-2,-1,1,2,3,4],2); const x = rvec(r,3,-4,4);
  const c = fr(doti(x,v1), doti(v1,v1)); const out = x.map((xi,i)=>F.of(l2*xi).add(c.mul(v1[i]*(l1-l2))));
  return { prompt:`<p>A is a symmetric 3×3 matrix whose eigenvalues are ${fs(l1)} (with eigenvector v₁ = ${tup(v1)}) and ${fs(l2)} (with multiplicity 2). Without finding A, compute Ax for x = ${tup(x)}.</p>`, kind:'list', answer: ansL(out),
    hint:'Symmetric ⇒ the λ₂-eigenspace is exactly v₁⊥. Split x = (component along v₁) + (component ⟂ v₁) and apply A to each piece.',
    solution:`<p>Since A = Aᵀ, eigenvectors for ${fs(l2)} are orthogonal to v₁, and dimension 2 ⇒ the eigenspace is all of v₁⊥. x = c v₁ + w with c = x·v₁/v₁·v₁ = ${fs(c)}, w ⟂ v₁. Ax = ${fs(l1)}c v₁ + ${fs(l2)}w = ${fs(l2)}x + (${fs(l1)} − ${fsp(l2)})c v₁ = ${tup(out)}.</p>`, _d:{v1,l1,l2,x} };
}),
);

G['54-12'].push(
mk('54-12-find-ode-one','54-12',2,r=>{
  const R = pickRoots(r, r.pick(['rep','cx'])); const H = homInfo(R); const useSin = r.bool();
  const desc = R.kind==='rep' ? `y = t${expS(R.r)}` : `y = ${expS(R.al)}${R.al?' ':''}${trigS(R.be, useSin?'s':'c')}`;
  return { prompt:`<p>The single function ${desc} is a solution of y″ + by′ + cy = 0 (b, c real constants). Find b and c.</p>`, kind:'list', answer:[R.b, R.c],
    hint:R.kind==='rep'?'A t·e^{rt} solution only occurs when r is a DOUBLE root.':'e^{αt}cos βt or sin βt only occurs for the complex pair α ± βi (real coefficients ⇒ conjugate roots).',
    solution:`<p>${R.kind==='rep'?`t${expS(R.r)} ⇒ ${fs(R.r)} is a double root: (r − ${fsp(R.r)})²`:`⇒ roots ${fs(R.al)} ± ${R.be===1?'':R.be}i: (r − ${fsp(R.al)})² + ${R.be*R.be}`} = r² ${lin([R.b,R.c],['r',''])==='0'?'':'+ ('+lin([R.b,R.c],['r',''])+')'} ⇒ b = ${R.b}, c = ${R.c}.</p>`, _d:{fn: R.kind==='rep'?H.f[1]:H.f[useSin?1:0]} };
}),
);

G['54-14'].push(
mk('54-14-numeric-series-2','54-14',4,r=>{
  const fam = r.pick(['xcos','cubic','ppcos0','ppcosmid']); const k = r.pick([1,2,3,4,8]); let series, point, termF, exact, steps, target;
  if(fam==='xcos'){ series='the cosine series of f(x) = x on [0, π] is π/2 − (4/π) Σ<sub>n odd</sub> cos(nx)/n²'; point='x = 0'; termF=n=>k/((2*n-1)**2); target=`Σ<sub>n=1</sub><sup>∞</sup> ${k}/(2n − 1)²`; exact=k*Math.PI**2/8; steps='At x = 0 (the even extension |x| is continuous there): 0 = π/2 − (4/π)Σ1/(2n−1)² ⇒ Σ1/(2n−1)² = π²/8'; }
  else if(fam==='cubic'){ series='the sine series of f(x) = x(π − x) on [0, π] is (8/π) Σ<sub>n odd</sub> sin(nx)/n³'; point='x = π/2'; termF=n=>k*((n-1)%2?-1:1)/((2*n-1)**3); target=`Σ<sub>n=1</sub><sup>∞</sup> ${k===1?'':k}(−1)ⁿ⁺¹/(2n − 1)³`; exact=k*Math.PI**3/32; steps='At x = π/2: π²/4 = (8/π)(1 − 1/3³ + 1/5³ − …) ⇒ Σ(−1)ⁿ⁺¹/(2n−1)³ = π³/32'; }
  else if(fam==='ppcos0'){ series='the cosine series of f(x) = x(π − x) on [0, π] is π²/6 − Σ<sub>m≥1</sub> cos(2mx)/m²'; point='x = 0'; termF=n=>k/(n*n); target=`Σ<sub>m=1</sub><sup>∞</sup> ${k}/m²`; exact=k*Math.PI**2/6; steps='At x = 0: 0 = π²/6 − Σ1/m² ⇒ Σ1/m² = π²/6'; }
  else { series='the cosine series of f(x) = x(π − x) on [0, π] is π²/6 − Σ<sub>m≥1</sub> cos(2mx)/m²'; point='x = π/2'; termF=n=>k*(n%2?1:-1)/(n*n); target=`Σ<sub>m=1</sub><sup>∞</sup> ${k===1?'':k}(−1)ᵐ⁺¹/m²`; exact=k*Math.PI**2/12; steps='At x = π/2: cos(mπ) = (−1)ᵐ, so π²/4 = π²/6 − Σ(−1)ᵐ/m² ⇒ Σ(−1)ᵐ⁺¹/m² = π²/12'; }
  return { prompt:`<p>Given that ${series}, evaluate ${target} (to 3 decimal places) by evaluating the series at a suitable point.</p>`, kind:'num', answer: r6(exact),
    hint:`Try ${point}; the series converges to f there (f's extension is continuous at that point).`,
    solution:`<p>${steps}. Multiplying by ${k}: ${target} = ${exact.toFixed(5)}.</p>`, _d:{termF, start:1, fam, k} };
}),
);
})();
