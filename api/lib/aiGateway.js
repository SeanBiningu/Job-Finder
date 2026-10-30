/**
 * Workly AI Gateway
 * Resilient, zero-dependency client for OpenAI API with retries, timeout, and JSON validation.
 */

const DEFAULT_TIMEOUT_MS = 45000;
const MAX_RETRIES = 3;

/**
 * Executes a chat completion request to the AI model.
 * 
 * @param {Object} options
 * @param {string} [options.model='gpt-4o-mini']
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {Object} [options.responseFormat] - e.g. { type: 'json_object' }
 * @param {number} [options.temperature=0.2]
 * @param {number} [options.maxTokens=2500]
 * @returns {Promise<{ content: any, usage: any, raw: any }>}
 */
async function callChatCompletion({
  model = 'gpt-4o-mini',
  messages,
  responseFormat = { type: 'json_object' },
  temperature = 0.2,
  maxTokens = 2500,
}) {
  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Please set OPENAI_API_KEY in your environment variables.');
  }

  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: responseFormat,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;

        // Rate limit (429) or temporary server errors (500, 502, 503, 504) -> retry
        if (status === 429 || status >= 500) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(`[AIGateway] HTTP ${status}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${MAX_RETRIES})...`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw new Error(`OpenAI API error [${status}]: ${errorText}`);
      }

      const json = await response.json();
      const rawContent = json.choices?.[0]?.message?.content || '';

      let parsedContent = rawContent;
      if (responseFormat && responseFormat.type === 'json_object') {
        parsedContent = safeParseJSON(rawContent);
      }

      return {
        content: parsedContent,
        usage: json.usage || {},
        raw: json,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        console.warn(`[AIGateway] Request timed out after ${DEFAULT_TIMEOUT_MS}ms (attempt ${attempt}/${MAX_RETRIES})`);
      } else {
        console.warn(`[AIGateway] Attempt ${attempt} failed: ${err.message}`);
      }

      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  throw new Error(`AI Gateway request failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}

/**
 * Safely parses JSON strings, removing Markdown code fences if returned by the model.
 */
function safeParseJSON(raw) {
  if (typeof raw !== 'string') return raw;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse AI JSON response: ${err.message}. Raw: ${raw.slice(0, 200)}...`);
  }
}

module.exports = {
  callChatCompletion,
  safeParseJSON,
};
