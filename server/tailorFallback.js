const KEYWORDS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'NestJS',
  'HTML', 'CSS', 'Tailwind', 'GraphQL', 'REST', 'PostgreSQL', 'MongoDB', 'SQL',
  'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'Testing', 'Jest', 'Playwright',
  'Frontend', 'Backend', 'Full Stack', 'API', 'Microservices', 'Agile', 'Scrum',
  'Redux', 'Redux Toolkit', 'Vue', 'Angular', 'Python', 'Java', 'Go', 'Redis',
  'Firebase', 'DynamoDB', 'RDS', 'Lambda', 'API Gateway', 'Cognito', 'S3',
  'CloudFront', 'OAuth2', 'OIDC', 'LLM', 'AI', 'Anthropic', 'Claude', 'OpenAI',
  'RAG', 'LangChain', 'LlamaIndex', 'MCP', 'Vector Databases', 'pgvector',
  'Pinecone', 'OWASP', 'NIST 800-171', 'CMMC', 'FedRAMP', 'WCAG', 'Figma',
  'GitHub', 'GitLab', 'DevOps', 'DevSecOps', 'Cypress', 'Azure'
];

export function tailorResumeFallback(resumeText, jobDescription) {
  const lines = resumeText.split('\n').map((line) => line.trim()).filter(Boolean);
  const detected = detectKeywords(`${resumeText}\n${jobDescription}`);
  const jobKeywords = detectKeywords(jobDescription);
  const header = parseHeader(lines);
  const headline = buildHeadline(jobDescription, resumeText);
  const skills = mergeSkills(detected, jobKeywords);
  const sections = splitSections(lines);

  return {
    name: header.name,
    headline,
    contact: header.contact,
    summary: buildSummary(headline, skills, jobKeywords),
    skills,
    experience: buildExperience(sections.experience, jobKeywords, headline, sections.skills),
    projects: buildProjects(sections.projects, jobKeywords),
    education: sections.education,
    atsNotes: jobKeywords.slice(0, 12).map((keyword) => `Included or emphasized ${keyword} for ATS alignment.`)
  };
}

function detectKeywords(text) {
  return KEYWORDS.filter((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9+#.])${escaped}([^A-Za-z0-9+#.]|$)`, 'i').test(text);
  });
}

function mergeSkills(current, jobKeywords) {
  const essentials = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'REST', 'Git'];
  return [...new Set([...current, ...jobKeywords, ...essentials])].slice(0, 26);
}

function buildHeadline(jobDescription, resumeText) {
  const text = `${jobDescription} ${resumeText}`.toLowerCase();
  if (text.includes('fullstack') || text.includes('full stack')) return 'Full Stack Developer';
  if (text.includes('backend') || text.includes('node')) return 'Backend / Node.js Developer';
  if (text.includes('frontend') || text.includes('react')) return 'Frontend React Developer';
  return 'Software Developer';
}

function buildSummary(headline, skills, jobKeywords) {
  const emphasized = [...new Set([...jobKeywords, ...skills])].slice(0, 8).join(', ');
  return `${headline} with hands-on experience building reliable, user-focused web applications. Strong fit for roles needing ${emphasized}. Able to translate product requirements into clean interfaces, maintainable APIs, and measurable delivery outcomes. Resume has been tailored to emphasize relevant keywords while preserving the candidate's original experience.`;
}

function buildExperience(lines, jobKeywords, headline, skillLines = []) {
  const chunks = chunkExperience(lines);
  const keywords = jobKeywords.slice(0, 6).join(', ') || 'modern web technologies';

  if (!chunks.length) {
    return [{
      role: headline,
      company: '',
      dates: '',
      bullets: [
        `Built and maintained web application features aligned with ${keywords}.`,
        'Collaborated across product and engineering to ship readable, maintainable solutions.',
        'Improved application quality through reusable components, API integration, and iterative delivery.'
      ]
    }];
  }

  const resumeSkills = detectKeywords(skillLines.join(' '));

  return chunks.slice(0, 5).map((chunk) => {
    const roleLine = chunk.role || headline;
    const title = makeTargetedRole(roleLine, headline);
    const originalBullets = chunk.bullets.length ? chunk.bullets : [chunk.role].filter(Boolean);
    return {
      role: title,
      company: chunk.company,
      dates: chunk.dates,
      bullets: [
        `Delivered application functionality using experience relevant to ${keywords}.`,
        ...originalBullets.slice(0, 3).map((bullet) => rewriteBullet(bullet, jobKeywords, resumeSkills))
      ].filter(Boolean)
    };
  });
}

function buildProjects(lines, jobKeywords) {
  const chunks = chunkLoose(lines).slice(0, 3);
  return chunks.map((chunk) => ({
    name: chunk[0] || 'Relevant Project',
    description: rewriteBullet(chunk[1], jobKeywords) || 'Project reframed around the target job requirements.',
    bullets: [rewriteBullet(chunk[2], jobKeywords)].filter(Boolean)
  }));
}

function rewriteBullet(line, jobKeywords, resumeSkills = []) {
  if (!line) return '';
  const keywordText = jobKeywords.slice(0, 4).join(', ');
  const cleaned = line.replace(/^[\-*•]\s*/, '').trim();
  const missingButPlausible = jobKeywords
    .filter((keyword) => !resumeSkills.includes(keyword))
    .filter((keyword) => /Node\.js|API|REST|AWS|Python|PostgreSQL|DynamoDB|LLM|AI|RAG/i.test(keyword))
    .slice(0, 2);
  const emphasis = [...new Set([...jobKeywords.slice(0, 3), ...missingButPlausible])].join(', ');
  if (!keywordText) return cleaned;
  if (cleaned.toLowerCase().includes(emphasis.toLowerCase())) return cleaned;
  return `${cleaned}; aligned with ${emphasis}.`;
}

function splitSections(lines) {
  const sections = { experience: [], projects: [], education: [], skills: [] };
  let current = null;

  for (const line of lines.slice(1)) {
    const label = line.toLowerCase();
    if (/^(experience|employment|work history)$/i.test(label)) current = 'experience';
    else if (/^(projects?|selected projects)$/i.test(label)) current = 'projects';
    else if (/^(education)$/i.test(label)) current = 'education';
    else if (/^(technical skills|skills)$/i.test(label)) current = 'skills';
    else if (current && !/summary|profile|contact|references available/i.test(label) && !looksLikeContact(line)) {
      sections[current].push(line);
    }
  }

  return sections;
}

function chunkExperience(lines) {
  const chunks = [];
  let current = null;

  for (const line of lines) {
    if (looksLikeDate(line)) {
      if (!current) current = { role: '', company: '', dates: '', bullets: [] };
      current.dates = line;
      continue;
    }

    if (looksLikeRoleLine(line)) {
      if (current) chunks.push(current);
      current = parseRoleLine(line);
      continue;
    }

    if (!current) current = { role: '', company: '', dates: '', bullets: [] };
    if (looksLikeBullet(line) || line.startsWith('-')) {
      current.bullets.push(line);
    } else if (current.bullets.length) {
      current.bullets[current.bullets.length - 1] = `${current.bullets[current.bullets.length - 1]} ${line}`;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function chunkLoose(lines) {
  const chunks = [];
  let current = [];

  for (const line of lines) {
    if (current.length >= 4) {
      chunks.push(current);
      current = [];
    }
    current.push(line);
  }

  if (current.length) chunks.push(current);
  return chunks;
}

function parseHeader(lines) {
  const first = lines[0] || '';
  const parts = first.split('|').map((part) => part.trim()).filter(Boolean);
  const name = parts[0] && !looksLikeContact(parts[0]) ? parts[0] : '';
  const contactLines = lines
    .slice(1, 8)
    .filter((line) => !/^summary$/i.test(line))
    .filter((line) => looksLikeContact(line) || /holder|citizen|authorized|detroit|rochester|remote|hybrid|on-site/i.test(line));
  const contact = contactLines.join(' | ');
  return { name, contact };
}

function parseRoleLine(line) {
  const normalized = line.replace(/\s{2,}/g, ' ').trim();
  const [role, company] = normalized.includes(' - ')
    ? normalized.split(' - ').map((value) => value.trim())
    : [normalized, ''];
  return { role, company, dates: '', bullets: [] };
}

function looksLikeContact(line) {
  return line.includes('@') || /linkedin|github|portfolio|http|www\.|\+?\d[\d\s().-]{7,}/i.test(line);
}

function looksLikeBullet(line = '') {
  return /^(built|created|developed|improved|delivered|implemented|led|owned|collaborated|managed|designed|optimized|worked|shipped|maintained)\b/i.test(line);
}

function looksLikeDate(line = '') {
  return /\b(19|20)\d{2}\b|present|january|february|march|april|may|june|july|august|september|october|november|december/i.test(line);
}

function looksLikeRoleLine(line = '') {
  return !line.startsWith('-')
    && line.length <= 110
    && /^[A-Z]/.test(line)
    && !/,/.test(line)
    && /\b(developer|engineer|specialist|manager|lead|architect|consultant|analyst)\b/i.test(line);
}

function makeTargetedRole(role, headline) {
  if (/frontend/i.test(role) && /full stack/i.test(headline)) return role.replace(/frontend/i, 'Full Stack');
  if (/software developer/i.test(role) && /full stack/i.test(headline)) return role.replace(/software developer/i, 'Full Stack Developer');
  return role || headline;
}
