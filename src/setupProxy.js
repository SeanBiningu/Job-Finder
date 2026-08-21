/**
 * Local development proxy — keeps Adzuna credentials server-side only.
 * Create React App automatically loads this file when you run `npm start`.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const ADZUNA_COUNTRY = (process.env.ADZUNA_COUNTRY || 'za').toLowerCase();
const COLOURS = [
  { bg: '#eaf2ff', fg: '#4b7fd3' }, { bg: '#fff0df', fg: '#d97838' },
  { bg: '#e9f6ef', fg: '#16865d' }, { bg: '#f1ecff', fg: '#8569c9' },
];
const demoJobs = [
  { id: 'demo-1', logo: 'N', color: '#fff2e9', text: '#ff7752', company: 'Notion', role: 'Junior Product Designer', type: 'Full-time', place: 'Remote', time: '2d ago', salary: '$48–60k', tags: ['Figma', 'UI Design'], match: 'Demo', noExpNeeded: false },
  { id: 'demo-2', logo: 'M', color: '#f1edff', text: '#7662d7', company: 'Monzo', role: 'Graduate Data Analyst', type: 'Graduate', place: 'London, UK', time: '1d ago', salary: 'GBP 32–38k', tags: ['SQL', 'Python'], match: 'Demo', noExpNeeded: true },
  { id: 'demo-3', logo: 'Z', color: '#e6f6ef', text: '#16865d', company: 'ZimSwitch', role: 'Software Engineering Intern', type: 'Internship', place: 'Harare, Zimbabwe', time: 'Today', salary: 'Paid', tags: ['React', 'JavaScript'], match: 'Demo', noExpNeeded: true },
  { id: 'demo-4', logo: 'B', color: '#e8f4fd', text: '#2d7bb8', company: 'BT Group', role: 'Software Developer Apprentice', type: 'Apprenticeship', place: 'London, UK', time: '2d ago', salary: 'GBP 18–22k', tags: ['JavaScript', 'Cloud'], match: 'Demo', noExpNeeded: true },
  { id: 'demo-5', logo: 'D', color: '#fef3e7', text: '#c8762d', company: 'Deloitte', role: 'Business Analyst Apprentice', type: 'Apprenticeship', place: 'Harare, Zimbabwe', time: '1d ago', salary: 'Paid training', tags: ['Excel', 'Analysis'], match: 'Demo', noExpNeeded: true },
];
const normalize = (job, index) => {
  const colour = COLOURS[index % COLOURS.length]; const company = job.company?.display_name || 'Hiring company'; const role = job.title || 'Open position';
  const salaryValues = [job.salary_min, job.salary_max].filter(Number.isFinite);
  return { id: job.id || `adzuna-${index}`, logo: company.slice(0, 1).toUpperCase(), color: colour.bg, text: colour.fg, company, role,
    type: job.contract_time === 'full_time' ? 'Full-time' : job.contract_time === 'part_time' ? 'Part-time' : job.contract_type ? job.contract_type.replace(/^./, char => char.toUpperCase()) : 'Not specified',
    place: job.location?.display_name || 'Remote', time: job.created ? new Date(job.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently posted', salary: salaryValues.length ? salaryValues.map(value => Math.round(value).toLocaleString()).join(' – ') : 'Competitive', tags: job.category?.label ? [job.category.label] : [], match: 'Live opportunity', url: job.redirect_url || null, noExpNeeded: /intern|apprentice|trainee|entry|junior|graduate|assistant/i.test(role) };
};
module.exports = function setupProxy(app) {
  app.use('/api/jobs', async (req, res) => {
    const query = String(req.query.query || '').trim(); const location = String(req.query.location || '').trim(); const internshipOnly = req.query.internship === 'true'; const apprenticeshipOnly = req.query.apprenticeship === 'true';
    const fallback = message => {
      return res.status(200).json({ jobs: [], source: 'fallback', message });
    };
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return fallback('Adzuna is not configured. Showing the demo feed.');
    try {
      const terms = [query, internshipOnly ? 'internship' : '', apprenticeshipOnly ? 'apprenticeship' : ''].filter(Boolean).join(' ');
      const params = new URLSearchParams({ app_id: ADZUNA_APP_ID, app_key: ADZUNA_APP_KEY, results_per_page: '25', 'content-type': 'application/json' });
      if (terms) params.set('what', terms); if (location) params.set('where', location);
      const upstream = await fetch(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(ADZUNA_COUNTRY)}/search/1?${params.toString()}`, { headers: { Accept: 'application/json' } });
      if (!upstream.ok) return fallback(upstream.status === 401 || upstream.status === 403 ? 'Adzuna credentials are invalid or not authorised. Showing demo data.' : `Adzuna returned HTTP ${upstream.status}. Showing demo data.`);
      const payload = await upstream.json(); const records = payload.results || [];
      return res.status(200).json({ jobs: records.map(normalize), source: 'adzuna', refreshedAt: new Date().toISOString(), total: payload.count || records.length });
    } catch (error) { console.error('[proxy] Error calling Adzuna:', error.message); return fallback('Could not reach Adzuna. Showing demo data.'); }
  });
};
