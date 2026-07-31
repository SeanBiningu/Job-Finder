export async function searchJobs({ query = '', location = '', internshipOnly = false }) {
  const params = new URLSearchParams({ query, location, internship: String(internshipOnly) });
  const response = await fetch(`/api/jobs?${params.toString()}`);
  if (!response.ok) throw new Error('Could not load job results');
  return response.json();
}
