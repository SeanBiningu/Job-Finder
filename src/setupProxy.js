/**
 * Local development proxy — keeps the TheirStack API key server-side only.
 * Create React App automatically loads this file when you run `npm start`.
 *
 * /api/jobs  →  TheirStack  (key injected here, never shipped to the browser)
 */
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const THEIRSTACK_KEY = process.env.THEIRSTACK_API_KEY || '';

module.exports = function setupProxy(app) {
  // Intercept every GET /api/jobs request from the React dev server
  app.use('/api/jobs', async (req, res) => {
    const query          = String(req.query.query         || '').trim();
    const location       = String(req.query.location      || '').trim();
    const internshipOnly = req.query.internship    === 'true';
    const apprenticeOnly = req.query.apprenticeship === 'true';

    // ── colour / letter helpers ──────────────────────────────────────────────
    const COLOURS = [
      { bg: '#eaf2ff', fg: '#4b7fd3' },
      { bg: '#fff0df', fg: '#d97838' },
      { bg: '#e9f6ef', fg: '#16865d' },
      { bg: '#f1ecff', fg: '#8569c9' },
      { bg: '#fff2e9', fg: '#ff7752' },
      { bg: '#e8f4fd', fg: '#2d7bb8' },
      { bg: '#fef3e7', fg: '#c8762d' },
      { bg: '#f5ffe8', fg: '#3a8a32' },
    ];

    const normalize = (job, index) => {
      const c = COLOURS[index % COLOURS.length];
      const companyName = job.company_name || job.company || job.company_object?.name || 'Hiring company';
      const skills = (job.technologies || job.skills || []).slice(0, 3).map(String);
      return {
        id:      job.id || job.job_id || `ts-${index}`,
        logo:    companyName.slice(0, 1).toUpperCase(),
        color:   c.bg,
        text:    c.fg,
        company: companyName,
        role:    job.job_title || job.title || job.position || 'Open position',
        type:    job.employment_type || 'Full-time',
        place:   job.location || job.job_location || 'Remote',
        time:    job.date_posted ? new Date(job.date_posted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently posted',
        salary:  job.salary_string || job.salary || 'Competitive',
        tags:    skills,
        match:   'Live opportunity',
        url:     job.url || job.job_url || job.application_url || null,
        noExpNeeded: /intern|apprentice|trainee|entry|junior|graduate|assistant/i.test(job.job_title || ''),
      };
    };

    const fallback = (message) => {
      console.warn('[proxy] Falling back to demo data:', message);
      const demoJobs = [
        { id: 'demo-1', logo: 'N', color: '#fff2e9', text: '#ff7752', company: 'Notion', role: 'Junior Product Designer', type: 'Full-time', place: 'Remote', time: '2d ago', salary: '$48–60k', tags: ['Figma', 'UI Design'], match: 'Demo', noExpNeeded: false },
        { id: 'demo-2', logo: 'M', color: '#f1edff', text: '#7662d7', company: 'Monzo', role: 'Graduate Data Analyst', type: 'Graduate', place: 'London, UK', time: '1d ago', salary: 'GBP 32–38k', tags: ['SQL', 'Python'], match: 'Demo', noExpNeeded: true },
        { id: 'demo-3', logo: 'Z', color: '#e6f6ef', text: '#16865d', company: 'ZimSwitch', role: 'Software Engineering Intern', type: 'Internship', place: 'Harare, Zimbabwe', time: 'Today', salary: 'Paid', tags: ['React', 'JavaScript'], match: 'Demo', noExpNeeded: true },
        { id: 'demo-4', logo: 'B', color: '#e8f4fd', text: '#2d7bb8', company: 'BT Group', role: 'Software Developer Apprentice', type: 'Apprenticeship', place: 'London, UK', time: '2d ago', salary: 'GBP 18–22k', tags: ['JavaScript', 'Cloud'], match: 'Demo', noExpNeeded: true },
        { id: 'demo-5', logo: 'D', color: '#fef3e7', text: '#c8762d', company: 'Deloitte', role: 'Business Analyst Apprentice', type: 'Apprenticeship', place: 'Harare, Zimbabwe', time: '1d ago', salary: 'Paid training', tags: ['Excel', 'Analysis'], match: 'Demo', noExpNeeded: true },
      ];
      const needle = `${query} ${location}`.toLowerCase();
      const filtered = demoJobs.filter(j =>
        (!internshipOnly || j.type === 'Internship') &&
        (!apprenticeOnly || j.type === 'Apprenticeship') &&
        (!needle.trim() || `${j.role} ${j.company} ${j.tags.join(' ')}`.toLowerCase().includes(needle))
      );
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ jobs: filtered, source: 'fallback', message });
    };

    if (!THEIRSTACK_KEY || THEIRSTACK_KEY === 'your_theirstack_api_key') {
      return fallback('TheirStack API key is not configured. Showing the demo feed.');
    }

    try {
      // Build TheirStack request body
      const body = {
        page: 0,
        // TheirStack's free plan allows a maximum of 25 records per request.
        limit: 25,
        posted_at_max_age_days: 30,
        job_location_pattern_or: location ? [location] : ['Zimbabwe', 'Remote', 'UK', 'London'],
      };

      if (query || internshipOnly || apprenticeOnly) {
        const baseTerms = query ? [query] : [];
        if (internshipOnly)  body.job_title_or = [...baseTerms, 'intern', 'internship'];
        else if (apprenticeOnly) body.job_title_or = [...baseTerms, 'apprentice', 'apprenticeship'];
        else if (baseTerms.length) body.job_title_or = baseTerms;
      }

      console.log('[proxy] → TheirStack request:', JSON.stringify(body, null, 2));

      const upstream = await fetch('https://api.theirstack.com/v1/jobs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${THEIRSTACK_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const raw = await upstream.text();
      console.log(`[proxy] ← TheirStack responded ${upstream.status}:`, raw.slice(0, 300));

      if (!upstream.ok) {
        const reason = upstream.status === 401
          ? 'TheirStack API key is invalid or expired. Showing demo data.'
          : `TheirStack returned HTTP ${upstream.status}. Showing demo data.`;
        return fallback(reason);
      }

      const payload = JSON.parse(raw);
      const records = payload.data || payload.jobs || [];

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        jobs: records.map(normalize),
        source: 'theirstack',
        refreshedAt: new Date().toISOString(),
        total: payload.metadata?.total || records.length,
      });
    } catch (err) {
      console.error('[proxy] Error calling TheirStack:', err.message);
      return fallback('Could not reach TheirStack. Showing demo data.');
    }
  });
};
