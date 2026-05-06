import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Brain,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Target,
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
  const atsReport = useMemo(() => analyzeAtsFit(resume, jobDescription), [resume, jobDescription]);

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
                <span>{atsReport.score}%</span>
                <small>keyword match</small>
              </div>
            </div>

            <AtsPanel report={atsReport} />

            <OutreachKit resume={resume} jobDescription={jobDescription} />

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
  const [hours, setHours] = useState('24');
  const [workplace, setWorkplace] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
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
        hours,
        workplace,
        source: sourceFilter
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
          <p className="eyebrow">Fresh listings</p>
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
        <label className="field compactField">
          <span>Posted</span>
          <select value={hours} onChange={(event) => setHours(event.target.value)}>
            <option value="24">Last 24h</option>
            <option value="72">Last 3 days</option>
            <option value="168">Last 7 days</option>
          </select>
        </label>
        <label className="field compactField">
          <span>Workplace</span>
          <select value={workplace} onChange={(event) => setWorkplace(event.target.value)}>
            <option value="all">US + remote</option>
            <option value="remote">Remote only</option>
            <option value="onsite">US on-site/hybrid</option>
          </select>
        </label>
        <label className="field compactField">
          <span>Source</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All sources</option>
            {JOB_SOURCES.map((source) => <option value={source} key={source}>{source}</option>)}
          </select>
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

function AtsPanel({ report }) {
  return (
    <section className="atsPanel">
      <div className="atsHeader">
        <div>
          <p className="eyebrow">ATS score panel</p>
          <h3><Target size={17} /> Resume fit analysis</h3>
        </div>
        <span className={`fitPill ${report.gradeTone}`}>{report.grade}</span>
      </div>

      <div className="atsMetrics">
        <MetricCard label="Keyword coverage" value={`${report.score}%`} detail={`${report.matched.length}/${report.totalKeywords} matched`} />
        <MetricCard label="Title alignment" value={report.titleAligned ? 'Strong' : 'Review'} detail={report.titleAligned ? 'Headline matches the role' : 'Tune headline for the job title'} />
        <MetricCard label="Experience signals" value={`${report.experienceHits}`} detail="Relevant bullets found" />
      </div>

      <div className="atsColumns">
        <KeywordBlock title="Matched keywords" tone="good" items={report.matched} emptyText="No direct keyword matches yet." />
        <KeywordBlock title="Missing keywords" tone="warn" items={report.missing} emptyText="No major keyword gaps found." />
      </div>

      {report.actions.length > 0 && (
        <div className="atsActions">
          <h3><CheckCircle2 size={17} /> Suggested fixes</h3>
          <ul>
            {report.actions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

function OutreachKit({ resume, jobDescription }) {
  const generated = useMemo(() => buildOutreachDrafts(resume, jobDescription), [resume, jobDescription]);
  const [drafts, setDrafts] = useState(generated);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setDrafts(generated);
    setCopied('');
  }, [generated]);

  function updateDraft(key, value) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  async function copyDraft(key) {
    await navigator.clipboard.writeText(drafts[key]);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1600);
  }

  return (
    <section className="outreachPanel">
      <div className="atsHeader">
        <div>
          <p className="eyebrow">Outreach kit</p>
          <h3><MessageSquare size={17} /> Application messages</h3>
        </div>
        <span className="fitPill neutral">Editable</span>
      </div>

      <div className="outreachGrid">
        <OutreachDraft
          icon={<FileText size={16} />}
          title="Cover letter"
          value={drafts.coverLetter}
          copied={copied === 'coverLetter'}
          onChange={(value) => updateDraft('coverLetter', value)}
          onCopy={() => copyDraft('coverLetter')}
        />
        <OutreachDraft
          icon={<MessageSquare size={16} />}
          title="LinkedIn message"
          value={drafts.linkedinMessage}
          copied={copied === 'linkedinMessage'}
          onChange={(value) => updateDraft('linkedinMessage', value)}
          onCopy={() => copyDraft('linkedinMessage')}
        />
        <OutreachDraft
          icon={<Mail size={16} />}
          title="Email template"
          value={drafts.emailTemplate}
          copied={copied === 'emailTemplate'}
          onChange={(value) => updateDraft('emailTemplate', value)}
          onCopy={() => copyDraft('emailTemplate')}
          wide
        />
      </div>
    </section>
  );
}

function OutreachDraft({ icon, title, value, copied, onChange, onCopy, wide = false }) {
  return (
    <div className={wide ? 'outreachDraft wide' : 'outreachDraft'}>
      <div className="outreachTitle">
        <h3>{icon}{title}</h3>
        <button className="secondaryButton compactButton" type="button" onClick={onCopy}>
          <Copy size={15} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea value={value} rows={wide ? 8 : 7} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function KeywordBlock({ title, tone, items, emptyText }) {
  const visible = items.slice(0, 18);

  return (
    <div className="keywordBlock">
      <h3>{title}</h3>
      {visible.length > 0 ? (
        <div className="tagRow">
          {visible.map((keyword) => <span className={`tag ${tone}`} key={keyword}>{keyword}</span>)}
        </div>
      ) : (
        <p className="emptyText">{emptyText}</p>
      )}
    </div>
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

function buildOutreachDrafts(resume, jobDescription) {
  const job = parseJobContext(jobDescription);
  const name = cleanKeyword(resume?.name) || 'Adil Ahmet Sargin';
  const headline = cleanKeyword(resume?.headline) || 'Software Engineer';
  const summary = cleanSentence(resume?.summary) || `I am a ${headline} focused on building reliable, user-centered web applications.`;
  const topSkills = uniqueKeywords([...(resume?.skills || []), ...extractJobKeywords(jobDescription)]).slice(0, 6);
  const strongestBullet = findStrongestBullet(resume) || 'I have shipped production web applications with measurable product and performance impact.';
  const company = job.company || 'your team';
  const role = job.title || 'this role';
  const skillLine = topSkills.length ? topSkills.join(', ') : 'React, TypeScript, and scalable web application delivery';

  const coverLetter = [
    `Dear Hiring Team,`,
    '',
    `I am excited to apply for the ${role} position${job.company ? ` at ${company}` : ''}. ${summary}`,
    '',
    `What stood out to me about this opportunity is the focus on ${skillLine}. My background maps well to that need: ${strongestBullet}`,
    '',
    `I would welcome the chance to discuss how I can help ${company} ship high-quality software, improve user experience, and contribute quickly across the product lifecycle.`,
    '',
    `Best,`,
    name
  ].join('\n');

  const linkedinMessage = [
    `Hi, I saw the ${role} opening${job.company ? ` at ${company}` : ''} and wanted to reach out directly.`,
    `My background is in ${headline}, with hands-on experience across ${skillLine}. ${strongestBullet}`,
    `I would love to be considered and am happy to share more context.`
  ].join('\n\n');

  const emailTemplate = [
    `Subject: Application for ${role}${job.company ? ` - ${name}` : ''}`,
    '',
    `Hi Hiring Team,`,
    '',
    `I just applied for the ${role} role${job.company ? ` at ${company}` : ''} and wanted to share a quick note. ${summary}`,
    '',
    `A few areas that align with the role: ${skillLine}. One relevant example from my experience: ${strongestBullet}`,
    '',
    `I attached my tailored resume and would appreciate the opportunity to speak with the team.`,
    '',
    `Best,`,
    name,
    resume?.contact || 'adilahmetsargin@gmail.com | https://www.linkedin.com/in/adilahmetsargin/ | https://github.com/adilahmetsargin'
  ].join('\n');

  return { coverLetter, linkedinMessage, emailTemplate };
}

function parseJobContext(jobDescription = '') {
  const firstLine = cleanKeyword(String(jobDescription).split('\n').find(Boolean));
  const titleCompany = firstLine?.match(/^(.+?)\s+-\s+(.+)$/);
  const titleMatch = jobDescription.match(/\b(?:senior|staff|lead|principal)?\s*(?:full stack|frontend|front-end|backend|software|web|react|javascript|typescript|node\.?js)\s+(?:developer|engineer|architect)\b/i);
  const companyMatch = jobDescription.match(/\b(?:at|company|organization|about)\s*:?\s*([A-Z][A-Za-z0-9&.\- ]{2,40})/);

  return {
    title: cleanKeyword(titleCompany?.[1] || titleMatch?.[0] || ''),
    company: cleanKeyword(titleCompany?.[2] || companyMatch?.[1] || '')
  };
}

function findStrongestBullet(resume) {
  const bullets = [
    ...(resume?.experience || []).flatMap((item) => item.bullets || []),
    ...(resume?.projects || []).flatMap((item) => item.bullets || [])
  ].map(cleanSentence).filter(Boolean);
  return bullets.sort((a, b) => scoreBullet(b) - scoreBullet(a))[0] || '';
}

function scoreBullet(value) {
  const text = String(value || '');
  const metricScore = (text.match(/\d+|%|\bmillion\b|\busers\b|\bperformance\b|\bscale\b/gi) || []).length * 3;
  const actionScore = /\b(shipped|built|led|improved|optimized|designed|implemented|migrated|launched)\b/i.test(text) ? 4 : 0;
  return metricScore + actionScore + Math.min(6, text.length / 45);
}

function cleanSentence(value) {
  const text = cleanKeyword(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function analyzeAtsFit(resume, jobDescription) {
  if (!resume || !jobDescription.trim()) {
    return {
      score: 0,
      grade: 'Needs input',
      gradeTone: 'warn',
      matched: [],
      missing: [],
      totalKeywords: 0,
      titleAligned: false,
      experienceHits: 0,
      actions: ['Upload a resume and add a job description to generate an ATS analysis.']
    };
  }

  const jobKeywords = extractJobKeywords(jobDescription);
  const resumeText = resumeToText(resume);
  const matched = jobKeywords.filter((keyword) => containsKeyword(resumeText, keyword));
  const missing = jobKeywords.filter((keyword) => !containsKeyword(resumeText, keyword));
  const titleAligned = hasTitleAlignment(resume, jobDescription);
  const summaryAligned = sectionHasKeywords(resume.summary, jobKeywords, 2);
  const experienceHits = countExperienceHits(resume.experience, jobKeywords);
  const keywordScore = jobKeywords.length ? matched.length / jobKeywords.length : 0;
  const titleBonus = titleAligned ? 0.12 : 0;
  const summaryBonus = summaryAligned ? 0.08 : 0;
  const experienceBonus = Math.min(0.15, experienceHits * 0.025);
  const score = Math.min(100, Math.round((keywordScore * 0.65 + titleBonus + summaryBonus + experienceBonus) * 100));
  const actions = buildAtsActions({ missing, titleAligned, summaryAligned, experienceHits });

  return {
    score,
    grade: score >= 80 ? 'Strong fit' : score >= 60 ? 'Good start' : 'Needs tuning',
    gradeTone: score >= 80 ? 'good' : score >= 60 ? 'neutral' : 'warn',
    matched,
    missing,
    totalKeywords: jobKeywords.length,
    titleAligned,
    experienceHits,
    actions
  };
}

function extractJobKeywords(jobDescription) {
  const explicit = ATS_KEYWORDS.filter((keyword) => containsKeyword(jobDescription, keyword));
  const phrases = Array.from(jobDescription.matchAll(/\b(?:senior|staff|lead|principal)?\s*(?:full stack|frontend|front-end|backend|software|web|react|javascript|typescript|node\.?js)\s+(?:developer|engineer|architect)\b/gi))
    .map((match) => cleanKeyword(match[0]))
    .filter(Boolean);
  return uniqueKeywords([...phrases, ...explicit]).slice(0, 36);
}

function resumeToText(resume) {
  return [
    resume.name,
    resume.headline,
    resume.contact,
    resume.summary,
    ...(resume.skills || []),
    ...(resume.education || []),
    ...(resume.atsNotes || []),
    ...(resume.experience || []).flatMap((item) => [item.role, item.company, item.dates, ...(item.bullets || [])]),
    ...(resume.projects || []).flatMap((item) => [item.name, item.description, ...(item.bullets || [])])
  ].filter(Boolean).join(' ');
}

function hasTitleAlignment(resume, jobDescription) {
  const titleTerms = extractJobKeywords(jobDescription)
    .filter((keyword) => /developer|engineer|architect|frontend|front-end|full stack|backend|react|javascript|typescript|web/i.test(keyword));
  const headline = `${resume.headline || ''} ${(resume.experience || []).map((item) => item.role).join(' ')}`;
  return titleTerms.length ? titleTerms.some((keyword) => containsKeyword(headline, keyword)) : Boolean(resume.headline);
}

function sectionHasKeywords(text, keywords, minimum) {
  const hits = keywords.filter((keyword) => containsKeyword(text || '', keyword)).length;
  return hits >= Math.min(minimum, keywords.length);
}

function countExperienceHits(experience = [], keywords = []) {
  return experience.reduce((count, item) => {
    const text = [item.role, ...(item.bullets || [])].join(' ');
    return count + keywords.filter((keyword) => containsKeyword(text, keyword)).slice(0, 3).length;
  }, 0);
}

function buildAtsActions({ missing, titleAligned, summaryAligned, experienceHits }) {
  const actions = [];
  if (!titleAligned) actions.push('Align the headline with the job title or closest truthful target role.');
  if (!summaryAligned) actions.push('Add 2-3 high-priority role keywords to the professional summary.');
  if (missing.length) actions.push(`Review missing keywords: ${missing.slice(0, 6).join(', ')}.`);
  if (experienceHits < 4) actions.push('Work relevant keywords into existing experience bullets with measurable outcomes.');
  if (!actions.length) actions.push('Looks solid. Do a final truth check before exporting the PDF.');
  return actions;
}

function uniqueKeywords(keywords) {
  const seen = new Set();
  return keywords
    .map(cleanKeyword)
    .filter(Boolean)
    .filter((keyword) => {
      const key = keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanKeyword(keyword) {
  return String(keyword || '').replace(/\s+/g, ' ').trim();
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

const JOB_SOURCES = ['Remotive', 'Arbeitnow', 'RemoteJobs.org', 'Greenhouse', 'Lever', 'Ashby', 'Adzuna', 'USAJOBS'];

createRoot(document.getElementById('root')).render(<App />);
