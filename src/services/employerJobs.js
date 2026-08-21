import { requireSupabase } from './supabase';

const palette = [
  { color: '#e5f4dd', text: '#337044' },
  { color: '#eaf2ff', text: '#4b7fd3' },
  { color: '#fff0df', text: '#d97838' },
  { color: '#f1ecff', text: '#8569c9' },
];

const dbJobType = (type) => ({
  Internship: 'internship',
  Apprenticeship: 'apprenticeship',
  Graduate: 'graduate',
  Contract: 'contract',
  'Part-time': 'part_time',
}[type] || 'full_time');

const displayJobType = (type) => ({
  internship: 'Internship', apprenticeship: 'Apprenticeship', graduate: 'Graduate',
  contract: 'Contract', part_time: 'Part-time', full_time: 'Full-time',
}[type] || 'Full-time');

const salaryRange = (value) => {
  const values = String(value || '').match(/\d[\d,.]*/g)?.map(item => Number(item.replace(/,/g, ''))).filter(Number.isFinite) || [];
  return { salary_min: values[0] || null, salary_max: values[1] || null };
};

const toCard = (job, index = 0) => {
  const style = palette[index % palette.length];
  const company = job.companies?.name || 'Hiring company';
  return {
    id: job.id, logo: company.slice(0, 1).toUpperCase(), color: style.color, text: style.text,
    company, role: job.title, type: displayJobType(job.job_type), place: job.location,
    time: job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently posted',
    salary: job.salary_min ? [job.salary_min, job.salary_max].filter(Boolean).map(value => value.toLocaleString()).join(' – ') : 'Competitive',
    tags: job.required_skills || [], match: 'Employer listing', noExpNeeded: /intern|apprentice|trainee|entry|junior|graduate|assistant/i.test(job.title),
    workStyle: job.is_remote ? 'Remote' : 'On-site', scheduled: !job.is_published, deadline: job.closes_at?.slice(0, 10) || '',
  };
};

export async function loadEmployerJobs(userId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('jobs')
    .select('id, title, location, is_remote, job_type, salary_min, salary_max, required_skills, is_published, closes_at, created_at, companies!inner(name, owner_id)')
    .eq('companies.owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toCard);
}

export async function createEmployerJob(userId, details) {
  const supabase = requireSupabase();
  const companyName = details.company.trim();
  let { data: company, error: companyError } = await supabase.from('companies')
    .select('id, name').eq('owner_id', userId).eq('name', companyName).maybeSingle();
  if (companyError) throw companyError;
  if (!company) {
    const result = await supabase.from('companies').insert({ owner_id: userId, name: companyName }).select('id, name').single();
    if (result.error) throw result.error;
    company = result.data;
  }
  const scheduled = details.publishDate && new Date(`${details.publishDate}T00:00`) > new Date();
  const result = await supabase.from('jobs').insert({
    company_id: company.id, title: details.role.trim(), description: details.description.trim(), location: details.place.trim() || 'Remote',
    is_remote: details.workStyle === 'Remote', job_type: dbJobType(details.type), required_skills: details.tags,
    is_published: !scheduled, closes_at: details.deadline || null, ...salaryRange(details.salary),
  }).select('id, title, location, is_remote, job_type, salary_min, salary_max, required_skills, is_published, closes_at, created_at, companies(name, owner_id)').single();
  if (result.error) throw result.error;
  return toCard(result.data);
}

export async function deleteEmployerJob(jobId) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  if (error) throw error;
}
