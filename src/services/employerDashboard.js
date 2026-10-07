import { requireSupabase } from './supabase';

const statusToUi = {
  submitted: 'New', reviewing: 'Reviewing', shortlisted: 'Shortlisted',
  interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected',
};

const statusToDb = Object.fromEntries(Object.entries(statusToUi).map(([database, ui]) => [ui, database]));

const formatDate = value => value
  ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Recently applied';

const initials = name => String(name || 'Candidate').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

export async function loadEmployerCandidates() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('applications').select(`
    id, status, created_at, cv_url, cover_letter,
    jobs!inner(title, company_id),
    profiles!applications_candidate_id_fkey(full_name, headline, location, bio)
  `).order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map(application => {
    const profile = application.profiles || {};
    return {
      id: application.id,
      applicationId: application.id,
      companyId: application.jobs?.company_id,
      name: profile.full_name || 'Candidate',
      initials: initials(profile.full_name),
      title: profile.headline || 'Candidate',
      job: application.jobs?.title || 'Role',
      applied: formatDate(application.created_at),
      location: profile.location || 'Location not provided',
      email: '', phone: '', skills: [],
      status: statusToUi[application.status] || 'New',
      bio: profile.bio || 'No profile summary provided yet.',
      experience: 'Not provided', education: 'Not provided',
      cv: application.cv_url || 'No CV attached',
    };
  });
}

export async function saveEmployerCandidateStatus(applicationId, status) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('applications')
    .update({ status: statusToDb[status] || 'submitted' })
    .eq('id', applicationId);
  if (error) throw error;
}

const interviewTypeToDb = { Video: 'video', Phone: 'phone', 'In-person': 'in_person' };
const interviewTypeToUi = { video: 'Video', phone: 'Phone', in_person: 'In-person' };

export async function loadEmployerInterviews() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('interviews').select(`
    id, scheduled_at, interview_type, meeting_location, notes, status,
    applications!inner(jobs!inner(title), profiles!applications_candidate_id_fkey(full_name))
  `).order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(interview => ({
    id: interview.id,
    candidate: interview.applications?.profiles?.full_name || 'Candidate',
    job: interview.applications?.jobs?.title || 'Role',
    date: new Date(interview.scheduled_at).toLocaleDateString('en-GB'),
    time: new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: interviewTypeToUi[interview.interview_type] || 'Video',
    place: interview.meeting_location,
    notes: interview.notes || '',
    status: interview.status,
  }));
}

export async function createEmployerInterview({ companyId, applicationId, date, time, type, place, notes }) {
  const supabase = requireSupabase();
  const scheduledAt = new Date(`${date}T${time}`).toISOString();
  const { error } = await supabase.from('interviews').insert({
    company_id: companyId, application_id: applicationId, scheduled_at: scheduledAt,
    interview_type: interviewTypeToDb[type] || 'video', meeting_location: place, notes: notes || null,
  });
  if (error) throw error;
}
