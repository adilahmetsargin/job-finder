export function renderResumePdf(doc, resume) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text(resume.name || 'Tailored Resume');
  if (resume.headline) {
    doc.moveDown(0.2).font('Helvetica').fontSize(12).fillColor('#2563eb').text(resume.headline);
  }
  if (resume.contact) {
    doc.moveDown(0.2).fontSize(9).fillColor('#4b5563').text(resume.contact);
  }

  rule(doc, pageWidth);
  section(doc, 'Professional Summary');
  paragraph(doc, resume.summary);

  if (resume.skills?.length) {
    section(doc, 'Core Skills');
    paragraph(doc, resume.skills.join(' • '));
  }

  if (resume.experience?.length) {
    section(doc, 'Experience');
    for (const item of resume.experience) {
      ensureSpace(doc, 90);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(item.role || 'Experience', { continued: Boolean(item.company) });
      if (item.company) doc.font('Helvetica').text(`, ${item.company}`);
      if (item.dates) doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(item.dates);
      bullets(doc, item.bullets);
      doc.moveDown(0.4);
    }
  }

  if (resume.projects?.length) {
    section(doc, 'Projects');
    for (const project of resume.projects) {
      ensureSpace(doc, 70);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(project.name || 'Project');
      if (project.description) paragraph(doc, project.description);
      bullets(doc, project.bullets);
      doc.moveDown(0.3);
    }
  }

  if (resume.education?.length) {
    section(doc, 'Education');
    bullets(doc, resume.education, false);
  }
}

function section(doc, title) {
  ensureSpace(doc, 52);
  doc.moveDown(0.9).font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(title.toUpperCase());
  doc.moveDown(0.25);
}

function paragraph(doc, text) {
  if (!text) return;
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text(text, { lineGap: 2 });
}

function bullets(doc, items = [], bullet = true) {
  for (const item of items.filter(Boolean)) {
    ensureSpace(doc, 34);
    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(`${bullet ? '• ' : ''}${item}`, {
      indent: bullet ? 12 : 0,
      hangingIndent: bullet ? 8 : 0,
      lineGap: 2
    });
  }
}

function rule(doc, width) {
  doc.moveDown(0.6)
    .strokeColor('#d1d5db')
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + width, doc.y)
    .stroke();
}

function ensureSpace(doc, minHeight) {
  if (doc.y + minHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}
