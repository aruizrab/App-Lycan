// Mock data for the prototype

export const workspaces = [
  {
    name: 'Acme — Staff Engineer',
    lastModified: 'Apr 14, 2026',
    cvCount: 3,
    clCount: 2,
    hasContext: true,
    matchScore: 86,
    company: 'Acme Robotics',
    role: 'Staff Software Engineer'
  },
  {
    name: 'Lumen Studio',
    lastModified: 'Apr 08, 2026',
    cvCount: 2,
    clCount: 1,
    hasContext: true,
    matchScore: 74,
    company: 'Lumen Studio',
    role: 'Design Engineer'
  },
  {
    name: 'Nebula AI',
    lastModified: 'Mar 29, 2026',
    cvCount: 1,
    clCount: 1,
    hasContext: true,
    matchScore: 92,
    company: 'Nebula AI',
    role: 'Founding Frontend'
  },
  {
    name: 'Northwind Finance',
    lastModified: 'Mar 21, 2026',
    cvCount: 2,
    clCount: 0,
    hasContext: false,
    matchScore: null,
    company: 'Northwind',
    role: 'Senior UX Engineer'
  },
  {
    name: 'Orbital Health',
    lastModified: 'Feb 18, 2026',
    cvCount: 4,
    clCount: 2,
    hasContext: true,
    matchScore: 68,
    company: 'Orbital Health',
    role: 'Fullstack Engineer'
  }
]

export const cvs = [
  { name: 'Staff Engineer — Platform', lastModified: 'Apr 14, 2026', tag: 'tuned' },
  { name: 'Staff Engineer — Product', lastModified: 'Apr 12, 2026', tag: 'ats' },
  { name: 'Base CV 2026', lastModified: 'Apr 02, 2026', tag: 'master' }
]

export const coverLetters = [
  { name: 'Acme — Hiring Manager', lastModified: 'Apr 14, 2026' },
  { name: 'Acme — Recruiter intro', lastModified: 'Apr 10, 2026' }
]

export const cvData = {
  name: 'Mira Vale',
  role: 'Staff Software Engineer',
  summary:
    'Product-minded engineer who turns ambiguous problems into calm, legible systems. Nine years shipping tools at the seams of design, platform and ML.',
  contact: [
    { type: 'mail', label: 'mira@vale.studio' },
    { type: 'phone', label: '+1 (415) 555‑0138' },
    { type: 'mapPin', label: 'Brooklyn, NY' },
    { type: 'globe', label: 'vale.studio' }
  ],
  experience: [
    {
      title: 'Staff Engineer',
      org: 'Northline · Design Systems',
      period: '2022 — present',
      bullets: [
        'Rebuilt the component platform used by 14 product teams; cut average ship time from 11d to 3d.',
        'Led the migration to tokens + glass surfaces, extending the brand across web, iOS and keynote.',
        'Mentored 6 engineers; ran weekly office hours across the design+eng boundary.'
      ]
    },
    {
      title: 'Senior Engineer',
      org: 'Linework · Editor tooling',
      period: '2019 — 2022',
      bullets: [
        'Owned the collaborative canvas engine; hit 60fps with 5k live objects on commodity hardware.',
        'Shipped the first real‑time commenting layer, still used across the enterprise tier today.'
      ]
    },
    {
      title: 'Product Engineer',
      org: 'Halogen',
      period: '2017 — 2019',
      bullets: ['Prototyped the onboarding that lifted D7 retention by 18pp.']
    }
  ],
  skills: [
    'TypeScript',
    'React',
    'Rust',
    'Systems design',
    'Design tokens',
    'Motion',
    'Accessibility',
    'Postgres'
  ]
}

export const coverLetterData = {
  title: 'Cover Letter — Acme Robotics',
  applicant: { name: 'Mira Vale', address: 'Brooklyn, NY · mira@vale.studio' },
  company: { name: 'Acme Robotics', address: 'Palo Alto, CA' },
  date: 'April 14, 2026',
  greeting: 'Dear Hiring Manager,',
  body: [
    "I've been following Acme's work on ground‑truth robotics tooling for about two years — your recent posts on staff engineering culture are what finally pushed me to reach out.",
    "At Northline I led the rebuild of our component platform across 14 product teams. The interesting part wasn't the tech, it was getting humans to agree on what to stop maintaining. I'd love to bring that same bias toward subtraction to the Staff Engineer role.",
    'I can start with a short written system review of one part of your stack if that would be useful, no commitment on either side. Either way — thank you for the consideration.'
  ],
  sign: 'Warmly,\nMira Vale'
}

export const aiMessages = [
  {
    role: 'user',
    text: 'Tighten the experience bullets on the Platform CV — more impact, less process.'
  },
  {
    role: 'assistant',
    text: "On it. I'll keep your voice and just swap out soft verbs for concrete outcomes. Here's a pass on the first role:"
  },
  {
    role: 'tool',
    text: '→ update_cv  sections[1].items[0]  →  "Cut platform ship time 11d→3d across 14 teams by…"'
  },
  {
    role: 'assistant',
    text: 'Applied. Want me to compress the Linework entry to two bullets too, or keep it as‑is?'
  }
]

export const tweakState = {
  theme: 'dark',
  palette: 'moonlit',
  glass: 'balanced',
  orbs: 'on',
  radius: 'lg'
}
