/* gen61b.js — randomized, auto-graded exam-level question generators for CS 61B (units B-1 … B-15).
   Plain browser JS, no imports. Registers into globalThis.GEN['B-1'] … ['B-15'].
   Each question may carry two extra fields that the app can ignore:
     _chk  : the raw instance data (used by verify/test_gen61b.js for an independent re-computation)
     _java : { src, expect } a complete runnable Java program reproducing the question (B1/B3/B4/B11),
             expect = {kind:'out', out:'…'} | {kind:'compile'} | {kind:'cce'}  (checked by running Java). */
(function () {
  const G = (globalThis.GEN = globalThis.GEN || {});

  // ---------- generic helpers ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const code = s => '<pre class="code">' + esc(s) + '</pre>';
  const P = s => '<p>' + s + '</p>';
  const tt = s => '<code>' + esc(s) + '</code>';
  const range = (a, b) => { const o = []; for (let i = a; i < b; i++) o.push(i); return o; };
  const sum = a => a.reduce((x, y) => x + y, 0);
  const fmtArr = a => '[' + a.join(', ') + ']';
  const floorMod = (a, m) => ((a % m) + m) % m;
  const distinctInts = (r, k, lo, hi) => r.sample(range(lo, hi + 1), k);
  const THETAS = ['Θ(1)', 'Θ(log n)', 'Θ(√n)', 'Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(n² log n)', 'Θ(n³)', 'Θ(2ⁿ)', 'Θ(log² n)', 'Θ(n log² n)'];
  const THETA_N = ['Θ(1)', 'Θ(log N)', 'Θ(N)', 'Θ(N log N)', 'Θ(N²)', 'Θ(log² N)', 'Θ(√N)'];

  // Build an mc question body: correct string + wrong strings (deduped), padded from pad list.
  function mcq(r, correct, wrongs, pad, nChoices) {
    nChoices = nChoices || 4;
    const seen = new Set([correct]);
    let w = [];
    for (const x of wrongs) if (!seen.has(x)) { seen.add(x); w.push(x); }
    w = r.shuffle(w).slice(0, nChoices - 1);
    if (pad) for (const x of r.shuffle(pad)) { if (w.length >= nChoices - 1) break; if (!seen.has(x)) { seen.add(x); w.push(x); } }
    const choices = r.shuffle([correct].concat(w));
    return { choices, answer: choices.indexOf(correct) };
  }
  // multi-select from a list of {t: html, ok: bool}
  function multi(items) {
    return { choices: items.map(x => x.t), answer: items.map((x, i) => (x.ok ? i : -1)).filter(i => i >= 0) };
  }
  // escape any stray < or > in text that is not part of an allowed HTML tag
  const TAG_RE = /(<\/?(?:p|b|i|br|code|pre|sub|sup|table|tr|td|th|span|div|ul|li)(?: [^<>]*)?>)/;
  const san = s => String(s).split(TAG_RE).map((part, i) => (i % 2 ? part : part.replace(/</g, '&lt;').replace(/>/g, '&gt;'))).join('');
  function Q(o) {
    for (const k of ['prompt', 'solution', 'hint']) if (typeof o[k] === 'string') o[k] = san(o[k]);
    if (o.choices) o.choices = o.choices.map(san);
    return o;
  }
  function retry(r, f, n) {
    n = n || 500;
    for (let i = 0; i < n; i++) { const q = f(); if (q) return q; }
    throw new Error('retry exhausted');
  }
  const thetaAccept = {
    'Θ(1)': ['Θ(1)', '1', 'theta(1)', 'O(1)'],
    'Θ(log n)': ['Θ(log n)', 'log n', 'logn', 'log(n)', 'theta(log n)'],
    'Θ(n)': ['Θ(n)', 'n', 'theta(n)'],
    'Θ(n log n)': ['Θ(n log n)', 'n log n', 'nlogn', 'n*log(n)', 'n log(n)', 'theta(n log n)'],
    'Θ(n²)': ['Θ(n²)', 'n^2', 'n²', 'n*n', 'theta(n^2)'],
  };
  const NAMES = ['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kim', 'Lu', 'Max', 'Ned', 'Oz', 'Pia', 'Quin', 'Ray', 'Sue', 'Tom', 'Uma', 'Vic', 'Wes', 'Xia', 'Yul', 'Zoe'];

  // ---------- Java program assembly ----------
  const indent = (s, n) => s.split('\n').map(l => (l.length ? ' '.repeat(n) + l : l)).join('\n');
  function javaProg(mainBody, helpers, classes) {
    return 'public class Main {\n  public static void main(String[] args) {\n' + indent(mainBody, 4) +
      '\n  }\n' + (helpers ? indent(helpers, 2) + '\n' : '') + '}\n' + (classes || '');
  }
  const INTLIST_SRC = 'class IntList {\n  int first; IntList rest;\n  IntList(int f, IntList r) { first = f; rest = r; }\n' +
    '  static IntList of(int... xs) { IntList L = null; for (int i = xs.length - 1; i >= 0; i--) L = new IntList(xs[i], L); return L; }\n' +
    '  public String toString() { StringBuilder sb = new StringBuilder(); for (IntList p = this; p != null; p = p.rest) { if (sb.length() > 0) sb.append(" "); sb.append(p.first); } return sb.toString(); }\n}\n';
  const INTLIST_SHOW = 'class IntList {\n    int first; IntList rest;\n    IntList(int f, IntList r) { first = f; rest = r; }\n    static IntList of(int... xs)   // builds the list in the given order\n    public String toString()       // items separated by spaces\n}';
  const printLine = vars => 'System.out.println(' + ['""'].concat(vars).join(' + " " + ').replace('"" + " " + ', '"" + ') + ');';
  const outLine = vals => vals.join(' ');
  const listQ = (vals) => vals; // list answers are arrays of numbers

  // ===================== B-1 =====================
  const B1 = [];
  const B1T = ['‘What would Java print’ with references, static fields, primitives', 'Box-and-pointer diagrams',
    'Destructive vs non-destructive IntList recursion', 'Arrays of references', 'Write recursive methods on IntLists'];

  // B1 #1: primitives vs array references, with a method call
  B1.push({ id: 'B-1-prim-array-alias', type: B1T[0], make(r) {
    const heap = []; const newArr = v => { heap.push(v.slice()); return heap.length - 1; };
    const ini = () => [r.int(1, 9), r.int(1, 9), r.int(1, 9)];
    const x0 = ini(), y0 = ini();
    let a = r.int(1, 9), b = r.int(1, 9);
    let x = newArr(x0), y = newArr(y0);
    const lines = ['int a = ' + a + ', b = ' + b + ';', 'int[] x = {' + x0.join(', ') + '};', 'int[] y = {' + y0.join(', ') + '};'];
    const steps = [];
    const c1 = r.int(2, 9), c2 = r.int(10, 30), i1 = r.int(0, 2), i2 = r.int(0, 2), early = r.bool();
    const mBody = early
      ? '  n = n + ' + c1 + ';\n  arr = new int[]{0, 0, 0};\n  arr[' + i1 + '] = n;\n  arr[' + i2 + '] = ' + c2 + ';'
      : '  n = n + ' + c1 + ';\n  arr[' + i1 + '] = n;\n  arr = new int[]{0, 0, 0};\n  arr[' + i2 + '] = ' + c2 + ';';
    const helper = 'static void mystery(int n, int[] arr) {\n' + mBody + '\n}';
    // statement templates
    const T = [
      () => { b = a; return 'b = a;'; },
      () => { const k = r.int(1, 5); a += k; return 'a += ' + k + ';'; },
      () => { y = x; return 'y = x;'; },
      () => { const i = r.int(0, 2), v = r.int(10, 40); heap[x][i] = v; return 'x[' + i + '] = ' + v + ';'; },
      () => { const i = r.int(0, 2), v = r.int(10, 40); heap[y][i] = v; return 'y[' + i + '] = ' + v + ';'; },
      () => { const i = r.int(0, 2), j = r.int(0, 2); heap[y][i] += heap[x][j]; return 'y[' + i + '] += x[' + j + '];'; },
      () => { const v = ini(); x = newArr(v); return 'x = new int[]{' + v.join(', ') + '};'; },
      () => { y = newArr(heap[x]); return 'y = x.clone();'; },
    ];
    const call = (arg) => () => {
      const n = (arg === 'a' ? a : b) + c1; const arr = arg2 === 'x' ? x : y;
      if (!early) heap[arr][i1] = n;
      return 'mystery(' + arg + ', ' + arg2 + ');';
    };
    const arg = r.pick(['a', 'b']); const arg2 = r.pick(['x', 'y']);
    const nSteps = r.int(5, 7);
    const callAt = r.int(2, nSteps - 1), aliasAt = r.int(0, 2);
    for (let s = 0; s < nSteps; s++) {
      if (s === aliasAt) steps.push(T[2]());
      else if (s === callAt) steps.push(call(arg)());
      else steps.push(r.pick([T[0], T[1], T[3], T[4], T[4], T[5], T[6], T[7]])());
    }
    const vals = [a, b, heap[x][0], heap[x][1], heap[x][2], heap[y][0], heap[y][1], heap[y][2]];
    const pl = printLine(['a', 'b', 'x[0]', 'x[1]', 'x[2]', 'y[0]', 'y[1]', 'y[2]']);
    const body = lines.concat(steps).concat([pl]).join('\n');
    return Q({ kind: 'list', answer: vals,
      prompt: P('What does this program print? Enter the 8 printed numbers in order, comma-separated.') + code(helper + '\n\n// in main:\n' + body),
      hint: 'y = x copies the arrow, not the array; a method gets copies of its arguments (a copy of the int, a copy of the arrow).',
      solution: P('Trace the boxes: an <code>int</code> variable holds the number itself, an <code>int[]</code> variable holds an arrow. ' +
        '<code>y = x</code> makes both arrows point at one array, so later writes through either name are seen by both; <code>x.clone()</code> or <code>new int[]{…}</code> makes a separate array. ' +
        'Inside <code>mystery</code>, <code>n</code> is a copy (the caller’s int never changes) and <code>arr</code> is a copy of the arrow: writes through it before <code>arr = new int[]…</code> hit the caller’s array, writes after it hit the new throwaway array.') +
        P('Final values: a = ' + a + ', b = ' + b + ', x → ' + fmtArr(heap[x]) + ', y → ' + fmtArr(heap[y]) + (x === y ? ' (the same array)' : '') + '. Output: <b>' + vals.join(' ') + '</b>'),
      _java: { src: javaProg(body, helper, ''), expect: { kind: 'out', out: outLine(vals) } } });
  } });

  // B1 #2: static fields
  B1.push({ id: 'B-1-static-fields', type: B1T[0], make(r) {
    const cls = r.pick(['Robot', 'Ticket', 'Coin', 'Badge', 'Token']);
    const S0 = r.int(0, 5), K = r.int(1, 4), bumpI = r.int(1, 3), bumpC = r.int(2, 5), R = r.int(10, 20);
    let count = S0; const objs = []; const mk = () => { count += K; objs.push({ id: count }); return objs.length - 1; };
    const v = {};
    const lines = [];
    v.p = mk(); v.q = mk(); v.s = v.q;
    lines.push(cls + ' p = new ' + cls + '();', cls + ' q = new ' + cls + '();', cls + ' s = q;');
    const ops = [
      () => { const n = r.pick(['p', 'q', 's']); objs[v[n]].id += bumpI; count += bumpC; return n + '.bump();'; },
      () => { const n = r.pick(['p', 'q', 's']); v[n] = mk(); return n + ' = new ' + cls + '();'; },
      () => { const [n, m] = r.sample(['p', 'q', 's'], 2); v[n] = v[m]; return n + ' = ' + m + ';'; },
      () => { const n = r.pick(['p', 'q', 's']), c = r.int(1, 6); count += c; return n + '.count += ' + c + ';'; },
      () => { count = R; return cls + '.reset();'; },
      () => { const [n, m] = r.sample(['p', 'q', 's'], 2), c = r.int(1, 5); objs[v[n]].id = objs[v[m]].id + c; return n + '.id = ' + m + '.id + ' + c + ';'; },
    ];
    const k = r.int(5, 6);
    let usedStaticViaInst = false, usedBump = false;
    for (let i = 0; i < k; i++) {
      const j = i === 0 ? 0 : r.int(0, ops.length - 1);
      if (j === 3) usedStaticViaInst = true; if (j === 0) usedBump = true;
      lines.push(ops[j]());
    }
    if (!usedStaticViaInst) { lines.push(ops[3]()); }
    const vals = [objs[v.p].id, objs[v.q].id, objs[v.s].id, count];
    const classSrc = 'class ' + cls + ' {\n  static int count = ' + S0 + ';\n  int id;\n  ' + cls + '() { count += ' + K + '; id = count; }\n' +
      '  void bump() { id += ' + bumpI + '; count += ' + bumpC + '; }\n  static void reset() { count = ' + R + '; }\n}\n';
    const pl = printLine(['p.id', 'q.id', 's.id', cls + '.count']);
    const body = lines.concat([pl]).join('\n');
    return Q({ kind: 'list', answer: vals,
      prompt: P('What does this program print? Enter the 4 numbers in order, comma-separated.') + code(classSrc + '\n// in main:\n' + body),
      hint: 'There is exactly ONE count shared by every ' + cls + ' (even when written as p.count); each object has its own id.',
      solution: P('<code>count</code> is static: one box for the whole class, so <code>p.count</code>, <code>s.count</code> and <code>' + cls + '.count</code> are the same variable. Each constructor call adds ' + K + ' to it and copies the new value into the new object’s own <code>id</code>. Variables that were assigned from each other (like <code>s = q</code>) point to the same object, so a <code>bump()</code> through one is seen through the other.') +
        P('Final: p.id = ' + vals[0] + ', q.id = ' + vals[1] + ', s.id = ' + vals[2] + ', count = ' + vals[3] + '. Output <b>' + vals.join(' ') + '</b>.'),
      _java: { src: javaProg(body, '', classSrc), expect: { kind: 'out', out: outLine(vals) } } });
  } });

  // ---- IntList simulation helpers (node objects with identity) ----
  const ilOf = xs => { let L = null; for (let i = xs.length - 1; i >= 0; i--) L = { f: xs[i], r: L }; return L; };
  const ilToArr = (L, max) => { const o = []; const seen = new Set(); for (let p = L; p; p = p.r) { if (seen.has(p) || o.length > (max || 40)) return null; seen.add(p); o.push(p.f); } return o; };
  const IL_FUNCS = {
    incrList: { src: 'static IntList incrList(IntList L, int x) {\n  if (L == null) return null;\n  return new IntList(L.first + x, incrList(L.rest, x));\n}',
      run: (L, x) => { const go = p => (p ? { f: p.f + x, r: go(p.r) } : null); return go(L); } },
    dincrList: { src: 'static IntList dincrList(IntList L, int x) {\n  for (IntList p = L; p != null; p = p.rest) p.first += x;\n  return L;\n}',
      run: (L, x) => { for (let p = L; p; p = p.r) p.f += x; return L; } },
    catenate: { src: 'static IntList catenate(IntList A, IntList B) {\n  if (A == null) return B;\n  return new IntList(A.first, catenate(A.rest, B));\n}',
      run: (A, B) => { const go = p => (p ? { f: p.f, r: go(p.r) } : B); return go(A); } },
    dcatenate: { src: 'static IntList dcatenate(IntList A, IntList B) {\n  if (A == null) return B;\n  A.rest = dcatenate(A.rest, B);\n  return A;\n}',
      run: (A, B) => { const go = p => { if (!p) return B; p.r = go(p.r); return p; }; return go(A); } },
    dsquare: { src: 'static IntList dsquare(IntList L) {\n  if (L == null) return L;\n  L.first = L.first * L.first;\n  dsquare(L.rest);\n  return L;\n}',
      run: (L) => { for (let p = L; p; p = p.r) p.f = p.f * p.f; return L; } },
    square: { src: 'static IntList square(IntList L) {\n  if (L == null) return null;\n  return new IntList(L.first * L.first, square(L.rest));\n}',
      run: (L) => { const go = p => (p ? { f: p.f * p.f, r: go(p.r) } : null); return go(L); } },
  };
  // pure-value (no sharing) model used to make sure the question contains a real aliasing trap
  const IL_PURE = {
    incrList: (A, x) => A.map(v => v + x), dincrList: (A, x) => A.map(v => v + x), catenate: (A, B) => A.concat(B),
    dcatenate: (A, B) => A.concat(B), dsquare: A => A.map(v => v * v), square: A => A.map(v => v * v),
  };
  function genIntListProgram(r, family) {
    return retry(r, () => {
      const env = {}, pure = {}, used = new Set(); const lines = [];
      const A = range(0, r.int(2, 3)).map(() => r.int(1, 5)), B = range(0, r.int(2, 3)).map(() => r.int(1, 5));
      env.A = ilOf(A); env.B = ilOf(B); pure.A = A.slice(); pure.B = B.slice();
      lines.push('IntList A = IntList.of(' + A.join(', ') + ');', 'IntList B = IntList.of(' + B.join(', ') + ');');
      const names = ['C', 'D', 'E'];
      const fnames = family === 'cat' ? ['catenate', 'dcatenate', 'dincrList', 'incrList'] : ['incrList', 'dincrList', 'dsquare', 'square', 'catenate'];
      const nSt = 3; let nv = 0;
      for (let s = 0; s < nSt; s++) {
        const vars = Object.keys(env);
        const fn = r.pick(fnames); used.add(fn);
        let args, jargs;
        if (fn === 'catenate' || fn === 'dcatenate') { const [u, w] = r.sample(vars, 2); args = [env[u], env[w]]; jargs = [u, w]; var pargs = [pure[u], pure[w]]; }
        else if (fn === 'incrList' || fn === 'dincrList') { const u = r.pick(vars), k = r.int(1, 3); args = [env[u], k]; jargs = [u, k]; pargs = [pure[u], k]; }
        else { const u = r.pick(vars); args = [env[u]]; jargs = [u]; pargs = [pure[u]]; }
        for (const a of args) if (a && typeof a === 'object' && !ilToArr(a, 14)) return null;
        const res = IL_FUNCS[fn].run.apply(null, args); const pres = IL_PURE[fn].apply(null, pargs);
        if (!ilToArr(res, 14)) return null;
        const bare = (fn === 'dincrList' || fn === 'dsquare') && r.bool();
        if (bare) { lines.push(fn + '(' + jargs.join(', ') + ');'); /* pure: mutate in place */ pure[jargs[0]] = pres; }
        else { const nm = names[nv++]; env[nm] = res; pure[nm] = pres; lines.push('IntList ' + nm + ' = ' + fn + '(' + jargs.join(', ') + ');'); }
      }
      // all lists must be acyclic and short
      for (const k of Object.keys(env)) { const a = ilToArr(env[k], 14); if (!a || a.length > 12) return null; }
      // choose the variable to print: prefer one whose real value differs from the pure model
      const vars = Object.keys(env);
      const trap = vars.filter(k => ilToArr(env[k]).join() !== pure[k].join());
      if (!trap.length && r.float() < 0.9) return null;
      const pv = trap.length ? r.pick(trap) : r.pick(vars);
      const ans = ilToArr(env[pv]);
      if (ans.some(v => v > 5000)) return null;
      const helpers = Array.from(used).map(f => IL_FUNCS[f].src).join('\n');
      const body = lines.concat(['System.out.println(' + pv + ');']).join('\n');
      const all = vars.map(k => k + ' = ' + ilToArr(env[k]).join(' ')).join('; ');
      return { body, helpers, ans, pv, all, pureAns: pure[pv] };
    });
  }
  for (const fam of ['cat', 'incr']) {
    B1.push({ id: 'B-1-intlist-destructive-' + fam, type: B1T[2], make(r) {
      const g = genIntListProgram(r, fam);
      return Q({ kind: 'list', answer: g.ans,
        prompt: P('Using the methods below, what does the last line print? Enter the numbers in order, comma-separated.') + code(INTLIST_SHOW + '\n\n' + g.helpers + '\n\n// in main:\n' + g.body),
        hint: 'Draw every node. A method that calls new makes fresh nodes; one that assigns .first or .rest changes nodes that other variables may still point at.',
        solution: P('Non-destructive methods (<code>incrList</code>, <code>square</code>, <code>catenate</code>) build new nodes, but note that <code>catenate(A, B)</code> copies only A: its last copied node points at B’s actual nodes, so B is shared. Destructive methods (<code>dincrList</code>, <code>dsquare</code>, <code>dcatenate</code>) edit existing nodes, and every variable that can reach those nodes sees the change.') +
          P('After all three statements: ' + esc(g.all) + '. So <code>println(' + g.pv + ')</code> prints <b>' + g.ans.join(' ') + '</b>' +
            (g.pureAns.join() !== g.ans.join() ? ' (not ' + g.pureAns.join(' ') + ', which is what you get if you forget the sharing).' : '.')),
        _java: { src: javaProg(g.body, g.helpers, INTLIST_SRC), expect: { kind: 'out', out: g.ans.join(' ') } } });
    } });
  }

  // B1: arrays of references (Dog[])
  B1.push({ id: 'B-1-array-of-refs', type: B1T[3], make(r) {
    const cls = r.pick(['Dog', 'Cat', 'Box', 'Cup']);
    const objs = []; const mk = w => { objs.push({ w }); return objs.length - 1; };
    const w0 = distinctInts(r, 3, 1, 9);
    const arr = { a: w0.map(mk) };
    arr.b = arr.a;
    const mode = r.pick(['arraycopy', 'clone', 'deep']);
    const lines = [cls + '[] a = {new ' + cls + '(' + w0[0] + '), new ' + cls + '(' + w0[1] + '), new ' + cls + '(' + w0[2] + ')};', cls + '[] b = a;'];
    if (mode === 'arraycopy') { arr.c = arr.a.slice(); lines.push(cls + '[] c = new ' + cls + '[3];', 'System.arraycopy(a, 0, c, 0, 3);'); }
    else if (mode === 'clone') { arr.c = arr.a.slice(); lines.push(cls + '[] c = a.clone();'); }
    else { arr.c = arr.a.map(i => mk(objs[i].w)); lines.push(cls + '[] c = new ' + cls + '[3];', 'for (int i = 0; i < 3; i++) c[i] = new ' + cls + '(a[i].w);'); }
    const ops = [
      () => { const i = r.int(0, 2), v = r.int(10, 30); objs[arr.c[i]].w = v; return 'c[' + i + '].w = ' + v + ';'; },
      () => { const i = r.int(0, 2), v = r.int(10, 30); arr.c[i] = mk(v); return 'c[' + i + '] = new ' + cls + '(' + v + ');'; },
      () => { const i = r.int(0, 2), v = r.int(1, 9); objs[arr.b[i]].w += v; return 'b[' + i + '].w += ' + v + ';'; },
      () => { const i = r.int(0, 2), j = r.int(0, 2); arr.a[i] = arr.c[j]; return 'a[' + i + '] = c[' + j + '];'; },
      () => { const [i, j] = r.sample([0, 1, 2], 2); arr.b[i] = arr.b[j]; return 'b[' + i + '] = b[' + j + '];'; },
    ];
    const n = r.int(4, 5); lines.push(ops[0]());
    for (let k = 1; k < n; k++) lines.push(r.pick(ops)());
    const vals = arr.a.map(i => objs[i].w).concat(arr.c.map(i => objs[i].w));
    const classSrc = 'class ' + cls + ' {\n  int w;\n  ' + cls + '(int w) { this.w = w; }\n}\n';
    const pl = printLine(['a[0].w', 'a[1].w', 'a[2].w', 'c[0].w', 'c[1].w', 'c[2].w']);
    const body = lines.concat([pl]).join('\n');
    return Q({ kind: 'list', answer: vals,
      prompt: P('What does this print? Enter the 6 numbers in order, comma-separated.') + code(classSrc + '\n// in main:\n' + body),
      hint: 'An array of objects holds arrows. Copying the array (arraycopy/clone) copies the arrows, not the objects.',
      solution: P('Here c was made by ' + (mode === 'deep' ? 'a loop that calls <code>new</code> for each slot: a deep copy, so c’s objects are separate from a’s at first.' : '<code>' + (mode === 'clone' ? 'clone()' : 'System.arraycopy') + '</code>: a shallow copy, so c[i] and a[i] start out pointing to the same objects (but c is a different array). Changing <code>c[i].w</code> changes the shared object; assigning <code>c[i] = new …</code> only re-points c’s slot.') +
        ' b is the same array as a (b = a).') +
        P('Final: a → weights ' + vals.slice(0, 3).join(', ') + '; c → ' + vals.slice(3).join(', ') + '. Output <b>' + vals.join(' ') + '</b>.'),
      _java: { src: javaProg(body, '', classSrc), expect: { kind: 'out', out: outLine(vals) } } });
  } });

  // B1: box-and-pointer with 2-D arrays (shared scenario)
  function genBoxScenario(r) {
    const heap = []; const newRow = v => { heap.push(v.slice()); return heap.length - 1; };
    const rv = () => [r.int(1, 9), r.int(1, 9)];
    const x0 = [rv(), rv(), rv()];
    const st = { x: x0.map(newRow) };
    const lines = ['int[][] x = {' + x0.map(v => '{' + v.join(', ') + '}').join(', ') + '};'];
    st.y = st.x[1]; lines.push('int[] y = x[1];');
    const zm = r.pick(['clone', 'alias', 'mixed']);
    if (zm === 'clone') { st.z = st.x.slice(); lines.push('int[][] z = x.clone();'); }
    else if (zm === 'alias') { st.z = st.x; lines.push('int[][] z = x;'); }
    else { const v = rv(); st.z = [st.x[0], st.y, newRow(v)]; lines.push('int[][] z = {x[0], y, {' + v.join(', ') + '}};'); }
    const ops = [
      () => { const i = r.pick([0, 2]); st.x[i] = st.y; return 'x[' + i + '] = y;'; },
      () => { const i = r.int(0, 1), v = r.int(10, 40); heap[st.y][i] = v; return 'y[' + i + '] = ' + v + ';'; },
      () => { const i = r.int(0, 2), v = rv(); st.z[i] = newRow(v); return 'z[' + i + '] = new int[]{' + v.join(', ') + '};'; },
      () => { const i = r.int(0, 2), j = r.int(0, 1), v = r.int(10, 40); heap[st.x[i]][j] = v; return 'x[' + i + '][' + j + '] = ' + v + ';'; },
      () => { const v = rv(); st.y = newRow(v); return 'y = new int[]{' + v.join(', ') + '};'; },
      () => { const i = r.int(0, 2), j = r.int(0, 2); st.z[i] = st.x[j]; return 'z[' + i + '] = x[' + j + '];'; },
    ];
    const n = r.int(4, 5);
    for (let k = 0; k < n; k++) lines.push(r.pick(ops)());
    return { st, heap, lines };
  }
  B1.push({ id: 'B-1-box-pointer-2d', type: B1T[1], make(r) {
    return retry(r, () => {
      const { st, heap, lines } = genBoxScenario(r);
      const cand = [];
      const refName = { x: 'x', z: 'z' };
      for (const A of ['x', 'z']) for (let i = 0; i < 3; i++) {
        cand.push({ e: A + '[' + i + '] == y', v: st[A][i] === st.y });
        for (let j = 0; j < 2; j++) cand.push({ e: A + '[' + i + '][' + j + '] == ' + heap[st[A][i]][j], v: true, val: true });
      }
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j || true) cand.push({ e: 'x[' + i + '] == z[' + j + ']', v: st.x[i] === st.z[j] });
      cand.push({ e: 'x == z', v: st.x === st.z });
      // value statements: sometimes use a wrong value
      const pool = r.shuffle(cand).slice(0, 12);
      const chosen = [];
      for (const c of pool) {
        if (chosen.length >= 6) break;
        if (c.val && r.bool()) { const m = c.e.match(/^(.*) == (\d+)$/); const wrong = +m[2] + r.pick([-3, -1, 2, 5]); chosen.push({ e: m[1] + ' == ' + wrong, v: false }); }
        else chosen.push(c);
      }
      if (new Set(chosen.map(c => c.e)).size !== chosen.length) return null;
      const nt = chosen.filter(c => c.v).length; if (nt === 0 || nt === chosen.length) return null;
      const m = multi(chosen.map(c => ({ t: '<code>' + esc(c.e) + '</code>', ok: c.v })));
      const body = lines.join('\n');
      const jbody = body + '\n' + 'System.out.println(' + chosen.map(c => '(' + c.e + ')').join(' + " " + ') + ');';
      const desc = ['x', 'z'].map(A => A + ' → [' + st[A].map(i => 'row#' + i + fmtArr(heap[i])).join(', ') + ']').join('; ') + '; y → row#' + st.y + fmtArr(heap[st.y]);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Draw the box-and-pointer diagram after this code runs. Which expressions are <b>true</b>? (== on arrays compares arrows.)') + code(body),
        hint: 'x and z are arrays of arrows to int[] rows. clone() copies the outer arrows only; y = new int[]… re-points y and nothing else.',
        solution: P('Number every int[] you create (row#k) and track which row each slot points to. Final state: ' + esc(desc) + '.') +
          P(chosen.map(c => '<code>' + esc(c.e) + '</code>: ' + (c.v ? 'true' : 'false')).join('<br>')),
        _java: { src: javaProg(jbody, '', ''), expect: { kind: 'out', out: chosen.map(c => String(c.v)).join(' ') } } });
    });
  } });
  B1.push({ id: 'B-1-box-pointer-count', type: B1T[1], make(r) {
    const { st, heap, lines } = genBoxScenario(r);
    const s = new Set(st.x.concat(st.z)); const cnt = s.size;
    const body = lines.join('\n');
    const jbody = body + '\njava.util.Set<int[]> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());\nfor (int[] row : x) seen.add(row);\nfor (int[] row : z) seen.add(row);\nSystem.out.println(seen.size() + " " + x[0][0] + " " + x[1][1] + " " + z[2][0]);';
    const extra = [heap[st.x[0]][0], heap[st.x[1]][1], heap[st.z[2]][0]];
    return Q({ kind: 'list', answer: [cnt].concat(extra),
      prompt: P('After this code runs, give four numbers, comma-separated: (1) how many <b>distinct</b> int[] row objects are pointed to by the slots of x and z combined, then the values of (2) <code>x[0][0]</code>, (3) <code>x[1][1]</code>, (4) <code>z[2][0]</code>.') + code(body),
      hint: 'Give every new int[] (including each {…} row in an initializer) its own box and follow the arrows.',
      solution: P('Rows created get numbers in creation order. Final slots: x → [' + st.x.map(i => 'row#' + i).join(', ') + '], z → [' + st.z.map(i => 'row#' + i).join(', ') + ']. Distinct rows among these: ' + Array.from(s).map(i => '#' + i + fmtArr(heap[i])).join(', ') + ' → <b>' + cnt + '</b>.') +
        P('x[0][0] = ' + extra[0] + ', x[1][1] = ' + extra[1] + ', z[2][0] = ' + extra[2] + '.'),
      _java: { src: javaProg(jbody, '', ''), expect: { kind: 'out', out: [cnt].concat(extra).join(' ') } } });
  } });

  // B1: recursive methods on IntLists — value-returning
  B1.push({ id: 'B-1-intlist-recursion-value', type: B1T[4], make(r) {
    const xs = range(0, r.int(5, 6)).map(() => r.int(1, 9));
    const tmpl = r.int(0, 1);
    let src, f;
    if (tmpl === 0) {
      const base = r.int(0, 3);
      const cond = r.pick([{ s: 'L.first % 2 == 0', t: v => v % 2 === 0 }, { s: 'L.first > ' + 4, t: v => v > 4 }, { s: 'L.first % 3 == 0', t: v => v % 3 === 0 }, { s: 'L.first < 5', t: v => v < 5 }]);
      const op = r.pick(['+', '-']);
      const op2 = r.pick([{ s: 'f(L.rest) - 1', g: x => x - 1 }, { s: '2 * f(L.rest)', g: x => 2 * x }, { s: 'f(L.rest) + L.first % 3', g: null }]);
      src = 'static int f(IntList L) {\n  if (L == null) return ' + base + ';\n  if (' + cond.s + ') return L.first ' + op + ' f(L.rest);\n  return ' + op2.s + ';\n}';
      f = L => { if (!L) return base; if (cond.t(L.f)) return op === '+' ? L.f + f(L.r) : L.f - f(L.r); const x = f(L.r); return op2.g ? op2.g(x) : x + L.f % 3; };
    } else {
      const base = r.int(0, 2), c = r.int(2, 3), d = r.pick([1, -1]);
      src = 'static int f(IntList L) {\n  if (L == null) return ' + base + ';\n  if (L.rest == null) return L.first;\n  return L.first ' + (d > 0 ? '+' : '-') + ' ' + c + ' * f(L.rest.rest);\n}';
      f = L => { if (!L) return base; if (!L.r) return L.f; return L.f + d * c * f(L.r.r); };
    }
    const ans = f(ilOf(xs));
    const body = 'IntList L = IntList.of(' + xs.join(', ') + ');\nSystem.out.println(f(L));';
    // build a call trace for the solution
    const trace = []; for (let p = ilOf(xs), k = 0; p; p = p.r, k++) trace.push('f(' + ilToArr(p).join(' ') + ') = ' + f(p));
    return Q({ kind: 'num', answer: ans,
      prompt: P('What does this print?') + code(src + '\n\n// in main:\n' + body),
      hint: 'Work from the END of the list back to the front: compute f of the shortest suffix first.',
      solution: P('Evaluate bottom-up (each call only needs the value on a shorter suffix):<br>' + trace.reverse().map(esc).join('<br>')) + P('So it prints <b>' + ans + '</b>.'),
      _java: { src: javaProg(body, src, INTLIST_SRC), expect: { kind: 'out', out: String(ans) } } });
  } });
  // B1: recursive methods building lists
  B1.push({ id: 'B-1-intlist-recursion-build', type: B1T[4], make(r) {
    return retry(r, () => {
      const xs = range(0, r.int(5, 7)).map(() => r.int(1, 9));
      const t = r.int(0, 2); let src, f, desc;
      if (t === 0) {
        const m = r.pick([2, 3]), k = r.int(1, 3), keep = r.bool();
        src = 'static IntList h(IntList L) {\n  if (L == null) return null;\n  if (L.first % ' + m + (keep ? ' == 0' : ' != 0') + ') return new IntList(L.first * ' + k + ', h(L.rest));\n  return h(L.rest);\n}';
        f = L => { if (!L) return null; const c = keep ? L.f % m === 0 : L.f % m !== 0; return c ? { f: L.f * k, r: f(L.r) } : f(L.r); };
        desc = 'keeps the items with first % ' + m + (keep ? ' == 0' : ' != 0') + ' (in order) and multiplies them by ' + k;
      } else if (t === 1) {
        const k = r.int(1, 4);
        src = 'static IntList h(IntList L, IntList acc) {\n  if (L == null) return acc;\n  return h(L.rest, new IntList(L.first + ' + k + ', acc));\n}';
        f = L => { let acc = null; for (let p = L; p; p = p.r) acc = { f: p.f + k, r: acc }; return acc; };
        desc = 'pushes each item + ' + k + ' onto the FRONT of acc, so the result comes out reversed';
      } else {
        const k = r.int(0, 3);
        src = 'static IntList h(IntList L) {\n  if (L == null || L.rest == null) return L;\n  return new IntList(L.first + L.rest.first + ' + k + ', h(L.rest.rest));\n}';
        f = L => { if (!L || !L.r) return L; return { f: L.f + L.r.f + k, r: f(L.r.r) }; };
        desc = 'adds neighbouring pairs (plus ' + k + '); an odd last item is returned as the original node';
      }
      const res = ilToArr(f(ilOf(xs)));
      if (!res || res.length === 0) return null;
      const call = t === 1 ? 'h(L, null)' : 'h(L)';
      const body = 'IntList L = IntList.of(' + xs.join(', ') + ');\nSystem.out.println(' + call + ');';
      return Q({ kind: 'list', answer: res,
        prompt: P('What does this print? Enter the numbers in order, comma-separated.') + code(src + '\n\n// in main:\n' + body),
        hint: 'Trust the recursive call on the rest, then ask what this one call adds in front.',
        solution: P('The method ' + desc + '. On ' + xs.join(' ') + ' that gives <b>' + res.join(' ') + '</b>.'),
        _java: { src: javaProg(body, src, INTLIST_SRC), expect: { kind: 'out', out: res.join(' ') } } });
    });
  } });
  G['B-1'] = B1;

  // ===================== B-2 =====================
  const B2 = [];
  const B2T = ['Write/modify SLList and DLList methods with sentinels (insert, remove, reverse)', 'Resizing AList: when and how; amortized cost',
    'Circular-array indexing (nextFirst/nextLast, mod arithmetic)', 'Find bugs in list code', 'Design JUnit tests'];
  const DEQUE_CONV = 'Convention (Project 1 style): the backing array starts with capacity 8. <code>addFirst(x)</code> writes at <code>nextFirst</code> then sets <code>nextFirst = floorMod(nextFirst − 1, cap)</code>; <code>addLast(x)</code> writes at <code>nextLast</code> then sets <code>nextLast = (nextLast + 1) % cap</code>; <code>removeFirst</code> first advances <code>nextFirst = (nextFirst + 1) % cap</code> and removes that slot (sets it to null); <code>removeLast</code> mirrors this. If an add finds the array full (size == cap), it first resizes to 2·cap, copying the items in logical order to indices 0…size−1 and setting nextFirst = newCap − 1, nextLast = size. No downsizing.';
  // ArrayDeque simulation; opts.naiveResize = buggy resize (arraycopy as-is)
  function dequeSim(nf0, ops, opts) {
    opts = opts || {};
    let cap = 8, a = new Array(8).fill(null), nf = nf0, nl = (nf0 + 1) % 8, size = 0; const log = []; let resizeAt = -1;
    const resize = () => {
      const b = new Array(cap * 2).fill(null);
      if (opts.naiveResize) { for (let i = 0; i < cap; i++) b[i] = a[i]; }
      else for (let i = 0; i < size; i++) b[i] = a[(nf + 1 + i) % cap];
      a = b; cap *= 2; nf = cap - 1; nl = size;
    };
    const get = i => a[(nf + 1 + i) % cap];
    ops.forEach((op, k) => {
      if (op[0] === 'addFirst' || op[0] === 'addLast') { if (size === cap) { if (resizeAt < 0) resizeAt = k; resize(); } }
      if (op[0] === 'addFirst') { a[nf] = op[1]; nf = floorMod(nf - 1, cap); size++; }
      else if (op[0] === 'addLast') { a[nl] = op[1]; nl = (nl + 1) % cap; size++; }
      else if (op[0] === 'removeFirst') { nf = (nf + 1) % cap; log.push(a[nf]); a[nf] = null; size--; }
      else if (op[0] === 'removeLast') { nl = floorMod(nl - 1, cap); log.push(a[nl]); a[nl] = null; size--; }
    });
    return { a, nf, nl, size, cap, log, resizeAt, get };
  }
  function randDequeOps(r, n, maxSize, opts) {
    opts = opts || {}; const ops = []; let size = 0; let v = r.int(1, 5);
    for (let i = 0; i < n; i++) {
      const canRemove = size > 0 && !opts.noRemove;
      const t = (size >= maxSize || (canRemove && r.float() < (opts.pRemove || 0.25))) ? r.pick(['removeFirst', 'removeLast']) : r.pick(['addFirst', 'addLast']);
      if (t.startsWith('add')) { ops.push([t, v]); v += r.int(1, 3); size++; } else { ops.push([t]); size--; }
    }
    return ops;
  }
  const opStr = op => op[0] + '(' + (op.length > 1 ? op[1] : '') + ')';
  B2.push({ id: 'B-2-deque-array-state', type: B2T[2], make(r) {
    return retry(r, () => {
      const nf0 = r.int(0, 7);
      const ops = randDequeOps(r, r.int(8, 10), 7, { pRemove: 0.3 });
      const s = dequeSim(nf0, ops);
      if (s.resizeAt >= 0) return null;
      // require wrap-around: some item at index < nf0+1 placed by addLast past the end, or addFirst wrapping below 0
      const wraps = ops.filter(o => o[0] === 'addFirst').length > nf0 || ops.filter(o => o[0] === 'addLast').length > 7 - nf0 - 1;
      if (!wraps) return null;
      const ans = s.a.map(x => (x === null ? 0 : x)).concat([s.nf, s.nl]);
      return Q({ kind: 'list', answer: ans,
        prompt: P('An ArrayDeque starts empty with capacity 8, <code>nextFirst = ' + nf0 + '</code>, <code>nextLast = ' + ((nf0 + 1) % 8) + '</code>. ' + DEQUE_CONV) +
          P('Operations: <code>' + ops.map(opStr).join(', ') + '</code>.') +
          P('Give the 8 array slots (index 0…7, write 0 for an empty/null slot), followed by the final nextFirst and nextLast: 10 numbers, comma-separated.'),
        hint: 'nextFirst moves LEFT (wrapping 0 → 7) after each addFirst; nextLast moves right; a remove first moves the pointer back, then clears that slot.',
        solution: P('Track (nextFirst, nextLast) after every operation; floorMod makes index −1 wrap to 7.') +
          P('Final array: ' + fmtArr(s.a.map(x => (x === null ? '_' : x))) + ', nextFirst = ' + s.nf + ', nextLast = ' + s.nl + '. Logical contents front→back: ' + range(0, s.size).map(i => s.get(i)).join(' ') + '.'),
        _chk: { nf0, ops } });
    });
  } });
  B2.push({ id: 'B-2-deque-resize', type: B2T[2], make(r) {
    return retry(r, () => {
      const nf0 = r.int(0, 7);
      const ops = randDequeOps(r, r.int(11, 13), 12, { pRemove: 0.15 });
      const s = dequeSim(nf0, ops);
      if (s.resizeAt < 0) return null;
      const k = r.int(0, s.size - 1);
      const ans = [s.resizeAt + 1, s.nf, s.nl, s.get(k)];
      return Q({ kind: 'list', answer: ans,
        prompt: P('An ArrayDeque starts empty with capacity 8, <code>nextFirst = ' + nf0 + '</code>, <code>nextLast = ' + ((nf0 + 1) % 8) + '</code>. ' + DEQUE_CONV) +
          P('Operations (numbered from 1): ' + ops.map((o, i) => (i + 1) + ': <code>' + opStr(o) + '</code>').join(', ') + '.') +
          P('Give four numbers, comma-separated: the number of the operation that triggers the resize, then the final nextFirst, the final nextLast (capacity 16 after the resize), and the value of <code>get(' + k + ')</code> at the end.'),
        hint: 'The resize happens on the add that finds size == 8 (the 9th live item). After it: items at 0…7 in logical order, nextFirst = 15, nextLast = 8.',
        solution: P('Count live items: the resize is triggered by operation ' + (s.resizeAt + 1) + ' (' + opStr(ops[s.resizeAt]) + '), when 8 items are already stored. The copy puts them in logical order at indices 0…7, nextFirst = 15, nextLast = 8, then that add proceeds and the rest continue on the 16-slot array.') +
          P('Final array: ' + fmtArr(s.a.map(x => (x === null ? '_' : x))) + ', nextFirst = ' + s.nf + ', nextLast = ' + s.nl + ', get(' + k + ') = slot (nextFirst + 1 + ' + k + ') mod 16 = ' + ((s.nf + 1 + k) % 16) + ' → ' + s.get(k) + '.'),
        _chk: { nf0, ops, k } });
    });
  } });
  B2.push({ id: 'B-2-deque-get-index', type: B2T[2], make(r) {
    return retry(r, () => {
      const cap = r.pick([8, 16]);
      const nf = r.int(0, cap - 1), size = r.int(3, cap - 2);
      const nl = (nf + size + 1) % cap;
      const i = r.int(0, size - 1);
      const phys = (nf + 1 + i) % cap;
      if (nf + 1 + i < cap && r.float() < 0.7) return null; // usually require the wrap
      const ans = [phys, floorMod(nl - 1, cap), nf];
      return Q({ kind: 'list', answer: ans,
        prompt: P('An ArrayDeque with capacity ' + cap + ' holds ' + size + ' items, with <code>nextFirst = ' + nf + '</code> and <code>nextLast = ' + nl + '</code>. ' + DEQUE_CONV) +
          P('Give three array indices, comma-separated: (1) the index read by <code>get(' + i + ')</code>, (2) the index that <code>removeLast()</code> would read from, (3) the index the next <code>addFirst</code> writes to.'),
        hint: 'The front item is at nextFirst + 1 and item i is i slots after it, all mod capacity.',
        solution: P('get(i) reads (nextFirst + 1 + i) mod cap = (' + nf + ' + 1 + ' + i + ') mod ' + cap + ' = <b>' + phys + '</b>. removeLast reads floorMod(nextLast − 1, cap) = <b>' + ans[1] + '</b>. addFirst writes at nextFirst itself = <b>' + nf + '</b>.'), _chk: { cap, nf, size, i } });
    });
  } });
  // AList resizing: count resizes and copies
  B2.push({ id: 'B-2-alist-resize-count', type: B2T[1], make(r) {
    const c0 = r.pick([1, 2, 4, 5, 8, 10]);
    const pol = r.pick([{ t: 'mul', f: 2 }, { t: 'mul', f: 3 }, { t: 'mul', f: 2 }, { t: 'add', k: r.pick([5, 10, 20]) }, { t: 'mul15' }]);
    const N = r.int(30, 200);
    let cap = c0, size = 0, res = 0, copies = 0; const caps = [];
    for (let i = 0; i < N; i++) {
      if (size === cap) { copies += size; res++; cap = pol.t === 'mul' ? cap * pol.f : pol.t === 'add' ? cap + pol.k : Math.floor(cap * 3 / 2) + 1; caps.push(cap); }
      size++;
    }
    const pdesc = pol.t === 'mul' ? 'multiplies the capacity by ' + pol.f : pol.t === 'add' ? 'adds ' + pol.k + ' to the capacity' : 'sets the capacity to ⌊1.5·cap⌋ + 1';
    return Q({ kind: 'list', answer: [res, copies, cap],
      prompt: P('An AList starts with capacity ' + c0 + '. <code>addLast</code> checks <code>if (size == items.length) resize(…)</code> before inserting; a resize ' + pdesc + ' and copies every current item into the new array. Starting empty, we call <code>addLast</code> ' + N + ' times.') +
        P('Give three numbers, comma-separated: the number of resizes, the total number of item copies made by resizes, and the final capacity.'),
      hint: 'A resize happens exactly when size equals the current capacity; it copies `size` items.',
      solution: P('Resizes happen when size reaches each capacity in the chain ' + [c0].concat(caps.slice(0, -1)).join(', ') + ' (copying that many items each time). Capacities: ' + [c0].concat(caps).join(' → ') + '.') +
        P('Resizes = <b>' + res + '</b>, copies = ' + [c0].concat(caps.slice(0, -1)).join(' + ') + ' = <b>' + copies + '</b>, final capacity <b>' + cap + '</b>.' + (pol.t === 'add' ? ' (Additive growth: copies grow like N², so Θ(N) amortized per add.)' : ' (Multiplicative growth: copies < c·N, so Θ(1) amortized.)')),
      _chk: { c0, pol, N } });
  } });
  B2.push({ id: 'B-2-alist-shrink', type: B2T[1], make(r) {
    const nAdd = r.int(20, 70), nRem = r.int(10, nAdd - 2), nAdd2 = r.int(0, 10);
    let cap = 8, size = 0, resizes = 0;
    const add = () => { if (size === cap) { cap *= 2; resizes++; } size++; };
    const rem = () => { size--; if (cap >= 16 && size < cap / 4) { cap = cap / 2; resizes++; } };
    for (let i = 0; i < nAdd; i++) add(); const capPeak = cap;
    for (let i = 0; i < nRem; i++) rem(); const capMid = cap;
    for (let i = 0; i < nAdd2; i++) add();
    return Q({ kind: 'list', answer: [capPeak, capMid, cap, resizes],
      prompt: P('An AList starts empty with capacity 8. Before an add, if size == capacity it doubles. After a removeLast, if capacity ≥ 16 and size &lt; capacity/4, it halves the capacity (checked once per removal).') +
        P('We do ' + nAdd + ' addLasts, then ' + nRem + ' removeLasts, then ' + nAdd2 + ' more addLasts. Give four numbers: the capacity after the adds, after the removes, at the end, and the total number of resizes (grows + shrinks).'),
      hint: 'Grow at size == cap; shrink only when the usage ratio drops below 1/4 (never below capacity 8).',
      solution: P('Adds: capacity doubles 8 → … until it holds ' + nAdd + ' items: <b>' + capPeak + '</b>. Removes: size goes down to ' + (nAdd - nRem) + ', halving each time size falls below cap/4: <b>' + capMid + '</b>. Final adds bring size to ' + (nAdd - nRem + nAdd2) + ': capacity <b>' + cap + '</b>. Total resizes <b>' + resizes + '</b>. Shrinking at 1/4 (not 1/2) prevents an add/remove pair at the boundary from resizing every time.'),
      _chk: { nAdd, nRem, nAdd2 } });
  } });
  B2.push({ id: 'B-2-alist-amortized-mc', type: B2T[1], make(r) {
    const pol = r.pick(['×2', '×1.5', '×3', '+1', '+100', '+N/2', 'shrink½']);
    const ask = r.pick(['amortized', 'worst']);
    let correct, why;
    if (pol === 'shrink½') { correct = 'Θ(N)'; why = 'Halving when exactly half full means an add that just triggered a doubling can be followed by a remove that halves, and so on: alternating add/remove at the boundary pays Θ(N) every time.'; }
    else if (ask === 'worst') { correct = 'Θ(N)'; why = 'The single add that triggers a resize copies all N items, whatever the growth policy.'; }
    else if (pol[0] === '×' || pol === '+N/2') { correct = 'Θ(1)'; why = 'Growth by a constant factor (adding N/2 is ×1.5) makes resize costs a geometric series < c·N in total.'; }
    else { correct = 'Θ(N)'; why = 'Additive growth ' + pol + ' resizes every constant number of adds; total copying is about N²/(2k), Θ(N) per add on average.'; }
    const pdesc = pol === 'shrink½' ? 'doubles when full and halves as soon as size drops to exactly half the capacity' : pol === '+N/2' ? 'grows by adding N/2 slots (N = current size)' : pol[0] === '×' ? 'multiplies capacity by ' + pol.slice(1) : 'adds ' + pol.slice(1) + ' slot' + (pol === '+1' ? '' : 's');
    const q = pol === 'shrink½' ? 'what is the amortized cost per operation of a long alternating sequence addLast, removeLast, addLast, … started right at a full array?' :
      ask === 'worst' ? 'what is the worst-case cost of a <b>single</b> addLast call on a list of N items?' : 'what is the <b>amortized</b> cost per addLast over N addLasts starting from empty?';
    const m = mcq(r, correct, ['Θ(1)', 'Θ(N)', 'Θ(log N)', 'Θ(N²)', 'Θ(N log N)'], THETA_N);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
      prompt: P('An AList ' + pdesc + '. In terms of N, ' + q),
      hint: 'Amortized = total cost of the sequence ÷ number of operations; worst case = the one expensive call.', solution: P(why + ' Answer: <b>' + correct + '</b>.') });
  } });
  // DLList with circular sentinel: final contents & pointer chasing
  function dllSim(ops) {
    const S = { item: null }; S.next = S; S.prev = S; let size = 0;
    for (const op of ops) {
      if (op[0] === 'addFirst') { const n = { item: op[1], prev: S, next: S.next }; S.next.prev = n; S.next = n; size++; }
      else if (op[0] === 'addLast') { const n = { item: op[1], prev: S.prev, next: S }; S.prev.next = n; S.prev = n; size++; }
      else if (op[0] === 'removeFirst') { const n = S.next; S.next = n.next; n.next.prev = S; size--; }
      else if (op[0] === 'removeLast') { const n = S.prev; S.prev = n.prev; n.prev.next = S; size--; }
      else if (op[0] === 'insert') { let p = S; for (let i = 0; i < op[2]; i++) p = p.next; const n = { item: op[1], prev: p, next: p.next }; p.next.prev = n; p.next = n; size++; }
    }
    const out = []; for (let p = S.next; p !== S; p = p.next) out.push(p.item);
    return { S, out, size };
  }
  B2.push({ id: 'B-2-dllist-trace', type: B2T[0], make(r) {
    return retry(r, () => {
      const ops = []; let size = 0, v = r.int(1, 5);
      const n = r.int(8, 10);
      for (let i = 0; i < n; i++) {
        const t = size > 1 && r.float() < 0.3 ? r.pick(['removeFirst', 'removeLast']) : r.pick(['addFirst', 'addLast', 'insert']);
        if (t === 'insert') { ops.push(['insert', v, r.int(0, size)]); v += r.int(1, 4); size++; }
        else if (t.startsWith('add')) { ops.push([t, v]); v += r.int(1, 4); size++; }
        else { ops.push([t]); size--; }
      }
      const s = dllSim(ops); if (s.size < 3) return null;
      const chain = r.pick(['sentinel.prev.prev.item', 'sentinel.next.next.next.item', 'sentinel.prev.prev.prev.item', 'sentinel.next.prev.prev.item']);
      let p = s.S; for (const st of chain.split('.').slice(1, -1)) p = p[st];
      if (p === s.S) return null;
      const ans = s.out.concat([p.item]);
      return Q({ kind: 'list', answer: ans,
        prompt: P('A DLList uses one <b>circular</b> sentinel (sentinel.next is the first node, sentinel.prev the last). <code>insert(x, i)</code> puts x so it becomes item i (0 = front). Starting empty:') +
          P('<code>' + ops.map(o => o[0] === 'insert' ? 'insert(' + o[1] + ', ' + o[2] + ')' : opStr(o)).join(', ') + '</code>') +
          P('Enter the final list front-to-back, followed by the value of <code>' + chain + '</code> (all comma-separated).'),
        hint: 'Keep the list as a line of items; prev from the first node goes back to the sentinel, next from the last goes to the sentinel.',
        solution: P('Final list: ' + s.out.join(' ') + '. Following <code>' + chain + '</code> from the sentinel (it sits between the last and first node) lands on ' + p.item + '.'),
        _chk: { ops, chain } });
    });
  } });
  // SLList mystery method
  B2.push({ id: 'B-2-sllist-method', type: B2T[0], make(r) {
    const xs = distinctInts(r, r.int(5, 7), 1, 20);
    const t = r.int(0, 2); let src, res, desc, k = 0;
    if (t === 0) {
      k = r.int(1, 3);
      src = 'void mystery() {   // moves nodes around, using the sentinel\n  for (int i = 0; i < ' + k + '; i++) {\n    Node first = sentinel.next;\n    sentinel.next = first.next;\n    Node p = sentinel;\n    while (p.next != null) p = p.next;\n    p.next = first;\n    first.next = null;\n  }\n}';
      res = xs.slice(k).concat(xs.slice(0, k)); desc = 'moves the front node to the back, ' + k + ' time(s)';
    } else if (t === 1) {
      src = 'void mystery() {\n  Node p = sentinel.next;\n  while (p != null && p.next != null) {\n    p.next = p.next.next;\n    p = p.next;\n  }\n}';
      res = xs.filter((_, i) => i % 2 === 0); desc = 'unlinks every second node (keeps indices 0, 2, 4, …)';
    } else {
      k = r.int(2, xs.length - 1);
      src = 'void mystery() {   // reverses part of the list\n  Node prev = null, p = sentinel.next;\n  for (int i = 0; i < ' + k + '; i++) {\n    Node nxt = p.next;\n    p.next = prev;\n    prev = p;\n    p = nxt;\n  }\n  sentinel.next.next = p;   // old first node now k-th\n  sentinel.next = prev;\n}';
      res = xs.slice(0, k).reverse().concat(xs.slice(k)); desc = 'reverses the first ' + k + ' nodes in place and reattaches the remainder';
    }
    return Q({ kind: 'list', answer: res,
      prompt: P('An SLList with a sentinel (<code>sentinel.next</code> is the first real node, the last node’s next is null) holds ' + xs.join(', ') + ' (front first). After calling this method, what does the list hold, front to back?') + code(src),
      hint: 'Draw the nodes and redraw the arrows one statement at a time; the sentinel never moves.',
      solution: P('The method ' + desc + '. Result: <b>' + res.join(', ') + '</b>.'), _chk: { t, xs, k } });
  } });
  // Find bugs: buggy addFirst without floorMod → exception; buggy get without +1 → wrong value
  for (const VV of [0, 1]) B2.push({ id: 'B-2-find-bug-deque' + ['-crash', '-get'][VV], type: B2T[3], make(r) {
    return retry(r, () => {
      const nf0 = r.int(1, 5);
      const variant = VV;
      const ops = randDequeOps(r, r.int(6, 8), 7, { pRemove: 0.2 });
      if (variant === 0) {
        // addFirst uses nextFirst = nextFirst - 1 (no wrap): throws when writing at index -1
        let nf = nf0, nl = nf0 + 1, size = 0, crash = -1; const a = new Array(8).fill(null);
        for (let k = 0; k < ops.length && crash < 0; k++) {
          const op = ops[k];
          if (op[0] === 'addFirst') { if (nf < 0) { crash = k; break; } a[nf] = op[1]; nf = nf - 1; size++; }
          else if (op[0] === 'addLast') { a[nl] = op[1]; nl = (nl + 1) % 8; size++; }
          else if (op[0] === 'removeFirst') { nf = (nf + 1) % 8; a[nf] = null; size--; }
          else { nl = floorMod(nl - 1, 8); a[nl] = null; size--; }
        }
        if (crash < 0) return null;
        return Q({ kind: 'num', answer: crash + 1,
          prompt: P('This ArrayDeque (capacity 8, starts empty with nextFirst = ' + nf0 + ', nextLast = ' + (nf0 + 1) + ') has a bug in addFirst:') +
            code('public void addFirst(T x) {\n  items[nextFirst] = x;\n  nextFirst = nextFirst - 1;\n  size += 1;\n}') +
            P('Everything else is correct (removeFirst does nextFirst = (nextFirst + 1) % 8 before reading). Operations, numbered from 1: ' + ops.map((o, i) => (i + 1) + ': <code>' + opStr(o) + '</code>').join(', ') + '. On which operation number is an ArrayIndexOutOfBoundsException first thrown?'),
          hint: 'Track nextFirst: once it reaches −1, the next addFirst writes items[−1].',
          solution: P('nextFirst is never wrapped: it goes down by one per addFirst (and up by one per removeFirst). It reaches −1 and the next addFirst, operation <b>' + (crash + 1) + '</b>, executes items[−1]. Fix: <code>nextFirst = Math.floorMod(nextFirst − 1, items.length)</code>.'),
          _chk: { variant, nf0, ops } });
      } else {
        const s = dequeSim(nf0, ops);
        if (s.resizeAt >= 0 || s.size < 3) return null;
        const i = r.int(0, s.size - 1);
        const bug = s.a[(s.nf + i) % 8];
        const good = s.get(i);
        if (bug === good) return null;
        return Q({ kind: 'num', answer: bug === null ? 0 : bug,
          prompt: P('This ArrayDeque get has a bug:') + code('public T get(int i) {\n  return items[(nextFirst + i) % items.length];\n}') +
            P('Starting empty with capacity 8, nextFirst = ' + nf0 + ', nextLast = ' + (nf0 + 1) + ' (all other methods correct; ' + DEQUE_CONV + ') we run <code>' + ops.map(opStr).join(', ') + '</code>. What does the buggy <code>get(' + i + ')</code> return? (Enter 0 if it returns null.)'),
          hint: 'The front item lives at nextFirst + 1, not nextFirst. Find the real array first.',
          solution: P('Array: ' + fmtArr(s.a.map(x => (x === null ? '_' : x))) + ', nextFirst = ' + s.nf + '. Buggy get reads index (' + s.nf + ' + ' + i + ') % 8 = ' + ((s.nf + i) % 8) + ' → <b>' + (bug === null ? 'null (0)' : bug) + '</b>; the correct get(' + i + ') reads index ' + ((s.nf + 1 + i) % 8) + ' = ' + good + '.'),
          _chk: { variant, nf0, ops, i } });
      }
    });
  } });
  // Design JUnit tests: which tests catch the naive-resize bug
  B2.push({ id: 'B-2-junit-which-fail', type: B2T[4], make(r) {
    return retry(r, () => {
      const nf0 = r.int(0, 7);
      const tests = [];
      for (let t = 0; t < 5; t++) {
        const n = r.pick([4, 6, 8, 9, 10, 11, 12]);
        const ops = []; let v = 1;
        const mode = r.pick(['first', 'last', 'mix', 'mix']);
        for (let i = 0; i < n; i++) ops.push([mode === 'first' ? 'addFirst' : mode === 'last' ? 'addLast' : r.pick(['addFirst', 'addLast']), v++]);
        const good = dequeSim(nf0, ops), bad = dequeSim(nf0, ops, { naiveResize: true });
        const k = r.int(0, n - 1);
        const ask = r.pick(['get', 'size', 'get']);
        let fails, line;
        if (ask === 'size') { fails = false; line = 'assertThat(d.size()).isEqualTo(' + n + ');'; }
        else { const exp = good.get(k); fails = bad.get(k) !== exp; line = 'assertThat(d.get(' + k + ')).isEqualTo(' + exp + ');'; }
        tests.push({ t: '<code>' + esc(ops.map(opStr).map(s => 'd.' + s + ';').join(' ') + ' ' + line) + '</code>', ok: fails, d: { ops, ask, k, n, exp: ask === 'size' ? n : good.get(k) } });
      }
      const nf = tests.filter(x => x.ok).length; if (nf === 0 || nf === 5) return null;
      if (new Set(tests.map(x => x.t)).size < 5) return null;
      const m = multi(tests);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('A student’s ArrayDeque follows this convention: ' + DEQUE_CONV + ' But their resize is buggy:') +
          code('private void resize(int cap) {\n  T[] a = (T[]) new Object[cap];\n  System.arraycopy(items, 0, a, 0, items.length); // copies slots as-is\n  items = a;\n  nextFirst = cap - 1;\n  nextLast = size;\n}') +
          P('Each deque starts empty with nextFirst = ' + nf0 + '. Which of these JUnit tests <b>fail</b> on the buggy code (each test uses a fresh deque d)?'),
        hint: 'The bug only matters if a resize happens (9+ items) AND the logical front is not at index 0 at that moment; then check whether the asserted index lands on a misplaced item.',
        solution: P('A correct resize copies in logical order. The buggy copy keeps the physical order, so after it the deque thinks the front is at index 0 although the true front was at nextFirst + 1. Tests with ≤ 8 adds never resize and pass; size() is always right. Simulating both versions:') +
          P(tests.map(x => (x.ok ? 'FAILS: ' : 'passes: ') + x.t).join('<br>')),
        _chk: { nf0, tests: tests.map(x => x.d) } });
    });
  } });
  G['B-2'] = B2;

  // ===================== B-3 =====================
  const B3 = [];
  const B3T = ['Static vs dynamic type tables', 'Which method runs (overload vs override, with casts)', 'Compile error vs runtime ClassCastException',
    'Default methods and super calls', 'Higher-order functions via interfaces/lambdas'];
  const HIER = [['Animal', 'Dog', 'Puppy', 'Cat'], ['Shape', 'Poly', 'Square', 'Circle'], ['Vehicle', 'Car', 'Taxi', 'Bike'], ['Item', 'Book', 'Comic', 'Pen'], ['Person', 'Student', 'Grad', 'Staff']];
  // class model: names[0]=A root, [1]=B extends A, [2]=C extends B, [3]=D extends A
  function mkHier(r) {
    const n = r.pick(HIER);
    const par = { [n[0]]: 'Object', [n[1]]: n[0], [n[2]]: n[1], [n[3]]: n[0], Object: null };
    const isSub = (x, y) => { for (let c = x; c; c = par[c]) if (c === y) return true; return false; };
    const related = (x, y) => isSub(x, y) || isSub(y, x);
    const chain = x => { const o = []; for (let c = x; c; c = par[c]) o.push(c); return o; };
    return { n, A: n[0], B: n[1], C: n[2], D: n[3], par, isSub, related, chain };
  }
  const extendsDecl = (h, c) => 'class ' + c + (h.par[c] && h.par[c] !== 'Object' ? ' extends ' + h.par[c] : '');

  // ---- overload/override puzzle ----
  function genDispatch(r, withInherited) {
    return retry(r, () => {
      const h = mkHier(r); const { A, B, C, D } = h;
      const defs = { [A]: [A], [B]: [], [C]: [], [D]: [] };
      if (r.float() < 0.3) defs[A].push(B);
      if (r.float() < 0.65) defs[B].push(A);
      if (r.float() < 0.65) defs[B].push(B);
      if (r.float() < 0.4) defs[C].push(A);
      if (r.float() < 0.45) defs[C].push(B);
      if (r.float() < 0.3) defs[C].push(C);
      if (r.float() < 0.5) defs[D].push(A);
      const hasH = withInherited && r.bool();
      const tag = (cls, p) => cls + '.m(' + p + ')';
      // resolve: compile-time signature from static types; runtime from dynamic type
      const resolve = (S, argT) => {
        const vis = new Set(); for (const c of h.chain(S)) for (const p of defs[c] || []) vis.add(p);
        const app = Array.from(vis).filter(p => h.isSub(argT, p));
        if (!app.length) return null;
        app.sort((x, y) => (h.isSub(x, y) ? -1 : 1));
        return app[0];
      };
      const runtime = (Dyn, p) => { for (const c of h.chain(Dyn)) if ((defs[c] || []).includes(p)) return tag(c, p); return null; };
      const vars = [];
      const decl = [[A, B], [A, C], [B, C], [B, B], [A, D], [C, C], [A, A]];
      const used = r.sample(decl, 4);
      const vn = ['x', 'y', 'z', 'w'];
      used.forEach((d, i) => vars.push({ v: vn[i], S: d[0], Dy: d[1] }));
      const calls = [], outs = [];
      const nCalls = 5;
      let tries = 0;
      while (calls.length < nCalls && tries++ < 60) {
        const rc = r.pick(vars), ar = r.pick(vars);
        const form = r.int(0, withInherited ? 5 : 3);
        let recvS = rc.S, recvDyn = rc.Dy, argS = ar.S, txt, out;
        if (form === 0) { txt = rc.v + '.m(' + ar.v + ');'; }
        else if (form === 1) { // cast the argument (upcast or safe downcast)
          const T = r.pick([A, B, C].filter(t => h.related(t, ar.S) && h.isSub(ar.Dy, t) && t !== ar.S)); if (!T) continue;
          argS = T; txt = rc.v + '.m((' + T + ') ' + ar.v + ');';
        } else if (form === 2) { // cast the receiver
          const T = r.pick([A, B, C, D].filter(t => h.related(t, rc.S) && h.isSub(rc.Dy, t) && t !== rc.S)); if (!T) continue;
          recvS = T; txt = '((' + T + ') ' + rc.v + ').m(' + ar.v + ');';
        } else if (form === 3) { txt = rc.v + '.m(' + ar.v + ');'; }
        else if (form === 4) { // inherited g(): m(this) with this : A
          txt = rc.v + '.g();'; const p = resolve(A, A); out = runtime(recvDyn, p);
        } else { // h() in B: super.m(this): compile-time in A with arg type B, no dynamic dispatch
          if (!hasH || !h.isSub(rc.S, B)) continue;
          txt = rc.v + '.h();'; const p = resolve(A, B); out = runtime(A, p);
        }
        if (form <= 3) { const p = resolve(recvS, argS); if (!p) continue; out = runtime(recvDyn, p); }
        if (calls.includes(txt)) continue;
        calls.push(txt); outs.push(out);
      }
      if (calls.length < nCalls) return null;
      // make it interesting: at least one call where naive "dynamic arg type" reasoning differs
      if (new Set(outs).size < 3) return null;
      const body = m => '  void m(' + m.p + ' o) { System.out.println("' + m.t + '"); }';
      const clsSrc = [A, B, C, D].map(c => {
        const lines = (defs[c] || []).map(p => body({ p, t: tag(c, p) }));
        if (c === A && withInherited) lines.push('  void g() { m(this); }');
        if (c === B && hasH) lines.push('  void h() { super.m(this); }');
        return extendsDecl(h, c) + ' {\n' + lines.join('\n') + (lines.length ? '\n' : '') + '}';
      }).join('\n');
      const declLines = vars.map(v => v.S + ' ' + v.v + ' = new ' + v.Dy + '();');
      const mainBody = declLines.concat(calls).join('\n');
      return { h, defs, vars, calls, outs, clsSrc, mainBody, hasH };
    });
  }
  function dispatchQ(g, withInherited) {
    const ans = g.outs.join(' ');
    return Q({ kind: 'text', answer: [ans, g.outs.join(','), g.outs.join(', '), g.outs.join('\n')],
      prompt: P('What do the five calls print? Type the five outputs in order, separated by spaces (e.g. <code>X.m(Y) …</code>).') + code(g.clsSrc + '\n\n// in main:\n' + g.mainBody),
      hint: 'Step 1 (compile): from the STATIC types of receiver and argument, pick the most specific m(…) visible in the receiver’s static class. Step 2 (run): use the receiver’s DYNAMIC type to find an override of exactly that signature.',
      solution: P('For each call: lock in the signature using static types only (a cast changes the static type of that expression), then look for that exact signature starting at the dynamic class and walking up.' +
        (withInherited ? ' Inside g(), <code>this</code> has static type ' + g.h.A + ', so <code>m(this)</code> always locks in m(' + g.h.A + '); then dynamic dispatch on the object.' + (g.hasH ? ' <code>super.m(this)</code> in h() locks in a signature using ' + g.h.A + '’s methods with argument type ' + g.h.B + ' and runs ' + g.h.A + '’s version: super calls are never dynamically dispatched.' : '') : '')) +
        P(g.calls.map((c, i) => '<code>' + esc(c) + '</code> → ' + esc(g.outs[i])).join('<br>')),
      _java: { src: javaProg(g.mainBody, '', g.clsSrc + '\n'), expect: { kind: 'out', out: g.outs.join('\n') } } });
  }
  B3.push({ id: 'B-3-overload-override', type: B3T[1], make(r) { return dispatchQ(genDispatch(r, false), false); } });
  B3.push({ id: 'B-3-overload-override-this', type: B3T[1], make(r) { return dispatchQ(genDispatch(r, true), true); } });

  // ---- fields and static methods follow static type ----
  B3.push({ id: 'B-3-static-vs-dynamic-fields', type: B3T[0], make(r) {
    return retry(r, () => {
      const h = mkHier(r); const { A, B } = h;
      const xa = r.int(1, 9), xb = r.int(10, 19);
      const bOverGet = r.bool(), bOverI = r.bool() || true;
      const clsSrc = 'class ' + A + ' {\n  int x = ' + xa + ';\n  static String s() { return "' + A + '.s"; }\n  String i() { return "' + A + '.i"; }\n  int getX() { return x; }\n}\n' +
        'class ' + B + ' extends ' + A + ' {\n  int x = ' + xb + ';\n  static String s() { return "' + B + '.s"; }\n  String i() { return "' + B + '.i"; }\n' + (bOverGet ? '  int getX() { return x; }\n' : '') + '}';
      const vars = { a: [A, B], b: [B, B], c: [A, A] };
      const exprs = [];
      const cand = [
        ['a.x', String(xa)], ['b.x', String(xb)], ['((' + A + ') b).x', String(xa)], ['((' + B + ') a).x', String(xb)],
        ['a.s()', A + '.s'], ['b.s()', B + '.s'], ['((' + A + ') b).s()', A + '.s'],
        ['a.i()', B + '.i'], ['((' + A + ') b).i()', B + '.i'], ['c.i()', A + '.i'],
        ['a.getX()', String(bOverGet ? xb : xa)], ['b.getX()', String(bOverGet ? xb : xa)], ['c.getX()', String(xa)],
      ];
      const pick = r.sample(cand, 5);
      const out = pick.map(p => p[1]);
      const body = A + ' a = new ' + B + '();\n' + B + ' b = new ' + B + '();\n' + A + ' c = new ' + A + '();\nSystem.out.println(' + pick.map(p => p[0]).join(' + " " + ') + ');';
      if (!pick.some(p => p[0].includes('getX') || p[0].includes('.x'))) return null;
      // Java concatenation: first operand might be int, fix by prefixing ""
      const jbody = body.replace('System.out.println(', 'System.out.println("" + ');
      return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
        prompt: P('What does the last line print? (Type the five values separated by spaces.)') + code(clsSrc + '\n\n// in main:\n' + jbody),
        hint: 'Fields and static methods are picked by the STATIC type; only overridden instance methods use the dynamic type. A method body reads the field of the class it is written in.',
        solution: P('Static type decides fields and static methods (they hide, not override). Instance methods i() and getX() dispatch on the dynamic type; inside getX(), <code>x</code> means the x of the class whose code is running' + (bOverGet ? ' (' + B + ' overrides getX, so on a ' + B + ' object it returns ' + B + '’s x = ' + xb + ').' : ' (only ' + A + ' defines getX, so it always returns ' + A + '’s x = ' + xa + ').')) +
          P(pick.map(p => '<code>' + esc(p[0]) + '</code> → ' + esc(p[1])).join('<br>')),
        _java: { src: javaProg(jbody, '', clsSrc + '\n'), expect: { kind: 'out', out: out.join(' ') } } });
    });
  } });

  // ---- compile / CCE classification of a single statement ----
  function castCtx(r) {
    const h = mkHier(r); const { A, B, C, D } = h;
    const speakers = [A].concat(r.sample([B, C, D], r.int(1, 3)));
    const setup = [['o', 'Object', r.pick([A, B, C, D])], ['a', A, r.pick([A, B, C, D])], ['b', B, r.pick([B, C])]];
    return { h, speakers, setup };
  }
  function genCastStmt(r, target, ctx0) {
    return retry(r, () => {
      const ctx = ctx0 || castCtx(r);
      const h = ctx.h; const { A, B, C, D } = h;
      const speakers = ctx.speakers, setup = ctx.setup;
      const spk = c => { for (const k of h.chain(c)) if (speakers.includes(k)) return k + '.speak'; return null; };
      const S = Object.fromEntries(setup.map(s => [s[0], s[1]])), Dy = Object.fromEntries(setup.map(s => [s[0], s[2]]));
      const w = r.pick(['o', 'a', 'b']);
      const form = r.int(0, 4);
      const T = r.pick([A, B, C, D]), U = r.pick([A, B, C, D, 'Object']);
      let stmt, res; // res: {k:'compile'} | {k:'cce'} | {k:'out', out}
      const callable = (t, m) => (m === 'speak' ? h.isSub(t, A) : h.isSub(t, B));
      if (form === 0) { stmt = T + ' v = ' + w + ';\nv.speak();'; res = h.isSub(S[w], T) ? { k: 'out', out: spk(Dy[w]) } : { k: 'compile' }; }
      else if (form === 1) {
        if (U === 'Object') return null;
        stmt = T + ' v = (' + U + ') ' + w + ';\nv.speak();';
        if (!h.related(U, S[w]) || !h.isSub(U, T)) res = { k: 'compile' }; else if (!h.isSub(Dy[w], U)) res = { k: 'cce' }; else res = { k: 'out', out: spk(Dy[w]) };
      } else if (form === 2) { stmt = w + '.fetch();'; res = callable(S[w], 'fetch') ? { k: 'out', out: B + '.fetch' } : { k: 'compile' }; }
      else if (form === 3) {
        stmt = '((' + U + ') ' + w + ').fetch();';
        if (!h.related(U, S[w]) || U === 'Object' || !callable(U, 'fetch')) res = { k: 'compile' }; else if (!h.isSub(Dy[w], U)) res = { k: 'cce' }; else res = { k: 'out', out: B + '.fetch' };
      } else {
        stmt = '((' + U + ') ' + w + ').speak();';
        if (!h.related(U, S[w]) || U === 'Object' || !callable(U, 'speak')) res = { k: 'compile' }; else if (!h.isSub(Dy[w], U)) res = { k: 'cce' }; else res = { k: 'out', out: spk(Dy[w]) };
      }
      if (target && res.k !== target) return null;
      if (ctx0 && target === null && r.float() < 0.3 && res.k === 'compile') return null;
      const clsSrc = [A, B, C, D].map(c => extendsDecl(h, c) + ' {' + (speakers.includes(c) ? '\n  void speak() { System.out.println("' + c + '.speak"); }' : '') + (c === B ? '\n  void fetch() { System.out.println("' + B + '.fetch"); }' : '') + '\n}').join('\n');
      const setupSrc = setup.map(s => s[1] + ' ' + s[0] + ' = new ' + s[2] + '();').join('\n');
      return { h, speakers, setup, stmt, res, clsSrc, setupSrc, S, Dy, w };
    });
  }
  B3.push({ id: 'B-3-compile-vs-cce', type: B3T[2], make(r) {
    const g = genCastStmt(r, r.pick(['compile', 'cce', 'out']));
    const { h } = g;
    const lab = res => (res.k === 'compile' ? 'Compile error' : res.k === 'cce' ? 'Compiles, then throws ClassCastException at runtime' : 'Compiles and prints ' + res.out);
    const correct = lab(g.res);
    const wr = ['Compile error', 'Compiles, then throws ClassCastException at runtime'].concat(g.speakers.map(s => 'Compiles and prints ' + s + '.speak')).concat(['Compiles and prints ' + h.B + '.fetch']);
    const m = mcq(r, correct, wr, null, 5);
    let why;
    if (g.res.k === 'compile') why = 'The compiler only knows static types: ' + (g.stmt.includes('(') && /\(\w+\) /.test(g.stmt) ? 'either the cast is between unrelated classes, the cast result is not assignable to the declared type, or the method is not defined in the (cast) static type.' : 'the expression’s static type is not a subtype of the declared variable type, or the method is not defined in the static type.');
    else if (g.res.k === 'cce') why = 'It compiles (the cast types are related), but the object’s dynamic type ' + g.Dy[g.w] + ' is not a subtype of the cast type, so the runtime check fails.';
    else why = 'Compiles (static types check out) and the runtime cast check passes; the call dispatches on the dynamic type ' + g.Dy[g.w] + ' → ' + g.res.out + '.';
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
      prompt: P('Given these classes and the three setup lines, what happens when the last statement(s) are added to main?') + code(g.clsSrc + '\n\n// in main:\n' + g.setupSrc + '\n// the statement in question:\n' + g.stmt),
      hint: 'Compile time: casts need related types; assignments and method calls are checked against the static type. Run time: a cast checks the dynamic type.',
      solution: P('Static types: o : Object, a : ' + h.A + ', b : ' + h.B + '. Dynamic type of ' + g.w + ': ' + g.Dy[g.w] + '. ' + why) + P('Answer: <b>' + esc(correct) + '</b>.'),
      _java: { src: javaProg(g.setupSrc + '\n' + g.stmt, '', g.clsSrc + '\n'), expect: g.res.k === 'out' ? { kind: 'out', out: g.res.out } : { kind: g.res.k } } });
  } });
  // multi: which of these statements compile (static-type table)
  B3.push({ id: 'B-3-which-compile', type: B3T[0], make(r) {
    return retry(r, () => {
      const items = []; let base = null;
      const ctx = castCtx(r);
      for (let i = 0; i < 30 && items.length < 5; i++) {
        const g = genCastStmt(r, i % 2 ? 'compile' : null, ctx);
        if (!base) base = g;
        const s = g.stmt.split('\n')[0];
        if (items.some(x => x.s === s)) continue;
        items.push({ s, ok: g.res.k !== 'compile', g });
      }
      if (items.length < 4) return null;
      const n = items.filter(x => x.ok).length; if (n === 0 || n === items.length) return null;
      const m = multi(items.map(x => ({ t: '<code>' + esc(x.g.stmt.replace('\n', ' ')) + '</code>', ok: x.ok })));
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Each option is added to main on its own, after the setup lines. Which options <b>compile</b> (even if they would crash at runtime)?') + code(base.clsSrc + '\n\n// in main:\n' + base.setupSrc),
        hint: 'Make a table: static type of o, a, b. Only static types matter for compiling; a cast must be between related types.',
        solution: P('Static types: o : Object, a : ' + base.h.A + ', b : ' + base.h.B + ' (dynamic types don’t matter for compiling).') +
          P(items.map(x => '<code>' + esc(x.g.stmt.replace('\n', ' ')) + '</code>: ' + (x.ok ? 'compiles' + (x.g.res.k === 'cce' ? ' (but throws ClassCastException at runtime)' : '') : 'compile error')).join('<br>')),
        _java: items.map(x => ({ src: javaProg(base.setupSrc + '\n' + x.g.stmt, '', base.clsSrc + '\n'), expect: x.g.res.k === 'out' ? { kind: 'out', out: x.g.res.out } : { kind: x.g.res.k } })) });
    }, 2000);
  } });

  // ---- default methods and super calls ----
  B3.push({ id: 'B-3-default-super', type: B3T[3], make(r) {
    return retry(r, () => {
      const I = r.pick(['Greeter', 'Namer', 'Speaker']);
      const word = r.pick(['hi', 'yo', 'hey']);
      const h = mkHier(r); const A = h.A, B = h.B, C = h.C;
      const cls = [A, B, C];
      const def = { [A]: { name: true, greet: r.bool() }, [B]: { name: r.bool(), greet: r.bool() }, [C]: { name: r.bool(), greet: r.bool() } };
      const parent = { [A]: null, [B]: A, [C]: B };
      const nameOf = (dyn) => { for (let c = dyn; c; c = parent[c]) if (def[c].name) return c.toLowerCase(); };
      const greetFrom = (start, dyn) => { // run greet() implementation found from class `start` upward
        for (let c = start; c; c = parent[c]) if (def[c].greet) {
          if (c === A) return A[0] + ':' + word + '-' + nameOf(dyn); // A: Greeter.super.greet()
          return c[0] + ':' + greetFrom(parent[c], dyn);
        }
        return word + '-' + nameOf(dyn);
      };
      const src = 'interface ' + I + ' {\n  String name();\n  default String greet() { return "' + word + '-" + name(); }\n}\n' +
        cls.map(c => (c === A ? 'class ' + A + ' implements ' + I : 'class ' + c + ' extends ' + parent[c]) + ' {\n' +
          (def[c].name ? '  public String name() { return "' + c.toLowerCase() + '"; }\n' : '') +
          (def[c].greet ? '  public String greet() { return "' + c[0] + ':" + ' + (c === A ? I + '.super.greet()' : 'super.greet()') + '; }\n' : '') + '}').join('\n');
      const objs = r.shuffle(cls).slice(0, 3);
      const outs = objs.map(d => greetFrom(d, d));
      if (new Set(outs).size < 2) return null;
      if (!cls.some(c => def[c].greet) ) return null;
      const body = objs.map((d, i) => I + ' g' + i + ' = new ' + d + '();').join('\n') + '\nSystem.out.println(' + objs.map((_, i) => 'g' + i + '.greet()').join(' + " / " + ') + ');';
      const ans = outs.join(' / ');
      return Q({ kind: 'text', answer: [ans, outs.join('/')],
        prompt: P('What does the last line print? (Type it exactly, including the " / " separators.)') + code(src + '\n\n// in main:\n' + body),
        hint: 'greet() dispatches on the dynamic type; super.greet() runs the parent’s version (no dynamic dispatch); but name() called inside any version still dispatches on the object.',
        solution: P('For each object, find the most specific greet(). Each <code>super.greet()</code> / <code>' + I + '.super.greet()</code> moves one level up and runs that exact body; the default method calls <code>name()</code>, which is dynamically dispatched on the original object.') +
          P(objs.map((d, i) => 'new ' + d + '() → ' + esc(outs[i])).join('<br>')),
        _java: { src: javaProg(body, '', src + '\n'), expect: { kind: 'out', out: ans } } });
    });
  } });

  // ---- higher-order functions ----
  B3.push({ id: 'B-3-hof-stateful', type: B3T[4], make(r) {
    const a = r.int(2, 4), b = r.int(-3, 3), K = r.int(0, 3), xs = [r.int(1, 5), r.int(1, 5), r.int(1, 5)];
    const f = x => x * a + b;
    let k = K; const g = x => { k += 1; return x + k; };
    const exprs = r.shuffle([
      ['twice(f, ' + xs[0] + ')', () => f(f(xs[0]))],
      ['compose(f, g).apply(' + xs[1] + ')', () => f(g(xs[1]))],
      ['twice(g, ' + xs[2] + ')', () => { const t = g(xs[2]); return g(t); }],
      ['compose(g, f).apply(' + xs[0] + ')', () => g(f(xs[0]))],
      ['g.apply(0)', () => g(0)],
    ]).slice(0, 4);
    if (!exprs.some(e => e[0].includes('g'))) exprs[0] = ['g.apply(0)', () => g(0)];
    const vals = exprs.map(e => e[1]());
    const helpers = 'interface IntFn { int apply(int x); }\nstatic int twice(IntFn f, int x) { return f.apply(f.apply(x)); }\nstatic IntFn compose(IntFn f, IntFn g) { return x -> f.apply(g.apply(x)); }';
    const cls = 'class Counter implements IntFn {\n  int k;\n  Counter(int k) { this.k = k; }\n  public int apply(int x) { k += 1; return x + k; }\n}\n';
    const body = 'IntFn f = x -> x * ' + a + ' + ' + b + ';\nIntFn g = new Counter(' + K + ');\n' + exprs.map(e => 'System.out.println(' + e[0] + ');').join('\n');
    const helpersJ = 'interface IntFn { int apply(int x); }\nstatic int twice(IntFn f, int x) { return f.apply(f.apply(x)); }\nstatic IntFn compose(IntFn f, IntFn g) { return x -> f.apply(g.apply(x)); }';
    return Q({ kind: 'list', answer: vals,
      prompt: P('What do the four println calls print? Enter the four numbers in order, comma-separated.') + code(helpers + '\n' + cls.replace(/\n$/, '') + '\n\n// in main:\n' + body),
      hint: 'g is ONE object whose field k keeps growing across every call, including calls made inside twice/compose.',
      solution: P('f(x) = ' + a + 'x ' + (b >= 0 ? '+ ' + b : '− ' + -b) + '. g is a Counter: every apply first increments its own k (starting at ' + K + '), so each call to g adds a bigger number. compose(p, q).apply(x) = p(q(x)) (q runs first). Calls happen in program order.') +
        P(exprs.map((e, i) => '<code>' + esc(e[0]) + '</code> → ' + vals[i]).join('<br>')),
      _java: { src: javaProg(body, helpersJ.replace(/^interface IntFn \{ int apply\(int x\); \}\n/, ''), 'interface IntFn { int apply(int x); }\n' + cls), expect: { kind: 'out', out: vals.join('\n') } } });
  } });
  B3.push({ id: 'B-3-hof-returning', type: B3T[4], make(r) {
    const n1 = r.int(1, 5), n2 = r.int(2, 3), reps = r.int(2, 4), x0 = r.int(0, 6), m = r.int(2, 3);
    const add = n => x => x + n, mul = n => x => x * n;
    const rep = (f, n) => x => { for (let i = 0; i < n; i++) x = f(x); return x; };
    const arr = [r.int(1, 6), r.int(1, 6), r.int(1, 6), r.int(1, 6)];
    const variant = r.int(0, 1);
    let body, vals;
    if (variant === 0) {
      body = 'IntFn p = adder(' + n1 + ');\nIntFn q = rep(p, ' + reps + ');\nIntFn s = rep(times(' + n2 + '), 2);\nSystem.out.println(q.apply(' + x0 + '));\nSystem.out.println(s.apply(q.apply(1)));\nSystem.out.println(rep(s, 2).apply(1));';
      const q = rep(add(n1), reps), s = rep(mul(n2), 2);
      vals = [q(x0), s(q(1)), rep(s, 2)(1)];
    } else {
      body = 'int[] a = {' + arr.join(', ') + '};\nmapInPlace(a, adder(' + n1 + '));\nmapInPlace(a, rep(times(' + m + '), 2));\nint t = 0;\nfor (int v : a) t += v;\nSystem.out.println(a[0]);\nSystem.out.println(a[3]);\nSystem.out.println(t);';
      const f1 = add(n1), f2 = rep(mul(m), 2); const b = arr.map(f1).map(f2);
      vals = [b[0], b[3], sum(b)];
    }
    const helpers = 'static IntFn adder(int n) { return x -> x + n; }\nstatic IntFn times(int n) { return x -> x * n; }\nstatic IntFn rep(IntFn f, int n) {\n  return x -> { for (int i = 0; i < n; i++) x = f.apply(x); return x; };\n}\nstatic void mapInPlace(int[] a, IntFn f) {\n  for (int i = 0; i < a.length; i++) a[i] = f.apply(a[i]);\n}';
    return Q({ kind: 'list', answer: vals,
      prompt: P('Given <code>interface IntFn { int apply(int x); }</code> and these static methods, what do the three println calls print? (comma-separated)') + code(helpers + '\n\n// in main:\n' + body),
      hint: 'adder(n) and times(n) RETURN function objects; rep(f, n) returns a function that applies f n times.',
      solution: P('adder(' + n1 + ') is x ↦ x + ' + n1 + '; times(k) is x ↦ k·x; rep(f, n) applies f n times, so rep(times(k), 2) multiplies by k².') + P('Printed: <b>' + vals.join(', ') + '</b>.'),
      _java: { src: javaProg(body, helpers, 'interface IntFn { int apply(int x); }\n'), expect: { kind: 'out', out: vals.join('\n') } } });
  } });
  G['B-3'] = B3;

  // ===================== B-4 =====================
  const B4 = [];
  const B4T = ['Write iterators (hasNext/next), incl. filtering/skipping', 'Iterable and enhanced for', 'Write equals (instanceof, cast, fields) + matching hashCode',
    'Comparable vs Comparator; write compare methods; sorting with them'];
  const ITER_IMPORT = 'import java.util.*;\n';

  B4.push({ id: 'B-4-iterator-skip-filter', type: B4T[0], make(r) {
    return retry(r, () => {
      const a = range(0, r.int(8, 11)).map(() => r.int(1, 30));
      const v = r.int(0, 2); let cls, out, desc, ctor;
      if (v === 0) {
        const s = r.int(0, 2), k = r.int(2, 3);
        cls = 'class SkipIter implements Iterator<Integer> {\n  private int[] a; private int i;\n  SkipIter(int[] a) { this.a = a; i = ' + s + '; }\n  public boolean hasNext() { return i < a.length; }\n  public Integer next() { int v = a[i]; i += ' + k + '; return v; }\n}';
        out = a.filter((_, j) => j >= s && (j - s) % k === 0); desc = 'returns a[' + s + '], a[' + (s + k) + '], … (every ' + k + 'th index starting at ' + s + ')';
      } else if (v === 1) {
        const m = r.pick([2, 3, 4]), rr = r.int(0, m - 1);
        cls = 'class SkipIter implements Iterator<Integer> {\n  private int[] a; private int i = 0;\n  SkipIter(int[] a) { this.a = a; }\n  public boolean hasNext() {\n    while (i < a.length && a[i] % ' + m + ' != ' + rr + ') i++;\n    return i < a.length;\n  }\n  public Integer next() { hasNext(); int v = a[i]; i++; return v; }\n}';
        out = a.filter(x => x % m === rr); desc = 'skips to the next item with item % ' + m + ' == ' + rr + ' (hasNext may be called many times safely: it stops ON a match)';
      } else {
        const t = r.int(8, 20);
        cls = 'class SkipIter implements Iterator<Integer> {\n  private int[] a; private int i = 0;\n  SkipIter(int[] a) { this.a = a; }\n  public boolean hasNext() { return i < a.length; }\n  public Integer next() {\n    int v = a[i]; i++;\n    while (i < a.length && a[i] <= v) i++;   // skip items not bigger than v\n    return v;\n  }\n}';
        out = []; let i = 0; while (i < a.length) { const x = a[i]; i++; while (i < a.length && a[i] <= x) i++; out.push(x); }
        desc = 'returns an item, then skips every following item that is ≤ it';
      }
      if (out.length < 2 || out.length === a.length) return null;
      const body = 'int[] arr = {' + a.join(', ') + '};\nIterator<Integer> it = new SkipIter(arr);\nString s = "";\nwhile (it.hasNext()) s += it.next() + " ";\nSystem.out.println(s.trim());';
      return Q({ kind: 'list', answer: out,
        prompt: P('What does this print? (comma-separated numbers)') + code(cls + '\n\n// in main:\n' + body),
        hint: 'Trace i: write down its value after every hasNext/next call.',
        solution: P('The iterator ' + desc + '. Output: <b>' + out.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', cls + '\n'), expect: { kind: 'out', out: out.join(' ') } } });
    });
  } });
  B4.push({ id: 'B-4-iterator-hasnext-side-effect', type: B4T[0], make(r) {
    return retry(r, () => {
      const a = range(0, r.int(7, 10)).map(() => r.int(1, 20));
      const buggy = r.float() < 0.7, m = r.pick([2, 3]);
      const cls = buggy
        ? 'class It implements Iterator<Integer> {\n  private int[] a; private int i = -1;\n  It(int[] a) { this.a = a; }\n  public boolean hasNext() { i += 1; return i < a.length; }\n  public Integer next() { return a[i]; }\n}'
        : 'class It implements Iterator<Integer> {\n  private int[] a; private int i = -1;\n  It(int[] a) { this.a = a; }\n  public boolean hasNext() { return i + 1 < a.length; }\n  public Integer next() { i += 1; return a[i]; }\n}';
      let i = -1; const hn = () => { if (buggy) { i += 1; return i < a.length; } return i + 1 < a.length; };
      const nx = () => { if (buggy) return a[i]; i += 1; return a[i]; };
      const out = [];
      while (hn()) { const v = nx(); if (v % m === 0 && hn()) out.push(v * 10 + nx()); else out.push(v); }
      if (out.length < 2) return null;
      const body = 'int[] arr = {' + a.join(', ') + '};\nIterator<Integer> it = new It(arr);\nString s = "";\nwhile (it.hasNext()) {\n  int v = it.next();\n  if (v % ' + m + ' == 0 && it.hasNext()) s += (v * 10 + it.next()) + " ";\n  else s += v + " ";\n}\nSystem.out.println(s.trim());';
      return Q({ kind: 'list', answer: out,
        prompt: P('What does this print? (comma-separated numbers)') + code(cls + '\n\n// in main:\n' + body),
        hint: buggy ? 'Look closely at hasNext: does calling it change the iterator’s state? && short-circuits.' : 'hasNext only looks; next advances. && short-circuits.',
        solution: P(buggy ? 'This hasNext() advances i every time it is called (a bug: hasNext must not change state). Each loop test moves to a new item, and the inner <code>it.hasNext()</code> (evaluated only when v % ' + m + ' == 0) also moves on, so it just happens to consume one item before next(). Trace i carefully.' : 'This iterator is correct: hasNext() has no side effects and next() advances. When v % ' + m + ' == 0 and an item remains, the next item is consumed and combined as v·10 + next.') +
          P('Output: <b>' + out.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', cls + '\n'), expect: { kind: 'out', out: out.join(' ') } } });
    });
  } });
  B4.push({ id: 'B-4-iterable-nested-foreach', type: B4T[1], make(r) {
    const lo = r.int(1, 4), n = r.int(3, 5), st = r.int(1, 3);
    const xs = range(0, n).map(i => lo + i * st), hi = lo + n * st;
    const v = r.int(0, 2), cond = r.pick(['none', 'lt']);
    const iterCls = 'class RangeIter implements Iterator<Integer> {\n    int cur;\n    RangeIter(int start) { cur = start; }\n    public boolean hasNext() { return cur < hi; }\n    public Integer next() { int v = cur; cur += step; return v; }\n  }';
    let cls;
    if (v === 0) cls = 'class Range implements Iterable<Integer> {\n  int lo, hi, step;\n  Range(int lo, int hi, int step) { this.lo = lo; this.hi = hi; this.step = step; }\n  public Iterator<Integer> iterator() { return new RangeIter(lo); }\n  ' + iterCls + '\n}';
    else if (v === 1) cls = 'class Range implements Iterable<Integer> {\n  int lo, hi, step;\n  RangeIter shared;\n  Range(int lo, int hi, int step) { this.lo = lo; this.hi = hi; this.step = step; shared = new RangeIter(lo); }\n  public Iterator<Integer> iterator() { return shared; }\n  ' + iterCls + '\n}';
    else cls = 'class Range implements Iterable<Integer>, Iterator<Integer> {\n  int lo, hi, step, cur;\n  Range(int lo, int hi, int step) { this.lo = lo; this.hi = hi; this.step = step; }\n  public Iterator<Integer> iterator() { cur = lo; return this; }\n  public boolean hasNext() { return cur < hi; }\n  public Integer next() { int v = cur; cur += step; return v; }\n}';
    // simulate
    let count = 0, total = 0;
    const ok = (x, y) => cond === 'none' || x < y;
    if (v === 0) { for (const x of xs) for (const y of xs) if (ok(x, y)) { count++; total += x * y; } }
    else if (v === 1) { let p = 0; while (p < n) { const x = xs[p++]; while (p < n) { const y = xs[p++]; if (ok(x, y)) { count++; total += x * y; } } } }
    else { let p = 0; while (p < n) { const x = xs[p++]; p = 0; while (p < n) { const y = xs[p++]; if (ok(x, y)) { count++; total += x * y; } } } }
    const inner = cond === 'none' ? '{ count++; total += x * y; }' : 'if (x < y) { count++; total += x * y; }';
    const body = 'Range rg = new Range(' + lo + ', ' + hi + ', ' + st + ');\nint count = 0, total = 0;\nfor (int x : rg)\n  for (int y : rg)\n    ' + inner + '\nSystem.out.println(count + " " + total);';
    const why = v === 0 ? 'iterator() returns a NEW iterator each time, so the inner loop restarts from ' + lo + ' for every x: an ordinary double loop.'
      : v === 1 ? 'iterator() returns the SAME iterator object both times. The outer loop takes x = ' + xs[0] + '; the inner loop then drains the rest of that one iterator; when control returns to the outer loop, hasNext() is false.'
        : 'iterator() resets the shared cursor and returns the Range itself. Outer takes x = ' + xs[0] + '; the inner loop resets cur to ' + lo + ' and runs to the end; then the outer hasNext() sees cur at the end and stops.';
    return Q({ kind: 'list', answer: [count, total],
      prompt: P('Range(' + lo + ', ' + hi + ', ' + st + ') yields ' + xs.join(', ') + '. What does this print? (two numbers, comma-separated)') + code(cls + '\n\n// in main:\n' + body),
      hint: 'An enhanced for calls iterator() once at its start. Ask whether the two loops get different iterator objects.',
      solution: P(why) + P('count = ' + count + ', total = ' + total + '.'),
      _java: { src: ITER_IMPORT + javaProg(body, '', cls + '\n'), expect: { kind: 'out', out: count + ' ' + total } } });
  } });

  // ---- equals / hashCode with HashSet / HashMap (models Java's HashMap matching: same hash AND (== or equals)) ----
  const PT_VARIANTS = [
    { d: 'correct equals(Object) and hashCode', eq: 'xy', hash: 'good', ov: true },
    { d: 'correct equals(Object), no hashCode', eq: 'xy', hash: 'id', ov: true },
    { d: 'equals(Pt) overload (does not override), correct hashCode', eq: 'xy', hash: 'good', ov: false },
    { d: 'correct equals, hashCode returns x', eq: 'xy', hash: 'x', ov: true },
    { d: 'equals compares only x, hashCode uses x and y', eq: 'x', hash: 'good', ov: true },
  ];
  function ptSrc(v) {
    const eqBody = v.eq === 'xy' ? 'x == p.x && y == p.y' : 'x == p.x';
    let s = 'class Pt {\n  int x, y;\n  Pt(int x, int y) { this.x = x; this.y = y; }\n';
    if (v.ov) s += '  @Override public boolean equals(Object o) {\n    if (!(o instanceof Pt)) return false;\n    Pt p = (Pt) o;\n    return ' + eqBody + ';\n  }\n';
    else s += '  public boolean equals(Pt p) {\n    return ' + eqBody + ';\n  }\n';
    if (v.hash === 'good') s += '  @Override public int hashCode() { return 31 * x + y; }\n';
    if (v.hash === 'x') s += '  @Override public int hashCode() { return x; }\n';
    return s + '}';
  }
  function ptModel(v) {
    const fe = (a, b) => (v.eq === 'xy' ? a.x === b.x && a.y === b.y : a.x === b.x);
    const eqObj = (a, b) => (v.ov ? fe(a, b) : a === b);
    const hash = a => (v.hash === 'good' ? 31 * a.x + a.y : v.hash === 'x' ? a.x : 'id' + a.id);
    const match = (a, b) => hash(a) === hash(b) && (a === b || eqObj(a, b));
    const eqStatic = (a, b, staticPt) => (staticPt && !v.ov ? fe(a, b) : eqObj(a, b));
    return { match, eqStatic };
  }
  B4.push({ id: 'B-4-equals-hashset', type: B4T[2], make(r) {
    return retry(r, () => {
      const vi = r.int(0, 4), v = PT_VARIANTS[vi], M = ptModel(v);
      let id = 0; const mk = (x, y) => ({ x, y, id: id++ });
      const ax = r.int(1, 5), ay = r.int(1, 5), by = ay + r.int(1, 3), cx = ax + r.int(1, 3);
      const p = mk(ax, ay);
      const adds = [['p', p], ['new Pt(' + ax + ', ' + ay + ')', mk(ax, ay)], ['new Pt(' + ax + ', ' + by + ')', mk(ax, by)], ['new Pt(' + cx + ', ' + ay + ')', mk(cx, ay)], ['p', p]];
      const order = r.shuffle(adds.slice(1, 4)); const seq = [adds[0]].concat(order).concat(r.bool() ? [adds[4]] : []);
      const set = [];
      for (const [, o] of seq) if (!set.some(e => M.match(o, e))) set.push(o);
      const q = mk(ax, ay);
      const contains = set.some(e => M.match(q, e));
      const eq1 = M.eqStatic(p, mk(ax, ay), true), eq2 = M.eqStatic(p, mk(ax, ay), false);
      const out = [String(set.length), String(contains), String(eq1), String(eq2)];
      const body = 'Set<Pt> s = new HashSet<>();\nPt p = new Pt(' + ax + ', ' + ay + ');\n' + seq.map(x => 's.add(' + x[0] + ');').join('\n') +
        '\nObject o = new Pt(' + ax + ', ' + ay + ');\nSystem.out.println(s.size() + " " + s.contains(new Pt(' + ax + ', ' + ay + ')) + " " + p.equals(new Pt(' + ax + ', ' + ay + ')) + " " + p.equals(o));';
      return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
        prompt: P('What does the last line print? (Assume objects without a hashCode override get distinct identity hash codes.) Type the four values separated by spaces.') + code(ptSrc(v) + '\n\n// in main:\n' + body),
        hint: 'A HashSet only calls equals(Object) on items with the SAME hashCode. An equals(Pt) method is an overload the set never calls.',
        solution: P('This Pt has ' + v.d + '. HashSet.add(e) skips e only if some stored item has the same hash code and is == or equals(Object) e.') +
          P({ 0: 'Everything is consistent: equal coordinates ⇒ same hash and equals true.', 1: 'Equal points get different identity hash codes, so the set never even compares them: every distinct object is added (adding the same reference p twice is still caught by ==).', 2: 'The set calls equals(Object), which is still Object’s identity check; only p itself is recognized. But p.equals(new Pt(…)) with static type Pt picks the overload (true), while p.equals(o) with static type Object picks Object.equals (false).', 3: 'hashCode = x is valid (equal points have equal x), just collides more; results are correct.', 4: 'Points with the same x are “equal” but usually hash differently, breaking the contract: the set may keep both, but only finds equal items whose hash also matches.' }[vi]) +
          P('Output: <b>' + out.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', ptSrc(v) + '\n'), expect: { kind: 'out', out: out.join(' ') } }, _chk: { vi } });
    });
  } });
  B4.push({ id: 'B-4-equals-hashmap', type: B4T[2], make(r) {
    return retry(r, () => {
      const vi = r.int(0, 4), v = PT_VARIANTS[vi], M = ptModel(v);
      let id = 0; const mk = (x, y) => ({ x, y, id: id++ });
      const pts = [[r.int(1, 4), r.int(1, 4)]]; pts.push([pts[0][0], pts[0][1]]); pts.push([pts[0][0], pts[0][1] + r.int(1, 2)]); pts.push([r.int(5, 7), r.int(1, 4)]);
      const ord = r.shuffle(pts).concat([pts[r.int(0, 3)]]);
      const map = []; const lines = []; const vals = ['a', 'b', 'c', 'd', 'e'];
      ord.forEach((c, i) => { const k = mk(c[0], c[1]); const e = map.find(e => M.match(k, e.k)); if (e) e.v = vals[i]; else map.push({ k, v: vals[i] }); lines.push('m.put(new Pt(' + c[0] + ', ' + c[1] + '), "' + vals[i] + '");'); });
      const g1 = pts[0], qk = mk(g1[0], g1[1]); const e1 = map.find(e => M.match(qk, e.k));
      const g2 = pts[2], qk2 = mk(g2[0], g2[1]); const e2 = map.find(e => M.match(qk2, e.k));
      const out = [String(map.length), e1 ? e1.v : 'null', e2 ? e2.v : 'null'];
      if (vi === 0 && r.float() < 0.5) return null;
      const body = 'Map<Pt, String> m = new HashMap<>();\n' + lines.join('\n') + '\nSystem.out.println(m.size() + " " + m.get(new Pt(' + g1.join(', ') + ')) + " " + m.get(new Pt(' + g2.join(', ') + ')));';
      return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
        prompt: P('What does the last line print? (Assume objects without a hashCode override get distinct identity hash codes.) Three values separated by spaces.') + code(ptSrc(v) + '\n\n// in main:\n' + body),
        hint: 'put replaces the value only if it finds a stored key with equal hash code that equals(Object) the new key; get uses the same test.',
        solution: P('This Pt has ' + v.d + '. HashMap finds an existing key only when hash codes match and equals(Object) says true.') +
          P('Final entries: ' + map.map(e => '(' + e.k.x + ',' + e.k.y + ')→' + e.v).join(', ') + '. Output <b>' + out.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', ptSrc(v) + '\n'), expect: { kind: 'out', out: out.join(' ') } }, _chk: { vi } });
    });
  } });

  // ---- Comparator chains (incl. the .reversed() trap) ----
  B4.push({ id: 'B-4-comparator-chain', type: B4T[3], make(r) {
    return retry(r, () => {
      const n = 5;
      const names = r.sample(NAMES, n);
      const ages = range(0, n).map(() => r.int(18, 21)), scores = range(0, n).map(() => r.int(1, 4));
      const recs = names.map((nm, i) => ({ name: nm, age: ages[i], score: scores[i] }));
      const cmpN = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      const C = [
        ['Comparator.comparing(P::age)', (a, b) => a.age - b.age],
        ['Comparator.comparing(P::age).reversed()', (a, b) => b.age - a.age],
        ['Comparator.comparing(P::age).thenComparing(P::name)', (a, b) => a.age - b.age || cmpN(a, b)],
        ['Comparator.comparing(P::age).thenComparing(P::name).reversed()', (a, b) => b.age - a.age || cmpN(b, a)],
        ['Comparator.comparing(P::age).reversed().thenComparing(P::name)', (a, b) => b.age - a.age || cmpN(a, b)],
        ['Comparator.comparing(P::score).thenComparing(P::age, Comparator.reverseOrder())', (a, b) => a.score - b.score || b.age - a.age],
        ['(p, q) -> q.name().length() - p.name().length()', (a, b) => b.name.length - a.name.length],
        ['Comparator.comparing(P::name).reversed()', (a, b) => cmpN(b, a)],
      ];
      const [cs, cf] = r.pick(C);
      const sorted = recs.slice().sort(cf);
      if (sorted.map(x => x.name).join() === recs.map(x => x.name).join()) return null;
      // require a tie in the primary key so stability/secondary key matters (for non-name comparators)
      if (!cs.includes('P::name)') && !cs.includes('P::name).reversed') && new Set(sorted.map(x => cf(x, sorted[0]))).size === n) return null;
      const out = sorted.map(x => x.name);
      const decl = 'record P(String name, int age, int score) {}';
      const body = 'List<P> L = new ArrayList<>(List.of(' + recs.map(x => 'new P("' + x.name + '", ' + x.age + ', ' + x.score + ')').join(',\n    ') + '));\nL.sort(' + cs + ');\nString s = "";\nfor (P p : L) s += p.name() + " ";\nSystem.out.println(s.trim());';
      return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
        prompt: P('List.sort is stable. What does this print? (names separated by spaces)') + code(decl + '\n\n// in main:\n' + body),
        hint: '.reversed() reverses the WHOLE comparator built so far, including earlier thenComparing tie-breakers. Ties not broken keep their original order.',
        solution: P('Comparator: <code>' + esc(cs) + '</code>. ' + (cs.endsWith('.thenComparing(P::name).reversed()') ? 'Here reversed() applies to (age, then name), so ages go high→low AND ties go Z→A by name. ' : cs.includes('reversed().thenComparing') ? 'Here only age is reversed; ties are then broken by name A→Z. ' : '') + 'Items equal under the comparator stay in input order (stable).') +
          P('Records: ' + recs.map(x => x.name + '(' + x.age + ', ' + x.score + ')').join(', ') + ' → <b>' + out.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', decl + '\n'), expect: { kind: 'out', out: out.join(' ') } }, _chk: { recs, cs } });
    });
  } });
  B4.push({ id: 'B-4-comparable-compareTo', type: B4T[3], make(r) {
    return retry(r, () => {
      const suits = ['C', 'D', 'H', 'S'];
      const cards = []; const seen = new Set();
      while (cards.length < 6) { const c = { rank: r.int(2, 9), suit: r.pick(suits) }; const k = c.rank + c.suit; if (!seen.has(k)) { seen.add(k); cards.push(c); } }
      if (new Set(cards.map(c => c.rank)).size > 4) return null;
      const v = r.int(0, 2);
      const src = [
        ['if (rank != o.rank) return o.rank - rank;\n    return suit.compareTo(o.suit);', (a, b) => b.rank - a.rank || (a.suit < b.suit ? -1 : a.suit > b.suit ? 1 : 0), 'rank high→low, then suit A→Z'],
        ['int c = suit.compareTo(o.suit);\n    if (c != 0) return -c;\n    return rank - o.rank;', (a, b) => (a.suit < b.suit ? 1 : a.suit > b.suit ? -1 : 0) || a.rank - b.rank, 'suit Z→A, then rank low→high'],
        ['return (rank % 3) - (o.rank % 3);', (a, b) => (a.rank % 3) - (b.rank % 3), 'rank mod 3 only (ties keep input order)'],
      ][v];
      const sorted = cards.slice().sort(src[1]);
      const mx = cards.reduce((m, c) => (src[1](c, m) > 0 ? c : m), cards[0]); // Collections.max returns first maximal
      const tag = c => c.rank + c.suit;
      const out = sorted.map(tag).concat([tag(mx)]);
      const cls = 'class Card implements Comparable<Card> {\n  int rank; String suit;\n  Card(int rank, String suit) { this.rank = rank; this.suit = suit; }\n  public int compareTo(Card o) {\n    ' + src[0] + '\n  }\n  public String toString() { return rank + suit; }\n}';
      const body = 'List<Card> L = new ArrayList<>();\n' + cards.map(c => 'L.add(new Card(' + c.rank + ', "' + c.suit + '"));').join('\n') + '\nCard mx = Collections.max(L);\nCollections.sort(L);\nString s = "";\nfor (Card c : L) s += c + " ";\nSystem.out.println(s + mx);';
      return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
        prompt: P('Collections.sort is stable; Collections.max returns the first maximal element in list order. What does this print? (7 tokens separated by spaces: the sorted cards, then mx)') + code(cls + '\n\n// in main:\n' + body),
        hint: 'compareTo negative ⇒ this comes first. Max is the element that sorts LAST under this order (first one found if tied).',
        solution: P('This compareTo orders by ' + src[2] + '. Sorted: ' + sorted.map(tag).join(' ') + '; max = ' + tag(mx) + '.') + P('Output <b>' + out.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', cls + '\n'), expect: { kind: 'out', out: out.join(' ') } }, _chk: { cards, v } });
    });
  } });
  G['B-4'] = B4;

  // ===================== B-5 =====================
  const B5 = [];
  const B5T = ['Θ of nested loops with non-uniform bounds (i *= 2, j < i)', 'Recursive runtimes via recursion trees', 'Best vs worst case', 'Amortized analysis',
    'O/Ω/Θ true/false; compare growth rates', 'Runtime of given code that uses data structures'];
  // loop AST: {t:'for', v, init, cond, upd} with body; {t:'op'}; {t:'if', cond, body}
  const F = (v, init, cond, upd, body) => ({ t: 'for', v, init, cond, upd, body });
  const OP = { t: 'op' };
  function loopSrc(node, ind) {
    ind = ind || '';
    if (node.t === 'op') return ind + 'count++;';
    if (node.t === 'if') return ind + 'if (' + node.cond + ') {\n' + node.body.map(b => loopSrc(b, ind + '  ')).join('\n') + '\n' + ind + '}';
    return ind + 'for (int ' + node.v + ' = ' + node.init + '; ' + node.cond + '; ' + node.v + node.upd + ') {\n' + node.body.map(b => loopSrc(b, ind + '  ')).join('\n') + '\n' + ind + '}';
  }
  const LOOP_TEMPLATES = [
    r => { const c = r.pick([2, 3]); return [[F('i', '1', 'i < n', ' *= ' + c, [F('j', '0', 'j < i', '++', [OP])])], 'Θ(n)', 'Inner loop runs i times, and i takes the values 1, ' + c + ', ' + c + '², … < n. That sum is geometric: about n·' + c + '/' + (c - 1) + ' → Θ(n).']; },
    r => { const c = r.pick([2, 3]), s = r.pick([1, 2]); return [[F('i', '0', 'i < n', s === 1 ? '++' : ' += ' + s, [F('j', '1', 'j < n', ' *= ' + c, [OP])])], 'Θ(n log n)', 'Outer runs n/' + s + ' times; inner always runs log_' + c + ' n times → Θ(n log n).']; },
    r => { const c = r.pick([2, 3]), s = r.pick([1, 3]); return [[F('i', '1', 'i < n', ' *= ' + c, [F('j', '0', 'j < n', s === 1 ? '++' : ' += ' + s, [OP])])], 'Θ(n log n)', 'Outer runs log_' + c + ' n times, inner n/' + s + ' each → Θ(n log n).']; },
    r => { const s = r.pick([1, 2, 5]); return [[F('i', '0', 'i < n', '++', [F('j', 'i', 'j < n', s === 1 ? '++' : ' += ' + s, [OP])])], 'Θ(n²)', 'Inner runs (n − i)/' + s + ' times; summing over i gives about n²/' + (2 * s) + ' → Θ(n²) (constant step doesn’t change the class).']; },
    r => [[F('i', '1', 'i <= n', '++', [F('j', '1', 'j <= n', ' += i', [OP])])], 'Θ(n log n)', 'Inner runs n/i times: n(1 + 1/2 + 1/3 + … + 1/n) = n·H(n) ≈ n ln n → Θ(n log n).'],
    r => [[F('i', '0', 'i < n', '++', [F('j', '0', 'j < i * i', '++', [OP])])], 'Θ(n³)', 'Inner runs i² times: Σ i² ≈ n³/3 → Θ(n³).'],
    r => [[F('i', '1', 'i < n', ' *= 2', [F('j', '1', 'j < i', ' *= 2', [OP])])], 'Θ(log² n)', 'i = 2^k for k < log n; inner runs k times; Σ k ≈ (log n)²/2 → Θ(log² n).'],
    r => { const c = r.pick([2, 3]); return [[F('i', 'n', 'i > 0', ' /= ' + c, [F('j', '0', 'j < i', '++', [OP])])], 'Θ(n)', 'Inner runs i times for i = n, n/' + c + ', n/' + c + '², …: geometric sum ≈ n·' + c + '/' + (c - 1) + ' → Θ(n).']; },
    r => [[F('i', '0', 'i * i < n', '++', [OP])], 'Θ(√n)', 'The loop stops once i² ≥ n, i.e. after √n iterations.'],
    r => [[F('i', '0', 'i * i < n', '++', [F('j', '0', 'j < i', '++', [OP])])], 'Θ(n)', 'i goes up to √n and the inner loop runs i times: Σ_{i<√n} i ≈ n/2 → Θ(n).'],
    r => [[F('i', '0', 'i < n', '++', [F('j', '0', 'j < n', '++', [{ t: 'if', cond: 'j == i', body: [F('k', '0', 'k < n', '++', [OP])] }])])], 'Θ(n²)', 'The i/j loops do n² checks. The k loop runs only when j == i: n times in total, n work each → n². Total Θ(n²) (not n³).'],
    r => [[F('i', '0', 'i < n', '++', [F('j', '1', 'j < i', ' *= 2', [OP])])], 'Θ(n log n)', 'Inner runs ≈ log i times; Σ log i = log(n!) = Θ(n log n).'],
    r => [[F('i', '1', 'i < n', ' *= 2', [F('j', '0', 'j < n', '++', [F('k', '0', 'k < i', '++', [OP])])])], 'Θ(n²)', 'For each i the j,k loops do n·i work; Σ over i = 1, 2, 4, … < n is n·(about 2n) → Θ(n²).'],
    r => [[F('i', '0', 'i < n', '++', [F('j', '0', 'j < i', '++', [F('k', '1', 'k < n', ' *= 2', [OP])])])], 'Θ(n² log n)', 'i,j loops run ≈ n²/2 times; the k loop is log n each → Θ(n² log n).'],
    r => { const c = r.pick([2, 3]); return [[F('i', 'n', 'i > 1', ' /= ' + c, [F('j', '0', 'j < n', '++', [OP])])], 'Θ(n log n)', 'Outer runs log_' + c + ' n times; inner always runs n (it uses n, not i) → Θ(n log n).']; },
  ];
  const THETA_LADDER = ['Θ(1)', 'Θ(log n)', 'Θ(log² n)', 'Θ(√n)', 'Θ(n)', 'Θ(n log n)', 'Θ(n log² n)', 'Θ(n²)', 'Θ(n² log n)', 'Θ(n³)', 'Θ(2ⁿ)'];
  const neighbors = (t) => { const i = THETA_LADDER.indexOf(t); return THETA_LADDER.filter((x, j) => j !== i && Math.abs(j - i) <= 3); };
  for (const part of [[0, 8], [8, 15]]) {
    B5.push({ id: 'B-5-nested-loops-' + (part[0] === 0 ? 'a' : 'b'), type: B5T[0], make(r) {
      const ti = r.int(part[0], part[1] - 1);
      const [ast, th, why] = LOOP_TEMPLATES[ti](r);
      const src = 'int count = 0;\n' + ast.map(a => loopSrc(a)).join('\n');
      const m = mcq(r, th, neighbors(th), THETA_LADDER, 5);
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
        prompt: P('What is the order of growth of the final value of <code>count</code> (equivalently, the runtime) as a function of n?') + code(src),
        hint: 'Write the inner loop’s iteration count as a function of the outer variable, then sum over the values the outer variable actually takes.',
        solution: P(why) + P('Answer: <b>' + th + '</b>.'), _chk: { ast, th } });
    } });
  }
  // recursion: T(n) = a·T(arg) + work
  const REC_TEMPLATES = [
    { a: 2, arg: { div: 2 }, work: 'n', th: 'Θ(n log n)', why: 'Each level of the recursion tree does n total work (2^k calls × n/2^k), and there are log n levels.' },
    { a: 2, arg: { sub: 1 }, work: '1', th: 'Θ(2ⁿ)', why: 'Each call makes two calls on n − 1: the tree has 2^k nodes at depth k, depth n → 2ⁿ.', twoCall: true },
    { a: 1, arg: { sub: 1 }, work: '1', th: 'Θ(n)', why: 'The result is computed ONCE and stored in x, so only one recursive call per level: n levels of constant work.', storeX: true },
    { a: 1, arg: { div: 2 }, work: '1', th: 'Θ(log n)', why: 'One call on n/2 with constant work: log n levels.' },
    { a: 1, arg: { div: 2 }, work: 'n', th: 'Θ(n)', why: 'n + n/2 + n/4 + … ≈ 2n: geometric, dominated by the top level.' },
    { a: 1, arg: { sub: 1 }, work: 'n', th: 'Θ(n²)', why: 'n + (n−1) + … + 1 = n(n+1)/2.' },
    { a: 4, arg: { div: 2 }, work: '1', th: 'Θ(n²)', why: 'Level k has 4^k calls; depth log₂n → 4^{log n} = n² leaves dominate.' },
    { a: 2, arg: { div: 2 }, work: '1', th: 'Θ(n)', why: 'Level k has 2^k calls of constant work; the n leaves dominate: 1 + 2 + … + n ≈ 2n.' },
    { a: 3, arg: { div: 3 }, work: 'n', th: 'Θ(n log n)', why: 'Each level does n total work (3^k calls × n/3^k); log₃ n levels.' },
    { a: 2, arg: { div: 2 }, work: 'n2', th: 'Θ(n²)', why: 'Level k does 2^k·(n/2^k)² = n²/2^k: a decreasing geometric series dominated by the root’s n².' },
    { a: 1, arg: { sub: 2 }, work: '1', th: 'Θ(n)', why: 'n/2 levels of constant work.' },
    { a: 2, arg: { div: 4 }, work: '1', th: 'Θ(√n)', why: 'Level k has 2^k calls; depth log₄ n, so 2^{log₄ n} = n^{1/2} leaves dominate.' },
    { a: 1, arg: { div: 2 }, work: 'n2', th: 'Θ(n²)', why: 'n² + n²/4 + … : geometric, dominated by the first level.' },
    { a: 2, arg: { div: 2 }, work: 'logn', th: 'Θ(n)', why: 'Work per level is 2^k·log(n/2^k); the bottom levels dominate and the sum is Θ(n).' },
  ];
  function recSrc(t) {
    const argS = t.arg.div ? 'n / ' + t.arg.div : 'n - ' + t.arg.sub;
    const work = t.work === '1' ? '' : t.work === 'n' ? '  for (int i = 0; i < n; i++) count++;\n' : t.work === 'n2' ? '  for (int i = 0; i < n; i++)\n    for (int j = 0; j < n; j++) count++;\n' : '  for (int i = 1; i < n; i *= 2) count++;\n';
    if (t.twoCall) return 'static int f(int n) {\n  if (n <= 1) return 1;\n  return f(n - 1) + f(n - 1);\n}';
    if (t.storeX) return 'static int f(int n) {\n  if (n <= 1) return 1;\n  int x = f(n - 1);\n  return x + x;\n}';
    return 'static void f(int n) {\n  if (n <= 1) return;\n' + work + range(0, t.a).map(() => '  f(' + argS + ');\n').join('') + '}';
  }
  for (const part of [[0, 7], [7, 14]]) {
    B5.push({ id: 'B-5-recursion-' + (part[0] === 0 ? 'a' : 'b'), type: B5T[1], make(r) {
      const t = REC_TEMPLATES[r.int(part[0], part[1] - 1)];
      const m = mcq(r, t.th, neighbors(t.th).concat(t.th === 'Θ(n)' ? ['Θ(2ⁿ)'] : []), THETA_LADDER, 5);
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
        prompt: P('What is the runtime of <code>f(n)</code>?') + code(recSrc(t)),
        hint: 'Draw the recursion tree: how many calls at depth k, how much work each, how deep is it?', solution: P(t.why) + P('Answer: <b>' + t.th + '</b>.'), _chk: { t } });
    } });
  }
  // best vs worst
  const BW = [
    { src: c => 'static int find(int[] a, int t) {\n  for (int i = 0; i < a.length; i++)\n    if (a[i] == t) return i;\n  return -1;\n}', b: 'Θ(1)', w: 'Θ(n)', why: 'Best: t is at index 0. Worst: t is absent (scan all n).' },
    { src: c => 'static boolean dup(int[] a) {\n  for (int i = 0; i < a.length; i++)\n    for (int j = i + 1; j < a.length; j++)\n      if (a[i] == a[j]) return true;\n  return false;\n}', b: 'Θ(1)', w: 'Θ(n²)', why: 'Best: a[0] == a[1] (return immediately). Worst: no duplicates, all n(n−1)/2 pairs.' },
    { src: c => 'static void sort(int[] a) {\n  for (int i = 1; i < a.length; i++)\n    for (int j = i; j > 0 && a[j - 1] > a[j]; j--) {\n      int t = a[j]; a[j] = a[j - 1]; a[j - 1] = t;\n    }\n}', b: 'Θ(n)', w: 'Θ(n²)', why: 'Insertion sort: sorted input does one check per i (Θ(n)); reversed input does n(n−1)/2 swaps.' },
    { src: c => 'static void g(int[] a) {\n  int n = a.length;\n  for (int i = 0; i < n; i++) {\n    if (a[i] < ' + c + ') break;\n    for (int j = 0; j < n; j++) count++;\n  }\n}', b: 'Θ(1)', w: 'Θ(n²)', why: 'Best: a[0] < c breaks immediately. Worst: no element is below the threshold, n·n work.' },
    { src: c => 'static void g(int[] a) {\n  int n = a.length;\n  for (int i = 0; i < n; i++)\n    if (a[i] % ' + c + ' == 0)\n      for (int j = 0; j < n; j++) count++;\n}', b: 'Θ(n)', w: 'Θ(n²)', why: 'The outer loop always runs n times (no early exit). Best: no element divisible → Θ(n). Worst: all divisible → n².' },
    { src: c => 'static int bs(int[] a, int t) {   // a is sorted\n  int lo = 0, hi = a.length - 1;\n  while (lo <= hi) {\n    int mid = (lo + hi) / 2;\n    if (a[mid] == t) return mid;\n    if (a[mid] < t) lo = mid + 1; else hi = mid - 1;\n  }\n  return -1;\n}', b: 'Θ(1)', w: 'Θ(log n)', why: 'Best: t is at the first middle. Worst: t absent, the range halves until empty.' },
    { src: c => 'static void g(int[] a) {\n  int n = a.length;\n  for (int i = 1; i < n; i *= 2) {\n    if (a[i] > a[0]) return;\n    for (int j = 0; j < n; j++) count++;\n  }\n}', b: 'Θ(1)', w: 'Θ(n log n)', why: 'Best: a[1] > a[0] returns at once. Worst: never returns early: log n rounds of n work.' },
    { src: c => 'static void g(int[] a) {\n  int n = a.length;\n  for (int i = 0; i < n; i++) {\n    int j = i;\n    while (j < n && a[j] != ' + c + ') j++;\n  }\n}', b: 'Θ(n)', w: 'Θ(n²)', why: 'Best: every a[j] equals c, the while loop stops at once for each i → Θ(n). Worst: no element equals c, inner scans n − i each time → Θ(n²).' },
  ];
  for (const VV of [0, 1]) B5.push({ id: 'B-5-best-worst' + ['-a', '-b'][VV], type: B5T[2], make(r) {
    const k = VV === 0 ? r.int(0, 3) : r.int(4, 7), t = BW[k], c = r.int(2, 9);
    const lab = (b, w) => 'best ' + b + ', worst ' + w;
    const correct = lab(t.b, t.w);
    const wr = []; const opts = ['Θ(1)', 'Θ(log n)', 'Θ(n)', 'Θ(n log n)', 'Θ(n²)'];
    for (const b of opts) for (const w of opts) if (opts.indexOf(b) <= opts.indexOf(w) && (b === t.b || w === t.w || b === t.w)) wr.push(lab(b, w));
    const m = mcq(r, correct, wr, null, 5);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
      prompt: P('Give the best-case and worst-case runtime in terms of n = a.length (count is a static field).') + code(t.src(c)),
      hint: 'Best case = the input of size n that makes it finish fastest (not “n = 1”). Look for early exits.', solution: P(t.why) + P('Answer: <b>' + correct + '</b>.'), _chk: { k, c } });
  } });
  // amortized analysis: binary counter and tripling array
  B5.push({ id: 'B-5-amortized-counter', type: B5T[3], make(r) {
    const N = r.int(20, 200);
    let flips = 0, bits = 0; for (let i = 0; i < N; i++) { let x = i; while (x & 1) { flips++; x >>= 1; } flips++; }
    const pop = N.toString(2).split('').filter(c => c === '1').length;
    return Q({ kind: 'num', answer: flips,
      prompt: P('A binary counter starts at 0. Each increment flips the trailing 1-bits to 0 and then one 0-bit to 1; the cost of an increment is the number of bits flipped. What is the total cost of ' + N + ' increments (0 → ' + N + ')?'),
      hint: 'Bit k flips once every 2^k increments. Sum over k (or use 2N − popcount(N)).',
      solution: P('Bit 0 flips N times, bit 1 ⌊N/2⌋ times, bit 2 ⌊N/4⌋ times, … Total = Σ⌊N/2^k⌋ = 2N − (number of 1s in N’s binary form) = 2·' + N + ' − ' + pop + ' = <b>' + flips + '</b>. That is < 2N, so the amortized cost per increment is Θ(1) even though one increment can flip Θ(log N) bits.'),
      _chk: { N } });
  } });
  B5.push({ id: 'B-5-amortized-array', type: B5T[3], make(r) {
    const f = r.pick([2, 3]), c0 = r.pick([1, 2, 3]), N = r.int(30, 120);
    let cap = c0, size = 0, cost = 0; const res = [];
    for (let i = 0; i < N; i++) { if (size === cap) { cost += size; res.push(size); cap *= f; } cost += 1; size++; }
    return Q({ kind: 'num', answer: cost,
      prompt: P('An array list starts empty with capacity ' + c0 + '. Writing an item costs 1; when it is full, an add first multiplies the capacity by ' + f + ', paying 1 per item copied. What is the total cost of ' + N + ' adds?'),
      hint: 'Total = N writes + the sizes at which resizes happen.',
      solution: P('Resizes happen when size reaches ' + res.join(', ') + ' (each copying that many items). Total = ' + N + ' + (' + res.join(' + ') + ') = <b>' + cost + '</b>, about ' + (cost / N).toFixed(2) + ' per add: Θ(1) amortized.'),
      _chk: { f, c0, N } });
  } });
  // O / Ω / Θ true-false on random function pairs
  // term: {c, b (exp base log2: 0 means none), p (power of n), l (power of log n), s (display)}
  const TERMS = [
    { b: 0, p: 0, l: 0, s: '' }, { b: 0, p: 0, l: 1, s: 'log n' }, { b: 0, p: 0, l: 2, s: 'log² n' }, { b: 0, p: 0.5, l: 0, s: '√n' },
    { b: 0, p: 1, l: 0, s: 'n' }, { b: 0, p: 1, l: 1, s: 'n log n' }, { b: 0, p: 1.5, l: 0, s: 'n^1.5' }, { b: 0, p: 2, l: 0, s: 'n²' },
    { b: 0, p: 2, l: 1, s: 'n² log n' }, { b: 0, p: 3, l: 0, s: 'n³' }, { b: 1, p: 0, l: 0, s: '2ⁿ' }, { b: 2, p: 0, l: 0, s: '4ⁿ' },
  ];
  const cmpTerm = (x, y) => (x.b - y.b) || (x.p - y.p) || (x.l - y.l);
  function randFunc(r) {
    const k = r.int(1, 3); const ts = r.sample(TERMS, k).map(t => Object.assign({ c: r.pick([1, 1, 2, 3, 5, 10, 100]) }, t));
    // disguised forms
    const disguise = { 'log n': ['log(n³)', 'log n'], 'n': ['log(2ⁿ)', 'n'], '2ⁿ': ['2ⁿ⁺¹', '2ⁿ'], 'n²': ['n²', '(n+1)²'], '4ⁿ': ['2²ⁿ', '4ⁿ'] };
    const parts = ts.map(t => { const d = disguise[t.s] ? r.pick(disguise[t.s]) : t.s; return (t.s === '' ? String(t.c) : (t.c === 1 ? '' : t.c + (/^[\d(]/.test(d) ? '·' : '')) + d); });
    const dom = ts.slice().sort(cmpTerm).pop();
    return { ts, dom, s: parts.join(' + ') };
  }
  B5.push({ id: 'B-5-big-o-tf', type: B5T[4], make(r) {
    return retry(r, () => {
      const f = randFunc(r), g = randFunc(r);
      const c = cmpTerm(f.dom, g.dom);
      const kind = r.pick(['O', 'Ω', 'Θ']);
      const truth = kind === 'O' ? c <= 0 : kind === 'Ω' ? c >= 0 : c === 0;
      if (r.float() < 0.3 && c !== 0) return null; // bias toward close calls
      const rel = c < 0 ? 'f grows strictly slower than g' : c > 0 ? 'f grows strictly faster than g' : 'f and g have the same order of growth';
      return Q({ kind: 'tf', answer: truth,
        prompt: P('Let f(n) = ' + f.s + ' and g(n) = ' + g.s + '. True or false: f(n) ∈ ' + kind + '(g(n)).'),
        hint: 'Drop constants and lower-order terms; watch disguises like log(n³) = 3 log n, 2ⁿ⁺¹ = 2·2ⁿ, but 2²ⁿ = 4ⁿ.',
        solution: P('Dominant term of f: ' + (f.dom.s || 'constant') + '; of g: ' + (g.dom.s || 'constant') + '. So ' + rel + '. ' +
          (kind === 'O' ? 'f ∈ O(g) means f grows no faster than g' : kind === 'Ω' ? 'f ∈ Ω(g) means f grows at least as fast as g' : 'f ∈ Θ(g) needs the same growth') + ' → <b>' + (truth ? 'True' : 'False') + '</b>.'),
        _chk: { f: f.ts, g: g.ts, kind } });
    });
  } });
  B5.push({ id: 'B-5-growth-order', type: B5T[4], make(r) {
    return retry(r, () => {
      const fs = range(0, 4).map(() => randFunc(r));
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (cmpTerm(fs[i].dom, fs[j].dom) === 0) return null;
      const order = range(0, 4).sort((i, j) => cmpTerm(fs[i].dom, fs[j].dom));
      const labels = ['A', 'B', 'C', 'D'];
      const ans = order.map(i => labels[i]).join(' ');
      return Q({ kind: 'text', answer: [ans, order.map(i => labels[i]).join(','), order.map(i => labels[i]).join('<')],
        prompt: P('Order these functions from slowest-growing to fastest-growing (type the letters, e.g. <code>C A D B</code>):<br>' + fs.map((f, i) => labels[i] + '(n) = ' + f.s).join('<br>')),
        hint: 'Only the dominant term matters: exponentials ≫ polynomials ≫ polylogs; compare powers, then log factors.',
        solution: P(fs.map((f, i) => labels[i] + ': dominant term ' + (f.dom.s || 'constant')).join('; ') + '. Order: <b>' + ans + '</b>.'), _chk: { fs: fs.map(f => f.ts) } });
    });
  } });
  // runtime of code using data structures
  const DS_OPS = [
    { s: 'list.add(0, i);', ds: 'ArrayList<Integer> list = new ArrayList<>();', per: 'n', why: 'add(0, x) on an ArrayList shifts every element: Θ(size)' },
    { s: 'list.addFirst(i);', ds: 'LinkedList<Integer> list = new LinkedList<>();', per: '1', why: 'addFirst on a linked list is Θ(1)' },
    { s: 'list.add(i);', ds: 'ArrayList<Integer> list = new ArrayList<>();', per: '1', why: 'addLast on an ArrayList is amortized Θ(1)' },
    { s: 'set.add(i);', ds: 'TreeSet<Integer> set = new TreeSet<>();', per: 'log', why: 'TreeSet (balanced BST) add is Θ(log size)' },
    { s: 'set.add(i);', ds: 'HashSet<Integer> set = new HashSet<>();', per: '1', why: 'HashSet add is Θ(1) on average' },
    { s: 'pq.add(n - i);', ds: 'PriorityQueue<Integer> pq = new PriorityQueue<>();', per: 'log', why: 'binary-heap insert is O(log size) (Θ(log n) worst case)' },
  ];
  const DS_SECOND = [
    { s: 'for (int i = 0; i < n; i++) total += list.get(i);', needs: 'list', cost: { 'ArrayList': '1', 'LinkedList': 'n' }, why: { ArrayList: 'get(i) is Θ(1) on an ArrayList', LinkedList: 'get(i) on a LinkedList walks i nodes: Σ i = Θ(n²)' } },
    { s: 'for (int i = 0; i < n; i++) total += list.remove(0);', needs: 'list', cost: { 'ArrayList': 'n', 'LinkedList': '1' }, why: { ArrayList: 'remove(0) shifts everything: Θ(n²) total', LinkedList: 'remove(0) unlinks the head: Θ(1)' } },
    { s: 'for (int x : list) total += x;', needs: 'list', cost: { 'ArrayList': '1', 'LinkedList': '1' }, why: { ArrayList: 'iteration is Θ(1) per item', LinkedList: 'an iterator walks node to node: Θ(1) per item' } },
    { s: 'for (int i = 0; i < n; i++) if (set.contains(i)) total++;', needs: 'set', cost: { 'TreeSet': 'log', 'HashSet': '1' }, why: { TreeSet: 'contains is Θ(log n)', HashSet: 'contains is Θ(1) average' } },
    { s: 'while (!pq.isEmpty()) total += pq.poll();', needs: 'pq', cost: { 'PriorityQueue': 'log' }, why: { PriorityQueue: 'each poll sinks: Θ(log n), n polls' } },
  ];
  const growOf = per => (per === '1' ? 1 : per === 'log' ? 2 : 3); // total over n ops: n, n log n, n²
  const thOf = g => ['', 'Θ(n)', 'Θ(n log n)', 'Θ(n²)'][g];
  for (const VV of [0, 1]) B5.push({ id: 'B-5-ds-runtime' + ['-lists', '-sets'][VV], type: B5T[5], make(r) {
    return retry(r, () => {
      const a = r.pick(DS_OPS.filter((_, i) => (VV === 0 ? i < 3 : i >= 3))); const varName = a.ds.match(/> (\w+) =/)[1];
      const cls = a.ds.match(/^(\w+)</)[1];
      const sec = DS_SECOND.filter(s => s.needs === varName && s.cost[cls]);
      const b = sec.length && r.float() < 0.85 ? r.pick(sec) : null;
      const g1 = growOf(a.per), g2 = b ? growOf(b.cost[cls]) : 0;
      const th = thOf(Math.max(g1, g2));
      const src = a.ds + '\nlong total = 0;\nfor (int i = 0; i < n; i++) ' + a.s + (b ? '\n' + b.s : '');
      const m = mcq(r, th, ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(log n)', 'Θ(n² log n)'], null, 4);
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
        prompt: P('What is the total runtime of this code in terms of n (worst case for TreeSet/PriorityQueue, average for HashSet, amortized for ArrayList growth)?') + code(src),
        hint: 'Find the cost of ONE operation as a function of the current size, multiply/sum over the loop, then keep the bigger of the two phases.',
        solution: P('Phase 1: ' + a.why + ', done n times → ' + thOf(g1) + '.' + (b ? ' Phase 2: ' + b.why[cls] + ' → ' + thOf(g2) + '.' : '') + ' Total: <b>' + th + '</b>.'),
        _chk: { a: a.s, cls, b: b ? b.s : null, th } });
    });
  } });
  G['B-5'] = B5;

  // ===================== B-6 =====================
  const B6 = [];
  const B6T = ['Trace quick-find / quick-union / WQU / path compression arrays', 'Max height of WQU', 'Operation runtimes', 'Use disjoint sets to solve connectivity problems'];
  const WQU_CONV = 'Weighted quick union (61B): a root stores −(size of its tree); connect(p, q) finds both roots and hangs the root of the smaller tree under the root of the larger; <b>tie: p’s root goes under q’s root</b>. Connecting two items already in the same set does nothing.';
  function dsRandOps(r, N, k) { const ops = []; for (let i = 0; i < k; i++) { const [p, q] = r.sample(range(0, N), 2); ops.push([p, q]); } return ops; }
  // clean WQU implementation
  function wquRun(N, ops, pc) {
    const a = new Array(N).fill(-1);
    const find = x => { let root = x; while (a[root] >= 0) root = a[root]; if (pc) { while (x !== root) { const nx = a[x]; a[x] = root; x = nx; } } return root; };
    const steps = [];
    for (const [kind, p, q] of ops) {
      if (kind === 'find') { find(p); steps.push('find(' + p + ') → ' + fmtArr(a)); continue; }
      const rp = find(p), rq = find(q);
      if (rp !== rq) { const sp = -a[rp], sq = -a[rq]; if (sp > sq) { a[rp] -= sq; a[rq] = rp; } else { a[rq] -= sp; a[rp] = rq; } }
      steps.push('connect(' + p + ', ' + q + ') → ' + fmtArr(a));
    }
    const depth = x => { let d = 0; while (a[x] >= 0) { x = a[x]; d++; } return d; };
    return { a, steps, height: Math.max.apply(null, range(0, N).map(depth)) };
  }
  B6.push({ id: 'B-6-quick-find', type: B6T[0], make(r) {
    const N = r.int(7, 9), ops = dsRandOps(r, N, r.int(5, 7));
    const id = range(0, N); const steps = [];
    for (const [p, q] of ops) { const pid = id[p], qid = id[q]; for (let i = 0; i < N; i++) if (id[i] === pid) id[i] = qid; steps.push('connect(' + p + ', ' + q + ') → ' + fmtArr(id)); }
    return Q({ kind: 'list', answer: id.slice(),
      prompt: P('Quick Find on items 0…' + (N - 1) + ' starts with id[i] = i. <code>connect(p, q)</code> changes every entry equal to id[p] into id[q]. After ' + ops.map(o => 'connect(' + o[0] + ', ' + o[1] + ')').join(', ') + ', what is the id array?'),
      hint: 'Change ALL entries equal to id[p] (not just id[p] itself), to the value id[q] read before the change.',
      solution: P(steps.join('<br>')), _chk: { N, ops } });
  } });
  B6.push({ id: 'B-6-quick-union', type: B6T[0], make(r) {
    const N = r.int(7, 9), ops = dsRandOps(r, N, r.int(5, 7));
    const par = range(0, N); const steps = [];
    const root = x => { while (par[x] !== x) x = par[x]; return x; };
    for (const [p, q] of ops) { const rp = root(p), rq = root(q); if (rp !== rq) par[rp] = rq; steps.push('connect(' + p + ', ' + q + '): root(' + p + ') = ' + rp + ', root(' + q + ') = ' + rq + ' → ' + fmtArr(par)); }
    const depth = x => { let d = 0; while (par[x] !== x) { x = par[x]; d++; } return d; };
    const h = Math.max.apply(null, range(0, N).map(depth));
    return Q({ kind: 'list', answer: par.slice().concat([h]),
      prompt: P('(Unweighted) Quick Union on items 0…' + (N - 1) + ': parent[i] = i initially (a root points to itself). <code>connect(p, q)</code> sets parent[root(p)] = root(q) (nothing if they are equal). After ' + ops.map(o => 'connect(' + o[0] + ', ' + o[1] + ')').join(', ') + ', give the parent array followed by the height of the tallest tree (' + (N + 1) + ' numbers).'),
      hint: 'Always link ROOTS: walk p and q up to their roots first.',
      solution: P(steps.join('<br>')) + P('Tallest tree height: ' + h + '.'), _chk: { N, ops } });
  } });
  B6.push({ id: 'B-6-wqu-array', type: B6T[0], make(r) {
    return retry(r, () => {
      const N = r.int(7, 10), ops = dsRandOps(r, N, r.int(6, 8)).map(o => ['conn', o[0], o[1]]);
      const res = wquRun(N, ops, false); if (res.height < 2) return null;
      return Q({ kind: 'list', answer: res.a,
        prompt: P(WQU_CONV + ' Items 0…' + (N - 1) + ' start as singletons (all −1). Give the array after: ' + ops.map(o => 'connect(' + o[1] + ', ' + o[2] + ')').join(', ') + '.'),
        hint: 'Find both roots, compare sizes (the negated root entries), smaller under larger; on a tie p’s root goes under q’s; update the new root’s −size.',
        solution: P(res.steps.join('<br>')), _chk: { N, ops } });
    });
  } });
  B6.push({ id: 'B-6-wqu-path-compression', type: B6T[0], make(r) {
    return retry(r, () => {
      const N = r.int(8, 10);
      const ops = dsRandOps(r, N, r.int(6, 8)).map(o => ['conn', o[0], o[1]]);
      const pre = wquRun(N, ops, false); if (pre.height < 2) return null;
      // then some finds on deep nodes
      const depth = x => { let d = 0, a = pre.a; while (a[x] >= 0) { x = a[x]; d++; } return d; };
      const deep = range(0, N).filter(x => depth(x) >= 2);
      const f = r.sample(deep, Math.min(deep.length, r.int(1, 2))).map(x => ['find', x]);
      const extra = dsRandOps(r, N, 1).map(o => ['conn', o[0], o[1]]);
      const all = ops.concat(f).concat(extra);
      const res = wquRun(N, all, true);
      const noPc = wquRun(N, all, false);
      if (res.a.join() === noPc.a.join()) return null;
      return Q({ kind: 'list', answer: res.a,
        prompt: P(WQU_CONV + ' Now add <b>path compression</b>: every find(x) (including the two finds inside connect, and isConnected) re-points each node on the path from x to its root directly at the root. Items 0…' + (N - 1) + ' start as −1. Give the array after: ' + all.map(o => o[0] === 'find' ? 'find(' + o[1] + ')' : 'connect(' + o[1] + ', ' + o[2] + ')').join(', ') + '.'),
        hint: 'Path compression can also happen during the connects: connect(p, q) calls find(p) and find(q) first.',
        solution: P(res.steps.join('<br>')), _chk: { N, ops: all } });
    });
  } });
  for (const VV of [0, 1]) B6.push({ id: 'B-6-wqu-height' + ['-bound', '-trace'][VV], type: B6T[1], make(r) {
    const v = VV;
    if (v === 0) {
      const N = r.int(5, 2000);
      const h = Math.floor(Math.log2(N));
      return Q({ kind: 'num', answer: h,
        prompt: P('In weighted quick union (union by size, no path compression) on N = ' + N + ' items, what is the maximum possible height of any tree after any sequence of connects? (A single node has height 0.)'),
        hint: 'A node’s depth only increases when its tree is merged under one at least as large, so its tree size at least doubles each time.',
        solution: P('Depth of x grows by 1 only when x’s tree (size s) is placed under a tree of size ≥ s, giving size ≥ 2s. Size can double at most ⌊log₂ N⌋ times: ⌊log₂ ' + N + '⌋ = <b>' + h + '</b>. It is achieved by repeatedly merging equal-size trees (needs 2^' + h + ' = ' + Math.pow(2, h) + ' ≤ N items).'),
        _chk: { N } });
    }
    return retry(r, () => {
      const N = r.pick([8, 16]);
      const ops = dsRandOps(r, N, r.int(9, 14)).map(o => ['conn', o[0], o[1]]);
      const res = wquRun(N, ops, false); if (res.height < 2) return null;
      return Q({ kind: 'num', answer: res.height,
        prompt: P(WQU_CONV + ' On items 0…' + (N - 1) + ', after ' + ops.map(o => 'connect(' + o[1] + ', ' + o[2] + ')').join(', ') + ', what is the height of the tallest tree (root has depth 0)?'),
        hint: 'Trace the array; height increases only when two trees of equal height-ish size merge.',
        solution: P(res.steps.join('<br>')) + P('Tallest tree height: <b>' + res.height + '</b> (never more than ⌊log₂ ' + N + '⌋ = ' + Math.log2(N) + ').'), _chk: { N, ops } });
    });
  } });
  for (const VV of [0, 1]) B6.push({ id: 'B-6-op-runtimes' + ['-single', '-total'][VV], type: B6T[2], make(r) {
    const tbl = {
      'Quick Find': { c: 'Θ(N)', f: 'Θ(1)', why: 'connect relabels the whole id array; isConnected compares two ids' },
      'Quick Union': { c: 'Θ(N)', f: 'Θ(N)', why: 'trees can become spindly chains of height N − 1' },
      'Weighted Quick Union': { c: 'Θ(log N)', f: 'Θ(log N)', why: 'height ≤ log₂N, and both ops walk to a root' },
    };
    const ds = r.pick(Object.keys(tbl)), op = r.pick(['connect', 'isConnected']);
    const v = VV;
    if (v === 0) {
      const correct = op === 'connect' ? tbl[ds].c : tbl[ds].f;
      const m = mcq(r, correct, ['Θ(1)', 'Θ(log N)', 'Θ(N)', 'Θ(N log N)', 'Θ(log* N)'], null, 4);
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
        prompt: P('Worst-case runtime of a single <code>' + op + '</code> call in ' + ds + ' on N items (no path compression)?'),
        hint: 'What is the worst tree shape (or array work) this structure allows?', solution: P(ds + ': ' + tbl[ds].why + '. Answer <b>' + correct + '</b>.') });
    }
    const N = r.pick([1000, 10000, 1000000]), M = r.pick([N, 10 * N]);
    const ds2 = r.pick(['Quick Find', 'Quick Union', 'Weighted Quick Union']);
    const correct = ds2 === 'Quick Find' ? 'Θ(MN)' : ds2 === 'Quick Union' ? 'Θ(MN)' : 'Θ(M log N)';
    const m = mcq(r, correct, ['Θ(M + N)', 'Θ(MN)', 'Θ(M log N)', 'Θ(N log M)', 'Θ(M²)'], null, 4);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
      prompt: P('Worst-case total cost of M = ' + (M === N ? 'N' : '10N') + ' operations (a mix of connect and isConnected, adversarially chosen) on N items using ' + ds2 + ' (no path compression)?'),
      hint: 'Multiply the worst single-operation cost by the number of operations.',
      solution: P(ds2 + ': each op can cost ' + (ds2 === 'Weighted Quick Union' ? 'Θ(log N)' : 'Θ(N)') + ', so the total is <b>' + correct + '</b>. (WQU with path compression would be nearly linear: O(M α(N)).)') });
  } });
  B6.push({ id: 'B-6-connectivity', type: B6T[3], make(r) {
    const N = r.int(8, 12), k = r.int(5, 8);
    const ops = dsRandOps(r, N, k);
    const par = range(0, N); const root = x => { while (par[x] !== x) x = par[x]; return x; };
    let redundant = 0;
    for (const [p, q] of ops) { const a = root(p), b = root(q); if (a === b) redundant++; else par[a] = b; }
    const comps = new Set(range(0, N).map(root)).size;
    const sizes = {}; range(0, N).forEach(x => { const t = root(x); sizes[t] = (sizes[t] || 0) + 1; });
    const big = Math.max.apply(null, Object.values(sizes));
    return Q({ kind: 'list', answer: [comps, big, redundant],
      prompt: P('Items 0…' + (N - 1) + '. We process these connections in order with a disjoint-sets structure: ' + ops.map(o => o[0] + '–' + o[1]).join(', ') + '.') +
        P('Give three numbers: the number of connected components at the end, the size of the largest component, and how many of the connections were redundant (their endpoints were already connected when processed).'),
      hint: 'Each non-redundant connection merges two components (components drop by exactly 1).',
      solution: P('Start with ' + N + ' components. A connection is redundant iff isConnected(p, q) is already true; otherwise it merges two sets. ' + (k - redundant) + ' merges → ' + N + ' − ' + (k - redundant) + ' = <b>' + comps + '</b> components, largest size <b>' + big + '</b>, redundant <b>' + redundant + '</b>. (These redundant edges are exactly the ones that would close a cycle, like Kruskal’s rejected edges.)'),
      _chk: { N, ops } });
  } });
  G['B-6'] = B6;

  // ===================== B-7 =====================
  const B7 = [];
  const B7T = ['BST insert & Hibbard delete traces; validate-BST code', '2-3 / 2-3-4 tree insertion with splits; heights', 'LLRB inserts with rotations & colour flips; map to 2-3 tree', 'Max/min heights and runtimes'];
  const bstIns = (t, k) => { if (!t) return { k, l: null, r: null }; if (k < t.k) t.l = bstIns(t.l, k); else if (k > t.k) t.r = bstIns(t.r, k); return t; };
  const bstMin = t => (t.l ? bstMin(t.l) : t);
  const bstDel = (t, k) => {
    if (!t) return null;
    if (k < t.k) t.l = bstDel(t.l, k); else if (k > t.k) t.r = bstDel(t.r, k);
    else { if (!t.l) return t.r; if (!t.r) return t.l; const s = bstMin(t.r); t.k = s.k; t.r = bstDel(t.r, s.k); }
    return t;
  };
  const levelOrder = t => { const o = [], q = t ? [t] : []; while (q.length) { const x = q.shift(); o.push(x.k); if (x.l) q.push(x.l); if (x.r) q.push(x.r); } return o; };
  const preOrder = t => (t ? [t.k].concat(preOrder(t.l), preOrder(t.r)) : []);
  const inOrder = t => (t ? inOrder(t.l).concat([t.k], inOrder(t.r)) : []);
  const postOrder = t => (t ? postOrder(t.l).concat(postOrder(t.r), [t.k]) : []);
  const height = t => (t ? 1 + Math.max(height(t.l), height(t.r)) : -1);
  const nested = t => (!t ? '·' : (!t.l && !t.r) ? String(t.k) : t.k + '(' + nested(t.l) + ', ' + nested(t.r) + ')');
  B7.push({ id: 'B-7-bst-delete-level', type: B7T[0], make(r) {
    return retry(r, () => {
      const keys = distinctInts(r, r.int(9, 11), 1, 99);
      let t = null; keys.forEach(k => { t = bstIns(t, k); });
      const two = keys.filter(k => { let x = t; while (x.k !== k) x = k < x.k ? x.l : x.r; return x.l && x.r; });
      if (two.length < 2) return null;
      const dels = [r.pick(two)]; const rest = keys.filter(k => k !== dels[0]); dels.push(r.pick(rest));
      if (r.bool()) { const rest2 = rest.filter(k => k !== dels[1]); dels.push(r.pick(rest2)); }
      const before = nested(t);
      dels.forEach(k => { t = bstDel(t, k); });
      const ans = levelOrder(t);
      return Q({ kind: 'list', answer: ans,
        prompt: P('Insert ' + keys.join(', ') + ' (in that order) into an empty BST. Then delete ' + dels.join(', then ') + ' using Hibbard deletion with the <b>successor</b> (smallest key in the right subtree) for nodes with two children. Give the final tree in level order (top to bottom, left to right), comma-separated.'),
        hint: 'Two children: copy the successor’s key up (go right once, then left all the way), then delete the successor from the right subtree; it has at most a right child.',
        solution: P('Tree after inserts (key(left, right), · = empty): ' + before + '.') + P('After deleting ' + dels.join(', ') + ': ' + nested(t) + '.') + P('Level order: <b>' + ans.join(', ') + '</b>.'),
        _chk: { keys, dels } });
    });
  } });
  B7.push({ id: 'B-7-bst-delete-preorder', type: B7T[0], make(r) {
    return retry(r, () => {
      const keys = distinctInts(r, r.int(8, 10), 1, 60);
      let t = null; keys.forEach(k => { t = bstIns(t, k); });
      if (!t.l || !t.r) return null;
      const extra = r.pick(keys.slice(1));
      const dels = [t.k, extra].filter((v, i, a) => a.indexOf(v) === i);
      dels.forEach(k => { t = bstDel(t, k); });
      const ans = preOrder(t);
      return Q({ kind: 'list', answer: ans.concat([height(t)]),
        prompt: P('Insert ' + keys.join(', ') + ' into an empty BST, then delete ' + dels.join(' and then ') + ' (Hibbard deletion with the successor). Give the final preorder traversal followed by the final height (root alone = height 0), comma-separated.'),
        hint: 'Deleting the root (two children) promotes the leftmost key of the right subtree.',
        solution: P('Final tree: ' + nested(t) + '. Preorder: ' + ans.join(', ') + '; height ' + height(t) + '.'), _chk: { keys, dels } });
    });
  } });
  B7.push({ id: 'B-7-validate-bst', type: B7T[0], make(r) {
    return retry(r, () => {
      const keys = distinctInts(r, 8, 1, 99);
      let t = null; keys.forEach(k => { t = bstIns(t, k); });
      if (height(t) < 3) return null;
      const valid = r.bool();
      if (!valid) {
        // change a depth≥2 node's key so it still respects its parent but violates an ancestor
        const nodes = []; const walk = (x, d, lo, hi, par) => { if (!x) return; nodes.push({ x, d, lo, hi, par }); walk(x.l, d + 1, lo, x.k, x); walk(x.r, d + 1, x.k, hi, x); };
        walk(t, 0, -Infinity, Infinity, null);
        const cand = nodes.filter(n => n.d >= 2 && !n.x.l && !n.x.r);
        if (!cand.length) return null;
        const n = r.pick(cand); const p = n.par;
        // new key: correct side of parent, but outside (lo, hi)
        const all = new Set(inOrder(t));
        let nk = null;
        if (p.l === n.x) { if (n.lo > -Infinity) for (let v = n.lo - 1; v >= 1; v--) if (!all.has(v) && v < p.k) { nk = v; break; } }
        else { if (n.hi < Infinity) for (let v = n.hi + 1; v <= 120; v++) if (!all.has(v) && v > p.k) { nk = v; break; } }
        if (nk === null) return null; n.x.k = nk;
      }
      const ok = (x, lo, hi) => !x || (x.k > lo && x.k < hi && ok(x.l, lo, x.k) && ok(x.r, x.k, hi));
      const truth = ok(t, -Infinity, Infinity);
      const localOk = (x) => !x || ((!x.l || x.l.k < x.k) && (!x.r || x.r.k > x.k) && localOk(x.l) && localOk(x.r));
      if (!localOk(t)) return null;
      return Q({ kind: 'tf', answer: truth,
        prompt: P('Notation: key(left, right), · = empty. Is this a valid BST? <code>' + nested(t) + '</code>') + P('(Note: every node is correctly ordered relative to its own children. A buggy <code>isBST</code> that only checks parent/child pairs would say “yes”.)'),
        hint: 'Every key must lie strictly inside the (low, high) window inherited from ALL its ancestors.',
        solution: P(truth ? 'Every key lies within the bounds set by all of its ancestors (check recursively with a (lo, hi) window), so <b>True</b>.' : 'Some leaf satisfies its parent but not an ancestor: its key falls outside the window (lo, hi) inherited from higher up. Inorder traversal is not sorted: ' + inOrder(t).join(' ') + '. <b>False</b>.'),
        _chk: { t: JSON.parse(JSON.stringify(t)) } });
    });
  } });
  // ---- B-trees: generic insert with max keys L (2 → 2-3, 3 → 2-3-4); split pushes up key index 1 ----
  function btInsert(root, k, L) {
    const ins = (node) => {
      if (!node.c) { node.k.push(k); node.k.sort((a, b) => a - b); }
      else {
        let i = 0; while (i < node.k.length && k > node.k[i]) i++;
        const sp = ins(node.c[i]);
        if (sp) { node.k.splice(i, 0, sp.up); node.c.splice(i, 1, sp.left, sp.right); }
      }
      if (node.k.length > L) {
        const left = { k: node.k.slice(0, 1), c: node.c ? node.c.slice(0, 2) : null };
        const right = { k: node.k.slice(2), c: node.c ? node.c.slice(2) : null };
        return { up: node.k[1], left, right };
      }
      return null;
    };
    if (!root) return { k: [k], c: null };
    const sp = ins(root);
    if (sp) return { k: [sp.up], c: [sp.left, sp.right] };
    return root;
  }
  const btHeight = t => (t.c ? 1 + btHeight(t.c[0]) : 0);
  const btCount = t => 1 + (t.c ? sum(t.c.map(btCount)) : 0);
  const btStr = t => '[' + t.k.join(' ') + ']' + (t.c ? '(' + t.c.map(btStr).join(', ') + ')' : '');
  const bt3nodes = t => (t.k.length === 2 ? 1 : 0) + (t.c ? sum(t.c.map(bt3nodes)) : 0);
  B7.push({ id: 'B-7-23-tree', type: B7T[1], make(r) {
    return retry(r, () => {
      const keys = distinctInts(r, r.int(9, 12), 1, 99);
      let t = null; keys.forEach(k => { t = btInsert(t, k, 2); });
      const h = btHeight(t); if (h < 2) return null;
      return Q({ kind: 'list', answer: [h, btCount(t)].concat(t.k),
        prompt: P('Insert ' + keys.join(', ') + ' (in order) into an empty 2-3 tree (an overfull node [a b c] sends b up). Give: the height (a single leaf = 0), the total number of nodes, then the root’s keys in order; all comma-separated.'),
        hint: 'Always insert into a leaf; split overflowing nodes bottom-up; the tree grows only at the root.',
        solution: P('Final tree (node(children)): ' + btStr(t) + '. Height ' + h + ', ' + btCount(t) + ' nodes, root ' + t.k.join(' ') + '.'), _chk: { keys, L: 2 } });
    });
  } });
  B7.push({ id: 'B-7-234-tree', type: B7T[1], make(r) {
    return retry(r, () => {
      const keys = distinctInts(r, r.int(10, 14), 1, 99);
      let t = null; keys.forEach(k => { t = btInsert(t, k, 3); });
      if (btHeight(t) < 1 || t.k.length < 2 && r.bool()) return null;
      const leaves = []; const walk = x => { if (!x.c) leaves.push(x); else x.c.forEach(walk); }; walk(t);
      return Q({ kind: 'list', answer: [btHeight(t), leaves.length].concat(t.k),
        prompt: P('Insert ' + keys.join(', ') + ' into an empty 2-3-4 tree (max 3 keys per node). 61B convention: an overfull node [a b c d] sends the <b>left-middle</b> key b up, leaving [a] and [c d]. Splits happen bottom-up only when a node overflows. Give the height, the number of leaves, then the root’s keys; comma-separated.'),
        hint: 'A node only splits when it would hold 4 keys; the pushed-up key is the second smallest of the four.',
        solution: P('Final tree: ' + btStr(t) + '.'), _chk: { keys, L: 3 } });
    });
  } });
  // ---- LLRB ----
  function llrbInsert(root, k) {
    const isRed = x => !!(x && x.red);
    const rotL = h => { const x = h.r; h.r = x.l; x.l = h; x.red = h.red; h.red = true; return x; };
    const rotR = h => { const x = h.l; h.l = x.r; x.r = h; x.red = h.red; h.red = true; return x; };
    const flip = h => { h.red = true; h.l.red = false; h.r.red = false; };
    const ins = (h) => {
      if (!h) return { k, l: null, r: null, red: true };
      if (k < h.k) h.l = ins(h.l); else if (k > h.k) h.r = ins(h.r);
      if (isRed(h.r) && !isRed(h.l)) h = rotL(h);
      if (isRed(h.l) && isRed(h.l.l)) h = rotR(h);
      if (isRed(h.l) && isRed(h.r)) flip(h);
      return h;
    };
    root = ins(root); root.red = false; return root;
  }
  const llrbReds = t => (!t ? 0 : (t.red ? 1 : 0) + llrbReds(t.l) + llrbReds(t.r));
  const llrbStr = t => (!t ? '·' : (!t.l && !t.r) ? t.k + (t.red ? '*' : '') : t.k + (t.red ? '*' : '') + '(' + llrbStr(t.l) + ', ' + llrbStr(t.r) + ')');
  B7.push({ id: 'B-7-llrb-reds-root', type: B7T[2], make(r) {
    return retry(r, () => {
      const keys = distinctInts(r, r.int(7, 10), 1, 99);
      let t = null; keys.forEach(k => { t = llrbInsert(t, k); });
      const reds = llrbReds(t); if (reds === 0) return null;
      let bt = null; keys.forEach(k => { bt = btInsert(bt, k, 2); });
      return Q({ kind: 'list', answer: [t.k, reds, height(t)],
        prompt: P('Insert ' + keys.join(', ') + ' (in order) into an empty left-leaning red-black tree (61B rules: new links are red; on the way up, rotateLeft if right red & left black, rotateRight if left and left-left red, colour flip if both children red; root painted black). Give three numbers: the root key, the number of red links, and the height of the LLRB (root alone = 0).'),
        hint: 'Shortcut check: the LLRB corresponds exactly to the 2-3 tree with the same inserts; each 3-node contributes one red link.',
        solution: P('Final LLRB (* = red link to that node): ' + llrbStr(t) + '.') + P('Matching 2-3 tree: ' + btStr(bt) + ', which has ' + bt3nodes(bt) + ' three-nodes = ' + reds + ' red links. Root ' + t.k + ', height ' + height(t) + '.'),
        _chk: { keys } });
    });
  } });
  B7.push({ id: 'B-7-llrb-to-23', type: B7T[2], make(r) {
    return retry(r, () => {
      const keys = distinctInts(r, r.int(8, 11), 1, 99);
      let t = null; keys.forEach(k => { t = llrbInsert(t, k); });
      let bt = null; keys.forEach(k => { bt = btInsert(bt, k, 2); });
      if (btHeight(bt) < 2) return null;
      const lv1 = bt.c.map(c => c.k.join(' ')).join(' | ');
      return Q({ kind: 'list', answer: [btHeight(bt)].concat(bt.k, [bt3nodes(bt)]),
        prompt: P('Here is an LLRB written as key(left, right), with * marking a node whose link from its parent is red: <code>' + llrbStr(t) + '</code>.') +
          P('Convert it to the corresponding 2-3 tree. Give: the 2-3 tree’s height (single node = 0), the keys of its root, and the number of 3-nodes; comma-separated.'),
        hint: 'Merge every red node into its parent; the 2-3 height equals the number of black links on any root-to-null path minus one.',
        solution: P('Merging red children into parents gives ' + btStr(bt) + ' (children of the root: ' + lv1 + '). Height ' + btHeight(bt) + ', root keys ' + bt.k.join(' ') + ', ' + bt3nodes(bt) + ' three-nodes.'),
        _chk: { keys } });
    });
  } });
  B7.push({ id: 'B-7-heights', type: B7T[3], make(r) {
    const N = r.int(10, 5000);
    const v = r.int(0, 3);
    const fl = Math.floor;
    let ans, q, why;
    if (v === 0) { ans = N - 1; q = 'maximum height of a BST'; why = 'Inserting keys in sorted order makes a chain: height N − 1.'; }
    else if (v === 1) { ans = fl(Math.log2(N)); q = 'minimum height of a BST'; why = 'A complete tree of height h holds up to 2^{h+1} − 1 keys, so h ≥ ⌈log₂(N+1)⌉ − 1 = ⌊log₂ N⌋.'; }
    else if (v === 2) { ans = fl(Math.log2(N + 1)) - 1; q = 'maximum height of a 2-3 tree'; why = 'Tallest when every node is a 2-node: height h needs at least 2^{h+1} − 1 keys, so h = ⌊log₂(N+1)⌋ − 1.'; }
    else if (v === 3) { let h = 0; while (Math.pow(3, h + 1) - 1 < N) h++; ans = h; q = 'minimum height of a 2-3 tree'; why = 'Shortest when every node is a 3-node: height h holds at most 3^{h+1} − 1 keys; smallest h with 3^{h+1} − 1 ≥ N.'; }
    return Q({ kind: 'num', answer: ans,
      prompt: P('With N = ' + N + ' distinct keys, what is the ' + q + '? (A single node has height 0.)'),
      hint: 'Relate the number of keys to the height for the extreme shape (chain, complete binary tree, all 2-nodes, all 3-nodes).',
      solution: P(why + ' Here: <b>' + ans + '</b>.'), _chk: { N, v } });
  } });
  B7.push({ id: 'B-7-runtime-mc', type: B7T[3], make(r) {
    const s = r.pick(['BST (no balancing)', '2-3 tree', 'LLRB']);
    const c = r.pick(['worst', 'sorted']);
    const op = r.pick(['contains', 'insert']);
    const correct = s === 'BST (no balancing)' ? 'Θ(N)' : 'Θ(log N)';
    const q = c === 'worst' ? 'the worst-case runtime of one ' + op + ' in a ' + s + ' holding N keys' : 'the runtime of the ' + op + ' of the largest key into a ' + s + ' built by inserting 1, 2, …, N in sorted order';
    const m = mcq(r, correct, ['Θ(1)', 'Θ(log N)', 'Θ(N)', 'Θ(N log N)', 'Θ(√N)'], null, 4);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('What is ' + q + '?'),
      hint: 'Runtime is Θ(height). Which structures guarantee logarithmic height?',
      solution: P(s === 'BST (no balancing)' ? 'An unbalanced BST can be a chain (e.g. sorted inserts), height N − 1 → Θ(N).' : 'A ' + s + ' is balanced: height Θ(log N) for any insertion order → Θ(log N).') });
  } });
  G['B-7'] = B7;

  // ===================== B-8 =====================
  const B8 = [];
  const B8T = ['Heap insert/removeMin array traces (swim/sink); heapify', 'Check the heap property', 'Priority-queue applications (top-k)', 'Pre/in/post/level-order traversals; rebuild a tree from traversals; traversal code'];
  // 1-indexed min-heap (index 0 unused)
  function minHeap() {
    const a = [null];
    const swim = k => { while (k > 1 && a[k] < a[k >> 1]) { [a[k], a[k >> 1]] = [a[k >> 1], a[k]]; k >>= 1; } };
    const sink = k => { const n = a.length - 1; while (2 * k <= n) { let j = 2 * k; if (j < n && a[j + 1] < a[j]) j++; if (a[k] <= a[j]) break; [a[k], a[j]] = [a[j], a[k]]; k = j; } };
    return { a, add(x) { a.push(x); swim(a.length - 1); }, removeMin() { const m = a[1]; const last = a.pop(); if (a.length > 1) { a[1] = last; sink(1); } return m; }, size: () => a.length - 1 };
  }
  B8.push({ id: 'B-8-heap-ops', type: B8T[0], make(r) {
    return retry(r, () => {
      const H = minHeap(); const ops = []; const removed = []; const vals = r.shuffle(range(1, 40)).slice(0, 12); let vi = 0; const steps = [];
      const n = r.int(9, 11);
      for (let i = 0; i < n; i++) {
        if (H.size() >= 3 && r.float() < 0.3) { removed.push(H.removeMin()); ops.push('removeMin()'); }
        else { const x = vals[vi++]; H.add(x); ops.push('add(' + x + ')'); }
        steps.push(ops[ops.length - 1] + ' → ' + fmtArr(H.a.slice(1)));
      }
      if (!removed.length || H.size() < 5) return null;
      return Q({ kind: 'list', answer: H.a.slice(1),
        prompt: P('A min-heap is stored in an array with the root at index 1 (index 0 unused). add appends and swims; removeMin moves the last item to the root and sinks it, swapping with the <b>smaller</b> child. Starting empty: <code>' + ops.join(', ') + '</code>. Give the array from index 1 onward.'),
        hint: 'Parent of k is k/2; children are 2k and 2k+1. Sink swaps with the smaller child; stop when ≤ both children.',
        solution: P(steps.join('<br>')), _chk: { ops } });
    });
  } });
  B8.push({ id: 'B-8-heapify', type: B8T[0], make(r) {
    const n = r.int(7, 10); const a = r.shuffle(range(1, 30)).slice(0, n); const orig = a.slice(); const steps = [];
    const sink = (k, N) => { while (2 * k + 1 < N) { let j = 2 * k + 1; if (j + 1 < N && a[j + 1] > a[j]) j++; if (a[k] >= a[j]) break; [a[k], a[j]] = [a[j], a[k]]; k = j; } };
    for (let k = Math.floor(n / 2) - 1; k >= 0; k--) { sink(k, n); steps.push('sink(' + k + ') → ' + fmtArr(a)); }
    const sortSteps = r.int(0, 2); const heapArr = a.slice();
    for (let s = 0; s < sortSteps; s++) { const N = n - s; [a[0], a[N - 1]] = [a[N - 1], a[0]]; sink(0, N - 1); steps.push('swap max to index ' + (N - 1) + ', sink(0) → ' + fmtArr(a)); }
    return Q({ kind: 'list', answer: a.slice(),
      prompt: P('Heapsort (as in 61B notes 13.4) uses a <b>0-indexed max-heap</b> (children of k are 2k+1 and 2k+2). Bottom-up heapify ' + fmtArr(orig) + ' by sinking k = ' + (Math.floor(n / 2) - 1) + ' down to 0 (swap with the larger child)' + (sortSteps ? ', then do ' + sortSteps + ' sort-down step' + (sortSteps > 1 ? 's' : '') + ' (swap the root with the last heap item, shrink the heap by one, sink the root)' : '') + '. Give the whole array.'),
      hint: 'Start at the last non-leaf n/2 − 1; leaves are already heaps.',
      solution: P(steps.join('<br>')), _chk: { orig, sortSteps } });
  } });
  B8.push({ id: 'B-8-check-heap', type: B8T[1], make(r) {
    return retry(r, () => {
      const items = [];
      for (let t = 0; t < 5; t++) {
        const n = r.int(6, 9); const H = minHeap(); r.shuffle(range(1, 30)).slice(0, n).forEach(x => H.add(x)); let a = H.a.slice(1);
        if (r.bool()) { // perturb: swap two entries not in a parent/child relationship of trivially-detected kind
          const i = r.int(1, n - 1), j = r.int(0, n - 1); if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; }
        }
        const ok = a.every((x, k) => k === 0 || a[Math.floor((k + 1) / 2) - 1] <= x);
        items.push({ t: '<code>' + fmtArr(a) + '</code>', ok, a });
      }
      const nOk = items.filter(x => x.ok).length; if (nOk === 0 || nOk === 5) return null;
      if (new Set(items.map(x => x.t)).size < 5) return null;
      const m = multi(items);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Each array lists a complete binary tree in level order (first entry = root, i.e. index 1 in 61B’s layout). Which are valid <b>min-heaps</b>?'),
        hint: 'Check every parent/child pair: entry at index k (1-based) must be ≤ entries at 2k and 2k+1.',
        solution: P(items.map(x => x.t + ': ' + (x.ok ? 'valid' : 'invalid (some child is smaller than its parent)')).join('<br>')), _chk: { arrs: items.map(x => x.a) } });
    });
  } });
  B8.push({ id: 'B-8-topk', type: B8T[2], make(r) {
    const k = r.int(3, 4), stream = r.shuffle(range(1, 50)).slice(0, r.int(8, 10));
    const H = minHeap(); const steps = [];
    for (const x of stream) { H.add(x); let msg = 'add ' + x; if (H.size() > k) msg += ', removeMin → ' + H.removeMin(); steps.push(msg + ' → ' + fmtArr(H.a.slice(1))); }
    const kth = H.a[1];
    return Q({ kind: 'list', answer: H.a.slice(1).concat([kth]),
      prompt: P('To track the ' + k + ' largest items of a stream, we keep a min-heap (root at index 1): for each item, add it; if the heap now has more than ' + k + ' items, removeMin. Stream: ' + stream.join(', ') + '. Give the final heap array (index 1 on), followed by the value that the root represents (the ' + k + '-th largest).'),
      hint: 'The min-heap root is the smallest of the current top-k, i.e. the k-th largest so far: it is the one evicted when something bigger arrives.',
      solution: P(steps.join('<br>')) + P('Root = ' + kth + ' = the ' + k + '-th largest. Cost Θ(N log k) instead of Θ(N log N) for sorting.'), _chk: { k, stream } });
  } });
  // traversals on random binary trees
  function randTreeLetters(r) {
    const n = r.int(7, 9); const letters = 'ABCDEFGHIJKLMNOP'.split('').slice(0, n);
    const keys = r.shuffle(range(0, n)); let t = null; keys.forEach(k => { t = bstIns(t, k); });
    const lab = r.shuffle(letters); const relabel = x => (x ? { k: lab[x.k], l: relabel(x.l), r: relabel(x.r) } : null);
    return relabel(t);
  }
  B8.push({ id: 'B-8-traversal-orders', type: B8T[3], make(r) {
    return retry(r, () => {
      const t = randTreeLetters(r); if (height(t) < 3) return null;
      const kind = r.pick(['preorder', 'inorder', 'postorder', 'level order']);
      const seq = { preorder: preOrder, inorder: inOrder, postorder: postOrder, 'level order': levelOrder }[kind](t);
      const ans = seq.join(' ');
      return Q({ kind: 'text', answer: [ans, seq.join(','), seq.join('')],
        prompt: P('Binary tree in the notation key(left, right) with · for an empty child: <code>' + nested(t) + '</code>. (This is NOT a BST: letters are just labels.) Give its <b>' + kind + '</b> traversal, letters separated by spaces.'),
        hint: kind === 'level order' ? 'Depth by depth, left to right (a queue).' : 'Walk around the tree: ' + kind + ' records a node ' + { preorder: 'the first time you pass it (left side)', inorder: 'when you pass underneath it', postorder: 'the last time (right side)' }[kind] + '.',
        solution: P(kind[0].toUpperCase() + kind.slice(1) + ': <b>' + ans + '</b>.'), _chk: { t: JSON.parse(JSON.stringify(t)), kind } });
    });
  } });
  B8.push({ id: 'B-8-rebuild-traversals', type: B8T[3], make(r) {
    const t = randTreeLetters(r);
    const v = r.int(0, 1);
    const pre = preOrder(t), ino = inOrder(t), post = postOrder(t);
    const given = v === 0 ? 'preorder ' + pre.join(' ') + ' and inorder ' + ino.join(' ') : 'postorder ' + post.join(' ') + ' and inorder ' + ino.join(' ');
    const want = v === 0 ? post : pre;
    return Q({ kind: 'text', answer: [want.join(' '), want.join(','), want.join('')],
      prompt: P('A binary tree with distinct labels has ' + given + '. Give its ' + (v === 0 ? 'postorder' : 'preorder') + ' (letters separated by spaces).'),
      hint: v === 0 ? 'The first preorder letter is the root; it splits the inorder into left and right subtrees. Recurse.' : 'The last postorder letter is the root; it splits the inorder into left and right subtrees. Recurse.',
      solution: P('Rebuilding recursively gives ' + nested(t) + '. ' + (v === 0 ? 'Postorder' : 'Preorder') + ': <b>' + want.join(' ') + '</b>.'), _chk: { pre, ino, post, v } });
  } });
  B8.push({ id: 'B-8-traversal-code', type: B8T[3], make(r) {
    return retry(r, () => {
      const t = randTreeLetters(r); if (height(t) < 2) return null;
      const order = r.pick([['R', 'P', 'L'], ['P', 'R', 'L'], ['R', 'L', 'P'], ['L', 'P', 'R'], ['P', 'L', 'R'], ['L', 'R', 'P']]);
      const twice = r.float() < 0.3; // print twice: before and after
      const out = []; const go = x => { if (!x) return; for (const s of order) { if (s === 'P') out.push(x.k); else go(s === 'L' ? x.l : x.r); } if (twice) out.push(x.k.toLowerCase()); };
      go(t);
      const lines = order.map(s => (s === 'P' ? '  System.out.print(t.key + " ");' : '  mystery(t.' + (s === 'L' ? 'left' : 'right') + ');'));
      if (twice) lines.push('  System.out.print(t.key.toLowerCase() + " ");');
      const src = 'static void mystery(Node t) {\n  if (t == null) return;\n' + lines.join('\n') + '\n}';
      return Q({ kind: 'text', answer: [out.join(' '), out.join(',')],
        prompt: P('Tree (key(left, right), · = empty): <code>' + nested(t) + '</code>. What does <code>mystery(root)</code> print? (tokens separated by spaces)') + code(src),
        hint: 'Same walk-around idea, but this code may visit RIGHT before LEFT. Follow the statement order exactly.',
        solution: P('The method does ' + order.map(s => ({ P: 'print', L: 'left', R: 'right' })[s]).join(', ') + (twice ? ', then prints the lowercase key' : '') + ' at every node. Output: <b>' + out.join(' ') + '</b>.'),
        _chk: { t: JSON.parse(JSON.stringify(t)), order, twice } });
    });
  } });
  G['B-8'] = B8;

  // ===================== B-9 =====================
  const B9 = [];
  const B9T = ['Adjacency list vs matrix trade-offs and runtimes', 'DFS/BFS orders with tie rules; DFS pre/postorder', 'BFS shortest paths in unweighted graphs',
    'Topological sort (reverse postorder); cycle detection', 'Design with BFS/DFS (bipartite check, components)'];
  function randUGraph(r, V, E, connected) {
    const es = new Set(); const edges = [];
    const add = (u, v) => { if (u === v) return false; const a = Math.min(u, v), b = Math.max(u, v); const k = a + '-' + b; if (es.has(k)) return false; es.add(k); edges.push([a, b]); return true; };
    if (connected) { const p = r.shuffle(range(0, V)); for (let i = 1; i < V; i++) add(p[i], p[r.int(0, i - 1)]); }
    let guard = 0; while (edges.length < E && guard++ < 500) add(r.int(0, V - 1), r.int(0, V - 1));
    edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const adj = range(0, V).map(() => []); edges.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); }); adj.forEach(l => l.sort((a, b) => a - b));
    return { V, edges, adj };
  }
  function randDAG(r, V, E) {
    const ord = r.shuffle(range(0, V)); const es = new Set(); const edges = [];
    let guard = 0; while (edges.length < E && guard++ < 500) { const i = r.int(0, V - 2), j = r.int(i + 1, V - 1); const k = ord[i] + '>' + ord[j]; if (!es.has(k)) { es.add(k); edges.push([ord[i], ord[j]]); } }
    edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const adj = range(0, V).map(() => []); edges.forEach(([u, v]) => adj[u].push(v)); adj.forEach(l => l.sort((a, b) => a - b));
    return { V, edges, adj };
  }
  const uEdgeStr = g => g.edges.map(e => e[0] + '–' + e[1]).join(', ');
  const dEdgeStr = g => g.edges.map(e => e[0] + '→' + e[1]).join(', ');
  const adjStr = g => g.adj.map((l, v) => v + ': ' + (l.length ? l.join(' ') : '—')).join('<br>');
  function dfsOrders(adj, starts) {
    const V = adj.length, mark = new Array(V).fill(false), pre = [], post = [];
    const go = v => { mark[v] = true; pre.push(v); for (const w of adj[v]) if (!mark[w]) go(w); post.push(v); };
    for (const s of starts) if (!mark[s]) go(s);
    return { pre, post };
  }
  function bfs(adj, s) {
    const V = adj.length, mark = new Array(V).fill(false), dist = new Array(V).fill(-1), edgeTo = new Array(V).fill(-1), order = [];
    const q = [s]; mark[s] = true; dist[s] = 0;
    while (q.length) { const v = q.shift(); order.push(v); for (const w of adj[v]) if (!mark[w]) { mark[w] = true; dist[w] = dist[v] + 1; edgeTo[w] = v; q.push(w); } }
    return { order, dist, edgeTo };
  }
  B9.push({ id: 'B-9-dfs-pre-post', type: B9T[1], make(r) {
    return retry(r, () => {
      const V = r.int(7, 8), g = randUGraph(r, V, r.int(V + 1, V + 3), true), s = r.int(0, V - 1);
      const o = dfsOrders(g.adj, [s]);
      if (o.pre.slice().reverse().join() === o.post.join()) return null;
      return Q({ kind: 'list', answer: o.pre.concat(o.post),
        prompt: P('Undirected graph on 0…' + (V - 1) + ' with edges ' + uEdgeStr(g) + '. Run recursive DFS from ' + s + ', visiting neighbors in <b>ascending</b> order. Give the DFS preorder followed by the DFS postorder (' + 2 * V + ' numbers, comma-separated).'),
        hint: 'Preorder = when a vertex is first marked; postorder = when its call returns (all neighbors done). Postorder is not reversed preorder.',
        solution: P('Adjacency lists:<br>' + adjStr(g)) + P('Preorder: ' + o.pre.join(' ') + '<br>Postorder: ' + o.post.join(' ')), _chk: { g, s } });
    });
  } });
  B9.push({ id: 'B-9-bfs-order', type: B9T[1], make(r) {
    return retry(r, () => {
      const V = r.int(7, 9), g = randUGraph(r, V, r.int(V, V + 3), true), s = r.int(0, V - 1);
      const b = bfs(g.adj, s), d = dfsOrders(g.adj, [s]);
      if (b.order.join() === d.pre.join()) return null;
      return Q({ kind: 'list', answer: b.order,
        prompt: P('Undirected graph on 0…' + (V - 1) + ' with edges ' + uEdgeStr(g) + '. Run BFS from ' + s + ' (mark when enqueued; neighbors in ascending order). Give the order in which vertices are dequeued.'),
        hint: 'Queue, FIFO: finish everything at distance d before anything at distance d + 1; within a ring, follow the order parents were dequeued.',
        solution: P('Adjacency lists:<br>' + adjStr(g)) + P('BFS order: ' + b.order.join(' ') + ' (distances ' + b.order.map(v => v + ':' + b.dist[v]).join(', ') + ').'), _chk: { g, s } });
    });
  } });
  B9.push({ id: 'B-9-dfs-directed-post', type: B9T[1], make(r) {
    return retry(r, () => {
      const V = r.int(6, 8); const es = new Set(), edges = [];
      while (edges.length < V + 3) { const u = r.int(0, V - 1), v = r.int(0, V - 1); if (u !== v && !es.has(u + '>' + v)) { es.add(u + '>' + v); edges.push([u, v]); } }
      edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      const adj = range(0, V).map(() => []); edges.forEach(([u, v]) => adj[u].push(v)); adj.forEach(l => l.sort((a, b) => a - b));
      const o = dfsOrders(adj, range(0, V));
      const first = dfsOrders(adj, [0]); if (first.pre.length === V || first.pre.length < 3) return null;
      return Q({ kind: 'list', answer: o.post,
        prompt: P('Directed graph on 0…' + (V - 1) + ' with edges ' + edges.map(e => e[0] + '→' + e[1]).join(', ') + '. Run DFS from every unmarked vertex in the order 0, 1, …, ' + (V - 1) + ' (neighbors ascending). Give the full postorder.'),
        hint: 'The outer loop restarts DFS at the next unmarked vertex; vertices finished in earlier DFS calls stay marked.',
        solution: P('DFS from 0 reaches only ' + first.pre.join(' ') + '; the outer loop then restarts at the next unmarked vertex. Preorder ' + o.pre.join(' ') + '; postorder <b>' + o.post.join(' ') + '</b>.'), _chk: { V, edges } });
    });
  } });
  B9.push({ id: 'B-9-bfs-dist', type: B9T[2], make(r) {
    return retry(r, () => {
      const V = r.int(8, 10), g = randUGraph(r, V, r.int(V, V + 2), true), s = r.int(0, V - 1);
      const b = bfs(g.adj, s); if (Math.max.apply(null, b.dist) < 3) return null;
      return Q({ kind: 'list', answer: b.dist,
        prompt: P('Undirected unweighted graph on 0…' + (V - 1) + ' with edges ' + uEdgeStr(g) + '. Give distTo[v] (fewest edges from ' + s + ') for v = 0, 1, …, ' + (V - 1) + '.'),
        hint: 'BFS rings: everything adjacent to ring d that is unmarked is in ring d + 1.',
        solution: P('BFS from ' + s + ' gives distances ' + b.dist.map((d, v) => v + ':' + d).join(', ') + '.'), _chk: { g, s } });
    });
  } });
  B9.push({ id: 'B-9-bfs-edgeto', type: B9T[2], make(r) {
    return retry(r, () => {
      const V = r.int(7, 9), g = randUGraph(r, V, r.int(V + 1, V + 3), true), s = r.int(0, V - 1);
      const b = bfs(g.adj, s); let t = r.pick(range(0, V).filter(v => b.dist[v] >= 3)); if (t === undefined) return null;
      const path = []; for (let x = t; x !== -1; x = b.edgeTo[x]) path.unshift(x);
      return Q({ kind: 'list', answer: path,
        prompt: P('Undirected graph on 0…' + (V - 1) + ' with edges ' + uEdgeStr(g) + '. Run BFS from ' + s + ' (neighbors ascending, mark on enqueue, edgeTo[w] = the vertex that enqueued w). Give the path from ' + s + ' to ' + t + ' that edgeTo encodes, starting at ' + s + '.'),
        hint: 'edgeTo[w] is set once, by the first dequeued vertex that sees w. Follow edgeTo backwards from the target, then reverse.',
        solution: P('edgeTo: ' + b.edgeTo.map((e, v) => v + '←' + (e < 0 ? '–' : e)).join(', ') + '. Path: <b>' + path.join(' → ') + '</b> (' + (path.length - 1) + ' edges, a shortest path).'), _chk: { g, s, t } });
    });
  } });
  B9.push({ id: 'B-9-topo-reverse-post', type: B9T[3], make(r) {
    const V = r.int(7, 8), g = randDAG(r, V, r.int(V + 1, V + 3));
    const o = dfsOrders(g.adj, range(0, V)); const topo = o.post.slice().reverse();
    return Q({ kind: 'list', answer: topo,
      prompt: P('DAG on 0…' + (V - 1) + ' with edges ' + dEdgeStr(g) + '. Compute the topological order given by <b>reverse DFS postorder</b>, running DFS from each unmarked vertex in order 0, 1, …, ' + (V - 1) + ' with neighbors in ascending order.'),
      hint: 'Record postorder (finish times) across all the DFS restarts, then reverse it.',
      solution: P('Postorder: ' + o.post.join(' ') + '. Reversed: <b>' + topo.join(' ') + '</b>. Check: every edge points left to right.'), _chk: { g } });
  } });
  B9.push({ id: 'B-9-topo-valid-multi', type: B9T[3], make(r) {
    return retry(r, () => {
      const V = r.int(6, 7), g = randDAG(r, V, r.int(V, V + 2));
      const pos = ord => { const p = []; ord.forEach((v, i) => { p[v] = i; }); return p; };
      const valid = ord => { const p = pos(ord); return g.edges.every(([u, v]) => p[u] < p[v]); };
      const kahn = () => { const indeg = new Array(V).fill(0); g.edges.forEach(([, v]) => indeg[v]++); const out = []; let avail = range(0, V).filter(v => indeg[v] === 0); while (avail.length) { const v = r.pick(avail); avail = avail.filter(x => x !== v); out.push(v); for (const w of g.adj[v]) if (--indeg[w] === 0) avail.push(w); } return out; };
      const items = []; const seen = new Set();
      for (let t = 0; t < 40 && items.length < 5; t++) {
        let ord = kahn(); if (r.bool()) { const i = r.int(0, V - 2); [ord[i], ord[i + 1]] = [ord[i + 1], ord[i]]; }
        const k = ord.join(' '); if (seen.has(k)) continue; seen.add(k); items.push({ t: k, ok: valid(ord) });
      }
      if (items.length < 5) return null; const n = items.filter(x => x.ok).length; if (n === 0 || n === 5) return null;
      const m = multi(items);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('DAG on 0…' + (V - 1) + ' with edges ' + dEdgeStr(g) + '. Which of these are valid topological orders?'),
        hint: 'Valid iff every edge u→v has u before v. Check each edge.',
        solution: P(items.map(x => x.t + ': ' + (x.ok ? 'valid' : 'invalid (' + g.edges.filter(([u, v]) => x.t.split(' ').indexOf(String(u)) > x.t.split(' ').indexOf(String(v))).map(e => e[0] + '→' + e[1]).join(', ') + ' points backwards)')).join('<br>')), _chk: { g, orders: items.map(x => x.t) } });
    });
  } });
  B9.push({ id: 'B-9-cycle-detect', type: B9T[3], make(r) {
    const V = r.int(6, 8), g = randDAG(r, V, r.int(V, V + 2));
    const addBack = r.bool(); const edges = g.edges.slice();
    if (addBack) { const [u, v] = r.pick(edges); // add an edge from a descendant of v back toward u (or v→u)
      const reach = dfsOrders(g.adj, [v]).pre; const w = r.pick(reach); if (!edges.some(e => e[0] === w && e[1] === u) && w !== u) edges.push([w, u]); }
    edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const adj = range(0, V).map(() => []); edges.forEach(([a, b]) => adj[a].push(b));
    // cycle check with colors
    const col = new Array(V).fill(0); let cyc = false; const go = v => { col[v] = 1; for (const w of adj[v]) { if (col[w] === 1) cyc = true; else if (col[w] === 0) go(w); } col[v] = 2; };
    range(0, V).forEach(v => { if (!col[v]) go(v); });
    return Q({ kind: 'tf', answer: cyc,
      prompt: P('Directed graph on 0…' + (V - 1) + ' with edges ' + edges.map(e => e[0] + '→' + e[1]).join(', ') + '. True or false: this graph has a directed cycle (so it has no topological order).'),
      hint: 'Run DFS keeping an on-stack flag; an edge to a vertex currently on the stack closes a cycle (an edge to a finished vertex does not).',
      solution: P(cyc ? 'DFS finds an edge v→w with w still on the call stack: a directed cycle exists. <b>True</b>.' : 'No DFS edge ever points to a vertex on the current stack (edges to finished vertices are just paths re-joining), so it is a DAG. <b>False</b>.'), _chk: { V, edges } });
  } });
  B9.push({ id: 'B-9-bipartite', type: B9T[4], make(r) {
    const V = r.int(6, 8);
    const mkBip = r.bool();
    let g;
    if (mkBip) { const side = range(0, V).map(() => r.int(0, 1)); const es = new Set(), edges = []; let guard = 0; while (edges.length < V && guard++ < 300) { const u = r.int(0, V - 1), v = r.int(0, V - 1); if (u === v || side[u] === side[v]) continue; const a = Math.min(u, v), b = Math.max(u, v); if (!es.has(a + '-' + b)) { es.add(a + '-' + b); edges.push([a, b]); } } edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]); const adj = range(0, V).map(() => []); edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); }); g = { V, edges, adj }; }
    else g = randUGraph(r, V, r.int(V - 1, V + 1), false);
    const col = new Array(V).fill(-1); let ok = true;
    for (let s = 0; s < V; s++) if (col[s] < 0) { col[s] = 0; const q = [s]; while (q.length) { const v = q.shift(); for (const w of g.adj[v]) { if (col[w] < 0) { col[w] = 1 - col[v]; q.push(w); } else if (col[w] === col[v]) ok = false; } } }
    return Q({ kind: 'tf', answer: ok,
      prompt: P('Undirected graph on 0…' + (V - 1) + ' with edges ' + uEdgeStr(g) + '. True or false: the graph is bipartite.'),
      hint: '2-colour with BFS from every uncoloured vertex; a conflict (edge between equal colours) means an odd cycle.',
      solution: P(ok ? 'BFS 2-colouring succeeds: side A = {' + range(0, V).filter(v => col[v] === 0).join(', ') + '}, side B = {' + range(0, V).filter(v => col[v] === 1).join(', ') + '}. <b>True</b>.' : 'BFS 2-colouring hits an edge whose ends got the same colour: there is an odd cycle. <b>False</b>.'), _chk: { g } });
  } });
  B9.push({ id: 'B-9-components', type: B9T[4], make(r) {
    const V = r.int(8, 11), g = randUGraph(r, V, r.int(Math.floor(V / 2), V - 2), false);
    const mark = new Array(V).fill(-1); let c = 0; for (let s = 0; s < V; s++) if (mark[s] < 0) { const st = [s]; mark[s] = c; while (st.length) { const v = st.pop(); for (const w of g.adj[v]) if (mark[w] < 0) { mark[w] = c; st.push(w); } } c++; }
    const sizes = range(0, c).map(k => mark.filter(x => x === k).length);
    return Q({ kind: 'list', answer: [c, Math.max.apply(null, sizes)],
      prompt: P('Undirected graph on 0…' + (V - 1) + ' with edges ' + (g.edges.length ? uEdgeStr(g) : '(none)') + '. Give the number of connected components and the size of the largest one.'),
      hint: 'Run DFS from each unmarked vertex; each restart is a new component. Isolated vertices count!',
      solution: P('Components: ' + range(0, c).map(k => '{' + range(0, V).filter(v => mark[v] === k).join(', ') + '}').join(', ') + ' → ' + c + ' components, largest size ' + Math.max.apply(null, sizes) + '.'), _chk: { g } });
  } });
  for (const VV of [0, 1]) B9.push({ id: 'B-9-representation' + ['-ops', '-count'][VV], type: B9T[0], make(r) {
    const v = VV;
    if (v === 0) {
      const ops = [
        ['check whether u–v is an edge', 'Θ(1)', 'Θ(deg u)'], ['iterate over the neighbors of v', 'Θ(V)', 'Θ(deg v)'], ['run DFS on the whole graph', 'Θ(V²)', 'Θ(V + E)'],
        ['store the graph (space)', 'Θ(V²)', 'Θ(V + E)'], ['add an edge', 'Θ(1)', 'Θ(1)'], ['iterate over all edges', 'Θ(V²)', 'Θ(V + E)'],
      ];
      const [op, mat, lst] = r.pick(ops); const rep = r.pick(['adjacency matrix', 'adjacency list']);
      const correct = rep === 'adjacency matrix' ? mat : lst;
      const m = mcq(r, correct, ['Θ(1)', 'Θ(V)', 'Θ(E)', 'Θ(V + E)', 'Θ(V²)', 'Θ(deg u)', 'Θ(deg v)', 'Θ(V·E)'], null, 5);
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('Using an ' + rep + ', what is the cost to ' + op + '? (worst case, V vertices, E edges)'),
        hint: 'A matrix row has V entries no matter how many neighbors; a list holds just the neighbors.', solution: P('Matrix: ' + mat + '; list: ' + lst + '. Answer: <b>' + correct + '</b>.') });
    }
    const V = r.pick([100, 1000, 5000]), E = r.pick([2 * V, 5 * V, Math.floor(V * V / 10)]);
    const rep = r.pick(['matrix', 'list']);
    const ans = rep === 'matrix' ? V * V : V + 2 * E;
    return Q({ kind: 'num', answer: ans,
      prompt: P('An undirected graph has V = ' + V + ' vertices and E = ' + E + ' edges. DFS of the whole graph using an adjacency ' + rep + ' examines how many ' + (rep === 'matrix' ? 'matrix entries' : 'array slots plus list entries (count V for the array of lists, plus every list entry)') + '?'),
      hint: rep === 'matrix' ? 'Each vertex scans its entire row.' : 'Each undirected edge appears in two lists.',
      solution: P(rep === 'matrix' ? 'V rows × V entries = ' + V + '² = <b>' + ans + '</b>: Θ(V²) regardless of E.' : 'V + 2E = ' + V + ' + 2·' + E + ' = <b>' + ans + '</b>: Θ(V + E).') });
  } });
  G['B-9'] = B9;

  // ===================== B-10 =====================
  const B10 = [];
  const B10T = ['Dijkstra trace: distTo/edgeTo/PQ every step; negative edges', 'A*: admissible/consistent heuristics; which vertices get visited', 'Prim and Kruskal traces (Kruskal with WQU)',
    'Cut property proofs; MST uniqueness T/F', 'DAG shortest paths via topological order; reductions'];
  function randWDigraph(r, V, E, wlo, whi) {
    const es = new Set(), edges = [];
    const add = (u, v, w) => { if (u === v || es.has(u + '>' + v)) return; es.add(u + '>' + v); edges.push([u, v, w]); };
    const p = [0].concat(r.shuffle(range(1, V))); for (let i = 1; i < V; i++) add(p[r.int(Math.max(0, i - 2), i - 1)], p[i], r.int(wlo, whi));
    let guard = 0; while (edges.length < E && guard++ < 400) add(r.int(0, V - 1), r.int(0, V - 1), r.int(wlo, whi));
    edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return edges;
  }
  const wEdgeStr = (edges, arrow) => edges.map(e => e[0] + (arrow || '→') + e[1] + ' (' + e[2] + ')').join(', ');
  // Dijkstra with ties broken by smaller vertex; edges into popped vertices ignored
  function dijkstra(V, edges, s, hfun, goal) {
    const dist = new Array(V).fill(Infinity), edgeTo = new Array(V).fill(-1), done = new Array(V).fill(false), order = [];
    dist[s] = 0; const h = hfun || (() => 0);
    for (;;) {
      let best = -1; for (let v = 0; v < V; v++) if (!done[v] && dist[v] < Infinity && (best < 0 || dist[v] + h(v) < dist[best] + h(best))) best = v;
      if (best < 0) break; done[best] = true; order.push(best);
      if (goal !== undefined && best === goal) break;
      for (const [u, w, c] of edges) if (u === best && !done[w] && dist[best] + c < dist[w]) { dist[w] = dist[best] + c; edgeTo[w] = best; }
    }
    return { dist, edgeTo, order };
  }
  B10.push({ id: 'B-10-dijkstra-order-dist', type: B10T[0], make(r) {
    return retry(r, () => {
      const V = r.int(6, 7), edges = randWDigraph(r, V, r.int(V + 3, V + 5), 1, 9);
      const d = dijkstra(V, edges, 0);
      if (d.order.length < V) return null;
      // require at least one improvement (a distTo dropping after first being set)
      let improved = false; { const dist = new Array(V).fill(Infinity), done = new Array(V).fill(false); dist[0] = 0; for (const v of d.order) { done[v] = true; for (const [u, w, c] of edges) if (u === v && !done[w] && dist[v] + c < dist[w]) { if (dist[w] < Infinity) improved = true; dist[w] = dist[v] + c; } } }
      if (!improved) return null;
      return Q({ kind: 'list', answer: d.order.concat(d.dist),
        prompt: P('Directed graph, edge weights in parentheses: ' + wEdgeStr(edges) + '. Run Dijkstra from 0 (ties in the PQ: smaller vertex number first). Give the order vertices are popped (visited), followed by the final distTo[0], …, distTo[' + (V - 1) + '] (' + 2 * V + ' numbers).'),
        hint: 'Pop the unvisited vertex with smallest distTo; relax its out-edges (distTo[v] + w < distTo[w] → update). A distTo can drop several times before it is popped.',
        solution: P('Pop order: ' + d.order.join(' ') + '. distTo: ' + d.dist.map((x, v) => v + ':' + x).join(', ') + '. edgeTo: ' + d.edgeTo.map((x, v) => v + '←' + (x < 0 ? '–' : x)).join(', ') + '.'), _chk: { V, edges } });
    });
  } });
  B10.push({ id: 'B-10-dijkstra-kth-edgeto', type: B10T[0], make(r) {
    return retry(r, () => {
      const V = r.int(6, 8), edges = randWDigraph(r, V, r.int(V + 3, V + 6), 1, 12);
      const d = dijkstra(V, edges, 0); if (d.order.length < V) return null;
      const k = r.int(3, V - 1); const t = r.pick(range(1, V));
      const path = []; for (let x = t; x !== -1; x = d.edgeTo[x]) path.unshift(x);
      if (path.length < 3) return null;
      return Q({ kind: 'list', answer: [d.order[k - 1]].concat(path),
        prompt: P('Directed graph: ' + wEdgeStr(edges) + '. Dijkstra from 0, PQ ties → smaller vertex. Give (1) the ' + k + (k === 3 ? 'rd' : 'th') + ' vertex popped, then (2) the shortest path from 0 to ' + t + ' encoded by edgeTo, starting at 0.'),
        hint: 'Keep a table of distTo and edgeTo; edgeTo[w] changes whenever distTo[w] improves.',
        solution: P('Pop order ' + d.order.join(' ') + ' (so #' + k + ' is ' + d.order[k - 1] + '). edgeTo: ' + d.edgeTo.map((x, v) => v + '←' + (x < 0 ? '–' : x)).join(', ') + ' → path ' + path.join(' → ') + ', length ' + d.dist[t] + '.'), _chk: { V, edges, k, t } });
    });
  } });
  B10.push({ id: 'B-10-dijkstra-negative', type: B10T[0], make(r) {
    return retry(r, () => {
      const V = r.int(4, 6), edges = randWDigraph(r, V, r.int(V + 1, V + 3), 1, 8);
      const i = r.int(0, edges.length - 1); edges[i] = [edges[i][0], edges[i][1], -r.int(2, 6)];
      // no negative cycles: Bellman-Ford
      const bf = new Array(V).fill(Infinity); bf[0] = 0;
      for (let it = 0; it < V - 1; it++) for (const [u, v, c] of edges) if (bf[u] + c < bf[v]) bf[v] = bf[u] + c;
      for (const [u, v, c] of edges) if (bf[u] + c < bf[v]) return null;
      const d = dijkstra(V, edges, 0);
      const bad = range(0, V).filter(v => d.dist[v] !== bf[v] && bf[v] < Infinity);
      if (!bad.length) return null; const t = r.pick(bad);
      return Q({ kind: 'list', answer: [d.dist[t], bf[t]],
        prompt: P('Directed graph (one edge is negative): ' + wEdgeStr(edges) + '. Run Dijkstra from 0 exactly as taught (ties → smaller vertex; once a vertex is popped it is final, and edges into popped vertices are ignored). Give two numbers: the distTo[' + t + '] Dijkstra reports, and the true shortest distance to ' + t + '.'),
        hint: 'Trace Dijkstra mechanically; separately find the true shortest path by checking routes through the negative edge.',
        solution: P('Dijkstra pops ' + d.order.join(' ') + ' and reports distTo = ' + d.dist.map((x, v) => v + ':' + x).join(', ') + '. True distances (Bellman–Ford): ' + bf.map((x, v) => v + ':' + x).join(', ') + '. For ' + t + ': reported <b>' + d.dist[t] + '</b>, true <b>' + bf[t] + '</b>. A negative edge can make a popped (“final”) vertex reachable more cheaply later.'), _chk: { V, edges, t } });
    });
  } });
  // A*
  function trueDistTo(V, edges, goal) { // reverse Dijkstra from goal
    const rev = edges.map(([u, v, c]) => [v, u, c]); const d = new Array(V).fill(Infinity); d[goal] = 0; const done = new Array(V).fill(false);
    for (;;) { let b = -1; for (let v = 0; v < V; v++) if (!done[v] && d[v] < Infinity && (b < 0 || d[v] < d[b])) b = v; if (b < 0) break; done[b] = true; for (const [u, w, c] of rev) if (u === b && d[b] + c < d[w]) d[w] = d[b] + c; }
    return d;
  }
  B10.push({ id: 'B-10-astar-visited', type: B10T[1], make(r) {
    return retry(r, () => {
      const V = r.int(7, 8), es = randWUGraph(r, V, r.int(V + 3, V + 5), true).map(([u, v, c]) => [u, v, c % 12 + 1]);
      const edges = es.concat(es.map(([u, v, c]) => [v, u, c]));
      const goal = r.int(1, V - 1); const td = trueDistTo(V, edges, goal); if (td[0] === Infinity) return null;
      const alpha = r.pick([0.5, 0.7, 0.8, 1]);
      const h = range(0, V).map(v => (td[v] === Infinity ? 0 : Math.floor(alpha * td[v])));
      const a = dijkstra(V, edges, 0, v => h[v], goal);
      const dj = dijkstra(V, edges, 0, null, goal);
      if (a.order.length >= dj.order.length) return null;
      const und = es.map(e => e[0] + '–' + e[1] + ' (' + e[2] + ')').join(', ');
      return Q({ kind: 'list', answer: a.order,
        prompt: P('Undirected weighted graph: ' + und + '. Run A* from 0 to goal ' + goal + ' with heuristic h = [' + h.join(', ') + '] (h[v] for v = 0, 1, …). Priority = distTo[v] + h[v]; ties → smaller vertex; a vertex is visited when popped; stop when the goal is popped. List the visited vertices in order (including the goal).'),
        hint: 'Same as Dijkstra, but compare distTo + h. Vertices whose distTo + h never becomes the minimum are never visited.',
        solution: P('A* pops ' + a.order.join(' ') + ' (goal distance ' + a.dist[goal] + '). Plain Dijkstra would pop ' + dj.order.join(' ') + ' before reaching the goal. (This h is consistent: it is a scaled-down true distance.)'), _chk: { V, edges, goal, h } });
    });
  } });
  B10.push({ id: 'B-10-astar-heuristic-props', type: B10T[1], make(r) {
    return retry(r, () => {
      const V = r.int(5, 6), es = randWUGraph(r, V, r.int(V + 2, V + 3), true).map(([u, v, c]) => [u, v, c % 9 + 1]);
      const edges = es.concat(es.map(([u, v, c]) => [v, u, c]));
      const goal = V - 1; const td = trueDistTo(V, edges, goal); if (td.some(x => x === Infinity)) return null;
      const h = td.map((d, v) => (v === goal ? 0 : Math.max(0, d + r.pick([-3, -2, -1, 0, 0, 1, 2]))));
      const adm = h.every((x, v) => x <= td[v]);
      const cons = edges.every(([u, v, c]) => h[u] <= c + h[v]) && h[goal] === 0;
      const lab = adm && cons ? 'Admissible and consistent' : adm ? 'Admissible but not consistent' : cons ? 'Consistent but not admissible' : 'Neither admissible nor consistent';
      const m = mcq(r, lab, ['Admissible and consistent', 'Admissible but not consistent', 'Consistent but not admissible', 'Neither admissible nor consistent'], null, 4);
      const viol = edges.filter(([u, v, c]) => h[u] > c + h[v]).map(([u, v, c]) => 'h(' + u + ')=' + h[u] + ' > ' + c + ' + h(' + v + ')=' + (c + h[v]));
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
        prompt: P('Undirected graph: ' + es.map(e => e[0] + '–' + e[1] + ' (' + e[2] + ')').join(', ') + '. Goal: ' + goal + '. Heuristic h = [' + h.join(', ') + '] for vertices 0…' + (V - 1) + '. Classify h.'),
        hint: 'Admissible: h(v) ≤ true distance to goal for every v. Consistent: h(u) ≤ w(u,v) + h(v) for every edge (both directions), h(goal) = 0.',
        solution: P('True distances to ' + goal + ': [' + td.join(', ') + ']. ' + (adm ? 'No h exceeds them: admissible. ' : 'Some h exceeds the true distance: not admissible. ') + (cons ? 'Every edge satisfies h(u) ≤ w + h(v): consistent.' : 'Violations: ' + viol.slice(0, 3).join('; ') + '.') + ' → <b>' + lab + '</b>. (Consistent with h(goal)=0 always implies admissible.)'),
        _chk: { V, edges, goal, h } });
    });
  } });
  // MST helpers
  function randWUGraph(r, V, E, distinct) {
    const es = new Set(), edges = []; const ws = distinct ? r.shuffle(range(1, 30)) : null; let wi = 0;
    const add = (u, v) => { if (u === v) return; const a = Math.min(u, v), b = Math.max(u, v); if (es.has(a + '-' + b)) return; es.add(a + '-' + b); edges.push([a, b, distinct ? ws[wi++] : r.int(1, 5)]); };
    const p = r.shuffle(range(0, V)); for (let i = 1; i < V; i++) add(p[i], p[r.int(0, i - 1)]);
    let guard = 0; while (edges.length < E && guard++ < 300) add(r.int(0, V - 1), r.int(0, V - 1));
    edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]); return edges;
  }
  function kruskal(V, edges) {
    const par = range(0, V); const f = x => { while (par[x] !== x) x = par[x]; return x; };
    const acc = []; for (const e of edges.slice().sort((a, b) => a[2] - b[2])) { const a = f(e[0]), b = f(e[1]); if (a !== b) { par[a] = b; acc.push(e); } }
    return acc;
  }
  function prim(V, edges, s) {
    const inT = new Array(V).fill(false), dist = new Array(V).fill(Infinity), eTo = new Array(V).fill(null); dist[s] = 0; const added = [];
    for (let it = 0; it < V; it++) {
      let b = -1; for (let v = 0; v < V; v++) if (!inT[v] && dist[v] < Infinity && (b < 0 || dist[v] < dist[b])) b = v;
      if (b < 0) break; inT[b] = true; if (eTo[b]) added.push(eTo[b]);
      for (const e of edges) { const w = e[0] === b ? e[1] : e[1] === b ? e[0] : -1; if (w >= 0 && !inT[w] && e[2] < dist[w]) { dist[w] = e[2]; eTo[w] = e; } }
    }
    return added;
  }
  B10.push({ id: 'B-10-kruskal-order', type: B10T[2], make(r) {
    const V = r.int(6, 7), edges = randWUGraph(r, V, r.int(V + 3, V + 5), true);
    const acc = kruskal(V, edges); const ws = acc.map(e => e[2]);
    const rej = edges.slice().sort((a, b) => a[2] - b[2]).filter(e => !acc.includes(e) && e[2] < ws[ws.length - 1]).map(e => e[2]);
    return Q({ kind: 'list', answer: ws.concat([sum(ws)]),
      prompt: P('Undirected graph (distinct weights): ' + wEdgeStr(edges, '–') + '. Run Kruskal’s algorithm. Give the weights of the accepted edges in the order Kruskal accepts them, followed by the total MST weight.'),
      hint: 'Sort edges by weight; accept an edge unless its endpoints are already connected (it would close a cycle).',
      solution: P('Sorted weights: ' + edges.map(e => e[2]).sort((a, b) => a - b).join(', ') + '. Accepted: ' + ws.join(', ') + ' (rejected before finishing: ' + (rej.length ? rej.join(', ') : 'none') + '). Total <b>' + sum(ws) + '</b>.'), _chk: { V, edges } });
  } });
  B10.push({ id: 'B-10-prim-order', type: B10T[2], make(r) {
    return retry(r, () => {
      const V = r.int(6, 7), edges = randWUGraph(r, V, r.int(V + 3, V + 5), true), s = r.int(0, V - 1);
      const pa = prim(V, edges, s).map(e => e[2]); const ka = kruskal(V, edges).map(e => e[2]);
      if (pa.join() === ka.join()) return null;
      return Q({ kind: 'list', answer: pa,
        prompt: P('Undirected graph (distinct weights): ' + wEdgeStr(edges, '–') + '. Run Prim’s algorithm from vertex ' + s + '. Give the weights of the MST edges in the order Prim adds them.'),
        hint: 'Prim always adds the lightest edge leaving the current tree, so the order follows how the tree grows, not sorted order.',
        solution: P('Prim from ' + s + ' adds: ' + pa.join(', ') + ' (total ' + sum(pa) + '). Kruskal would accept the same edges in sorted order ' + ka.join(', ') + '.'), _chk: { V, edges, s } });
    });
  } });
  B10.push({ id: 'B-10-kruskal-wqu', type: B10T[2], make(r) {
    return retry(r, () => {
      const V = r.int(6, 7), edges = randWUGraph(r, V, r.int(V + 2, V + 4), true);
      const a = new Array(V).fill(-1); const find = x => { while (a[x] >= 0) x = a[x]; return x; }; const steps = [];
      for (const e of edges.slice().sort((x, y) => x[2] - y[2])) { const rp = find(e[0]), rq = find(e[1]); if (rp === rq) { steps.push(e[0] + '–' + e[1] + ' (' + e[2] + '): reject'); continue; } const sp = -a[rp], sq = -a[rq]; if (sp > sq) { a[rp] -= sq; a[rq] = rp; } else { a[rq] -= sp; a[rp] = rq; } steps.push('union(' + e[0] + ', ' + e[1] + ') → ' + fmtArr(a)); }
      return Q({ kind: 'list', answer: a.slice(),
        prompt: P('Run Kruskal on ' + wEdgeStr(edges, '–') + ', using weighted quick union for cycle checks. For edge u–v call union(u, v): ' + WQU_CONV + ' Give the final WQU array for vertices 0…' + (V - 1) + '.'),
        hint: 'Process edges by increasing weight; for each, find both roots; reject if equal; else union by size with the tie rule.',
        solution: P(steps.join('<br>')), _chk: { V, edges } });
    });
  } });
  for (const VV of [0, 1]) B10.push({ id: 'B-10-mst-tf' + ['-edge', '-unique'][VV], type: B10T[3], make(r) {
    return retry(r, () => {
      const V = r.int(5, 6), edges = randWUGraph(r, V, r.int(V + 1, V + 3), false);
      const e = r.pick(edges); const [u, v, w] = e;
      const connectedVia = (pred) => { const par = range(0, V); const f = x => { while (par[x] !== x) x = par[x]; return x; }; for (const x of edges) if (x !== e && pred(x[2])) par[f(x[0])] = f(x[1]); return f(u) === f(v); };
      const inSome = !connectedVia(c => c < w), inAll = !connectedVia(c => c <= w);
      const kind = VV === 0 ? r.pick(['every', 'some', 'no']) : 'unique';
      let truth, stmt;
      if (kind === 'every') { truth = inAll; stmt = 'edge ' + u + '–' + v + ' (' + w + ') is in <b>every</b> MST'; }
      else if (kind === 'some') { truth = inSome; stmt = 'edge ' + u + '–' + v + ' (' + w + ') is in <b>at least one</b> MST'; }
      else if (kind === 'no') { truth = !inSome; stmt = 'edge ' + u + '–' + v + ' (' + w + ') is in <b>no</b> MST'; }
      else { // MST unique iff every edge in some MST is in all MSTs
        const per = edges.map(x => { const cv = (pred) => { const par = range(0, V); const f = y => { while (par[y] !== y) y = par[y]; return y; }; for (const y of edges) if (y !== x && pred(y[2])) par[f(y[0])] = f(y[1]); return f(x[0]) === f(x[1]); }; return { some: !cv(c => c < x[2]), all: !cv(c => c <= x[2]) }; });
        truth = per.every(p => !p.some || p.all); stmt = 'the graph has a <b>unique</b> MST';
      }
      return Q({ kind: 'tf', answer: truth,
        prompt: P('Undirected graph (weights may repeat): ' + wEdgeStr(edges, '–') + '. True or false: ' + stmt + '.'),
        hint: 'Edge e = (u, v, w) is in some MST iff u and v are NOT connected using only edges lighter than w; in every MST iff they are not connected using other edges of weight ≤ w (cut/cycle properties).',
        solution: P(kind === 'unique' ? 'The MST is unique iff no tie lets one MST edge be swapped for another edge of equal weight on a cycle. Checking each edge with the cut/cycle test gives: <b>' + (truth ? 'True' : 'False') + '</b>.' :
          'Using only edges lighter than ' + w + ', ' + u + ' and ' + v + ' are ' + (inSome ? 'not connected' : 'connected (so ' + u + '–' + v + ' is the heaviest edge on a cycle of lighter edges → in no MST)') + '; using other edges of weight ≤ ' + w + ' they are ' + (inAll ? 'not connected (so every spanning tree must cross that cut with this edge → in every MST)' : 'connected (an equal-weight swap exists or a lighter route exists)') + '. Statement: <b>' + (truth ? 'True' : 'False') + '</b>.'),
        _chk: { V, edges, e, kind } });
    });
  } });
  for (const VV of [0, 1]) B10.push({ id: 'B-10-dag-sp' + ['-shortest', '-longest'][VV], type: B10T[4], make(r) {
    return retry(r, () => {
      const V = r.int(6, 7); const ord = [0].concat(r.shuffle(range(1, V)));
      const es = new Set(), edges = [];
      for (let i = 1; i < V; i++) { const j = r.int(0, i - 1); es.add(ord[j] + '>' + ord[i]); edges.push([ord[j], ord[i], r.int(-4, 9)]); }
      let guard = 0; while (edges.length < V + 3 && guard++ < 200) { const i = r.int(0, V - 2), j = r.int(i + 1, V - 1); const k = ord[i] + '>' + ord[j]; if (!es.has(k)) { es.add(k); edges.push([ord[i], ord[j], r.int(-4, 9)]); } }
      edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      if (!edges.some(e => e[2] < 0)) return null;
      const longest = VV === 1;
      const adj = range(0, V).map(() => []); edges.forEach(e => adj[e[0]].push(e[1])); adj.forEach(l => l.sort((a, b) => a - b));
      const topo = dfsOrders(adj, range(0, V)).post.reverse();
      const dist = new Array(V).fill(longest ? -Infinity : Infinity); dist[0] = 0;
      for (const v of topo) if (Math.abs(dist[v]) !== Infinity) for (const e of edges) if (e[0] === v) { const nd = dist[v] + e[2]; if (longest ? nd > dist[e[1]] : nd < dist[e[1]]) dist[e[1]] = nd; }
      if (dist.some(x => Math.abs(x) === Infinity)) return null;
      return Q({ kind: 'list', answer: dist,
        prompt: P('DAG with weights (some negative): ' + wEdgeStr(edges) + '. Using the topological-order algorithm (relax each vertex’s out-edges in topological order), give the ' + (longest ? '<b>longest</b>' : 'shortest') + ' path distance from 0 to each vertex 0, 1, …, ' + (V - 1) + '.'),
        hint: longest ? 'Longest path in a DAG: negate every weight, find shortest paths, negate back (or relax with > instead of <).' : 'Process vertices in topological order; when you reach v, all edges into v have been relaxed, so negative edges are fine.',
        solution: P('Topological order (reverse DFS postorder): ' + topo.join(' ') + '. Relaxing in that order gives ' + dist.map((x, v) => v + ':' + x).join(', ') + '.' + (longest ? ' (Longest paths are easy in DAGs only; in general graphs the problem is hard.)' : '')), _chk: { V, edges, longest } });
    });
  } });
  G['B-10'] = B10;

  // ===================== B-11 =====================
  const B11 = [];
  const B11T = ['Hash table insert & resize traces', 'Separate chaining runtime; load factor', 'Good vs bad hashCode', 'equals/hashCode contract bugs; mutating keys', 'Choose the right data structure (design questions)'];
  const strHash = s => { let h = 0; for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return h; };
  function hashTrace(keys, M0, alpha) {
    let M = M0, buckets = range(0, M).map(() => []), N = 0, resizes = 0; const log = [];
    for (const k of keys) {
      buckets[floorMod(k, M)].push(k); N++;
      if (N / M > alpha) { const old = buckets; M *= 2; buckets = range(0, M).map(() => []); for (const b of old) for (const x of b) buckets[floorMod(x, M)].push(x); resizes++; log.push('after inserting ' + k + ': N/M = ' + N + '/' + (M / 2) + ' > ' + alpha + ' → resize to M = ' + M); }
    }
    return { M, buckets, resizes, log, N };
  }
  B11.push({ id: 'B-11-hash-trace', type: B11T[0], make(r) {
    return retry(r, () => {
      const M0 = r.pick([4, 5]), alpha = r.pick([0.75, 1, 1.5]);
      const keys = r.sample(range(-20, 60), r.int(7, 10));
      const h = hashTrace(keys, M0, alpha); if (!h.resizes) return null;
      const cand = range(0, h.M).filter(b => h.buckets[b].length >= 2); if (!cand.length) return null;
      const b = r.pick(cand);
      return Q({ kind: 'list', answer: [h.M, h.resizes].concat(h.buckets[b]),
        prompt: P('Separate chaining with Integer keys (hashCode = the value), bucket = Math.floorMod(key, M), new items go at the END of their chain. Start with M = ' + M0 + '. After each insert, if N/M &gt; ' + alpha + ', double M and rehash, walking the old buckets 0, 1, … in order and each chain front to back (appending to the new chains).') +
          P('Insert ' + keys.join(', ') + '. Give: the final M, the number of resizes, then the contents of bucket ' + b + ' front to back (comma-separated).'),
        hint: 'floorMod keeps negatives in range: floorMod(−5, 4) = 3. Check the load factor after EVERY insert.',
        solution: P(h.log.join('<br>')) + P('Final table (M = ' + h.M + '):<br>' + h.buckets.map((x, i) => i + ': ' + (x.length ? x.join(' → ') : '')).join('<br>')),
        _chk: { keys, M0, alpha, b } });
    });
  } });
  B11.push({ id: 'B-11-string-buckets', type: B11T[0], make(r) {
    return retry(r, () => {
      const M = r.pick([5, 7, 8, 11, 13]);
      const letters = 'abcdeAB'.split('');
      const words = []; while (words.length < 5) { const w = range(0, r.int(1, 3)).map(() => r.pick(letters)).join(''); if (!words.includes(w)) words.push(w); }
      const hs = words.map(strHash), bs = hs.map(h => floorMod(h, M));
      if (new Set(bs).size === 5) return null;
      return Q({ kind: 'list', answer: bs,
        prompt: P('Java’s String.hashCode is s[0]·31^(n−1) + s[1]·31^(n−2) + … + s[n−1] (char codes: \'A\' = 65, \'B\' = 66, \'a\' = 97, …, \'e\' = 101). With M = ' + M + ' buckets and bucket = floorMod(hashCode, M), give the bucket of each string: ' + words.map(w => '"' + w + '"').join(', ') + '.'),
        hint: 'Horner’s rule: h = 0; for each char c: h = 31·h + c. Then reduce mod M (you can reduce mod M as you go).',
        solution: P(words.map((w, i) => '"' + w + '": hashCode ' + hs[i] + ' → bucket ' + bs[i]).join('<br>')), _chk: { words, M } });
    });
  } });
  B11.push({ id: 'B-11-load-factor', type: B11T[1], make(r) {
    const M0 = r.pick([4, 8, 10, 16]), alpha = r.pick([0.75, 1.5, 2]), N = r.int(12, 90);
    let M = M0; for (let n = 1; n <= N; n++) if (n / M > alpha) M *= 2;
    const g = (a, b) => (b ? g(b, a % b) : a); const d = g(N, M);
    const ans = (N / d) + '/' + (M / d);
    return Q({ kind: 'num', answer: ans,
      prompt: P('A separate-chaining table starts with M = ' + M0 + ' buckets and doubles M right after any insert that makes N/M &gt; ' + alpha + '. After ' + N + ' inserts of distinct keys, what is the load factor N/M? (fraction or decimal)'),
      hint: 'Track M: it doubles each time N passes alpha·M.',
      solution: P('M doubles when N first exceeds ' + alpha + '·M. Final M = ' + M + ', so N/M = ' + N + '/' + M + ' = <b>' + ans + '</b> (≈ ' + (N / M).toFixed(3) + '). Average chain length stays ≤ ' + alpha + ', which is why get/put are Θ(1) on average with a good hash.'),
      _chk: { M0, alpha, N } });
  } });
  B11.push({ id: 'B-11-chaining-runtime', type: B11T[1], make(r) {
    const cases = [
      ['get, good hashCode, table resizes to keep N/M ≤ 1.5', 'Θ(1)', 'chains have constant average length'],
      ['get, every key has hashCode 0, table resizes', 'Θ(N)', 'all N items sit in one chain; resizing cannot split identical hash codes'],
      ['put, good hashCode, table NEVER resizes (M fixed at 10)', 'Θ(N)', 'average chain length N/10 grows linearly (and put must scan for duplicates)'],
      ['one resize of a table holding N items', 'Θ(N)', 'every item is rehashed into the new array'],
      ['N puts into an initially empty resizing table with a good hashCode (total)', 'Θ(N)', 'doubling makes resizes geometric: amortized Θ(1) per put'],
      ['N puts where all keys collide (total)', 'Θ(N²)', 'the i-th put scans a chain of length i − 1 to check for duplicates'],
      ['get, keys hash to only 4 distinct values, resizing table', 'Θ(N)', 'at most 4 non-empty chains, so some chain holds ≥ N/4 items'],
    ];
    const [d, th, why] = r.pick(cases);
    const m = mcq(r, th, ['Θ(1)', 'Θ(log N)', 'Θ(N)', 'Θ(N log N)', 'Θ(N²)'], null, 4);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('Separate-chaining hash table with N items. Runtime (average case where relevant) of: ' + d + '?'),
      hint: 'Cost = length of the chain you scan; that is N/M only if the hash spreads keys evenly.', solution: P(why + ' → <b>' + th + '</b>.') });
  } });
  B11.push({ id: 'B-11-bad-hash', type: B11T[2], make(r) {
    return retry(r, () => {
      const pts = []; const seen = new Set(); while (pts.length < 10) { const p = [r.int(0, 5), r.int(0, 5)]; if (!seen.has(p.join())) { seen.add(p.join()); pts.push(p); } }
      const M = r.pick([8, 10, 16]);
      const fns = [['x + y', p => p[0] + p[1]], ['31 * x + y', p => 31 * p[0] + p[1]], ['x', p => p[0]], ['x * y', p => p[0] * p[1]], ['x - y', p => p[0] - p[1]]];
      const [A, B] = r.sample(fns, 2);
      const mx = f => { const c = {}; pts.forEach(p => { const b = floorMod(f(p), M); c[b] = (c[b] || 0) + 1; }); return Math.max.apply(null, Object.values(c)); };
      const a = mx(A[1]), b = mx(B[1]); if (a === b) return null;
      return Q({ kind: 'list', answer: [a, b],
        prompt: P('Ten Pt objects: ' + pts.map(p => '(' + p.join(',') + ')').join(' ') + ' go into a table with M = ' + M + ' buckets, bucket = floorMod(hashCode, M). Give the size of the largest bucket if hashCode() returns (1) <code>' + A[0] + '</code>, (2) <code>' + B[0] + '</code>.'),
        hint: 'Compute each hash, reduce mod M, tally. Both are VALID if equals compares x and y; they differ in how well they spread.',
        solution: P('(1) ' + A[0] + ': buckets ' + pts.map(p => floorMod(A[1](p), M)).join(' ') + ' → largest ' + a + '. (2) ' + B[0] + ': buckets ' + pts.map(p => floorMod(B[1](p), M)).join(' ') + ' → largest ' + b + '. Symmetric formulas like x + y or x·y collide on swapped coordinates.'),
        _chk: { pts, M, A: A[0], B: B[0] } });
    });
  } });
  B11.push({ id: 'B-11-hash-valid-good', type: B11T[2], make(r) {
    const opts = [
      ['return 31 * x + y;', true, 'valid and spreads well'], ['return 0;', true, 'valid (equal objects get equal codes) but terrible: one bucket'],
      ['return x;', true, 'valid: depends only on fields equals uses'], ['return x + y + z;', false, 'uses z, which equals ignores: equal objects may hash differently'],
      ['return (int) (Math.random() * 100);', false, 'not deterministic'], ['return System.identityHashCode(this);', false, 'equal but distinct objects get different codes'],
      ['return Objects.hash(x, y);', true, 'valid and good'], ['return x * y;', true, 'valid (but (2,3) and (3,2) collide)'], ['return y - x;', true, 'valid'],
      ['return name.length() + x;', false, 'uses name, which equals ignores'],
    ];
    const pick = r.sample(opts, 5);
    const m = multi(pick.map(o => ({ t: '<code>' + esc(o[0]) + '</code>', ok: o[1] })));
    return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
      prompt: P('A class has fields int x, y, z and String name, and its equals compares <b>only x and y</b>. Which hashCode bodies are <b>valid</b> (obey the equals/hashCode contract), regardless of how good they are?'),
      hint: 'Valid ⟺ a.equals(b) ⇒ same hashCode, every time. Using only fields that equals compares (or none) is always valid.',
      solution: P(pick.map(o => '<code>' + esc(o[0]) + '</code>: ' + (o[1] ? 'valid' : 'NOT valid') + ', ' + o[2]).join('<br>')) });
  } });
  B11.push({ id: 'B-11-mutable-key', type: B11T[3], make(r) {
    return retry(r, () => {
      const L0 = range(0, r.int(2, 3)).map(() => r.int(0, 9));
      const lh = a => { let h = 1; for (const e of a) h = (Math.imul(31, h) + e) | 0; return h; };
      const key = L0.slice(); const set = [{ ref: key, h: lh(key) }];
      const mut = r.pick(['add', 'set', 'setSame']);
      let mline;
      if (mut === 'add') { const v = r.int(0, 9); key.push(v); mline = 'key.add(' + v + ');'; }
      else if (mut === 'set') { const i = r.int(0, key.length - 1); let v = r.int(0, 9); if (v === key[i]) v = (v + 1) % 10; key[i] = v; mline = 'key.set(' + i + ', ' + v + ');'; }
      else { const i = r.int(0, key.length - 1); mline = 'key.set(' + i + ', ' + key[i] + ');'; }
      const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
      const contains = q => set.some(e => e.h === lh(q) && (e.ref === q || eq(e.ref, q)));
      const c1 = contains(key), c2 = contains(L0.slice());
      const readd = r.bool(); let c3 = null;
      if (readd) { if (!contains(key)) set.push({ ref: key, h: lh(key) }); }
      const out = [String(c1), String(c2), String(set.length)];
      const body = 'List<Integer> key = new ArrayList<>(List.of(' + L0.join(', ') + '));\nSet<List<Integer>> s = new HashSet<>();\ns.add(key);\n' + mline + '\nboolean c1 = s.contains(key);\nboolean c2 = s.contains(List.of(' + L0.join(', ') + '));\n' + (readd ? 's.add(key);\n' : '') + 'System.out.println(c1 + " " + c2 + " " + s.size());';
      return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
        prompt: P('List.hashCode and equals depend on the contents (hash = 31·hash + element, starting from 1). What does this print? (three values separated by spaces)') + code(body),
        hint: 'The set filed key under the hash it had when added. A lookup only succeeds if the probe’s hash matches that stored hash AND equals holds.',
        solution: P('Stored hash: ' + lh(L0) + ' (for [' + L0.join(', ') + ']). After <code>' + esc(mline) + '</code> key is [' + key.join(', ') + '] with hash ' + lh(key) + '. ' +
          'c1: probe hash ' + lh(key) + (lh(key) === lh(L0) ? ' matches, and it is the same object → true.' : ' differs from the stored one → false.') +
          ' c2: [' + L0.join(', ') + '] has the old hash' + (eq(key, L0) ? ' and equals the (unchanged) key → true.' : ', but the stored list now has different contents → equals fails → false.') +
          (readd ? ' Then s.add(key) ' + (c1 ? 'finds it, size stays 1.' : 'does not find it, so the same list object is added a second time.') : '') + ' Output: <b>' + out.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', ''), expect: { kind: 'out', out: out.join(' ') } }, _chk: { L0, mline } });
    });
  } });
  const DS_CHOICES = {
    hash: 'HashSet / HashMap', tree: 'TreeSet / TreeMap (balanced BST)', heap: 'PriorityQueue (binary heap)', deque: 'ArrayDeque', trie: 'Trie',
    wqu: 'Weighted quick union (disjoint sets)', alist: 'ArrayList', llist: 'LinkedList (no index access)',
  };
  const DS_REQS = [
    ['insert, delete, and membership tests, as fast as possible on average; order never matters', 'hash', 'Only membership is needed, so a hash table gives Θ(1) average for all three.'],
    ['insert, delete, and “what is the smallest stored key that is ≥ x?” queries, all in O(log N) worst case', 'tree', 'Ceiling queries need sorted order; a balanced BST does them in O(log N).'],
    ['print all stored keys in sorted order at any time, with O(log N) inserts', 'tree', 'In-order traversal of a balanced BST lists keys sorted; a hash table has no order.'],
    ['insert items and repeatedly remove the one with the highest priority', 'heap', 'That is exactly a priority queue: O(log N) insert and removeMax/Min.'],
    ['add and remove items at both the front and the back in Θ(1) (amortized), plus get(i)', 'deque', 'A circular-array deque does both ends in amortized Θ(1) and supports indexing.'],
    ['count how many stored strings start with a given prefix, in time independent of N', 'trie', 'Walk to the prefix node in Θ(prefix length); a trie keeps all completions in one subtree.'],
    ['merge two groups and answer “are a and b in the same group?” nearly in constant time', 'wqu', 'Disjoint sets (WQU, ideally with path compression) is built for connect/isConnected.'],
    ['append to the end and read the i-th item in Θ(1)', 'alist', 'An array list gives Θ(1) get(i) and amortized Θ(1) addLast.'],
    ['find the k largest of a stream of N numbers using only O(k) memory', 'heap', 'Keep a min-heap of size k: Θ(N log k) time, O(k) memory.'],
    ['find all stored keys between lo and hi (a range query) efficiently', 'tree', 'A BST can prune subtrees outside [lo, hi]; hashing scatters nearby keys.'],
  ];
  const NOUNS = ['usernames', 'flight numbers', 'student IDs', 'words of a dictionary', 'sensor readings', 'URLs', 'order numbers', 'song titles', 'license plates', 'zip codes'];
  for (const half of [0, 1]) {
    B11.push({ id: 'B-11-choose-ds-' + half, type: B11T[4], make(r) {
      const pool = DS_REQS.filter((_, i) => i % 2 === half || r.float() < 0.3);
      const [req, k, why] = r.pick(pool);
      const noun = r.pick(NOUNS), N = r.pick(['10⁵', '10⁶', '10⁷']);
      const words = req.includes('string') || req.includes('prefix');
      const m = mcq(r, DS_CHOICES[k], Object.values(DS_CHOICES), null, 5);
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
        prompt: P('You store about ' + N + ' ' + (words ? 'strings (' + noun + ')' : noun) + ' and must support: ' + req + '. Which structure fits best?'),
        hint: 'Match each required operation to the structure that makes it cheap; “order” rules out hashing, “min/max repeatedly” suggests a heap.',
        solution: P(why + ' → <b>' + DS_CHOICES[k] + '</b>.') });
    } });
  }
  G['B-11'] = B11;

  // ===================== B-12 =====================
  const B12 = [];
  const B12T = ['Trie insert/contains/prefix traces', 'keysWithPrefix, longestPrefixOf', 'Trie runtime vs hash map / BST', 'Node representations (array vs map); TST basics'];
  function trieBuild(words) {
    const root = { ch: {}, end: false }; let nodes = 1;
    for (const w of words) { let x = root; for (const c of w) { if (!x.ch[c]) { x.ch[c] = { ch: {}, end: false }; nodes++; } x = x.ch[c]; } x.end = true; }
    return { root, nodes };
  }
  function randWords(r, n, alpha, minL, maxL) {
    const ws = []; while (ws.length < n) { let w; if (ws.length && r.float() < 0.6) { const base = r.pick(ws); const cut = r.int(1, base.length); w = base.slice(0, cut) + range(0, r.int(0, 2)).map(() => r.pick(alpha)).join(''); } else w = range(0, r.int(minL, maxL)).map(() => r.pick(alpha)).join(''); if (w.length >= minL && w.length <= maxL + 1 && !ws.includes(w)) ws.push(w); } return ws;
  }
  B12.push({ id: 'B-12-trie-count-contains', type: B12T[0], make(r) {
    return retry(r, () => {
      const alpha = r.pick([['a', 'b', 'c'], ['s', 'a', 'm', 'e'], ['t', 'o', 'e', 'n']]);
      const words = randWords(r, r.int(6, 8), alpha, 1, 4);
      const T = trieBuild(words);
      const prefixes = new Set(); words.forEach(w => { for (let i = 1; i < w.length; i++) prefixes.add(w.slice(0, i)); });
      const qs = []; const nonKeyPref = Array.from(prefixes).filter(p => !words.includes(p));
      if (!nonKeyPref.length) return null;
      qs.push(r.pick(nonKeyPref)); qs.push(r.pick(words)); qs.push(r.pick(words));
      let tries = 0; while (qs.length < 5 && tries++ < 50) { const q = range(0, r.int(1, 4)).map(() => r.pick(alpha)).join(''); if (!qs.includes(q)) qs.push(q); }
      const uq = Array.from(new Set(qs)); if (uq.length < 4) return null;
      const truth = uq.map(q => words.includes(q));
      if (truth.every(x => x) || truth.every(x => !x)) return null;
      const m = multi(uq.map((q, i) => ({ t: 'contains("' + q + '")', ok: truth[i] })));
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Insert ' + words.map(w => '"' + w + '"').join(', ') + ' into an empty trie. Which calls return true? (Remember: reaching a node is not enough, it must be marked as the end of a key.)'),
        hint: 'contains walks down character by character and returns the marked bit of the last node (false if a link is missing).',
        solution: P('The trie has ' + T.nodes + ' nodes including the root. ' + uq.map((q, i) => '"' + q + '": ' + (truth[i] ? 'true (inserted key)' : (prefixes.has(q) ? 'false (a node exists but is not marked)' : 'false (path falls off the trie)'))).join('; ') + '.'), _chk: { words, qs: uq } });
    });
  } });
  B12.push({ id: 'B-12-trie-node-count', type: B12T[0], make(r) {
    const alpha = r.pick([['a', 'b', 'c', 'd'], ['s', 'a', 'p', 'e'], ['t', 'i', 'n', 'o']]);
    const words = randWords(r, r.int(6, 9), alpha, 1, 4);
    const T = trieBuild(words); const chars = sum(words.map(w => w.length));
    return Q({ kind: 'num', answer: T.nodes,
      prompt: P('Insert ' + words.map(w => '"' + w + '"').join(', ') + ' into an empty trie (one node per character, plus the root). How many nodes does the trie have, counting the root?'),
      hint: 'Each insert creates one node per character that isn’t already on an existing path; shared prefixes are free.',
      solution: P('Total characters: ' + chars + '; shared prefixes save ' + (chars + 1 - T.nodes) + ' nodes. Node count = <b>' + T.nodes + '</b>.'), _chk: { words } });
  } });
  B12.push({ id: 'B-12-keys-with-prefix', type: B12T[1], make(r) {
    return retry(r, () => {
      const alpha = r.pick([['a', 'b', 'c'], ['s', 'a', 'm', 'e'], ['d', 'o', 'g']]);
      const words = randWords(r, r.int(7, 9), alpha, 1, 4);
      const p = r.pick(words).slice(0, r.int(1, 2));
      const res = words.filter(w => w.startsWith(p)).sort();
      if (res.length < 2) return null;
      return Q({ kind: 'text', answer: [res.join(' '), res.join(','), res.join(', ')],
        prompt: P('A trie holds ' + words.map(w => '"' + w + '"').join(', ') + '. What does keysWithPrefix("' + p + '") return, if children are visited in alphabetical order? (keys separated by spaces)'),
        hint: 'Walk to the prefix node, then DFS its subtree in alphabetical order collecting every marked node (the prefix itself counts if it is a key).',
        solution: P('Keys under "' + p + '" in DFS (alphabetical, a key is listed before its extensions): <b>' + res.join(' ') + '</b>.'), _chk: { words, p } });
    });
  } });
  B12.push({ id: 'B-12-longest-prefix', type: B12T[1], make(r) {
    return retry(r, () => {
      const alpha = r.pick([['a', 'b', 'c'], ['s', 'a', 'm', 'e'], ['t', 'o', 'e', 'n']]);
      const words = randWords(r, r.int(6, 8), alpha, 1, 3);
      const q = r.pick(words) + range(0, r.int(1, 3)).map(() => r.pick(alpha)).join('');
      let best = ''; for (let i = 1; i <= q.length; i++) if (words.includes(q.slice(0, i))) best = q.slice(0, i);
      if (!best || best === q) return null;
      return Q({ kind: 'text', answer: [best],
        prompt: P('A trie holds ' + words.map(w => '"' + w + '"').join(', ') + '. What is longestPrefixOf("' + q + '") (the longest key that is a prefix of the query)?'),
        hint: 'Walk down following the query; remember the last MARKED node you pass; stop when a link is missing or the query ends.',
        solution: P('Prefixes of "' + q + '" that are keys: ' + range(1, q.length + 1).map(i => q.slice(0, i)).filter(s => words.includes(s)).join(', ') + '. Longest: <b>' + best + '</b>.'), _chk: { words, q } });
    });
  } });
  for (const VV of [0, 1]) B12.push({ id: 'B-12-runtime' + ['-a', '-b'][VV], type: B12T[2], make(r) {
    const L = r.int(5, 30), N = r.pick(['10⁴', '10⁶', '10⁹']);
    const cases = [
      ['contains on a trie (array children)', 'Θ(L)', 'one step per character, independent of N'],
      ['contains on a balanced BST of strings (count character comparisons, worst case)', 'Θ(L log N)', 'log N string comparisons, each up to L characters'],
      ['keysWithPrefix of a length-L prefix on a trie, when the prefix matches exactly one key of length L', 'Θ(L)', 'walk L characters, then a subtree that is a single path'],
      ['contains on a hash table of strings (average, including computing the hash)', 'Θ(L)', 'computing String.hashCode reads all L characters; the bucket is short on average'],
      ['inserting a key of length L into a trie', 'Θ(L)', 'walk/create one node per character'],
    ];
    const [d, th, why] = r.pick(cases.filter((_, i) => i % 2 === VV || i === 0));
    const m = mcq(r, th, ['Θ(1)', 'Θ(L)', 'Θ(log N)', 'Θ(L log N)', 'Θ(N)', 'Θ(N L)'], null, 5);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('N = ' + N + ' keys, query length L = ' + L + ' characters. Runtime of: ' + d + '?'),
      hint: 'Tries pay per character of the query, not per key stored.', solution: P(why + ' → <b>' + th + '</b>.') });
  } });
  B12.push({ id: 'B-12-array-links', type: B12T[3], make(r) {
    const alpha = r.pick([['a', 'b', 'c'], ['s', 'a', 'm', 'e']]);
    const words = randWords(r, r.int(5, 7), alpha, 1, 4);
    const T = trieBuild(words); const R = r.pick([26, 128, 256]);
    const nonNull = T.nodes - 1;
    return Q({ kind: 'list', answer: [T.nodes * R, nonNull],
      prompt: P('Insert ' + words.map(w => '"' + w + '"').join(', ') + ' into an R-way trie where every node stores an array of R = ' + R + ' child links. Give (1) the total number of link slots (array entries) in all nodes, and (2) how many of them are non-null.'),
      hint: 'Every node (root included) has R slots; every node except the root is pointed to by exactly one non-null slot.',
      solution: P('Nodes = ' + T.nodes + ', so slots = ' + T.nodes + ' × ' + R + ' = ' + T.nodes * R + '; non-null links = nodes − 1 = ' + nonNull + '. Almost all slots are null: a map-based (or TST) node representation saves that memory at the cost of slower child lookup.'), _chk: { words, R } });
  } });
  function tstBuild(words) {
    let root = null, nodes = 0;
    const ins = (x, w, d) => { const c = w[d]; if (!x) { x = { c, l: null, m: null, r: null, end: false }; nodes++; } if (c < x.c) x.l = ins(x.l, w, d); else if (c > x.c) x.r = ins(x.r, w, d); else if (d < w.length - 1) x.m = ins(x.m, w, d + 1); else x.end = true; return x; };
    for (const w of words) root = ins(root, w, 0);
    const visits = q => { let x = root, d = 0, v = 0; while (x) { v++; const c = q[d]; if (c < x.c) x = x.l; else if (c > x.c) x = x.r; else if (d < q.length - 1) { x = x.m; d++; } else return v; } return v; };
    return { root, nodes, visits };
  }
  B12.push({ id: 'B-12-tst', type: B12T[3], make(r) {
    return retry(r, () => {
      const alpha = r.pick([['a', 'c', 'e', 'g'], ['b', 'd', 'f', 'h']]);
      const words = randWords(r, r.int(5, 6), alpha, 2, 3);
      const T = tstBuild(words); const q = r.pick(words);
      const tr = trieBuild(words);
      if (T.visits(q) <= q.length) return null;
      return Q({ kind: 'list', answer: [T.nodes, T.visits(q)],
        prompt: P('Insert ' + words.map(w => '"' + w + '"').join(', ') + ' (in order) into an empty ternary search trie (each node holds one character with left/middle/right links; compare the current character: smaller → left, larger → right, equal → middle and move to the next character). Give (1) the number of TST nodes, and (2) how many nodes contains("' + q + '") visits (count every node it looks at).'),
        hint: 'Left/right links stay on the same character position; only a middle link advances to the next character.',
        solution: P('Building the TST creates ' + T.nodes + ' nodes, one per distinct prefix (the same as the trie’s non-root nodes, ' + (tr.nodes - 1) + ', but each TST node has only 3 links). contains("' + q + '") examines ' + T.visits(q) + ' nodes, including the left/right detours.'), _chk: { words, q } });
    });
  } });
  G['B-12'] = B12;

  // ===================== B-13 =====================
  const B13 = [];
  const B13T = ['Identify the sort from intermediate arrays', 'Stability', 'Best/worst runtimes for selection, insertion, heap, merge', 'Inversions and insertion sort; in-place or not; which sort when'];
  // each returns the list of intermediate states (after each step)
  const SORT_STATES = {
    selection(a0) { const a = a0.slice(), st = []; for (let i = 0; i < a.length - 1; i++) { let m = i; for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j; [a[i], a[m]] = [a[m], a[i]]; st.push(a.slice()); } return st; },
    insertion(a0) { const a = a0.slice(), st = []; for (let i = 1; i < a.length; i++) { for (let j = i; j > 0 && a[j - 1] > a[j]; j--) [a[j], a[j - 1]] = [a[j - 1], a[j]]; st.push(a.slice()); } return st; },
    heapsort(a0) {
      const a = a0.slice(), n = a.length, st = [];
      const sink = (k, N) => { while (2 * k + 1 < N) { let j = 2 * k + 1; if (j + 1 < N && a[j + 1] > a[j]) j++; if (a[k] >= a[j]) break; [a[k], a[j]] = [a[j], a[k]]; k = j; } };
      for (let k = Math.floor(n / 2) - 1; k >= 0; k--) sink(k, n);
      st.push(a.slice());
      for (let N = n; N > 1; N--) { [a[0], a[N - 1]] = [a[N - 1], a[0]]; sink(0, N - 1); st.push(a.slice()); }
      return st;
    },
    mergesort(a0) {
      const a = a0.slice(), st = [];
      const ms = (lo, hi) => { if (hi - lo < 1) return; const mid = Math.floor((lo + hi) / 2); ms(lo, mid); ms(mid + 1, hi); const L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1); let i = 0, j = 0, k = lo; while (i < L.length && j < R.length) a[k++] = L[i] <= R[j] ? L[i++] : R[j++]; while (i < L.length) a[k++] = L[i++]; while (j < R.length) a[k++] = R[j++]; st.push(a.slice()); };
      ms(0, a.length - 1); return st;
    },
  };
  const SORT_LABEL = { selection: 'Selection sort', insertion: 'Insertion sort', heapsort: 'Heapsort (in-place max-heap)', mergesort: 'Mergesort (top-down)' };
  B13.push({ id: 'B-13-identify-sort', type: B13T[0], make(r) {
    return retry(r, () => {
      const n = r.int(7, 9); const a = r.shuffle(range(1, 20)).slice(0, n);
      const algs = Object.keys(SORT_STATES); const X = r.pick(algs);
      const states = SORT_STATES[X](a); const sorted = a.slice().sort((x, y) => x - y);
      const cand = states.filter(s => s.join() !== sorted.join() && s.join() !== a.join());
      if (!cand.length) return null;
      const S = r.pick(cand);
      for (const Y of algs) if (Y !== X && SORT_STATES[Y](a).some(s => s.join() === S.join())) return null;
      const m = mcq(r, SORT_LABEL[X], Object.values(SORT_LABEL), null, 4);
      const tell = { selection: 'the prefix holds the smallest items of the whole array, in final position, while the rest is scrambled', insertion: 'the prefix is sorted but holds only the original first items (the suffix is untouched input)', heapsort: 'the largest items sit sorted at the END, and the front is a max-heap (or the whole array is a max-heap right after heapify)', mergesort: 'sorted runs appear in blocks aligned with the recursive halves, other blocks untouched' }[X];
      return Q({ kind: 'mc', choices: m.choices, answer: m.answer,
        prompt: P('The input ' + fmtArr(a) + ' is being sorted into increasing order. At some point mid-sort the array is ' + fmtArr(S) + '. Which algorithm (exactly as in the 61B notes) produced it?'),
        hint: 'Selection: smallest items final at the front. Insertion: sorted prefix of the ORIGINAL first items. Heapsort: largest items final at the back. Mergesort: sorted blocks.',
        solution: P('Tell-tale sign: ' + tell + '. Simulating all four, only ' + SORT_LABEL[X] + ' ever produces this array. Its states: ' + states.map(fmtArr).join(' → ') + '.'), _chk: { a, S, X } });
    });
  } });
  B13.push({ id: 'B-13-after-pass-k', type: B13T[0], make(r) {
    const n = r.int(7, 9); const a = r.shuffle(range(1, 30)).slice(0, n);
    const X = r.pick(['selection', 'insertion', 'heapsort', 'mergesort']);
    const states = SORT_STATES[X](a); const k = r.int(1, Math.min(states.length - 1, 4));
    const desc = { selection: 'after ' + k + ' pass' + (k > 1 ? 'es' : '') + ' of selection sort (each pass swaps the minimum of the unsorted part into place, even if it is already there)',
      insertion: 'after insertion sort has processed i = 1 … ' + k + ' (i.e. ' + k + ' outer iterations)',
      heapsort: k === 1 ? 'right after bottom-up heapify into a 0-indexed max-heap (heapsort, before any sort-down step)' : 'after heapify plus ' + (k - 1) + ' sort-down step' + (k > 2 ? 's' : '') + ' of heapsort (0-indexed max-heap; swap root with the last heap item, shrink, sink)',
      mergesort: 'after the first ' + k + ' merge' + (k > 1 ? 's' : '') + ' of top-down mergesort (split [lo..hi] at mid = (lo+hi)/2, left half [lo..mid] sorted first; ties take from the left)' }[X];
    return Q({ kind: 'list', answer: states[k - 1],
      prompt: P('Sort ' + fmtArr(a) + ' into increasing order. Give the array ' + desc + '.'),
      hint: 'Simulate exactly; every step of these algorithms is deterministic.',
      solution: P('States: ' + states.slice(0, k).map(fmtArr).join(' → ') + '.'), _chk: { a, X, k } });
  } });
  const SORT_PROPS = {
    'Selection sort': { st: false, ip: true }, 'Insertion sort': { st: true, ip: true }, 'Heapsort': { st: false, ip: true }, 'Mergesort': { st: true, ip: false },
    'Quicksort with Hoare partitioning': { st: false, ip: true }, 'Quicksort with the simple 3-list partition': { st: true, ip: false }, 'Counting sort': { st: true, ip: false }, 'LSD radix sort': { st: true, ip: false },
  };
  B13.push({ id: 'B-13-stable-multi', type: B13T[1], make(r) {
    return retry(r, () => {
      const names = r.sample(Object.keys(SORT_PROPS), 5); const prop = r.pick(['st', 'ip']);
      const items = names.map(nm => ({ t: nm, ok: SORT_PROPS[nm][prop] }));
      const k = items.filter(x => x.ok).length; if (k === 0 || k === 5) return null;
      const m = multi(items);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Which of these sorts (standard 61B versions) are ' + (prop === 'st' ? '<b>stable</b>?' : '<b>in place</b> (Θ(1) extra memory apart from recursion)?')),
        hint: prop === 'st' ? 'Long-distance swaps (selection, heap, Hoare) break stability; merging with ties-from-left, insertion with strict >, and counting/radix keep it.' : 'Mergesort, counting and radix need auxiliary arrays.',
        solution: P(names.map(nm => nm + ': ' + (SORT_PROPS[nm][prop] ? 'yes' : 'no')).join('<br>')), _chk: { names, prop } });
    });
  } });
  B13.push({ id: 'B-13-stability-trace', type: B13T[1], make(r) {
    return retry(r, () => {
      const n = 6; const keys = range(0, n).map(() => r.int(1, 3)); const tags = 'abcdef'.split('');
      const items = keys.map((k, i) => ({ k, t: tags[i] }));
      const X = r.pick(['selection', 'insertion', 'heapsort']);
      const a = items.slice();
      if (X === 'selection') { for (let i = 0; i < n - 1; i++) { let m = i; for (let j = i + 1; j < n; j++) if (a[j].k < a[m].k) m = j; [a[i], a[m]] = [a[m], a[i]]; } }
      else if (X === 'insertion') { for (let i = 1; i < n; i++) for (let j = i; j > 0 && a[j - 1].k > a[j].k; j--) [a[j], a[j - 1]] = [a[j - 1], a[j]]; }
      else { const sink = (k, N) => { while (2 * k + 1 < N) { let j = 2 * k + 1; if (j + 1 < N && a[j + 1].k > a[j].k) j++; if (a[k].k >= a[j].k) break; [a[k], a[j]] = [a[j], a[k]]; k = j; } }; for (let k = Math.floor(n / 2) - 1; k >= 0; k--) sink(k, n); for (let N = n; N > 1; N--) { [a[0], a[N - 1]] = [a[N - 1], a[0]]; sink(0, N - 1); } }
      const out = a.map(x => x.k + x.t);
      const stableOut = items.slice().sort((x, y) => x.k - y.k).map(x => x.k + x.t);
      if (X !== 'insertion' && out.join() === stableOut.join()) return null;
      return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
        prompt: P('Sort these items by number only (letters are just tags showing the original order) using ' + SORT_LABEL[X].replace(' (in-place max-heap)', ' (0-indexed in-place max-heap, sinking with the larger child; a child must be strictly larger to swap)') + ': ' + items.map(x => x.k + x.t).join(' ') + '. Give the final order (e.g. <code>1b 1e 2a …</code>).'),
        hint: 'Simulate exactly, comparing only the numbers. Unstable sorts may reorder equal numbers.',
        solution: P('Final: <b>' + out.join(' ') + '</b>. ' + (out.join() === stableOut.join() ? 'Equal keys kept their input order (' + (X === 'insertion' ? 'insertion sort is stable' : 'by luck here') + ').' : 'Compare with the stable result ' + stableOut.join(' ') + ': equal keys were reordered, so this sort is not stable.')), _chk: { items, X } });
    });
  } });
  for (const VV of [0, 1]) B13.push({ id: 'B-13-best-worst' + ['-ordered', '-other'][VV], type: B13T[2], make(r) {
    const tbl = {
      'Selection sort': { sorted: 'Θ(n²)', reversed: 'Θ(n²)', equal: 'Θ(n²)', random: 'Θ(n²)' },
      'Insertion sort': { sorted: 'Θ(n)', reversed: 'Θ(n²)', equal: 'Θ(n)', random: 'Θ(n²)' },
      'Heapsort': { sorted: 'Θ(n log n)', reversed: 'Θ(n log n)', equal: 'Θ(n)', random: 'Θ(n log n)' },
      'Mergesort': { sorted: 'Θ(n log n)', reversed: 'Θ(n log n)', equal: 'Θ(n log n)', random: 'Θ(n log n)' },
    };
    const alg = r.pick(Object.keys(tbl)), inp = r.pick(VV === 0 ? ['sorted', 'reversed'] : ['equal', 'random']);
    const desc = { sorted: 'already sorted', reversed: 'in reverse order', equal: 'all equal', random: 'a random permutation (expected/typical)' }[inp];
    const th = tbl[alg][inp];
    const m = mcq(r, th, ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(log n)'], null, 4);
    const why = { 'Selection sort': 'always scans the whole unsorted part', 'Insertion sort': 'cost is Θ(n + inversions)', 'Heapsort': 'each sink costs up to log n (all-equal: every sink stops at once)', 'Mergesort': 'always log n levels of Θ(n) merging' }[alg];
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('Runtime of ' + alg + ' (61B version) on n items that are ' + desc + '?'),
      hint: 'Insertion sort depends on inversions; selection never benefits from order; mergesort never changes; heapsort only speeds up when all keys are equal.', solution: P(alg + ' ' + why + ' → <b>' + th + '</b>.') });
  } });
  B13.push({ id: 'B-13-inversions', type: B13T[3], make(r) {
    const n = r.int(6, 8); const a = r.shuffle(range(1, 20)).slice(0, n);
    let inv = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (a[i] > a[j]) inv++;
    let cmp = 0; const b = a.slice(); for (let i = 1; i < n; i++) { let j = i; while (j > 0) { cmp++; if (b[j - 1] > b[j]) { [b[j], b[j - 1]] = [b[j - 1], b[j]]; j--; } else break; } }
    return Q({ kind: 'list', answer: [inv, inv, cmp],
      prompt: P('For ' + fmtArr(a) + ': give (1) the number of inversions, (2) the number of swaps insertion sort makes, and (3) the number of comparisons <code>a[j-1] &gt; a[j]</code> it evaluates, using <code>for (j = i; j &gt; 0 &amp;&amp; a[j-1] &gt; a[j]; j--) swap</code>.'),
      hint: 'Each swap fixes exactly one inversion. Comparisons = swaps + one failing comparison per i, except when the item slides all the way to index 0 (then j > 0 stops the loop first).',
      solution: P('Inversions: count pairs i < j with a[i] > a[j] = ' + inv + '. Swaps = inversions = ' + inv + '. Comparisons: ' + cmp + ' (= ' + inv + ' successful + ' + (cmp - inv) + ' failing).'), _chk: { a } });
  } });
  B13.push({ id: 'B-13-which-sort-when', type: B13T[3], make(r) {
    const cases = [
      ['sort 10 million Student objects by GPA, keeping existing alphabetical order among equal GPAs, with plenty of memory', 'Mergesort', 'needs stability and Θ(n log n) worst case'],
      ['sort an array of 2 million ints in Θ(n log n) worst case using only Θ(1) extra memory', 'Heapsort', 'the only in-place Θ(n log n)-worst-case comparison sort here'],
      ['sort an array where every item is at most 3 positions from its final place', 'Insertion sort', 'at most ~3n inversions → Θ(n)'],
      ['sort an array of 12 items inside a library routine', 'Insertion sort', 'fastest for tiny arrays (low overhead)'],
      ['sort huge arrays fast in practice with random pivots; stability not needed', 'Quicksort', 'fastest in practice, expected Θ(n log n)'],
      ['minimize the number of swaps (writes are extremely expensive)', 'Selection sort', 'does only Θ(n) swaps'],
    ];
    const [d, a, why] = r.pick(cases);
    const m = mcq(r, a, ['Mergesort', 'Heapsort', 'Insertion sort', 'Quicksort', 'Selection sort'], null, 4);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('Best choice: ' + d + '?'), hint: 'Match the constraint (stability, memory, near-sortedness, writes) to the sort that guarantees it.', solution: P(a + ': ' + why + '.') });
  } });
  G['B-13'] = B13;

  // ===================== B-14 =====================
  const B14 = [];
  const B14T = ['Quicksort partition traces (given scheme)', 'Worst-case inputs; quickselect runtimes', 'Comparison-sort lower bound (log n!)', 'Counting sort and LSD/MSD radix traces and runtimes', 'Choose a sort under constraints; sorting T/F'];
  function hoare(a0) {
    const a = a0.slice(), p = a[0]; let L = 1, Gp = a.length - 1; const steps = [];
    for (;;) {
      while (L < a.length && a[L] < p) L++;
      while (a[Gp] > p) Gp--;
      if (L >= Gp) break;
      [a[L], a[Gp]] = [a[Gp], a[L]]; steps.push('swap indices ' + L + ' and ' + Gp + ' → ' + fmtArr(a)); L++; Gp--;
    }
    [a[0], a[Gp]] = [a[Gp], a[0]]; steps.push('crossed: swap pivot with index ' + Gp + ' → ' + fmtArr(a));
    return { a, steps, pos: Gp };
  }
  const threeWay = a => { const p = a[0]; return a.filter(x => x < p).concat(a.filter(x => x === p), a.filter(x => x > p)); };
  B14.push({ id: 'B-14-hoare', type: B14T[0], make(r) {
    return retry(r, () => {
      const n = r.int(7, 9); const a = r.shuffle(range(1, 30)).slice(0, n);
      const h = hoare(a); if (h.steps.length < 3 || h.pos === 0 || h.pos === n - 1) return null;
      return Q({ kind: 'list', answer: h.a,
        prompt: P('Hoare-partition ' + fmtArr(a) + ' with the leftmost item as pivot (61B notes 14.2): L starts at index 1 and moves right while its item is &lt; pivot; G starts at the end and moves left while its item is &gt; pivot; if L &lt; G swap them and step both inward, else stop and swap the pivot with the item at G. Give the array after this one partition.'),
        hint: 'L stops on items ≥ pivot, G on items ≤ pivot. Keep going until they cross; then the pivot goes to G.',
        solution: P(h.steps.join('<br>')) + P('Pivot ' + a[0] + ' ends at index ' + h.pos + '.'), _chk: { a } });
    });
  } });
  B14.push({ id: 'B-14-3way-partition', type: B14T[0], make(r) {
    const n = r.int(8, 10); const a = range(0, n).map(() => r.int(1, 9));
    const p1 = threeWay(a); const p = a[0];
    const L = a.filter(x => x < p), E = a.filter(x => x === p), Gr = a.filter(x => x > p);
    const v = r.int(0, 1);
    if (v === 0) return Q({ kind: 'list', answer: p1,
      prompt: P('Partition ' + fmtArr(a) + ' with the simple 3-way partition from lecture: pivot = leftmost item; scan left to right copying each item into “smaller”, “equal”, or “larger” (keeping arrival order); concatenate. Give the result.'),
      hint: 'Partitioned is not sorted: each group keeps the order the items arrived in.',
      solution: P('Pivot ' + p + ': smaller ' + fmtArr(L) + ', equal ' + fmtArr(E) + ', larger ' + fmtArr(Gr) + ' → <b>' + fmtArr(p1) + '</b>.'), _chk: { a, v } });
    // full quicksort: array after the second level of partitioning (each side partitioned once)
    const lv2 = threeWay(L.length ? L : []).concat(E, Gr.length ? threeWay(Gr) : []);
    return Q({ kind: 'list', answer: lv2,
      prompt: P('Quicksort ' + fmtArr(a) + ' with the simple 3-way partition (pivot = leftmost; smaller | equal | larger, each keeping arrival order). Give the array after the first partition AND one more partition of each of the “smaller” and “larger” parts (two levels of recursion).'),
      hint: 'Level 1 splits around ' + p + '; then each non-empty side is partitioned around ITS leftmost item.',
      solution: P('Level 1: ' + fmtArr(L) + ' | ' + fmtArr(E) + ' | ' + fmtArr(Gr) + '. Level 2: ' + (L.length ? fmtArr(threeWay(L)) : '[]') + ' and ' + (Gr.length ? fmtArr(threeWay(Gr)) : '[]') + ' → <b>' + fmtArr(lv2) + '</b>.'), _chk: { a, v } });
  } });
  B14.push({ id: 'B-14-quickselect', type: B14T[1], make(r) {
    const n = r.int(8, 10); const a = r.shuffle(range(1, 30)).slice(0, n); const k = r.int(0, n - 1);
    let cur = a.slice(), kk = k, parts = 0; const steps = [];
    for (;;) { parts++; const p = cur[0]; const L = cur.filter(x => x < p), E = cur.filter(x => x === p), Gr = cur.filter(x => x > p);
      steps.push('pivot ' + p + ': smaller ' + fmtArr(L) + ', larger ' + fmtArr(Gr) + ', want index ' + kk);
      if (kk < L.length) cur = L; else if (kk < L.length + E.length) { var ans = p; break; } else { kk -= L.length + E.length; cur = Gr; } }
    return Q({ kind: 'list', answer: [ans, parts],
      prompt: P('Quickselect for index ' + k + ' (0-based, i.e. the ' + (k + 1) + '-th smallest) of ' + fmtArr(a) + ', using the simple 3-way partition with the leftmost item as pivot and recursing only into the side containing the wanted index. Give the answer and the number of partition calls made.'),
      hint: 'After a partition, the pivot is at its sorted index; compare with the wanted index and go to one side only.',
      solution: P(steps.join('<br>')) + P('Answer ' + ans + ' after ' + parts + ' partitions. Expected Θ(n) total; worst case Θ(n²) (e.g. sorted input with leftmost pivot).'), _chk: { a, k } });
  } });
  B14.push({ id: 'B-14-worst-input', type: B14T[1], make(r) {
    const n = r.int(6, 8); const base = range(1, n + 1);
    const opts = { sorted: base.slice(), reversed: base.slice().reverse(), random: r.shuffle(base), zig: base.map((_, i) => (i % 2 ? n - Math.floor(i / 2) : 1 + Math.floor(i / 2))) };
    // count comparisons of simple 3-way quicksort (each partition compares n-1 items with the pivot)
    const cost = a => (a.length <= 1 ? 0 : a.length - 1 + cost(a.filter(x => x < a[0])) + cost(a.filter(x => x > a[0])));
    const costs = Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, cost(v)]));
    const maxC = Math.max.apply(null, Object.values(costs));
    const items = Object.entries(opts).map(([k, v]) => ({ t: fmtArr(v), ok: costs[k] === maxC }));
    if (new Set(items.map(x => x.t)).size < 4) return Q({ kind: 'tf', answer: false, prompt: P('Quicksort with a leftmost pivot runs in Θ(n log n) on already-sorted input of size ' + n + '. True or false?'), hint: 'Leftmost pivot on sorted input is the minimum every time.', solution: P('False: each partition peels off one item, Θ(n²).') });
    const m = multi(items);
    return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
      prompt: P('Quicksort with leftmost pivot and the simple 3-way partition. Each partition of a sub-array of size s costs s − 1 pivot comparisons. Which of these inputs make it do the <b>maximum</b> number of comparisons, n(n−1)/2 = ' + n * (n - 1) / 2 + '? (select all)'),
      hint: 'The worst case happens when every pivot is the minimum or maximum of its sub-array.',
      solution: P(Object.entries(opts).map(([k, v]) => fmtArr(v) + ': ' + costs[k] + ' comparisons').join('<br>')), _chk: { opts } });
  } });
  for (const VV of [0, 1]) B14.push({ id: 'B-14-lower-bound' + ['-count', '-tf'][VV], type: B14T[2], make(r) {
    const n = r.int(3, 14); let lf = 0; for (let i = 2; i <= n; i++) lf += Math.log2(i); const lb = Math.ceil(lf - 1e-9);
    const v = VV;
    if (v === 0) return Q({ kind: 'num', answer: lb,
      prompt: P('By the decision-tree argument, what is the minimum possible worst-case number of comparisons for any comparison sort on n = ' + n + ' items? (i.e. ⌈log₂(' + n + '!)⌉)'),
      hint: 'A binary decision tree of height h has ≤ 2^h leaves and needs ≥ n! leaves.',
      solution: P(n + '! = ' + range(1, n + 1).reduce((x, y) => x * y, 1) + '; log₂ of it ≈ ' + lf.toFixed(3) + ', so at least <b>' + lb + '</b> comparisons.'), _chk: { n } });
    const c = lb + r.pick([-2, -1, 0, 1]);
    const ruled = c < lb;
    return Q({ kind: 'tf', answer: ruled,
      prompt: P('Someone claims a comparison sort that sorts any ' + n + ' distinct items using at most ' + c + ' comparisons. True or false: the decision-tree lower bound proves this claim impossible.'),
      hint: 'Compare 2^c with n!.', solution: P('2^' + c + ' = ' + Math.pow(2, c) + ' vs ' + n + '! = ' + range(1, n + 1).reduce((x, y) => x * y, 1) + '. ' + (ruled ? '2^c < n!, so too few leaves: impossible. <b>True</b>.' : '2^c ≥ n!, so the counting argument does not rule it out. <b>False</b> (the bound alone proves nothing here).')), _chk: { n, c } });
  } });
  B14.push({ id: 'B-14-lsd-radix', type: B14T[3], make(r) {
    const n = r.int(6, 8); const xs = r.sample(range(0, 1000), n); const k = r.int(1, 2);
    let cur = xs.slice(); const passes = [];
    for (let p = 0; p < 3; p++) { const d = Math.pow(10, p); const b = range(0, 10).map(() => []); cur.forEach(x => b[Math.floor(x / d) % 10].push(x)); cur = [].concat.apply([], b); passes.push(cur.slice()); }
    const pad = x => String(x).padStart(3, '0');
    return Q({ kind: 'list', answer: passes[k - 1],
      prompt: P('LSD radix sort (base 10, 3 digits, each pass a stable counting sort) on ' + xs.map(pad).join(', ') + '. Give the array after pass ' + k + ' (pass 1 = ones digit). Enter numbers without leading zeros.'),
      hint: 'Stable: items with the same current digit keep the order from the previous pass.',
      solution: P(passes.map((p, i) => 'after pass ' + (i + 1) + ': ' + p.map(pad).join(' ')).join('<br>')), _chk: { xs, k } });
  } });
  B14.push({ id: 'B-14-counting-sort', type: B14T[3], make(r) {
    const R = r.int(3, 5), n = r.int(7, 9); const keys = range(0, n).map(() => r.int(0, R - 1)); const tags = 'abcdefghi'.split('').slice(0, n);
    const counts = range(0, R).map(k => keys.filter(x => x === k).length); const starts = []; let s = 0; for (const c of counts) { starts.push(s); s += c; }
    const out = []; const pos = starts.slice(); keys.forEach((k, i) => { out[pos[k]++] = k + tags[i]; });
    const t = r.int(0, n - 1); const where = out.indexOf(keys[t] + tags[t]);
    return Q({ kind: 'list', answer: starts.concat([where]),
      prompt: P('Counting sort on keys 0…' + (R - 1) + ' (letters are tags): ' + keys.map((k, i) => k + tags[i]).join(' ') + '. Give the starting-position array starts[0…' + (R - 1) + '] (running sums of the counts), followed by the output index (0-based) of item ' + keys[t] + tags[t] + '.'),
      hint: 'starts[k] = number of items with key < k. Then scan the input left to right, placing each item at starts[key]++ (that is why it is stable).',
      solution: P('Counts ' + fmtArr(counts) + ' → starts ' + fmtArr(starts) + '. Output: ' + out.join(' ') + '; ' + keys[t] + tags[t] + ' lands at index ' + where + '. Θ(N + R).'), _chk: { keys, R, t } });
  } });
  const SORT_FACTS = {
    'Selection sort': { stable: false, inplace: true, worst: 'Θ(n²)', best: 'Θ(n²)' }, 'Insertion sort': { stable: true, inplace: true, worst: 'Θ(n²)', best: 'Θ(n)' },
    'Heapsort': { stable: false, inplace: true, worst: 'Θ(n log n)', best: 'Θ(n)' }, 'Mergesort': { stable: true, inplace: false, worst: 'Θ(n log n)', best: 'Θ(n log n)' },
    'Quicksort (Hoare, leftmost pivot)': { stable: false, inplace: true, worst: 'Θ(n²)', best: 'Θ(n log n)' },
  };
  B14.push({ id: 'B-14-sorting-tf', type: B14T[4], make(r) {
    const alg = r.pick(Object.keys(SORT_FACTS)), f = SORT_FACTS[alg];
    const kind = r.pick(['stable', 'inplace', 'worst', 'best']);
    let stmt, truth;
    if (kind === 'stable' || kind === 'inplace') { stmt = alg + ' is ' + (kind === 'stable' ? 'stable' : 'in place (Θ(1) extra memory, ignoring recursion)'); truth = f[kind]; }
    else { const claim = r.bool() ? f[kind] : r.pick(['Θ(n)', 'Θ(n log n)', 'Θ(n²)'].filter(x => x !== f[kind])); stmt = 'the ' + (kind === 'worst' ? 'worst-case' : 'best-case') + ' runtime of ' + alg + ' is ' + claim; truth = claim === f[kind]; }
    return Q({ kind: 'tf', answer: truth, prompt: P('True or false: ' + stmt + '.'),
      hint: 'Recall the summary table: stability, memory, best/worst for each sort (heapsort best case Θ(n) only for all-equal keys).',
      solution: P(alg + ': ' + (f.stable ? 'stable' : 'not stable') + ', ' + (f.inplace ? 'in place' : 'not in place') + ', worst ' + f.worst + ', best ' + f.best + '. → <b>' + (truth ? 'True' : 'False') + '</b>.') });
  } });
  B14.push({ id: 'B-14-choose-sort', type: B14T[4], make(r) {
    const N = r.pick(['10⁶', '10⁷', '5·10⁶']);
    const cases = [
      ['sort ' + N + ' ints known to lie in 0 … 999', 'Counting sort', 'R = 1000 is tiny compared to N: Θ(N + R)'],
      ['sort ' + N + ' fixed-length 9-digit ID numbers', 'LSD radix sort', 'W = 9 passes of counting sort, Θ(W(N + R)), beats N log N comparisons'],
      ['sort ' + N + ' objects by a key using only compareTo, stably, Θ(N log N) worst case', 'Mergesort', 'stable and Θ(N log N) worst case'],
      ['sort ' + N + ' doubles using Θ(1) extra memory with a Θ(N log N) worst-case guarantee', 'Heapsort', 'in place and Θ(N log N) worst case'],
      ['sort ' + N + ' random doubles as fast as possible in practice (no stability needed)', 'Quicksort', 'fastest in practice; random pivots make Θ(N²) vanishingly unlikely'],
    ];
    const [d, a, why] = r.pick(cases);
    const m = mcq(r, a, ['Counting sort', 'LSD radix sort', 'Mergesort', 'Heapsort', 'Quicksort', 'Insertion sort'], null, 5);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('Best choice: ' + d + '?'), hint: 'Small integer keys → counting/radix; stability → merge; memory → heap; raw speed → quick.', solution: P(a + ': ' + why + '.') });
  } });
  G['B-14'] = B14;

  // ===================== B-15 =====================
  const B15 = [];
  const B15T = ['Build a Huffman tree and code from frequencies', 'Decode prefix-free codes', 'Limits of compression', 'Software-engineering facts: complexity, deep vs shallow modules'];
  // Huffman: smaller weight → left/0; returns null if a tie could change code lengths
  function huffman(freqs, syms) {
    let nodes = syms.map((s, i) => ({ w: freqs[i], s, l: null, r: null }));
    const merges = [];
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.w - b.w);
      if (nodes.length > 2 && (nodes[1].w === nodes[2].w)) return null;
      const a = nodes.shift(), b = nodes.shift(); const p = { w: a.w + b.w, l: a, r: b }; merges.push(a.w + ' + ' + b.w + ' → ' + p.w); nodes.push(p);
    }
    const codes = {}; const walk = (x, c) => { if (x.s !== undefined) { codes[x.s] = c || '0'; return; } walk(x.l, c + '0'); walk(x.r, c + '1'); }; walk(nodes[0], '');
    return { codes, merges };
  }
  B15.push({ id: 'B-15-huffman', type: B15T[0], make(r) {
    return retry(r, () => {
      const k = r.int(5, 6); const syms = 'ABCDEF'.split('').slice(0, k); const freqs = syms.map(() => r.int(1, 25));
      const h = huffman(freqs, syms); if (!h) return null;
      const lens = syms.map(s => h.codes[s].length); const total = sum(syms.map((s, i) => freqs[i] * lens[i]));
      if (new Set(lens).size < 3) return null;
      return Q({ kind: 'list', answer: lens.concat([total]),
        prompt: P('Build a Huffman code for frequencies ' + syms.map((s, i) => s + ' ' + freqs[i]).join(', ') + '. Give the code length of ' + syms.join(', ') + ' (in that order), followed by the total number of bits to encode the whole message (' + sum(freqs) + ' symbols).'),
        hint: 'Repeatedly merge the two lightest trees; a symbol’s code length is its depth in the final tree.',
        solution: P('Merges: ' + h.merges.join('; ') + '.') + P('Codes: ' + syms.map(s => s + '=' + h.codes[s]).join(', ') + '. Total = ' + syms.map((s, i) => freqs[i] + '·' + lens[i]).join(' + ') + ' = <b>' + total + '</b> bits (fixed-length would need ' + sum(freqs) * Math.ceil(Math.log2(k)) + ').'), _chk: { freqs, syms } });
    });
  } });
  B15.push({ id: 'B-15-huffman-total', type: B15T[0], make(r) {
    const k = r.int(4, 7); const syms = 'ABCDEFG'.split('').slice(0, k); const freqs = syms.map(() => r.int(1, 30));
    // total cost is tie-independent: sum of merge weights
    let ws = freqs.slice(), cost = 0; const ms = []; while (ws.length > 1) { ws.sort((a, b) => a - b); const s = ws[0] + ws[1]; cost += s; ms.push(ws[0] + ' + ' + ws[1] + ' = ' + s); ws = ws.slice(2).concat([s]); }
    return Q({ kind: 'num', answer: cost,
      prompt: P('Frequencies: ' + syms.map((s, i) => s + ' ' + freqs[i]).join(', ') + '. What is the total number of bits in the Huffman encoding of the message (ignoring the cost of storing the trie)?'),
      hint: 'Total bits = Σ freq × depth = the sum of the weights of all merged (internal) nodes.',
      solution: P('Merges: ' + ms.join('; ') + '. Every merge adds one bit to each symbol beneath it, so total = sum of merged weights = <b>' + cost + '</b>. (Ties may change the tree but never this total.)'), _chk: { freqs } });
  } });
  B15.push({ id: 'B-15-decode', type: B15T[1], make(r) {
    return retry(r, () => {
      const k = r.int(4, 6); const syms = 'ABCDEFGHKLMNOPRST'.split(''); const ss = r.sample(syms, k); const freqs = ss.map(() => r.int(1, 20));
      const h = huffman(freqs, ss); if (!h) return null;
      const msg = range(0, r.int(5, 7)).map(() => r.pick(ss)).join('');
      const bits = msg.split('').map(c => h.codes[c]).join('');
      return Q({ kind: 'text', answer: [msg],
        prompt: P('Prefix-free code: ' + ss.map(s => s + ' = ' + h.codes[s]).join(', ') + '. Decode <code>' + bits + '</code> (type the letters with no spaces).'),
        hint: 'Read bits left to right; because no codeword is a prefix of another, the first codeword you complete is the right one.',
        solution: P('Split: ' + msg.split('').map(c => h.codes[c] + '→' + c).join(' · ') + ' → <b>' + msg + '</b>.'), _chk: { codes: h.codes, bits } });
    });
  } });
  B15.push({ id: 'B-15-prefix-free-check', type: B15T[1], make(r) {
    return retry(r, () => {
      const items = [];
      for (let t = 0; t < 4; t++) {
        const n = r.int(3, 4); const cw = []; while (cw.length < n) { const c = range(0, r.int(1, 3)).map(() => r.pick(['0', '1'])).join(''); if (!cw.includes(c)) cw.push(c); }
        const pf = cw.every(a => cw.every(b => a === b || !b.startsWith(a)));
        items.push({ t: '{' + cw.join(', ') + '}', ok: pf, cw });
      }
      const k = items.filter(x => x.ok).length; if (k === 0 || k === 4) return null;
      if (new Set(items.map(x => x.t)).size < 4) return null;
      const m = multi(items);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer, prompt: P('Which of these sets of codewords are prefix-free?'),
        hint: 'Prefix-free: no codeword is the beginning of another codeword.', solution: P(items.map(x => x.t + ': ' + (x.ok ? 'prefix-free' : 'not prefix-free')).join('<br>')), _chk: { sets: items.map(x => x.cw) } });
    });
  } });
  for (const VV of [0, 1]) B15.push({ id: 'B-15-compression-limits' + ['-count', '-tf'][VV], type: B15T[2], make(r) {
    const n = r.int(6, 20), k = r.int(1, 4);
    const v = VV;
    if (v === 0) {
      const ans = Math.pow(2, n - k + 1) - 1;
      return Q({ kind: 'num', answer: ans,
        prompt: P('A lossless compressor maps n-bit inputs to outputs. With n = ' + n + ', at most how many of the 2^' + n + ' possible inputs can be compressed to outputs of at most ' + (n - k) + ' bits (count outputs of length 0 too)?'),
        hint: 'Different inputs need different outputs. Count the bitstrings of length 0, 1, …, n − k.',
        solution: P('There are 2⁰ + 2¹ + … + 2^' + (n - k) + ' = 2^' + (n - k + 1) + ' − 1 = <b>' + ans + '</b> bitstrings that short, so at most that many inputs (a fraction below 2^−' + (k - 1) + ').'), _chk: { n, k } });
    }
    const m = r.int(1, n - 1);
    const truth = false;
    return Q({ kind: 'tf', answer: truth,
      prompt: P('True or false: there is a lossless compressor that maps every one of the 2^' + n + ' files of exactly ' + n + ' bits to a file of at most ' + (n - 1) + ' bits.'),
      hint: 'Pigeonhole: count the possible outputs.', solution: P('There are only 2^' + n + ' − 1 bitstrings of length &lt; ' + n + ', fewer than the 2^' + n + ' inputs, so two inputs would share an output. <b>False</b>.'), _chk: { n } });
  } });
  const SE_STATEMENTS = [
    ['Change amplification means a simple change requires edits in many different places.', true], ['Cognitive load is how much a developer must know to make a change safely.', true],
    ['Unknown unknowns are the worst symptom: you cannot even tell what code needs to change.', true], ['Dependencies and obscurity are the two root causes of complexity.', true],
    ['A deep module has a simple interface that hides a lot of functionality.', true], ['A hash map (put/get/remove hiding buckets and resizing) is an example of a deep module.', true],
    ['Tactical programming prioritizes getting features working fast, letting complexity accumulate.', true], ['Returning a List rather than an ArrayList from a public method is a form of information hiding.', true],
    ['Information leakage is when one design decision is reflected in several modules.', true],
    ['A shallow module has a tiny interface and a huge implementation.', false], ['In this framework, complexity mostly means code that runs slowly.', false],
    ['Making every field public reduces change amplification.', false], ['Strategic programming means never spending time on design once code works.', false],
    ['Complexity usually comes from a single big mistake rather than many small shortcuts.', false], ['Unknown unknowns are the mildest symptom because a search tool always finds the affected code.', false],
    ['A class whose methods each forward to one line of another class is a good example of a deep module.', false], ['Information hiding means putting every design decision in the public interface so users can see it.', false],
  ];
  B15.push({ id: 'B-15-se-statements', type: B15T[3], make(r) {
    return retry(r, () => {
      const pick = r.sample(SE_STATEMENTS, 5); const k = pick.filter(x => x[1]).length; if (k === 0 || k === 5) return null;
      const m = multi(pick.map(x => ({ t: x[0], ok: x[1] })));
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer, prompt: P('Software engineering (Ousterhout, as in 61B): which statements are true?'),
        hint: 'Complexity = what makes a system hard to understand/change; symptoms: change amplification, cognitive load, unknown unknowns; causes: dependencies, obscurity; deep modules hide a lot behind a simple interface.',
        solution: P(pick.map(x => (x[1] ? 'True: ' : 'False: ') + x[0]).join('<br>')) });
    });
  } });
  B15.push({ id: 'B-15-se-symptom', type: B15T[3], make(r) {
    const thing = r.pick(['tax rate', 'brand color', 'maximum upload size', 'timeout value', 'date format']);
    const n = r.int(12, 60), k = r.int(4, 9);
    const sc = [
      ['The ' + thing + ' is written as a literal in ' + n + ' different files, so changing it requires ' + n + ' edits.', 'Change amplification'],
      ['To add a small feature, a new teammate must first learn how ' + k + ' classes interact and in what order their methods must be called.', 'Cognitive load'],
      ['After changing how the ' + thing + ' is stored, a distant module silently breaks; nothing in the code indicated that it depended on that detail.', 'Unknown unknowns'],
      ['The ' + thing + ' is read through a single method in one class, so updating it is a one-line change.', 'None (good information hiding)'],
    ];
    const [d, a] = r.pick(sc);
    const m = mcq(r, a, ['Change amplification', 'Cognitive load', 'Unknown unknowns', 'None (good information hiding)'], null, 4);
    return Q({ kind: 'mc', choices: m.choices, answer: m.answer, prompt: P('Which complexity symptom does this describe? ' + d),
      hint: 'Many edits → change amplification; much to learn → cognitive load; can’t tell what to change → unknown unknowns.', solution: P('<b>' + a + '</b>.') });
  } });
  G['B-15'] = B15;


  // ===================== extra generators (second generators for computational types) =====================
  // B-1: arrays of references passed to a method
  B1.push({ id: 'B-1-array-of-refs-method', type: B1T[3], make(r) {
    const cls = r.pick(['Dog', 'Cat', 'Box', 'Cup']);
    const objs = []; const mk = w => { objs.push({ w }); return objs.length - 1; };
    const w0 = distinctInts(r, 3, 1, 9);
    let a = w0.map(mk); const b = a.slice(); // b is a separate array holding the same objects
    const i1 = r.int(0, 2), v1 = r.int(10, 30), i2 = r.int(0, 2), v2 = r.int(31, 50), i3 = r.int(0, 2), v3 = r.int(51, 70), early = r.bool();
    const body = early
      ? '  arr[' + i1 + '].w = ' + v1 + ';\n  arr = new ' + cls + '[]{new ' + cls + '(0), new ' + cls + '(0), new ' + cls + '(0)};\n  arr[' + i2 + '].w = ' + v2 + ';'
      : '  arr[' + i1 + '].w = ' + v1 + ';\n  arr[' + i2 + '] = new ' + cls + '(' + v2 + ');\n  arr = new ' + cls + '[3];';
    const helper = 'static void change(' + cls + '[] arr) {\n' + body + '\n}';
    const lines = [cls + '[] a = {new ' + cls + '(' + w0[0] + '), new ' + cls + '(' + w0[1] + '), new ' + cls + '(' + w0[2] + ')};', cls + '[] b = a.clone();'];
    // call change on a or b, then one more statement
    const target = r.pick(['a', 'b']);
    const arrOf = { a, b };
    const T = arrOf[target];
    objs[T[i1]].w = v1; if (!early) T[i2] = mk(v2);
    lines.push('change(' + target + ');');
    const post = r.pick(['b', 'a']); const pv = r.int(1, 9);
    objs[arrOf[post][i3]].w += pv; lines.push(post + '[' + i3 + '].w += ' + pv + ';');
    const vals = a.map(i => objs[i].w).concat(b.map(i => objs[i].w));
    const classSrc = 'class ' + cls + ' {\n  int w;\n  ' + cls + '(int w) { this.w = w; }\n}\n';
    const pl = printLine(['a[0].w', 'a[1].w', 'a[2].w', 'b[0].w', 'b[1].w', 'b[2].w']);
    const bodyM = lines.concat([pl]).join('\n');
    return Q({ kind: 'list', answer: vals,
      prompt: P('What does this print? Enter the 6 numbers in order, comma-separated.') + code(classSrc + '\n' + helper + '\n\n// in main:\n' + bodyM),
      hint: 'clone() of an object array copies the arrows (a shallow copy). The method gets a copy of the arrow to the array: changing arr[i].w or arr[i] affects the caller’s array; reassigning arr does not.',
      solution: P('a and b are different arrays whose slots point to the same three objects. Inside change, writes through <code>arr[…]</code> before <code>arr = new …</code> affect the caller’s array (and, for .w, every array sharing that object); after the reassignment they hit a throwaway array.') +
        P('Final: a → ' + vals.slice(0, 3).join(', ') + '; b → ' + vals.slice(3).join(', ') + '.'),
      _java: { src: javaProg(bodyM, helper, classSrc), expect: { kind: 'out', out: vals.join(' ') } } });
  } });

  // B-2: JUnit with a different bug (get off by one)
  B2.push({ id: 'B-2-junit-get-bug', type: B2T[4], make(r) {
    return retry(r, () => {
      const nf0 = r.int(0, 7); const tests = [];
      for (let t = 0; t < 5; t++) {
        const n = r.int(1, 6); const ops = []; let v = 1;
        for (let i = 0; i < n; i++) ops.push([r.pick(['addFirst', 'addLast']), v++]);
        const good = dequeSim(nf0, ops); const k = r.int(0, n - 1);
        const ask = r.pick(['get', 'get', 'removeFirst', 'size']);
        let line, fails, exp;
        if (ask === 'size') { exp = n; fails = false; line = 'assertThat(d.size()).isEqualTo(' + n + ');'; }
        else if (ask === 'removeFirst') { exp = good.get(0); fails = false; line = 'assertThat(d.removeFirst()).isEqualTo(' + exp + ');'; }
        else { exp = good.get(k); const bug = good.a[(good.nf + k) % good.cap]; fails = bug !== exp; line = 'assertThat(d.get(' + k + ')).isEqualTo(' + exp + ');'; }
        tests.push({ t: '<code>' + esc(ops.map(opStr).map(s => 'd.' + s + ';').join(' ') + ' ' + line) + '</code>', ok: fails, d: { ops, ask, k, exp } });
      }
      const nfail = tests.filter(x => x.ok).length; if (nfail === 0 || nfail === 5) return null;
      if (new Set(tests.map(x => x.t)).size < 5) return null;
      const m = multi(tests);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('A student’s ArrayDeque follows this convention: ' + DEQUE_CONV + ' Every method is correct except get:') + code('public T get(int i) {\n  return items[(nextFirst + i) % items.length];\n}') +
          P('Each deque starts empty with nextFirst = ' + nf0 + '. Which of these JUnit tests <b>fail</b>? (removeFirst and size are implemented correctly.)'),
        hint: 'The buggy get reads one slot to the LEFT of the right one. Only tests that call get can fail; such a test fails unless that slot happens to hold the same value.',
        solution: P('get(i) should read (nextFirst + 1 + i) mod cap. The buggy version reads index nextFirst + i, i.e. the previous logical item (or the empty slot at nextFirst when i = 0). A good test suite must call get, not just size/removeFirst.') +
          P(tests.map(x => (x.ok ? 'FAILS: ' : 'passes: ') + x.t).join('<br>')),
        _chk: { nf0, tests: tests.map(x => x.d) } });
    });
  } });

  // B-3: which statements throw ClassCastException
  B3.push({ id: 'B-3-which-throw-cce', type: B3T[2], make(r) {
    return retry(r, () => {
      const ctx = castCtx(r); const items = [];
      for (let i = 0; i < 40 && items.length < 5; i++) {
        const g = genCastStmt(r, i % 2 ? 'cce' : 'out', ctx);
        if (items.some(x => x.g.stmt === g.stmt)) continue;
        items.push({ g, ok: g.res.k === 'cce' });
      }
      if (items.length < 4) return null;
      const n = items.filter(x => x.ok).length; if (n === 0 || n === items.length) return null;
      const base = items[0].g;
      const m = multi(items.map(x => ({ t: '<code>' + esc(x.g.stmt.replace('\n', ' ')) + '</code>', ok: x.ok })));
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Each option compiles. Added to main on its own after the setup lines, which options throw a <b>ClassCastException</b> at runtime?') + code(base.clsSrc + '\n\n// in main:\n' + base.setupSrc),
        hint: 'A cast succeeds at runtime iff the object’s DYNAMIC type is the cast type or a subclass of it.',
        solution: P('Dynamic types: o → ' + base.Dy.o + ', a → ' + base.Dy.a + ', b → ' + base.Dy.b + '.') +
          P(items.map(x => '<code>' + esc(x.g.stmt.replace('\n', ' ')) + '</code>: ' + (x.ok ? 'ClassCastException' : 'runs, prints ' + x.g.res.out)).join('<br>')),
        _java: items.map(x => ({ src: javaProg(base.setupSrc + '\n' + x.g.stmt, '', base.clsSrc + '\n'), expect: x.g.res.k === 'out' ? { kind: 'out', out: x.g.res.out } : { kind: x.g.res.k } })) });
    });
  } });

  // B-3: constructor chaining + an overridden method called from a superclass constructor
  B3.push({ id: 'B-3-constructor-super-dispatch', type: B3T[3], make(r) {
    return retry(r, () => {
      const h = mkHier(r); const chain = [h.A, h.B, h.C];
      const fld = {}; chain.forEach(c => { fld[c] = r.int(1, 9); });
      const callsShow = { [h.A]: r.bool() || true, [h.B]: r.bool(), [h.C]: false };
      const overrides = { [h.A]: true, [h.B]: r.bool(), [h.C]: r.bool() };
      const superShow = { [h.B]: overrides[h.B] && r.bool(), [h.C]: overrides[h.C] && r.bool() };
      const dyn = r.pick([h.B, h.C]);
      const fname = c => c.toLowerCase()[0] + 'v';
      const src = chain.map((c, i) => {
        const L = [];
        L.push('  int ' + fname(c) + ' = ' + fld[c] + ';');
        L.push('  ' + c + '() {' + (i ? ' super();' : '') + ' System.out.print("' + c + ' "); ' + (callsShow[c] ? 'show(); ' : '') + '}');
        if (overrides[c]) L.push('  void show() { ' + (i && superShow[c] ? 'super.show(); ' : '') + 'System.out.print("' + c[0] + '.show:" + ' + fname(c) + ' + " "); }');
        return (i ? 'class ' + c + ' extends ' + chain[i - 1] : 'class ' + c) + ' {\n' + L.join('\n') + '\n}';
      }).join('\n');
      // simulate object construction of dyn
      const dchain = chain.slice(0, chain.indexOf(dyn) + 1);
      const init = new Set(); const out = [];
      const showFrom = (start) => { // run show() implementation found from class `start` upward
        for (let k = chain.indexOf(start); k >= 0; k--) { const c = chain[k]; if (overrides[c]) { if (k > 0 && superShow[c]) showFrom(chain[k - 1]); out.push(c[0] + '.show:' + (init.has(c) ? fld[c] : 0)); return; } }
      };
      for (const c of dchain) { init.add(c); out.push(c); if (callsShow[c]) showFrom(dyn); }
      if (!out.some(t => t.endsWith(':0'))) return null;
      const body = h.A + ' x = new ' + dyn + '();\nSystem.out.println();';
      return Q({ kind: 'text', answer: [out.join(' ')],
        prompt: P('What does <code>new ' + dyn + '()</code> print? (tokens separated by spaces)') + code(src + '\n\n// in main:\n' + body),
        hint: 'Constructors run top-down (super() first). A subclass’s field initializers run only AFTER super() returns, and show() always dispatches on the object’s dynamic type.',
        solution: P('Building a ' + dyn + ': the ' + h.A + ' part is constructed first. Field initializers of a class run right after its super() call returns, so when a superclass constructor calls the overridden show(), the subclass’s fields still hold their default value 0. super.show() inside show runs the parent’s version (no dynamic dispatch).') +
          P('Output: <b>' + out.join(' ') + '</b>.'),
        _java: { src: javaProg(body, '', src + '\n'), expect: { kind: 'out', out: out.join(' ') } } });
    });
  } });

  // B-4: a custom Iterable bag iterated with enhanced for
  B4.push({ id: 'B-4-iterable-bag', type: B4T[1], make(r) {
    return retry(r, () => {
      const cap = 8; const adds = range(0, r.int(5, 7)).map(() => r.int(1, 20)); const rem = r.sample(range(0, adds.length), r.int(1, 2));
      const rev = r.bool(), step = r.pick([1, 1, 2]);
      const items = Array(cap).fill(null); adds.forEach((v, i) => { items[i] = v; }); rem.forEach(i => { items[i] = null; });
      const order = []; if (rev) { for (let i = adds.length - 1; i >= 0; i -= step) order.push(i); } else { for (let i = 0; i < adds.length; i += step) order.push(i); }
      const out = order.map(i => items[i]).filter(x => x !== null);
      const stop = r.int(15, 30);
      const cls = 'class Bag implements Iterable<Integer> {\n  private Integer[] items = new Integer[' + cap + '];\n  private int size = 0;\n  void add(int x) { items[size++] = x; }\n  void clear(int i) { items[i] = null; }\n' +
        '  public Iterator<Integer> iterator() {\n    return new Iterator<Integer>() {\n      int i = ' + (rev ? 'size - 1' : '0') + ';\n' +
        '      private void skip() { while (' + (rev ? 'i >= 0' : 'i < size') + ' && items[i] == null) i ' + (rev ? '-' : '+') + '= ' + step + '; }\n' +
        '      public boolean hasNext() { skip(); return ' + (rev ? 'i >= 0' : 'i < size') + '; }\n' +
        '      public Integer next() { skip(); Integer v = items[i]; i ' + (rev ? '-' : '+') + '= ' + step + '; return v; }\n    };\n  }\n}';
      const body = 'Bag g = new Bag();\n' + adds.map(v => 'g.add(' + v + ');').join(' ') + '\n' + rem.map(i => 'g.clear(' + i + ');').join(' ') + '\nint total = 0;\nString s = "";\nfor (int x : g) {\n  if (x > ' + stop + ') break;\n  s += x + " ";\n  total += x;\n}\nSystem.out.println(s + total);';
      // Note: skip() must move by `step` too; recompute exactly as the Java code does
      const sim = []; { let i = rev ? adds.length - 1 : 0; const inR = () => (rev ? i >= 0 : i < adds.length); const skip = () => { while (inR() && items[i] === null) i += rev ? -step : step; };
        for (;;) { skip(); if (!inR()) break; skip(); const v = items[i]; i += rev ? -step : step; sim.push(v); } }
      const pr = []; let tt = 0; for (const x of sim) { if (x > stop) break; pr.push(x); tt += x; }
      if (pr.length < 2) return null;
      const ans = pr.concat([tt]);
      return Q({ kind: 'list', answer: ans,
        prompt: P('What does this print? (all printed numbers in order, comma-separated)') + code(cls + '\n\n// in main:\n' + body),
        hint: 'for (int x : g) calls g.iterator() once, then hasNext()/next() repeatedly; break leaves the loop immediately. Null slots are skipped.',
        solution: P('The iterator walks indices ' + (rev ? 'from size − 1 down' : 'from 0 up') + ' in steps of ' + step + ', skipping cleared (null) slots. It yields ' + sim.join(', ') + '; the loop stops at the first value &gt; ' + stop + '. Printed: <b>' + ans.join(' ') + '</b>.'),
        _java: { src: ITER_IMPORT + javaProg(body, '', cls + '\n'), expect: { kind: 'out', out: pr.join(' ') + ' ' + tt } } });
    });
  } });

  // B-6: which pairs are connected
  B6.push({ id: 'B-6-isconnected-multi', type: B6T[3], make(r) {
    return retry(r, () => {
      const N = r.int(8, 10), ops = dsRandOps(r, N, r.int(4, 6));
      const par = range(0, N); const root = x => { while (par[x] !== x) x = par[x]; return x; };
      for (const [p, q] of ops) { const a = root(p), b = root(q); if (a !== b) par[a] = b; }
      const pairs = []; const seen = new Set();
      while (pairs.length < 5) { const [p, q] = r.sample(range(0, N), 2); const k = Math.min(p, q) + '-' + Math.max(p, q); if (seen.has(k)) continue; seen.add(k); pairs.push([p, q]); }
      const items = pairs.map(([p, q]) => ({ t: 'isConnected(' + p + ', ' + q + ')', ok: root(p) === root(q), p, q }));
      const n = items.filter(x => x.ok).length; if (n === 0 || n === 5) return null;
      const m = multi(items);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Items 0…' + (N - 1) + '. After connect(' + ops.map(o => o.join(', ')).join('), connect(') + '), which calls return true?'),
        hint: 'Connectivity is transitive: build the groups (or the union-find trees) and compare roots.',
        solution: P('Groups: ' + Array.from(new Set(range(0, N).map(root))).map(rt => '{' + range(0, N).filter(x => root(x) === rt).join(', ') + '}').join(' ') + '.') + P(items.map(x => x.t + ': ' + x.ok).join('<br>')),
        _chk: { N, ops, pairs } });
    });
  } });

  // B-8: max-heap validity, and k smallest with a max-heap
  B8.push({ id: 'B-8-check-max-heap', type: B8T[1], make(r) {
    return retry(r, () => {
      const items = [];
      for (let t = 0; t < 5; t++) {
        const n = r.int(6, 9); const H = minHeap(); r.shuffle(range(1, 30)).slice(0, n).forEach(x => H.add(-x)); let a = H.a.slice(1).map(x => -x);
        if (r.float() < 0.55) { const i = r.int(1, n - 1), j = r.int(0, n - 1); if (i !== j) [a[i], a[j]] = [a[j], a[i]]; }
        const ok = a.every((x, k) => k === 0 || a[Math.floor((k + 1) / 2) - 1] >= x);
        items.push({ t: '<code>' + fmtArr(a) + '</code>', ok, a });
      }
      const nOk = items.filter(x => x.ok).length; if (nOk === 0 || nOk === 5) return null;
      if (new Set(items.map(x => x.t)).size < 5) return null;
      const m = multi(items);
      return Q({ kind: 'multi', choices: m.choices, answer: m.answer,
        prompt: P('Each array lists a complete binary tree in level order (first entry = root). Which are valid <b>max-heaps</b>?'),
        hint: 'Every parent must be ≥ both children: entry k (1-based) vs entries 2k and 2k+1.',
        solution: P(items.map(x => x.t + ': ' + (x.ok ? 'valid' : 'invalid')).join('<br>')), _chk: { arrs: items.map(x => x.a), max: true } });
    });
  } });
  B8.push({ id: 'B-8-ksmallest-maxheap', type: B8T[2], make(r) {
    const k = r.int(3, 4), stream = r.shuffle(range(1, 50)).slice(0, r.int(8, 10));
    const H = minHeap(); const steps = []; // store negatives to get a max-heap
    for (const x of stream) { H.add(-x); let msg = 'add ' + x; if (H.size() > k) msg += ', removeMax → ' + -H.removeMin(); steps.push(msg + ' → ' + fmtArr(H.a.slice(1).map(v => -v))); }
    const arr = H.a.slice(1).map(v => -v);
    return Q({ kind: 'list', answer: arr.concat([arr[0]]),
      prompt: P('To track the ' + k + ' <b>smallest</b> items of a stream, keep a <b>max-heap</b> (root at index 1, swim/sink as usual but with larger items on top): add each item, and if the heap has more than ' + k + ' items, removeMax. Stream: ' + stream.join(', ') + '. Give the final heap array (index 1 on), followed by the root value (the ' + k + '-th smallest).'),
      hint: 'Mirror image of top-k with a min-heap: the max-heap root is the largest of the k smallest so far.',
      solution: P(steps.join('<br>')) + P('Root ' + arr[0] + ' = the ' + k + '-th smallest.'), _chk: { k, stream } });
  } });

  // B-11: mutating a Pt key with a field-based hashCode
  B11.push({ id: 'B-11-mutable-pt-key', type: B11T[3], make(r) {
    const x0 = r.int(1, 6), y0 = r.int(1, 6);
    const h = (x, y) => 31 * x + y;
    const mut = r.pick(['x', 'y', 'same']);
    let x = x0, y = y0, mline;
    if (mut === 'x') { x = x0 + r.int(1, 3); mline = 'p.x = ' + x + ';'; } else if (mut === 'y') { y = y0 + r.int(1, 3); mline = 'p.y = ' + y + ';'; } else { mline = 'p.x = ' + x0 + ';'; }
    const stored = h(x0, y0);
    const containsP = h(x, y) === stored; // same object, so == succeeds if hash matches
    const containsOrig = h(x0, y0) === stored && x === x0 && y === y0;
    const readd = r.bool(); let size = 1; if (readd && !containsP) size = 2;
    const out = [String(containsP), String(containsOrig), String(size)];
    const cls = 'class Pt {\n  int x, y;\n  Pt(int x, int y) { this.x = x; this.y = y; }\n  @Override public boolean equals(Object o) {\n    if (!(o instanceof Pt)) return false;\n    Pt q = (Pt) o;\n    return x == q.x && y == q.y;\n  }\n  @Override public int hashCode() { return 31 * x + y; }\n}';
    const body = 'Set<Pt> s = new HashSet<>();\nPt p = new Pt(' + x0 + ', ' + y0 + ');\ns.add(p);\n' + mline + '\nboolean c1 = s.contains(p);\nboolean c2 = s.contains(new Pt(' + x0 + ', ' + y0 + '));\n' + (readd ? 's.add(p);\n' : '') + 'System.out.println(c1 + " " + c2 + " " + s.size());';
    return Q({ kind: 'text', answer: [out.join(' '), out.join(','), out.join(', ')],
      prompt: P('What does this print? (three values separated by spaces)') + code(cls + '\n\n// in main:\n' + body),
      hint: 'p was filed under hashCode ' + '31·x + y computed at insertion time. Lookups only search the bucket (and stored hash) of the probe’s CURRENT hash.',
      solution: P('Stored under hash ' + stored + '. After <code>' + esc(mline) + '</code>, p hashes to ' + h(x, y) + '. c1: ' + (containsP ? 'same hash and same object → true.' : 'different hash → the set looks in the wrong place → false.') +
        ' c2: new Pt(' + x0 + ', ' + y0 + ') has the old hash ' + stored + ', but the stored object now equals (' + x + ', ' + y + ') → ' + containsOrig + '.' + (readd ? ' s.add(p) ' + (containsP ? 'finds it (size 1).' : 'cannot find it, so p is stored twice (size 2).') : '') + ' Output <b>' + out.join(' ') + '</b>.'),
      _java: { src: ITER_IMPORT + javaProg(body, '', cls + '\n'), expect: { kind: 'out', out: out.join(' ') } } });
  } });
})();
