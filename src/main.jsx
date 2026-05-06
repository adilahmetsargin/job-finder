import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Brain,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8787' : '');

const emptyResume = {
  name: '',
  headline: '',
  contact: '',
  summary: '',
  skills: [],
  experience: [],
  projects: [],
  education: [],
  atsNotes: []
};

function App() {
  const [activeView, setActiveView] = useState('tailor');
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState(null);
  const [source, setSource] = useState('');
  const [warning, setWarning] = useState('');
  const [isTailoring, setIsTailoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const canTailor = Boolean(file && jobDescription.trim() && !isTailoring);
  const matchScore = useMemo(() => calculateScore(resume, jobDescription), [resume, jobDescription]);

  async function handleTailor(event) {
    event.preventDefault();
    setError('');
    setWarning('');
    setIsTailoring(true);

    try {
      const data = new FormData();
      data.append('resume', file);
      data.append('jobDescription', jobDescription);

      const response = await fetch(`${API_URL}/api/tailor`, {
        method: 'POST',
        body: data
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Resume update failed.');
      }

      setResume(payload.tailored || emptyResume);
      setSource(payload.source || 'fallback');
      setWarning(payload.warning || '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsTailoring(false);
    }
  }

  async function handleExport() {
    if (!resume) return;
    setError('');
    setIsExporting(true);

    try {
      const response = await fetch(`${API_URL}/api/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'PDF export failed.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slugify(resume.name || 'tailored-resume')}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <div className="topbar">
          <div>
            <p className="eyebrow">Resume Tailor MVP</p>
            <h1>ATS-focused resume tailoring</h1>
          </div>
          <div className="statusPill">
            <Brain size={16} />
            {source ? sourceLabel(source) : 'HF ready'}
          </div>
        </div>

        <div className="navTabs">
          <button className={activeView === 'tailor' ? 'tabButton active' : 'tabButton'} type="button" onClick={() => setActiveView('tailor')}>
            <FileText size={16} />
            Resume Tailor
          </button>
          <button className={activeView === 'jobs' ? 'tabButton active' : 'tabButton'} type="button" onClick={() => setActiveView('jobs')}>
            <Briefcase size={16} />
            Job Feed
          </button>
        </div>

        {activeView === 'tailor' && (
          <form className="inputPanel" onSubmit={handleTailor}>
            <label className="uploadBox">
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <span className="uploadIcon"><Upload size={22} /></span>
              <span className="uploadTitle">{file ? file.name : 'Upload resume PDF'}</span>
              <span className="uploadMeta">Text-based PDFs work best</span>
            </label>

            <label className="field">
              <span>Job description</span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Job description, requirements, nice-to-have technologies..."
                rows={9}
              />
            </label>

            <button className="primaryButton" type="submit" disabled={!canTailor}>
              {isTailoring ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              Tailor resume
            </button>
          </form>
        )}

        {activeView === 'jobs' && (
          <JobFeed
            onUseJob={(description) => {
              setJobDescription(description);
              setActiveView('tailor');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {error && <Notice tone="error" icon={<AlertCircle size={18} />} text={error} />}
        {warning && <Notice tone="warn" icon={<AlertCircle size={18} />} text={warning} />}

        {activeView === 'tailor' && resume && (
          <section className="resultPanel">
            <div className="resultHeader">
              <div>
                <p className="eyebrow">Manual edit mode</p>
                <h2>Final edits before PDF export</h2>
              </div>
              <div className="score">
                <span>{matchScore}%</span>
                <small>keyword match</small>
              </div>
            </div>

            <ResumeEditor resume={resume} onChange={setResume} />

            <div className="actionBar">
              <button className="secondaryButton" type="button" onClick={() => setResume(null)}>
                Reset
              </button>
              <button className="primaryButton" type="button" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
                Download PDF
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function JobFeed({ onUseJob }) {
  const [query, setQuery] = useState('frontend react developer');
  const [page, setPage] = useState(1);
  const [jobsData, setJobsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchJobs(nextPage = 1) {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        query,
        page: String(nextPage),
        pageSize: '12',
        hours: '24'
      });
      const response = await fetch(`${API_URL}/api/jobs?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Job search failed.');
      setJobsData(payload);
      setPage(nextPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="jobPanel">
      <div className="jobHeader">
        <div>
          <p className="eyebrow">Last 24 hours</p>
          <h2>US and remote tech job feed</h2>
        </div>
        <span className="statusPill">
          <Search size={16} />
          {jobsData ? `${jobsData.total} matches` : 'Ready'}
        </span>
      </div>

      <div className="jobControls">
        <label className="field">
          <span>Search keywords</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="frontend react developer" />
        </label>
        <button className="primaryButton" type="button" onClick={() => fetchJobs(1)} disabled={isLoading}>
          {isLoading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
          Search jobs
        </button>
      </div>

      {error && <Notice tone="error" icon={<AlertCircle size={18} />} text={error} />}

      {jobsData?.sources?.errors?.length > 0 && (
        <Notice
          tone="warn"
          icon={<AlertCircle size={18} />}
          text={`Some sources failed: ${jobsData.sources.errors.map((item) => item.source).join(', ')}`}
        />
      )}

      {jobsData && (
        <>
          <div className="sourceRow">
            {(jobsData.sources.active || []).map((source) => <span className="badge" key={source}>{source}</span>)}
          </div>

          <div className="jobGrid">
            {jobsData.jobs.map((job) => (
              <article className="jobCard" key={job.id}>
                <div className="jobCardTop">
                  <span className="badge">{job.source}</span>
                  <span className="jobDate">{formatDate(job.postedAt)}</span>
                </div>
                <h3>{job.title}</h3>
                <p className="company">{job.company}</p>
                <p className="jobMeta">{job.remote ? 'Remote' : 'On-site / Hybrid'} · {job.location}</p>
                <p className="jobDescription">{job.description || 'Open the job post for full details.'}</p>
                <div className="tagRow">
                  {(job.tags || []).slice(0, 5).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                </div>
                <div className="jobActions">
                  <button className="secondaryButton" type="button" onClick={() => onUseJob(buildJobDescription(job))}>
                    Use for resume
                  </button>
                  <a className="linkButton" href={job.url} target="_blank" rel="noreferrer">
                    Open <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="pagination">
            <button className="secondaryButton" type="button" onClick={() => fetchJobs(page - 1)} disabled={isLoading || page <= 1}>
              <ChevronLeft size={16} />
              Previous
            </button>
            <span>Page {jobsData.page} of {jobsData.totalPages}</span>
            <button className="secondaryButton" type="button" onClick={() => fetchJobs(page + 1)} disabled={isLoading || page >= jobsData.totalPages}>
              Next
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="externalPanel">
            <h3>Search more sources</h3>
            <div className="externalGrid">
              {(jobsData.sources.externalSearches || []).map((source) => (
                <a href={source.url} target="_blank" rel="noreferrer" key={source.source}>
                  {source.source}
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ResumeEditor({ resume, onChange }) {
  const update = (key, value) => onChange({ ...resume, [key]: value });

  return (
    <div className="editorGrid">
      <div className="card">
        <h3><FileText size={17} /> Header</h3>
        <TextInput label="Full name" value={resume.name} onChange={(value) => update('name', value)} />
        <TextInput label="Headline" value={resume.headline} onChange={(value) => update('headline', value)} />
        <TextInput label="Contact" value={resume.contact} onChange={(value) => update('contact', value)} />
        <TextArea label="Summary" value={resume.summary} onChange={(value) => update('summary', value)} rows={5} />
      </div>

      <ListEditor
        title="Skills"
        items={resume.skills}
        placeholder="Node.js"
        onChange={(items) => update('skills', items)}
      />

      <ExperienceEditor
        items={resume.experience}
        onChange={(items) => update('experience', items)}
      />

      <ProjectEditor
        items={resume.projects}
        onChange={(items) => update('projects', items)}
      />

      <ListEditor
        title="Education"
        items={resume.education}
        placeholder="University, degree, dates"
        onChange={(items) => update('education', items)}
      />

      <ListEditor
        title="ATS Notes"
        items={resume.atsNotes}
        placeholder="Emphasized React keyword"
        onChange={(items) => update('atsNotes', items)}
      />
    </div>
  );
}

function ExperienceEditor({ items, onChange }) {
  const updateItem = (index, next) => onChange(items.map((item, i) => (i === index ? next : item)));
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="card wide">
      <SectionTitle title="Experience" onAdd={() => onChange([...items, { role: '', company: '', dates: '', bullets: [''] }])} />
      {items.map((item, index) => (
        <div className="nested" key={index}>
          <button className="iconButton danger" type="button" onClick={() => removeItem(index)} aria-label="Remove experience">
            <Trash2 size={16} />
          </button>
          <TextInput label="Role" value={item.role} onChange={(value) => updateItem(index, { ...item, role: value })} />
          <TextInput label="Company" value={item.company} onChange={(value) => updateItem(index, { ...item, company: value })} />
          <TextInput label="Dates" value={item.dates} onChange={(value) => updateItem(index, { ...item, dates: value })} />
          <ListEditor
            title="Bullets"
            compact
            items={item.bullets || []}
            placeholder="Impact-focused bullet"
            onChange={(bullets) => updateItem(index, { ...item, bullets })}
          />
        </div>
      ))}
    </div>
  );
}

function ProjectEditor({ items, onChange }) {
  const updateItem = (index, next) => onChange(items.map((item, i) => (i === index ? next : item)));
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="card wide">
      <SectionTitle title="Projects" onAdd={() => onChange([...items, { name: '', description: '', bullets: [''] }])} />
      {items.map((item, index) => (
        <div className="nested" key={index}>
          <button className="iconButton danger" type="button" onClick={() => removeItem(index)} aria-label="Remove project">
            <Trash2 size={16} />
          </button>
          <TextInput label="Project" value={item.name} onChange={(value) => updateItem(index, { ...item, name: value })} />
          <TextArea label="Description" value={item.description} onChange={(value) => updateItem(index, { ...item, description: value })} rows={3} />
          <ListEditor
            title="Bullets"
            compact
            items={item.bullets || []}
            placeholder="Project impact"
            onChange={(bullets) => updateItem(index, { ...item, bullets })}
          />
        </div>
      ))}
    </div>
  );
}

function ListEditor({ title, items = [], placeholder, onChange, compact = false }) {
  const updateItem = (index, value) => onChange(items.map((item, i) => (i === index ? value : item)));
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className={compact ? 'subList' : 'card'}>
      <SectionTitle title={title} onAdd={() => onChange([...items, ''])} compact={compact} />
      <div className="listStack">
        {items.map((item, index) => (
          <div className="rowInput" key={index}>
            <input value={item} placeholder={placeholder} onChange={(event) => updateItem(index, event.target.value)} />
            <button className="iconButton danger" type="button" onClick={() => removeItem(index)} aria-label={`Remove ${title}`}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title, onAdd, compact = false }) {
  return (
    <div className={compact ? 'subTitle' : 'sectionTitle'}>
      <h3>{title}</h3>
      <button className="iconButton" type="button" onClick={onAdd} aria-label={`Add ${title}`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="field small">
      <span>{label}</span>
      <input value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, rows }) {
  return (
    <label className="field small">
      <span>{label}</span>
      <textarea value={value || ''} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Notice({ tone, icon, text }) {
  return (
    <div className={`notice ${tone}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function buildJobDescription(job) {
  return [
    `${job.title} - ${job.company}`,
    `Source: ${job.source}`,
    `Location: ${job.location}`,
    `Remote: ${job.remote ? 'Yes' : 'No / unclear'}`,
    '',
    job.description,
    '',
    `Apply URL: ${job.url}`
  ].filter(Boolean).join('\n');
}

function formatDate(value) {
  if (!value) return 'Date unknown';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(value));
}

function calculateScore(resume, jobDescription) {
  if (!resume || !jobDescription.trim()) return 0;
  const important = ATS_KEYWORDS
    .filter((keyword) => containsKeyword(jobDescription, keyword))
    .map((keyword) => keyword.toLowerCase());
  if (!important.length) return 0;
  const resumeText = JSON.stringify(resume).toLowerCase();
  const hits = important.filter((word) => containsKeyword(resumeText, word)).length;
  return Math.min(100, Math.round((hits / important.length) * 100));
}

function containsKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(text);
}

function sourceLabel(source) {
  if (source.startsWith('huggingface')) return 'Hugging Face';
  return 'Fallback';
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tailored-resume';
}

const ATS_KEYWORDS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'NestJS',
  'HTML5', 'CSS3', 'Tailwind', 'REST', 'PostgreSQL', 'MongoDB', 'DynamoDB',
  'AWS', 'Cognito', 'Lambda', 'API Gateway', 'S3', 'CloudFront', 'RDS',
  'OAuth2', 'OIDC', 'LLM', 'AI', 'Anthropic', 'Claude', 'OpenAI', 'RAG',
  'LangChain', 'LlamaIndex', 'MCP', 'OWASP', 'NIST 800-171', 'CMMC',
  'FedRAMP', 'WCAG', 'Git', 'GitHub', 'GitLab', 'CI/CD', 'DevOps',
  'DevSecOps', 'Playwright', 'Cypress', 'Figma', 'Python', 'Full Stack',
  'Frontend', 'Backend', 'API', 'Microservices', 'Agile', 'Redux'
];

createRoot(document.getElementById('root')).render(<App />);
