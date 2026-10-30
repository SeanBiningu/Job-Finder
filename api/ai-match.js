/**
 * AI Job Matching Endpoint
 * Evaluates candidate profiles against real job descriptions, producing:
 * - 0-100 Suitability Score
 * - Matching Skills & Missing Skills
 * - Tailored Recommendation Rationale
 * - Ranked Results
 */

const { callChatCompletion } = require('./lib/aiGateway');

/**
 * Sanitizes and extracts the essential requirements from a raw job description
 * to reduce token count and eliminate marketing/legal boilerplate.
 */
function cleanJobDescription(text = '', maxChars = 1200) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .replace(/(?:Equal Opportunity Employer|EEO|We are an equal opportunity|All qualified applicants will receive consideration)[\s\S]*/i, '') // Remove legal boilerplate
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

/**
 * Tier 1 Pre-filter: Computes a fast lexical score to shortlist the top jobs
 * before sending to the LLM. This prevents burning tokens on completely irrelevant jobs.
 */
function preFilterJobs(candidate, jobs, maxJobsToEvaluate = 10) {
  const candidateTerms = new Set([
    ...(candidate.skills || []).map((s) => s.toLowerCase()),
    ...(candidate.title ? candidate.title.toLowerCase().split(/\s+/) : []),
    ...(candidate.careerInterests || []).map((i) => i.toLowerCase()),
  ].filter((t) => t.length > 2));

  const scored = jobs.map((job) => {
    const jobText = `${job.role} ${job.company} ${(job.tags || []).join(' ')} ${job.description || ''}`.toLowerCase();
    let overlap = 0;
    candidateTerms.forEach((term) => {
      if (jobText.includes(term)) overlap += 2;
    });

    // Check level match
    const isJuniorJob = /junior|intern|graduate|entry|trainee|apprentice/i.test(job.role);
    const isJuniorCandidate = /junior|intern|graduate|entry|student/i.test(candidate.title || '');
    if (isJuniorJob === isJuniorCandidate) overlap += 3;

    return { job, preScore: overlap };
  });

  scored.sort((a, b) => b.preScore - a.preScore);
  return scored.slice(0, maxJobsToEvaluate).map((item) => item.job);
}

/**
 * Heuristic Matcher: High-quality fallback when OPENAI_API_KEY is not set.
 */
function heuristicMatch(candidate, jobs) {
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase());

  return jobs.map((job) => {
    const desc = `${job.role} ${job.tags ? job.tags.join(' ') : ''} ${job.description || ''}`.toLowerCase();
    const matchingSkills = [];
    const missingSkills = [];

    candidateSkills.forEach((skill) => {
      if (desc.includes(skill)) {
        matchingSkills.push(skill);
      }
    });

    // Look for common industry skills in job description that candidate doesn't list
    const commonSkills = ['python', 'react', 'sql', 'typescript', 'figma', 'node.js', 'aws', 'docker', 'agile', 'rest api', 'ui/ux', 'excel', 'git'];
    commonSkills.forEach((tech) => {
      if (desc.includes(tech) && !candidateSkills.includes(tech)) {
        missingSkills.push(tech.charAt(0).toUpperCase() + tech.slice(1));
      }
    });

    const skillScore = candidateSkills.length > 0 ? (matchingSkills.length / Math.max(candidateSkills.length, 3)) * 60 : 30;
    const titleMatch = (candidate.title && desc.includes(candidate.title.toLowerCase())) ? 25 : 10;
    const suitabilityScore = Math.min(96, Math.max(35, Math.round(skillScore + titleMatch + 15)));

    return {
      jobId: job.id,
      suitabilityScore,
      matchingSkills: matchingSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      missingSkills: missingSkills.slice(0, 4),
      experienceMatch: suitabilityScore > 75 ? 'matched' : suitabilityScore > 50 ? 'partial' : 'underqualified',
      recommendationReason: matchingSkills.length > 0
        ? `Strong profile alignment in ${matchingSkills.slice(0, 2).join(' and ')} for the ${job.role} role at ${job.company}.`
        : `Relevant career interest fit for ${job.role} at ${job.company}; consider boosting key technical requirements.`,
      strengths: matchingSkills.slice(0, 3),
      growthAreas: missingSkills.slice(0, 2),
    };
  });
}

/**
 * Builds the AI prompt and system instructions for matching.
 */
function constructMatchPrompt(candidate, selectedJobs) {
  const candidateSummary = {
    name: candidate.name || 'Candidate',
    targetTitle: candidate.title || 'Job Seeker',
    skills: candidate.skills || [],
    experience: candidate.experience || 'Not specified',
    education: candidate.education || 'Not specified',
    careerInterests: candidate.careerInterests || [],
    bio: candidate.bio || '',
  };

  const jobSummaries = selectedJobs.map((job) => ({
    jobId: job.id,
    role: job.role,
    company: job.company,
    location: job.place,
    type: job.type,
    tags: job.tags || [],
    descriptionSnippet: cleanJobDescription(job.description, 800),
  }));

  const systemPrompt = `You are an expert AI Talent Acquisition and Career Matching Specialist for the Job.Workly platform.
Your task is to impartially evaluate candidate fit against real job descriptions.

EVALUATION WEIGHTING RUBRIC (Total 0–100):
1. Core Technical & Required Skills (40 pts): Direct match of required tools, programming languages, and proficiencies.
2. Experience Level Alignment (25 pts): Seniority match (e.g. Intern vs Junior vs Mid vs Senior). Deduct heavily if a junior candidate applies to a Senior/Lead position requiring 5+ years.
3. Domain & Role Fit (20 pts): Alignment of career interests, degree/education, and industry background.
4. Soft Skills & Work Mode (15 pts): Methodologies (Agile, collaboration), communication, and location compatibility.

STRICT ACCURACY RULES:
- Never inflate scores. Average fits should be 50-70. Exceptional fits with 85%+ require strong evidence in skills and experience.
- Only identify 'matchingSkills' that are explicitly verified in candidate profile AND required by the job.
- 'missingSkills' must be explicitly demanded or expected in the job description that the candidate lacks.
- Return output strictly in valid JSON matching the specified schema.`;

  const userPrompt = `Candidate Profile:
${JSON.stringify(candidateSummary, null, 2)}

Real Jobs to Evaluate:
${JSON.stringify(jobSummaries, null, 2)}

Return a JSON object containing an array "matches" with one entry per evaluated job:
{
  "matches": [
    {
      "jobId": "exact job.id from input",
      "suitabilityScore": number (0 to 100),
      "matchingSkills": ["skill1", "skill2"],
      "missingSkills": ["skill1", "skill2"],
      "experienceMatch": "matched" | "partial" | "underqualified" | "overqualified",
      "recommendationReason": "Clear, objective 1-2 sentence explanation of why this job matches or what is lacking.",
      "strengths": ["Key candidate strength 1", "Key candidate strength 2"],
      "growthAreas": ["Key missing skill or experience 1"]
    }
  ]
}`;

  return { systemPrompt, userPrompt };
}

/**
 * Main AI Match Handler
 */
async function matchCandidateWithJobs(candidate, rawJobs) {
  if (!candidate || !Array.isArray(rawJobs) || rawJobs.length === 0) {
    return [];
  }

  // Step 1: Pre-filter jobs to top 10 most promising to optimize latency and cost
  const shortlistedJobs = preFilterJobs(candidate, rawJobs, 10);

  // If no OpenAI key is set, use the heuristic engine gracefully
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[AI Match] OPENAI_API_KEY is not configured. Utilizing heuristic matching engine.');
    const heuristicResults = heuristicMatch(candidate, shortlistedJobs);
    heuristicResults.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    return heuristicResults;
  }

  // Step 2: Construct AI Prompt
  const { systemPrompt, userPrompt } = constructMatchPrompt(candidate, shortlistedJobs);

  try {
    const aiResponse = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.15, // Low temperature for deterministic scoring
      maxTokens: 2500,
    });

    const parsed = aiResponse.content;
    const matches = Array.isArray(parsed?.matches) ? parsed.matches : [];

    // Step 3: Validate and normalize AI results
    const validatedMatches = matches.map((match) => {
      const score = Math.max(0, Math.min(100, Math.round(Number(match.suitabilityScore) || 50)));
      return {
        jobId: String(match.jobId),
        suitabilityScore: score,
        matchingSkills: Array.isArray(match.matchingSkills) ? match.matchingSkills : [],
        missingSkills: Array.isArray(match.missingSkills) ? match.missingSkills : [],
        experienceMatch: match.experienceMatch || (score > 75 ? 'matched' : 'partial'),
        recommendationReason: match.recommendationReason || 'Recommended based on skill relevance.',
        strengths: Array.isArray(match.strengths) ? match.strengths : [],
        growthAreas: Array.isArray(match.growthAreas) ? match.growthAreas : [],
      };
    });

    // Step 4: Sort by suitabilityScore descending
    validatedMatches.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    return validatedMatches;
  } catch (error) {
    console.error('[AI Match] LLM evaluation error, falling back to heuristic:', error.message);
    const fallbackResults = heuristicMatch(candidate, shortlistedJobs);
    fallbackResults.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    return fallbackResults;
  }
}

/**
 * HTTP Handler for Vercel Serverless / Express proxy
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { candidate, jobs } = req.body || {};

  if (!candidate || !jobs || !Array.isArray(jobs)) {
    return res.status(400).json({
      error: 'Invalid request payload. Expected { candidate: Object, jobs: Array }',
    });
  }

  try {
    const matches = await matchCandidateWithJobs(candidate, jobs);
    return res.status(200).json({
      success: true,
      count: matches.length,
      matches,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AI Match Handler] Error:', err);
    return res.status(500).json({
      error: 'Failed to process AI matching',
      details: err.message,
    });
  }
}

module.exports = handler;
module.exports.matchCandidateWithJobs = matchCandidateWithJobs;
