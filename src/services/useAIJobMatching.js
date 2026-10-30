import { useState, useCallback, useEffect } from 'react';
import { matchJobsWithAI } from './aiJobMatcher';

/**
 * React hook to automatically or manually match the live job feed
 * with the active candidate profile.
 * 
 * @param {Object} options
 * @param {Object} options.candidate - Candidate profile (skills, title, experience)
 * @param {Array<Object>} options.jobs - Array of jobs from useJobFeed or search
 * @param {boolean} [options.autoMatch=false] - Whether to match automatically when jobs change
 */
export function useAIJobMatching({ candidate, jobs = [], autoMatch = false } = {}) {
  const [matchedJobs, setMatchedJobs] = useState(jobs);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const [lastMatchTime, setLastMatchTime] = useState(null);

  const runMatching = useCallback(async (candidateOverride, jobsOverride) => {
    const activeCandidate = candidateOverride || candidate;
    const activeJobs = jobsOverride || jobs;

    if (!activeCandidate || !activeCandidate.skills || !Array.isArray(activeJobs) || activeJobs.length === 0) {
      setMatchedJobs(activeJobs);
      return;
    }

    setIsMatching(true);
    setMatchError(null);

    try {
      const { rankedJobs } = await matchJobsWithAI(activeCandidate, activeJobs);
      setMatchedJobs(rankedJobs);
      setLastMatchTime(new Date());
    } catch (err) {
      console.error('[useAIJobMatching] Error during AI matching:', err);
      setMatchError(err.message || 'Failed to calculate AI match scores.');
      setMatchedJobs(activeJobs);
    } finally {
      setIsMatching(false);
    }
  }, [candidate, jobs]);

  // Synchronize when raw jobs update if autoMatch is disabled
  useEffect(() => {
    if (!lastMatchTime) {
      setMatchedJobs(jobs);
    }
  }, [jobs, lastMatchTime]);

  // Optional auto-match when candidate or jobs are ready
  useEffect(() => {
    if (autoMatch && candidate?.skills?.length && jobs?.length && !lastMatchTime) {
      runMatching();
    }
  }, [autoMatch, candidate, jobs, lastMatchTime, runMatching]);

  return {
    matchedJobs,
    isMatching,
    matchError,
    lastMatchTime,
    runMatching,
  };
}
