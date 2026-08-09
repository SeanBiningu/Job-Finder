// Temporary debug endpoint — DELETE after fixing the env var issue
export default function handler(req, res) {
  const key = process.env.THEIRSTACK_API_KEY;
  res.status(200).json({
    hasKey: !!key,
    keyLength: key ? key.length : 0,
    keyPreview: key ? `${key.slice(0, 10)}...` : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
  });
}
