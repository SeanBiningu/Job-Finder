/**
 * Workly AI Skills Gap Service (Client-Side)
 * Connects the frontend to the Skills Gap Analysis engine to calculate
 * readiness scores and generate customized 3-phase learning roadmaps.
 */

/**
 * Analyzes skills gap and generates a milestone learning roadmap.
 * @param {Object} params
 * @param {string[]} params.currentSkills
 * @param {string} params.targetRole
 * @param {Array<Object>} [params.targetJobDescriptions]
 * @param {string} [params.experienceLevel='Junior']
 * @returns {Promise<{ readinessScore: number, summary: string, matchingSkills: string[], criticalGaps: Array<Object>, differentiators: string[], estimatedWeeksToJobReady: number, learningRoadmap: Array<Object> }>}
 */
export async function analyzeSkillsGapAI({
  currentSkills,
  targetRole,
  targetJobDescriptions = [],
  experienceLevel = 'Junior',
}) {
  if (!targetRole) {
    throw new Error('Target role is required to analyze skills gap.');
  }

  const response = await fetch('/api/ai-skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentSkills: currentSkills || [],
      targetRole,
      targetJobDescriptions,
      experienceLevel,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Skills gap analysis failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.analysis;
}
