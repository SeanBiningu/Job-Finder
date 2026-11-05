Job.Workly

Job.Workly is a React web application for job seekers and employers, with a focus on early-career opportunities. It brings job discovery and career preparation tools into one platform.

Live app: https://job-finder-zek2.vercel.app/ Repository: https://github.com/SeanBiningu/Job-Finder

Table of contents
Features
Screenshots
Tech stack
Getting started
Environment variables
Deployment
AI integration
Live job search
Ethical and responsible AI use
Features

For job seekers

Search jobs by title, skill, keyword and location.
Filter by internships, apprenticeships, graduate programmes, entry-level roles and remote jobs.
Save jobs and track applications.
Read your CV with ATS-style feedback. Supports PDF and DOCX text extraction, plus OCR for scanned PDFs.
Build a CV step by step (Build, Design, Refine, ATS Check).
Compare your CV to a specific job, draft cover letters, and get profile-based job matches.
Get career guidance and skills-gap analysis with suggested learning milestones.

For employers

Post jobs.
Review candidates.
Manage interviews.
Appear in the employer directory with a hiring status.
Screenshots
Landing page	Browse employers
Landing page	Browse employers
Find jobs	CV builder and ATS checker
Find jobs	CV builder
Tech stack
Layer	Technology
Front end	React 19, JavaScript
Authentication and data	Supabase
Back end	Vercel serverless API endpoints
AI	OpenAI API (Chat Completions, gpt-4o-mini)
Live job listings	Adzuna API
CV text extraction	PDF.js, Mammoth, Tesseract.js
Getting started
Prerequisites
Node.js and npm
Accounts and keys for the services listed under Environment variables (optional, see below)
Install and run
bash
git clone https://github.com/SeanBiningu/Job-Finder.git
cd Job-Finder
npm install
npm start

The development app runs at http://localhost:3000.

Environment variables

Create a .env file in the repository root:

env
OPENAI_API_KEY=your_openai_api_key
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
ADZUNA_COUNTRY=za
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
Variable	Purpose
OPENAI_API_KEY	AI features (server-side only)
ADZUNA_APP_ID, ADZUNA_APP_KEY	Live job listings
ADZUNA_COUNTRY	Adzuna country code (default za)
REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY	Authentication and application data
OPENAI_BASE_URL	Optional. Defaults to OpenAI's API URL

Notes:

The app can run without some integrations configured, but features may use fallback behaviour or be unavailable.
Never commit .env files or secret keys to GitHub.
Deployment

The project is deployed on Vercel. Add the same environment variables in the Vercel project settings (Settings, then Environment Variables) and redeploy. The AI and job-search endpoints run as Vercel serverless functions, so keys stay on the server.

AI integration

AI features use OpenAI's Chat Completions API with the gpt-4o-mini model. Calls are made through server-side endpoints, so the OpenAI key is not exposed to the browser.

Feature	What it does
Job matching	Ranks up to ten shortlisted jobs against a candidate profile and returns a suitability score, matching and missing skills, and a recommendation
CV review	Evaluates ATS readability, impact, action verbs, quantification and possible improvements
CV / job comparison	Identifies matching and missing keywords and offers tailored bullet suggestions
Cover letter generation	Drafts a role-specific letter from candidate and job details
Skills-gap analysis	Identifies skills to build and suggests learning milestones
Career assistant	Answers career questions, optionally using a limited candidate profile for context
Limitations
If OPENAI_API_KEY is missing or an AI request fails, several features fall back to built-in heuristic logic. These are simpler rule-based estimates, not model-generated evaluations.
The job matcher evaluates only a shortlist. Its scores are guidance, not validated predictions of hiring outcomes.
AI output may be incomplete or inaccurate and should be reviewed by the user.
Live job search

Live listings come from the Adzuna API through server-side endpoints. The default country is za (South Africa). Zimbabwe is not available through Adzuna's public country endpoints. If Adzuna is unavailable or unconfigured, the app can show a fallback feed.

Ethical and responsible AI use

Transparency. Job.Workly uses AI for career guidance, job matching and CV preparation. AI scores and suggestions are estimates. They are not hiring decisions or guarantees.

Accuracy. Users should review generated content and confirm it reflects their real experience before using it. The CV-writing instructions prohibit inventing qualifications, job history or metrics.

Data privacy. Candidate profiles and CV text can be personal information. CV text is extracted in the browser and may be sent to the configured server-side AI endpoint for analysis. Do not upload sensitive information unnecessarily. Data handling and retention depend on the hosting provider (Vercel), the OpenAI account, and the Supabase storage and access policies configured for the project.

Bias and fairness. Matching may reflect limitations in the supplied profile, job descriptions, heuristics or model output. Scores must not be used as the sole basis for employment decisions, and employers should keep human judgement in candidate review.

User safety. The job search page reminds users never to pay to apply or share banking details, and to check that the source and application link match the employer.
