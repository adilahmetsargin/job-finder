export function normalizeTailoredResume(input = {}, fallback = {}) {
  const source = isObject(input) ? input : {};
  const base = isObject(fallback) ? fallback : {};

  return {
    name: clean(source.name) || clean(base.name) || '',
    headline: chooseHeadline(source.headline, base.headline),
    contact: chooseLonger(source.contact, base.contact),
    summary: clean(source.summary) || clean(base.summary) || '',
    skills: mergeStrings(source.skills, base.skills),
    experience: normalizeExperience(source.experience, base.experience),
    projects: normalizeProjects(source.projects, base.projects),
    education: normalizeStrings(source.education, base.education),
    atsNotes: mergeStrings(source.atsNotes, base.atsNotes)
  };
}

function normalizeExperience(primary, fallback) {
  const items = Array.isArray(primary) && primary.length ? primary : fallback;
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    role: clean(item?.role),
    company: clean(item?.company),
    dates: clean(item?.dates),
    bullets: normalizeStrings(item?.bullets, [])
  })).filter((item) => item.role || item.company || item.bullets.length);
}

function normalizeProjects(primary, fallback) {
  const items = Array.isArray(primary) && primary.length ? primary : fallback;
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    name: clean(item?.name),
    description: clean(item?.description),
    bullets: normalizeStrings(item?.bullets, [])
  })).filter((item) => item.name || item.description || item.bullets.length);
}

function normalizeStrings(primary, fallback) {
  const list = Array.isArray(primary) && primary.length ? primary : fallback;
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(clean).filter(Boolean))];
}

function mergeStrings(primary, fallback) {
  const left = Array.isArray(primary) ? primary : [];
  const right = Array.isArray(fallback) ? fallback : [];
  return [...new Set([...left, ...right].map(clean).filter(Boolean))];
}

function chooseHeadline(primary, fallback) {
  const source = clean(primary);
  const base = clean(fallback);
  if (/full stack/i.test(base) && !/full stack/i.test(source)) return base;
  return source || base || 'Targeted Software Engineer';
}

function chooseLonger(primary, fallback) {
  const source = clean(primary);
  const base = clean(fallback);
  return source.length >= base.length ? source : base;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
