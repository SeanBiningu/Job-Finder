// Vercel serverless endpoint. Adzuna credentials never reach the browser.
const fallback = [
  { id: 'demo-1', logo: 'N', color: '#fff2e9', text: '#ff7752', company: 'Notion', role: 'Junior Product Designer', type: 'Full-time', place: 'Remote', time: '2d ago', salary: '$48-60k', tags: ['Figma', 'UI Design'], match: '94% match' },
  { id: 'demo-2', logo: 'M', color: '#f1edff', text: '#7662d7', company: 'Monzo', role: 'Graduate Data Analyst', type: 'Graduate', place: 'London, UK', time: '1d ago', salary: 'GBP 32-38k', tags: ['SQL', 'Python'], match: '89% match' },
  { id: 'demo-3', logo: 'Z', color: '#e6f6ef', text: '#16865d', company: 'ZimSwitch', role: 'Software Engineering Intern', type: 'Internship', place: 'Harare, Zimbabwe', time: 'Today', salary: 'Paid', tags: ['React', 'JavaScript'], match: '90% match' },
  { id: 'demo-4', logo: 'B', color: '#e8f4fd', text: '#2d7bb8', company: 'BT Group', role: 'Software Developer Apprentice', type: 'Apprenticeship', place: 'London, UK', time: '2d ago', salary: 'GBP 18-22k', tags: ['JavaScript', 'Cloud'], match: '88% match' },
  { id: 'demo-5', logo: 'D', color: '#fef3e7', text: '#c8762d', company: 'Deloitte', role: 'Business Analyst Apprentice', type: 'Apprenticeship', place: 'Harare, Zimbabwe', time: '1d ago', salary: 'Paid training', tags: ['Excel', 'Analysis'], match: '85% match' },
];

const palette = [
  { color: '#eaf2ff', text: '#4b7fd3' },
  { color: '#fff0df', text: '#d97838' },
  { color: '#e9f6ef', text: '#16865d' },
  { color: '#f1ecff', text: '#8569c9' },
];

const normalize = (job, index) => {
  const style = palette[index % palette.length];
  const company = job.company?.display_name || 'Hiring company';
  const title = job.title || 'Open position';
  const location = job.location?.display_name || 'Remote';
  const hasSalary = Number.isFinite(job.salary_min) || Number.isFinite(job.salary_max);
  const salary = hasSalary
    ? [job.salary_min, job.salary_max].filter(Number.isFinite).map(value => Math.round(value).toLocaleString()).join(' – ')
    : 'Competitive';

  return {
  id: job.id || `adzuna-${index}`,
  logo: company.slice(0, 1).toUpperCase(),
  color: style.color,
  text: style.text,
  company,
  role: title,
  type: job.contract_time === 'full_time' ? 'Full-time' : job.contract_time === 'part_time' ? 'Part-time' : job.contract_type ? job.contract_type.replace(/^./, char => char.toUpperCase()) : 'Not specified',
  place: location,
  time: job.created ? new Date(job.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently posted',
  salary,
  tags: job.category?.label ? [job.category.label] : [],
  match: 'New opportunity',
  url: job.redirect_url || null,
  noExpNeeded: /intern|apprentice|trainee|entry|junior|graduate|assistant/i.test(title),
};
};

export default async function handler(req, res) {
  const query = String(req.query.query || '').trim();
  const location = String(req.query.location || '').trim();
  const internshipOnly = req.query.internship === 'true';
  const apprenticeshipOnly = req.query.apprenticeship === 'true';
  const fallbackResults = message => {
    const needle = `${query} ${location}`.toLowerCase();
    return res.status(200).json({ jobs: [], source: 'fallback', message });
  };
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = (process.env.ADZUNA_COUNTRY || 'za').toLowerCase();
  if (!appId || !appKey) {
    return fallbackResults('Live jobs are not configured yet. Showing the local opportunity feed.');
  }
  try {
    const terms = [query, internshipOnly ? 'internship' : '', apprenticeshipOnly ? 'apprenticeship' : ''].filter(Boolean).join(' ');
    const params = new URLSearchParams({ app_id: appId, app_key: appKey, results_per_page: '25', 'content-type': 'application/json' });
    if (terms) params.set('what', terms);
    if (location) params.set('where', location);
    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/1?${params.toString()}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Adzuna returned ${response.status}`);
    const payload = await response.json();
    const records = payload.results || [];
    return res.status(200).json({ jobs: records.map(normalize), source: 'adzuna', refreshedAt: new Date().toISOString(), total: payload.count || records.length });
  } catch (error) {
    const reason = /401|403/.test(error.message)
      ? 'The Adzuna credentials are invalid or not authorised. Showing the local opportunity feed.'
      : 'The live job provider is temporarily unavailable. Showing the local opportunity feed.';
    return fallbackResults(reason);
  }
}
