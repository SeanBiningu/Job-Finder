import { useCallback, useEffect, useRef, useState } from 'react';
import { searchJobs } from './jobSearch';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // refresh every 5 minutes

/**
 * useJobFeed
 *
 * Fetches live jobs on mount and then automatically re-fetches every
 * REFRESH_INTERVAL_MS (5 minutes) to keep the feed fresh 24/7.
 *
 * Returns:
 *   jobs         – current job array
 *   source       – 'theirstack' | 'fallback' | 'sample'
 *   feedMessage  – optional info message from the API
 *   loading      – true while a fetch is in flight
 *   error        – error string, or ''
 *   lastRefreshed – Date of the most recent successful fetch, or null
 *   refresh      – call this to trigger an immediate re-fetch
 */
export function useJobFeed({ query = '', location = '', internshipOnly = false, apprenticeshipOnly = false } = {}) {
  const [jobs, setJobs] = useState([]);
  const [source, setSource] = useState('sample');
  const [feedMessage, setFeedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Keep a stable ref to the latest params so the interval never captures stale closures
  const paramsRef = useRef({ query, location, internshipOnly, apprenticeshipOnly });
  useEffect(() => {
    paramsRef.current = { query, location, internshipOnly, apprenticeshipOnly };
  }, [query, location, internshipOnly, apprenticeshipOnly]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { query: q, location: l, internshipOnly: i, apprenticeshipOnly: a } = paramsRef.current;
      const result = await searchJobs({ query: q, location: l, internshipOnly: i, apprenticeshipOnly: a });
      setJobs(result.jobs || []);
      setSource(result.source || 'sample');
      setFeedMessage(result.message || '');
      setLastRefreshed(new Date());
    } catch (err) {
      setError('Could not load the live job feed. Retrying shortly…');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch immediately on mount
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Set up the 24/7 auto-refresh interval
  useEffect(() => {
    const timer = setInterval(() => {
      fetchJobs();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchJobs]);

  return { jobs, source, feedMessage, loading, error, lastRefreshed, refresh: fetchJobs };
}
