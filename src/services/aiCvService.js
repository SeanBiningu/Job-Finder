/**
 * Workly AI CV Service (Client-Side)
 * Connects the frontend to the AI CV Reviewer, Job Comparator, and Cover Letter Generator.
 */

/**
 * Submits CV text for deep ATS and quality review.
 * @param {string} cvText 
 * @returns {Promise<{ atsScore: number, executiveSummary: string, strengths: string[], criticalImprovements: Array<{ section: string, issue: string, recommendation: string }>, actionVerbScore: number, quantificationScore: number, suggestedKeywords: string[] }>}
 */
export async function reviewCvWithAI(cvText) {
  if (!cvText || cvText.trim().length < 50) {
    throw new Error('Please provide substantial CV content for analysis (minimum 50 characters).');
  }

  const response = await fetch('/api/ai-cv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'review',
      cvText,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `CV review failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.data;
}

/**
 * Compares a CV against a target job description to find keyword gaps.
 * @param {string} cvText 
 * @param {string} jobDescription 
 * @param {string} [jobTitle=''] 
 */
export async function compareCvWithJobAI(cvText, jobDescription, jobTitle = '') {
  if (!cvText || !jobDescription) {
    throw new Error('Both CV content and Job Description are required for comparison.');
  }

  const response = await fetch('/api/ai-cv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'compare',
      cvText,
      jobDescription,
      jobTitle,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `CV comparison failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.data;
}

/**
 * Generates a tailored, fact-preserving cover letter.
 * @param {Object} candidateProfile 
 * @param {Object} jobDetails 
 */
export async function generateCoverLetterAI(candidateProfile, jobDetails) {
  const response = await fetch('/api/ai-cv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'cover_letter',
      candidateProfile,
      jobDetails,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Cover letter generation failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.data;
}
