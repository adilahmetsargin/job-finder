# Deployment

## Backend API on Render

Create a Render Web Service from this GitHub repo.

- Runtime: Node
- Plan: Free
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Environment variables:

```text
NODE_ENV=production
HF_TOKEN=your_hugging_face_token
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_PROVIDER=novita
```

Optional job provider variables:

```text
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
USAJOBS_API_KEY=your_usajobs_api_key
USAJOBS_USER_AGENT=your_email@example.com
```

After Render deploys, copy the service URL, for example:

```text
https://job-finder-api.onrender.com
```

## Frontend on Netlify

Set this Netlify environment variable:

```text
VITE_API_URL=https://job-finder-api.onrender.com
```

Then redeploy Netlify.

Do not set `VITE_API_URL` to `127.0.0.1` in production.
