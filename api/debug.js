// Temporary configuration check. Never expose credential contents.
export default function handler(req, res) {
  res.status(200).json({
    hasAdzunaAppId: Boolean(process.env.ADZUNA_APP_ID),
    hasAdzunaAppKey: Boolean(process.env.ADZUNA_APP_KEY),
    country: process.env.ADZUNA_COUNTRY || 'za',
    nodeEnv: process.env.NODE_ENV,
  });
}
