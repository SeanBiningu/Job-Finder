// Vercel serverless endpoint. The TheirStack key never reaches the browser.
const fallback = [
  { id: 'demo-1', logo: 'N', color: '#fff2e9', text: '#ff7752', company: 'Notion', role: 'Junior Product Designer', type: 'Full-time', place: 'Remote', time: '2d ago', salary: '$48-60k', tags: ['Figma', 'UI Design'], match: '94% match' },
  { id: 'demo-2', logo: 'M', color: '#f1edff', text: '#7662d7', company: 'Monzo', role: 'Graduate Data Analyst', type: 'Graduate', place: 'London, UK', time: '1d ago', salary: 'GBP 32-38k', tags: ['SQL', 'Python'], match: '89% match' },
  { id: 'demo-3', logo: 'Z', color: '#e6f6ef', text: '#16865d', company: 'ZimSwitch', role: 'Software Engineering Intern', type: 'Internship', place: 'Harare, Zimbabwe', time: 'Today', salary: 'Paid', tags: ['React', 'JavaScript'], match: '90% match' },
];

const normalize = (job, index) => ({
  id: job.id || job.job_id || `theirstack-${index}`,
  logo: (job.company_name || job.company || 'W').slice(0, 1).toUpperCase(),
  color: ['#eaf2ff', '#fff0df', '#e9f6ef', '#f1ecff'][index % 4],
  text: ['#4b7fd3', '#d97838', '#16865d', '#8569c9'][index % 4],
  company: job.company_name || job.company || 'Hiring company',
  role: job.job_title || job.title || 'Open position',
  type: job.employment_type || 'Full-time',
  place: job.location || job.job_location || 'Remote',
  time: job.date_posted ? new Date(job.date_posted).toLocaleDateString() : 'Recently posted',
  salary: job.salary_string || job.salary || 'Competitive',
  tags: (job.technologies || job.skills || []).slice(0, 2).map(String),
  match: 'New opportunity',
  url: job.url || job.job_url || job.application_url,
});

export default async function handler(req, res) {
  const query = String(req.query.query || '').trim();
  const location = String(req.query.location || '').trim();
  const internshipOnly = req.query.internship === 'true';
  if (!process.env.THEIRSTACK_API_KEY) {
    const needle = `${query} ${location}`.toLowerCase();
    const jobs = fallback.filter(job => (!internshipOnly || job.type === 'Internship') && (!needle || `${job.role} ${job.company} ${job.tags.join(' ')}`.toLowerCase().includes(needle)));
    return res.status(200).json({ jobs, source: 'demo', message: 'Add THEIRSTACK_API_KEY to enable live results.' });
  }
  try {
    const body = { page: 0, limit: 25, job_title_or: query ? [query] : undefined, location_or: location ? [location] : ['Zimbabwe', 'Remote'] };
    if (internshipOnly) body.job_title_or = query ? [query, 'intern', 'internship'] : ['intern', 'internship'];
    const response = await fetch('https://api.theirstack.com/v1/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.THEIRSTACK_API_KEY}`, 'X-API-Key': process.env.THEIRSTACK_API_KEY },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`TheirStack returned ${response.status}`);
    const payload = await response.json();
    const records = payload.data || payload.jobs || [];
    return res.status(200).json({ jobs: records.map(normalize), source: 'theirstack' });
  } catch (error) {
    return res.status(502).json({ jobs: [], source: 'error', message: 'Live search is temporarily unavailable.', detail: error.message });
  }
}
