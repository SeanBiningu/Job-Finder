/**
 * AI Job Matcher Test Script
 * Tests candidate profile matching against realistic live job descriptions.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { matchCandidateWithJobs } = require('../api/ai-match');

const candidate = {
  name: 'Amara Okafor',
  title: 'Junior Frontend Developer',
  skills: ['React', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Git', 'HTML/CSS'],
  experience: '1 year as Frontend Intern at Kora Labs building interactive React dashboard components.',
  education: 'BSc in Computer Science, 2025',
  careerInterests: ['Modern web applications', 'Frontend architecture', 'UI engineering'],
  bio: 'Enthusiastic junior frontend developer passionate about clean React code, component libraries, and accessible UI.',
};

const realJobs = [
  {
    id: 'job-101',
    role: 'Junior Frontend Engineer',
    company: 'FinTech Dynamics',
    place: 'Harare, Zimbabwe (Hybrid)',
    type: 'Full-time',
    tags: ['React', 'JavaScript', 'Web Development'],
    description: `We are looking for a Junior Frontend Engineer to join our growing payments engineering squad.
Key Responsibilities:
- Build reusable UI components using React, TypeScript, and modern CSS.
- Collaborate with designers to translate Figma mockups into responsive web apps.
- Integrate RESTful APIs and handle asynchronous state management.
Requirements:
- 1+ years experience with React and JavaScript (ES6+).
- Proficiency with Git version control and modern CSS frameworks (Tailwind or styled-components).
- Basic understanding of TypeScript is an advantage.
- Strong team player with a passion for clean, readable code.`,
  },
  {
    id: 'job-102',
    role: 'Senior Staff Distributed Systems Architect',
    company: 'CloudScale Global',
    place: 'Remote',
    type: 'Full-time',
    tags: ['Rust', 'Distributed Systems', 'Kubernetes', 'Go'],
    description: `Looking for a Senior Staff Architect with 8+ years experience designing high-throughput distributed databases.
Requirements:
- Deep expertise in Rust, C++, or Go.
- 8+ years designing fault-tolerant consensus protocols (Raft, Paxos).
- Production experience with Kubernetes internals, eBPF, and kernel-level network tuning.
- Advanced degree in Computer Science or equivalent mathematical rigor.`,
  },
  {
    id: 'job-103',
    role: 'Full Stack Graduate Developer',
    company: 'NextGen Solutions',
    place: 'Cape Town, South Africa',
    type: 'Graduate',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    description: `Join our accelerated graduate engineering programme!
You will rotate between frontend React and backend Node.js / SQL microservices.
Requirements:
- Degree in Computer Science, Software Engineering, or related discipline.
- Solid grounding in JavaScript and React fundamentals.
- Curiosity to learn backend Node.js, PostgreSQL, and cloud deployments (AWS/Docker).
- Fresh graduates and juniors with personal or internship projects are warmly invited to apply.`,
  },
];

async function runTest() {
  console.log('====================================================');
  console.log('           JOB.WORKLY - AI JOB MATCHING TEST        ');
  console.log('====================================================');
  console.log(`Candidate: ${candidate.name} (${candidate.title})`);
  console.log(`Skills: ${candidate.skills.join(', ')}`);
  console.log(`Number of real jobs to evaluate: ${realJobs.length}`);
  console.log('----------------------------------------------------\n');

  console.log('Running AI Job Matching Engine...\n');
  const startTime = Date.now();
  const results = await matchCandidateWithJobs(candidate, realJobs);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`Matching completed in ${elapsed}s!\n`);
  console.log('RANKED MATCH RESULTS:');
  console.log('====================================================');

  results.forEach((match, index) => {
    const job = realJobs.find((j) => j.id === match.jobId);
    console.log(`\n#${index + 1}: ${job ? job.role : match.jobId} @ ${job ? job.company : 'Unknown'}`);
    console.log(`    Suitability Score : [${match.suitabilityScore}/100]`);
    console.log(`    Experience Match  : ${match.experienceMatch.toUpperCase()}`);
    console.log(`    Matching Skills   : ${match.matchingSkills.join(', ') || 'None'}`);
    console.log(`    Missing Skills    : ${match.missingSkills.join(', ') || 'None'}`);
    console.log(`    Recommendation    : ${match.recommendationReason}`);
    if (match.strengths && match.strengths.length) {
      console.log(`    Key Strengths     : ${match.strengths.join(' | ')}`);
    }
    if (match.growthAreas && match.growthAreas.length) {
      console.log(`    Growth Areas      : ${match.growthAreas.join(' | ')}`);
    }
  });

  console.log('\n====================================================');
  console.log('Test completed successfully.');
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
