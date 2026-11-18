# ShramikSetu (ଶ୍ରମିକ ସେତୁ) – Enterprise Module-Wise Management System

Professional, sidebar-based, module-wise administrative dashboard for managing **Odisha Building & Other Construction Workers' Welfare (OB&OCWW) Board** beneficiary records and field operations.

Official govt portal reference: [https://nirmanshramik.odisha.gov.in/website/welcome](https://nirmanshramik.odisha.gov.in/website/welcome)

---

## 🏛️ Application Architecture & Navigation Structure

```
ShramikSetu
├── 📊 Dashboard (/dashboard)
│   ├── KPI Metric Cards (Active, Pending, In Progress, Queries, Approved, Bank Reject, Completed)
│   ├── Application Category Statistics (New Card, Renewal, Contribution, Marriage, Maternity, Death, Education)
│   ├── Block-Wise & District-Wise Workload Analysis
│   ├── Recent Applications Feed
│   └── Date-Wise Application Timeline
│
├── 📂 Application Management (Expandable Submenu)
│   ├── 1. New Shramik Card (/applications/new-card)
│   ├── 2. Card Renewal (/applications/card-renewal)
│   ├── 3. Annual Contribution (/applications/annual-contribution)
│   ├── 4. Marriage Benefit (/applications/marriage-benefit)
│   ├── 5. Maternity Benefit (/applications/maternity-benefit)
│   ├── 6. Death Benefit (/applications/death-benefit)
│   └── 7. Education Assistance (/applications/education-assistance)
│
├── 🗄️ Data Management & Governance (Expandable Submenu)
│   ├── District Management (/data/districts) - Add, view & edit districts + block jurisdictions
│   ├── Block Management (/data/blocks) - Track block loads + 1-Click Excel downloads per block
│   ├── Worker Registry (/data/applicants) - Beneficiary dossier, submission history & duplicate detection
│   ├── Field Agent Management (/data/agents) - Operator workload, success rates & assignments
│   ├── Queries Management (/data/queries) - Track & resolve departmental objections / missing docs
│   └── Bank Rejections (/data/bank-rejections) - DBT failures, IFSC mismatches & RTGS correction
│
└── ⚙️ System & Archive
    ├── Completed Applications Archive (/archive) - Historical log of finished records with restore option
    └── Google Sheet Sync - Live 2-way sync with Google Apps Script REST Web App
```

---

## 🚀 Getting Started

### 1. Run Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` (or the port specified in terminal).

### 2. Build for Production
```bash
npm run build
```

---

## 🛠️ Technology Stack
- **Frontend**: React 18 with Vite, React Router DOM (v7)
- **UI & Styling**: Tailwind CSS, Lucide React icons
- **Spreadsheet Engine**: SheetJS (XLSX) for Excel (.xlsx) & CSV export/import
- **Backend**: Google Apps Script (`google-apps-script/Code.gs`)
- **Database**: Dual mode — Google Sheets API or offline-ready LocalStorage v2
