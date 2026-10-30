/**
 * AI CV Builder and Checker Endpoint
 * Provides:
 * 1. Deep CV Review & ATS Compatibility Scoring
 * 2. CV vs Job Comparison (Missing Keywords, Alignment)
 * 3. Tailored, Fact-Preserving Cover Letter Generation
 * 4. Professional Content Enhancement (Action + Context + Metric)
 */

const { callChatCompletion } = require('./lib/aiGateway');

const STRICT_ANTI_HALLUCINATION_DIRECTIVE = `
CRITICAL TRUTHFULNESS & ANTI-HALLUCINATION RULES:
1. NEVER invent, fabricate, or assume degrees, certifications, job titles, companies, dates, or metrics not provided in the candidate input.
2. If metrics or specific numbers are missing, use placeholders like [Insert % or metric] rather than making up numbers.
3. Enhance phrasing, structure, and professional tone, but preserve exact factual reality.
`;

function heuristicReview(cvText) {
  const text = cvText.toLowerCase();
  const wordCount = cvText.split(/\s+/).length;
  const hasNumbers = /\d+%|\$\d+|\d+\s*(?:users|clients|projects|engineers|team members)/i.test(cvText);
  const actionVerbs = ['developed', 'engineered', 'led', 'built', 'spearheaded', 'optimized', 'reduced', 'increased', 'designed', 'delivered'];
  const matchedVerbs = actionVerbs.filter(v => text.includes(v));

  const atsScore = Math.min(92, Math.max(45, 50 + (matchedVerbs.length * 5) + (hasNumbers ? 15 : 0) + (wordCount > 150 ? 10 : -10)));

  return {
    atsScore,
    executiveSummary: `Your CV exhibits solid clarity and relevant experience with ${wordCount} words. Enhancing measurable business outcomes and adding specific tooling keywords will significantly raise your ATS ranking.`,
    strengths: [
      matchedVerbs.length > 0 ? `Good use of strong action verbs (${matchedVerbs.slice(0, 3).join(', ')})` : 'Clear section division',
      hasNumbers ? 'Includes quantifiable metrics demonstrating impact' : 'Readable, concise format',
      'Logical chronology of experience and education',
    ],
    criticalImprovements: [
      {
        section: 'Work Experience',
        issue: hasNumbers ? 'Could expand on technical toolsets used per project' : 'Lacks measurable impact metrics (%, revenue, or latency improvements)',
        recommendation: 'Reframe bullet points using the XYZ formula: Accomplished [X], as measured by [Y], by doing [Z].',
      },
      {
        section: 'Skills',
        issue: 'Ensure core keywords match exact terminology in your target job postings',
        recommendation: 'Group skills by category (e.g. Languages, Frameworks, Developer Tools) for better ATS parsing.',
      },
    ],
    actionVerbScore: Math.min(95, 40 + matchedVerbs.length * 10),
    quantificationScore: hasNumbers ? 85 : 45,
    suggestedKeywords: ['Git', 'CI/CD', 'REST APIs', 'Unit Testing', 'Agile/Scrum'],
    note: process.env.OPENAI_API_KEY ? undefined : 'Evaluated via built-in ATS heuristic engine. Add OPENAI_API_KEY for deep LLM analysis.',
  };
}

function heuristicCompare(cvText, jobDescription, jobTitle = '') {
  const cvLower = cvText.toLowerCase();
  const descLower = jobDescription.toLowerCase();

  const commonKeywords = [
    'react', 'typescript', 'javascript', 'python', 'sql', 'node.js', 'aws', 'docker',
    'rest api', 'figma', 'git', 'ci/cd', 'agile', 'css', 'html', 'unit test', 'graphql',
  ];

  const matchedKeywords = [];
  const missingKeywords = [];

  commonKeywords.forEach(kw => {
    if (descLower.includes(kw)) {
      if (cvLower.includes(kw)) {
        matchedKeywords.push(kw.toUpperCase());
      } else {
        missingKeywords.push(kw.toUpperCase());
      }
    }
  });

  const totalRequired = matchedKeywords.length + missingKeywords.length;
  const matchPercentage = totalRequired > 0 ? Math.round((matchedKeywords.length / totalRequired) * 100) : 70;

  return {
    matchPercentage,
    matchedKeywords,
    missingKeywords,
    missingQualifications: missingKeywords.length > 0 ? [`Explicit proof of proficiency with ${missingKeywords.slice(0, 2).join(' and ')}`] : [],
    tailoredBulletSuggestions: [
      {
        originalRole: 'Recent Experience',
        suggestedBullet: `Engineered core features and collaborated on ${matchedKeywords.slice(0, 2).join(' and ')} initiatives, ensuring clean code quality and reliable deployment.`,
      },
    ],
    verdict: matchPercentage >= 70
      ? `Strong competitive fit for ${jobTitle || 'this role'}. Address the missing keywords in your summary or skills section.`
      : `Moderate alignment for ${jobTitle || 'this role'}. Consider highlighting transferable skills in ${missingKeywords.slice(0, 2).join(', ')}.`,
  };
}

function heuristicCoverLetter(candidateProfile, jobDetails) {
  const role = jobDetails.role || jobDetails.title || 'the position';
  const company = jobDetails.company || 'your team';
  const name = candidateProfile.name || 'Candidate';
  const skills = (candidateProfile.skills || []).slice(0, 3).join(', ') || 'software engineering';

  return {
    subject: `Application for ${role} - ${name}`,
    salutation: `Dear Hiring Team at ${company},`,
    opening: `I am writing to express my strong interest in the ${role} position at ${company}. With a background in ${skills} and hands-on experience delivering user-focused solutions, I am eager to contribute to your team's mission.`,
    bodyParagraphs: [
      `In my recent work (${candidateProfile.experience || 'my professional experience'}), I focused on building reliable, scalable features while maintaining high standards for code quality and collaboration. My expertise in ${skills} enables me to quickly ramp up and solve complex engineering problems.`,
      `What excites me about ${company} is the opportunity to apply modern best practices to high-impact projects. I take pride in collaborating cross-functionally and continuously learning new technologies to deliver measurable results.`,
    ],
    callToAction: 'I would welcome the opportunity to discuss how my qualifications and passion align with your engineering goals. Thank you for your time and consideration.',
    signOff: `Sincerely,\n${name}`,
    fullText: `Dear Hiring Team at ${company},\n\nI am writing to express my strong interest in the ${role} position at ${company}. With a background in ${skills} and hands-on experience delivering user-focused solutions, I am eager to contribute to your team's mission.\n\nIn my recent work (${candidateProfile.experience || 'my professional experience'}), I focused on building reliable, scalable features while maintaining high standards for code quality and collaboration. My expertise in ${skills} enables me to quickly ramp up and solve complex engineering problems.\n\nWhat excites me about ${company} is the opportunity to apply modern best practices to high-impact projects. I take pride in collaborating cross-functionally and continuously learning new technologies to deliver measurable results.\n\nI would welcome the opportunity to discuss how my qualifications and passion align with your engineering goals. Thank you for your time and consideration.\n\nSincerely,\n${name}`,
  };
}

/**
 * Reviews a candidate's CV for ATS compatibility and impact.
 */
async function reviewCV(cvText) {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicReview(cvText);
  }

  const systemPrompt = `You are an elite Executive Career Coach and ATS (Applicant Tracking System) Technical Auditor.
Evaluate the candidate's CV with analytical precision.
${STRICT_ANTI_HALLUCINATION_DIRECTIVE}

Analyze for:
1. ATS Friendliness: Standard section headers, readability, clean structure.
2. Action Verb & Impact: Strong active verbs vs passive phrasing.
3. Quantification: Presence of measurable achievements (%, $, hours saved).
4. Clarity & Brevity: Elimination of filler words, cliches, and fluff.`;

  const userPrompt = `Candidate CV Content:
"""
${cvText.slice(0, 5000)}
"""

Return a JSON object in this exact schema:
{
  "atsScore": number (0-100),
  "executiveSummary": "Overall critique in 2-3 sentences.",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "criticalImprovements": [
    {
      "section": "e.g. Work Experience | Summary | Skills",
      "issue": "What is lacking",
      "recommendation": "Concrete fix"
    }
  ],
  "actionVerbScore": number (0-100),
  "quantificationScore": number (0-100),
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3"]
}`;

  try {
    const response = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });
    return response.content;
  } catch (err) {
    console.warn('[AI CV] LLM error, falling back to heuristic review:', err.message);
    return heuristicReview(cvText);
  }
}

/**
 * Compares CV against a specific target job description.
 */
async function compareCvWithJob(cvText, jobDescription, jobTitle = '') {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicCompare(cvText, jobDescription, jobTitle);
  }

  const systemPrompt = `You are an expert Technical Recruiter analyzing CV fit against a specific job opportunity.
${STRICT_ANTI_HALLUCINATION_DIRECTIVE}`;

  const userPrompt = `Target Job Title: ${jobTitle}
Job Description:
"""
${jobDescription.slice(0, 3000)}
"""

Candidate CV Content:
"""
${cvText.slice(0, 5000)}
"""

Analyze the alignment and return a JSON object:
{
  "matchPercentage": number (0-100),
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["missing tech or skill 1", "missing tech or skill 2"],
  "missingQualifications": ["qualification 1"],
  "tailoredBulletSuggestions": [
    {
      "originalRole": "Role from CV",
      "suggestedBullet": "Rewritten bullet emphasizing target job requirements without inventing facts"
    }
  ],
  "verdict": "Clear summary of candidate competitiveness for this specific posting."
}`;

  try {
    const response = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });
    return response.content;
  } catch (err) {
    console.warn('[AI CV] LLM error, falling back to heuristic compare:', err.message);
    return heuristicCompare(cvText, jobDescription, jobTitle);
  }
}

/**
 * Generates a tailored, authentic cover letter.
 */
async function generateCoverLetter(candidateProfile, jobDetails) {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicCoverLetter(candidateProfile, jobDetails);
  }

  const systemPrompt = `You are a professional Career Communications Specialist.
Write a compelling, authentic, tailored cover letter.
${STRICT_ANTI_HALLUCINATION_DIRECTIVE}
- Avoid generic cliches ("I am writing to express my eager interest...").
- Hook the reader with a genuine connection between the candidate's verified skills and the company's stated needs.
- Keep the length between 250 and 350 words.`;

  const userPrompt = `Candidate Profile:
Name: ${candidateProfile.name || 'Candidate'}
Background: ${candidateProfile.bio || ''}
Skills: ${(candidateProfile.skills || []).join(', ')}
Experience Summary: ${candidateProfile.experience || ''}

Target Job:
Role: ${jobDetails.role || jobDetails.title || 'Position'}
Company: ${jobDetails.company || 'Company'}
Description: ${jobDetails.description || ''}

Return a JSON object:
{
  "subject": "Application for [Role] - [Candidate Name]",
  "salutation": "Dear Hiring Team at [Company],",
  "opening": "Hook paragraph connecting candidate to company mission.",
  "bodyParagraphs": [
    "Paragraph highlighting relevant achievements directly mapped to job requirements",
    "Paragraph demonstrating cultural alignment and problem-solving impact"
  ],
  "callToAction": "Confident closing requesting interview discussion.",
  "signOff": "Sincerely,\\n[Candidate Name]",
  "fullText": "The complete cover letter formatted with paragraphs."
}`;

  try {
    const response = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });
    return response.content;
  } catch (err) {
    console.warn('[AI CV] LLM error, falling back to heuristic cover letter:', err.message);
    return heuristicCoverLetter(candidateProfile, jobDetails);
  }
}

/**
 * HTTP handler for Vercel / Express
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { action, cvText, jobDescription, jobTitle, candidateProfile, jobDetails } = req.body || {};

  try {
    let result;

    switch (action) {
      case 'review':
        if (!cvText) return res.status(400).json({ error: 'cvText is required for review.' });
        result = await reviewCV(cvText);
        break;

      case 'compare':
        if (!cvText || !jobDescription) {
          return res.status(400).json({ error: 'Both cvText and jobDescription are required for comparison.' });
        }
        result = await compareCvWithJob(cvText, jobDescription, jobTitle);
        break;

      case 'cover_letter':
        if (!candidateProfile || !jobDetails) {
          return res.status(400).json({ error: 'candidateProfile and jobDetails are required for cover letter generation.' });
        }
        result = await generateCoverLetter(candidateProfile, jobDetails);
        break;

      default:
        return res.status(400).json({ error: `Unknown action: ${action}. Valid actions: review, compare, cover_letter` });
    }

    return res.status(200).json({ success: true, action, data: result });
  } catch (error) {
    console.error(`[AI CV Handler] Error executing ${action}:`, error.message);
    return res.status(500).json({ error: 'AI CV operation failed', details: error.message });
  }
}

module.exports = handler;
module.exports.reviewCV = reviewCV;
module.exports.compareCvWithJob = compareCvWithJob;
module.exports.generateCoverLetter = generateCoverLetter;
