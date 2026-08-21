// Vercel serverless endpoint. The TheirStack key never reaches the browser.
const fallback = [
  { id: 'demo-1', logo: 'N', color: '#fff2e9', text: '#ff7752', company: 'Notion', role: 'Junior Product Designer', type: 'Full-time', place: 'Remote', time: '2d ago', salary: '$48-60k', tags: ['Figma', 'UI Design'], match: '94% match' },
  { id: 'demo-2', logo: 'M', color: '#f1edff', text: '#7662d7', company: 'Monzo', role: 'Graduate Data Analyst', type: 'Graduate', place: 'London, UK', time: '1d ago', salary: 'GBP 32-38k', tags: ['SQL', 'Python'], match: '89% match' },
  { id: 'demo-3', logo: 'Z', color: '#e6f6ef', text: '#16865d', company: 'ZimSwitch', role: 'Software Engineering Intern', type: 'Internship', place: 'Harare, Zimbabwe', time: 'Today', salary: 'Paid', tags: ['React', 'JavaScript'], match: '90% match' },
  { id: 'demo-4', logo: 'B', color: '#e8f4fd', text: '#2d7bb8', company: 'BT Group', role: 'Software Developer Apprentice', type: 'Apprenticeship', place: 'London, UK', time: '2d ago', salary: 'GBP 18-22k', tags: ['JavaScript', 'Cloud'], match: '88% match' },
  { id: 'demo-5', logo: 'D', color: '#fef3e7', text: '#c8762d', company: 'Deloitte', role: 'Business Analyst Apprentice', type: 'Apprenticeship', place: 'Harare, Zimbabwe', time: '1d ago', salary: 'Paid training', tags: ['Excel', 'Analysis'], match: '85% match' },
];

const normalize = (job, index) => ({
  id: job.id || job.job_id || `theirstack-${index}`,
  logo: (job.company_name || job.company || 'W').slice(0, 1).toUpperCase(),
  color: ['#eaf2ff', '#fff0df', '#e9f6ef', '#f1ecff'][index % 4],
  text: ['#4b7fd3', '#d97838', '#16865d', '#8569c9'][index % 4],
  company: job.company_name || job.company || job.company_object?.name || 'Hiring company',
  role: job.job_title || job.title || job.position || 'Open position',
  type: job.employment_type || 'Full-time',
  place: job.location || job.job_location || 'Remote',
  time: job.date_posted ? new Date(job.date_posted).toLocaleDateString() : 'Recently posted',
  salary: job.salary_string || job.salary || 'Competitive',
  tags: (job.technologies || job.skills || []).slice(0, 2).map(String),
  match: 'New opportunity',
  url: job.url || job.job_url || job.application_url,
  noExpNeeded: /intern|apprentice|trainee|entry|junior|graduate|assistant/i.test(job.job_title || ''),
});

export default async function handler(req, res) {
  const query = String(req.query.query || '').trim();
  const location = String(req.query.location || '').trim();
  const internshipOnly = req.query.internship === 'true';
  const apprenticeshipOnly = req.query.apprenticeship === 'true';
  const fallbackResults = message => {
    const needle = `${query} ${location}`.toLowerCase();
    const jobs = fallback.filter(job => (!internshipOnly || job.type === 'Internship') && (!apprenticeshipOnly || job.type === 'Apprenticeship') && (!needle || `${job.role} ${job.company} ${job.tags.join(' ')}`.toLowerCase().includes(needle)));
    return res.status(200).json({ jobs, source: 'fallback', message });
  };
  if (!process.env.THEIRSTACK_API_KEY) {
    return fallbackResults('Live jobs are not configured yet. Showing the local opportunity feed.');
  }
  try {
    const body = { page: 0, limit: 25, posted_at_max_age_days: 30, job_title_or: query ? [query] : undefined, job_location_pattern_or: location ? [location] : ['Zimbabwe', 'Remote'] };
    if (internshipOnly) body.job_title_or = query ? [query, 'intern', 'internship'] : ['intern', 'internship'];
    if (apprenticeshipOnly) body.job_title_or = query ? [query, 'apprentice', 'apprenticeship'] : ['apprentice', 'apprenticeship'];
    const response = await fetch('https://api.theirstack.com/v1/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.THEIRSTACK_API_KEY}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`TheirStack returned ${response.status}`);
    const payload = await response.json();
    const records = payload.data || payload.jobs || [];
    return res.status(200).json({ jobs: records.map(normalize), source: 'theirstack', refreshedAt: new Date().toISOString() });
  } catch (error) {
    const reason = error.message.includes('401')
      ? 'The live job provider is not authorised. Showing the local opportunity feed.'
      : 'The live job provider is temporarily unavailable. Showing the local opportunity feed.';
    return fallbackResults(reason);
  }
}
