# ScamLens
### Understand suspicious messages before you act.

ScamLens is an AI-powered web application that helps people evaluate potentially fraudulent messages and understand warning signs before taking action.

**Live application:** https://scam-lensai.vercel.app/  
**Source code:** https://github.com/HadeedAhsan/ScamLens

---

## The Problem

Scam messages often exploit urgency, impersonation, misleading offers, and requests for money or sensitive information. Messages about jobs, scholarships, deliveries, and account security can be difficult to evaluate, especially when people feel pressured to act quickly.

People need more than a simple warning. They need understandable explanations, supporting evidence, and practical steps to help them make safer decisions.

## Our Solution

ScamLens helps users assess suspicious messages and understand why they may deserve caution.

Users can paste message text or upload a screenshot. The application extracts text from supported images, analyzes the message using generative AI, and presents an understandable assessment with warning signs, reassuring details, and recommended actions.

ScamLens does not automatically treat every unfamiliar message as a scam. When evidence is insufficient, it can mark the assessment as inconclusive.

## Key Features

- **AI-powered message analysis:** Assess suspicious SMS messages, WhatsApp messages, emails, job offers, scholarship notices, delivery alerts, and account-security notifications.
- **Screenshot text extraction:** Extract text from PNG, JPG, and WEBP images using browser-based Tesseract.js OCR.
- **Risk assessment:** Present a risk level of low, medium, high, or inconclusive.
- **Evidence-linked warning signs:** Explain potential warning signs and provide relevant message excerpts for closer inspection.
- **Reassuring signs:** Highlight potentially reassuring details without treating them as proof of legitimacy.
- **Practical safety recommendations:** Suggest steps users can take to verify a message independently.
- **Multilingual analysis:** Analyze English, Urdu, and Roman Urdu messages where possible.
- **Uncertainty awareness:** Communicate limitations rather than presenting an AI assessment as definitive proof.
- **Accessible, responsive interface:** Provide readable results, visible focus indicators, and a layout designed for different screen sizes.
- **Input validation and error handling:** Validate requests and AI responses, with helpful feedback for failed analysis, invalid responses, and exhausted AI quotas.

## How It Works

1. **Provide a message:** Paste suspicious text or upload a screenshot.
2. **Extract text:** For uploaded images, Tesseract.js performs OCR in the browser.
3. **Submit for analysis:** The extracted or pasted message is sent to the server-side `/api/analyze` endpoint.
4. **Analyze with AI:** Google Gemini evaluates the message using instructions designed for cautious, evidence-based assessment.
5. **Validate the response:** The server validates the AI-generated result using Zod.
6. **Review the findings:** ScamLens displays the risk assessment, warning signs, evidence, reassuring details, recommended actions, and uncertainty.

## What Makes ScamLens Useful?

ScamLens aims to do more than label a message as suspicious. It helps users understand the reasoning behind an assessment and identify practical next steps.

Its evidence-focused approach and explicit uncertainty handling are intended to encourage careful judgment rather than blind trust in AI-generated results.

## Technology Stack

| Technology | Purpose |
|---|---|
| React 19 | Component-based user interface |
| Vite | Development tooling and production builds |
| TypeScript | Type safety and maintainable code |
| Tailwind CSS v4 | Responsive styling and visual design |
| Tesseract.js | Browser-based optical character recognition |
| Google Gemini API | AI-powered message interpretation |
| Google GenAI SDK | Communication with the AI service |
| Zod | Request and AI-response validation |
| Vercel Functions | Server-side API execution |
| Vercel | Application hosting and deployment |
| GitHub | Source code and version control |

## Architecture

ScamLens uses a frontend and serverless API architecture. It does not require a dedicated application server or database.

```text
User
 |
 v
React + TypeScript Interface
 |
 +---- Paste message
 |
 +---- Upload screenshot
          |
          v
     Tesseract.js OCR
          |
          v
     Extracted message text
          |
          v
     /api/analyze
          |
          v
     Google Gemini API
          |
          v
     Zod response validation
          |
          v
     Structured analysis
          |
          v
     Risk assessment,
     evidence and safe actions
```

The Gemini API key is accessed on the server and must never be exposed in frontend code or committed to the repository.

## Getting Started

### Prerequisites

- Node.js and npm
- A valid Google Gemini API key with available API quota
- A Vercel account or the Vercel CLI for running the complete application locally

### 1. Clone the repository

```bash
git clone https://github.com/HadeedAhsan/ScamLens.git
cd ScamLens
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the API key

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholder with your own valid API key.

**Security:** Never commit `.env.local`, publish your API key, or place the key in client-side code. Ensure secret files are excluded from Git.

### 4. Run the complete application locally

Start the application using Vercel's local development environment so the frontend and serverless API can work together:

```bash
npx vercel dev
```

Open the local URL shown in the terminal. The project typically runs at `http://localhost:3000`.

### 5. Build the application

```bash
npm run build
```

This runs the TypeScript project build and creates the production frontend bundle.

### 6. Run lint checks

```bash
npm run lint
```

Resolve any reported issues before submitting changes.

## AI Usage and Error Handling

ScamLens uses Google Gemini to interpret message content and produce a structured assessment.

The server validates the AI response before returning it to the frontend. If the AI service is temporarily unavailable, returns an invalid response, or reaches its quota limit, ScamLens displays a user-friendly error instead of exposing the full provider error.

**Quota limitations:** AI availability depends on the configured Google Cloud project, model, usage tier, and billing settings. Exhausting a quota can temporarily prevent new analyses. Changing the error message does not increase the available quota.

## Deployment

ScamLens is deployed on Vercel.

To deploy an updated version:

1. Verify the changes locally.
2. Run `npm run build` and `npm run lint`.
3. Commit and push the verified changes to the connected GitHub repository.
4. Confirm that the Vercel deployment completes successfully.
5. Ensure `GEMINI_API_KEY` is configured in the Vercel project's environment variables for the appropriate deployment environment.
6. Open the live application and test the complete analysis workflow when AI quota is available.

**Live application:** https://scam-lensai.vercel.app/

## Privacy and Responsible Use

ScamLens is a decision-support tool, not a guarantee that a message is genuine or fraudulent.

- AI-generated assessments can be incomplete or incorrect.
- A risk label does not independently verify a sender's identity.
- Reassuring signs do not prove that a message is safe.
- OCR may misread text, particularly in unclear screenshots or mixed-language content.
- Users should verify important requests through independently obtained official contact details or websites.
- Never share passwords, one-time verification codes, or sensitive financial information in response to a suspicious message.
- Message text submitted for analysis is sent to the configured AI service. Avoid submitting unnecessary personal or confidential information.

## Limitations

- Assessment quality depends on the message content and the AI model's interpretation.
- OCR accuracy depends on image quality, text clarity, and language support.
- ScamLens cannot independently verify sender identities or guarantee the safety of links.
- AI analysis may be temporarily unavailable if API quotas are exhausted or the provider experiences an error.
- The application supports, rather than replaces, independent verification and informed judgment.

## Future Improvements

Potential future improvements include:

- Evaluation against a carefully curated dataset of legitimate and fraudulent messages.
- Broader testing of Urdu, Roman Urdu, and additional languages.
- Further accessibility and mobile usability testing.
- Expanded validation and monitoring of AI assessment quality.

These are potential improvements, not claims about features already implemented.

## Project Information

**Project:** ScamLens  
**Category:** AI-powered scam awareness and digital safety  
**Project type:** Web application  
**Deployment:** Vercel  
**Repository:** https://github.com/HadeedAhsan/ScamLens

## License

See the [LICENSE](LICENSE) file for the project's licensing terms.
