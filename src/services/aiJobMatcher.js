/**
 * Workly AI Job Matcher Client Service
 * Bridges candidate profile data with real job listings and retrieves
 * AI-scored suitability rankings, skill analyses, and match rationales.
 */

// Simple in-memory & sessionStorage cache to minimize duplicate API calls
const CACHE_KEY_PREFIX = 'workly_ai_match_';

function getProfileHash(candidate) {
  const key = [
    candidate.title || '',
    (candidate.skills || []).sort().join(','),
    candidate.experience || '',
  ].join('|');
  return btoa(unescape(encodeURIComponent(key)));
}

/**
 * Matches a candidate against a list of real jobs using the AI backend.
 * 
 * @param {Object} candidate - Candidate profile
 * @param {string} candidate.name
 * @param {string} candidate.title
 * @param {string[]} candidate.skills
 * @param {string} [candidate.experience]
 * @param {string} [candidate.education]
 * @param {string} [candidate.bio]
 * @param {string[]} [candidate.careerInterests]
 * @param {Array<Object>} jobs - Real job listings
 * @param {boolean} [bypassCache=false]
 * @returns {Promise<{ rankedJobs: Array<Object>, matches: Array<Object> }>}
 */
export async function matchJobsWithAI(candidate, jobs, bypassCache = false) {
  if (!candidate || !Array.isArray(jobs) || jobs.length === 0) {
    return { rankedJobs: jobs || [], matches: [] };
  }

  const profileHash = getProfileHash(candidate);
  const cacheKey = `${CACHE_KEY_PREFIX}${profileHash}_${jobs.length}`;

  if (!bypassCache) {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { matches, timestamp } = JSON.parse(cached);
        // Valid for 10 minutes
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          return {
            rankedJobs: mergeMatchesIntoJobs(jobs, matches),
            matches,
            fromCache: true,
          };
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  const response = await fetch('/api/ai-match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate: {
        name: candidate.name,
        title: candidate.title,
        skills: candidate.skills || [],
        experience: candidate.experience || '',
        education: candidate.education || '',
        careerInterests: candidate.careerInterests || [],
        bio: candidate.bio || '',
      },
      jobs: jobs.map((j) => ({
        id: j.id,
        role: j.role || j.title,
        company: j.company,
        place: j.place || j.location,
        type: j.type,
        tags: j.tags || [],
        description: j.description || '',
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `AI Matching failed with status ${response.status}`);
  }

  const payload = await response.json();
  const matches = payload.matches || [];

  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ matches, timestamp: Date.now() })
    );
  } catch (e) {
    // Ignore storage quota
  }

  return {
    rankedJobs: mergeMatchesIntoJobs(jobs, matches),
    matches,
    fromCache: false,
  };
}

/**
 * Merges AI match scores and rationales directly into job objects and sorts by score.
 */
function mergeMatchesIntoJobs(jobs, matches) {
  const matchMap = new Map();
  matches.forEach((m) => matchMap.set(String(m.jobId), m));

  const enriched = jobs.map((job) => {
    const aiData = matchMap.get(String(job.id));
    if (!aiData) {
      return {
        ...job,
        aiScore: null,
        aiMatchLabel: null,
      };
    }

    return {
      ...job,
      aiScore: aiData.suitabilityScore,
      aiMatchLabel: `${aiData.suitabilityScore}% match`,
      matchingSkills: aiData.matchingSkills || [],
      missingSkills: aiData.missingSkills || [],
      aiRecommendation: aiData.recommendationReason || '',
      experienceMatch: aiData.experienceMatch || 'matched',
      strengths: aiData.strengths || [],
      growthAreas: aiData.growthAreas || [],
    };
  });

  // Sort by AI score descending; jobs without AI score go to the end
  enriched.sort((a, b) => {
    const scoreA = typeof a.aiScore === 'number' ? a.aiScore : -1;
    const scoreB = typeof b.aiScore === 'number' ? b.aiScore : -1;
    return scoreB - scoreA;
  });

  return enriched;
}
