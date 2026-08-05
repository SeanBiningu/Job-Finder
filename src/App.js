import { useMemo, useRef, useState } from 'react';
import './App.css';
import { searchJobs } from './services/jobSearch';

const Icon = ({ name, size = 20 }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>, map: <><path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>, bookmark: <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V21l-6-3.8L6 21V3.5Z"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>, check: <path d="m5 12 4 4L19 6"/>, grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>, spark: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/>, download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>, upload: <><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></>, file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12A2 2 0 0 0 20 20V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

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

function BrowseJobs({ internshipOnly, apprenticeshipOnly, programmesOnly, saved, applications, onSave, onApply }) {
  const categoryOnly = internshipOnly ? 'Internship' : apprenticeshipOnly ? 'Apprenticeship' : null;
  const [query, setQuery] = useState(''); const [location, setLocation] = useState(categoryOnly ? 'Zimbabwe' : 'Zimbabwe, Remote'); const [remote, setRemote] = useState(false); const [type, setType] = useState('All'); const [noExperienceOnly, setNoExperienceOnly] = useState(false); const [liveJobs, setLiveJobs] = useState(jobs); const [searching, setSearching] = useState(false); const [source, setSource] = useState('sample'); const [error, setError] = useState('');
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
  const runSearch = async () => { setSearching(true); setError(''); try { const result = await searchJobs({ query, location, internshipOnly, apprenticeshipOnly }); setLiveJobs(result.jobs); setSource(result.source); } catch (err) { setError('We could not reach the live job feed. Please try again.'); } finally { setSearching(false); } };
  return <section className="browse-page"><div className="browse-hero"><span className="eyebrow">{hero.eyebrow}</span><h1>{hero.title}</h1><p>{hero.copy}</p><div className="browse-search"><Icon name="search"/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder={hero.placeholder}/><Icon name="map"/><input className="location-search" value={location} onChange={e => setLocation(e.target.value)} placeholder="Zimbabwe, Remote or anywhere"/><button onClick={runSearch} disabled={searching}>{searching ? 'Searching...' : 'Search'}</button></div></div><div className="results-shell"><aside className="filter-panel"><b>Refine your search</b><div className="filter-group"><span>Role type</span>{filters.map(filter => <button key={filter} onClick={() => setFilter(filter)} className={(type === filter || (filter === 'Remote' && remote)) ? 'filter-choice checked' : 'filter-choice'}>{filter === 'Remote' ? 'Remote only' : filter}<i/></button>)}</div><div className="filter-group"><span>Experience</span><button onClick={() => setNoExperienceOnly(value => !value)} className={noExperienceOnly ? 'filter-choice checked' : 'filter-choice'}>No experience needed<i/></button><button className="filter-choice">0-2 years<i/></button></div></aside><div className="search-results"><div className="results-title"><div><h2>{displayed.length} opportunities found</h2><p>{noExperienceOnly ? 'Showing roles that welcome applicants with no prior experience.' : source === 'theirstack' ? 'Live results powered by TheirStack.' : source === 'demo' ? 'Demo feed - add a TheirStack key for live results.' : 'Matches based on your profile and search.'}</p></div><button className="sort-button">Most relevant</button></div>{error && <div className="search-error">{error}</div>}<div className="jobs-list">{displayed.length ? displayed.map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applications.some(a => a.id === job.id)} onSave={onSave} onApply={onApply}/>) : <div className="empty">No opportunities match these filters. Try changing your search.</div>}</div></div></div></section>;
}

function NoExpNeeded({ saved, applications, onSave, onApply }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const noExpJobs = jobs.filter(j => j.noExpNeeded);
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
        <p>Every role here welcomes you exactly as you are. No CV gap anxiety, no degree required — just the drive to start.</p>
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
              <p>Curated jobs that open doors — no experience necessary.</p>
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
  return <section className="applications-page"><div className="applications-head"><span className="eyebrow muted">My job search</span><h1>Keep moving forward.</h1><p>Everything you have applied for, in one calm place.</p></div><div className="application-summary"><div><b>{applications.length}</b><span>Applications sent</span></div><div><b>{applications.filter(a => a.status === 'Reviewing').length}</b><span>In review</span></div><div><b>{applications.filter(a => a.status === 'Interview').length}</b><span>Interviews</span></div></div>{applications.length ? <div className="application-list">{applications.map(app => <article className="application-row" key={app.id}><div className="company-logo" style={{ background: app.color, color: app.text }}>{app.logo}</div><div><b>{app.role}</b><span>{app.company} · Applied today</span></div><span className={`status ${app.status.toLowerCase()}`}>{app.status}</span><button>View application <Icon name="arrow" size={15}/></button></article>)}</div> : <div className="no-applications"><span className="empty-icon"><Icon name="briefcase" size={26}/></span><h2>Your application list is waiting.</h2><p>When you find a role you like, apply in one click and track your progress here.</p><button onClick={() => setActive('Find jobs')}>Find jobs <Icon name="arrow" size={16}/></button></div>}</section>;
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
  return <section className="resumly-page"><div className="resumly-hero"><span className="resumly-brand"><span>R</span> Resumly.ai</span><span className="eyebrow">Your application co-pilot</span><h1>Make your CV speak<br/><em>the ATS language.</em></h1><p>Built for regional hiring: reverse-engineer local job boards and global ATS patterns before you apply.</p><div className="resumly-controls"><label>Target role<input value={role} onChange={e => setRole(e.target.value)} /></label><label>Hiring market<select value={region} onChange={e => setRegion(e.target.value)}><option>Regional standard</option><option>United Kingdom</option><option>European Union</option><option>Global / remote</option></select></label><button onClick={auditCV}>Audit my CV <Icon name="arrow" size={17}/></button></div></div><div className="cv-upload-wrap"><div><span className="eyebrow muted">Step 1 · Your CV</span><h2>Attach your CV for a tailored check</h2><p>Resumly uses your document to assess ATS format, skills and keywords. Your file stays private.</p></div><label className={cvFile ? 'cv-dropzone uploaded' : 'cv-dropzone'}><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => addCV(e.target.files?.[0])}/>{cvFile ? <><span className="cv-file-icon"><Icon name="file" size={21}/></span><span className="cv-file-details"><b>{cvFile.name}</b><small>{(cvFile.size / 1024 / 1024).toFixed(1)} MB · Ready to audit</small></span><span className="change-file">Change</span></> : <><span className="cv-upload-icon"><Icon name="upload" size={21}/></span><span><b>Drop your CV here or browse</b><small>PDF, DOC or DOCX · Maximum 5 MB</small></span></>}</label>{uploadError && <p className="upload-error">{uploadError}</p>}</div>{audited ? <div className="audit-grid"><article className="audit-score"><span>ATS readiness score</span><div className="score-ring"><b>78</b><small>/100</small></div><strong>Strong foundation</strong><p>Your CV is readable by most systems. A few targeted improvements could make it more competitive for this role.</p><button onClick={() => setActive('Find jobs')}>Find matching jobs <Icon name="arrow" size={15}/></button></article><article className="audit-panel"><div className="audit-heading"><div><span className="eyebrow muted">Keyword gap analysis</span><h2>What recruiters will look for</h2></div><span className="market-tag">{region}</span></div><div className="keyword-row"><span>Found in your CV</span><div>{keywords.slice(0, 2).map(word => <b className="keyword found" key={word}><Icon name="check" size={12}/>{word}</b>)}</div></div><div className="keyword-row"><span>Worth adding</span><div>{keywords.slice(2).map(word => <b className="keyword missing" key={word}>+ {word}</b>)}</div></div><div className="audit-tip"><Icon name="spark" size={18}/><p><b>Resumly tip:</b> Add one outcome for each key skill, such as “Created 12 reusable components in Figma”. This helps both ATS matching and hiring-manager scans.</p></div></article><article className="audit-panel structure-panel"><span className="eyebrow muted">Structural audit</span><h2>Local portal ready</h2><div className="structure-item"><span className="structure-check"><Icon name="check" size={13}/></span><div><b>Contact details</b><small>Clear and in a standard header format</small></div><em>Pass</em></div><div className="structure-item"><span className="structure-check"><Icon name="check" size={13}/></span><div><b>Experience chronology</b><small>Reverse chronological and easy to parse</small></div><em>Pass</em></div><div className="structure-item warn"><span className="structure-check">!</span><div><b>Skills section</b><small>Add 2 role-specific keywords for this market</small></div><em>Action</em></div></article></div> : <div className="audit-intro"><span className="empty-icon"><Icon name="search" size={26}/></span><h2>Your regional ATS check starts here.</h2><p>Attach your CV, enter a role and choose a market to get a keyword gap analysis and structural audit tailored to local expectations.</p></div>}</section>;
}

function ApplicationModal({ job, onClose, onSubmit, onAudit }) {
  const [note, setNote] = useState(''); const [cv, setCv] = useState('Alex_Morgan_CV.pdf');
  if (!job) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="application-modal" onSubmit={e => { e.preventDefault(); onSubmit(job, note, cv); }}><button type="button" className="modal-close" onClick={onClose}>x</button><span className="eyebrow muted">Application</span><h2>Apply to {job.company}</h2><p className="modal-role">{job.role} · {job.place}</p><label>Choose a CV<select value={cv} onChange={e => setCv(e.target.value)}><option>Alex_Morgan_CV.pdf</option><option>Alex_Morgan_Design_CV.pdf</option></select></label><div className="ats-note"><span className="resumly-mini">R</span><div><b>Check this CV with Resumly.ai</b><small>Get keyword and format feedback before you send.</small></div><button type="button" onClick={onAudit}>Open audit</button></div><label>Short note to the hiring team<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Tell the team why this role interests you..." /></label><button className="send-application" type="submit">Send application <Icon name="arrow" size={16}/></button></form></div>;
}

function AuthPage({ onSignIn }) {
  const [mode, setMode] = useState('signin'); const [name, setName] = useState('Alex Morgan'); const [email, setEmail] = useState('alex@example.com');
  return <div className="auth-page"><section className="auth-art"><button className="brand"><span className="brand-mark">w</span><span>workly</span></button><div><span className="eyebrow">Work that moves you forward</span><h1>Start the career<br/><em>you deserve.</em></h1><p>Discover opportunities, prove your skills and apply with confidence.</p></div><div className="auth-points"><span><Icon name="check" size={15}/> Curated early-career jobs</span><span><Icon name="check" size={15}/> Resumly.ai ATS guidance</span><span><Icon name="check" size={15}/> Free for job seekers</span></div></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={e => { e.preventDefault(); onSignIn({ name, email }); }}><span className="eyebrow muted">Welcome to workly</span><h2>{mode === 'signin' ? 'Welcome back.' : 'Create your account.'}</h2><p>{mode === 'signin' ? 'Sign in to pick up your job search.' : 'Your next opportunity could be one click away.'}</p>{mode === 'signup' && <label>Full name<input required value={name} onChange={e => setName(e.target.value)} /></label>}<label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input required type="password" defaultValue="password" /></label><button type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={16}/></button><button type="button" className="auth-alt" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></form></section></div>;
}

function ProfileModal({ profile, onClose, onSave }) {
  const [name, setName] = useState(profile.name); const [headline, setHeadline] = useState(profile.headline); const [location, setLocation] = useState(profile.location);
  return <div className="modal-backdrop"><form className="application-modal profile-modal" onSubmit={e => { e.preventDefault(); onSave({ name, headline, location }); }}><button type="button" className="modal-close" onClick={onClose}>x</button><span className="eyebrow muted">Profile settings</span><h2>Set up your profile</h2><p className="modal-role">Keep this current so employers can find the right fit.</p><label>Full name<input value={name} onChange={e => setName(e.target.value)} /></label><label>Career headline<input value={headline} onChange={e => setHeadline(e.target.value)} /></label><label>Location<input value={location} onChange={e => setLocation(e.target.value)} /></label><button className="send-application" type="submit">Save profile <Icon name="check" size={16}/></button></form></div>;
}

function DiscoverOverview({ setActive }) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState('Find jobs');
  const matchingJobs = jobs.filter(job => `${job.role} ${job.company} ${job.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4);
  const features = [{ title: 'Find jobs', copy: 'Search roles, save favourites and apply when you are ready.' }, { title: 'Early Career Programmes', copy: 'Explore internships and apprenticeships that build experience.' }, { title: 'ATS Checkers', copy: 'Create a tailored CV and check it before you apply.' }];
  return <section className="discover-overview"><div className="overview-hero"><span className="eyebrow">Welcome to Workly</span><h1>Your next opportunity,<br/><em>made easier to find.</em></h1><p>Browse available jobs, build your confidence and use practical tools to take the next step in your career.</p><div><button onClick={() => setActive('Find jobs')}>Browse all {jobs.length} jobs <Icon name="arrow" size={17}/></button><button className="outline" onClick={() => setActive('Early Career Programmes')}>Explore programmes</button></div></div><div className="overview-content"><section className="overview-jobs"><div className="overview-heading"><div><span className="eyebrow muted">Available opportunities</span><h2>Browse jobs that fit your goals</h2></div><button onClick={() => setActive('Find jobs')}>View all jobs <Icon name="arrow" size={15}/></button></div><label className="overview-search"><Icon name="search" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search roles, companies or skills" /></label><div className="overview-job-list">{matchingJobs.length ? matchingJobs.map(job => <button key={job.id} className="overview-job" onClick={() => setActive('Find jobs')}><span className="company-logo" style={{ background: job.color, color: job.text }}>{job.logo}</span><span><b>{job.role}</b><small>{job.company} · {job.place}</small></span><Icon name="arrow" size={16}/></button>) : <p className="empty">No jobs match that search. Try another term.</p>}</div></section><section className="how-it-works"><span className="eyebrow muted">How Workly works</span><h2>Everything you need to move forward</h2>{['Browse roles and programmes that interest you.', 'Use ATS Checkers to create a stronger CV.', 'Apply with confidence and track your progress.'].map((step, index) => <div className="how-step" key={step}><span>{index + 1}</span><p>{step}</p></div>)}</section><section className="feature-explorer"><div><span className="eyebrow muted">Explore the platform</span><h2>Choose where to start</h2></div><div className="feature-tabs">{features.map(feature => <button key={feature.title} className={selected === feature.title ? 'selected' : ''} onClick={() => setSelected(feature.title)}>{feature.title}</button>)}</div><div className="feature-detail"><p>{features.find(feature => feature.title === selected).copy}</p><button onClick={() => setActive(selected)}>Open {selected} <Icon name="arrow" size={16}/></button></div></section></div></section>;
}

function ATSCheckers({ profile, onApply, notify }) {
  const [targetRole, setTargetRole] = useState('');
  const [summary, setSummary] = useState('');
  const [consent, setConsent] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(String(jobs[0].id));

  // ── Shared file state (used by BOTH CV builder and ATS checker) ──
  const [sharedFile, setSharedFile] = useState(null);

  // CV Builder upload state
  const [cvBuilderError, setCvBuilderError] = useState('');
  const [cvBuilderDrag, setCvBuilderDrag] = useState(false);
  const [cvPrefilled, setCvPrefilled] = useState(false);

  // ATS checker state
  const [resumeError, setResumeError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysed, setAnalysed] = useState(false);
  const [atsScore, setAtsScore] = useState(0);
  const [atsCheckRole, setAtsCheckRole] = useState('');

  // ATS checker panel ref for smooth scroll
  const atsCheckerRef = useRef(null);

  const ALLOWED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const MAX_MB = 5;

  // CV Builder: attach existing CV
  const attachCVForBuilder = file => {
    setCvBuilderError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) {
      return setCvBuilderError('Only PDF, DOC or DOCX files are accepted.');
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return setCvBuilderError(`File is too large. Maximum size is ${MAX_MB} MB.`);
    }
    setSharedFile(file);
    setCvPrefilled(false);
    // Simulate reading the CV and pre-filling the fields
    setTimeout(() => {
      if (!targetRole) setTargetRole('Junior Product Designer');
      if (!summary) setSummary('Results-driven early-career professional with a strong foundation in design thinking, collaboration and problem solving. Passionate about creating intuitive user experiences.');
      setCvPrefilled(true);
      notify('CV attached — fields pre-filled from your document');
    }, 900);
  };

  const handleCVBuilderDrop = e => {
    e.preventDefault();
    setCvBuilderDrag(false);
    attachCVForBuilder(e.dataTransfer.files?.[0]);
  };

  const removeCVFromBuilder = () => {
    setSharedFile(null);
    setCvPrefilled(false);
    setCvBuilderError('');
    setAnalysed(false);
  };

  // ATS Checker: validate and set (uses sharedFile)
  const validateAndSetATS = file => {
    setResumeError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) {
      return setResumeError('Only PDF, DOC or DOCX files are accepted.');
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return setResumeError(`File is too large. Maximum size is ${MAX_MB} MB.`);
    }
    setSharedFile(file);
    setAnalysed(false);
  };

  const handleATSDrop = e => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetATS(e.dataTransfer.files?.[0]);
  };

  // Send builder's CV to ATS checker and scroll to it
  const sendToATSChecker = () => {
    if (!sharedFile) return;
    setAnalysed(false);
    setResumeError('');
    if (atsCheckerRef.current) {
      atsCheckerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    notify('CV loaded in ATS checker — click Run ATS check');
  };

  const runAnalysis = () => {
    if (!sharedFile) return setResumeError('Please attach your resume first.');
    setAnalysing(true);
    setAnalysed(false);
    setTimeout(() => {
      setAtsScore(Math.floor(Math.random() * 25) + 62);
      setAnalysing(false);
      setAnalysed(true);
      notify('ATS analysis complete!');
    }, 2200);
  };

  const scoreLabel = s => s >= 85 ? 'Excellent' : s >= 70 ? 'Strong' : s >= 55 ? 'Fair' : 'Needs work';
  const scoreColor = s => s >= 85 ? '#3a9e5f' : s >= 70 ? '#416baf' : s >= 55 ? '#c07a2a' : '#b84848';

  const foundKeywords = ['Communication', 'Collaboration', 'Problem solving', 'Attention to detail'];
  const missingKeywords = atsCheckRole
    ? [atsCheckRole.split(' ')[0], 'Stakeholder management', 'Data analysis']
    : ['Role-specific skills', 'Industry keywords', 'Metrics & outcomes'];

  const createCV = () => {
    const selectedJob = jobs.find(job => String(job.id) === selectedJobId);
    const cv = `${profile.name}\n${profile.headline}\n${profile.location}\n\nPROFILE\n${summary || 'Motivated early-career professional ready to learn and contribute.'}\n\nTARGET ROLE\n${targetRole || selectedJob?.role || 'Early-career opportunity'}\n\nKEY SKILLS\nCommunication · Collaboration · Problem solving`;
    const file = new Blob([cv], { type: 'text/plain' }); const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = `${profile.name.replace(/\s+/g, '-')}-CV.txt`; link.click(); URL.revokeObjectURL(url); notify('Your CV draft has been downloaded');
  };
  const applyWithConsent = () => { if (!consent) return notify('Please confirm your consent before applying.'); const job = jobs.find(item => String(item.id) === selectedJobId); if (job) onApply(job); };

  return (
    <section className="ats-page">
      <div className="ats-hero">
        <span className="eyebrow">Career tools</span>
        <h1>ATS Checkers</h1>
        <p>Create a focused CV, check its ATS readiness, and prepare an application with your explicit approval.</p>
      </div>

      <div className="ats-tools">
        <article className="ats-tool-card">
          <span className="eyebrow muted">1 · CV builder</span>
          <h2>Create a tailored CV</h2>

          {/* ── Attach existing CV ── */}
          <div className="cvb-upload-wrap">
            <p className="cvb-upload-label">Already have a CV? Attach it to pre-fill the fields below or send it straight to the ATS checker.</p>
            {sharedFile ? (
              <div className="cvb-file-row">
                <span className="cvb-file-icon"><Icon name="file" size={18}/></span>
                <div className="cvb-file-info">
                  <b>{sharedFile.name}</b>
                  <small>{(sharedFile.size / 1024 / 1024).toFixed(2)} MB{cvPrefilled ? ' · Fields pre-filled ✓' : ' · Loading…'}</small>
                </div>
                <div className="cvb-file-actions">
                  <button className="cvb-action-btn cvb-action-btn--ats" onClick={sendToATSChecker} title="Send to ATS checker">
                    <Icon name="spark" size={13}/> ATS check
                  </button>
                  <button className="cvb-action-btn cvb-action-btn--remove" onClick={removeCVFromBuilder} title="Remove file">✕</button>
                </div>
              </div>
            ) : (
              <label
                className={`cvb-dropzone${cvBuilderDrag ? ' cvb-dropzone--drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setCvBuilderDrag(true); }}
                onDragLeave={() => setCvBuilderDrag(false)}
                onDrop={handleCVBuilderDrop}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => attachCVForBuilder(e.target.files?.[0])}
                />
                <span className="cvb-dz-icon"><Icon name="upload" size={16}/></span>
                <span className="cvb-dz-text">
                  <b>Attach your existing CV</b>
                  <small>PDF, DOC or DOCX · Max 5 MB</small>
                </span>
              </label>
            )}
            {cvBuilderError && <p className="cvb-error">{cvBuilderError}</p>}
          </div>

          {cvPrefilled && (
            <div className="cvb-prefill-notice">
              <Icon name="check" size={12}/> Fields pre-filled from your CV — edit freely before downloading.
            </div>
          )}

          <label>Target role<input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Junior product designer" /></label>
          <label>Professional summary<textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Highlight your strengths, skills and goals" /></label>
          <button onClick={createCV}>Create and download CV <Icon name="download" size={16}/></button>
        </article>

        <article className="ats-tool-card consent-card">
          <span className="eyebrow muted">2 · Application consent</span>
          <h2>Apply with your approval</h2>
          <label>Choose a role<select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>{jobs.map(job => <option key={job.id} value={job.id}>{job.role} · {job.company}</option>)}</select></label>
          <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>I approve Workly to use my CV details to prepare this application.</span></label>
          <small>Your application is never sent unless you give consent and confirm it in the next step.</small>
          <button onClick={applyWithConsent} disabled={!consent}>Continue to application <Icon name="arrow" size={16}/></button>
        </article>
      </div>

      {/* ── Resume ATS Upload Section ── */}
      <div className="ats-upload-section" ref={atsCheckerRef}>
        <div className="ats-upload-header">
          <span className="eyebrow muted">3 · Resume ATS checker</span>
          <h2>Upload your resume for an instant ATS analysis</h2>
          <p>Get a keyword gap report, structural audit and ATS readiness score — all in seconds. Your file never leaves your device.</p>
        </div>

        {sharedFile && !analysed && !analysing && (
          <div className="ats-shared-banner">
            <span><Icon name="file" size={15}/></span>
            <span><b>{sharedFile.name}</b> is ready from your CV builder — click <strong>Run ATS check</strong> to analyse it.</span>
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
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={e => validateAndSetATS(e.target.files?.[0])}
              />
              {sharedFile ? (
                <div className="ats-file-attached">
                  <span className="ats-file-icon"><Icon name="file" size={24}/></span>
                  <div>
                    <b>{sharedFile.name}</b>
                    <small>{(sharedFile.size / 1024 / 1024).toFixed(2)} MB · Ready to analyse</small>
                  </div>
                  <span className="ats-change-badge">Change</span>
                </div>
              ) : (
                <div className="ats-upload-prompt">
                  <span className="ats-upload-icon"><Icon name="upload" size={26}/></span>
                  <b>Drop your resume here or click to browse</b>
                  <small>PDF, DOC or DOCX · Maximum 5 MB</small>
                </div>
              )}
            </label>

            {resumeError && <p className="ats-upload-error">{resumeError}</p>}

            <label className="ats-role-label">
              Target role <span>(optional — improves keyword matching)</span>
              <input
                value={atsCheckRole}
                onChange={e => setAtsCheckRole(e.target.value)}
                placeholder="e.g. Marketing coordinator"
              />
            </label>

            <button
              className={`ats-run-btn${analysing ? ' ats-run-btn--loading' : ''}`}
              onClick={runAnalysis}
              disabled={analysing}
            >
              {analysing
                ? <><span className="ats-spinner"/> Analysing your resume…</>
                : <><Icon name="spark" size={16}/> Run ATS check</>
              }
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
                <div className="ats-scan-anim">
                  <div className="ats-scan-line"/>
                </div>
                <p className="ats-scanning-label">Scanning your resume…</p>
              </div>
            )}

            {analysed && !analysing && (
              <div className="ats-report">
                {/* Score */}
                <div className="ats-report-score">
                  <div className="ats-score-ring" style={{ '--score-color': scoreColor(atsScore), '--pct': `${atsScore}%` }}>
                    <b>{atsScore}</b><small>/100</small>
                  </div>
                  <div>
                    <strong style={{ color: scoreColor(atsScore) }}>{scoreLabel(atsScore)}</strong>
                    <p>Your resume is readable by most ATS systems. A few targeted improvements could increase your match rate.</p>
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
                  {[
                    { label: 'Contact details', note: 'Clear and in standard header format', pass: true },
                    { label: 'Experience chronology', note: 'Reverse-chronological and easy to parse', pass: true },
                    { label: 'Skills section', note: 'Add 2–3 role-specific keywords', pass: false },
                    { label: 'Quantified outcomes', note: 'Include numbers and results where possible', pass: false },
                  ].map(item => (
                    <div key={item.label} className={`ats-struct-item${item.pass ? '' : ' ats-struct-item--warn'}`}>
                      <span className="ats-struct-check">{item.pass ? <Icon name="check" size={12}/> : '!'}</span>
                      <div><b>{item.label}</b><small>{item.note}</small></div>
                      <em>{item.pass ? 'Pass' : 'Action'}</em>
                    </div>
                  ))}
                </div>

                <div className="ats-report-tip">
                  <Icon name="spark" size={16}/>
                  <p><b>Tip:</b> Add one measurable outcome for each key skill — e.g. "Reduced onboarding time by 30%". This boosts both ATS matching and recruiter confidence.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [active, setActive] = useState('Discover'); const [saved, setSaved] = useState([]); const [applications, setApplications] = useState([]); const [toast, setToast] = useState(''); const [selectedJob, setSelectedJob] = useState(null); const [signedIn, setSignedIn] = useState(true); const [notificationsOpen, setNotificationsOpen] = useState(false); const [accountOpen, setAccountOpen] = useState(false); const [profileOpen, setProfileOpen] = useState(false); const [profile, setProfile] = useState({ name: 'Alex Morgan', email: 'alex@example.com', headline: 'Early-career product designer', location: 'Harare, Zimbabwe' });
  const nav = ['Find jobs', 'Early Career Programmes', 'My applications', 'ATS Checkers']; const notify = message => { setToast(message); setTimeout(() => setToast(''), 2300); };
  const save = id => { setSaved(current => current.includes(id) ? current.filter(savedId => savedId !== id) : [...current, id]); notify(saved.includes(id) ? 'Job removed from saved roles' : 'Job saved to your list'); };
  const apply = job => { if (applications.some(app => app.id === job.id)) return notify('You have already applied for this role'); setSelectedJob(job); };
  const submitApplication = (job) => { setApplications(current => [...current, { ...job, status: current.length === 1 ? 'Interview' : 'Reviewing' }]); setSelectedJob(null); notify(`Application sent to ${job.company}`); };
  if (!signedIn) return <AuthPage onSignIn={details => { setProfile(current => ({ ...current, ...details })); setSignedIn(true); notify('Welcome to Workly'); }} />;
  if (active === 'Landing') return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setActive('Discover')}><span className="brand-mark">w</span><span>workly</span></button><nav>{nav.map(item => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}>{item}</button>)}</nav><div className="top-actions"><button className="employer-button" onClick={() => notify('Employer dashboard opened')}><Icon name="grid" size={17}/> For employers</button></div></header><main><Discover setActive={setActive} notify={notify}/></main></div>;
  if (active === 'Explore') return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setActive('Home')}><span className="brand-mark">w</span><span>workly</span></button><nav>{nav.map(item => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}>{item}</button>)}</nav><div className="top-actions"><button className="employer-button" onClick={() => notify('Employer dashboard opened')}><Icon name="grid" size={17}/> For employers</button></div></header><main><DiscoverOverview setActive={setActive}/></main></div>;
  if (active === 'ATS Checkers') return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setActive('Discover')}><span className="brand-mark">w</span><span>workly</span></button><nav>{nav.map(item => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}>{item}</button>)}</nav></header><main><ATSCheckers profile={profile} onApply={apply} notify={notify}/></main><ApplicationModal job={selectedJob} onClose={() => setSelectedJob(null)} onSubmit={submitApplication} onAudit={() => { setSelectedJob(null); setActive('ATS Checkers'); }}/>{toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}</div>;
  if (active === 'Early Career Programmes') return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setActive('Discover')}><span className="brand-mark">w</span><span>workly</span></button><nav>{nav.map(item => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}>{item}</button>)}</nav><div className="top-actions"><button className="employer-button" onClick={() => notify('Employer dashboard opened')}><Icon name="grid" size={17}/> For employers</button></div></header><main><BrowseJobs programmesOnly saved={saved} applications={applications} onSave={save} onApply={apply}/></main><ApplicationModal job={selectedJob} onClose={() => setSelectedJob(null)} onSubmit={submitApplication} onAudit={() => { setSelectedJob(null); setActive('Resumly.ai'); }}/>{toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}</div>;
  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setActive('Discover')}><span className="brand-mark">w</span><span>workly</span></button><nav>{nav.map(item => <button key={item} className={active === item ? (item === 'No Experience Needed' ? 'nav-item active nav-item-noexp' : 'nav-item active') : (item === 'No Experience Needed' ? 'nav-item nav-item-noexp' : 'nav-item')} onClick={() => setActive(item)}>{item}</button>)}</nav><div className="top-actions"><div className="header-popover"><button className="icon-button" onClick={() => { setNotificationsOpen(!notificationsOpen); setAccountOpen(false); }}><Icon name="bell" size={19}/><i/></button>{notificationsOpen && <div className="notification-panel"><b>Notifications</b><button onClick={() => setActive('My applications')}><span className="notice-dot"/>Your application progress is ready to view<small>Just now</small></button><button onClick={() => setActive('Resumly.ai')}><span className="notice-dot"/>Resumly.ai found 2 CV improvements<small>Today</small></button><button onClick={() => { setNotificationsOpen(false); notify('Notifications marked as read'); }}>Mark all as read</button></div>}</div><div className="header-popover"><button className="avatar" onClick={() => { setAccountOpen(!accountOpen); setNotificationsOpen(false); }}>{profile.name.split(' ').map(word => word[0]).join('').slice(0,2)}</button>{accountOpen && <div className="account-menu"><div><b>{profile.name}</b><small>{profile.email}</small></div><button onClick={() => { setAccountOpen(false); setProfileOpen(true); }}>Profile settings</button><button onClick={() => { setAccountOpen(false); setActive('My applications'); }}>My applications</button><button className="logout" onClick={() => { setSignedIn(false); setAccountOpen(false); }}>Log out</button></div>}</div><button className="employer-button" onClick={() => notify('Employer dashboard opened')}><Icon name="grid" size={17}/> For employers</button></div></header><main>{active === 'Discover' && <Discover setActive={setActive} notify={notify}/>} {active === 'Find jobs' && <BrowseJobs saved={saved} applications={applications} onSave={save} onApply={apply}/>} {active === 'No Experience Needed' && <NoExpNeeded saved={saved} applications={applications} onSave={save} onApply={apply}/>} {active === 'Internships' && <BrowseJobs internshipOnly saved={saved} applications={applications} onSave={save} onApply={apply}/>} {active === 'Apprenticeships' && <BrowseJobs apprenticeshipOnly saved={saved} applications={applications} onSave={save} onApply={apply}/>} {active === 'My applications' && <Applications applications={applications} setActive={setActive}/>} {active === 'Resumly.ai' && <Resumly setActive={setActive} notify={notify}/>}</main><ApplicationModal job={selectedJob} onClose={() => setSelectedJob(null)} onSubmit={submitApplication} onAudit={() => { setSelectedJob(null); setActive('Resumly.ai'); }}/>{profileOpen && <ProfileModal profile={profile} onClose={() => setProfileOpen(false)} onSave={details => { setProfile(current => ({ ...current, ...details })); setProfileOpen(false); notify('Profile settings saved'); }}/>} {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}</div>;
}

export default App;
