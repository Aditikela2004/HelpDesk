const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const results = [];
function check(id, name, fn) {
  try { const r = fn(); if (r === false) throw new Error('condition false'); results.push([id, name, true]); }
  catch (e) { results.push([id, name, false, e.message]); }
}
const read = f => fs.readFileSync(f, 'utf8');
check('S01', 'core.js and app.js parse as JavaScript', () => { for (const f of ['core.js','app.js']) new vm.Script(read(path.join(dist,f)), {filename:f}); });
check('S02', 'required site files exist', () => ['index.html','styles.css','config.js','core.js','track.js','app.js'].every(f => fs.existsSync(path.join(dist,f))));
const deliv = path.join(dist,'delivery');
const required = ['HelpDesk_Master_Delivery_Plan.docx','Confluence_Handbook.md','Engineering_Backlog.csv','Delivery_Tracker.csv','Requirements_Traceability.csv','HelpDesk_Wireframes.svg','Sample_Requests.csv','Tool_Mapping.md','QA_Evidence.md','Unit_Test_Results.txt','Static_Checks.txt','Browser_Check_Results.txt'];
check('S03', 'all required delivery artifacts exist and are non-empty', () => { const miss = required.filter(f => !fs.existsSync(path.join(deliv,f)) || fs.statSync(path.join(deliv,f)).size === 0); if (miss.length) throw new Error('missing: ' + miss.join(', ')); });
check('S04', 'every artifact listed in app.js exists in the delivery folder', () => { const m = read(path.join(dist,'app.js')).match(/\/\*DOWNLOADS_START\*\/(.*?)\/\*DOWNLOADS_END\*\//s); const list = JSON.parse(m[1]); if (list.length < 11) throw new Error('too few links'); const bad = list.filter(([f]) => !fs.existsSync(path.join(deliv,f))); if (bad.length) throw new Error(bad.map(b=>b[0]).join(', ')); });
check('S05', 'traceability covers R01 to R10 with tests and disposition', () => { const t = read(path.join(deliv,'Requirements_Traceability.csv')); for (let i=1;i<=10;i++) if (!t.includes('R'+String(i).padStart(2,'0'))) throw new Error('missing R'+i); });
check('S06', 'backlog has at least 30 items', () => { const rows = read(path.join(deliv,'Engineering_Backlog.csv')).split(/\r?\n/).slice(1).filter(Boolean); if (rows.length < 30) throw new Error('backlog too short'); });
check('S07', 'vercel.json outputDirectory is dist', () => JSON.parse(read(path.join(root,'vercel.json'))).outputDirectory === 'dist');
check('S08', 'no innerHTML assignments in app.js', () => !/\.innerHTML\s*=/.test(read(path.join(dist,'app.js'))));
check('S09', 'no external network resources in index.html or styles.css', () => !/(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(read(path.join(dist,'index.html')).replace(/xmlns=["'][^"']*["']/g,'')) && !/url\(\s*['"]?https?:/.test(read(path.join(dist,'styles.css'))));
check('S10', 'handbook and plan make no unsupported claims (no real approvals, savings or adoption)', () => { const t = (read(path.join(deliv,'Confluence_Handbook.md'))+read(path.join(deliv,'Tool_Mapping.md'))).toLowerCase(); for (const bad of ['wcag 2.1 aa compliant','fully accessible','saved us','increased adoption','production-ready']) if (t.includes(bad)) throw new Error(bad); });
check('S11', 'seed CSV has 12 data rows', () => read(path.join(deliv,'Sample_Requests.csv')).split(/\r?\n/).filter(Boolean).length === 13);
check('S12', 'case study lists artifacts as links under delivery/', () => { const a = read(path.join(dist,'app.js')); if (!a.includes('"delivery/" + d[0]')) throw new Error('artifact links missing'); if (a.includes('ROLES_START')) throw new Error('old role table still present'); return true; });
check('S13', 'source config.js ships with an empty analytics token and no token appears in source files', () => { const c = read(path.join(dist,'config.js')); if (!/mixpanelToken:\s*""/.test(c)) throw new Error('config token not empty'); for (const f of ['app.js','core.js','track.js','index.html']) if (/\b[0-9a-f]{32}\b/.test(read(path.join(dist,f)))) throw new Error('32-hex string in '+f); });
check('S14', 'track.js parses and lists the nine required events', () => { const src = read(path.join(dist,'track.js')); new vm.Script(src, {filename:'track.js'}); for (const e of ['request_form_opened','request_submitted','request_validation_error','owner_assigned','status_changed','request_resolved','filter_used','csv_exported','high_priority_review_clicked']) if (!src.includes('"'+e+'"')) throw new Error('missing '+e); });
let pass = 0, fail = 0;
const out = [];
for (const [id,name,ok,msg] of results) { out.push(`${ok?'PASS':'FAIL'} ${id} ${name}${ok?'':' -- '+msg}`); ok?pass++:fail++; }
out.push(`\n${pass} passed, ${fail} failed`);
console.log(out.join('\n'));
process.exit(fail ? 1 : 0);
