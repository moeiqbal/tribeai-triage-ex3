# Project Intake and Triage - MVP Spec

## Goal

Build a small internal tool that helps triage inbound project requests quickly and consistently.


## Core Flow

1. User create an intake with title, description, budget range, timeline, and industry. (System must record submission created at timestamp).
2. App will need to persist the raw intake.
3. App calls an LLM to generate summary, tags and a risk checklist in bullet points.
4. App store the AI outputs
5. User can view all intakes
6. User can open intake detail

## UX States Requirements

1. Empty List state.
2. Loading/submitting state
3. User visible error state

## Reliablity Requiremetns

1. User intake submission must not be lost if the AI triage fails or is unavailable.
2. API Validates required fields
3. AI Output should be parsed into a predictiable structure, preferably in json.
4. If parsing fails, store AI status messege and fallback status and show user manual review messege.

## Future Goals (Out of scope for MPV)

- Authentication
- Multi User Support
- Production Deployment
- Background Jobs
- Polished UI