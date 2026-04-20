/* eslint-disable */
// All screens for the prototype
import { icons, moonMark } from './icons.js'
import { brand, appbarTrail, cardMenu, pill, tag, scoreBar, toggle } from './components.js'
import { workspaces, cvs, coverLetters, cvData, coverLetterData, aiMessages } from './data.js'

// ----------------------------------------------------------
// 1. Workspace Dashboard (landing)
// ----------------------------------------------------------

export const workspaceDashboard = (state) => `
  <div data-screen="workspaces">
    <header class="appbar glass-chrome">
      <div class="appbar-lead">${brand()}</div>
      <div class="appbar-trail">${appbarTrail({ view: state.view, newLabel: 'New workspace' })}</div>
    </header>

    <section class="hero glass sheen">
      <div>
        <h1>Good evening, Mira.<br/><em>Five workspaces</em> waiting.</h1>
        <p>Each workspace is one job hunt — a company, a role, the versions of your CV and letter you've tuned for it, and the context you've gathered along the way.</p>
        <div class="hero-stats">
          ${pill('12 CVs', 'ok')}
          ${pill('6 cover letters')}
          ${pill('3 active applications', 'warn')}
          ${pill('AI tuned · 24h', 'ok')}
        </div>
      </div>
      <div class="hero-aside">
        <div class="hero-mini glass-chip" style="border-radius:18px;">
          <div class="icon">${icons.target()}</div>
          <div class="meta"><strong>Nebula AI — 92% match</strong><span>Last touched 2h ago</span></div>
        </div>
        <div class="hero-mini glass-chip" style="border-radius:18px;">
          <div class="icon">${icons.briefcase()}</div>
          <div class="meta"><strong>Acme — ready to send</strong><span>Cover letter final · Apr 14</span></div>
        </div>
      </div>
    </section>

    <div class="grid-toolbar">
      <h2>Workspaces <span class="subtle">${workspaces.length.toString().padStart(2, '0')}</span></h2>
      <div class="row" style="gap:8px">
        <span class="tag">sorted by · recent</span>
        <span class="tag">filter · all</span>
      </div>
    </div>

    <div class="doc-grid">
      ${workspaces
        .map(
          (w) => `
        <article class="doc-card glass" data-nav="dashboard">
          ${cardMenu()}
          <div class="icon-wrap">${icons.briefcase({ size: 22 })}</div>
          <h3>${w.name}</h3>
          <p class="subtitle">${w.cvCount} CV${w.cvCount === 1 ? '' : 's'} · ${w.clCount} letter${w.clCount === 1 ? '' : 's'}</p>
          ${
            w.matchScore != null
              ? `
            <div class="row" style="gap:10px; margin-top:4px;">
              <span class="mono" style="font-size:11px; color:var(--fg-2)">${w.matchScore}%</span>
              <div class="grow">${scoreBar(w.matchScore)}</div>
            </div>
          `
              : `<p class="subtitle" style="color:var(--fg-3)">No job context yet</p>`
          }
          <div class="meta">
            <span class="timestamp">${w.lastModified.toUpperCase()}</span>
            ${w.hasContext ? pill('tuned', 'ok') : pill('blank')}
          </div>
        </article>
      `
        )
        .join('')}
      <article class="doc-card doc-new" data-action="new">
        <div class="plus">${icons.plus({ size: 24 })}</div>
        <p>New workspace</p>
        <span>Start a fresh application</span>
      </article>
    </div>
  </div>
`

// ----------------------------------------------------------
// 2. Dashboard (inside a workspace)
// ----------------------------------------------------------

export const insideDashboard = (state) => `
  <div data-screen="dashboard">
    <header class="appbar glass-chrome">
      <div class="appbar-lead">
        <button class="icon-btn" data-nav="workspaces" title="Back">${icons.arrowLeft()}</button>
        ${brand('workspace')}
        <div class="breadcrumb">
          ${icons.chevronRight({ size: 14 })}
          <span class="ws-name" contenteditable="false">Acme — Staff Engineer</span>
        </div>
        <div class="seg" data-seg="tab" style="margin-left:12px">
          <button class="${state.tab === 'cv' ? 'active' : ''}" data-tab="cv">${icons.file({ size: 14 })} CVs · 3</button>
          <button class="${state.tab === 'cl' ? 'active' : ''}" data-tab="cl">${icons.mail({ size: 14 })} Letters · 2</button>
        </div>
      </div>
      <div class="appbar-trail">${appbarTrail({ view: state.view, ai: state.ai, newLabel: state.tab === 'cv' ? 'New CV' : 'New letter' })}</div>
    </header>

    <!-- Job context -->
    <section class="context-panel glass sheen">
      <div class="context-head">
        <h3><span class="icon">${icons.briefcase({ size: 14 })}</span> Application context <span class="tag">auto‑synced</span></h3>
        <div class="row" style="gap:8px">
          <button class="btn btn-xs btn-ghost">${icons.sparkles({ size: 12 })} Regenerate</button>
          <button class="btn btn-xs btn-ghost">${icons.plus({ size: 12 })} Add context</button>
        </div>
      </div>
      <div class="context-grid">
        <div class="ctx-card">
          <div class="ctx-title">
            <div class="lead"><span class="dot"></span>${icons.target({ size: 14 })} Role brief</div>
            <button class="btn btn-xs btn-ghost">open</button>
          </div>
          <p>Staff Engineer, Platform. Reports to VP Eng. Owns infrastructure for 14 product teams. Heavy on reliability and developer experience.</p>
          <div class="score">updated 3h ago · 1.2k tokens</div>
        </div>
        <div class="ctx-card">
          <div class="ctx-title">
            <div class="lead"><span class="dot"></span>${icons.zap({ size: 14 })} Match report</div>
            <span class="mono" style="font-size:11px; color:var(--ok)">86%</span>
          </div>
          ${scoreBar(86)}
          <p>Strong on platform leadership and design systems. Gap: distributed systems at scale — consider pulling from the Linework section.</p>
        </div>
        <div class="ctx-card">
          <div class="ctx-title">
            <div class="lead"><span class="dot"></span>${icons.building({ size: 14 })} Company research</div>
            <button class="btn btn-xs btn-ghost">open</button>
          </div>
          <p>Founded 2018. 240 people. Product‑led. Recent funding C. Culture leans async, writing‑heavy, staff eng write RFCs weekly.</p>
          <div class="score">7 sources · 4 articles · 2 podcasts</div>
        </div>
        <div class="ctx-card add">
          <div class="row" style="gap:6px">${icons.plus({ size: 14 })} Custom context</div>
          <p style="text-align:center">Notes, recruiter threads, interview prep…</p>
        </div>
      </div>
    </section>

    <div class="grid-toolbar">
      <h2>${state.tab === 'cv' ? 'CVs' : 'Cover letters'} <span class="subtle">${(state.tab === 'cv' ? cvs.length : coverLetters.length).toString().padStart(2, '0')}</span></h2>
      <div class="row" style="gap:8px">
        <span class="tag">drag JSON here to import</span>
      </div>
    </div>

    <div class="doc-grid">
      ${(state.tab === 'cv' ? cvs : coverLetters)
        .map(
          (c, i) => `
        <article class="doc-card glass" data-nav="editor" data-doctype="${state.tab}">
          ${cardMenu()}
          <div class="icon-wrap">${state.tab === 'cv' ? icons.file({ size: 22 }) : icons.mail({ size: 22 })}</div>
          <h3>${c.name}</h3>
          ${c.tag ? `<div>${tag(c.tag)}</div>` : ''}
          <p class="subtitle">${state.tab === 'cv' ? '2 pages · A4' : 'single page · letter'}</p>
          <div class="meta">
            <span class="timestamp">${c.lastModified.toUpperCase()}</span>
            ${i === 0 ? pill('just edited', 'ok') : pill('draft')}
          </div>
        </article>
      `
        )
        .join('')}
      <article class="doc-card doc-new" data-action="new">
        <div class="plus">${icons.plus({ size: 24 })}</div>
        <p>${state.tab === 'cv' ? 'New CV' : 'New letter'}</p>
        <span>Tuned to this workspace</span>
      </article>
    </div>
  </div>
`

// ----------------------------------------------------------
// 3. Document editor
// ----------------------------------------------------------

const editorForm = () => `
  <div class="panel glass">
    <div class="panel-head">
      <h4><span class="pip"></span>Editor</h4>
      <span class="tag">autosaved</span>
    </div>

    <div class="form-section">
      <div class="section-head"><span>Personal</span><span class="count">4 fields</span></div>
      <div class="field">
        <label>Full name</label>
        <input class="input" value="${cvData.name}"/>
      </div>
      <div class="field">
        <label>Role / title</label>
        <input class="input" value="${cvData.role}"/>
      </div>
      <div class="field">
        <label>About</label>
        <textarea class="textarea">${cvData.summary}</textarea>
      </div>
    </div>

    <div class="form-section">
      <div class="section-head"><span>Contact</span><span class="count">${cvData.contact.length}</span></div>
      ${cvData.contact
        .map(
          (c) => `
        <div class="row3">
          <span class="handle">${icons.grip({ size: 16 })}</span>
          <input class="input" value="${c.label}"/>
          <button class="icon-btn" style="width:32px;height:32px">${icons.trash({ size: 14 })}</button>
        </div>
      `
        )
        .join('')}
      <button class="btn btn-ghost btn-small" style="align-self:flex-start">${icons.plus({ size: 14 })} Add contact</button>
    </div>

    <div class="form-section">
      <div class="section-head"><span>Experience</span><span class="count">${cvData.experience.length} roles</span></div>
      ${cvData.experience
        .map(
          (x) => `
        <div class="row3">
          <span class="handle">${icons.grip({ size: 16 })}</span>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
            <strong style="font-size:13px; letter-spacing:-0.01em">${x.title}</strong>
            <span style="font-size:12px; color:var(--fg-2)">${x.org} · ${x.period}</span>
          </div>
          <button class="icon-btn" style="width:32px;height:32px">${icons.edit({ size: 14 })}</button>
        </div>
      `
        )
        .join('')}
      <button class="btn btn-ghost btn-small" style="align-self:flex-start">${icons.plus({ size: 14 })} Add role</button>
    </div>

    <div class="form-section">
      <div class="section-head"><span>Skills</span><span class="count">${cvData.skills.length}</span></div>
      <div class="row" style="flex-wrap:wrap; gap:6px">
        ${cvData.skills.map((s) => `<span class="chip">${s}</span>`).join('')}
        <span class="chip" style="border-style:dashed">${icons.plus({ size: 12 })} add</span>
      </div>
    </div>
  </div>
`

const cvPreview = () => `
  <div class="panel glass preview-stage" style="background:transparent;border:0;box-shadow:none;padding:28px 0;">
    <div class="page">
      <h1>${cvData.name}</h1>
      <div class="role">${cvData.role}</div>
      <div class="contact-row">
        ${cvData.contact.map((c) => `<span>${icons[c.type]({ size: 12 })} ${c.label}</span>`).join('')}
      </div>
      <p style="margin:0 0 4px; color:#333346;">${cvData.summary}</p>
      <h2>Experience</h2>
      ${cvData.experience
        .map(
          (x) => `
        <div class="exp">
          <div class="exp-head"><strong>${x.title}</strong><span class="period">${x.period}</span></div>
          <div class="exp-org">${x.org}</div>
          <ul>${x.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
        </div>
      `
        )
        .join('')}
      <h2>Skills</h2>
      <div class="skills">${cvData.skills.map((s) => `<span>${s}</span>`).join('')}</div>
    </div>
  </div>
`

const aiPanel = () => `
  <div class="panel glass ai-panel">
    <div class="ai-head">
      <h4><span class="avatar">${icons.sparkles({ size: 14 })}</span> Lycan assistant</h4>
      <button class="icon-btn" style="width:32px;height:32px" data-action="close-ai">${icons.close({ size: 14 })}</button>
    </div>
    <div class="ai-chips">
      <button class="chip">${icons.wand({ size: 12 })} Tighten bullets</button>
      <button class="chip">${icons.target({ size: 12 })} Match job spec</button>
      <button class="chip">${icons.zap({ size: 12 })} Draft letter</button>
    </div>
    <div class="ai-messages">
      ${aiMessages
        .map(
          (m) => `
        <div class="msg ${m.role}">
          <div class="meta">${m.role === 'user' ? 'You' : m.role === 'tool' ? 'tool call' : 'Lycan'}</div>
          <div class="bubble">${m.text}</div>
        </div>
      `
        )
        .join('')}
      <div class="msg">
        <div class="meta">Lycan</div>
        <div class="bubble"><div class="thinking"><i></i><i></i><i></i></div></div>
      </div>
    </div>
    <div class="ai-input">
      <textarea placeholder="Ask Lycan to rewrite, tailor, research…"></textarea>
      <button class="ai-send" title="Send">${icons.send({ size: 14 })}</button>
    </div>
  </div>
`

export const documentEditor = (state) => `
  <div data-screen="editor">
    <header class="appbar glass-chrome">
      <div class="appbar-lead">
        <button class="icon-btn" data-nav="dashboard" title="Back">${icons.arrowLeft()}</button>
        ${brand('editor')}
        <div class="breadcrumb">
          ${icons.chevronRight({ size: 14 })}
          <span style="color:var(--fg-2)">Acme</span>
          ${icons.chevronRight({ size: 14 })}
          <span class="ws-name" style="font-size:22px">Staff Engineer — Platform</span>
        </div>
        <div class="seg" style="margin-left:8px">
          <button>${icons.undo({ size: 14 })}</button>
          <button>${icons.redo({ size: 14 })}</button>
        </div>
      </div>
      <div class="appbar-trail">
        <div class="seg">
          <button class="${state.showForm ? 'active' : ''}" data-action="toggle-form">${icons.edit({ size: 14 })} Editor</button>
          <button class="${state.ai ? 'active' : ''}" data-action="toggle-ai">${icons.sparkles({ size: 14 })} AI</button>
          <button class="${state.ats ? 'active' : ''}" data-action="toggle-ats">${icons.file({ size: 14 })} ATS</button>
        </div>
        <button class="icon-btn" title="Export JSON">${icons.download()}</button>
        <button class="btn btn-primary">${icons.printer({ size: 14 })} Export PDF</button>
        <button class="icon-btn" data-action="toggle-theme">${icons.moon()}</button>
        <button class="icon-btn" data-action="settings">${icons.settings()}</button>
      </div>
    </header>

    <div class="editor-wrap ${!state.showForm ? 'no-form' : ''} ${!state.ai ? 'no-ai' : ''}">
      ${state.showForm ? editorForm() : ''}
      ${cvPreview()}
      ${state.ai ? aiPanel() : ''}
    </div>
  </div>
`

// ----------------------------------------------------------
// 4. Modals
// ----------------------------------------------------------

export const createImportModal = () => `
  <div class="modal-backdrop" data-action="close-modal">
    <div class="modal glass sheen" onclick="event.stopPropagation()">
      <div class="row" style="justify-content:space-between">
        <div>
          <h3>New workspace</h3>
          <p>One workspace per application. You can always rename it later.</p>
        </div>
        <button class="icon-btn" data-action="close-modal">${icons.close()}</button>
      </div>
      <div class="field">
        <label>Name</label>
        <input class="input" placeholder="e.g. Acme — Staff Engineer" autofocus/>
      </div>
      <div class="label-line">or import existing</div>
      <div class="doc-card doc-new" style="min-height: 120px;">
        <div class="plus">${icons.upload({ size: 22 })}</div>
        <p>Drop a .json file</p>
        <span>or click to browse — CV, letter, or full workspace</span>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
        <button class="btn btn-primary">${icons.plus({ size: 14 })} Create workspace</button>
      </div>
    </div>
  </div>
`

export const settingsModal = () => `
  <div class="modal-backdrop" data-action="close-modal">
    <div class="modal lg glass sheen" onclick="event.stopPropagation()" style="max-height: 80vh; overflow: auto;">
      <div class="row" style="justify-content:space-between">
        <h3>Settings</h3>
        <button class="icon-btn" data-action="close-modal">${icons.close()}</button>
      </div>
      <div class="two-col">
        <nav class="side-nav">
          <button class="active">${icons.sparkles({ size: 14 })} AI model</button>
          <button>${icons.file({ size: 14 })} Document</button>
          <button>${icons.target({ size: 14 })} Matching</button>
          <button>${icons.settings({ size: 14 })} Advanced</button>
        </nav>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div>
            <div class="label-line">model</div>
            <div class="field">
              <label>Provider</label>
              <select class="select"><option>Anthropic · Claude Sonnet 4.5</option><option>OpenAI · gpt‑5</option><option>Local · Ollama</option></select>
            </div>
            <div class="row2" style="margin-top:10px">
              <div class="field"><label>Temperature</label><input class="input" value="0.4"/></div>
              <div class="field"><label>Max tokens</label><input class="input" value="4096"/></div>
            </div>
          </div>
          <div>
            <div class="label-line">behavior</div>
            <div class="toggle-row"><span>Stream responses</span>${toggle(true)}</div>
            <div class="toggle-row"><span>Auto‑apply tool calls</span>${toggle(true)}</div>
            <div class="toggle-row"><span>Show reasoning</span>${toggle(false)}</div>
            <div class="toggle-row"><span>Web search</span>${toggle(true)}</div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Close</button>
        <button class="btn btn-primary">${icons.check({ size: 14 })} Save</button>
      </div>
    </div>
  </div>
`

export const profileModal = () => `
  <div class="modal-backdrop" data-action="close-modal">
    <div class="modal modal-profile lg glass sheen" onclick="event.stopPropagation()">
      <div class="row" style="justify-content:space-between; align-items:flex-start">
        <div class="row" style="gap:16px">
          <div class="avatar-lg">M</div>
          <div>
            <h3 style="margin:0">Mira Vale</h3>
            <p style="margin-top:4px">mira@vale.studio · member since Jan 2024</p>
            <div class="row" style="gap:6px;margin-top:10px">${pill('pro', 'ok')}${tag('3 workspaces')}${tag('12 cvs')}</div>
          </div>
        </div>
        <button class="icon-btn" data-action="close-modal">${icons.close()}</button>
      </div>
      <div class="subtabs">
        <button class="active">About you</button>
        <button>Preferences</button>
        <button>Export</button>
      </div>
      <div class="field profile-about">
        <div class="profile-about-head">
          <label>Everything Lycan should know about you</label>
          <div class="help-wrap" tabindex="0" aria-label="Writing tips">
            <span class="help-icon">?</span>
            <div class="help-pop glass" role="tooltip">
              <div class="help-pop-title">${icons.sparkles({ size: 12 })} Writing tips</div>
              <ul>
                <li>Lead with roles, years, and the shape of problems you like to solve.</li>
                <li>Name the companies, products, and teams — Lycan pulls concrete details into drafts.</li>
                <li>Paste metrics, launches, and one-liners you're proud of. Raw is fine; Lycan will tune.</li>
                <li>Mention tools, stacks, and the vocabulary your industry actually uses.</li>
                <li>Add soft context too: how you work, what you turn down, what you want next.</li>
              </ul>
              <div class="help-pop-foot">The more you write, the less editing later.</div>
            </div>
          </div>
        </div>
        <div class="rte">
          <div class="rte-toolbar" role="toolbar" aria-label="Text formatting">
            <button class="rte-btn" data-cmd="bold" title="Bold (⌘B)"><b>B</b></button>
            <button class="rte-btn rte-italic" data-cmd="italic" title="Italic (⌘I)"><i>I</i></button>
            <button class="rte-btn rte-under" data-cmd="underline" title="Underline (⌘U)"><u>U</u></button>
            <button class="rte-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
            <span class="rte-sep"></span>
            <button class="rte-btn" data-cmd="formatBlock" data-arg="H3" title="Heading">H</button>
            <button class="rte-btn" data-cmd="formatBlock" data-arg="BLOCKQUOTE" title="Quote">”</button>
            <button class="rte-btn rte-mono" data-cmd="formatBlock" data-arg="PRE" title="Code block">&lt;/&gt;</button>
            <span class="rte-sep"></span>
            <button class="rte-btn" data-cmd="insertUnorderedList" title="Bulleted list">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="6" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="18" r="1.2" fill="currentColor"/><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/></svg>
            </button>
            <button class="rte-btn" data-cmd="insertOrderedList" title="Numbered list">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><text x="2" y="8" font-size="6" fill="currentColor" stroke="none">1</text><text x="2" y="14" font-size="6" fill="currentColor" stroke="none">2</text><text x="2" y="20" font-size="6" fill="currentColor" stroke="none">3</text><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/></svg>
            </button>
            <span class="rte-sep"></span>
            <button class="rte-btn" data-cmd="createLink" title="Link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <span class="rte-sep"></span>
            <button class="rte-btn" data-cmd="undo" title="Undo">↶</button>
            <button class="rte-btn" data-cmd="redo" title="Redo">↷</button>
          </div>
          <div class="rte-editor" contenteditable="true" spellcheck="false" data-profile-editor>
            <p><strong>Mira Vale</strong> — Staff Software Engineer, Brooklyn NY. <a href="mailto:mira@vale.studio">mira@vale.studio</a>.</p>
            <p>Nine years turning ambiguous platform problems into calm, legible systems. Currently leading the internal platform at <strong>Linework</strong> (14 product teams, 180 engineers) — cut average ship time from <em>11d to 3.4d</em> over 18 months by redesigning the deploy surface and the paved road around it.</p>
            <p><strong>Before Linework</strong></p>
            <ul>
              <li>Senior Eng, <em>Northwind</em> — scaled the trading platform from 200 to 4,000 RPS.</li>
              <li>Early platform hire, <em>Orbital Health</em> — built the internal CI/CD from scratch.</li>
              <li>Earlier career in design systems and developer tools; I still read type specimens for fun.</li>
            </ul>
            <p>I write a lot. Weekly RFCs, eng-wide memos, the kind of doc that gets forwarded. I like distributed systems work that's actually about people — on-call, incident review, how teams find each other.</p>
            <p><strong>Hiring signals I'm looking for:</strong></p>
            <ol>
              <li>Staff or principal level, platform / infra / devex.</li>
              <li>Small senior teams, writing-heavy culture.</li>
              <li><em>Not</em> interested in pure IC ladder climbing or managing &gt;4 reports directly.</li>
            </ol>
            <p>Side things worth knowing: I co-maintain an OSS load-balancer (<a href="https://github.com/mira/relay">github.com/mira/relay</a>), speak at SRECon most years, and once rewrote a payments pipeline over a long weekend — <s>do not recommend</s> would do again.</p>
          </div>
        </div>
        <div class="profile-meta row" style="justify-content:space-between; margin-top:10px">
          <div class="row" style="gap:8px; font-size:12px; color: var(--fg-3)">
            ${icons.sparkles({ size: 12 })} <span>Lycan re-reads this before every draft and tune.</span>
          </div>
          <div class="row" style="gap:12px; font-size:12px; color: var(--fg-3)">
            <span>2,184 tokens</span>
            <span>·</span>
            <span>auto-saved 12s ago</span>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Close</button>
        <button class="btn btn-primary">${icons.check({ size: 14 })} Save &amp; re-tune drafts</button>
      </div>
    </div>
  </div>
`
