import serverless from 'serverless-http';
import app from '../../server/index.js';

const expressHandler = serverless(app, {
  binary: ['application/pdf']
});

export async function handler(event, context) {
  const normalizedEvent = {
    ...event,
    path: normalizePath(event.path)
  };

  return expressHandler(normalizedEvent, context);
}

function normalizePath(path = '') {
  if (path.startsWith('/.netlify/functions/api/')) {
    return path.replace('/.netlify/functions/api/', '/api/');
  }

  if (path === '/.netlify/functions/api') {
    return '/api/health';
  }

  return path;
}
