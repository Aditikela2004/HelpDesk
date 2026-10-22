const fs = require('fs'), path = require('path');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle, Footer, PageNumber, LevelFormat, PageBreak, TableOfContents } = d;
const root = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(root, 'dist/delivery/Confluence_Handbook.md'), 'utf8').split(/\r?\n/);
const CW = 9360; // 6.5in content width
const border = { style: BorderStyle.SINGLE, size: 4, color: 'B8C1C8' };
const borders = { top: border, bottom: border, left: border, right: border };
function runs(text, opts = {}) {
  const parts = []; const re = /`([^`]+)`/g; let last = 0, m;
  while ((m = re.exec(text))) { if (m.index > last) parts.push(new TextRun({ text: text.slice(last, m.index), ...opts })); parts.push(new TextRun({ text: m[1], font: 'Consolas', ...opts })); last = re.lastIndex; }
  if (last < text.length) parts.push(new TextRun({ text: text.slice(last), ...opts }));
  return parts.length ? parts : [new TextRun({ text: '', ...opts })];
}
function table(rows) {
  const n = rows[0].length;
  const lens = rows[0].map((h, c) => { const avg = rows.slice(1).reduce((a, r) => a + (r[c] || '').length, 0) / Math.max(1, rows.length - 1); return Math.max(h.length + 2, Math.min(70, avg)); });
  const tot = lens.reduce((a, b) => a + b, 0);
  const mins = rows[0].map(h => Math.min(1500, h.length * 100 + 200));
  const rest = CW - mins.reduce((x, y) => x + y, 0);
  let widths = lens.map((l, c) => mins[c] + Math.round(rest * l / tot));
  widths[widths.indexOf(Math.max(...widths))] += CW - widths.reduce((x, y) => x + y, 0);
  const size = n >= 7 ? 15 : n >= 5 ? 17 : 19;
  const mk = (r, head) => new TableRow({ tableHeader: head, cantSplit: true, children: r.map((t, c) => new TableCell({
    borders, width: { size: widths[c], type: WidthType.DXA },
    shading: head ? { fill: '14272E', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: runs(t, { size, bold: head, color: head ? 'FFFFFF' : '19272E' }) })] })) });
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows: rows.map((r, i) => mk(r, i === 0)) });
}
const kids = [];
// cover
kids.push(new Paragraph({ spacing: { before: 2400 }, children: [new TextRun({ text: 'ServiceFlow', size: 64, bold: true, color: '14272E' })] }));
kids.push(new Paragraph({ children: [new TextRun({ text: 'Master Delivery Plan', size: 36, color: '305BD8' })] }));
kids.push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: 'Employee service request portal for the fictional company Northstar Studio', size: 24 })] }));
kids.push(new Paragraph({ spacing: { before: 480 }, children: [new TextRun({ text: 'AI-assisted independent portfolio project. Prepared by the portfolio owner. Date: 21 October 2026.', size: 22 })] }));
kids.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: 'All people, departments, data and approvals are simulated. No real approval, interview, survey, adoption, saving or production validation is claimed. Do not use the prototype for real or confidential data.', size: 22, italics: true })] }));
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Contents')] }));
md.filter(l => l.startsWith('## ')).forEach(l => kids.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: l.slice(3), size: 22 })] })));
kids.push(new Paragraph({ children: [new PageBreak()] }));
let i = 0, para = [];
const flush = () => { if (para.length) { kids.push(new Paragraph({ spacing: { after: 120 }, children: runs(para.join(' ')) })); para = []; } };
while (i < md.length) {
  const l = md[i];
  if (l.startsWith('# ')) { i++; continue; }
  if (l.startsWith('## ')) { flush(); const t = l.slice(3); kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !/^1\./.test(t), children: [new TextRun(t)] })); i++; continue; }
  if (l.startsWith('### ')) { flush(); kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun(l.slice(4))] })); i++; continue; }
  if (l.startsWith('|')) {
    flush(); const rows = [];
    while (i < md.length && md[i].startsWith('|')) { if (!/^\|[-| ]+\|$/.test(md[i])) rows.push(md[i].slice(1, -1).split('|').map(s => s.trim())); i++; }
    kids.push(table(rows)); kids.push(new Paragraph({ spacing: { after: 120 }, children: [] })); continue;
  }
  if (l.startsWith('- ')) { flush(); kids.push(new Paragraph({ numbering: { reference: 'b', level: 0 }, children: runs(l.slice(2).replace('[ ] ', '☐ ')) })); i++; continue; }
  if (l.trim() === '') { flush(); i++; continue; }
  para.push(l.trim()); i++;
}
flush();
const doc = new Document({
  creator: 'ServiceFlow portfolio project', title: 'ServiceFlow Master Delivery Plan',
  features: { updateFields: true },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: '19272E' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: 'Calibri', color: '14272E' }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, font: 'Calibri', color: '305BD8' }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } } ] },
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ServiceFlow Master Delivery Plan | Simulated roles, synthetic data | Page ', size: 16, color: '5A6770' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '5A6770' })] })] }) },
    children: kids }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(path.join(root, 'dist/delivery/ServiceFlow_Master_Delivery_Plan.docx'), b); console.log('docx written', b.length); });
