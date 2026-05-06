let pdfjsModule;

export async function extractPdfText(buffer) {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(buffer);
  const document = await pdfjs.getDocument({
    data,
    disableWorker: true,
    useSystemFonts: true
  }).promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(groupTextItemsByLine(content.items));
  }

  return normalizePdfArtifacts(pages.join('\n\n'));
}

async function loadPdfJs() {
  if (!pdfjsModule) {
    pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }

  return pdfjsModule;
}

function groupTextItemsByLine(items) {
  const lines = new Map();

  for (const item of items) {
    const text = String(item.str || '').trim();
    if (!text) continue;
    const x = Math.round(item.transform?.[4] || 0);
    const y = Math.round(item.transform?.[5] || 0);
    const key = String(y);
    const line = lines.get(key) || [];
    line.push({ x, text });
    lines.set(key, line);
  }

  return [...lines.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([, line]) => line.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '))
    .join('\n');
}

function normalizePdfArtifacts(text) {
  return text
    .replace(/\bSo F ware\b/g, 'Software')
    .replace(/\bOpera L ons\b/g, 'Operations')
    .replace(/\bef M iciency\b/g, 'efficiency')
    .replace(/\btraf F ic\b/g, 'traffic')
    .replace(/\bwork M lows\b/g, 'workflows')
    .replace(/\bhigh-traf F ic\b/g, 'high-traffic')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.');
}
