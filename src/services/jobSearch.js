export async function searchJobs({ query = '', location = '', opportunityType = '', internshipOnly = false, apprenticeshipOnly = false, page = 1 }) {
  const params = new URLSearchParams({ query, location, opportunityType, internship: String(internshipOnly), apprenticeship: String(apprenticeshipOnly), page: String(page) });
  const response = await fetch(`/api/jobs?${params.toString()}`);
  if (!response.ok) throw new Error('Could not load job results');
  return response.json();
}
