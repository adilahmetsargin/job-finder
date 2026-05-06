const DEFAULT_QUERY = 'frontend react javascript developer';
const TECH_QUERY_HINTS = ['frontend', 'front-end', 'react', 'javascript', 'typescript', 'next.js', 'web developer', 'software engineer'];

export async function searchJobs({ query = DEFAULT_QUERY, page = 1, pageSize = 12, hours = 24 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(5, Number(pageSize) || 12));
  const safeHours = Math.max(1, Number(hours) || 24);
  const since = Date.now() - safeHours * 60 * 60 * 1000;
  const searchQuery = clean(query) || DEFAULT_QUERY;

  const providers = [
    ['Remotive', () => fetchRemotive(searchQuery)],
    ['Arbeitnow', () => fetchArbeitnow()],
    ['RemoteJobs.org', () => fetchRemoteJobs(searchQuery)],
    ['Adzuna', () => fetchAdzuna(searchQuery, safePage)],
    ['USAJOBS', () => fetchUsaJobs(searchQuery, safePage)]
  ];

  const settled = await Promise.allSettled(providers.map(([, run]) => run()));
  const errors = [];
  const jobs = [];

  settled.forEach((result, index) => {
    const source = providers[index][0];
    if (result.status === 'fulfilled') {
      jobs.push(...result.value);
    } else {
      errors.push({ source, message: result.reason?.message || String(result.reason) });
    }
  });

  const filtered = dedupeJobs(jobs)
    .filter((job) => isRelevant(job, searchQuery))
    .filter((job) => isUsOrRemote(job))
    .filter((job) => !job.postedAt || new Date(job.postedAt).getTime() >= since)
    .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));

  const total = filtered.length;
  const start = (safePage - 1) * safePageSize;
  const paged = filtered.slice(start, start + safePageSize);

  return {
    query: searchQuery,
    page: safePage,
    pageSize: safePageSize,
    hours: safeHours,
    total,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    jobs: paged,
    sources: {
      active: [...new Set(jobs.map((job) => job.source))],
      errors,
      externalSearches: buildExternalSearches(searchQuery)
    }
  };
}

async function fetchRemotive(query) {
  const url = new URL('https://remotive.com/api/remote-jobs');
  url.searchParams.set('search', query);
  const data = await getJson(url);
  return (data.jobs || []).map((job) => normalizeJob({
    source: 'Remotive',
    id: `remotive-${job.id}`,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || 'Remote',
    remote: true,
    url: job.url,
    postedAt: job.publication_date,
    description: stripHtml(job.description),
    tags: job.tags || []
  }));
}

async function fetchArbeitnow() {
  const data = await getJson('https://www.arbeitnow.com/api/job-board-api');
  return (data.data || []).map((job) => normalizeJob({
    source: 'Arbeitnow',
    id: `arbeitnow-${job.slug || job.url}`,
    title: job.title,
    company: job.company_name,
    location: job.location || 'Remote',
    remote: Boolean(job.remote),
    url: job.url,
    postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : '',
    description: stripHtml(job.description),
    tags: job.tags || []
  }));
}

async function fetchRemoteJobs(query) {
  const url = new URL('https://remotejobs.org/api/v1/jobs');
  url.searchParams.set('limit', '50');
  url.searchParams.set('offset', '0');
  url.searchParams.set('category', 'programming');
  url.searchParams.set('keyword', query);
  const data = await getJson(url);
  const list = data.jobs || data.data || data.results || [];
  return list.map((job) => normalizeJob({
    source: 'RemoteJobs.org',
    id: `remotejobs-${job.id || job.url}`,
    title: job.title,
    company: job.company || job.company_name,
    location: job.location || 'Remote',
    remote: true,
    url: job.url || job.apply_url,
    postedAt: job.date || job.created_at || job.published_at,
    description: stripHtml(job.description || job.summary),
    tags: job.tags || job.skills || []
  }));
}

async function fetchAdzuna(query, page) {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return [];
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/${page}`);
  url.searchParams.set('app_id', process.env.ADZUNA_APP_ID);
  url.searchParams.set('app_key', process.env.ADZUNA_APP_KEY);
  url.searchParams.set('what', query);
  url.searchParams.set('where', 'United States');
  url.searchParams.set('max_days_old', '1');
  url.searchParams.set('results_per_page', '50');
  url.searchParams.set('content-type', 'application/json');
  const data = await getJson(url);
  return (data.results || []).map((job) => normalizeJob({
    source: 'Adzuna',
    id: `adzuna-${job.id}`,
    title: job.title,
    company: job.company?.display_name,
    location: job.location?.display_name,
    remote: /remote/i.test(`${job.title} ${job.location?.display_name} ${job.description}`),
    url: job.redirect_url,
    postedAt: job.created,
    description: stripHtml(job.description),
    tags: job.category?.label ? [job.category.label] : []
  }));
}

async function fetchUsaJobs(query, page) {
  if (!process.env.USAJOBS_API_KEY || !process.env.USAJOBS_USER_AGENT) return [];
  const url = new URL('https://data.usajobs.gov/api/Search');
  url.searchParams.set('Keyword', query);
  url.searchParams.set('LocationName', 'United States');
  url.searchParams.set('DatePosted', '1');
  url.searchParams.set('Page', String(page));
  url.searchParams.set('ResultsPerPage', '50');
  const data = await getJson(url, {
    headers: {
      Host: 'data.usajobs.gov',
      'User-Agent': process.env.USAJOBS_USER_AGENT,
      'Authorization-Key': process.env.USAJOBS_API_KEY
    }
  });
  const items = data.SearchResult?.SearchResultItems || [];
  return items.map((item) => {
    const job = item.MatchedObjectDescriptor || {};
    return normalizeJob({
      source: 'USAJOBS',
      id: `usajobs-${job.PositionID}`,
      title: job.PositionTitle,
      company: job.OrganizationName,
      location: (job.PositionLocation || []).map((location) => location.LocationName).join(', '),
      remote: /remote|telework/i.test(`${job.PositionTitle} ${job.UserArea?.Details?.TeleworkEligible}`),
      url: job.PositionURI,
      postedAt: job.PublicationStartDate,
      description: stripHtml(job.QualificationSummary || job.UserArea?.Details?.JobSummary),
      tags: ['Federal']
    });
  });
}

async function getJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeJob(job) {
  return {
    id: clean(job.id) || `${job.source}-${job.url}`,
    source: clean(job.source),
    title: clean(job.title),
    company: clean(job.company) || 'Unknown company',
    location: clean(job.location) || 'United States / Remote',
    remote: Boolean(job.remote) || /remote|anywhere|worldwide|usa only|north america|americas/i.test(job.location || ''),
    url: clean(job.url),
    postedAt: normalizeDate(job.postedAt),
    description: clean(job.description).slice(0, 2200),
    tags: Array.isArray(job.tags) ? job.tags.map(clean).filter(Boolean).slice(0, 8) : []
  };
}

function normalizeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function isRelevant(job, query) {
  const haystack = `${job.title} ${job.description} ${job.tags.join(' ')}`.toLowerCase();
  const title = job.title.toLowerCase();
  const queryWords = query.toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9.+#-]/g, ''))
    .filter((word) => word.length > 2)
    .filter((word) => !['developer', 'engineer', 'software', 'remote', 'jobs'].includes(word));
  const hasRequestedTerm = !queryWords.length || queryWords.some((word) => hasTerm(haystack, word));
  const hasTechSignal = TECH_QUERY_HINTS.some((hint) => haystack.includes(hint)) || /developer|engineer/i.test(title);
  const looksNonTech = /marketing|sales|customer|lifecycle|retention|strategist|account executive|recruiter/i.test(title);
  return hasRequestedTerm && hasTechSignal && !looksNonTech;
}

function isUsOrRemote(job) {
  if (job.remote) return true;
  return /united states|usa|u\.s\.|us only|north america|americas|detroit|michigan|mi\b|remote/i.test(job.location);
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    if (!job.title || !job.url) return false;
    const key = `${job.source}-${job.url}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildExternalSearches(query) {
  const encoded = encodeURIComponent(query);
  const location = encodeURIComponent('United States');
  return [
    { source: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${encoded}&location=${location}&f_TPR=r86400` },
    { source: 'Indeed', url: `https://www.indeed.com/jobs?q=${encoded}&l=${location}&fromage=1` },
    { source: 'Glassdoor', url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encoded}` },
    { source: 'ZipRecruiter', url: `https://www.ziprecruiter.com/jobs-search?search=${encoded}&location=${location}&days=1` },
    { source: 'Dice', url: `https://www.dice.com/jobs?q=${encoded}&location=${location}&filters.postedDate=ONE` },
    { source: 'Wellfound', url: `https://wellfound.com/jobs?keywords=${encoded}` },
    { source: 'Built In', url: `https://builtin.com/jobs?search=${encoded}` },
    { source: 'Y Combinator', url: `https://www.ycombinator.com/jobs?query=${encoded}` }
  ];
}

function hasTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(text);
}

function stripHtml(value = '') {
  return clean(String(value).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'));
}

function clean(value = '') {
  if (value && typeof value === 'object') {
    return clean(value.name || value.display_name || value.title || value.label || '');
  }
  return String(value || '').replace(/\s+/g, ' ').trim();
}
