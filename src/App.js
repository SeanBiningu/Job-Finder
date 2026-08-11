import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import './App.css';
import { searchJobs } from './services/jobSearch';
import { useJobFeed } from './services/useJobFeed';

// PDF.js needs a dedicated worker to read uploaded PDF text in the browser.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();

const ROLE_KEYWORDS = {
  design: ['Figma', 'Wireframing', 'Prototyping', 'User research', 'Design systems', 'Usability testing'],
  marketing: ['SEO', 'Content strategy', 'Google Analytics', 'Campaign management', 'Social media', 'Email marketing'],
  data: ['SQL', 'Excel', 'Python', 'Tableau', 'Power BI', 'Data analysis'],
  software: ['JavaScript', 'React', 'Git', 'APIs', 'Testing', 'Agile'],
  sales: ['CRM', 'Lead generation', 'Pipeline management', 'Negotiation', 'Account management', 'Salesforce'],
  project: ['Project management', 'Stakeholder management', 'Agile', 'Risk management', 'Budget management', 'Scrum'],
  customer: ['Customer service', 'CRM', 'Conflict resolution', 'Customer satisfaction', 'Communication', 'Problem solving'],
  general: ['Communication', 'Collaboration', 'Problem solving', 'Attention to detail', 'Time management', 'Microsoft Office'],
};

const includesPhrase = (text, phrase) => new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&').replace(/\\s+/g, '\\s+')}\\b`, 'i').test(text);
const unique = values => [...new Set(values)];

const roleKeywordSet = role => {
  const value = String(role || '').toLowerCase();
  const group = Object.keys(ROLE_KEYWORDS).find(key => key !== 'general' && value.includes(key));
  return unique([...(group ? ROLE_KEYWORDS[group] : []), ...ROLE_KEYWORDS.general]);
};

const extractResumeText = async file => {
  if (!file) throw new Error('Please select a CV file first.');
  const fileName = typeof file.name === 'string' ? file.name : '';
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return typeof result.value === 'string' ? result.value : '';
  }
  if (extension === 'pdf') {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), stopAtErrors: false });
      const document = await loadingTask.promise;
      const pages = await Promise.all(Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items.map(item => typeof item?.str === 'string' ? item.str : '').filter(Boolean).join(' ');
      }));
      let text = pages.join('\n').trim();
      if (text.replace(/\s/g, '').length < 20) text = await extractScannedPdfText(document);
      if (text.replace(/\s/g, '').length < 20) throw new Error('We could not detect readable text in this PDF, even after OCR. Please use a clearer scan or a DOCX copy.');
      return text;
    } catch (error) {
      if (error?.name === 'PasswordException') throw new Error('This PDF is password-protected. Please upload an unlocked copy.');
      if (error?.message?.includes('detect readable text')) throw error;
      throw new Error('We could not read this PDF. Try a clearer scan, an unlocked PDF, or a DOCX copy.');
    }
  }
  if (extension === 'doc') throw new Error('Legacy .doc files cannot be read in the browser. Please upload a PDF or DOCX version of your CV.');
  return typeof file.text === 'function' ? (await file.text()) || '' : '';
};

const extractScannedPdfText = async pdfDocument => {
  const worker = await createWorker('eng');
  const pageCount = Math.min(pdfDocument.numPages, 8);
  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) continue;
      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      if (result.data?.text) pages.push(result.data.text);
      canvas.width = 0;
      canvas.height = 0;
    }
    return pages.join('\n').trim();
  } finally {
    await worker.terminate();
  }
};

const buildAtsReport = (text, role) => {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const keywords = roleKeywordSet(role);
  const found = keywords.filter(keyword => includesPhrase(cleanText, keyword));
  const missing = keywords.filter(keyword => !includesPhrase(cleanText, keyword)).slice(0, 4);
  const hasContact = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?[\d\s().-]{8,}/i.test(cleanText);
  const hasExperience = /experience|employment|work history|professional experience/i.test(cleanText);
  const hasSkillsHeading = /\b(skills|technical skills|core competencies|key skills)\b/i.test(cleanText);
  const hasOutcomes = /\b\d+(?:[,.]\d+)?\s*(?:%|percent|x|hours?|days?|weeks?|months?|years?|customers?|clients?|projects?|users?|team members?|k|m)\b/i.test(cleanText) || /\b(increased|reduced|improved|grew|saved|delivered|achieved)\b[^.]{0,70}\b\d+/i.test(cleanText);
  const structuralItems = [
    { label: 'Contact details', note: hasContact ? 'Email or phone contact found in your CV' : 'Add an email address or phone number near the top of your CV', pass: hasContact },
    { label: 'Experience section', note: hasExperience ? 'Experience section found and ready to scan' : 'Use a clear Experience or Employment heading', pass: hasExperience },
    { label: 'Skills section', note: hasSkillsHeading ? `${found.length} matching skill${found.length === 1 ? '' : 's'} found for this role` : 'Add a clearly labelled skills section with relevant tools and strengths', pass: hasSkillsHeading && found.length > 0 },
    { label: 'Quantified outcomes', note: hasOutcomes ? 'Measurable results or numbers found in your CV' : 'Add results with numbers, percentages, time saved, or project scale', pass: hasOutcomes },
  ];
  const score = Math.min(98, Math.max(20, 30 + (hasContact ? 15 : 0) + (hasExperience ? 15 : 0) + (hasSkillsHeading ? 12 : 0) + (hasOutcomes ? 15 : 0) + Math.round((found.length / keywords.length) * 13)));
  return { found: found.length ? found : ['No role-specific keywords found'], missing: missing.length ? missing : ['No priority keyword gaps found'], structuralItems, score, textLength: cleanText.length };
};

const parseResumeText = text => {
  const source = typeof text === 'string' ? text : '';
  const lines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const email = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = source.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || '';
  const name = lines.find(line => line.length > 2 && line.length < 60 && !/@|\d{4}|experience|education|skills|summary|profile|curriculum vitae|resume/i.test(line)) || '';
  const sectionPattern = /(?:profile|summary|about me|personal statement|professional summary|objective)[:\s]*([\s\S]*?)(?=\n\s*(?:experience|employment|work history|education|skills|projects|certifications|references)\b|$)/i;
  const skillsPattern = /(?:skills|technical skills|core competencies|key skills|tools)[:\s]*([\s\S]*?)(?=\n\s*(?:experience|employment|work history|education|projects|certifications|references|achievements)\b|$)/i;
  const rolePattern = /(?:seeking|targeting|applying for|objective|desired role|target role)[:\s-]*(.{4,70})/i;
  const summaryMatch = source.match(sectionPattern);
  const skillsMatch = source.match(skillsPattern);
  const roleMatch = source.match(rolePattern);
  const skills = skillsMatch
    ? skillsMatch[1].split(/[,Â·â€¢|/\n]/).map(item => item.replace(/^[-â€¢\s]+/, '').trim()).filter(item => item.length > 1 && item.length < 45)
    : [];
  const achievements = [];
  const achievementPattern = /(?:increased|reduced|improved|grew|saved|delivered|achieved|managed|led|created|built|designed|launched)[^.!\n]{0,90}\d+[^.!\n]*/gi;
  let achievementMatch;
  while ((achievementMatch = achievementPattern.exec(source)) !== null && achievements.length < 3) {
    achievements.push(achievementMatch[0].replace(/\s+/g, ' ').trim());
  }
  return {
    personalInfo: { name, email, phone },
    summary: summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim().slice(0, 600) : '',
    skills: [...new Set(skills)].slice(0, 14),
    targetRole: roleMatch ? roleMatch[1].replace(/\s+/g, ' ').trim() : '',
    achievements,
  };
};

const Icon = ({ name, size = 20 }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>, map: <><path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>, bookmark: <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V21l-6-3.8L6 21V3.5Z"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>, check: <path d="m5 12 4 4L19 6"/>, grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>, spark: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/>, download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>, upload: <><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></>, file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12A2 2 0 0 0 20 20V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></>,
    refresh: <><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64L3 21"/><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 3"/><path d="M21 3v6h-6"/><path d="M3 21v-6h6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

/** Live feed status badge shown in the header */
function LiveBadge({ source, lastRefreshed, loading, onRefresh }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (!lastRefreshed) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastRefreshed.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [lastRefreshed]);

  const label = loading
    ? 'Refreshingâ€¦'
    : source === 'theirstack'
      ? `Live Â· ${secondsAgo < 60 ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}m`} ago`
      : source === 'fallback'
        ? 'Demo feed'
        : 'Loadingâ€¦';

  const dot = source === 'theirstack' && !loading ? 'live-dot--green' : source === 'fallback' ? 'live-dot--amber' : 'live-dot--grey';

  return (
    <button className="live-badge" onClick={onRefresh} title="Click to refresh now" aria-label="Refresh job feed">
      <span className={`live-dot ${dot}`}/>
      {label}
    </button>
  );
}

const jobs = [
  { id: 1, logo: 'N', color: '#fff2e9', text: '#ff7752', company: 'Notion', role: 'Junior Product Designer', type: 'Full-time', place: 'Remote', time: '2d ago', salary: '$48-60k', tags: ['Figma', 'UI Design'], match: '94% match' },
  { id: 2, logo: 'M', color: '#f1edff', text: '#7662d7', company: 'Monzo', role: 'Graduate Data Analyst', type: 'Graduate', place: 'London, UK', time: '1d ago', salary: 'GBP 32-38k', tags: ['SQL', 'Python'], match: '89% match' },
  { id: 3, logo: 'S', color: '#e6f6ef', text: '#16865d', company: 'Spotify', role: 'Marketing Intern', type: 'Internship', place: 'Remote', time: '3d ago', salary: 'Paid', tags: ['Content', 'Social'], match: '86% match', noExpNeeded: true },
  { id: 4, logo: 'C', color: '#eaf2ff', text: '#4b7fd3', company: 'Canva', role: 'Junior Front-end Developer', type: 'Full-time', place: 'Remote', time: '5h ago', salary: '$52-66k', tags: ['React', 'JavaScript'], match: '91% match' },
  { id: 5, logo: 'A', color: '#fff0df', text: '#e47b3d', company: 'Airbnb', role: 'Community Operations Intern', type: 'Internship', place: 'Dublin, IE', time: '1d ago', salary: 'EUR 1,800/mo', tags: ['Support', 'Operations'], match: '82% match', noExpNeeded: true },
  { id: 6, logo: 'H', color: '#f1ecff', text: '#8569c9', company: 'HubSpot', role: 'Associate Account Executive', type: 'Entry level', place: 'Remote', time: '4d ago', salary: '$45-55k', tags: ['Sales', 'CRM'], match: '78% match', noExpNeeded: true },
  { id: 7, logo: 'B', color: '#e8f4fd', text: '#2d7bb8', company: 'BT Group', role: 'Software Developer Apprentice', type: 'Apprenticeship', place: 'London, UK', time: '2d ago', salary: 'GBP 18-22k', tags: ['JavaScript', 'Cloud'], match: '88% match', noExpNeeded: true },
  { id: 8, logo: 'D', color: '#fef3e7', text: '#c8762d', company: 'Deloitte', role: 'Business Analyst Apprentice', type: 'Apprenticeship', place: 'Harare, Zimbabwe', time: '1d ago', salary: 'Paid training', tags: ['Excel', 'Analysis'], match: '85% match', noExpNeeded: true },
  { id: 9,  logo: 'T', color: '#e9f7f2', text: '#1a8a6d', company: 'TikTok', role: 'Content Moderator Trainee', type: 'Entry level', place: 'Remote', time: '6h ago', salary: '$18-22/hr', tags: ['Attention', 'Communication'], match: '90% match', noExpNeeded: true },
  { id: 10, logo: 'G', color: '#fff5e5', text: '#d4831a', company: 'Grubhub', role: 'Customer Support Representative', type: 'Entry level', place: 'Remote', time: '12h ago', salary: '$16-20/hr', tags: ['Customer Service', 'Chat'], match: '87% match', noExpNeeded: true },
  { id: 11, logo: 'Z', color: '#f0ecff', text: '#6a58c8', company: 'Zapier', role: 'Community Forum Moderator', type: 'Volunteer', place: 'Remote', time: '2d ago', salary: 'Unpaid / remote', tags: ['Communication', 'Tech'], match: '80% match', noExpNeeded: true },
  { id: 12, logo: 'L', color: '#e8f5fe', text: '#2077b9', company: 'LinkedIn', role: 'Data Entry Associate', type: 'Entry level', place: 'Remote', time: '3d ago', salary: '$15-18/hr', tags: ['Excel', 'Detail'], match: '83% match', noExpNeeded: true },
  { id: 13, logo: 'U', color: '#f5ffe8', text: '#3a8a32', company: 'Upwork', role: 'Freelance Writing (Beginner)', type: 'Freelance', place: 'Remote', time: '1d ago', salary: 'Project-based', tags: ['Writing', 'Research'], match: '76% match', noExpNeeded: true },
  { id: 14, logo: 'R', color: '#fff0f5', text: '#c84a7a', company: 'Red Cross', role: 'Volunteer Coordinator Trainee', type: 'Volunteer', place: 'Harare, Zimbabwe', time: '4d ago', salary: 'Volunteer', tags: ['Organisation', 'People'], match: '88% match', noExpNeeded: true },
];

function JobCard({ job, saved, applied, onSave, onApply }) {
  return <article className="job-card"><div className="company-logo" style={{ background: job.color, color: job.text }}>{job.logo}</div><div className="job-info"><div className="job-top"><span>{job.company}</span><small>{job.time}</small></div><h3>{job.role}</h3><div className="meta"><span>{job.type}</span><i/><span>{job.place}</span><i/><span>{job.salary}</span></div><div className="tags">{job.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><div className="job-side"><span className="match"><Icon name="spark" size={13}/>{job.match}</span><div className="card-actions"><button className="apply-small" onClick={() => onApply(job)}>{applied ? 'Applied' : 'Apply'}</button><button aria-label="Save job" className={saved ? 'save saved' : 'save'} onClick={() => onSave(job.id)}><Icon name="bookmark" size={19}/></button></div></div></article>;
}

function Discover({ setActive, notify }) {
  const [interest, setInterest] = useState('Design & creative'); const [pathStep, setPathStep] = useState(1); const [exploring, setExploring] = useState(false); const [seatSaved, setSeatSaved] = useState(false);
  const choose = title => { setInterest(title); setExploring(true); notify(`${title} explorer opened`); };
  return <>
    <section className="hero"><div className="hero-copy"><span className="eyebrow"><Icon name="spark" size={14}/> Your next chapter starts here</span><h1>Find work that<br/><em>moves you forward.</em></h1><p>Discover early-career roles, prove your skills, and build a future you are proud of.</p><button className="hero-cta" onClick={() => setActive('Find jobs')}>Browse opportunities <Icon name="arrow" size={18}/></button></div><div className="hero-art"><div className="sun"/><div className="abstract-card card-one"><b>+</b><span>Career<br/>momentum</span></div><div className="abstract-card card-two"><span className="ring"/><b>Skills unlocked</b></div><div className="profile-photo"><div className="photo-face">~</div></div><div className="floating-badge"><span className="tick"><Icon name="check" size={16}/></span><div><b>Profile strength</b><small>Looking great! 82%</small></div></div></div></section>
    <section className="trust-row"><div><b>24,000+</b><small>people found a role</small></div><div><b>1,800+</b><small>growing companies</small></div><div><b>92%</b><small>feel more career-ready</small></div><p>"Workly helped me turn what I learned into a role I love." <strong>- Jamie, Product Designer</strong></p></section>
    <section className="discover-hub"><div className="discover-heading"><div><span className="eyebrow muted">Discover your direction</span><h2>Explore what feels like you</h2><p>Follow your curiosity. We will connect it to practical skills, people and opportunities.</p></div></div><div className="interest-grid">{[['Design & creative','Turn ideas into experiences','*','lilac'],['Tech & data','Build what comes next','</>','mint'],['People & community','Make work more human','+','peach'],['Business & impact','Help good ideas grow','>','sky']].map(([title, copy, symbol, tone]) => <button key={title} onClick={() => choose(title)} className={`interest-card ${tone} ${interest === title ? 'selected' : ''}`}><span className="interest-symbol">{symbol}</span><div><b>{title}</b><small>{copy}</small></div><span className="interest-arrow"><Icon name="arrow" size={15}/></span></button>)}</div>{exploring && <div className="explorer-panel"><div><span className="eyebrow muted">Your {interest} explorer</span><h3>Start with the things that make you curious.</h3><p>We picked practical first steps, useful skills and early-career roles that connect with this direction.</p></div><div className="explorer-list"><span><Icon name="check" size={13}/> Explore 12 starter roles</span><span><Icon name="check" size={13}/> Learn 4 in-demand skills</span><span><Icon name="check" size={13}/> Meet people in this field</span></div><button onClick={() => setActive('Find jobs')}>Explore opportunities <Icon name="arrow" size={16}/></button></div>}<div className="discovery-lower"><article className="path-card"><div className="path-copy"><span className="eyebrow">Your weekly path</span><h3>Build momentum,<br/><em>one small step at a time.</em></h3><p>Complete a quick action today and get closer to work you will enjoy.</p><button onClick={() => { setPathStep(pathStep === 3 ? 1 : pathStep + 1); notify(pathStep === 3 ? 'New weekly path started' : 'Nice work - your momentum has increased'); }}>Continue my path <Icon name="arrow" size={16}/></button></div><div className="path-steps">{['Add two skills','Try a skills check','Save three roles'].map((step,index) => <div className={index < pathStep ? 'path-step done' : 'path-step'} key={step}><span>{index < pathStep ? <Icon name="check" size={13}/> : index + 1}</span><div><b>{step}</b><small>{index < pathStep ? 'Completed' : index === pathStep ? 'Up next - 5 mins' : 'Locked until next step'}</small></div></div>)}</div></article><article className="event-card"><div className="event-top"><span className="event-date"><b>08</b><small>AUG</small></span><span className="live-dot">Live session</span></div><span className="eyebrow muted">Career room</span><h3>How to land your first design role</h3><p>Hear from product designers on building a portfolio that gets noticed.</p><div className="event-bottom"><small>{seatSaved ? 'Your seat is reserved' : '128 people joining'}</small><button className={seatSaved ? 'seat-saved' : ''} onClick={() => { setSeatSaved(!seatSaved); notify(seatSaved ? 'Seat released' : 'Your seat has been saved'); }}>{seatSaved ? <><Icon name="check" size={13}/> Seat saved</> : 'Save my seat'}</button></div></article></div></section>
  </>;
}

function BrowseJobs({ internshipOnly, apprenticeshipOnly, programmesOnly, saved, applications, onSave, onApply, jobList = jobs }) {
  const categoryOnly = internshipOnly ? 'Internship' : apprenticeshipOnly ? 'Apprenticeship' : null;
  const [query, setQuery] = useState(''); const [location, setLocation] = useState(categoryOnly ? 'Zimbabwe' : 'Zimbabwe, Remote'); const [remote, setRemote] = useState(false); const [type, setType] = useState('All'); const [noExperienceOnly, setNoExperienceOnly] = useState(false); const [liveJobs, setLiveJobs] = useState(jobList); const [searching, setSearching] = useState(false); const [source, setSource] = useState('sample'); const [feedMessage, setFeedMessage] = useState(''); const [error, setError] = useState('');
  const displayed = useMemo(() => liveJobs.filter(job => (!categoryOnly || job.type === categoryOnly) && (!programmesOnly || ['Internship', 'Apprenticeship'].includes(job.type)) && (type === 'All' || job.type === type) && (!remote || job.place === 'Remote') && (!noExperienceOnly || job.noExpNeeded) && `${job.role} ${job.company} ${job.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [categoryOnly, programmesOnly, type, remote, noExperienceOnly, query, liveJobs]);
  const filters = programmesOnly ? ['All', 'Internship', 'Apprenticeship', 'Remote'] : internshipOnly ? ['All', 'Remote', 'Marketing', 'Tech'] : apprenticeshipOnly ? ['All', 'Remote', 'Tech', 'Business'] : ['All', 'Full-time', 'Graduate', 'Entry level'];
  const hero = internshipOnly
    ? { eyebrow: 'Learn by doing', title: 'Internships that open doors.', copy: 'Paid placements and early experience with teams ready to help you grow.', placeholder: 'Search internship, skill or company' }
    : apprenticeshipOnly
      ? { eyebrow: 'Earn while you learn', title: 'Apprenticeships that build real skills.', copy: 'Structured training with employers committed to your development.', placeholder: 'Search apprenticeship, skill or company' }
      : programmesOnly
        ? { eyebrow: 'Learn, earn and grow', title: 'Early-career programmes that open doors.', copy: 'Explore internships and apprenticeships designed to help you build practical skills.', placeholder: 'Search internship, apprenticeship, skill or company' }
      : { eyebrow: 'Job search', title: 'Find your next opportunity.', copy: 'Search entry-level roles in Zimbabwe and around the world.', placeholder: 'Search job title, skill or company' };
  const setFilter = filter => { if (filter === 'Remote') setRemote(!remote); else { setType(filter); setRemote(false); } };
  const runSearch = async () => { setSearching(true); setError(''); try { const result = await searchJobs({ query, location, internshipOnly, apprenticeshipOnly }); setLiveJobs(result.jobs); setSource(result.source); setFeedMessage(result.message || ''); } catch (err) { setError('We could not reach the job feed. Please try again.'); } finally { setSearching(false); } };
  return <section className="browse-page"><div className="browse-hero"><span className="eyebrow">{hero.eyebrow}</span><h1>{hero.title}</h1><p>{hero.copy}</p><div className="browse-search"><Icon name="search"/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder={hero.placeholder}/><Icon name="map"/><input className="location-search" value={location} onChange={e => setLocation(e.target.value)} placeholder="Zimbabwe, Remote or anywhere"/><button onClick={runSearch} disabled={searching}>{searching ? 'Searching...' : 'Search'}</button></div></div><div className="results-shell"><aside className="filter-panel"><b>Refine your search</b><div className="filter-group"><span>Role type</span>{filters.map(filter => <button key={filter} onClick={() => setFilter(filter)} className={(type === filter || (filter === 'Remote' && remote)) ? 'filter-choice checked' : 'filter-choice'}>{filter === 'Remote' ? 'Remote only' : filter}<i/></button>)}</div><div className="filter-group"><span>Experience</span><button onClick={() => setNoExperienceOnly(value => !value)} className={noExperienceOnly ? 'filter-choice checked' : 'filter-choice'}>No experience needed<i/></button><button className="filter-choice">0-2 years<i/></button></div></aside><div className="search-results"><div className="results-title"><div><h2>{displayed.length} opportunities found</h2><p>{noExperienceOnly ? 'Showing roles that welcome applicants with no prior experience.' : source === 'theirstack' ? 'Live results powered by TheirStack.' : source === 'fallback' ? feedMessage : 'Matches based on your profile and search.'}</p></div><button className="sort-button">Most relevant</button></div>{error && <div className="search-error">{error}</div>}<div className="jobs-list">{displayed.length ? displayed.map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applications.some(a => a.id === job.id)} onSave={onSave} onApply={onApply}/>) : <div className="empty">No opportunities match these filters. Try changing your search.</div>}</div></div></div></section>;
}

function NoExpNeeded({ saved, applications, onSave, onApply, jobList = jobs }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const noExpJobs = jobList.filter(j => j.noExpNeeded);
  const displayed = useMemo(() =>
    noExpJobs.filter(job =>
      (typeFilter === 'All' || job.type === typeFilter) &&
      (!remoteOnly || job.place === 'Remote') &&
      `${job.role} ${job.company} ${job.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
    ),
    [noExpJobs, typeFilter, remoteOnly, query]
  );
  const setFilter = f => { if (f === 'Remote') setRemoteOnly(r => !r); else { setTypeFilter(f); setRemoteOnly(false); } };
  const filters = ['All', 'Entry level', 'Internship', 'Apprenticeship', 'Volunteer', 'Freelance', 'Remote'];
  return (
    <section className="browse-page">
      <div className="noexp-hero">
        <span className="eyebrow"><Icon name="spark" size={13}/> Zero barrier entry</span>
        <h1>No qualifications.<br/><em>No experience.</em><br/>Just opportunity.</h1>
        <p>Every role here welcomes you exactly as you are. No CV gap anxiety, no degree required â€” just the drive to start.</p>
        <div className="noexp-badges">
          <span><Icon name="check" size={13}/> No degree required</span>
          <span><Icon name="check" size={13}/> No prior work history needed</span>
          <span><Icon name="check" size={13}/> Training provided on the job</span>
        </div>
        <div className="browse-search" style={{ marginTop: '22px', maxWidth: '620px' }}>
          <Icon name="search"/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search role, skill or company"/>
        </div>
      </div>
      <div className="results-shell">
        <aside className="filter-panel">
          <b>Filter roles</b>
          <div className="filter-group">
            <span>Role type</span>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={(typeFilter === f || (f === 'Remote' && remoteOnly)) ? 'filter-choice checked' : 'filter-choice'}>
                {f === 'Remote' ? 'Remote only' : f}<i/>
              </button>
            ))}
          </div>
          <div className="noexp-callout">
            <Icon name="spark" size={15}/>
            <div>
              <b>Fresh start guarantee</b>
              <small>Every listing here is verified to require zero prior experience or formal qualifications.</small>
            </div>
          </div>
        </aside>
        <div className="search-results">
          <div className="results-title">
            <div>
              <h2>{displayed.length} zero-barrier roles</h2>
              <p>Curated jobs that open doors â€” no experience necessary.</p>
            </div>
            <button className="sort-button">Most relevant</button>
          </div>
          <div className="jobs-list">
            {displayed.length
              ? displayed.map(job => (
                  <div key={job.id} className="noexp-card-wrap">
                    <span className="noexp-badge-pill"><Icon name="check" size={11}/> No experience needed</span>
                    <JobCard job={job} saved={saved.includes(job.id)} applied={applications.some(a => a.id === job.id)} onSave={onSave} onApply={onApply}/>
                  </div>
                ))
              : <div className="empty">No roles match these filters. Try broadening your search.</div>
            }
          </div>
        </div>
      </div>
    </section>
  );
}

function Applications({ applications, setActive }) {
  return <section className="applications-page"><div className="applications-head"><span className="eyebrow muted">My job search</span><h1>Keep moving forward.</h1><p>Everything you have applied for, in one calm place.</p></div><div className="application-summary"><div><b>{applications.length}</b><span>Applications sent</span></div><div><b>{applications.filter(a => a.status === 'Reviewing').length}</b><span>In review</span></div><div><b>{applications.filter(a => a.status === 'Interview').length}</b><span>Interviews</span></div></div>{applications.length ? <div className="application-list">{applications.map(app => <article className="application-row" key={app.id}><div className="company-logo" style={{ background: app.color, color: app.text }}>{app.logo}</div><div><b>{app.role}</b><span>{app.company} Â· Applied today</span></div><span className={`status ${app.status.toLowerCase()}`}>{app.status}</span><button>View application <Icon name="arrow" size={15}/></button></article>)}</div> : <div className="no-applications"><span className="empty-icon"><Icon name="briefcase" size={26}/></span><h2>Your application list is waiting.</h2><p>When you find a role you like, apply in one click and track your progress here.</p><button onClick={() => setActive('Find jobs')}>Find jobs <Icon name="arrow" size={16}/></button></div>}</section>;
}

function Resumly({ setActive, notify }) {
  const [role, setRole] = useState('Junior Product Designer');
  const [audited, setAudited] = useState(false);
  const [region, setRegion] = useState('Regional standard');
  const [cvFile, setCvFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const keywords = role.includes('Data') ? ['SQL', 'Excel', 'data cleaning', 'dashboards'] : ['Figma', 'user research', 'wireframes', 'design systems'];
  const addCV = file => {
    if (!file) return;
    const accepted = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!accepted.includes(file.type) || file.size > 5 * 1024 * 1024) { setUploadError('Upload a PDF, DOC or DOCX file up to 5 MB.'); return; }
    setCvFile(file); setUploadError(''); setAudited(false); notify(`${file.name} is ready for review`);
  };
  const auditCV = () => { if (!cvFile) { setUploadError('Attach your CV before starting the audit.'); return; } setAudited(true); notify('Resumly.ai audit completed'); };
  return <section className="resumly-page"><div className="resumly-hero"><span className="resumly-brand"><span>R</span> Resumly.ai</span><span className="eyebrow">Your application co-pilot</span><h1>Make your CV speak<br/><em>the ATS language.</em></h1><p>Built for regional hiring: reverse-engineer local job boards and global ATS patterns before you apply.</p><div className="resumly-controls"><label>Target role<input value={role} onChange={e => setRole(e.target.value)} /></label><label>Hiring market<select value={region} onChange={e => setRegion(e.target.value)}><option>Regional standard</option><option>United Kingdom</option><option>European Union</option><option>Global / remote</option></select></label><button onClick={auditCV}>Audit my CV <Icon name="arrow" size={17}/></button></div></div><div className="cv-upload-wrap"><div><span className="eyebrow muted">Step 1 Â· Your CV</span><h2>Attach your CV for a tailored check</h2><p>Resumly uses your document to assess ATS format, skills and keywords. Your file stays private.</p></div><label className={cvFile ? 'cv-dropzone uploaded' : 'cv-dropzone'}><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => addCV(e.target.files?.[0])}/>{cvFile ? <><span className="cv-file-icon"><Icon name="file" size={21}/></span><span className="cv-file-details"><b>{cvFile.name}</b><small>{(cvFile.size / 1024 / 1024).toFixed(1)} MB Â· Ready to audit</small></span><span className="change-file">Change</span></> : <><span className="cv-upload-icon"><Icon name="upload" size={21}/></span><span><b>Drop your CV here or browse</b><small>PDF, DOC or DOCX Â· Maximum 5 MB</small></span></>}</label>{uploadError && <p className="upload-error">{uploadError}</p>}</div>{audited ? <div className="audit-grid"><article className="audit-score"><span>ATS readiness score</span><div className="score-ring"><b>78</b><small>/100</small></div><strong>Strong foundation</strong><p>Your CV is readable by most systems. A few targeted improvements could make it more competitive for this role.</p><button onClick={() => setActive('Find jobs')}>Find matching jobs <Icon name="arrow" size={15}/></button></article><article className="audit-panel"><div className="audit-heading"><div><span className="eyebrow muted">Keyword gap analysis</span><h2>What recruiters will look for</h2></div><span className="market-tag">{region}</span></div><div className="keyword-row"><span>Found in your CV</span><div>{keywords.slice(0, 2).map(word => <b className="keyword found" key={word}><Icon name="check" size={12}/>{word}</b>)}</div></div><div className="keyword-row"><span>Worth adding</span><div>{keywords.slice(2).map(word => <b className="keyword missing" key={word}>+ {word}</b>)}</div></div><div className="audit-tip"><Icon name="spark" size={18}/><p><b>Resumly tip:</b> Add one outcome for each key skill, such as â€œCreated 12 reusable components in Figmaâ€. This helps both ATS matching and hiring-manager scans.</p></div></article><article className="audit-panel structure-panel"><span className="eyebrow muted">Structural audit</span><h2>Local portal ready</h2><div className="structure-item"><span className="structure-check"><Icon name="check" size={13}/></span><div><b>Contact details</b><small>Clear and in a standard header format</small></div><em>Pass</em></div><div className="structure-item"><span className="structure-check"><Icon name="check" size={13}/></span><div><b>Experience chronology</b><small>Reverse chronological and easy to parse</small></div><em>Pass</em></div><div className="structure-item warn"><span className="structure-check">!</span><div><b>Skills section</b><small>Add 2 role-specific keywords for this market</small></div><em>Action</em></div></article></div> : <div className="audit-intro"><span className="empty-icon"><Icon name="search" size={26}/></span><h2>Your regional ATS check starts here.</h2><p>Attach your CV, enter a role and choose a market to get a keyword gap analysis and structural audit tailored to local expectations.</p></div>}</section>;
}

function ApplicationModal({ job, onClose, onSubmit, onAudit }) {
  const [note, setNote] = useState(''); const [cv, setCv] = useState('Alex_Morgan_CV.pdf');
  if (!job) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="application-modal" onSubmit={e => { e.preventDefault(); onSubmit(job, note, cv); }}><button type="button" className="modal-close" onClick={onClose}>x</button><span className="eyebrow muted">Application</span><h2>Apply to {job.company}</h2><p className="modal-role">{job.role} Â· {job.place}</p><label>Choose a CV<select value={cv} onChange={e => setCv(e.target.value)}><option>Alex_Morgan_CV.pdf</option><option>Alex_Morgan_Design_CV.pdf</option></select></label><div className="ats-note"><span className="resumly-mini">R</span><div><b>Check this CV with Resumly.ai</b><small>Get keyword and format feedback before you send.</small></div><button type="button" onClick={onAudit}>Open audit</button></div><label>Short note to the hiring team<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Tell the team why this role interests you..." /></label><button className="send-application" type="submit">Send application <Icon name="arrow" size={16}/></button></form></div>;
}

function AuthPage({ onSignIn }) {
  const [mode, setMode] = useState('signin'); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [accountType, setAccountType] = useState('candidate');
  return <div className="auth-page"><section className="auth-art"><button className="brand"><span className="brand-mark">w</span><span>workly</span></button><div><span className="eyebrow">Work that moves you forward</span><h1>{accountType === 'employer' ? <>Hire early talent<br/><em>with confidence.</em></> : <>Start the career<br/><em>you deserve.</em></>}</h1><p>{accountType === 'employer' ? 'Post opportunities and connect them with the early-career talent they are made for.' : 'Discover opportunities, prove your skills and apply with confidence.'}</p></div><div className="auth-points"><span><Icon name="check" size={15}/> Curated early-career jobs</span><span><Icon name="check" size={15}/> Clear programme categories</span><span><Icon name="check" size={15}/> Free for job seekers</span></div></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={e => { e.preventDefault(); onSignIn({ name, email, accountType }); }}><span className="eyebrow muted">Welcome to workly</span><h2>{mode === 'signin' ? 'Welcome back.' : 'Create your account.'}</h2><p>{mode === 'signin' ? 'Sign in to continue.' : 'Choose the account that fits how you use Workly.'}</p><div className="account-type"><button type="button" className={accountType === 'candidate' ? 'selected' : ''} onClick={() => setAccountType('candidate')}>Job seeker</button><button type="button" className={accountType === 'employer' ? 'selected' : ''} onClick={() => setAccountType('employer')}>Employer</button></div><label>{accountType === 'employer' ? 'Company or employer name' : 'Full name'}<input required value={name} onChange={e => setName(e.target.value)} placeholder={accountType === 'employer' ? 'Your company' : 'Your full name'} /></label><label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input required type="password" /></label><button type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={16}/></button><button type="button" className="auth-alt" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></form></section></div>;
}

const suggestCategory = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  if (/intern|placement|summer/.test(text)) return 'Internship';
  if (/apprentice|trainee|learnership/.test(text)) return 'Apprenticeship';
  if (/graduate|graduate scheme/.test(text)) return 'Graduate';
  if (/junior|entry|assistant|associate/.test(text)) return 'Entry level';
  return 'Full-time';
};

function EmployerDashboard({ employerJobs, onAddJob, onRemoveJob, onBack, profile, onSaveProfile }) {
  const [form, setForm] = useState({ role: '', company: '', place: 'Remote', description: '', salary: '', tags: '' });
  const suggested = suggestCategory(form.role, form.description);
  const submit = event => { event.preventDefault(); onAddJob({ ...form, type: suggested, tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean) }); setForm({ role: '', company: '', place: 'Remote', description: '', salary: '', tags: '' }); };
  return <section className="employer-dashboard"><div className="employer-hero"><div><span className="eyebrow">Employer workspace</span><h1>Build your early-career team.</h1><p>Create a listing and Workly will recommend the best category so candidates find it in the right place.</p></div><button onClick={onBack}>View candidate site <Icon name="arrow" size={16}/></button></div><div className="employer-grid"><form className="job-form" onSubmit={submit}><span className="eyebrow muted">New opportunity</span><h2>Post a job</h2><label>Job title<input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Software Engineering Intern" /></label><label>Company<input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Your company" /></label><div className="form-row"><label>Location<input required value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} /></label><label>Salary / pay<input value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="Competitive" /></label></div><label>Skills (comma separated)<input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="React, JavaScript" /></label><label>Role description<textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the opportunity, level and learning support..." /></label><div className="category-suggestion"><Icon name="spark" size={18}/><div><b>Suggested category: {suggested}</b><small>{suggested === 'Internship' || suggested === 'Apprenticeship' ? 'This will also appear in Early Career Programmes.' : 'This will appear in the general job search.'}</small></div></div><button className="post-job" type="submit">Publish opportunity <Icon name="arrow" size={16}/></button></form><aside className="posted-jobs"><span className="eyebrow muted">Employer profile</span><h2>{profile.name}</h2><p>{profile.email}</p><label className="employer-profile-field">Company name<input value={profile.name} onChange={e => onSaveProfile({ ...profile, name: e.target.value })}/></label><label className="employer-profile-field">Contact email<input type="email" value={profile.email} onChange={e => onSaveProfile({ ...profile, email: e.target.value })}/></label><span className="eyebrow muted listings-label">Your listings</span><h2>{employerJobs.length} active {employerJobs.length === 1 ? 'role' : 'roles'}</h2>{employerJobs.length ? employerJobs.map(job => <article key={job.id}><div><b>{job.role}</b><span>{job.company} Â· {job.type} Â· {job.place}</span><small>{job.categoryNote}</small></div><button onClick={() => onRemoveJob(job.id)}>Remove</button></article>) : <p>Your published jobs will appear here. Remove a listing once the role is filled.</p>}</aside></div></section>;
}

function ProfileModal({ profile, onClose, onSave }) {
  const [name, setName] = useState(profile.name); const [headline, setHeadline] = useState(profile.headline); const [location, setLocation] = useState(profile.location);
  return <div className="modal-backdrop"><form className="application-modal profile-modal" onSubmit={e => { e.preventDefault(); onSave({ name, headline, location }); }}><button type="button" className="modal-close" onClick={onClose}>x</button><span className="eyebrow muted">Profile settings</span><h2>Set up your profile</h2><p className="modal-role">Keep this current so employers can find the right fit.</p><label>Full name<input value={name} onChange={e => setName(e.target.value)} /></label><label>Career headline<input value={headline} onChange={e => setHeadline(e.target.value)} /></label><label>Location<input value={location} onChange={e => setLocation(e.target.value)} /></label><button className="send-application" type="submit">Save profile <Icon name="check" size={16}/></button></form></div>;
}

// Retained for the next Discover-page iteration.
// eslint-disable-next-line no-unused-vars
function DiscoverOverview({ setActive }) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState('Find jobs');
  const matchingJobs = jobs.filter(job => `${job.role} ${job.company} ${job.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4);
  const features = [{ title: 'Find jobs', copy: 'Search roles, save favourites and apply when you are ready.' }, { title: 'Early Career Programmes', copy: 'Explore internships and apprenticeships that build experience.' }, { title: 'ATS Checkers', copy: 'Create a tailored CV and check it before you apply.' }];
  return <section className="discover-overview"><div className="overview-hero"><span className="eyebrow">Welcome to Workly</span><h1>Your next opportunity,<br/><em>made easier to find.</em></h1><p>Browse available jobs, build your confidence and use practical tools to take the next step in your career.</p><div><button onClick={() => setActive('Find jobs')}>Browse all {jobs.length} jobs <Icon name="arrow" size={17}/></button><button className="outline" onClick={() => setActive('Early Career Programmes')}>Explore programmes</button></div></div><div className="overview-content"><section className="overview-jobs"><div className="overview-heading"><div><span className="eyebrow muted">Available opportunities</span><h2>Browse jobs that fit your goals</h2></div><button onClick={() => setActive('Find jobs')}>View all jobs <Icon name="arrow" size={15}/></button></div><label className="overview-search"><Icon name="search" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search roles, companies or skills" /></label><div className="overview-job-list">{matchingJobs.length ? matchingJobs.map(job => <button key={job.id} className="overview-job" onClick={() => setActive('Find jobs')}><span className="company-logo" style={{ background: job.color, color: job.text }}>{job.logo}</span><span><b>{job.role}</b><small>{job.company} Â· {job.place}</small></span><Icon name="arrow" size={16}/></button>) : <p className="empty">No jobs match that search. Try another term.</p>}</div></section><section className="how-it-works"><span className="eyebrow muted">How Workly works</span><h2>Everything you need to move forward</h2>{['Browse roles and programmes that interest you.', 'Use ATS Checkers to create a stronger CV.', 'Apply with confidence and track your progress.'].map((step, index) => <div className="how-step" key={step}><span>{index + 1}</span><p>{step}</p></div>)}</section><section className="feature-explorer"><div><span className="eyebrow muted">Explore the platform</span><h2>Choose where to start</h2></div><div className="feature-tabs">{features.map(feature => <button key={feature.title} className={selected === feature.title ? 'selected' : ''} onClick={() => setSelected(feature.title)}>{feature.title}</button>)}</div><div className="feature-detail"><p>{features.find(feature => feature.title === selected).copy}</p><button onClick={() => setActive(selected)}>Open {selected} <Icon name="arrow" size={16}/></button></div></section></div></section>;
}

/* â”€â”€ CV Preview renderer (shared by Design tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CvPreview({ data, template }) {
  const { personalInfo, summary, experiences, educations, skills, achievements, targetRole } = data;
  const name = personalInfo.name || 'Your Name';
  const skillList = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const achieveList = achievements ? achievements.split('\n').map(s => s.trim()).filter(Boolean) : [];

  if (template === 'modern') {
    return (
      <div className="cv-preview cv-preview--modern">
        <div className="cvp-modern-header">
          <div>
            <h1>{name}</h1>
            {targetRole && <p className="cvp-role">{targetRole}</p>}
          </div>
          <div className="cvp-modern-contact">
            {personalInfo.email && <span>âœ‰ {personalInfo.email}</span>}
            {personalInfo.phone && <span>ðŸ“ž {personalInfo.phone}</span>}
            {personalInfo.location && <span>ðŸ“ {personalInfo.location}</span>}
          </div>
        </div>
        {summary && <div className="cvp-section"><p className="cvp-summary">{summary}</p></div>}
        {skillList.length > 0 && (
          <div className="cvp-section">
            <div className="cvp-section-title">Skills</div>
            <div className="cvp-skills-grid">{skillList.map(s => <span key={s} className="cvp-skill-chip">{s}</span>)}</div>
          </div>
        )}
        {experiences.filter(e => e.title || e.company).length > 0 && (
          <div className="cvp-section">
            <div className="cvp-section-title">Experience</div>
            {experiences.filter(e => e.title || e.company).map((e, i) => (
              <div key={i} className="cvp-entry">
                <div className="cvp-entry-header"><b>{e.title}</b><span>{e.start}{e.end ? ` â€“ ${e.end}` : ''}</span></div>
                {e.company && <div className="cvp-entry-company">{e.company}</div>}
                {e.description && <p className="cvp-entry-desc">{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {educations.filter(e => e.degree || e.institution).length > 0 && (
          <div className="cvp-section">
            <div className="cvp-section-title">Education</div>
            {educations.filter(e => e.degree || e.institution).map((e, i) => (
              <div key={i} className="cvp-entry">
                <div className="cvp-entry-header"><b>{e.degree}</b><span>{e.year}</span></div>
                {e.institution && <div className="cvp-entry-company">{e.institution}</div>}
              </div>
            ))}
          </div>
        )}
        {achieveList.length > 0 && (
          <div className="cvp-section">
            <div className="cvp-section-title">Achievements</div>
            <ul className="cvp-achieve-list">{achieveList.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
      </div>
    );
  }

  if (template === 'minimal') {
    return (
      <div className="cv-preview cv-preview--minimal">
        <div className="cvp-min-name">{name}</div>
        {targetRole && <div className="cvp-min-role">{targetRole}</div>}
        <div className="cvp-min-contact">
          {[personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).join('  Â·  ')}
        </div>
        <hr className="cvp-min-hr"/>
        {summary && <p className="cvp-min-summary">{summary}</p>}
        {skillList.length > 0 && (
          <div className="cvp-min-section"><b>Skills</b><p>{skillList.join(', ')}</p></div>
        )}
        {experiences.filter(e => e.title || e.company).length > 0 && (
          <div className="cvp-min-section">
            <b>Experience</b>
            {experiences.filter(e => e.title || e.company).map((e, i) => (
              <div key={i} className="cvp-min-entry">
                <span>{e.title}{e.company ? ` â€” ${e.company}` : ''}</span>
                <span>{e.start}{e.end ? ` â€“ ${e.end}` : ''}</span>
                {e.description && <p>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {educations.filter(e => e.degree || e.institution).length > 0 && (
          <div className="cvp-min-section">
            <b>Education</b>
            {educations.filter(e => e.degree || e.institution).map((e, i) => (
              <div key={i} className="cvp-min-entry">
                <span>{e.degree}{e.institution ? ` â€” ${e.institution}` : ''}</span>
                <span>{e.year}</span>
              </div>
            ))}
          </div>
        )}
        {achieveList.length > 0 && (
          <div className="cvp-min-section">
            <b>Achievements</b>
            <ul>{achieveList.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
      </div>
    );
  }

  // Classic (default)
  return (
    <div className="cv-preview cv-preview--classic">
      <div className="cvp-classic-header">
        <h1>{name}</h1>
        {targetRole && <div className="cvp-classic-role">{targetRole}</div>}
        <div className="cvp-classic-contact">
          {[personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).join(' | ')}
        </div>
      </div>
      {summary && (
        <div className="cvp-classic-section">
          <div className="cvp-classic-heading">Profile</div>
          <p>{summary}</p>
        </div>
      )}
      {experiences.filter(e => e.title || e.company).length > 0 && (
        <div className="cvp-classic-section">
          <div className="cvp-classic-heading">Experience</div>
          {experiences.filter(e => e.title || e.company).map((e, i) => (
            <div key={i} className="cvp-classic-entry">
              <div className="cvp-classic-entry-top">
                <b>{e.title}</b><span>{e.start}{e.end ? ` â€“ ${e.end}` : ''}</span>
              </div>
              {e.company && <div className="cvp-classic-company">{e.company}</div>}
              {e.description && <p>{e.description}</p>}
            </div>
          ))}
        </div>
      )}
      {educations.filter(e => e.degree || e.institution).length > 0 && (
        <div className="cvp-classic-section">
          <div className="cvp-classic-heading">Education</div>
          {educations.filter(e => e.degree || e.institution).map((e, i) => (
            <div key={i} className="cvp-classic-entry">
              <div className="cvp-classic-entry-top"><b>{e.degree}</b><span>{e.year}</span></div>
              {e.institution && <div className="cvp-classic-company">{e.institution}</div>}
            </div>
          ))}
        </div>
      )}
      {skillList.length > 0 && (
        <div className="cvp-classic-section">
          <div className="cvp-classic-heading">Key Skills</div>
          <p>{skillList.join('  Â·  ')}</p>
        </div>
      )}
      {achieveList.length > 0 && (
        <div className="cvp-classic-section">
          <div className="cvp-classic-heading">Achievements</div>
          <ul>{achieveList.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

const EMPTY_EXP = () => ({ title: '', company: '', start: '', end: '', description: '' });
const EMPTY_EDU = () => ({ degree: '', institution: '', year: '' });

function ATSCheckers({ profile, onApply, notify }) {
  /* â”€â”€ Wizard step â”€â”€ */
  const [step, setStep] = useState(0); // 0=Build 1=Design 2=Refine 3=ATS

  /* â”€â”€ Step 1: Build â”€â”€ */
  const [personalInfo, setPersonalInfo] = useState({
    name: profile?.name || '',
    headline: profile?.headline || '',
    email: profile?.email || '',
    phone: '',
    location: profile?.location || '',
  });
  const [summary, setSummary] = useState('');
  const [experiences, setExperiences] = useState([EMPTY_EXP()]);
  const [educations, setEducations] = useState([EMPTY_EDU()]);
  const [skills, setSkills] = useState('');
  const [achievements, setAchievements] = useState('');
  const [targetRole, setTargetRole] = useState('');

  /* â”€â”€ Step 2: Design â”€â”€ */
  const [template, setTemplate] = useState('classic');

  /* â”€â”€ Shared file state â”€â”€ */
  const [sharedFile, setSharedFile] = useState(null);
  const [cvBuilderError, setCvBuilderError] = useState('');
  const [cvBuilderDrag, setCvBuilderDrag] = useState(false);
  const [cvPrefilled, setCvPrefilled] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [refiningFromATS, setRefiningFromATS] = useState(false);
  const [refinementInstructions, setRefinementInstructions] = useState([]);
  const [showRefinementReview, setShowRefinementReview] = useState(false);
  const [refinementAwaitingApproval, setRefinementAwaitingApproval] = useState(false);
  const [refinementApplied, setRefinementApplied] = useState(false);
  const [consent, setConsent] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(String(jobs[0].id));

  /* â”€â”€ ATS state â”€â”€ */
  const [resumeError, setResumeError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysed, setAnalysed] = useState(false);
  const [atsScore, setAtsScore] = useState(0);
  const [atsCheckRole, setAtsCheckRole] = useState('');
  const [atsReport, setAtsReport] = useState(null);

  const atsCheckerRef = useRef(null);
  const cvBuilderRef = useRef(null);

  const ALLOWED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const MAX_MB = 5;

  const cvData = { personalInfo, summary, experiences, educations, skills, achievements, targetRole };

  /* â”€â”€ Helpers â”€â”€ */
  const applyParsedResume = parsed => {
    if (parsed.personalInfo) setPersonalInfo(current => ({
      ...current,
      name: current.name || parsed.personalInfo.name,
      email: current.email || parsed.personalInfo.email,
      phone: current.phone || parsed.personalInfo.phone,
    }));
    if (parsed.targetRole) setTargetRole(cur => cur || parsed.targetRole);
    if (parsed.summary) setSummary(cur => cur || parsed.summary);
    if (parsed.skills.length) setSkills(cur => cur || parsed.skills.join(', '));
    if (parsed.achievements.length) setAchievements(cur => cur || parsed.achievements.join('\n'));
  };

  const prefillBuilderFromFile = async (file, source = 'builder') => {
    setIsPrefilling(true); setCvBuilderError('');
    try {
      const resumeText = await extractResumeText(file);
      if (resumeText.trim().length < 20) throw new Error('We could not read enough text from this file. Try a text-based PDF or DOCX.');
      applyParsedResume(parseResumeText(resumeText));
      setCvPrefilled(true);
      setRefiningFromATS(source === 'checker');
      notify(source === 'checker' ? 'CV received from ATS checker â€” review and refine below' : 'CV attached â€” fields pre-filled from your document');
    } catch (error) {
      setCvBuilderError(error.message || 'Could not read this CV. Please try a different PDF or DOCX file.');
      setCvPrefilled(false);
    } finally { setIsPrefilling(false); }
  };

  const attachCVForBuilder = file => {
    setCvBuilderError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) return setCvBuilderError('Only PDF, DOC or DOCX files are accepted.');
    if (file.size > MAX_MB * 1024 * 1024) return setCvBuilderError(`File is too large. Maximum size is ${MAX_MB} MB.`);
    setSharedFile(file); setCvPrefilled(false); setRefiningFromATS(false);
    setRefinementInstructions([]); setShowRefinementReview(false);
    setRefinementAwaitingApproval(false); setRefinementApplied(false);
    setAnalysed(false); setAtsReport(null);
    prefillBuilderFromFile(file, 'builder');
  };

  const handleCVBuilderDrop = e => { e.preventDefault(); setCvBuilderDrag(false); attachCVForBuilder(e.dataTransfer.files?.[0]); };
  const removeCVFromBuilder = () => {
    setSharedFile(null); setCvPrefilled(false); setRefiningFromATS(false);
    setRefinementInstructions([]); setShowRefinementReview(false);
    setRefinementAwaitingApproval(false); setRefinementApplied(false);
    setCvBuilderError(''); setAnalysed(false); setAtsReport(null);
  };

  const validateAndSetATS = file => {
    setResumeError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) return setResumeError('Only PDF, DOC or DOCX files are accepted.');
    if (file.size > MAX_MB * 1024 * 1024) return setResumeError(`File is too large. Maximum size is ${MAX_MB} MB.`);
    setSharedFile(file); setAnalysed(false); setAtsReport(null);
    setRefiningFromATS(false); setShowRefinementReview(false);
    setRefinementAwaitingApproval(false); setRefinementApplied(false);
    if (!cvPrefilled) prefillBuilderFromFile(file, 'checker');
  };

  const handleATSDrop = e => { e.preventDefault(); setIsDragging(false); validateAndSetATS(e.dataTransfer.files?.[0]); };

  const buildCvText = () => {
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    const expLines = experiences.filter(e => e.title || e.company).map(e =>
      `${e.title}${e.company ? ` | ${e.company}` : ''}${e.start ? ` (${e.start}${e.end ? `â€“${e.end}` : ''})` : ''}${e.description ? `\n${e.description}` : ''}`
    ).join('\n\n');
    const eduLines = educations.filter(e => e.degree || e.institution).map(e =>
      `${e.degree}${e.institution ? ` | ${e.institution}` : ''}${e.year ? ` (${e.year})` : ''}`
    ).join('\n');
    return [
      `${personalInfo.name || profile?.name}`,
      personalInfo.headline,
      [personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).join(' | '),
      targetRole ? `\nTARGET ROLE\n${targetRole}` : '',
      summary ? `\nPROFILE\n${summary}` : '',
      expLines ? `\nEXPERIENCE\n${expLines}` : '',
      eduLines ? `\nEDUCATION\n${eduLines}` : '',
      skillList.length ? `\nKEY SKILLS\n${skillList.join(' Â· ')}` : '',
      achievements ? `\nACHIEVEMENTS\n${achievements}` : '',
    ].filter(Boolean).join('\n');
  };

  const sendToATSChecker = () => {
    if (!sharedFile) return;
    setAnalysed(false); setAtsReport(null); setResumeError('');
    setStep(3);
    setTimeout(() => { if (atsCheckerRef.current) atsCheckerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    notify('CV loaded in ATS checker â€” click Run ATS check');
  };

  /* â”€â”€ Send built CV text to ATS tab â”€â”€ */
  const sendBuiltCVToATS = () => {
    const text = buildCvText();
    const file = new File([text], `${(personalInfo.name || profile?.name || 'CV').replace(/\s+/g, '-')}-CV.txt`, { type: 'text/plain' });
    setSharedFile(file);
    setAnalysed(false); setAtsReport(null); setResumeError('');
    if (targetRole) setAtsCheckRole(targetRole);
    setStep(3);
    setTimeout(() => { if (atsCheckerRef.current) atsCheckerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    notify('Built CV sent to ATS checker â€” click Run ATS check');
  };

  const runAnalysis = async (fileToAnalyse = sharedFile, roleToCheck = atsCheckRole) => {
    if (!fileToAnalyse) return setResumeError('Please attach your resume first.');
    setAnalysing(true); setAnalysed(false); setResumeError(''); setAtsReport(null);
    try {
      const resumeText = await extractResumeText(fileToAnalyse);
      if (resumeText.trim().length < 20) throw new Error('We could not read enough text. Please upload a text-based PDF or DOCX CV.');
      const report = buildAtsReport(resumeText, roleToCheck);
      setAtsReport(report); setAtsScore(report.score);
      setShowRefinementReview(false); setAnalysing(false); setAnalysed(true);
      notify('ATS analysis complete!');
    } catch (error) {
      setAnalysing(false);
      setResumeError(error.message || 'We could not analyse this CV. Please try a different PDF or DOCX file.');
    }
  };

  const scoreLabel = s => s >= 85 ? 'Excellent' : s >= 70 ? 'Strong' : s >= 55 ? 'Fair' : 'Needs work';
  const scoreColor = s => s >= 85 ? '#3a9e5f' : s >= 70 ? '#416baf' : s >= 55 ? '#c07a2a' : '#b84848';
  const foundKeywords = atsReport?.found || [];
  const missingKeywords = atsReport?.missing || [];

  const getRefinementRecommendations = () => {
    if (!atsReport) return { gaps: [], keywords: [], instructions: [] };
    const gaps = atsReport.structuralItems.filter(item => !item.pass);
    const keywords = atsReport.missing.filter(keyword => !keyword.startsWith('No '));
    return { gaps, keywords, instructions: [...keywords.map(k => `Add "${k}" only if you can genuinely demonstrate it.`), ...gaps.map(item => item.note)] };
  };

  const sendRefinementsToBuilder = async () => {
    if (!atsReport) return;
    const { instructions } = getRefinementRecommendations();
    if (sharedFile && !cvPrefilled && !isPrefilling) await prefillBuilderFromFile(sharedFile, 'checker');
    setRefinementInstructions(instructions); setRefiningFromATS(true);
    setRefinementAwaitingApproval(true); setRefinementApplied(false); setShowRefinementReview(false);
    if (atsCheckRole) setTargetRole(atsCheckRole);
    setStep(2);
    notify('ATS recommendations sent to Refine tab â€” review them there');
  };

  const applyApprovedRefinements = () => {
    const { gaps, keywords } = getRefinementRecommendations();
    if (keywords.length) setSkills(cur => [...new Set([...cur.split(',').map(i => i.trim()).filter(Boolean), ...keywords])].join(', '));
    if (!summary) setSummary('Early-career professional with transferable skills and a focused goal. Ready to contribute, learn quickly and deliver meaningful results.');
    if (gaps.some(item => item.label === 'Experience section')) {
      setExperiences(cur => cur.some(item => item.title || item.company) ? cur : [{ ...EMPTY_EXP(), title: 'Add your most relevant role or project', description: 'Describe a real responsibility, project or outcome that supports your target role.' }]);
    }
    if (gaps.some(item => item.label === 'Quantified outcomes'))
      setAchievements(cur => cur || 'Add a truthful measurable result, e.g. Improved [process] by [number] through [your action].');
    setRefinementAwaitingApproval(false); setRefinementApplied(true);
    notify('ATS refinements applied â€” review and edit before downloading');
  };

  const recheckRefinedCV = async () => {
    const refinedText = buildCvText();
    const refinedFile = new File([refinedText], `${(personalInfo.name || profile?.name || 'CV').replace(/\s+/g, '-')}-refined-CV.txt`, { type: 'text/plain' });
    setSharedFile(refinedFile);
    setAnalysed(false); setAtsReport(null); setResumeError('');
    if (targetRole) setAtsCheckRole(targetRole);
    setStep(3);
    await runAnalysis(refinedFile, targetRole || atsCheckRole);
    setTimeout(() => { if (atsCheckerRef.current) atsCheckerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    notify('Refined CV sent to ATS checker â€” click Run ATS check to see your updated score');
  };

  const createCV = () => {
    const text = buildCvText();
    const file = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url; link.download = `${(personalInfo.name || profile?.name || 'CV').replace(/\s+/g, '-')}-CV.txt`; link.click();
    URL.revokeObjectURL(url);
    setSharedFile(new File([text], `${(personalInfo.name || profile?.name || 'CV').replace(/\s+/g, '-')}-CV.txt`, { type: 'text/plain' }));
    notify('Your CV draft has been downloaded');
  };

  const applyWithConsent = () => {
    if (!consent) return notify('Please confirm your consent before applying.');
    const job = jobs.find(item => String(item.id) === selectedJobId);
    if (job) onApply(job);
  };

  /* â”€â”€ Smart refinement suggestions (Step 3) â”€â”€ */
  const buildSuggestions = () => {
    const s = [];
    if (!personalInfo.email) s.push({ id: 'email', label: 'Add your email address', detail: 'Contact info is essential for ATS and recruiters.', fix: () => {} });
    if (!personalInfo.phone) s.push({ id: 'phone', label: 'Add a phone number', detail: 'Many recruiters prefer to call for first contact.', fix: () => {} });
    if (!summary || summary.split(' ').length < 20) s.push({ id: 'summary', label: 'Strengthen your profile summary', detail: 'Aim for 3â€“5 sentences describing your strengths and goals.', fix: () => setSummary(cur => cur || 'Motivated professional with a passion for delivering results. Strong communicator with experience collaborating in fast-paced environments. Eager to grow within a forward-thinking organisation.') });
    const skillCount = skills.split(',').filter(Boolean).length;
    if (skillCount < 5) s.push({ id: 'skills', label: `Add more skills (you have ${skillCount})`, detail: 'ATS systems score higher with 6â€“10 relevant skills.', fix: () => {} });
    if (!achievements || achievements.split('\n').filter(Boolean).length < 2) s.push({ id: 'achievements', label: 'Add quantified achievements', detail: 'Include numbers, percentages, or project scale to boost ATS score.', fix: () => setAchievements(cur => cur || 'Improved process efficiency by 20% through workflow redesign.\nManaged a team of 5 to deliver project on time and under budget.') });
    if (experiences.every(e => !e.description)) s.push({ id: 'exp-desc', label: 'Add descriptions to your roles', detail: 'Brief bullet-style descriptions help ATS and recruiters understand impact.', fix: () => {} });
    if (!targetRole) s.push({ id: 'role', label: 'Set a target role', detail: 'A clear target role improves ATS keyword matching.', fix: () => {} });
    return s;
  };

  const steps = [
    { label: 'Build', icon: 'file' },
    { label: 'Design', icon: 'grid' },
    { label: 'Refine', icon: 'spark' },
    { label: 'ATS Check', icon: 'search' },
  ];

  const updateExp = (i, field, value) => setExperiences(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  const updateEdu = (i, field, value) => setEducations(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  const addExp = () => setExperiences(prev => [...prev, EMPTY_EXP()]);
  const removeExp = i => setExperiences(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const addEdu = () => setEducations(prev => [...prev, EMPTY_EDU()]);
  const removeEdu = i => setEducations(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const suggestions = buildSuggestions();

  return (
    <section className="ats-page">
      {/* â”€â”€ Hero â”€â”€ */}
      <div className="ats-hero">
        <span className="eyebrow"><Icon name="spark" size={14}/> CV Builder &amp; ATS Checker</span>
        <h1>Build, design and refine<br/><em>your perfect CV.</em></h1>
        <p>Create a tailored CV from scratch, pick a professional design, get smart refinement suggestions, then send it straight to the ATS checker â€” all in one place.</p>
      </div>

      {/* â”€â”€ Step tabs â”€â”€ */}
      <div className="cvwiz-tabs">
        {steps.map((s, i) => (
          <button
            key={s.label}
            className={`cvwiz-tab${step === i ? ' cvwiz-tab--active' : ''}${i < step ? ' cvwiz-tab--done' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="cvwiz-tab-num">{i < step ? <Icon name="check" size={11}/> : i + 1}</span>
            <Icon name={s.icon} size={15}/>
            {s.label}
          </button>
        ))}
      </div>

      {/* â•â•â•â• STEP 0: BUILD â•â•â•â• */}
      {step === 0 && (
        <div className="cvwiz-panel" ref={cvBuilderRef}>
          <div className="cvwiz-panel-head">
            <div>
              <span className="eyebrow muted">Step 1 Â· Build your CV</span>
              <h2>Fill in your details</h2>
              <p>Complete each section below. Already have a CV? Upload it to pre-fill the fields automatically.</p>
            </div>
            <div className="cvwiz-panel-actions">
              <button className="cvwiz-secondary-btn" onClick={() => setStep(1)}>Next: Choose a design <Icon name="arrow" size={14}/></button>
            </div>
          </div>

          {/* Upload existing CV */}
          <div className="cvb-upload-wrap" style={{marginBottom:'18px'}}>
            <p className="cvb-upload-label">Already have a CV? Upload it to auto-fill the fields below.</p>
            {sharedFile ? (
              <div className="cvb-file-row">
                <span className="cvb-file-icon"><Icon name="file" size={18}/></span>
                <div className="cvb-file-info">
                  <b>{sharedFile.name}</b>
                  <small>{(sharedFile.size/1024/1024).toFixed(2)} MB {isPrefilling ? 'Â· Readingâ€¦' : cvPrefilled ? 'Â· Fields pre-filled âœ“' : ''}</small>
                </div>
                <div className="cvb-file-actions">
                  <button className="cvb-action-btn cvb-action-btn--ats" onClick={sendToATSChecker}><Icon name="spark" size={13}/> ATS check</button>
                  <button className="cvb-action-btn cvb-action-btn--remove" onClick={removeCVFromBuilder}>âœ•</button>
                </div>
              </div>
            ) : (
              <label className={`cvb-dropzone${cvBuilderDrag ? ' cvb-dropzone--drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setCvBuilderDrag(true); }}
                onDragLeave={() => setCvBuilderDrag(false)}
                onDrop={handleCVBuilderDrop}>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => attachCVForBuilder(e.target.files?.[0])}/>
                <span className="cvb-dz-icon"><Icon name="upload" size={16}/></span>
                <span className="cvb-dz-text"><b>Attach your existing CV</b><small>PDF, DOC or DOCX Â· Max 5 MB</small></span>
              </label>
            )}
            {cvBuilderError && <p className="cvb-error">{cvBuilderError}</p>}
          </div>

          <div className="cvwiz-build-grid">
            {/* Personal Info */}
            <div className="cvwiz-section">
              <div className="cvwiz-section-title"><Icon name="file" size={15}/> Personal Information</div>
              <div className="cvwiz-field-row">
                <label>Full name<input value={personalInfo.name} onChange={e => setPersonalInfo(p => ({...p, name: e.target.value}))} placeholder="e.g. Alex Morgan"/></label>
                <label>Professional headline<input value={personalInfo.headline} onChange={e => setPersonalInfo(p => ({...p, headline: e.target.value}))} placeholder="e.g. Junior Product Designer"/></label>
              </div>
              <div className="cvwiz-field-row">
                <label>Email address<input type="email" value={personalInfo.email} onChange={e => setPersonalInfo(p => ({...p, email: e.target.value}))} placeholder="your@email.com"/></label>
                <label>Phone number<input value={personalInfo.phone} onChange={e => setPersonalInfo(p => ({...p, phone: e.target.value}))} placeholder="+263 77 123 4567"/></label>
              </div>
              <label>Location<input value={personalInfo.location} onChange={e => setPersonalInfo(p => ({...p, location: e.target.value}))} placeholder="City, Country"/></label>
            </div>

            {/* Target role + Summary */}
            <div className="cvwiz-section">
              <div className="cvwiz-section-title"><Icon name="spark" size={15}/> Role &amp; Profile</div>
              <label>Target role<input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Junior Product Designer"/></label>
              <label>Professional summary<textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="3â€“5 sentences: your strengths, experience and career goals"/></label>
            </div>

            {/* Experience */}
            <div className="cvwiz-section cvwiz-section--full">
              <div className="cvwiz-section-title"><Icon name="briefcase" size={15}/> Experience</div>
              {experiences.map((exp, i) => (
                <div key={i} className="cvwiz-entry-card">
                  <div className="cvwiz-entry-header">
                    <span>Role {i + 1}</span>
                    {experiences.length > 1 && <button className="cvwiz-remove-btn" onClick={() => removeExp(i)}>âœ• Remove</button>}
                  </div>
                  <div className="cvwiz-field-row">
                    <label>Job title<input value={exp.title} onChange={e => updateExp(i, 'title', e.target.value)} placeholder="e.g. Marketing Intern"/></label>
                    <label>Company<input value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} placeholder="e.g. Acme Ltd"/></label>
                  </div>
                  <div className="cvwiz-field-row">
                    <label>Start date<input value={exp.start} onChange={e => updateExp(i, 'start', e.target.value)} placeholder="Jan 2023"/></label>
                    <label>End date<input value={exp.end} onChange={e => updateExp(i, 'end', e.target.value)} placeholder="Present"/></label>
                  </div>
                  <label>Description<textarea value={exp.description} onChange={e => updateExp(i, 'description', e.target.value)} placeholder="Describe responsibilities and achievements. Use numbers where possible."/></label>
                </div>
              ))}
              <button className="cvwiz-add-btn" onClick={addExp}><Icon name="spark" size={13}/> Add another role</button>
            </div>

            {/* Education */}
            <div className="cvwiz-section cvwiz-section--full">
              <div className="cvwiz-section-title"><Icon name="search" size={15}/> Education</div>
              {educations.map((edu, i) => (
                <div key={i} className="cvwiz-entry-card">
                  <div className="cvwiz-entry-header">
                    <span>Entry {i + 1}</span>
                    {educations.length > 1 && <button className="cvwiz-remove-btn" onClick={() => removeEdu(i)}>âœ• Remove</button>}
                  </div>
                  <div className="cvwiz-field-row">
                    <label>Degree / qualification<input value={edu.degree} onChange={e => updateEdu(i, 'degree', e.target.value)} placeholder="e.g. BSc Computer Science"/></label>
                    <label>Institution<input value={edu.institution} onChange={e => updateEdu(i, 'institution', e.target.value)} placeholder="e.g. University of Zimbabwe"/></label>
                  </div>
                  <label>Year completed<input value={edu.year} onChange={e => updateEdu(i, 'year', e.target.value)} placeholder="e.g. 2023"/></label>
                </div>
              ))}
              <button className="cvwiz-add-btn" onClick={addEdu}><Icon name="spark" size={13}/> Add another entry</button>
            </div>

            {/* Skills */}
            <div className="cvwiz-section">
              <div className="cvwiz-section-title"><Icon name="grid" size={15}/> Key Skills</div>
              <label>Skills (comma separated)<textarea value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Figma, User research, Wireframing, Communication, Agile"/></label>
            </div>

            {/* Achievements */}
            <div className="cvwiz-section">
              <div className="cvwiz-section-title"><Icon name="check" size={15}/> Achievements</div>
              <label>Quantified outcomes (one per line)<textarea value={achievements} onChange={e => setAchievements(e.target.value)} placeholder={"Increased sales by 22% through new outreach strategy\nManaged 6-person team to deliver project 2 weeks ahead of schedule"}/></label>
            </div>
          </div>

          <div className="cvwiz-step-footer">
            <button className="cvwiz-primary-btn" onClick={() => setStep(1)}>Next: Choose a design <Icon name="arrow" size={16}/></button>
          </div>
        </div>
      )}

      {/* â•â•â•â• STEP 1: DESIGN â•â•â•â• */}
      {step === 1 && (
        <div className="cvwiz-panel">
          <div className="cvwiz-panel-head">
            <div>
              <span className="eyebrow muted">Step 2 Â· Design</span>
              <h2>Pick a template</h2>
              <p>Choose a visual layout. The preview updates in real time as you type your content.</p>
            </div>
            <div className="cvwiz-panel-actions">
              <button className="cvwiz-ghost-btn" onClick={() => setStep(0)}><Icon name="arrow" size={14} style={{transform:'rotate(180deg)'}}/> Back</button>
              <button className="cvwiz-secondary-btn" onClick={() => setStep(2)}>Next: Refine <Icon name="arrow" size={14}/></button>
            </div>
          </div>

          <div className="cvwiz-design-layout">
            {/* Template selector */}
            <div className="cvwiz-template-picker">
              <div className="cvwiz-section-title" style={{marginBottom:'14px'}}><Icon name="grid" size={15}/> Templates</div>
              {[
                { id: 'classic', name: 'Classic', desc: 'Serif headings, structured layout â€” trusted by traditional recruiters.', accent: '#2e455b' },
                { id: 'modern', name: 'Modern', desc: 'Clean sans-serif with colour accents and a skills chip grid.', accent: '#416baf' },
                { id: 'minimal', name: 'Minimal', desc: 'Ultra-compact monochrome â€” perfect for single-page CVs.', accent: '#444' },
              ].map(t => (
                <button key={t.id} className={`cvwiz-template-card${template === t.id ? ' cvwiz-template-card--active' : ''}`} onClick={() => setTemplate(t.id)}>
                  <span className="cvwiz-template-swatch" style={{background: t.accent}}/>
                  <div>
                    <b>{t.name}</b>
                    <small>{t.desc}</small>
                  </div>
                  {template === t.id && <span className="cvwiz-template-tick"><Icon name="check" size={12}/></span>}
                </button>
              ))}

              <div style={{marginTop:'24px'}}>
                <button className="cvwiz-primary-btn" style={{width:'100%'}} onClick={createCV}><Icon name="download" size={15}/> Download CV</button>
                <button className="cvwiz-secondary-btn" style={{width:'100%', marginTop:'8px'}} onClick={sendBuiltCVToATS}><Icon name="spark" size={14}/> Send to ATS checker</button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="cvwiz-preview-pane">
              <div className="cvwiz-preview-label"><Icon name="file" size={13}/> Live preview</div>
              <div className="cvwiz-preview-scroll">
                <CvPreview data={cvData} template={template}/>
              </div>
            </div>
          </div>

          <div className="cvwiz-step-footer">
            <button className="cvwiz-ghost-btn" onClick={() => setStep(0)}><Icon name="arrow" size={14}/> Back</button>
            <button className="cvwiz-primary-btn" onClick={() => setStep(2)}>Next: Refine <Icon name="arrow" size={16}/></button>
          </div>
        </div>
      )}

      {/* â•â•â•â• STEP 2: REFINE â•â•â•â• */}
      {step === 2 && (
        <div className="cvwiz-panel">
          <div className="cvwiz-panel-head">
            <div>
              <span className="eyebrow muted">Step 3 Â· Refine</span>
              <h2>Smart suggestions</h2>
              <p>We analysed your CV draft and found {suggestions.length} area{suggestions.length !== 1 ? 's' : ''} to strengthen. Apply fixes in one click.</p>
            </div>
            <div className="cvwiz-panel-actions">
              <button className="cvwiz-ghost-btn" onClick={() => setStep(1)}>â† Back</button>
              <button className="cvwiz-secondary-btn" onClick={sendBuiltCVToATS}><Icon name="spark" size={14}/> Send to ATS checker</button>
            </div>
          </div>

          {/* ATS refinements from checker */}
          {refinementAwaitingApproval && (
            <div className="cvb-refinement-consent" style={{marginBottom:'16px'}}>
              <Icon name="spark" size={14}/>
              <div>
                <b>Apply ATS refinements?</b>
                <small>Nothing has been changed yet. With your permission, we will add the recommended keywords and a quantified-outcome prompt.</small>
                <span>
                  <button type="button" className="cvb-consent-secondary" onClick={() => { setRefinementAwaitingApproval(false); notify('ATS suggestions kept for review; no fields changed'); }}>Keep suggestions only</button>
                  <button type="button" onClick={applyApprovedRefinements}>Yes, apply refinements</button>
                </span>
              </div>
            </div>
          )}

          {refinementInstructions.length > 0 && (
            <div className="cvb-refine-plan" style={{marginBottom:'16px'}}>
              <Icon name="spark" size={12}/>
              <span>
                <b>{refinementApplied ? 'ATS refinements applied â€” review before sending:' : 'ATS suggestions (not yet applied):'}</b>
                {refinementInstructions.map(ins => <small key={ins}>â€¢ {ins}</small>)}
              </span>
            </div>
          )}

          <div className="cvwiz-refine-layout">
            {/* Suggestions list */}
            <div className="cvwiz-suggestions">
              {suggestions.length === 0 ? (
                <div className="cvwiz-suggestions-empty">
                  <span><Icon name="check" size={22}/></span>
                  <b>Your CV looks great!</b>
                  <p>All key areas are covered. Send it to the ATS checker to get your readiness score.</p>
                </div>
              ) : suggestions.map(sug => (
                <div key={sug.id} className="cvwiz-suggestion-card">
                  <div className="cvwiz-suggestion-icon"><Icon name="spark" size={14}/></div>
                  <div className="cvwiz-suggestion-body">
                    <b>{sug.label}</b>
                    <small>{sug.detail}</small>
                  </div>
                  {sug.fix && (
                    <button className="cvwiz-suggestion-fix" onClick={() => { sug.fix(); notify(`Applied: ${sug.label}`); }}>
                      Auto-fill <Icon name="check" size={11}/>
                    </button>
                  )}
                </div>
              ))}

              <div className="cvwiz-refine-divider"/>

              <div className="cvwiz-refine-actions">
                <button className="cvwiz-primary-btn" onClick={createCV}><Icon name="download" size={15}/> Download CV</button>
                <button className="cvwiz-secondary-btn" onClick={sendBuiltCVToATS}><Icon name="spark" size={14}/> Send to ATS checker</button>
                {(refiningFromATS || refinementInstructions.length > 0) && (
                  <button className="cvb-recheck-btn" onClick={recheckRefinedCV}>Re-check refined CV <Icon name="spark" size={13}/></button>
                )}
              </div>
            </div>

            {/* Mini preview */}
            <div className="cvwiz-refine-preview">
              <div className="cvwiz-preview-label"><Icon name="file" size={13}/> CV preview</div>
              <div className="cvwiz-preview-scroll cvwiz-preview-scroll--sm">
                <CvPreview data={cvData} template={template}/>
              </div>
            </div>
          </div>

          {/* Apply with consent */}
          <div className="cvwiz-consent-block">
            <span className="eyebrow muted">Apply to a job</span>
            <div className="cvwiz-consent-row">
              <label>Choose a role<select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>{jobs.map(job => <option key={job.id} value={job.id}>{job.role} Â· {job.company}</option>)}</select></label>
              <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>I approve Workly to use my CV details to prepare this application.</span></label>
              <button onClick={applyWithConsent} disabled={!consent}>Continue to application <Icon name="arrow" size={15}/></button>
            </div>
          </div>

          <div className="cvwiz-step-footer">
            <button className="cvwiz-ghost-btn" onClick={() => setStep(1)}>â† Back to Design</button>
            <button className="cvwiz-primary-btn" onClick={() => setStep(3)}>Go to ATS Check <Icon name="search" size={15}/></button>
          </div>
        </div>
      )}

      {/* â•â•â•â• STEP 3: ATS CHECK â•â•â•â• */}
      {step === 3 && (
        <div className="cvwiz-panel" ref={atsCheckerRef}>
          <div className="cvwiz-panel-head">
            <div>
              <span className="eyebrow muted">Step 4 Â· ATS Check</span>
              <h2>Instant ATS analysis</h2>
              <p>Upload your CV or send your built draft for a keyword gap report, structural audit and ATS readiness score.</p>
            </div>
            <div className="cvwiz-panel-actions">
              <button className="cvwiz-ghost-btn" onClick={() => setStep(2)}>â† Back to Refine</button>
              {(personalInfo.name || summary || skills) && (
                <button className="cvwiz-secondary-btn" onClick={sendBuiltCVToATS}><Icon name="file" size={14}/> Send my built CV</button>
              )}
            </div>
          </div>

          {sharedFile && !analysed && !analysing && (
            <div className="ats-shared-banner">
              <span><Icon name="file" size={15}/></span>
              <span>
                <b>{sharedFile.name}</b> is ready â€”
                {cvPrefilled ? ' also loaded in the CV builder.' : ' '}
                Click <strong>Run ATS check</strong> to analyse it.
              </span>
            </div>
          )}

          <div className="ats-upload-body">
            {/* Left: upload + controls */}
            <div className="ats-upload-left">
              <label
                className={`ats-dropzone${sharedFile ? ' ats-dropzone--ready' : ''}${isDragging ? ' ats-dropzone--drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleATSDrop}
              >
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => validateAndSetATS(e.target.files?.[0])}/>
                {sharedFile ? (
                  <div className="ats-file-attached">
                    <span className="ats-file-icon"><Icon name="file" size={24}/></span>
                    <div><b>{sharedFile.name}</b><small>{(sharedFile.size/1024/1024).toFixed(2)} MB Â· Ready to analyse</small></div>
                    <span className="ats-change-badge">Change</span>
                  </div>
                ) : (
                  <div className="ats-upload-prompt">
                    <span className="ats-upload-icon"><Icon name="upload" size={26}/></span>
                    <b>Drop your resume here or click to browse</b>
                    <small>PDF, DOC or DOCX Â· Maximum 5 MB</small>
                  </div>
                )}
              </label>

              {resumeError && <p className="ats-upload-error">{resumeError}</p>}

              <label className="ats-role-label">
                Target role <span>(optional â€” improves keyword matching)</span>
                <input value={atsCheckRole} onChange={e => { setAtsCheckRole(e.target.value); setAnalysed(false); setAtsReport(null); }} placeholder="e.g. Marketing coordinator"/>
              </label>

              <button className={`ats-run-btn${analysing ? ' ats-run-btn--loading' : ''}`} onClick={runAnalysis} disabled={analysing}>
                {analysing ? <><span className="ats-spinner"/> Analysing your resumeâ€¦</> : <><Icon name="spark" size={16}/> Run ATS check</>}
              </button>
            </div>

            {/* Right: results */}
            <div className="ats-results-pane">
              {!analysed && !analysing && (
                <div className="ats-results-empty">
                  <span className="ats-empty-icon"><Icon name="search" size={28}/></span>
                  <h3>Your ATS report will appear here</h3>
                  <p>Attach your resume and click <strong>Run ATS check</strong> to see your score, keyword gaps and structural suggestions.</p>
                </div>
              )}

              {analysing && (
                <div className="ats-results-empty">
                  <div className="ats-scan-anim"><div className="ats-scan-line"/></div>
                  <p className="ats-scanning-label">Scanning your resumeâ€¦</p>
                </div>
              )}

              {analysed && !analysing && (
                <div className="ats-report">
                  <button className="ats-run-btn ats-refine-btn" onClick={() => setShowRefinementReview(true)}>
                    <Icon name="spark" size={16}/> Review ATS refinements
                  </button>
                  {showRefinementReview && (
                    <div className="ats-refinement-review">
                      <div><b>Would you like to refine these ATS areas?</b><small>We will only send these suggestions to the Refine tab after you confirm.</small></div>
                      <ul>
                        {missingKeywords.length > 0 && <li><strong>Worth adding:</strong> {missingKeywords.join(', ')}</li>}
                        {(atsReport?.structuralItems || []).filter(item => !item.pass).map(item => <li key={item.label}><strong>{item.label}:</strong> {item.note}</li>)}
                      </ul>
                      <div className="ats-review-actions">
                        <button type="button" className="ats-review-secondary" onClick={() => setShowRefinementReview(false)}>No, keep my CV as is</button>
                        <button type="button" onClick={sendRefinementsToBuilder}>Yes, send to Refine tab <Icon name="arrow" size={14}/></button>
                      </div>
                    </div>
                  )}

                  {/* Score */}
                  <div className="ats-report-score">
                    <div className="ats-score-ring" style={{ '--score-color': scoreColor(atsScore), '--pct': `${atsScore}%` }}>
                      <b>{atsScore}</b><small>/100</small>
                    </div>
                    <div>
                      <strong style={{ color: scoreColor(atsScore) }}>{scoreLabel(atsScore)}</strong>
                      <p>Based on the text extracted from this CV{atsCheckRole ? ` and its match for ${atsCheckRole}` : ' and its structure'}.</p>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="ats-report-section">
                    <span className="eyebrow muted">Keyword analysis</span>
                    <div className="ats-kw-row">
                      <span>Found</span>
                      <div>{foundKeywords.map(w => <b key={w} className="ats-kw ats-kw--found"><Icon name="check" size={11}/>{w}</b>)}</div>
                    </div>
                    <div className="ats-kw-row">
                      <span>Worth adding</span>
                      <div>{missingKeywords.map(w => <b key={w} className="ats-kw ats-kw--missing">+ {w}</b>)}</div>
                    </div>
                  </div>

                  {/* Structural audit */}
                  <div className="ats-report-section">
                    <span className="eyebrow muted">Structural audit</span>
                    {(atsReport?.structuralItems || [
                      { label: 'Contact details', note: 'Clear and in standard header format', pass: true },
                      { label: 'Experience chronology', note: 'Reverse-chronological and easy to parse', pass: true },
                      { label: 'Skills section', note: 'Add 2â€“3 role-specific keywords', pass: false },
                      { label: 'Quantified outcomes', note: 'Include numbers and results where possible', pass: false },
                    ]).map(item => (
                      <div key={item.label} className={`ats-struct-item${item.pass ? '' : ' ats-struct-item--warn'}`}>
                        <span className="ats-struct-check">{item.pass ? <Icon name="check" size={12}/> : '!'}</span>
                        <div><b>{item.label}</b><small>{item.note}</small></div>
                        <em>{item.pass ? 'Pass' : 'Action'}</em>
                      </div>
                    ))}
                  </div>

                  <div className="ats-report-tip">
                    <Icon name="spark" size={16}/>
                    <p><b>Tip:</b> Add one measurable outcome for each key skill â€” e.g. "Reduced onboarding time by 30%". This boosts both ATS matching and recruiter confidence.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="cvwiz-step-footer">
            <button className="cvwiz-ghost-btn" onClick={() => setStep(2)}>â† Back to Refine</button>
          </div>
        </div>
      )}
    </section>
  );
}
function App() {
  const [active, setActive] = useState('Discover');
  const [saved, setSaved] = useState([]);
  const [applications, setApplications] = useState([]);
  const [toast, setToast] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [accountType, setAccountType] = useState('candidate');
  const [employerJobs, setEmployerJobs] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', headline: 'Early-career professional', location: 'Harare, Zimbabwe' });

  // â”€â”€ 24/7 live job feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { jobs: liveJobs, source: feedSource, feedMessage, loading: feedLoading, lastRefreshed, refresh: refreshFeed } = useJobFeed({
    location: 'Zimbabwe, Remote',
  });

  // Merge employer-posted jobs with live feed; fall back to static sample when feed is empty
  const liveJobList = useMemo(() => [
    ...employerJobs,
    ...(liveJobs.length > 0 ? liveJobs : jobs),
  ], [employerJobs, liveJobs]);

  const nav = ['Find jobs', 'Early Career Programmes', 'My applications', 'ATS Checkers'];
  const notify = message => { setToast(message); setTimeout(() => setToast(''), 2300); };
  const save = id => { setSaved(current => current.includes(id) ? current.filter(savedId => savedId !== id) : [...current, id]); notify(saved.includes(id) ? 'Job removed from saved roles' : 'Job saved to your list'); };
  const apply = job => { if (applications.some(app => app.id === job.id)) return notify('You have already applied for this role'); setSelectedJob(job); };
  const submitApplication = (job) => { setApplications(current => [...current, { ...job, status: current.length === 1 ? 'Interview' : 'Reviewing' }]); setSelectedJob(null); notify(`Application sent to ${job.company}`); };
  const addEmployerJob = details => {
    const categoryNote = ['Internship', 'Apprenticeship'].includes(details.type) ? 'Also visible in Early Career Programmes' : 'Visible in Find jobs';
    setEmployerJobs(current => [{ ...details, id: `employer-${Date.now()}`, logo: details.company.slice(0, 1).toUpperCase(), color: '#e5f4dd', text: '#337044', time: 'Just now', salary: details.salary || 'Competitive', match: 'New opportunity', noExpNeeded: ['Internship', 'Apprenticeship', 'Entry level'].includes(details.type), categoryNote }, ...current]);
    notify('Job published and categorised');
  };

  // Shared header element
  const topNav = (
    <header className="topbar">
      <button className="brand" onClick={() => setActive('Discover')}><span className="brand-mark">w</span><span>workly</span></button>
      <nav>{nav.map(item => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}>{item}</button>)}</nav>
      <div className="top-actions">
        <LiveBadge source={feedSource} lastRefreshed={lastRefreshed} loading={feedLoading} onRefresh={refreshFeed}/>
        {accountType === 'employer' && <button className="employer-button" onClick={() => setActive('Employer dashboard')}>Employer dashboard</button>}
        <div className="header-popover">
          <button className="avatar" onClick={() => setAccountOpen(!accountOpen)}>{profile.name.split(' ').map(word => word[0]).join('').slice(0,2)}</button>
          {accountOpen && <div className="account-menu"><div><b>{profile.name}</b><small>{profile.email}</small></div><button onClick={() => { setAccountOpen(false); setProfileOpen(true); }}>Profile settings</button><button className="logout" onClick={() => { setSignedIn(false); setAccountOpen(false); }}>Log out</button></div>}
        </div>
      </div>
    </header>
  );

  if (!signedIn) return <AuthPage onSignIn={details => { setProfile(current => ({ ...current, ...details })); setAccountType(details.accountType); setSignedIn(true); setActive(details.accountType === 'employer' ? 'Employer dashboard' : 'Discover'); }} />;

  if (active === 'Employer dashboard') return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActive('Discover')}><span className="brand-mark">w</span><span>workly</span></button>
        <div className="top-actions">
          <button className="employer-button" onClick={() => setActive('Discover')}>Candidate view</button>
          <button className="employer-button" onClick={() => setSignedIn(false)}>Log out</button>
        </div>
      </header>
      <main><EmployerDashboard profile={profile} onSaveProfile={setProfile} employerJobs={employerJobs} onAddJob={addEmployerJob} onRemoveJob={id => { setEmployerJobs(current => current.filter(job => job.id !== id)); notify('Listing removed'); }} onBack={() => setActive('Discover')}/></main>
      {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
    </div>
  );

  if (active === 'ATS Checkers') return (
    <div className="app-shell">
      {topNav}
      <main><ATSCheckers profile={profile} onApply={apply} notify={notify}/></main>
      <ApplicationModal job={selectedJob} onClose={() => setSelectedJob(null)} onSubmit={submitApplication} onAudit={() => { setSelectedJob(null); setActive('ATS Checkers'); }}/>
      {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
    </div>
  );

  if (active === 'Early Career Programmes') return (
    <div className="app-shell">
      {topNav}
      <main><BrowseJobs programmesOnly jobList={liveJobList} feedSource={feedSource} feedMessage={feedMessage} feedLoading={feedLoading} saved={saved} applications={applications} onSave={save} onApply={apply}/></main>
      <ApplicationModal job={selectedJob} onClose={() => setSelectedJob(null)} onSubmit={submitApplication} onAudit={() => { setSelectedJob(null); setActive('Resumly.ai'); }}/>
      {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
    </div>
  );

  return (
    <div className="app-shell">
      {topNav}
      <main>
        {active === 'Discover'          && <Discover setActive={setActive} notify={notify}/>}
        {active === 'Find jobs'         && <BrowseJobs jobList={liveJobList} feedSource={feedSource} feedMessage={feedMessage} feedLoading={feedLoading} saved={saved} applications={applications} onSave={save} onApply={apply}/>}
        {active === 'No Experience Needed' && <NoExpNeeded jobList={liveJobList} saved={saved} applications={applications} onSave={save} onApply={apply}/>}
        {active === 'Internships'       && <BrowseJobs jobList={liveJobList} internshipOnly feedSource={feedSource} feedMessage={feedMessage} feedLoading={feedLoading} saved={saved} applications={applications} onSave={save} onApply={apply}/>}
        {active === 'Apprenticeships'   && <BrowseJobs jobList={liveJobList} apprenticeshipOnly feedSource={feedSource} feedMessage={feedMessage} feedLoading={feedLoading} saved={saved} applications={applications} onSave={save} onApply={apply}/>}
        {active === 'My applications'   && <Applications applications={applications} setActive={setActive}/>}
        {active === 'Resumly.ai'        && <Resumly setActive={setActive} notify={notify}/>}
      </main>
      <ApplicationModal job={selectedJob} onClose={() => setSelectedJob(null)} onSubmit={submitApplication} onAudit={() => { setSelectedJob(null); setActive('Resumly.ai'); }}/>
      {profileOpen && <ProfileModal profile={profile} onClose={() => setProfileOpen(false)} onSave={details => { setProfile(current => ({ ...current, ...details })); setProfileOpen(false); notify('Profile settings saved'); }}/>}
      {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
    </div>
  );
}

export default App;
