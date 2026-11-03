import React, { useState, useEffect } from 'react';

const SUGGESTED_SKILLS = [
  'React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'SQL',
  'Figma', 'UI/UX', 'Tailwind CSS', 'Git', 'AWS', 'Docker',
  'Excel', 'REST APIs', 'Data Analysis', 'Agile/Scrum',
];

const EXPERIENCE_LEVELS = [
  'Entry level / Graduate',
  'Junior (1–2 years)',
  'Mid-level (3–5 years)',
  'Career Switcher / Transitioning',
];

const WORK_MODES = ['Remote', 'Hybrid', 'On-site', 'Any'];

export function AIProfileModal({ profile, isOpen, onClose, onSave }) {
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Junior (1–2 years)');
  const [skillsText, setSkillsText] = useState('');
  const [skillsList, setSkillsList] = useState([]);
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [workMode, setWorkMode] = useState('Remote');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (profile) {
      setTargetRole(profile.targetRole || profile.headline || '');
      setExperienceLevel(profile.experienceLevel || 'Junior (1–2 years)');
      const currentSkills = Array.isArray(profile.skills)
        ? profile.skills
        : (profile.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
      setSkillsList(currentSkills);
      setSkillsText(currentSkills.join(', '));
      setEducation(profile.education || '');
      setExperience(profile.experience || '');
      setWorkMode(profile.workMode || 'Remote');
      setBio(profile.bio || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const toggleSkillChip = (skill) => {
    let next;
    if (skillsList.includes(skill)) {
      next = skillsList.filter((s) => s !== skill);
    } else {
      next = [...skillsList, skill];
    }
    setSkillsList(next);
    setSkillsText(next.join(', '));
  };

  const handleSkillsTextChange = (e) => {
    const text = e.target.value;
    setSkillsText(text);
    const parsed = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setSkillsList(parsed);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalSkills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = {
      ...profile,
      targetRole: targetRole.trim(),
      headline: targetRole.trim() || profile.headline || 'Early-career professional',
      experienceLevel,
      skills: finalSkills,
      education: education.trim(),
      experience: experience.trim(),
      workMode,
      bio: bio.trim(),
      aiProfileCompleted: true,
      lastAiProfileUpdate: new Date().toISOString(),
    };

    onSave(updated);
  };

  return (
    <div className="aip-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="aip-panel" role="dialog" aria-modal="true" aria-label="Set up your AI career profile">

        {/* ── Panel header ── */}
        <div className="aip-header">
          <div className="aip-header-top">
            <span className="ai-badge">✨ AI Personalization</span>
            <button type="button" className="aip-skip-btn" onClick={onClose} aria-label="Skip for now">
              Skip for now
            </button>
          </div>
          <h2 className="aip-title">Set Up Your AI Career Profile</h2>
          <p className="aip-subtitle">
            Help Workly's AI understand your goals — powering your{' '}
            <strong>Job Suitability Scores</strong>, <strong>Skills Gap Analysis</strong>,{' '}
            <strong>ATS CV Auditing</strong>, and <strong>AI Career Coaching</strong>.
          </p>
        </div>

        {/* ── Scrollable form body ── */}
        <form onSubmit={handleSubmit} className="aip-body">

          {/* Row 1: Target role + Experience level side-by-side */}
          <div className="aip-row-two">
            <label className="aip-field">
              <span className="aip-label">Target Job Title / Career Goal <span className="aip-required">*</span></span>
              <input
                required
                className="aip-input"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Junior Frontend Developer"
              />
            </label>

            <div className="aip-field">
              <span className="aip-label">Preferred Work Mode</span>
              <div className="aip-pill-row">
                {WORK_MODES.map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    className={`aip-pill ${workMode === mode ? 'aip-pill--active' : ''}`}
                    onClick={() => setWorkMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Experience level */}
          <div className="aip-field">
            <span className="aip-label">Current Experience Level</span>
            <div className="aip-pill-row aip-pill-row--wrap">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  className={`aip-pill ${experienceLevel === lvl ? 'aip-pill--active' : ''}`}
                  onClick={() => setExperienceLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="aip-field">
            <span className="aip-label">
              Core Skills &amp; Tools <span className="aip-required">*</span>{' '}
              <span className="aip-hint">Type comma-separated or click chips below</span>
            </span>
            <input
              required
              className="aip-input"
              value={skillsText}
              onChange={handleSkillsTextChange}
              placeholder="React, TypeScript, JavaScript, Git…"
            />
            <div className="aip-chip-row">
              {SUGGESTED_SKILLS.map((skill) => {
                const isSelected = skillsList.some(
                  (s) => s.toLowerCase() === skill.toLowerCase()
                );
                return (
                  <button
                    type="button"
                    key={skill}
                    className={`aip-chip ${isSelected ? 'aip-chip--added' : ''}`}
                    onClick={() => toggleSkillChip(skill)}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Education + Work mode side-by-side */}
          <div className="aip-row-two">
            <label className="aip-field">
              <span className="aip-label">Education &amp; Qualifications</span>
              <input
                className="aip-input"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. BSc Computer Science, Self-Taught"
              />
            </label>

            <label className="aip-field">
              <span className="aip-label">Short Bio / Professional Statement</span>
              <input
                className="aip-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Passionate junior dev looking to build impactful products."
              />
            </label>
          </div>

          {/* Experience summary */}
          <label className="aip-field">
            <span className="aip-label">
              Experience Summary &amp; Past Projects{' '}
              <span className="aip-hint">Internships, projects, or achievements</span>
            </span>
            <textarea
              className="aip-input aip-textarea"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="e.g. Built responsive React dashboards with REST APIs; 6-month internship at…"
            />
          </label>

          {/* Actions */}
          <div className="aip-actions">
            <button type="button" className="aip-btn-skip" onClick={onClose}>
              Skip for now
            </button>
            <button type="submit" className="aip-btn-save">
              Save &amp; Enable AI Matching →
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
