/**
 * AI Career Assistant Endpoint
 * Provides conversational career coaching, interview prep, salary negotiation,
 * and job requirement breakdown with strict topic guardrails.
 */

const { callChatCompletion } = require('./lib/aiGateway');

const SYSTEM_INSTRUCTIONS = `You are the Job.Workly Career Assistant, an expert AI Career Coach, Interview Specialist, and Talent Advisor.

YOUR MISSION:
Empower job seekers to understand job requirements, ace interviews, craft winning applications, and navigate career transitions with actionable, realistic advice.

TOPIC BOUNDARIES & GUARDRAILS (STRICT):
1. ALLOWED DOMAINS:
   - Explaining job descriptions, jargon, and skill expectations
   - Behavioral interview prep (STAR method: Situation, Task, Action, Result)
   - Technical & case interview strategies
   - CV, LinkedIn, and portfolio optimization tips
   - Offer evaluation and salary negotiation scripts
   - Career roadmapping and transition planning
2. PROHIBITED DOMAINS:
   - General trivia, creative writing, homework/math, politics, or coding solutions unrelated to job preparation.
   - If a user asks an out-of-scope question, politely and concisely decline: "I am specifically designed to assist with your career growth, job search, interview preparation, and applications on Job.Workly. How can I help with your professional journey today?"

RESPONSE QUALITY STANDARDS:
- Be concise, direct, and encouraging.
- When helping with interviews, provide realistic interview questions and critique user answers with specific improvements.
- Suggest 2-3 logical next follow-up questions the user can ask.`;

function sanitizeConversationHistory(history = [], maxMessages = 8) {
  if (!Array.isArray(history)) return [];
  const cleaned = history.filter(
    (msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string'
  );
  return cleaned.slice(-maxMessages);
}

function heuristicCareerAssistant(userPrompt = '', userProfile = null) {
  const q = userPrompt.toLowerCase();

  if (q.includes('bug') || q.includes('difficult') || q.includes('challenge') || q.includes('star')) {
    return {
      reply: `When answering **"Tell me about a time you resolved a difficult bug"**, use the **STAR Method** to highlight your engineering methodology:

1. **Situation:** Set the scene in 1-2 sentences. *(e.g. "During a release sprint on our React dashboard, state updates were causing intermittent UI freezes for 15% of active users.")*
2. **Task:** State what was at stake. *(e.g. "I needed to isolate the root cause without delaying the scheduled deployment.")*
3. **Action:** Detail your technical diagnosis and fix. Mention profiling tools, unit tests, and collaboration. *(e.g. "I used Chrome DevTools Performance profiler to identify redundant re-renders caused by unmemoized context providers, refactored state with React.memo/useCallback, and added regression tests.")*
4. **Result:** Conclude with the impact. *(e.g. "Render times decreased by 40%, and zero related regressions occurred post-deploy.")*`,
      suggestedFollowUps: [
        'How do I handle follow-up questions if the interviewer digs deeper?',
        'What is a good STAR answer for a conflict with a teammate?',
        'How should I discuss a bug that reached production?',
      ],
      detectedIntent: 'interview_prep',
    };
  }

  if (q.includes('salary') || q.includes('negotiat') || q.includes('offer')) {
    return {
      reply: `For salary negotiation on Job.Workly:
1. **Never state a single number first** — give a researched range based on your location and market data.
2. **Anchor to value**: Tie your request to specific deliverables, skills, and past impact.
3. **Consider total compensation**: Bonuses, remote flexibility, learning stipends, and equity can bridge salary gaps.`,
      suggestedFollowUps: [
        'What script should I use to ask for 15% more?',
        'How do I evaluate equity vs cash?',
        'When is the right time during the interview process to bring up salary?',
      ],
      detectedIntent: 'salary_negotiation',
    };
  }

  return {
    reply: `Welcome to the Job.Workly Career Assistant! As your dedicated career coach, I can help you with:
- **Interview Preparation**: Practice behavioral (STAR) and technical questions.
- **Job Description Breakdowns**: Demystify requirements, stack expectations, and recruiter screening criteria.
- **CV Optimization**: Align your bullet points with real industry roles.
- **Career Path Planning**: Identify the highest-ROI skills to level up from Junior to Mid-level.

What position or challenge are you preparing for today?`,
    suggestedFollowUps: [
      'Help me practice for a Frontend Developer interview',
      'How do I tailor my CV for remote roles?',
      'What questions should I ask at the end of an interview?',
    ],
    detectedIntent: 'general_career',
  };
}

/**
 * Chat handler for the career assistant
 */
async function chatWithCareerAssistant(messages, userProfile = null) {
  const trimmedHistory = sanitizeConversationHistory(messages, 8);
  const latestMessage = trimmedHistory[trimmedHistory.length - 1]?.content || '';

  if (!process.env.OPENAI_API_KEY) {
    return heuristicCareerAssistant(latestMessage, userProfile);
  }

  let userContext = '';
  if (userProfile) {
    userContext = `\n[CANDIDATE CONTEXT: Target Title: ${userProfile.title || 'Not specified'}, Skills: ${(userProfile.skills || []).join(', ')}, Experience: ${userProfile.experience || 'Not specified'}]`;
  }

  const promptMessages = [
    { role: 'system', content: SYSTEM_INSTRUCTIONS + userContext },
    ...trimmedHistory,
  ];

  const systemWrapperForJSON = `Return your response in valid JSON with:
{
  "reply": "Your markdown-formatted conversational answer.",
  "suggestedFollowUps": ["Short follow up prompt 1", "Short follow up prompt 2", "Short follow up prompt 3"],
  "detectedIntent": "interview_prep" | "job_breakdown" | "salary_negotiation" | "cv_advice" | "general_career" | "out_of_scope"
}`;

  promptMessages.push({ role: 'system', content: systemWrapperForJSON });

  try {
    const response = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages: promptMessages,
      temperature: 0.4,
      maxTokens: 1500,
    });
    return response.content;
  } catch (err) {
    console.warn('[AI Assistant] LLM error, falling back to career assistant heuristic:', err.message);
    return heuristicCareerAssistant(latestMessage, userProfile);
  }
}

/**
 * HTTP handler for Vercel / Express
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { messages, userProfile } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  try {
    const assistantResult = await chatWithCareerAssistant(messages, userProfile);
    return res.status(200).json({
      success: true,
      ...assistantResult,
    });
  } catch (error) {
    console.error('[Career Assistant Handler] Error:', error.message);
    return res.status(500).json({
      error: 'Career Assistant request failed',
      details: error.message,
    });
  }
}

module.exports = handler;
module.exports.chatWithCareerAssistant = chatWithCareerAssistant;
