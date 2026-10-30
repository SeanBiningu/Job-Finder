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
    <div className="modal-backdrop">
      <div className="application-modal ai-profile-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="ai-modal-header">
          <span className="ai-badge">✨ AI Personalization</span>
          <h2>Set Up Your AI Career Profile</h2>
          <p>
            Help Job.Workly’s integrated AI understand your target role and strengths.
            This information directly powers your <strong>Job Suitability Scores (0–100%)</strong>,
            <strong>Skills Gap Analysis</strong>, <strong>ATS CV Auditing</strong>, and <strong>AI Career Assistant coaching</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ai-form-grid">
          {/* Target Role */}
          <label className="ai-field-label">
            Target Job Title / Career Goal *
            <input
              required
              className="ai-input"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Junior Frontend Developer, Product Designer, Data Analyst"
            />
          </label>

          {/* Experience Level */}
          <div className="ai-field-label">
            Current Experience Level
            <div className="ai-pill-selector">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  className={`ai-pill ${experienceLevel === lvl ? 'selected' : ''}`}
                  onClick={() => setExperienceLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Input & Quick-Add Chips */}
          <label className="ai-field-label">
            Core Skills & Tools * <small>(Type comma-separated or click quick chips below)</small>
            <input
              required
              className="ai-input"
              value={skillsText}
              onChange={handleSkillsTextChange}
              placeholder="React, TypeScript, JavaScript, Tailwind CSS, Git"
            />
            <div className="ai-skill-chips">
              {SUGGESTED_SKILLS.map((skill) => {
                const isSelected = skillsList.some(
                  (s) => s.toLowerCase() === skill.toLowerCase()
                );
                return (
                  <button
                    type="button"
                    key={skill}
                    className={`ai-skill-chip ${isSelected ? 'added' : ''}`}
                    onClick={() => toggleSkillChip(skill)}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {skill}
                  </button>
                );
              })}
            </div>
          </label>

          {/* Qualifications & Education */}
          <label className="ai-field-label">
            Education & Qualifications
            <input
              className="ai-input"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. BSc in Computer Science, Higher National Diploma, Self-Taught"
            />
          </label>

          {/* Past Work / Projects */}
          <label className="ai-field-label">
            Experience Summary & Past Projects
            <small>Mention internships, projects, or achievements the AI should consider</small>
            <textarea
              className="ai-textarea"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="e.g. Built responsive React dashboards with REST APIs; 6 months internship experience..."
            />
          </label>

          {/* Preferred Work Mode */}
          <div className="ai-field-label">
            Preferred Work Mode
            <div className="ai-pill-selector">
              {WORK_MODES.map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={`ai-pill ${workMode === mode ? 'selected' : ''}`}
                  onClick={() => setWorkMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Short Bio */}
          <label className="ai-field-label">
            Short Bio / Professional Statement
            <textarea
              className="ai-textarea"
              style={{ minHeight: '60px' }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Passionate junior developer looking to build impactful digital products and grow in a supportive team."
            />
          </label>

          {/* Actions */}
          <div className="ai-modal-actions">
            <button type="button" className="ai-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ai-save-btn">
              <span>Save & Enable AI Matching</span> →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
