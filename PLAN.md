
# SmartBiz Coach - Project Plan

## Phase 1: Frontend Prototype & AI Integration (Completed)
We are starting with a "Mobile-First" React Frontend powered by Google Gemini for the AI features. This allows immediate value delivery (Brand Building, Content Gen) before the full Django backend is coupled.

- [x] **Project Initialization**
    - [x] Setup React + TypeScript structure.
    - [x] Configure Tailwind CSS for styling (Mobile-first design).
    - [x] Define TypeScript interfaces for Brand Data and Business Logic.

- [x] **Core Feature: AI Brand Builder**
    - [x] Create Input Form (Business Name, Niche, Vibe).
    - [x] Implement Gemini Service (`gemini-2.5-flash`) to generate JSON brand identity.
    - [x] Brand Card Component: Display Color Palette, Fonts, Taglines, and Bio.
    - [x] "Share to WhatsApp" simulation (rendering the card).

- [x] **Core Feature: Content Generator**
    - [x] Input form for "Post Topic" and "Platform".
    - [x] Gemini integration for generating captions/ad copy.

- [x] **Core Feature: User Dashboard**
    - [x] Implement "Grant Readiness Score" visualization (d3/recharts).
    - [x] Create "Action Cards" UI.

- [x] **Core Feature: Compliance Assistant**
    - [x] Create Registration Checklist (CAC, TIN, Bank).
    - [x] Implement "AI Name Availability Check" using Gemini.

## Phase 2: Monetization & Persistence (Completed)
- [x] **Implement Auth UI**
    - [x] Create Login/Register Screens.
    - [x] Manage User State in Frontend.
- [x] **Add "BizCredits" wallet UI**
    - [x] Create Settings/Profile Page.
    - [x] Implement Credit Top-up visual logic.
- [x] **Frontend State Persistence**
    - [x] Persist User Session via LocalStorage.
    - [x] Persist Brand Identity via LocalStorage.
    - [x] Implement Content History feature.

## Phase 3: Advanced Features & Polish (Completed)
Before full backend integration, we are expanding the AI capabilities to provide high-value strategic tools for the users.

- [x] **Feature: Business Plan Generator**
    - [x] Define Business Plan Interface.
    - [x] Implement AI service for strategic plan generation.
    - [x] Create Document View component with Print functionality.
- [x] **Feature: Grant Matcher**
    - [x] AI logic to match business niche with available grants.
    - [x] Create Grant Matcher UI component.

## Phase 4: Backend Integration (Completed)
- [x] Set up Docker/Docker Compose.
- [x] Create Django apps (`users`, `brand`, `billing`).
- [x] Replace local AI calls with Django API endpoints (Proxy).
- [x] Integrate SQLite/Postgres via Django.