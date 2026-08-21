# Job.Workly 🇿🇼

A platform designed to make finding jobs in Zimbabwe easier.

Job.Workly brings jobs, internships, apprenticeships, and career opportunities into one place, while providing tools like CV building, ATS checking, application tracking, and skill development.

###  Vision

Find opportunities. Apply confidently. Keep growing.

###  Built With

React • JavaScript • Tailwind CSS • Supabase • Figma

###  Status

Currently in development.

### Live job feed setup

Job search uses the Adzuna API through server-side endpoints, so credentials are never sent to the browser. Register at [Adzuna Developer](https://developer.adzuna.com/), then add these server-side variables to `.env` locally and to your hosting provider in production:

```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
ADZUNA_COUNTRY=za
```

`ADZUNA_COUNTRY` must be an Adzuna-supported two-letter market code. It defaults to `za` (South Africa); Zimbabwe is not currently available in Adzuna's public country endpoints.

Built by Sean Biningu
