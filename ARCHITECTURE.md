# BugBusters — Frontend Architecture Document

> **Purpose**: This document describes the complete UI architecture, data models, component hierarchy, API contracts, design system, user flows, and future module plans for the BugBusters security scanning platform. It is intended to be fed into AI-based UI generation tools (e.g., Google Stitch) to produce accurate, high-fidelity interfaces.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project File Structure](#3-project-file-structure)
4. [Application Shell & Global Layout](#4-application-shell--global-layout)
5. [Design System & Visual Language](#5-design-system--visual-language)
6. [Page Architecture — Master Layout](#6-page-architecture--master-layout)
7. [Navigation & Module Routing](#7-navigation--module-routing)
8. [Module 1 — Dependency Scanner (CURRENT)](#8-module-1--dependency-scanner-current)
9. [Module 2 — Config Scanner (FUTURE)](#9-module-2--config-scanner-future)
10. [Module 3 — Static Code Analyzer (FUTURE)](#10-module-3--static-code-analyzer-future)
11. [Shared Components Library](#11-shared-components-library)
12. [Complete Data Models & TypeScript Types](#12-complete-data-models--typescript-types)
13. [API Contract — All Endpoints](#13-api-contract--all-endpoints)
14. [Real-Time Communication (SSE)](#14-real-time-communication-sse)
15. [State Management Architecture](#15-state-management-architecture)
16. [User Flows — Step by Step](#16-user-flows--step-by-step)
17. [Responsive Design Specifications](#17-responsive-design-specifications)
18. [Accessibility Requirements](#18-accessibility-requirements)
19. [Error Handling & Edge States](#19-error-handling--edge-states)
20. [Performance Considerations](#20-performance-considerations)

---

## 1. Project Overview

**BugBusters** is a banking-grade security scanning platform that analyzes software repositories for security vulnerabilities, configuration issues, and code quality problems. The frontend is a **single-page dashboard** that provides:

- **GitHub OAuth integration** to import repositories directly
- **ZIP file upload** for offline/archive scanning
- **Real-time streaming logs** via Server-Sent Events (SSE)
- **Rich vulnerability visualization** with severity-based findings, risk chains, blast radius mapping, and banking intelligence scoring

### Platform Modules (Current + Future)

| Module | Status | Description |
|--------|--------|-------------|
| **Dependency Scanner** | ✅ Active | Scans `package.json`, `requirements.txt`, `pom.xml`, etc. for vulnerable, unmaintained, or malicious dependencies. Performs CVE lookup, capability fingerprinting, namespace confusion detection, and blast-radius analysis. |
| **Config Scanner** | 🔜 Planned | Scans configuration files (`.env`, `docker-compose.yml`, `Dockerfile`, Kubernetes manifests, Terraform, CI/CD pipelines) for secrets, misconfigurations, insecure defaults, and compliance violations. |
| **Static Code Analyzer** | 🔜 Planned | Performs AST-based static analysis on source code to detect SQL injection, XSS, insecure deserialization, hardcoded credentials, unsafe crypto usage, and OWASP Top 10 violations. |

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | ^5 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| PostCSS | @tailwindcss/postcss | ^4 |
| Linting | ESLint + eslint-config-next | ^9 / 16.2.9 |
| Backend API | Python Flask (separate repo) | — |
| Real-time | Server-Sent Events (SSE) | Native EventSource |
| Auth | GitHub OAuth (backend-managed) | — |

### Key Configuration

- **API Base URL**: Configured via `NEXT_PUBLIC_API_BASE_URL` environment variable, defaults to `http://127.0.0.1:5000`
- **Dev Server**: `next dev --webpack -H 127.0.0.1`
- **Path Aliases**: `@/*` maps to project root `"./*"`

---

## 3. Project File Structure

### Current Structure
```
frontend/
├── app/
│   ├── layout.tsx          # Root HTML layout (metadata, body wrapper)
│   ├── page.tsx            # Main single-page application (~1059 lines)
│   ├── globals.css         # Tailwind import + CSS custom properties
│   └── favicon.ico
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
└── Architecture.md          # This file
```

### Recommended Refactored Structure (for multi-module scaling)
```
frontend/
├── app/
│   ├── layout.tsx                    # Global shell with sidebar navigation
│   ├── page.tsx                      # Landing / dashboard overview
│   ├── dependency-scanner/
│   │   └── page.tsx                  # Dependency Scanner module
│   ├── config-scanner/
│   │   └── page.tsx                  # Config Scanner module (future)
│   ├── static-analyzer/
│   │   └── page.tsx                  # Static Code Analyzer module (future)
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx              # Sidebar + top bar + content area
│   │   ├── Sidebar.tsx               # Module navigation sidebar
│   │   └── TopBar.tsx                # Health status + user info
│   ├── shared/
│   │   ├── Metric.tsx                # Reusable metric card
│   │   ├── SeverityBadge.tsx         # Severity pill component
│   │   ├── StatusBadge.tsx           # Job status pill component
│   │   ├── ScoreBar.tsx              # Progress bar with label
│   │   ├── EvidencePill.tsx          # Evidence detail card
│   │   ├── FlowArrow.tsx            # Visual arrow connector
│   │   ├── ErrorAlert.tsx            # Error message display
│   │   └── EmptyState.tsx            # Empty state placeholder
│   ├── scan-input/
│   │   ├── ScanConfigPanel.tsx       # Shared scan options (email, failOn, etc.)
│   │   ├── GitHubConnector.tsx       # GitHub OAuth + repo picker
│   │   ├── ZipUploader.tsx           # ZIP file upload form
│   │   └── RepoSearchList.tsx        # Searchable repository list
│   ├── dependency-scanner/
│   │   ├── BankingIntelligencePanel.tsx
│   │   ├── BlastRadiusMap.tsx
│   │   ├── FindingsTable.tsx
│   │   ├── TraceColumn.tsx
│   │   ├── TraceRow.tsx
│   │   └── RiskChainSelector.tsx
│   ├── config-scanner/              # Future
│   │   ├── ConfigFindingsTable.tsx
│   │   ├── SecretDetectionPanel.tsx
│   │   └── ComplianceMatrix.tsx
│   └── static-analyzer/             # Future
│       ├── CodeFindingsTable.tsx
│       ├── VulnerabilityFlowDiagram.tsx
│       └── OWASPScorecard.tsx
├── types/
│   ├── dependency-scanner.ts         # All dependency scanner types
│   ├── config-scanner.ts             # Config scanner types (future)
│   ├── static-analyzer.ts            # Static analyzer types (future)
│   └── common.ts                     # Shared types (Job, Log, GitHub, etc.)
├── hooks/
│   ├── useHealthCheck.ts
│   ├── useGitHubAuth.ts
│   ├── useScanJobs.ts
│   ├── useScanLogs.ts                # SSE log streaming hook
│   └── useApi.ts                     # Base fetch wrapper
├── lib/
│   ├── api.ts                        # API client functions
│   ├── constants.ts                  # API_BASE, severity levels, etc.
│   └── formatters.ts                 # formatLocation, shortFileName, etc.
└── public/
```

---

## 4. Application Shell & Global Layout

### Root Layout (`layout.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│ <html lang="en" className="h-full antialiased">         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ <body className="min-h-full flex flex-col">         │ │
│ │                                                     │ │
│ │   {children}  ← All page content renders here       │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Metadata:**
- Title: `"Dependency Risk Dashboard"` (should evolve to `"BugBusters Security Platform"`)
- Description: `"Scan GitHub repositories and uploaded archives for vulnerable dependencies."`

### Global CSS Custom Properties

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}

/* Dark mode (prefers-color-scheme) */
:root (dark) {
  --background: #0a0a0a;
  --foreground: #ededed;
}
```

**Fonts**: `Arial, Helvetica, sans-serif` (body), `"Cascadia Mono", Consolas, monospace` (code)

---

## 5. Design System & Visual Language

### 5.1 Color Palette

#### Core Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Page background | `#f6f7f9` | Main content area background |
| Card background | `#ffffff` | All card/panel surfaces |
| Primary text | `#172026` / `#111827` | Headings, body text |
| Secondary text | `#44505f` / `#5b6573` | Descriptions, secondary info |
| Muted text | `#667085` | Labels, timestamps, metadata |
| Primary blue | `#1f6feb` | Primary buttons, active states, links |
| Primary blue hover | `#195fca` | Button hover state |
| Blue highlight bg | `#f0f6ff` | Selected item backgrounds |

#### Border Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Card border | `#d8dee4` | Card outer borders |
| Divider | `#edf0f3` | Internal section dividers |
| Input border | `#cfd6df` | Form input borders |
| Input focus | `#2f6fed` | Input focus ring |
| Dashed upload | `#b8c2cc` | File upload dashed border |

#### Status / Semantic Colors
| Semantic | Background | Text | Border | Usage |
|----------|-----------|------|--------|-------|
| Success/Passed | `#effaf3` | `#176b3a` | `#b7e4c7` | Health OK, completed jobs, "track" action |
| Warning/Running | `#fff8eb` | `#8a5200` | `#ffd6a5` | Running jobs, health warnings |
| Error/Failed | `#fff5f5` | `#b42318` | `#ffd0d0` | Failed jobs, error messages |
| Neutral/Queued | `#eef1f5` | `#44505f` | — | Queued jobs, generic badges |

#### Severity Colors (for vulnerability badges)
| Severity | Background | Text |
|----------|-----------|------|
| Critical | `#7f1d1d` | `#ffffff` (white text) |
| High | `#fee2e2` | `#991b1b` |
| Medium | `#fef3c7` | `#92400e` |
| Low | `#dcfce7` | `#166534` |
| Info/Unknown | `#e5e7eb` | `#374151` |

#### Banking Action Colors
| Action | Background | Text | Border |
|--------|-----------|------|--------|
| Block | `#fff5f5` | `#991b1b` | `#f3b4b4` |
| Expedite | `#fffbeb` | `#92400e` | `#fcd34d` |
| Watch | `#eff6ff` | `#1d4ed8` | `#bfdbfe` |
| Track | `#effaf3` | `#176b3a` | `#b7e4c7` |

#### Blast Radius Trace Column Accent Colors
| Accent | Background | Border |
|--------|-----------|--------|
| Blue | `#eff6ff` | `#93c5fd` |
| Amber | `#fffbeb` | `#fcd34d` |
| Red | `#fff5f5` | `#fca5a5` |
| Green | `#f0fdf4` | `#86efac` |

#### Log Console Colors (dark theme: `bg-[#0f172a]`)
| Element | Color |
|---------|-------|
| Console background | `#0f172a` |
| Default text | `#d1d5db` |
| Timestamp | `#7dd3fc` |
| INFO level | `#cbd5e1` |
| SUCCESS level | `#86efac` |
| WARNING level | `#fde68a` |
| ERROR level | `#fca5a5` |
| Message body | `#f8fafc` |
| Log border | `#334155` |
| Empty state | `#94a3b8` |
| Code blocks | `bg-[#0f172a]` with `text-[#d1d5db]` |

### 5.2 Typography

| Element | Size | Weight | Tracking | Case |
|---------|------|--------|----------|------|
| Page subtitle | `text-sm` (14px) | `font-semibold` (600) | `tracking-[0.18em]` | UPPERCASE |
| Page title (h1) | `text-4xl` (36px) | `font-semibold` (600) | `tracking-normal` | Normal |
| Page description | `text-base` (16px) | Normal (400) | Normal | Normal |
| Section heading (h2) | `text-xl` (20px) or `text-lg` (18px) | `font-semibold` (600) | Normal | Normal |
| Table header | `text-xs` (12px) | Normal | `tracking-[0.12em]` | UPPERCASE |
| Body text | `text-sm` (14px) | Normal (400) | Normal | Normal |
| Badge / pill | `text-xs` (12px) or `text-[11px]` | `font-semibold` (600) | Normal | Normal |
| Metric value | `text-3xl` (30px) | `font-semibold` (600) | Normal | Normal |
| Metric label | `text-sm` (14px) | `font-medium` (500) | Normal | Normal |
| Decision label | `text-xs` (12px) | `font-semibold` (600) | `tracking-[0.14em]` | UPPERCASE |
| Decision value | `text-2xl` (24px) | `font-semibold` (600) | Normal | UPPERCASE |
| Log text | `text-xs` (12px) | Normal | Normal | Normal |
| Code | `font-mono` | Normal | Normal | Normal |

### 5.3 Spacing & Layout

| Property | Value |
|----------|-------|
| Max content width | `max-w-7xl` (1280px) |
| Page horizontal padding | `px-6` (24px) |
| Card padding | `p-5` (20px) |
| Card border radius | `rounded-lg` (8px) |
| Card shadow | `shadow-sm` |
| Section gap | `gap-6` (24px) |
| Inner element gap | `gap-4` (16px) or `gap-2` (8px) |
| Input padding | `px-3 py-2` (12px / 8px) |
| Button padding | `px-4 py-2.5` (16px / 10px) |

### 5.4 Interactive States

| Element | Normal | Hover | Disabled | Active/Selected |
|---------|--------|-------|----------|-----------------|
| Primary button | `bg-[#1f6feb] text-white` | `bg-[#195fca]` | `opacity-60 cursor-not-allowed` | — |
| Outline button | `border-[#1f6feb] text-[#1f6feb]` | `bg-[#f0f6ff]` | `opacity-60 cursor-not-allowed` | — |
| Neutral button | `border-[#cfd6df]` | `bg-[#f6f8fa]` | — | — |
| Job card | `border-[#edf0f3]` | `border-[#cfd6df]` | — | `border-[#1f6feb] bg-[#f0f6ff]` |
| Chain selector | `border-transparent` | `border-[#cfd6df] bg-white` | — | `border-[#1f6feb] bg-white shadow-sm` |
| Input | `border-[#cfd6df]` | — | — | `border-[#2f6fed]` (focus) |
| Repository item | `bg-white` | `bg-[#f6f8fa]` | — | `bg-[#f0f6ff]` |

---

## 6. Page Architecture — Master Layout

### Current Layout (Single Page)

The entire application currently lives in a single `page.tsx` with this visual structure:

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER SECTION (white bg, border-bottom)                            │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Left: Subtitle + Title + Description                             ││
│ │ Right: Backend Health Status Badge                               ││
│ └──────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│ CONTENT AREA (gray bg #f6f7f9, 2-column grid on desktop)           │
│ ┌──────────┬──────────────────────────────────────────────────────┐ │
│ │LEFT      │ RIGHT PANEL (1fr)                                    │ │
│ │SIDEBAR   │                                                      │ │
│ │(420px)   │ ┌──────────────────────────────────────────────────┐ │ │
│ │          │ │ Metrics Row (4 cards in grid)                    │ │ │
│ │┌────────┐│ └──────────────────────────────────────────────────┘ │ │
│ ││ Scan   ││                                                      │ │
│ ││ Config ││ ┌──────────────────────────────────────────────────┐ │ │
│ ││ Panel  ││ │ Banking Intelligence Panel                      │ │ │
│ ││        ││ └──────────────────────────────────────────────────┘ │ │
│ ││ GitHub ││                                                      │ │
│ ││ + Zip  ││ ┌──────────────────────────────────────────────────┐ │ │
│ │└────────┘│ │ Blast Radius Map                                │ │ │
│ │          │ └──────────────────────────────────────────────────┘ │ │
│ │┌────────┐│                                                      │ │
│ ││ Recent ││ ┌──────────────────────────────────────────────────┐ │ │
│ ││ Jobs   ││ │ Live Execution Log (dark terminal)              │ │ │
│ ││ List   ││ └──────────────────────────────────────────────────┘ │ │
│ │└────────┘│                                                      │ │
│ │          │ ┌──────────────────────────────────────────────────┐ │ │
│ │          │ │ Findings & Fixes Table                          │ │ │
│ │          │ └──────────────────────────────────────────────────┘ │ │
│ └──────────┴──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Future Layout (Multi-Module with Sidebar Navigation)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOP BAR (fixed, full width)                                         │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Logo: "BugBusters"  │  Health Badge  │  GitHub User Avatar       ││
│ └──────────────────────────────────────────────────────────────────┘│
├────────┬────────────────────────────────────────────────────────────┤
│ SIDE   │ CONTENT AREA                                               │
│ NAV    │                                                            │
│ (64px  │  ┌────────────────────────────────────────────────────┐    │
│  or    │  │ Module-specific header                             │    │
│ 240px  │  ├────────────────────────────────────────────────────┤    │
│ expand)│  │                                                    │    │
│        │  │ Module Content (varies by active scanner)          │    │
│ ┌────┐ │  │                                                    │    │
│ │ 🔍 │ │  │                                                    │    │
│ │Dep │ │  │                                                    │    │
│ ├────┤ │  │                                                    │    │
│ │ ⚙️ │ │  │                                                    │    │
│ │Cfg │ │  │                                                    │    │
│ ├────┤ │  │                                                    │    │
│ │ 📝 │ │  │                                                    │    │
│ │Code│ │  │                                                    │    │
│ └────┘ │  └────────────────────────────────────────────────────┘    │
└────────┴────────────────────────────────────────────────────────────┘
```

---

## 7. Navigation & Module Routing

### Current State
- Single page at `/` — no navigation, all content on one page

### Future Routes

| Route | Module | Description |
|-------|--------|-------------|
| `/` | Dashboard | Overview with aggregated stats from all modules |
| `/dependency-scanner` | Dependency Scanner | Full dependency scanning UI (current `page.tsx` content) |
| `/config-scanner` | Config Scanner | Configuration file analysis UI |
| `/static-analyzer` | Static Code Analyzer | Source code static analysis UI |

### Sidebar Navigation Items

```typescript
const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard", // Lucide icon
    href: "/",
    description: "Platform overview"
  },
  {
    id: "dependency-scanner",
    label: "Dependency Scanner",
    icon: "Package", // Lucide icon
    href: "/dependency-scanner",
    description: "Scan dependencies for vulnerabilities",
    status: "active" // active | coming-soon
  },
  {
    id: "config-scanner",
    label: "Config Scanner",
    icon: "Settings", // Lucide icon
    href: "/config-scanner",
    description: "Detect misconfigurations & secrets",
    status: "coming-soon"
  },
  {
    id: "static-analyzer",
    label: "Static Analyzer",
    icon: "FileCode", // Lucide icon
    href: "/static-analyzer",
    description: "Analyze source code for vulnerabilities",
    status: "coming-soon"
  }
];
```

---

## 8. Module 1 — Dependency Scanner (CURRENT)

This is the fully implemented module. Below is every UI component in detail.

### 8.1 Header Section

**Visual**: White background card spanning full width with bottom border.

```
┌─────────────────────────────────────────────────────────────────┐
│  SECURE DEPENDENCY INTAKE          (small caps, muted, tracked) │
│                                                                  │
│  Dependency Risk Dashboard         (h1, 36px, semibold)         │
│                                                                  │
│  Connect GitHub, import a repo,    ┌──────────────────────────┐ │
│  or upload a source archive...     │ Backend status: ready ✅ │ │
│                                    └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Components**:
- Subtitle: uppercase tracked label `"Secure dependency intake"`
- Title: `"Dependency Risk Dashboard"`
- Description: Multi-line paragraph explaining the tool
- Health badge: Dynamic pill showing `"Backend status: {health}"` — green for ready, amber for issues

**Health Check Logic**:
- Calls `GET /api/health` on mount
- Checks `data.dependencyScanner?.status === "ok"`
- Displays: `"ready"`, `"scanner offline"`, or `"backend offline"`

---

### 8.2 Left Sidebar — Scan Configuration Panel

**Width**: Fixed `420px` on desktop (lg breakpoint), full width on mobile.

#### 8.2.1 Scan Options Bar

```
┌──────────────────────────────────────────────┐
│  Start a scan                    (h2, 18px)  │
│                                              │
│  ┌──────────┬──────────┬──────────────────┐  │
│  │ ☑ Dev    │ ☑ OSV    │ ▼ High          │  │
│  │  deps    │          │  (fail level)    │  │
│  └──────────┴──────────┴──────────────────┘  │
│                                              │
│  Report email                                │
│  ┌──────────────────────────────────────────┐│
│  │ security-team@bank.com                   ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Fields**:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `includeDev` | Checkbox | `true` | Include dev dependencies in scan |
| `useOsv` | Checkbox | `true` | Use OSV database for vulnerability lookup |
| `failOn` | Select dropdown | `"high"` | Severity threshold: `critical`, `high`, `medium`, `low` |
| `email` | Text input | `""` | Optional email for report delivery |

**Layout**: The three scan toggles (Dev deps, OSV, Fail level) sit in a 3-column grid inside a rounded gray (`#eef1f5`) container. Each toggle has a white card background with shadow.

#### 8.2.2 GitHub Connection Section

Separated by a top border divider (`border-t border-[#edf0f3]`).

**State Machine**:

```
STATE 1: Not Connected
┌──────────────────────────────────────────────┐
│  GitHub connection                           │
│  ┌──────────────────────────────────────────┐│
│  │        Connect GitHub        (outline btn)││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ Connect GitHub with OAuth to import      ││
│  │ repositories from your account.          ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘

STATE 2: Connecting (Loading)
┌──────────────────────────────────────────────┐
│  GitHub connection                           │
│  ┌──────────────────────────────────────────┐│
│  │        Connecting...         (disabled)   ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ Importing repositories from GitHub...    ││
│  │                              (blue bg)   ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘

STATE 3: Connected with Repositories
┌──────────────────────────────────────────────┐
│  GitHub connection          [username] (pill)│
│  ┌──────────────────────────────────────────┐│
│  │      Reconnect GitHub    (outline btn)    ││
│  └──────────────────────────────────────────┘│
│  Imported 12 repositories.   (green msg)     │
│                                              │
│  Import repository                           │
│  ┌──────────────────────────────────────────┐│
│  │ Search repositories            (search)  ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ ● user/repo-name      [private] (radio) ││
│  │   JavaScript - main                       ││
│  ├──────────────────────────────────────────┤│
│  │ ○ user/other-repo     [public]  (radio) ││
│  │   Python - main                           ││
│  ├──────────────────────────────────────────┤│
│  │ ○ user/another-repo   [public]  (radio) ││
│  │   TypeScript - develop                    ││
│  └──────────────────────────────────────────┘│
│  (max-height: 224px, scrollable)             │
│  ┌──────────────────────────────────────────┐│
│  │  Import selected repo and scan  (primary)││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Repository Item Layout**:
- Radio button (left-aligned, `mt-1`)
- Full name truncated + visibility badge (`private`/`public` in small pill)
- Subtitle: `{language} - {defaultBranch}`
- Selected state: `bg-[#f0f6ff]`, unselected: `bg-white`, hover: `bg-[#f6f8fa]`
- Scrollable container with max-height `max-h-56` (224px)
- Search input filters by `fullName` (case-insensitive)

#### 8.2.3 ZIP Upload Section

Separated by another top border divider.

```
┌──────────────────────────────────────────────┐
│  Upload repository zip                       │
│  ┌──────────────────────────────────────────┐│
│  │  📂 Choose file...                       ││
│  │       (dashed border, accept=".zip")     ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │     Upload and scan          (outline)    ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**File Input Style**: Dashed border `border-dashed border-[#b8c2cc]`, light gray background `bg-[#fafbfc]`

#### 8.2.4 Error Display

Conditionally rendered below the form when `error` state is non-empty:

```
┌──────────────────────────────────────────────┐
│ ⚠ Error message text here                    │
│ (red border, pink bg, red text)              │
└──────────────────────────────────────────────┘
```

Style: `border-[#ffd0d0] bg-[#fff5f5] text-[#b42318]`

---

### 8.3 Left Sidebar — Recent Jobs Panel

Separate card below the scan configuration panel.

```
┌──────────────────────────────────────────────┐
│  Recent jobs                    [Refresh] btn│
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ repo-name/project         [completed] ✅ ││
│  │ GITHUB                                    ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ uploaded-file.zip         [running] 🟡   ││
│  │ ZIP                                       ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ another/repo              [failed] 🔴    ││
│  │ GITHUB                                    ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Job Card Content**:
- `sourceLabel` (truncated, semibold, 14px)
- Status badge (pill with status-specific colors)
- `sourceType` displayed as uppercase tracked text (`GITHUB`, `ZIP`, `LOCAL`)
- Clicking a job sets it as `activeJobId`
- Active job gets blue border + light blue background

**Status Badge Color Map**:
| Status | Style |
|--------|-------|
| `completed` | `bg-[#effaf3] text-[#176b3a]` |
| `failed` | `bg-[#fff5f5] text-[#b42318]` |
| `running` | `bg-[#fff8eb] text-[#8a5200]` |
| `queued` | `bg-[#eef1f5] text-[#44505f]` |

---

### 8.4 Right Panel — Metrics Row

A 4-column grid of metric cards. Each card is a `<Metric>` component.

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Manifests │ │Deps      │ │Exposure  │ │Risk      │
│          │ │          │ │Score     │ │Chains    │
│    3     │ │   127    │ │   78     │ │    5     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Metric Component Props**:
| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Label above the number |
| `value` | number | The numeric value displayed large |
| `tone` | `"idle" \| "passed" \| "failed" \| "running"` | Controls border color |

**Tone-based Borders**:
- `failed`: `border-[#f3b4b4]`
- `passed`: `border-[#b7e4c7]`
- Default (`idle`): `border-[#d8dee4]`

**Specific Metrics Rendered**:
1. **Manifests** — `summary.total_manifests` (tone: idle)
2. **Dependencies** — `summary.total_dependencies` (tone: idle)
3. **Exposure score** — `summary.banking_exposure_score` (tone: derived from `banking_action` — block/expedite = failed, track = passed, else idle)
4. **Risk chains** — `summary.risk_chains` (tone: matches overall `statusTone`)

---

### 8.5 Right Panel — Banking Intelligence Panel

The most complex visualization panel. Provides a decision-support view for banking security teams.

```
┌─────────────────────────────────────────────────────────────────┐
│  Banking intelligence decision                                   │
│  Combines exploitability, business criticality,    ┌───────────┐│
│  provenance deficit, malicious capabilities,       │ Decision  ││
│  and blast radius.                                 │  BLOCK    ││
│                                                    │Score 78   ││
│                                                    └───────────┘│
│  ┌──────────────────┬────────────────────┬──────────────────┐   │
│  │ Why this decision│ Suspicious         │ Registry trust   │   │
│  │                  │ capabilities       │                  │   │
│  │ • Reason 1       │ ┌────────────────┐ │ ┌──────────────┐ │   │
│  │ • Reason 2       │ │ network_access │ │ │ typosquat    │ │   │
│  │ • Reason 3       │ │ file.js:42  🔴 │ │ │ lodash  🟡   │ │   │
│  │ • Reason 4       │ └────────────────┘ │ └──────────────┘ │   │
│  │ • Reason 5       │ ┌────────────────┐ │ ┌──────────────┐ │   │
│  │                  │ │ crypto_use     │ │ │ scope_drift  │ │   │
│  │                  │ │ auth.ts:18  🟠 │ │ │ express  🟢  │ │   │
│  │                  │ └────────────────┘ │ └──────────────┘ │   │
│  └──────────────────┴────────────────────┴──────────────────┘   │
│                                                                  │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐        │
│  │Exploit │Static  │Business│ Trust  │Capabil.│Blast   │        │
│  │  72    │  85    │  90    │  65    │  78    │  88    │        │
│  │ ████▓░ │ █████▓ │ ██████ │ ████░░ │ █████░ │ █████▓ │        │
│  └────────┴────────┴────────┴────────┴────────┴────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

**Sub-sections** (3-column grid on XL, stacks on smaller):

1. **"Why this decision"** — Lists up to 5 reason strings from the top exposure score. Each reason is a white card with shadow inside a gray panel.

2. **"Suspicious capabilities"** — Up to 4 `EvidencePill` components showing capability findings. Each pill shows:
   - Title: the capability name (e.g., `"network_access"`)
   - Detail: file location formatted as `"dir/file.ts:42"`
   - Severity badge

3. **"Registry trust"** — Up to 4 `EvidencePill` components showing namespace risks (typosquatting, scope confusion, registry drift). Each pill shows:
   - Title: the risk category
   - Detail: dependency name or file path
   - Severity badge

**Score Bars** (6-column grid on XL, conditional — only shown when `topExposure` exists):
Each `ScoreBar` component renders:
- Label + numeric value on one line
- A progress bar (`h-2 rounded-full bg-[#e5e7eb]`) with blue fill (`bg-[#1f6feb]`) proportional to value (0–100%)

Six score dimensions:
1. `exploit_likelihood` → "Exploit"
2. `static_exploitability` → "Static path"
3. `business_criticality` → "Business"
4. `trust_deficit` → "Trust"
5. `malicious_capability` → "Capability"
6. `blast_radius` → "Blast radius"

---

### 8.6 Right Panel — Blast Radius Map

Interactive panel showing how a vulnerable dependency connects to sensitive banking code paths.

```
┌─────────────────────────────────────────────────────────────────┐
│  Dependency blast radius map                      [5 chains]    │
│  Connectivity from risky dependency to banking-sensitive         │
│  code paths.                                                     │
│                                                                  │
│  ┌──────────┬──────────────────────────────────────────────────┐│
│  │ CHAIN    │                                                   ││
│  │ SELECTOR │  TRACE VISUALIZATION (5-column flow)              ││
│  │          │                                                   ││
│  │ ┌──────┐ │  ┌────────┐   ┌────────┐   ┌────────┐   ...     ││
│  │ │lodash│ │  │1.Route │→  │2.Decl  │→  │3.Risk  │→  ...     ││
│  │ │npm 🔴│ │  │entry   │   │ared    │   │        │           ││
│  │ ├──────┤ │  └────────┘   └────────┘   └────────┘           ││
│  │ │axios │ │                                                   ││
│  │ │npm 🟡│ │  ┌──────────────────────────────────────────────┐││
│  │ ├──────┤ │  │ Sequence Trace Table                         │││
│  │ │jsonwt│ │  │ Step 1 │ Label │ kind │ file │ code │ details│││
│  │ │npm 🟠│ │  │ Step 2 │ ...                                 │││
│  │ └──────┘ │  │ Step 3 │ ...                                 │││
│  │          │  └──────────────────────────────────────────────┘││
│  │(scroll)  │                                                   ││
│  │max-360px │  ┌──────────────────────────────────────────────┐││
│  │          │  │ Fix Panel: Title + Description + Command     │││
│  │          │  │                         [Auto fix / Manual]  │││
│  │          │  └──────────────────────────────────────────────┘││
│  └──────────┴──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Empty State** (when no chains):
- Dashed border container with centered text
- "No blast-radius chains yet."
- Subtitle explaining when chains appear

#### Chain Selector (Left column, 250px on XL)
- Scrollable list (`max-h-[360px]`) of chain cards
- Each card shows: dependency name, ecosystem, severity badge, sensitive contexts
- Selected chain has blue border + shadow

#### Trace Visualization (5-step flow)

A 5-column horizontal flow connected by `→` arrows (hidden on smaller screens):

| Step | Title | Accent Color | Data Source |
|------|-------|-------------|-------------|
| 1 | "Route entry" | Blue | Steps with `kind === "route"` |
| 2 | "Declared" | Blue | Step with `kind === "manifest"` |
| 3 | "Risk" | Amber | Steps with `kind === "risk"` |
| 4 | "Imported" | Green | Steps with `kind === "import"` |
| 5 | "Sensitive use" | Red | Steps with `kind === "sensitive-use"` |

Each **TraceColumn** renders:
- Uppercase label with step number
- Up to 3 step cards inside, each showing:
  - `step.label` (semibold title)
  - `step.file_path` formatted as short location
  - `step.code` in a dark code block (if available)
- Empty state text if no steps of that kind exist
- Background color: accent-specific soft tint
- Border color: accent-specific border
- Min height: `190px`

**FlowArrow** component: Shows `→` text between columns, only visible on XL screens.

#### Sequence Trace Table
A vertical list of all trace steps (all kinds) in order:

Each **TraceRow** renders:
- Step number badge (`"Step {n}"`)
- Label (bold) + kind badge (gray pill)
- File path (if available)
- Code block (if available, dark theme)
- Details tags (up to 6, gray pills)

#### Fix Panel
- Title and description of the recommended fix
- Badge: `"Auto fix ready"` or `"Manual review"`
- Command block: dark code element with the fix command (if available)

---

### 8.7 Right Panel — Live Execution Log

Real-time terminal-style log viewer.

```
┌─────────────────────────────────────────────────────────────────┐
│  Live execution log                                              │
│  user/repo-name               [127 events] [running]            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ (dark terminal: bg-[#0f172a], h-[560px], scrollable)       ││
│  │                                                             ││
│  │  │ 14:32:01  INFO   Cloning repository...                  ││
│  │  │ 14:32:03  SUCCESS Repository cloned                     ││
│  │  │ 14:32:04  INFO   Parsing manifests...                   ││
│  │  │ 14:32:05  INFO   Found package.json                     ││
│  │  │ 14:32:06  WARNING lodash@4.17.20 has known CVEs         ││
│  │  │ 14:32:07  ERROR  Critical: prototype pollution in...    ││
│  │  │                                                         ││
│  │  (empty: "Waiting for scan logs...")                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Log Entry Layout**:
- Left border indicator: `border-l border-[#334155]` with `pl-3`
- Timestamp: `text-[#7dd3fc]`
- Level: Color-coded by level (see Log Console Colors above)
- Message: `text-[#f8fafc]`
- Margin between entries: `mb-4`

**Behavior**:
- Logs streamed via SSE from `GET /api/scans/{jobId}/logs`
- Buffer limited to last 300 entries (`.slice(-300)`)
- Each SSE message triggers a job refresh
- Fixed height: `h-[560px]` with `overflow-auto`

---

### 8.8 Right Panel — Findings & Fixes Table

Comprehensive table showing all discovered findings merged from multiple data sources.

```
┌─────────────────────────────────────────────────────────────────┐
│  Findings and fixes                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ PACKAGE        │ SEVERITY  │ ISSUE           │ FIX          ││
│  ├────────────────┼───────────┼─────────────────┼──────────────┤│
│  │ lodash         │ [critical]│ Prototype       │ Upgrade to   ││
│  │ CVE - npm 4.17 │           │ pollution in... │ npm i lodash ││
│  ├────────────────┼───────────┼─────────────────┼──────────────┤│
│  │ jsonwebtoken   │ [high]    │ JWT signing...  │ Upgrade jwt  ││
│  │ Risk - auth    │           │                 │ npm i jsonweb││
│  ├────────────────┼───────────┼─────────────────┼──────────────┤│
│  │ network_access │ [medium]  │ Suspicious...   │ Review and   ││
│  │ Capability ... │           │                 │ restrict...  ││
│  └─────────────────────────────────────────────────────────────┘│
│  (min-width: 760px, horizontally scrollable)                     │
└─────────────────────────────────────────────────────────────────┘
```

**Table Columns**:

| Column | Content | Width |
|--------|---------|-------|
| Package | `subject` (bold) + `type - detail` (small muted text) | Auto |
| Severity | Severity badge with color-coded pill | Auto |
| Issue | Issue description text | `max-w-sm` |
| Fix | `fixTitle` (medium weight) + `fixDetail` (small muted) | Auto |

**Data Sources Merged Into Table** (in this order):

| Source | Type Label | Subject | Detail |
|--------|-----------|---------|--------|
| `findings[]` | "CVE" | `package_name` | `"{ecosystem} {installed_version}"` |
| `dependency_risks[]` | "Risk" | `dependency_name \|\| category` | `category` |
| `capability_findings[]` | "Capability" | `capability` | formatted file location |
| `namespace_risks[]` | "Registry" | `dependency_name \|\| category` | `file_path` |
| `risk_chains[]` | "Blast radius" | `dependency_name` | `"{ecosystem} - {contexts.join(', ')}"` |

**Empty State**: Centered text `"No findings to show yet."` spanning all 4 columns.

---

## 9. Module 2 — Config Scanner (FUTURE)

### 9.1 Overview

The Config Scanner module will analyze configuration files for security issues. It shares the same scan input mechanism (GitHub / ZIP) but produces different result types.

### 9.2 Config Scanner — Target File Types

| Category | Files Scanned |
|----------|--------------|
| Environment | `.env`, `.env.local`, `.env.production`, `.env.*` |
| Docker | `Dockerfile`, `docker-compose.yml`, `docker-compose.*.yml` |
| Kubernetes | `*.yaml` / `*.yml` in `k8s/`, `kubernetes/`, `manifests/` directories |
| Terraform | `*.tf`, `*.tfvars`, `terraform.tfstate` |
| CI/CD | `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml` |
| Cloud | `serverless.yml`, `cloudformation.yml`, AWS config files |
| Application | `nginx.conf`, `apache.conf`, `redis.conf`, database config files |
| Security | `cors.json`, CSP headers, authentication config |

### 9.3 Config Scanner — Data Types

```typescript
type ConfigScanResult = {
  summary: {
    total_files_scanned: number;
    total_findings: number;
    secrets_detected: number;
    misconfigurations: number;
    compliance_violations: number;
    risk_score: number;
    ci_status: "passed" | "failed";
    findings_by_severity: Record<string, number>;
    findings_by_category: Record<string, number>;
  };
  findings: Array<{
    id: string;
    file_path: string;
    line_number?: number;
    category: "secret" | "misconfiguration" | "compliance" | "hardcoded-credential" | "insecure-default";
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    evidence: string;           // The problematic line/value (redacted for secrets)
    compliance_framework?: string;  // e.g., "CIS", "PCI-DSS", "SOC2", "HIPAA"
    fix: {
      title: string;
      description: string;
      suggested_value?: string;
      auto_remediable: boolean;
    };
  }>;
};
```

### 9.4 Config Scanner — UI Components

#### Metrics Row (4 cards)
1. **Files Scanned** — `summary.total_files_scanned`
2. **Findings** — `summary.total_findings`
3. **Secrets Detected** — `summary.secrets_detected` (tone: `failed` if > 0)
4. **Compliance Violations** — `summary.compliance_violations`

#### Secret Detection Panel
- Lists detected secrets with redacted evidence
- Shows file path, line number, and secret type
- Severity: always `critical` or `high`
- Fix: Replace with environment variable reference, use secret manager

#### Compliance Matrix
- Grid/table showing compliance framework mapping
- Columns: Framework (CIS, PCI-DSS, SOC2), Control ID, Status (pass/fail), Finding
- Filter by framework
- Color-coded pass/fail indicators

#### Config Findings Table
Same table structure as Dependency Scanner findings:

| Column | Content |
|--------|---------|
| File | File path + line number |
| Severity | Color-coded badge |
| Category | Type pill (secret, misconfiguration, compliance, etc.) |
| Issue | Title + description |
| Fix | Suggested fix + auto-remediable flag |

---

## 10. Module 3 — Static Code Analyzer (FUTURE)

### 10.1 Overview

The Static Code Analyzer performs AST-based source code analysis to detect security vulnerabilities, code quality issues, and OWASP Top 10 violations.

### 10.2 Static Analyzer — Vulnerability Categories

| Category | Description | Examples |
|----------|-------------|---------|
| Injection | SQL, NoSQL, command, LDAP injection | `sql.query("SELECT * FROM users WHERE id=" + userId)` |
| XSS | Cross-site scripting | `innerHTML = userInput` |
| Auth Issues | Broken authentication | Hardcoded JWT secrets, weak password requirements |
| Sensitive Data | Sensitive data exposure | Logging PII, unencrypted storage |
| Crypto | Insecure cryptography | MD5/SHA1 for passwords, weak key sizes |
| Deserialization | Insecure deserialization | `eval()`, `pickle.loads()`, `JSON.parse()` on untrusted input |
| Access Control | Broken access control | Missing auth checks on routes |
| SSRF | Server-side request forgery | Unvalidated URL parameters in requests |
| Path Traversal | Directory traversal | `fs.readFile(userPath)` |
| Race Conditions | TOCTOU and similar | File operations without locks |

### 10.3 Static Analyzer — Data Types

```typescript
type StaticAnalysisResult = {
  summary: {
    total_files_analyzed: number;
    total_lines_of_code: number;
    total_findings: number;
    owasp_score: number;          // 0-100 security score
    code_quality_score: number;   // 0-100 quality score
    ci_status: "passed" | "failed";
    findings_by_severity: Record<string, number>;
    findings_by_category: Record<string, number>;
    languages_analyzed: string[];
  };
  findings: Array<{
    id: string;
    file_path: string;
    line_number: number;
    end_line_number?: number;
    column?: number;
    category: string;             // OWASP category or custom
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    code_snippet: string;         // The vulnerable code
    owasp_id?: string;            // e.g., "A01:2021"
    cwe_id?: string;              // e.g., "CWE-89"
    data_flow?: Array<{           // Taint analysis flow
      step: number;
      file_path: string;
      line_number: number;
      code: string;
      label: string;              // "source", "propagation", "sink"
    }>;
    fix: {
      title: string;
      description: string;
      safe_code?: string;         // Corrected code example
      auto_remediable: boolean;
    };
  }>;
};
```

### 10.4 Static Analyzer — UI Components

#### Metrics Row (4 cards)
1. **Files Analyzed** — `summary.total_files_analyzed`
2. **Lines of Code** — `summary.total_lines_of_code`
3. **OWASP Score** — `summary.owasp_score` (tone: score-based)
4. **Code Quality** — `summary.code_quality_score`

#### OWASP Scorecard Panel
- Visual scorecard for OWASP Top 10 categories
- Each category shows: name, finding count, pass/fail status
- Color-coded severity distribution bar per category
- Overall OWASP compliance percentage

#### Vulnerability Flow Diagram
- Similar to blast radius map but for data flow / taint analysis
- Shows: Source → Propagation → Sink
- Clicking a finding shows the full data flow with code snippets
- Each step shows file, line, and code context

#### Code Findings Table
Same table structure as other modules with additional columns:

| Column | Content |
|--------|---------|
| File | File path + line number + language badge |
| Severity | Color-coded badge |
| Category | OWASP ID + CWE ID |
| Issue | Title + code snippet (syntax highlighted) |
| Fix | Safe code example + auto-remediable flag |

---

## 11. Shared Components Library

These components are used across all three scanner modules.

### 11.1 Metric Card

```
Props: { label: string; value: number; tone?: "idle" | "passed" | "failed" | "running" }

┌──────────────────┐
│ {label}           │  ← text-sm font-medium text-[#667085]
│                   │
│ {value}           │  ← text-3xl font-semibold text-[#111827]
└──────────────────┘
Border changes with tone: failed=#f3b4b4, passed=#b7e4c7, default=#d8dee4
```

### 11.2 Severity Badge

```
Props: { severity: string }

Renders: <span className={severityClass(severity)}>{severity}</span>

Mapping:
  critical → bg-[#7f1d1d] text-white
  high     → bg-[#fee2e2] text-[#991b1b]
  medium   → bg-[#fef3c7] text-[#92400e]
  low      → bg-[#dcfce7] text-[#166534]
  default  → bg-[#e5e7eb] text-[#374151]
```

### 11.3 Status Badge

```
Props: { status: JobStatus }

Mapping:
  completed → bg-[#effaf3] text-[#176b3a]
  failed    → bg-[#fff5f5] text-[#b42318]
  running   → bg-[#fff8eb] text-[#8a5200]
  queued    → bg-[#eef1f5] text-[#44505f]
```

### 11.4 Evidence Pill

```
Props: { title: string; detail: string; severity: string }

┌──────────────────────────────┐
│ {title}          [severity]  │  ← title: text-sm font-semibold
│ {detail}                     │  ← detail: text-xs text-[#667085]
└──────────────────────────────┘
White card with shadow-sm inside gray container
```

### 11.5 Score Bar

```
Props: { label: string; value: number }

┌──────────────────────────────┐
│ {label}              {value} │
│ ████████████░░░░░░░░░░░░░░░ │  ← h-2 rounded-full
└──────────────────────────────┘
Track: bg-[#e5e7eb], Fill: bg-[#1f6feb], width = value%
```

### 11.6 Flow Arrow

```
Renders: "→" text, only visible on xl: screens
className: "hidden xl:flex items-center justify-center text-xl font-semibold text-[#94a3b8]"
```

### 11.7 Empty State

```
Props: { title: string; subtitle?: string }

┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│       {title}                 │  ← font-medium text-[#44505f]
│       {subtitle}              │  ← text-sm text-[#667085]
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
Dashed border, centered text, gray background
```

### 11.8 Scan Config Panel (Shared across all modules)

The scan input section (GitHub connect + ZIP upload + scan options) is identical for all three modules. Only the scan endpoint and the result types differ.

| Module | GitHub Scan Endpoint | ZIP Scan Endpoint |
|--------|---------------------|-------------------|
| Dependency Scanner | `POST /api/scans/github` | `POST /api/scans/zip` |
| Config Scanner | `POST /api/config-scans/github` | `POST /api/config-scans/zip` |
| Static Analyzer | `POST /api/code-scans/github` | `POST /api/code-scans/zip` |

---

## 12. Complete Data Models & TypeScript Types

### 12.1 Common Types

```typescript
// Job statuses used across all modules
type JobStatus = "queued" | "running" | "completed" | "failed";

// Generic scan job (same shape for all modules)
type ScanJob = {
  id: string;
  sourceType: "github" | "zip" | "local";
  sourceLabel: string;
  status: JobStatus;
  error?: string | null;
  createdAt: string;         // ISO 8601 datetime
  updatedAt: string;         // ISO 8601 datetime
  result?: ScanResult | null; // Module-specific result type
};

// Real-time log entry (SSE stream)
type LogEntry = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;         // ISO 8601 datetime
  meta?: Record<string, unknown>;
};

// GitHub authenticated user
type GithubUser = {
  login: string;
  name?: string | null;
  avatarUrl?: string;
  profileUrl?: string;
};

// GitHub repository from import
type GithubRepository = {
  id: number;
  name: string;
  fullName: string;           // "owner/repo"
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  cloneUrl: string;
  htmlUrl: string;
  language?: string | null;
  description?: string | null;
};
```

### 12.2 Dependency Scanner Types

```typescript
type ScanResult = {
  summary: {
    total_manifests: number;
    total_dependencies: number;
    vulnerable_dependencies: number;
    dependency_risk_findings?: number;
    risk_chains?: number;
    capability_findings?: number;
    namespace_risks?: number;
    banking_exposure_score?: number;
    banking_action?: "block" | "expedite" | "watch" | "track";
    risk_score: number;
    ci_status: "passed" | "failed";
    findings_by_severity: Record<string, number>;
  };

  // CVE-based vulnerability findings
  findings: Array<{
    id: string;
    package_name: string;
    installed_version?: string;
    ecosystem: string;          // "npm", "pypi", "maven", etc.
    severity: string;
    summary: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;

  // Non-CVE dependency hygiene risks
  dependency_risks?: Array<{
    id: string;
    dependency_name?: string | null;
    manifest_path: string;
    severity: string;
    category: string;           // "unmaintained", "deprecated", "license-risk", etc.
    title: string;
    description: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;

  // Dangerous capability fingerprints (network, crypto, filesystem, etc.)
  capability_findings?: Array<{
    id: string;
    capability: string;         // "network_access", "filesystem_write", "crypto_use", etc.
    severity: string;
    title: string;
    description: string;
    file_path: string;
    line_number?: number | null;
    code?: string | null;
    dependency_name?: string | null;
    banking_impact: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;

  // Namespace confusion / registry trust issues
  namespace_risks?: Array<{
    id: string;
    severity: string;
    category: string;           // "typosquat", "namespace_confusion", "scope_drift"
    title: string;
    description: string;
    file_path: string;
    dependency_name?: string | null;
    evidence: string[];
    banking_impact: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;

  // Full dependency blast radius / risk chains
  risk_chains?: Array<{
    id: string;
    dependency_name: string;
    ecosystem: string;
    severity: string;
    title: string;
    risk_chain: string[];       // ["CVE found", "Used in auth route", "Handles PII"]
    trace?: Array<{
      step: number;
      kind: "route" | "manifest" | "import" | "sensitive-use" | "risk" | "fix";
      label: string;
      file_path?: string | null;
      line_number?: number | null;
      code?: string | null;
      details: string[];
    }>;
    manifest_path?: string | null;
    sensitive_contexts: string[]; // ["authentication", "payment", "pii"]
    used_in_files: string[];
    evidence: string[];
    exposure?: ExposureScore | null;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
};

// Banking exposure scoring dimensions
type ExposureScore = {
  score: number;               // 0-100 composite score
  action: "block" | "expedite" | "watch" | "track";
  exploit_likelihood: number;  // 0-100
  static_exploitability: number;
  business_criticality: number;
  trust_deficit: number;
  malicious_capability: number;
  blast_radius: number;
  reasons: string[];           // Human-readable explanation lines
};
```

---

## 13. API Contract — All Endpoints

### 13.1 Health Check

```
GET /api/health

Response 200:
{
  "dependencyScanner": {
    "status": "ok" | "error",
    ...
  },
  "configScanner": { ... },       // Future
  "staticAnalyzer": { ... }       // Future
}
```

### 13.2 GitHub OAuth

```
GET /api/github/oauth/start
→ Redirects browser to GitHub OAuth consent page
→ After auth, redirects back to frontend with ?githubSession=<id>

POST /api/github/session
Body: { "githubSession": "<session-id>" }
Response 200:
{
  "connected": true,
  "user": {
    "login": "username",
    "name": "Full Name",
    "avatarUrl": "https://...",
    "profileUrl": "https://..."
  }
}

POST /api/github/repositories
Body: { "githubSession": "<session-id>" }
Response 200:
{
  "repositories": [
    {
      "id": 12345,
      "name": "repo-name",
      "fullName": "owner/repo-name",
      "private": false,
      "defaultBranch": "main",
      "updatedAt": "2025-01-01T00:00:00Z",
      "cloneUrl": "https://github.com/owner/repo.git",
      "htmlUrl": "https://github.com/owner/repo",
      "language": "JavaScript",
      "description": "My project"
    }
  ]
}
```

### 13.3 Dependency Scanner — Scan Operations

```
POST /api/scans/github
Body: {
  "repoCloneUrl": "https://github.com/owner/repo.git",
  "repoFullName": "owner/repo",
  "githubSession": "<session-id>",
  "email": "security@bank.com",
  "includeDev": true,
  "useOsv": true,
  "failOn": "high"
}
Response 201: { "id": "<job-id>", ... }

POST /api/scans/zip
Body: FormData {
  repoZip: File,
  email: string,
  includeDev: string ("true"/"false"),
  useOsv: string ("true"/"false"),
  failOn: string
}
Response 201: { "id": "<job-id>", ... }

GET /api/scans
Response 200: ScanJob[]

GET /api/scans/{jobId}
Response 200: ScanJob (with full result when completed)

GET /api/scans/{jobId}/logs  (SSE stream)
→ Server-Sent Events
→ Each event: data: LogEntry (JSON)
```

### 13.4 Config Scanner — Scan Operations (FUTURE)

```
POST /api/config-scans/github
POST /api/config-scans/zip
GET  /api/config-scans
GET  /api/config-scans/{jobId}
GET  /api/config-scans/{jobId}/logs  (SSE)
```

### 13.5 Static Analyzer — Scan Operations (FUTURE)

```
POST /api/code-scans/github
POST /api/code-scans/zip
GET  /api/code-scans
GET  /api/code-scans/{jobId}
GET  /api/code-scans/{jobId}/logs  (SSE)
```

---

## 14. Real-Time Communication (SSE)

### How SSE Works in This App

1. When a job becomes active (`activeJobId` is set), the frontend creates an `EventSource`:
   ```
   new EventSource(`${API_BASE}/api/scans/${activeJobId}/logs`)
   ```

2. Each incoming SSE message is parsed as a `LogEntry` JSON object.

3. Logs are appended to state, capped at 300 entries: `.slice(-300)`

4. Each SSE event also triggers a full job refresh (`refreshJob`) to get updated status and results.

5. On SSE error, the connection is closed (no auto-reconnect in current implementation).

6. On component cleanup / job change, the EventSource is closed.

### SSE Event Format

```
event: message
data: {"id":"log-123","level":"info","message":"Parsing package.json...","timestamp":"2025-01-01T12:00:00Z"}

event: message
data: {"id":"log-124","level":"success","message":"Found 45 dependencies","timestamp":"2025-01-01T12:00:01Z"}
```

---

## 15. State Management Architecture

### Current State (React useState)

All state lives in the `Home` component via `useState` hooks. There is no global state manager.

| State Variable | Type | Purpose |
|---------------|------|---------|
| `githubSession` | `string` | GitHub OAuth session token |
| `githubUser` | `GithubUser \| null` | Authenticated GitHub user info |
| `repositories` | `GithubRepository[]` | Imported GitHub repositories |
| `selectedRepo` | `string` | Currently selected repo fullName |
| `repoSearch` | `string` | Repository search filter text |
| `email` | `string` | Report email input |
| `zipFile` | `File \| null` | Selected ZIP file for upload |
| `includeDev` | `boolean` | Include dev dependencies toggle |
| `useOsv` | `boolean` | Use OSV database toggle |
| `failOn` | `string` | Fail severity threshold |
| `jobs` | `ScanJob[]` | List of all scan jobs |
| `activeJobId` | `string \| null` | Currently selected/viewed job ID |
| `activeJob` | `ScanJob \| null` | Full data of the active job |
| `logs` | `LogEntry[]` | SSE log entries for active job |
| `health` | `string` | Backend health status text |
| `isSubmitting` | `boolean` | Form submission loading state |
| `isGithubLoading` | `boolean` | GitHub connection loading state |
| `githubMessage` | `string` | GitHub operation status message |
| `error` | `string` | Current error message |
| `selectedChainId` | `string` | Selected risk chain in blast radius map |

### Derived State (computed from above)

| Derived | Source | Computation |
|---------|--------|-------------|
| `activeSummary` | `activeJob` | `activeJob?.result?.summary` |
| `findings` | `activeJob` | `activeJob?.result?.findings \|\| []` |
| `dependencyRisks` | `activeJob` | `activeJob?.result?.dependency_risks \|\| []` |
| `capabilityFindings` | `activeJob` | `activeJob?.result?.capability_findings \|\| []` |
| `namespaceRisks` | `activeJob` | `activeJob?.result?.namespace_risks \|\| []` |
| `riskChains` | `activeJob` | `activeJob?.result?.risk_chains \|\| []` |
| `tableFindings` | All findings | Merged and flattened array from all finding types |
| `filteredRepositories` | `repositories` + `repoSearch` | Case-insensitive fullName filter |
| `selectedRepository` | `repositories` + `selectedRepo` | `.find()` matching fullName |
| `statusTone` | `activeJob` | Computed: passed/failed/running/idle |

### GitHub Session Persistence

- Session token stored in `localStorage` as `"githubSession"`
- On page load, checks URL params for `githubSession` (from OAuth redirect) and `githubError`
- Falls back to `localStorage` if no URL param
- Cleans OAuth-related URL params from browser history
- On session restore failure, clears localStorage and resets GitHub state

---

## 16. User Flows — Step by Step

### Flow 1: GitHub Scan

```
1. User clicks "Connect GitHub" button
2. → Browser redirects to GET /api/github/oauth/start
3. → GitHub OAuth consent page shown
4. → After auth, redirect back to frontend with ?githubSession=<id>
5. Frontend detects githubSession in URL params
6. → POST /api/github/session to validate session
7. → POST /api/github/repositories to import repos
8. Repositories list renders with radio selection
9. User selects a repository
10. User optionally adjusts: includeDev, useOsv, failOn, email
11. User clicks "Import selected repo and scan"
12. → POST /api/scans/github with config
13. Response returns { id: "<job-id>" }
14. activeJobId set → triggers SSE connection
15. → EventSource opens to GET /api/scans/{jobId}/logs
16. Log entries stream into the terminal
17. Each SSE event also refreshes job status
18. When job status = "completed", results render:
    - Metrics row updates
    - Banking Intelligence Panel populates
    - Blast Radius Map populates
    - Findings table fills with data
19. User can click risk chains to explore blast radius traces
```

### Flow 2: ZIP Upload Scan

```
1. User clicks file input, selects a .zip file
2. User optionally adjusts scan options
3. User clicks "Upload and scan"
4. → POST /api/scans/zip with FormData (file + options)
5. Response returns { id: "<job-id>" }
6. Same as GitHub flow steps 14-19
```

### Flow 3: View Previous Scan

```
1. "Recent jobs" panel shows job history (from GET /api/scans)
2. User clicks a job card
3. activeJobId changes → triggers job refresh + SSE connection
4. All panels update with that job's data
```

### Flow 4: Explore Blast Radius (within a completed scan)

```
1. Blast Radius Map shows list of risk chains (left selector)
2. User clicks a chain card
3. selectedChainId updates
4. Trace visualization renders 5-step flow:
   Route Entry → Declared → Risk → Imported → Sensitive Use
5. Sequence trace table shows detailed step-by-step
6. Fix panel shows remediation advice + command
```

---

## 17. Responsive Design Specifications

### Breakpoints (Tailwind defaults)

| Breakpoint | Min Width | Layout Changes |
|------------|-----------|----------------|
| Default (mobile) | 0px | Single column, full width |
| `sm` | 640px | Scan options become 3-column grid |
| `md` | 768px | Metrics become 4-column, trace layout changes |
| `lg` | 1024px | Main layout becomes 2-column (420px + 1fr) |
| `xl` | 1280px | Blast radius trace becomes 5-column flow, banking panel becomes 3-column |

### Specific Responsive Behaviors

| Component | Mobile | Desktop (lg+) |
|-----------|--------|---------------|
| Header | Stacked: title above health badge | Flex row: title left, badge right |
| Main layout | Single column, sidebar stacks above content | 2-column: 420px sidebar + 1fr content |
| Scan options | Single column | 3-column grid |
| Metrics row | 1 column (stacks) | 4-column grid |
| Banking panel | Stacked panels | 3-column grid (xl) |
| Score bars | Stacked | 6-column grid (xl) |
| Blast radius | Stacked | 250px selector + 1fr trace (xl) |
| Trace flow | Stacked columns, arrows hidden | 5-column with arrows (xl) |
| Log panel | Full width | Full width |
| Findings table | Horizontal scroll (min-w-[760px]) | Full width table |

---

## 18. Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| Language | `<html lang="en">` set |
| Text rendering | `antialiased` class on html |
| Form labels | `<label>` elements with `htmlFor` or wrapping inputs |
| Radio groups | `name="githubRepo"` for radio button group |
| Disabled states | `disabled` attribute + `cursor-not-allowed opacity-60` |
| Color contrast | Severity badges use high-contrast color pairs |
| Keyboard nav | Native form elements used (buttons, inputs, selects) |
| Screen reader | Semantic HTML with headings hierarchy (h1, h2) |

---

## 19. Error Handling & Edge States

### Error Display

All errors are shown in a styled alert box below the scan form:
```
Border: #ffd0d0
Background: #fff5f5
Text: #b42318
```

### Error Scenarios

| Scenario | Handling |
|----------|---------|
| Backend offline | Health badge shows "backend offline" in amber |
| Scanner offline | Health badge shows "scanner offline" in amber |
| GitHub OAuth fails | URL param `githubError` displayed, session cleared |
| Session restore fails | localStorage cleared, GitHub state reset, error shown |
| Repo import fails | Error message shown, loading state cleared |
| Scan submission fails | Error message shown, isSubmitting reset |
| Job refresh fails | Error message shown, activeJob status set to "failed" with "Scan job interrupted" |
| SSE connection error | EventSource closed silently (no auto-reconnect) |
| No findings | Empty state: "No findings to show yet." centered in table |
| No blast radius chains | Dashed border empty state with explanation text |
| No capabilities/namespace risks | Inline text: "No [type] found." |
| No repositories match search | "No repositories match this search." |
| No scan jobs | "No scan jobs yet." |

---

## 20. Performance Considerations

| Area | Implementation |
|------|---------------|
| Log buffering | Capped at 300 entries via `.slice(-300)` |
| Memoization | `statusTone` computed with `useMemo` |
| Callbacks | `checkHealth`, `loadRepositories`, `refreshJobs`, `refreshJob` wrapped in `useCallback` |
| SSE lifecycle | EventSource properly closed on cleanup and job change |
| Image optimization | SVG assets used (small file size) |
| Table rendering | Flat array merging (no nested re-renders) |
| Repository filtering | Client-side filter (no API call per keystroke) |
| Job polling | Event-driven (SSE) rather than polling interval |
| Initial load | Single `useEffect` for health check + job list on mount |

---

## Appendix A: Utility Functions Reference

| Function | Signature | Description |
|----------|-----------|-------------|
| `statusClass` | `(status: JobStatus) → string` | Returns Tailwind classes for job status badges |
| `severityClass` | `(severity: string) → string` | Returns Tailwind classes for severity badges |
| `actionClass` | `(action: string) → string` | Returns Tailwind classes for banking action badges |
| `exposureTone` | `(action?: string) → string` | Maps banking action to metric card tone |
| `formatLocation` | `(step) → string` | Formats `file_path:line_number` as short path |
| `shortFileName` | `(path: string) → string` | Returns last 2 path segments (e.g., `"dir/file.ts"`) |
| `fallbackTrace` | `(chain: RiskChain \| null) → Trace[]` | Generates synthetic trace when backend provides none |

---

## Appendix B: Future Dashboard Overview Page

When all three modules are active, the landing page (`/`) should show an aggregated overview:

```
┌─────────────────────────────────────────────────────────────────┐
│  BugBusters Security Platform                                    │
│  Comprehensive security scanning for your codebase               │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Total     │ │Open      │ │Critical  │ │Overall   │           │
│  │Scans     │ │Findings  │ │Issues    │ │Score     │           │
│  │   42     │ │   156    │ │    12    │ │  B+ (78) │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Module Health                                                ││
│  │ ┌──────────────┬──────────────┬──────────────┐              ││
│  │ │ Dependency   │ Config       │ Static Code  │              ││
│  │ │ Scanner  ✅  │ Scanner  ✅  │ Analyzer  ✅ │              ││
│  │ │ 89 findings  │ 34 findings  │ 33 findings  │              ││
│  │ │ Last: 2h ago │ Last: 1h ago │ Last: 3h ago │              ││
│  │ └──────────────┴──────────────┴──────────────┘              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Recent Activity / Recent Jobs (across all modules)          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────┬──────────────────────────────────────┐│
│  │ Severity Distribution│ Findings Trend (line chart over time)││
│  │ (donut/bar chart)    │                                      ││
│  └──────────────────────┴──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

*This document is designed to serve as a complete UI generation prompt. Every visual element, data shape, color value, spacing token, state transition, and component hierarchy has been explicitly documented to enable accurate, high-fidelity UI generation via Google Stitch or similar tools.*
