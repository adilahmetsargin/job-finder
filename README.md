# Job Finder + Resume Tailor

A mobile-first job search and resume tailoring MVP for turning a real resume into a targeted, ATS-aware application package.

The app helps you find fresh software roles, paste or select a job description, tailor a PDF resume around the role, review the ATS fit, export a polished PDF, and generate outreach drafts for the application.

![React](https://img.shields.io/badge/React-19-149eca?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-7-646cff?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge)
![Hugging Face](https://img.shields.io/badge/Hugging%20Face-ready-ffcc4d?style=for-the-badge)

## What It Does

- Upload a text-based resume PDF.
- Paste a job description or pull one from the job feed.
- Tailor the resume using Hugging Face when configured, with a local fallback when AI is unavailable.
- Preserve fixed contact details across generated PDFs.
- Edit all generated resume sections before export.
- Export a clean ATS-friendly PDF.
- Search recent US and remote developer jobs from multiple sources.
- Review ATS alignment without chasing an unnatural 100% score.
- Generate editable cover letter, LinkedIn message, and email templates.

## Product Screens

### Resume Tailor

The resume flow parses the uploaded PDF, infers the target role from the job description, and reframes the resume around truthful, role-aligned experience.

Key principles:

- No invented employers, dates, degrees, or seniority.
- Target role consistency across headline, summary, skills, and bullets.
- Natural 80-90% ATS fit target instead of robotic keyword stuffing.
- Manual editing before PDF export.

### Job Feed

The job feed aggregates fresh software roles with pagination and filters.

Supported sources:

- Remotive
- Arbeitnow
- RemoteJobs.org
- Greenhouse boards
- Lever boards
- Ashby boards
- Adzuna, when API keys are configured
- USAJOBS, when API keys are configured

External search shortcuts are also included for LinkedIn, Indeed, Glassdoor, ZipRecruiter, Dice, Wellfound, Built In, Y Combinator, Greenhouse, Lever, and Ashby.

### ATS Score Panel

The ATS panel is intentionally calibrated for human-readable resumes.

- `80-89`: Interview-ready
- `90-94`: Strong, review tone
- `95+`: Over-optimized warning

The goal is not a perfect score. The goal is enough alignment to pass screening while still sounding like a real engineer.

### Outreach Kit

After a resume is generated, the app creates editable:

- Cover letter
- LinkedIn message
- Email template

Each draft uses the tailored resume, job context, strongest bullet, and relevant skills.

## Tech Stack

- Frontend: React 19, Vite, CSS
- Backend: Node.js, Express
- PDF parsing: `pdfjs-dist`
- PDF export: `pdfkit`
- AI provider: Hugging Face Inference API
- Deployment: Netlify frontend, Render backend

## Project Structure

```text
.
|-- src/
|   |-- main.jsx
|   `-- styles.css
|-- server/
|   |-- index.js
|   |-- extractPdfText.js
|   |-- enhanceResume.js
|   |-- jobProviders.js
|   |-- normalizeResume.js
|   |-- renderResumePdf.js
|   `-- tailorFallback.js
|-- DEPLOY.md
|-- netlify.toml
|-- render.yaml
`-- package.json
```

## Local Development

Install dependencies:

```bash
npm install
```

Create a local `.env` file for the backend:

```env
HF_TOKEN=your_hugging_face_token
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_PROVIDER=novita

ADZUNA_APP_ID=optional_adzuna_app_id
ADZUNA_APP_KEY=optional_adzuna_app_key
USAJOBS_API_KEY=optional_usajobs_api_key
USAJOBS_USER_AGENT=your_email@example.com
```

Run the app:

```bash
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:8787
```

Health check:

```text
http://127.0.0.1:8787/api/health
```

## Environment Variables

### Frontend

Only this value belongs in Netlify:

```env
VITE_API_URL=https://your-render-api.onrender.com
```

### Backend

These values belong in Render:

```env
NODE_ENV=production
HF_TOKEN=your_hugging_face_token
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_PROVIDER=novita
```

Optional job provider variables:

```env
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
USAJOBS_API_KEY=your_usajobs_api_key
USAJOBS_USER_AGENT=your_email@example.com
GREENHOUSE_BOARDS=figma,openai,anthropic,stripe,reddit
LEVER_COMPANIES=netlify,webflow,postman,brex,datadog
ASHBY_BOARDS=anthropic,cursor,linear,perplexity,ramp
```

Do not put backend secrets in Netlify frontend variables.

## Deployment

Recommended setup:

- Netlify for the Vite frontend
- Render Web Service for the Express API

See [DEPLOY.md](./DEPLOY.md) for the exact deployment steps.

## Scripts

```bash
npm run dev       # Start frontend and backend locally
npm run build     # Build the frontend
npm start         # Start the Express backend
```

## Roadmap

- Structured resume JSON parser and editor
- Truth guard for unsupported keywords
- Saved jobs and application tracker
- Resume version history
- Supabase auth and database
- OpenAI provider option
- Stripe billing for SaaS packaging

## Notes

This project is designed to optimize real experience, not fabricate it. The best output should feel tailored, specific, and human: enough signal for ATS, enough restraint for a recruiter.
