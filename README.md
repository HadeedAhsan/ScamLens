# ScamLens

**Understand suspicious messages before you act.**

ScamLens is an AI-powered web application that helps people assess potentially fraudulent SMS messages, WhatsApp messages, emails, job offers, scholarship notices, delivery alerts, and account-security notifications.

**Live demo:** https://scam-lensai.vercel.app/  
**Source code:** https://github.com/HadeedAhsan/ScamLens

## The Problem

Fraudulent messages often use urgency, impersonation, suspicious requests, or misleading claims to pressure people into making unsafe decisions. Many people struggle to recognize these warning signs.

## The Solution

ScamLens analyzes a message and explains potential risks in understandable language. Users can paste message text or upload a screenshot for text extraction and analysis.

The application provides a risk assessment, warning signs with supporting evidence, reassuring signs when relevant, recommended actions, and an explanation of uncertainty.

ScamLens supports analysis of English, Urdu, and Roman Urdu when possible.

## Features

- **AI message analysis:** Assess potentially suspicious messages using generative AI.
- **Screenshot OCR:** Extract text from screenshots using Tesseract.js.
- **Evidence-based explanations:** Highlight specific warning signs and explain why they matter.
- **Practical recommendations:** Suggest safer verification steps.
- **Uncertainty-aware results:** Avoid treating every unfamiliar message as a confirmed scam.
- **Input validation and error handling:** Handle invalid inputs and unsuccessful AI responses.
- **Responsive interface:** Access the application through a web browser.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| Vite | Development server and build tooling |
| TypeScript | Type-safe application code |
| Tailwind CSS v4 | Interface styling |
| Tesseract.js | Browser-based OCR |
| Google Gemini API | AI-powered message analysis |
| Google GenAI SDK | Communication with the Gemini API |
| Zod | Request and AI-response validation |
| Vercel | Hosting and serverless API deployment |
| GitHub | Source code and version control |

## How the AI Works

1. The user pastes a message or uploads a screenshot.
2. For screenshots, Tesseract.js extracts readable text in the browser.
3. The extracted or pasted text is sent to the server-side `/api/analyze` endpoint.
4. The Gemini model analyzes the text using instructions designed for cautious, evidence-based assessment.
5. The API validates the returned JSON structure with Zod.
6. The application presents the assessment, supporting evidence, recommended actions, and uncertainty.

**AI model:** `gemini-3.8-flash`, as configured in the application.

The API key is stored as a server-side environment variable named `GEMINI_API_KEY`, not in the public frontend code.

## Getting Started

### Requirements

- Node.js and npm
- A Google Gemini API key
- A Vercel account or Vercel CLI for running the complete application locally

### Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/HadeedAhsan/ScamLens.git
cd ScamLens
npm install
```

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Replace the example value with your own API key. Never commit `.env.local` or expose your key publicly.

### Run Locally

Start the application with Vercel's local development environment:

```bash
npx vercel dev
```

Follow the URL shown in the terminal.

To check the production build separately, run:

```bash
npm run build
```

## Privacy and Responsible Use

ScamLens is designed to help users make more informed decisions, not to guarantee whether a message is genuine or fraudulent.

- A risk assessment is not proof that a sender or organization is legitimate or fraudulent.
- Users should independently verify important requests through official channels.
- Never share passwords, one-time verification codes, or sensitive financial information in response to suspicious messages.
- AI results can be incomplete or incorrect.
- Screenshot text extraction may contain errors.
- Message content is sent to the server-side AI service for analysis. Avoid submitting sensitive personal information.

## Limitations and Future Improvements

- AI assessments may produce false positives or false negatives.
- OCR accuracy depends on screenshot quality, language, and text clarity.
- ScamLens cannot independently verify a sender's identity from message text alone.
- Future improvements could include broader language testing, additional accessibility improvements, and evaluation against a carefully curated set of real-world examples.

## Screenshots

Add screenshots of the actual application here, including the home screen and an example analysis result.

## Team Contributions

- **Project creator / solo contributor:** Product concept, interface development, OCR integration, AI API integration, validation, testing, deployment, and documentation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
