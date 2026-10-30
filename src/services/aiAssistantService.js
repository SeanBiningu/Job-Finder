/**
 * Workly AI Career Assistant Service (Client-Side)
 * Connects the frontend to the Career Assistant AI coach for interview prep,
 * job requirement explanations, and application coaching.
 */

/**
 * Sends messages to the AI Career Assistant.
 * @param {Array<{ role: 'user'|'assistant', content: string }>} messages 
 * @param {Object} [userProfile] 
 * @returns {Promise<{ reply: string, suggestedFollowUps: string[], detectedIntent: string }>}
 */
export async function sendCareerAssistantMessage(messages, userProfile = null) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array cannot be empty.');
  }

  const response = await fetch('/api/ai-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      userProfile,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Career assistant request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return {
    reply: payload.reply || '',
    suggestedFollowUps: Array.isArray(payload.suggestedFollowUps) ? payload.suggestedFollowUps : [],
    detectedIntent: payload.detectedIntent || 'general_career',
  };
}
