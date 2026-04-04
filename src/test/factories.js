/**
 * Test data factories for cv-maker stores.
 * Each factory returns a plain object matching the store's data shape.
 * Pass an overrides object to customize specific fields.
 */

// --- Workspace factory ---

export function createWorkspace(overrides = {}) {
  return {
    metadata: {
      id: overrides.id || 'ws-test-id',
      lastModified: overrides.lastModified || Date.now()
    },
    cvs: overrides.cvs || {},
    coverLetters: overrides.coverLetters || {},
    jobAnalysis: overrides.jobAnalysis || null,
    matchReport: overrides.matchReport || null,
    companyResearch: overrides.companyResearch || null
  }
}

// --- CV data factory (the inner `data` object) ---

export function createCvData(overrides = {}) {
  const personalInfo = {
    name: 'John Doe',
    role: 'Software Engineer',
    picture: '',
    aboutMe: 'A passionate developer.',
    aboutMeTitle: 'About Me',
    contact: [
      { id: 'email', type: 'email', value: 'john@example.com', label: 'Email', icon: 'mail' },
      { id: 'phone', type: 'phone', value: '+1234567890', label: 'Phone', icon: 'phone' }
    ],
    ...(overrides.personalInfo || {})
  }

  const sections = overrides.sections || [
    { id: 'experience', title: 'Experience', type: 'experience', items: [], visible: true },
    { id: 'projects', title: 'Projects', type: 'projects', items: [], visible: true },
    { id: 'education', title: 'Education', type: 'education', items: [], visible: true },
    { id: 'skills', title: 'Skills', type: 'skills', items: [], visible: true },
    { id: 'languages', title: 'Languages', type: 'languages', items: [], visible: true },
    { id: 'certifications', title: 'Certifications', type: 'certifications', items: [], visible: true }
  ]

  return { personalInfo, sections }
}

// --- CV document factory (the wrapper stored in workspace.cvs[name]) ---

export function createCvDocument(overrides = {}) {
  return {
    id: overrides.id || 'cv-test-id',
    lastModified: overrides.lastModified || Date.now(),
    data: overrides.data || createCvData(overrides.dataOverrides || {})
  }
}

// --- Cover Letter data factory (the inner `data` object) ---

export function createCoverLetterData(overrides = {}) {
  return {
    applicantAddress: overrides.applicantAddress || '123 Test Street',
    companyAddress: overrides.companyAddress || '456 Corp Ave',
    date: overrides.date || '2025-01-15',
    title: overrides.title || 'Application for Software Engineer',
    subtitle: overrides.subtitle || 'Re: Job Opening',
    body: overrides.body || '<p>Dear Hiring Manager,</p>',
    signatureImage: overrides.signatureImage || '',
    signatureName: overrides.signatureName || 'John Doe'
  }
}

// --- Cover Letter document factory (the wrapper stored in workspace.coverLetters[name]) ---

export function createCoverLetterDocument(overrides = {}) {
  return {
    id: overrides.id || 'cl-test-id',
    lastModified: overrides.lastModified || Date.now(),
    data: overrides.data || createCoverLetterData(overrides.dataOverrides || {})
  }
}

// --- Settings factory ---

export function createSettings(overrides = {}) {
  return {
    atsMode: false,
    showPictureInAts: false,
    uppercaseName: true,
    uppercaseRole: true,
    uppercaseHeaders: true,
    uppercaseCoverLetterTitle: true,
    picturePosition: 'left',
    openRouterKey: '',
    openRouterModel: 'openai/gpt-4o-mini',
    taskModels: {
      jobAnalysis: 'perplexity/sonar-pro',
      matchReport: 'openai/gpt-4o-mini',
      companyResearch: 'perplexity/sonar-pro',
      cvGeneration: 'openai/gpt-4o-mini',
      coverLetter: 'openai/gpt-4o-mini'
    },
    customModels: [],
    matchReportThreshold: 70,
    contextThreshold: 80,
    summaryModel: 'openai/gpt-4o-mini',
    ...overrides
  }
}

// --- User Profile factory ---

export function createUserProfile(overrides = {}) {
  return {
    professionalExperience: overrides.professionalExperience || '',
    fullName: overrides.fullName || 'Jane Smith',
    email: overrides.email || 'jane@example.com',
    phone: overrides.phone || '+0987654321',
    location: overrides.location || 'New York, NY',
    linkedIn: overrides.linkedIn || '',
    portfolio: overrides.portfolio || '',
    lastModified: overrides.lastModified || null,
    createdAt: overrides.createdAt || null
  }
}

// --- Chat session factory ---

export function createChatSession(overrides = {}) {
  return {
    id: overrides.id || 'session-test-id',
    title: overrides.title || 'Test Chat',
    createdAt: overrides.createdAt || Date.now(),
    updatedAt: overrides.updatedAt || Date.now(),
    messages: overrides.messages || [],
    context: overrides.context || {},
    model: overrides.model || 'openai/gpt-4o-mini',
    tokenUsage: overrides.tokenUsage || null
  }
}

// --- Chat message factory ---

export function createChatMessage(overrides = {}) {
  return {
    id: overrides.id || 'msg-test-id',
    role: overrides.role || 'user',
    content: overrides.content || 'Hello, world!',
    timestamp: overrides.timestamp || Date.now(),
    ...(overrides.metadata ? { metadata: overrides.metadata } : {})
  }
}

// --- Workspace context factories ---

export function createJobAnalysis(overrides = {}) {
  return {
    content: overrides.content || '<h2>Software Engineer</h2><p>Analysis content</p>',
    source: overrides.source || 'text',
    sourceUrl: overrides.sourceUrl || null,
    jobTitle: overrides.jobTitle || 'Software Engineer',
    company: overrides.company || 'Acme Corp',
    createdAt: overrides.createdAt || Date.now(),
    lastModified: overrides.lastModified || Date.now()
  }
}

export function createMatchReport(overrides = {}) {
  return {
    content: overrides.content || '<h2>Match Report</h2><p>Good match</p>',
    score: overrides.score ?? 75,
    strengths: overrides.strengths || ['JavaScript', 'Vue.js'],
    weaknesses: overrides.weaknesses || ['No Go experience'],
    recommendation: overrides.recommendation || 'apply',
    createdAt: overrides.createdAt || Date.now(),
    lastModified: overrides.lastModified || Date.now()
  }
}

export function createCompanyResearch(overrides = {}) {
  return {
    content: overrides.content || '<h2>Company Research</h2><p>Details</p>',
    companyName: overrides.companyName || 'Acme Corp',
    legitimacyScore: overrides.legitimacyScore ?? 90,
    redFlags: overrides.redFlags || [],
    strategicInfo: overrides.strategicInfo || null,
    createdAt: overrides.createdAt || Date.now(),
    lastModified: overrides.lastModified || Date.now()
  }
}
