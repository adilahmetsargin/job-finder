import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import { HfInference } from '@huggingface/inference';
import { extractPdfText } from './extractPdfText.js';
import { tailorResumeFallback } from './tailorFallback.js';
import { normalizeTailoredResume } from './normalizeResume.js';
import { enhanceTailoredResume } from './enhanceResume.js';
import { renderResumePdf } from './renderResumePdf.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const port = Number(process.env.PORT || 8787);
const hf = process.env.HF_TOKEN ? new HfInference(process.env.HF_TOKEN) : null;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.HF_TOKEN),
    model: getHfModel(),
    provider: getHfProvider()
  });
});

app.post('/api/tailor', upload.single('resume'), async (req, res) => {
  try {
    const jobDescription = String(req.body.jobDescription || '').trim();

    if (!req.file) {
      return res.status(400).json({ error: 'Resume PDF is required.' });
    }

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const resumeText = sanitizeText(await extractPdfText(req.file.buffer));

    if (!resumeText || resumeText.length < 80) {
      return res.status(422).json({
        error: 'Could not read enough text from the PDF. Try an ATS-friendly text PDF.'
      });
    }

    const aiResult = await tailorWithHuggingFace(resumeText, jobDescription);
    const fallback = tailorResumeFallback(resumeText, jobDescription);
    const tailored = enhanceTailoredResume(
      normalizeTailoredResume(aiResult?.resume || fallback, fallback),
      fallback,
      jobDescription
    );

    res.json({
      source: aiResult?.source || 'fallback',
      warning: aiResult?.warning || null,
      extractedResumeText: resumeText,
      tailored
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Resume tailoring failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/export-pdf', async (req, res) => {
  try {
    const resume = normalizeTailoredResume(req.body?.resume, {});
    const doc = new PDFDocument({ size: 'LETTER', margin: 44 });
    const filename = `${slugify(resume.name || 'tailored-resume')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    renderResumePdf(doc, resume);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'PDF export failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

async function tailorWithHuggingFace(resumeText, jobDescription) {
  if (!hf) {
    return {
      source: 'fallback',
      warning: 'HF_TOKEN is not set. Used the local fallback tailor.'
    };
  }

  const model = getHfModel();
  const provider = getHfProvider();
  const prompt = buildPrompt(resumeText, jobDescription);

  try {
    const result = await hf.chatCompletion({
      model,
      ...(provider ? { provider } : {}),
      messages: [
        {
          role: 'system',
          content: 'You are an ATS resume optimization assistant. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1800,
      temperature: 0.25
    });

    const raw = result.choices?.[0]?.message?.content || '';
    return {
      source: `huggingface:${provider || 'auto'}:${model}`,
      resume: parseJsonFromModel(raw)
    };
  } catch (error) {
    return {
      source: 'fallback',
      warning: `Hugging Face failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function getHfModel() {
  return process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
}

function getHfProvider() {
  return process.env.HF_PROVIDER || 'novita';
}

function buildPrompt(resumeText, jobDescription) {
  return `
You are an ATS resume optimization assistant.

Rules:
- Do not invent employers, dates, degrees, certifications, or seniority.
- First infer the target role/title from the job description. It may be Full Stack Developer, Software Engineer, React Developer, JavaScript Developer, Web Developer, Frontend Developer, Backend Developer, or another related title.
- The headline, summary, role framing, skills order, and experience bullets must all consistently support that inferred target role. Do not change only the headline.
- Aggressively rewrite the candidate's existing bullets toward the job description.
- Add job technologies into bullets when they are plausibly connected to the existing work, such as API integrations, dashboards, frontend architecture, authentication, performance, cloud deployment, or cross-functional engineering delivery.
- If the job is Full Stack and the resume is Frontend-heavy, convert the headline and relevant frontend bullets toward Full Stack by emphasizing React/Next.js + Node.js/REST API integration, data layer collaboration, cloud readiness, and end-to-end feature ownership.
- For any non-frontend target role, do not leave the summary or role framing as "Senior Frontend Engineer" or "Frontend Developer" when the same experience can truthfully be framed toward the target role. Preserve the original work, but change the presentation layer.
- Replace phrases like "frontend initiatives", "frontend delivery", and "frontend architecture" with target-role-aligned language such as "software engineering initiatives", "React application architecture", "JavaScript feature delivery", "web application delivery", "full-stack web initiatives", or "end-to-end feature delivery" depending on the job title.
- Do not merely copy original bullets. Every experience item should contain job-aligned keywords and stronger impact language.
- Preserve original metrics and scope, but attach them to the target stack where truthful. Example: "React.js applications serving 1M+ users" may become "React.js/Next.js front ends integrated with REST/Node.js API patterns serving 1M+ users" if the resume mentions APIs or Node.js elsewhere.
- Keep the result truthful, concise, and interview-ready.
- Return only valid JSON. No markdown.

JSON shape:
{
  "name": "Candidate name or empty string",
  "headline": "Targeted role headline",
  "contact": "Contact line if present",
  "summary": "3-4 sentence ATS-friendly summary",
  "skills": ["skill"],
  "experience": [
    {
      "role": "Role title",
      "company": "Company",
      "dates": "Dates",
      "bullets": ["impact bullet"]
    }
  ],
  "projects": [
    {
      "name": "Project",
      "description": "One sentence",
      "bullets": ["bullet"]
    }
  ],
  "education": ["education line"],
  "atsNotes": ["keyword or tailoring note"]
}

Resume:
${resumeText.slice(0, 12000)}

Job description:
${jobDescription.slice(0, 8000)}
`;
}

function parseJsonFromModel(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return JSON.');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'tailored-resume';
}

if (!process.env.NETLIFY && process.argv[1]?.endsWith('/server/index.js')) {
  app.listen(port, () => {
    console.log(`Resume Tailor API running at http://127.0.0.1:${port}`);
  });
}

export default app;
