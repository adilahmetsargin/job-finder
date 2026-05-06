const TARGET_KEYWORDS = [
  'React', 'Next.js', 'Node.js', 'Python', 'AWS', 'PostgreSQL', 'DynamoDB',
  'LLM', 'AI', 'Anthropic', 'Claude', 'OpenAI', 'RAG', 'OAuth2', 'OIDC',
  'OWASP', 'NIST 800-171', 'CMMC', 'GitLab', 'CI/CD', 'Playwright', 'Figma',
  'REST', 'API', 'Full Stack', 'WCAG'
];

export function enhanceTailoredResume(resume, fallback, jobDescription) {
  const jobKeywords = detectTargetKeywords(jobDescription);
  const shouldTargetFullStack = hasKeyword(jobDescription, 'full stack') || hasKeyword(jobDescription, 'node.js');
  const enhanced = {
    ...resume,
    headline: shouldTargetFullStack ? strengthenHeadline(resume.headline) : resume.headline,
    summary: strengthenSummary(resume.summary, jobKeywords, shouldTargetFullStack),
    skills: mergeSkills(resume.skills, jobKeywords, fallback.skills),
    experience: strengthenExperience(resume.experience, jobKeywords, shouldTargetFullStack),
    atsNotes: mergeNotes(resume.atsNotes, jobKeywords)
  };

  return shouldTargetFullStack ? applyFullStackConsistency(enhanced) : enhanced;
}

function strengthenHeadline(headline = '') {
  if (/full stack/i.test(headline)) return headline;
  if (/senior/i.test(headline)) return 'Senior Full Stack Developer';
  return 'Full Stack Developer';
}

function strengthenSummary(summary = '', jobKeywords, shouldTargetFullStack) {
  const text = shouldTargetFullStack ? rewriteFrontendIdentity(clean(summary)) : clean(summary);
  const stack = jobKeywords.filter((keyword) => /React|Next\.js|Node\.js|Python|AWS|PostgreSQL|DynamoDB|LLM|AI|RAG/i.test(keyword)).slice(0, 8);
  const prefix = shouldTargetFullStack
    ? `Full Stack Developer with production experience across React.js, Next.js, Node.js/API integrations, and high-traffic web platforms.`
    : '';
  const keywordSentence = stack.length
    ? `Positioned for this role around ${stack.join(', ')} while preserving the candidate's original project scope and impact.`
    : '';

  return [prefix, text, keywordSentence].filter(Boolean).join(' ');
}

function strengthenExperience(items = [], jobKeywords, shouldTargetFullStack) {
  return items.map((item) => {
    const context = `${item.role || ''} ${item.company || ''}`;
    const bullets = (item.bullets || []).map((bullet, index) => rewriteExperienceBullet(bullet, context, index, jobKeywords, shouldTargetFullStack));
    return {
      ...item,
      role: shouldTargetFullStack ? targetRole(item.role) : item.role,
      bullets: dedupeBullets(bullets).slice(0, 5)
    };
  });
}

function rewriteExperienceBullet(bullet = '', context = '', index = 0, jobKeywords = [], shouldTargetFullStack = false) {
  const text = shouldTargetFullStack ? rewriteFrontendIdentity(clean(bullet)) : clean(bullet);
  const lower = `${context} ${text}`.toLowerCase();
  const needsNode = includesAny(jobKeywords, ['Node.js', 'REST', 'API']);
  const needsCloud = includesAny(jobKeywords, ['AWS', 'DynamoDB', 'PostgreSQL']);
  const needsAi = includesAny(jobKeywords, ['LLM', 'AI', 'Anthropic', 'Claude', 'OpenAI', 'RAG']);
  const needsSecurity = includesAny(jobKeywords, ['OAuth2', 'OIDC', 'OWASP', 'NIST 800-171', 'CMMC']);

  if (/1m\+|production-grade|high-traffic|istanbul/i.test(text)) {
    return appendIfMissing(
      text.replace(/frontend/i, 'full-stack frontend'),
      [
        needsNode && 'React.js/Next.js UI, reusable components, and REST/Node.js API integration patterns',
        needsCloud && 'AWS-ready data and deployment workflows',
        '1M+ user scale'
      ]
    );
  }

  if (/dashboard|real-time data|visibility/i.test(text)) {
    return appendIfMissing(text, [
      needsNode && 'React.js and Node.js-backed data flows',
      needsCloud && 'cloud-hosted reporting/data-store readiness',
      'production observability and operational efficiency'
    ]);
  }

  if (/authentication|role-based|admin|api integration/i.test(text)) {
    return appendIfMissing(text, [
      needsSecurity && 'OAuth2/OIDC-aligned authentication patterns',
      'secure REST API integrations',
      needsCloud && 'AWS Cognito/API Gateway-style architecture fit'
    ]);
  }

  if (/performance|render|re-render|optimization/i.test(text)) {
    return appendIfMissing(text, [
      'React.js/Next.js rendering performance',
      'responsive and accessible UI delivery',
      includesAny(jobKeywords, ['Playwright']) && 'testable frontend behavior'
    ]);
  }

  if (/redux|state management|architecture|component/i.test(text)) {
    return appendIfMissing(text, [
      'reusable component architecture',
      'TypeScript-friendly state management',
      needsNode && 'API-backed product workflows'
    ]);
  }

  if (/automation|technical insights|platform|stakeholders|workflows|operations/i.test(text)) {
    return appendIfMissing(text, [
      needsAi && 'AI-assisted workflow analysis and requirements discovery',
      'requirements translation for engineering teams',
      needsCloud && 'enterprise platform modernization and cloud-ready data flows'
    ]);
  }

  if (/code reviews|mentored|junior/i.test(text)) {
    return appendIfMissing(text, [
      'peer code review',
      'AI-assisted code validation readiness',
      'engineering standards across React/Next.js codebases'
    ]);
  }

  if (/product|backend|design|agile|cross-function/i.test(text)) {
    return appendIfMissing(text, [
      'UX/UI and backend collaboration',
      'end-to-end feature delivery',
      includesAny(jobKeywords, ['Figma']) && 'Figma-to-code implementation'
    ]);
  }

  if (index === 0) {
    return appendIfMissing(text, [
      needsNode && 'React/Next.js front end through REST/Node.js API integration',
      needsCloud && 'AWS-ready architecture',
      needsAi && 'LLM/AI feature awareness'
    ]);
  }

  return text;
}

function targetRole(role = '') {
  if (/senior frontend/i.test(role)) return role.replace(/senior frontend/i, 'Senior Full Stack');
  if (/frontend/i.test(role)) return role.replace(/frontend/i, 'Full Stack');
  if (/software developer/i.test(role) && !/full stack/i.test(role)) return role.replace(/software developer/i, 'Full Stack Developer');
  return role;
}

function applyFullStackConsistency(resume) {
  return {
    ...resume,
    headline: rewriteFrontendIdentity(resume.headline),
    summary: rewriteFrontendIdentity(resume.summary),
    experience: (resume.experience || []).map((item) => ({
      ...item,
      role: targetRole(rewriteFrontendIdentity(item.role)),
      bullets: (item.bullets || []).map(rewriteFrontendIdentity)
    })),
    projects: (resume.projects || []).map((project) => ({
      ...project,
      description: rewriteFrontendIdentity(project.description),
      bullets: (project.bullets || []).map(rewriteFrontendIdentity)
    }))
  };
}

function rewriteFrontendIdentity(text = '') {
  return clean(text)
    .replace(/\bSenior Frontend Engineer\b/gi, 'Senior Full Stack Developer')
    .replace(/\bSenior Frontend Developer\b/gi, 'Senior Full Stack Developer')
    .replace(/\bFrontend Engineer\b/gi, 'Full Stack Developer')
    .replace(/\bFrontend Developer\b/gi, 'Full Stack Developer')
    .replace(/\bfrontend initiatives\b/gi, 'full-stack web initiatives')
    .replace(/\bfrontend delivery\b/gi, 'full-stack feature delivery')
    .replace(/\bfrontend solutions\b/gi, 'full-stack web solutions')
    .replace(/\bfrontend architecture\b/gi, 'full-stack web architecture')
    .replace(/\bfrontend systems\b/gi, 'full-stack web systems')
    .replace(/\bfrontend behavior\b/gi, 'full-stack web behavior')
    .replace(/\bfrontend\b(?! and API integration)/gi, 'frontend and API integration');
}

function appendIfMissing(base, additions) {
  const useful = additions.filter(Boolean).filter((addition) => !containsPhrase(base, addition));
  if (!useful.length) return base;
  return `${base}; supporting ${useful.join(', ')}.`;
}

function mergeSkills(primary = [], jobKeywords = [], fallbackSkills = []) {
  const preferred = [
    'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'REST APIs',
    'Python', 'AWS', 'PostgreSQL', 'DynamoDB', 'OAuth2/OIDC', 'LLM APIs',
    'RAG', 'CI/CD', 'GitLab', 'Playwright', 'Figma'
  ];
  return [...new Set([...preferred, ...primary, ...jobKeywords, ...fallbackSkills].map(clean).filter(Boolean))].slice(0, 34);
}

function mergeNotes(notes = [], jobKeywords = []) {
  const added = jobKeywords.slice(0, 12).map((keyword) => `Strengthened ${keyword} alignment in skills, summary, or experience bullets.`);
  return [...new Set([...notes, ...added].map(clean).filter(Boolean))];
}

function detectTargetKeywords(text = '') {
  return TARGET_KEYWORDS.filter((keyword) => hasKeyword(text, keyword));
}

function includesAny(list, values) {
  return values.some((value) => list.some((item) => item.toLowerCase() === value.toLowerCase()));
}

function hasKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9+#.])${escaped}([^A-Za-z0-9+#.]|$)`, 'i').test(text);
}

function containsPhrase(text, phrase) {
  return clean(text).toLowerCase().includes(clean(phrase).toLowerCase());
}

function dedupeBullets(items) {
  return [...new Set(items.map(clean).filter(Boolean))];
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
