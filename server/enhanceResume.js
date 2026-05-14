const TARGET_KEYWORDS = [
  'React', 'Next.js', 'Node.js', 'Python', 'AWS', 'PostgreSQL', 'DynamoDB',
  'LLM', 'AI', 'Anthropic', 'Claude', 'OpenAI', 'RAG', 'OAuth2', 'OIDC',
  'OWASP', 'NIST 800-171', 'CMMC', 'GitLab', 'CI/CD', 'Playwright', 'Figma',
  'REST', 'API', 'Full Stack', 'WCAG'
];

export function enhanceTailoredResume(resume, fallback, jobDescription) {
  const jobKeywords = detectTargetKeywords(jobDescription);
  const profile = inferTargetProfile(jobDescription);
  const enhanced = {
    ...resume,
    headline: strengthenHeadline(resume.headline, profile),
    summary: strengthenSummary(resume.summary, jobKeywords, profile),
    skills: mergeSkills(resume.skills, jobKeywords, fallback.skills),
    experience: strengthenExperience(resume.experience, jobKeywords, profile),
    atsNotes: mergeNotes(resume.atsNotes, jobKeywords)
  };

  return applyTargetConsistency(enhanced, profile);
}

function strengthenHeadline(headline = '', profile) {
  const source = clean(headline);
  if (source && hasKeyword(source, profile.title)) return source;
  if (/senior/i.test(source)) return `Senior ${profile.title}`;
  return profile.title;
}

function strengthenSummary(summary = '', jobKeywords, profile) {
  const text = rewriteRoleIdentity(clean(summary), profile);
  const stack = jobKeywords.filter((keyword) => /React|Next\.js|Node\.js|Python|AWS|PostgreSQL|DynamoDB|LLM|AI|RAG/i.test(keyword)).slice(0, 5);
  const prefix = `${profile.title} with production experience across ${profile.scope}.`;
  const keywordSentence = stack.length
    ? `Positioned for this role around ${stack.join(', ')} where those skills connect naturally to the candidate's original project scope and impact.`
    : '';

  return [prefix, text, keywordSentence].filter(Boolean).join(' ');
}

function strengthenExperience(items = [], jobKeywords, profile) {
  return items.map((item) => {
    const context = `${item.role || ''} ${item.company || ''}`;
    const bullets = (item.bullets || []).map((bullet, index) => rewriteExperienceBullet(bullet, context, index, jobKeywords, profile));
    return {
      ...item,
      role: targetRole(item.role, profile),
      bullets: dedupeBullets(bullets).slice(0, 5)
    };
  });
}

function rewriteExperienceBullet(bullet = '', context = '', index = 0, jobKeywords = [], profile) {
  const text = rewriteRoleIdentity(clean(bullet), profile);
  const lower = `${context} ${text}`.toLowerCase();
  const needsNode = includesAny(jobKeywords, ['Node.js', 'REST', 'API']);
  const needsCloud = includesAny(jobKeywords, ['AWS', 'DynamoDB', 'PostgreSQL']);
  const needsAi = includesAny(jobKeywords, ['LLM', 'AI', 'Anthropic', 'Claude', 'OpenAI', 'RAG']);
  const needsSecurity = includesAny(jobKeywords, ['OAuth2', 'OIDC', 'OWASP', 'NIST 800-171', 'CMMC']);

  if (/1m\+|production-grade|high-traffic|istanbul/i.test(text)) {
    return appendIfMissing(
      rewriteRoleIdentity(text, profile),
      [
        needsNode && profile.apiIntegration,
        needsCloud && 'AWS-ready data and deployment workflows',
        '1M+ user scale'
      ]
    );
  }

  if (/dashboard|real-time data|visibility/i.test(text)) {
    return appendIfMissing(text, [
      needsNode && `${profile.stackLabel} and Node.js-backed data flows`,
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
      `${profile.stackLabel} rendering performance`,
      'responsive and accessible UI delivery',
      includesAny(jobKeywords, ['Playwright']) && `testable ${profile.productNoun} behavior`
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
      `engineering standards across ${profile.stackLabel} codebases`
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
      needsNode && profile.apiIntegration,
      needsCloud && 'AWS-ready architecture',
      needsAi && 'LLM/AI feature awareness'
    ]);
  }

  return text;
}

function targetRole(role = '', profile) {
  const cleanRole = clean(role);
  if (!cleanRole) return profile.title;
  if (profile.kind === 'frontend' && /frontend/i.test(cleanRole)) return cleanRole;
  if (/senior frontend (engineer|developer)/i.test(cleanRole)) return `Senior ${profile.title}`;
  if (/frontend (engineer|developer)/i.test(cleanRole)) return profile.title;
  if (/software developer/i.test(cleanRole) && /developer/i.test(profile.title)) return cleanRole.replace(/software developer/i, profile.title);
  return rewriteRoleIdentity(cleanRole, profile);
}

function applyTargetConsistency(resume, profile) {
  return {
    ...resume,
    headline: rewriteRoleIdentity(resume.headline, profile),
    summary: rewriteRoleIdentity(resume.summary, profile),
    experience: (resume.experience || []).map((item) => ({
      ...item,
      role: targetRole(item.role, profile),
      bullets: (item.bullets || []).map((bullet) => rewriteRoleIdentity(bullet, profile))
    })),
    projects: (resume.projects || []).map((project) => ({
      ...project,
      description: rewriteRoleIdentity(project.description, profile),
      bullets: (project.bullets || []).map((bullet) => rewriteRoleIdentity(bullet, profile))
    }))
  };
}

function rewriteRoleIdentity(text = '', profile) {
  if (profile.kind === 'frontend') return clean(text);

  return clean(text)
    .replace(/\bSenior Frontend Engineer\b/gi, `Senior ${profile.title}`)
    .replace(/\bSenior Frontend Developer\b/gi, `Senior ${profile.title}`)
    .replace(/\bFrontend Engineer\b/gi, profile.title)
    .replace(/\bFrontend Developer\b/gi, profile.title)
    .replace(/\bfrontend initiatives\b/gi, profile.initiatives)
    .replace(/\bfrontend delivery\b/gi, profile.delivery)
    .replace(/\bfrontend solutions\b/gi, profile.solutions)
    .replace(/\bfrontend architecture\b/gi, profile.architecture)
    .replace(/\bfrontend systems\b/gi, profile.systems)
    .replace(/\bfrontend behavior\b/gi, `${profile.productNoun} behavior`)
    .replace(/\bfrontend\b(?! and API integration)/gi, profile.frontendReference);
}

function inferTargetProfile(jobDescription = '') {
  const text = clean(jobDescription);
  const explicitTitle = extractExplicitTitle(text);
  const lowerTitle = explicitTitle.toLowerCase();

  if (/full[\s-]?stack/.test(lowerTitle) || hasKeyword(text, 'full stack')) {
    return makeProfile('fullstack', explicitTitle || 'Full Stack Developer');
  }

  if (/react/.test(lowerTitle) || (!explicitTitle && hasKeyword(text, 'React') && !/full[\s-]?stack/i.test(text))) {
    return makeProfile('react', explicitTitle || 'React Developer');
  }

  if (/javascript|js developer/.test(lowerTitle) || (!explicitTitle && hasKeyword(text, 'JavaScript'))) {
    return makeProfile('javascript', explicitTitle || 'JavaScript Developer');
  }

  if (/software engineer/.test(lowerTitle) || hasKeyword(text, 'Software Engineer')) {
    return makeProfile('software', explicitTitle || 'Software Engineer');
  }

  if (/web developer|web engineer/.test(lowerTitle) || hasKeyword(text, 'Web Developer')) {
    return makeProfile('web', explicitTitle || 'Web Developer');
  }

  if (/backend|back-end/.test(lowerTitle) || (!explicitTitle && hasKeyword(text, 'Backend'))) {
    return makeProfile('backend', explicitTitle || 'Backend Developer');
  }

  if (/frontend|front-end/.test(lowerTitle) || (!explicitTitle && hasKeyword(text, 'Frontend'))) {
    return makeProfile('frontend', explicitTitle || 'Frontend Developer');
  }

  return makeProfile('software', explicitTitle || 'Software Developer');
}

function extractExplicitTitle(text) {
  const titlePattern = /(?:^|\n|\btitle:\s*|\brole:\s*|\bposition:\s*)(Senior\s+)?((?:Full[\s-]?Stack|Software|React|JavaScript|Node\.js|Web|Frontend|Front-End|Backend|Back-End)\s+(?:Developer|Engineer))/i;
  const match = text.match(titlePattern);
  if (!match) return '';
  return toTitleCase(`${match[1] || ''}${match[2] || ''}`);
}

function makeProfile(kind, title) {
  const normalizedTitle = normalizeTitle(title);
  const shared = {
    kind,
    title: normalizedTitle,
    stackLabel: 'React.js/Next.js',
    productNoun: 'web application',
    apiIntegration: 'React.js/Next.js UI, reusable components, and REST/Node.js API integration patterns'
  };

  const profiles = {
    fullstack: {
      scope: 'React.js, Next.js, Node.js/API integrations, and high-traffic web platforms',
      initiatives: 'full-stack web initiatives',
      delivery: 'full-stack feature delivery',
      solutions: 'full-stack web solutions',
      architecture: 'full-stack web architecture',
      systems: 'full-stack web systems',
      frontendReference: 'frontend and API integration'
    },
    software: {
      scope: 'JavaScript/TypeScript, React.js, scalable web applications, API integration, and production engineering practices',
      initiatives: 'software engineering initiatives',
      delivery: 'end-to-end feature delivery',
      solutions: 'software solutions',
      architecture: 'web application architecture',
      systems: 'production web systems',
      frontendReference: 'web application'
    },
    react: {
      scope: 'React.js, Next.js, TypeScript, reusable component architecture, and high-performance web interfaces',
      initiatives: 'React application initiatives',
      delivery: 'React feature delivery',
      solutions: 'React web solutions',
      architecture: 'React application architecture',
      systems: 'React web systems',
      frontendReference: 'React application'
    },
    javascript: {
      scope: 'JavaScript/TypeScript, React.js, Next.js, REST API integrations, and browser-based application delivery',
      initiatives: 'JavaScript application initiatives',
      delivery: 'JavaScript feature delivery',
      solutions: 'JavaScript web solutions',
      architecture: 'JavaScript application architecture',
      systems: 'JavaScript web systems',
      frontendReference: 'JavaScript web application'
    },
    web: {
      scope: 'responsive web applications, React.js/Next.js interfaces, API integrations, and production web performance',
      initiatives: 'web application initiatives',
      delivery: 'web feature delivery',
      solutions: 'web application solutions',
      architecture: 'web application architecture',
      systems: 'web application systems',
      frontendReference: 'web application'
    },
    backend: {
      scope: 'API integrations, Node.js service collaboration, authentication flows, data workflows, and scalable web systems',
      initiatives: 'backend integration initiatives',
      delivery: 'API feature delivery',
      solutions: 'API-integrated solutions',
      architecture: 'API integration architecture',
      systems: 'backend-integrated web systems',
      frontendReference: 'API-integrated web'
    },
    frontend: {
      scope: 'React.js, Next.js, TypeScript, reusable component architecture, and high-performance user interfaces',
      initiatives: 'frontend initiatives',
      delivery: 'frontend delivery',
      solutions: 'frontend solutions',
      architecture: 'frontend architecture',
      systems: 'frontend systems',
      frontendReference: 'frontend'
    }
  };

  return { ...shared, ...(profiles[kind] || profiles.software) };
}

function normalizeTitle(title) {
  const cleaned = clean(title)
    .replace(/front-end/gi, 'Frontend')
    .replace(/back-end/gi, 'Backend')
    .replace(/full-stack/gi, 'Full Stack')
    .replace(/\bJs\b/g, 'JS');
  return toTitleCase(cleaned || 'Software Developer')
    .replace(/\bReact\b/i, 'React')
    .replace(/\bJavascript\b/i, 'JavaScript')
    .replace(/\bNode\.Js\b/i, 'Node.js');
}

function toTitleCase(value) {
  return clean(value).replace(/\w\S*/g, (word) => {
    if (/^(API|UI|UX|JS)$/i.test(word)) return word.toUpperCase();
    if (/^Node\.js$/i.test(word)) return 'Node.js';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
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
  const supported = jobKeywords.filter((keyword) => primary.includes(keyword) || fallbackSkills.includes(keyword) || preferred.includes(keyword));
  return [...new Set([...preferred, ...primary, ...supported, ...fallbackSkills].map(clean).filter(Boolean))].slice(0, 28);
}

function mergeNotes(notes = [], jobKeywords = []) {
  const added = jobKeywords.slice(0, 8).map((keyword) => `Selectively strengthened ${keyword} alignment where truthful and natural.`);
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
