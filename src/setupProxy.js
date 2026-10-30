/**
 * Local development proxy — keeps Adzuna and OpenAI credentials server-side only.
 * Create React App automatically loads this file when you run `npm start`.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');

const aiMatchHandler = require('../api/ai-match');
const aiCvHandler = require('../api/ai-cv');
const aiAssistantHandler = require('../api/ai-assistant');
const aiSkillsHandler = require('../api/ai-skills');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const ADZUNA_COUNTRY = (process.env.ADZUNA_COUNTRY || 'za').toLowerCase();
const COLOURS = [
  { bg: '#eaf2ff', fg: '#4b7fd3' }, { bg: '#fff0df', fg: '#d97838' },
  { bg: '#e9f6ef', fg: '#16865d' }, { bg: '#f1ecff', fg: '#8569c9' },
];

const normalize = (job, index) => {
  const colour = COLOURS[index % COLOURS.length];
  const company = job.company?.display_name || 'Hiring company';
  const role = job.title || 'Open position';
  const salaryValues = [job.salary_min, job.salary_max].filter(Number.isFinite);
  return {
    id: job.id || `adzuna-${index}`,
    logo: company.slice(0, 1).toUpperCase(),
    color: colour.bg,
    text: colour.fg,
    company,
    role,
    description: job.description || '',
    type: job.contract_time === 'full_time' ? 'Full-time' : job.contract_time === 'part_time' ? 'Part-time' : job.contract_type ? job.contract_type.replace(/^./, char => char.toUpperCase()) : 'Not specified',
    place: job.location?.display_name || 'Remote',
    time: job.created ? new Date(job.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently posted',
    salary: salaryValues.length ? salaryValues.map(value => Math.round(value).toLocaleString()).join(' – ') : 'Competitive',
    tags: job.category?.label ? [job.category.label] : [],
    match: 'Live opportunity',
    url: job.redirect_url || null,
    noExpNeeded: /intern|apprentice|trainee|entry|junior|graduate|assistant/i.test(role),
  };
};

module.exports = function setupProxy(app) {
  // Parse incoming JSON request bodies
  app.use(express.json({ limit: '5mb' }));

  // AI Endpoints
  app.post('/api/ai-match', (req, res) => aiMatchHandler(req, res));
  app.post('/api/ai-cv', (req, res) => aiCvHandler(req, res));
  app.post('/api/ai-assistant', (req, res) => aiAssistantHandler(req, res));
  app.post('/api/ai-skills', (req, res) => aiSkillsHandler(req, res));

  // Live Job Search API
  app.use('/api/jobs', async (req, res) => {
    const query = String(req.query.query || '').trim();
    const location = String(req.query.location || '').trim();
    const internshipOnly = req.query.internship === 'true';
    const apprenticeshipOnly = req.query.apprenticeship === 'true';

    const fallback = (message) => res.status(200).json({ jobs: [], source: 'fallback', message });

    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
      return fallback('Adzuna is not configured. Add the Adzuna environment variables, then restart the app.');
    }

    try {
      const terms = [query, internshipOnly ? 'internship' : '', apprenticeshipOnly ? 'apprenticeship' : ''].filter(Boolean).join(' ');
      const params = new URLSearchParams({
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        results_per_page: '25',
        'content-type': 'application/json',
      });
      if (terms) params.set('what', terms);
      if (location) params.set('where', location);

      const upstream = await fetch(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(ADZUNA_COUNTRY)}/search/1?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });

      if (!upstream.ok) {
        return fallback(upstream.status === 401 || upstream.status === 403
          ? 'Adzuna credentials are invalid or not authorised. Showing demo data.'
          : `Adzuna returned HTTP ${upstream.status}. Showing demo data.`);
      }

      const payload = await upstream.json();
      const records = payload.results || [];
      return res.status(200).json({
        jobs: records.map(normalize),
        source: 'adzuna',
        refreshedAt: new Date().toISOString(),
        total: payload.count || records.length,
      });
    } catch (error) {
      console.error('[proxy] Error calling Adzuna:', error.message);
      return fallback('Could not reach Adzuna. Showing demo data.');
    }
  });
};
