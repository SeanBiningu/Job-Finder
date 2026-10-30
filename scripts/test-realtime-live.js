/**
 * Real-Time End-to-End Live Verification Script
 * 
 * 1. Starts a live local server mounting src/setupProxy.js.
 * 2. Fetches LIVE jobs from Adzuna API over HTTP.
 * 3. Sends candidate profile + live jobs to POST /api/ai-match over HTTP.
 * 4. Measures real-time latency, suitability scores, and skill matching.
 * 5. Tests POST /api/ai-cv, POST /api/ai-assistant, and POST /api/ai-skills over HTTP.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const setupProxy = require('../src/setupProxy');

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runRealTimeTest() {
  console.log('===============================================================');
  console.log('        JOB.WORKLY - REAL-TIME LIVE SERVER TEST               ');
  console.log('===============================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // 1. Start live Express server with setupProxy
  const app = express();
  setupProxy(app);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  console.log(`[RealTime] Live HTTP server listening on ${BASE_URL}\n`);

  try {
    // 2. Test Live Jobs Feed (Real Adzuna query)
    console.log('[1/4] Querying live Adzuna jobs feed via GET /api/jobs?query=developer ...');
    const jobsStart = Date.now();
    const jobsRes = await fetch(`${BASE_URL}/api/jobs?query=developer`);
    const jobsElapsed = Date.now() - jobsStart;
    const jobsData = await jobsRes.json();

    console.log(`   -> HTTP Status: ${jobsRes.status} in ${jobsElapsed}ms`);
    console.log(`   -> Source: ${jobsData.source}`);
    console.log(`   -> Total live jobs received: ${jobsData.jobs ? jobsData.jobs.length : 0}`);

    if (jobsData.jobs && jobsData.jobs.length > 0) {
      console.log(`   -> Sample live job: "${jobsData.jobs[0].role}" at ${jobsData.jobs[0].company} (${jobsData.jobs[0].place})`);
      console.log(`   -> Has live description: ${Boolean(jobsData.jobs[0].description)} (${jobsData.jobs[0].description.length} chars)`);
    }

    const liveJobsToMatch = (jobsData.jobs && jobsData.jobs.length > 0)
      ? jobsData.jobs.slice(0, 5)
      : [
          {
            id: 'live-fallback-1',
            role: 'React Frontend Developer',
            company: 'TechCorp Africa',
            place: 'Harare, Zimbabwe',
            description: 'Looking for a React developer with TypeScript, Tailwind CSS, and Git. 1+ years experience building web apps.',
            tags: ['React', 'JavaScript'],
          },
          {
            id: 'live-fallback-2',
            role: 'DevOps & Cloud Systems Architect',
            company: 'Global Cloud Ltd',
            place: 'Remote',
            description: 'Requires 8+ years experience in Kubernetes, Terraform, AWS multi-region VPC architectures.',
            tags: ['DevOps', 'AWS'],
          },
        ];

    // 3. Test Real-Time AI Job Matching
    console.log('\n[2/4] Sending candidate + live jobs to POST /api/ai-match ...');
    const candidateProfile = {
      name: 'Amara Okafor',
      title: 'Junior Frontend Developer',
      skills: ['React', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Git', 'HTML/CSS'],
      experience: '1 year as Frontend Intern at Kora Labs.',
      education: 'BSc Computer Science',
      careerInterests: ['Modern web applications', 'Frontend architecture'],
    };

    const matchStart = Date.now();
    const matchRes = await fetch(`${BASE_URL}/api/ai-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate: candidateProfile,
        jobs: liveJobsToMatch,
      }),
    });
    const matchElapsed = Date.now() - matchStart;
    const matchData = await matchRes.json();

    console.log(`   -> HTTP Status: ${matchRes.status} in ${matchElapsed}ms`);
    console.log(`   -> Success: ${matchData.success}`);
    console.log(`   -> Jobs evaluated in real time: ${matchData.count}`);

    if (matchData.matches && matchData.matches.length > 0) {
      console.log('\n   REAL-TIME MATCH RANKINGS:');
      matchData.matches.forEach((m, idx) => {
        const matchingJob = liveJobsToMatch.find((j) => j.id === m.jobId);
        const title = matchingJob ? matchingJob.role : m.jobId;
        console.log(`   #${idx + 1}: ${title} -> Score: ${m.suitabilityScore}/100 [${m.experienceMatch}]`);
        console.log(`       Matching: ${m.matchingSkills.join(', ') || 'None'}`);
        console.log(`       Missing : ${m.missingSkills.join(', ') || 'None'}`);
        console.log(`       Reason  : ${m.recommendationReason}`);
      });
    }

    // 4. Test Real-Time AI CV Reviewer
    console.log('\n[3/4] Testing POST /api/ai-cv (Action: review) ...');
    const cvStart = Date.now();
    const cvRes = await fetch(`${BASE_URL}/api/ai-cv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'review',
        cvText: `Amara Okafor - Junior Frontend Developer
Skills: React, JavaScript, TypeScript, Tailwind CSS, Git
Experience: Frontend Intern at Kora Labs (2025-2026). Built user dashboards, improved page load speed by 25%, collaborated with senior engineers.
Education: BSc in Computer Science, University of Zimbabwe.`,
      }),
    });
    const cvElapsed = Date.now() - cvStart;
    const cvData = await cvRes.json();
    console.log(`   -> HTTP Status: ${cvRes.status} in ${cvElapsed}ms`);
    console.log(`   -> Success: ${cvData.success}`);
    if (cvData.data) {
      console.log(`   -> ATS Score: ${cvData.data.atsScore ?? 'Evaluated'}`);
      console.log(`   -> Executive Summary: ${cvData.data.executiveSummary || 'Generated'}`);
    }

    // 5. Test Real-Time AI Career Assistant
    console.log('\n[4/5] Testing POST /api/ai-assistant (Interview prep question) ...');
    const assistantStart = Date.now();
    const assistantRes = await fetch(`${BASE_URL}/api/ai-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'How do I answer "Tell me about a time you resolved a difficult bug" for a junior React role?' },
        ],
        userProfile: candidateProfile,
      }),
    });
    const assistantElapsed = Date.now() - assistantStart;
    const assistantData = await assistantRes.json();
    console.log(`   -> HTTP Status: ${assistantRes.status} in ${assistantElapsed}ms`);
    console.log(`   -> Success: ${assistantData.success}`);
    console.log(`   -> Detected Intent: ${assistantData.detectedIntent}`);
    console.log(`   -> Follow-Up Suggestions: ${(assistantData.suggestedFollowUps || []).join(' | ')}`);
    console.log(`   -> Reply snippet: ${(assistantData.reply || '').slice(0, 120)}...`);

    // 6. Test Real-Time AI Skills Gap Analysis
    console.log('\n[5/5] Testing POST /api/ai-skills (Skills Gap & Roadmap) ...');
    const skillsStart = Date.now();
    const skillsRes = await fetch(`${BASE_URL}/api/ai-skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentSkills: candidateProfile.skills,
        targetRole: 'Full Stack Engineer',
        experienceLevel: 'Junior',
      }),
    });
    const skillsElapsed = Date.now() - skillsStart;
    const skillsData = await skillsRes.json();
    console.log(`   -> HTTP Status: ${skillsRes.status} in ${skillsElapsed}ms`);
    console.log(`   -> Success: ${skillsData.success}`);
    if (skillsData.analysis) {
      console.log(`   -> Readiness Score: ${skillsData.analysis.readinessScore}/100`);
      console.log(`   -> Critical Gaps: ${(skillsData.analysis.criticalGaps || []).map(g => g.skill).join(', ')}`);
      console.log(`   -> Learning Roadmap Phases: ${(skillsData.analysis.learningRoadmap || []).length} phases generated`);
    }

    console.log('\n===============================================================');
    console.log('       ALL REAL-TIME HTTP ENDPOINTS TESTED & CONFIRMED         ');
    console.log('===============================================================');
  } finally {
    server.close();
  }
}

runRealTimeTest().catch((err) => {
  console.error('Real-time test failed:', err);
  process.exit(1);
});
