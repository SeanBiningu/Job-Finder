import React, { useState } from 'react';

// Make sure Icon is imported if I'm not appending to App.js directly.
// But since I am appending to App.js, I don't need imports.

export function DesignJourney({ notify }) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  
  // Step 1: Problem
  const [problem, setProblem] = useState('');
  
  // Step 2: People
  const [userType, setUserType] = useState('');
  const [userGoals, setUserGoals] = useState('');
  const [userFrustrations, setUserFrustrations] = useState('');
  const [userNeeds, setUserNeeds] = useState('');
  const [userBehavior, setUserBehavior] = useState('');
  
  // Step 3: Journey
  const [journeySteps, setJourneySteps] = useState([{ id: 1, name: '', painPoint: '', frustration: '', opportunity: '' }]);
  
  // Step 4: Solution
  const [solutionApproach, setSolutionApproach] = useState('');
  const [solutionIdea, setSolutionIdea] = useState('');
  
  // Step 5: Experience
  const [flowSteps, setFlowSteps] = useState([{ id: 1, name: '', sees: '', does: '', next: '', feeling: '' }]);
  
  // Step 6: Prototype
  const [prototypeStatus, setPrototypeStatus] = useState(false);
  
  // Step 7: Test
  const [testConfusing, setTestConfusing] = useState('');
  const [testStuck, setTestStuck] = useState('');
  const [testExpected, setTestExpected] = useState('');
  const [testChange, setTestChange] = useState('');
  
  // Step 8: Improve
  const [improveLearned, setImproveLearned] = useState('');
  const [improveChange, setImproveChange] = useState('');

  const steps = [
    'Problem', 'People', 'Journey', 'Solution', 'Experience', 'Prototype', 'Test', 'Improve'
  ];

  if (!started) {
    return (
      <div className="design-journey-wrapper">
        <section className="hero design-hero" style={{ background: '#f5f0ff', padding: '60px 40px', borderRadius: '16px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="hero-copy" style={{ maxWidth: '500px' }}>
            <span className="eyebrow" style={{ color: '#7662d7', fontWeight: 600, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>DESIGN & CREATIVE</span>
            <h1 style={{ fontSize: '42px', margin: '16px 0', lineHeight: 1.1 }}>Turn a problem into an experience.</h1>
            <p style={{ fontSize: '18px', color: '#555', marginBottom: '32px' }}>Start with a real problem, understand the people behind it, explore solutions, and turn your idea into something people can actually use.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="primary-btn" onClick={() => setStarted(true)} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Start a design journey →</button>
              <button className="secondary-btn" style={{ background: 'transparent', color: '#7662d7', padding: '12px 24px', borderRadius: '8px', border: '1px solid #7662d7', cursor: 'pointer', fontWeight: 600 }}>Explore design challenges</button>
            </div>
          </div>
          <div className="hero-art" style={{ width: '300px', height: '300px', background: '#fff', borderRadius: '50%', boxShadow: '0 20px 40px rgba(118,98,215,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Visual placeholder */}
            <div style={{ width: '200px', height: '200px', borderRadius: '50%', background: 'linear-gradient(135deg, #f1edff, #e0d4ff)' }} />
          </div>
        </section>

        <section className="practice-lab" style={{ marginTop: '60px' }}>
          <h3 style={{ marginBottom: '24px' }}>Practice Lab</h3>
          <div className="lab-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { title: 'Identify a problem', desc: 'Find issues worth solving.' },
              { title: 'Create a persona', desc: 'Define your target user.' },
              { title: 'Map a user journey', desc: 'Trace the current experience.' },
              { title: 'Find pain points', desc: 'Discover where users struggle.' },
              { title: 'Sketch a solution', desc: 'Ideate visual solutions.' },
              { title: 'Create a 3-screen flow', desc: 'Build a small prototype.' },
              { title: 'Run a usability test', desc: 'Get real user feedback.' },
              { title: 'Improve a design', desc: 'Iterate based on data.' }
            ].map(lab => (
              <div key={lab.title} style={{ padding: '24px', background: '#fff', border: '1px solid #eaeaea', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                <b style={{ fontSize: '16px', marginBottom: '8px' }}>{lab.title}</b>
                <small style={{ color: '#666', marginBottom: '16px', flexGrow: 1 }}>{lab.desc}</small>
                <button style={{ background: '#f5f5f5', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#333' }}>Try this</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="design-journey-active" style={{ background: '#fff', padding: '40px', borderRadius: '16px', border: '1px solid #eaeaea' }}>
      <div className="journey-progress" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, height: '2px', background: '#f0f0f0', zIndex: 0 }} />
        {steps.map((s, i) => (
          <div key={s} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setStep(i + 1)}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= i + 1 ? '#7662d7' : '#fff', border: `2px solid ${step >= i + 1 ? '#7662d7' : '#ccc'}`, color: step >= i + 1 ? '#fff' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>{i + 1}</div>
            <span style={{ fontSize: '12px', color: step === i + 1 ? '#7662d7' : '#999', fontWeight: step === i + 1 ? 600 : 400 }}>{s}</span>
          </div>
        ))}
      </div>

      <div className="journey-step-content" style={{ minHeight: '400px' }}>
        {step === 1 && (
          <div className="step-problem animate-fade-in">
            <h2>What problem do you want to solve?</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Great experiences start with real problems. Tell us what you're trying to improve.</p>
            <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="Describe the problem..." style={{ width: '100%', minHeight: '120px', padding: '16px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', marginBottom: '24px' }} />
            <div className="helpful-prompts" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
              <b style={{ display: 'block', marginBottom: '12px' }}>Think about:</b>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Who is experiencing this problem?</li>
                <li>What makes it difficult today?</li>
                <li>How are people solving it currently?</li>
                <li>Why does this problem matter?</li>
              </ul>
            </div>
            <button onClick={() => setStep(2)} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div className="step-people animate-fade-in">
            <h2>Who are you designing for?</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Define your target user to understand their needs.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>User type</b><input value={userType} onChange={e => setUserType(e.target.value)} placeholder="e.g. Job seeker, Store owner" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>Current behaviour</b><input value={userBehavior} onChange={e => setUserBehavior(e.target.value)} placeholder="What do they do now?" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>Goals</b><textarea value={userGoals} onChange={e => setUserGoals(e.target.value)} placeholder="What do they want to achieve?" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>Frustrations</b><textarea value={userFrustrations} onChange={e => setUserFrustrations(e.target.value)} placeholder="What annoys them?" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}><b>Needs</b><textarea value={userNeeds} onChange={e => setUserNeeds(e.target.value)} placeholder="What do they need to succeed?" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}/></label>
            </div>
            <button onClick={() => setStep(3)} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Continue →</button>
          </div>
        )}

        {step === 3 && (
          <div className="step-journey animate-fade-in">
            <h2>Map the Current Experience</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Break down the user's current journey and identify areas for improvement.</p>
            
            {journeySteps.map((jStep, i) => (
              <div key={jStep.id} style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <b>Step {i + 1}</b>
                  {journeySteps.length > 1 && <button onClick={() => setJourneySteps(journeySteps.filter(js => js.id !== jStep.id))} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}>Remove</button>}
                </div>
                <input value={jStep.name} onChange={e => { const newSteps = [...journeySteps]; newSteps[i].name = e.target.value; setJourneySteps(newSteps); }} placeholder="e.g. Search WhatsApp" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '12px' }}/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>🔴 Pain points<input value={jStep.painPoint} onChange={e => { const newSteps = [...journeySteps]; newSteps[i].painPoint = e.target.value; setJourneySteps(newSteps); }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ffcccc' }}/></label>
                  <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>🟡 Frustrations<input value={jStep.frustration} onChange={e => { const newSteps = [...journeySteps]; newSteps[i].frustration = e.target.value; setJourneySteps(newSteps); }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ffeecc' }}/></label>
                  <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>🟢 Opportunities<input value={jStep.opportunity} onChange={e => { const newSteps = [...journeySteps]; newSteps[i].opportunity = e.target.value; setJourneySteps(newSteps); }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccffcc' }}/></label>
                </div>
              </div>
            ))}
            <button onClick={() => setJourneySteps([...journeySteps, { id: Date.now(), name: '', painPoint: '', frustration: '', opportunity: '' }])} style={{ background: 'transparent', color: '#7662d7', padding: '12px', borderRadius: '8px', border: '1px dashed #7662d7', cursor: 'pointer', fontWeight: 600, width: '100%', marginBottom: '24px' }}>+ Add journey step</button>
            <button onClick={() => setStep(4)} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Continue →</button>
          </div>
        )}

        {step === 4 && (
          <div className="step-solution animate-fade-in">
            <h2>What could make this experience better?</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Choose a solution approach and describe your idea.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { title: 'Improve', desc: 'Make an existing experience easier.' },
                { title: 'Simplify', desc: 'Remove unnecessary steps.' },
                { title: 'Connect', desc: 'Bring different parts of the experience together.' },
                { title: 'Create', desc: 'Build something completely new.' }
              ].map(opt => (
                <div key={opt.title} onClick={() => setSolutionApproach(opt.title)} style={{ padding: '20px', borderRadius: '12px', border: `2px solid ${solutionApproach === opt.title ? '#7662d7' : '#eaeaea'}`, cursor: 'pointer', background: solutionApproach === opt.title ? '#f9f7ff' : '#fff' }}>
                  <b style={{ display: 'block', marginBottom: '8px' }}>{opt.title}</b>
                  <small style={{ color: '#666' }}>{opt.desc}</small>
                </div>
              ))}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <b>Your solution idea</b>
              <textarea value={solutionIdea} onChange={e => setSolutionIdea(e.target.value)} placeholder="Describe how you will solve the problem..." style={{ width: '100%', minHeight: '100px', padding: '16px', borderRadius: '8px', border: '1px solid #ccc' }} />
            </label>
            <button onClick={() => setStep(5)} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Continue →</button>
          </div>
        )}

        {step === 5 && (
          <div className="step-experience animate-fade-in">
            <h2>Shape the Experience</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Create a simple visual user flow (approx 3-5 steps).</p>
            
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '20px' }}>
              {flowSteps.map((fStep, i) => (
                <div key={fStep.id} style={{ minWidth: '300px', background: '#fff', border: '1px solid #eaeaea', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <b style={{ color: '#7662d7' }}>Screen {i + 1}</b>
                    {flowSteps.length > 1 && <button onClick={() => setFlowSteps(flowSteps.filter(fs => fs.id !== fStep.id))} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '12px' }}>Remove</button>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input value={fStep.name} onChange={e => { const n = [...flowSteps]; n[i].name = e.target.value; setFlowSteps(n); }} placeholder="Screen name (e.g. Discover)" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}/>
                    <input value={fStep.sees} onChange={e => { const n = [...flowSteps]; n[i].sees = e.target.value; setFlowSteps(n); }} placeholder="What the user sees" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}/>
                    <input value={fStep.does} onChange={e => { const n = [...flowSteps]; n[i].does = e.target.value; setFlowSteps(n); }} placeholder="What the user can do" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}/>
                    <input value={fStep.next} onChange={e => { const n = [...flowSteps]; n[i].next = e.target.value; setFlowSteps(n); }} placeholder="What happens next" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}/>
                    <input value={fStep.feeling} onChange={e => { const n = [...flowSteps]; n[i].feeling = e.target.value; setFlowSteps(n); }} placeholder="Desired feeling" style={{ padding: '8px', borderRadius: '6px', border: '1px dashed #7662d7', background: '#f9f7ff' }}/>
                  </div>
                </div>
              ))}
              {flowSteps.length < 5 && (
                <button onClick={() => setFlowSteps([...flowSteps, { id: Date.now(), name: '', sees: '', does: '', next: '', feeling: '' }])} style={{ minWidth: '200px', background: '#f8f9fa', border: '2px dashed #ccc', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontWeight: 600 }}>+ Add step</button>
              )}
            </div>
            
            <button onClick={() => setStep(6)} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: '24px' }}>Continue →</button>
          </div>
        )}

        {step === 6 && (
          <div className="step-prototype animate-fade-in">
            <h2>Make something real</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Turn your flow into a simple prototype or 3-screen experience.</p>
            <div style={{ background: '#f8f9fa', padding: '40px', borderRadius: '12px', textAlign: 'center', marginBottom: '24px', border: '1px solid #eaeaea' }}>
              <div style={{ width: '64px', height: '64px', background: '#7662d7', borderRadius: '16px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px' }}>📱</div>
              <h3 style={{ marginBottom: '12px' }}>Start designing</h3>
              <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto 24px' }}>Use your favourite tool (Figma, Canva, or pen and paper) to sketch out the screens you defined.</p>
              <button onClick={() => { setPrototypeStatus(true); notify('Prototype marked as ready for testing!'); setStep(7); }} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Create a 3-screen flow →</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="step-test animate-fade-in">
            <h2>Does it actually work?</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Give a user a simple task and observe how they use your prototype.</p>
            
            <div style={{ background: '#f9f7ff', padding: '20px', borderRadius: '8px', border: '1px solid #e0d4ff', marginBottom: '24px' }}>
              <b>Example Task:</b> "Find a software development internship and apply."
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>What was confusing?</b><textarea value={testConfusing} onChange={e => setTestConfusing(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>Where did the user get stuck?</b><textarea value={testStuck} onChange={e => setTestStuck(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>What did they expect?</b><textarea value={testExpected} onChange={e => setTestExpected(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>What would they change?</b><textarea value={testChange} onChange={e => setTestChange(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px' }}/></label>
            </div>

            <button onClick={() => setStep(8)} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Continue →</button>
          </div>
        )}

        {step === 8 && (
          <div className="step-improve animate-fade-in">
            <h2>Learn. Improve. Repeat.</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Good design is an iterative process. Use your test feedback to create a better version.</p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '32px', padding: '24px', background: '#f8f9fa', borderRadius: '12px' }}>
              <div style={{ textAlign: 'center' }}><b style={{ display: 'block', fontSize: '20px', color: '#999' }}>Version 1</b></div>
              <div style={{ color: '#7662d7', fontWeight: 600 }}>→ Feedback →</div>
              <div style={{ textAlign: 'center' }}><b style={{ display: 'block', fontSize: '20px', color: '#7662d7' }}>Version 2</b></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>What did I learn?</b><textarea value={improveLearned} onChange={e => setImproveLearned(e.target.value)} placeholder="Reflect on the insights..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '100px' }}/></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><b>What will I change?</b><textarea value={improveChange} onChange={e => setImproveChange(e.target.value)} placeholder="List the specific updates..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '100px' }}/></label>
            </div>

            <button onClick={() => { notify('Design journey updated!'); }} style={{ background: '#7662d7', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Update my experience →</button>
          </div>
        )}
      </div>
    </div>
  );
}
