
import { useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'

type RiskLevel = 'low' | 'medium' | 'high' | 'inconclusive'

type Analysis = {
  riskLevel: RiskLevel
  summary: string
  warningSigns: {
    signal: string
    evidence: string
    explanation: string
  }[]
  reassuringSigns: string[]
  recommendedActions: string[]
  uncertainty: string
}

const MAX_LENGTH = 12000
const MAX_IMAGE_SIZE = 8 * 1024 * 1024

const sampleMessage =
  'Congratulations! You have been selected for a job. Pay a refundable registration fee of Rs. 2,000 today to receive your offer letter.'

const riskInfo: Record<
  RiskLevel,
  { label: string; description: string; symbol: string }
> = {
  high: {
    label: 'High risk',
    description: 'Several warning signs deserve immediate caution.',
    symbol: '!',
  },
  medium: {
    label: 'Medium risk',
    description: 'Some details need independent verification.',
    symbol: '!',
  },
  low: {
    label: 'Lower risk',
    description: 'Few clear warning signs were identified.',
    symbol: '✓',
  },
  inconclusive: {
    label: 'Inconclusive',
    description: 'There is not enough evidence for a clear assessment.',
    symbol: '?',
  },

}

type SignalCategory =
  | 'Urgency & pressure'
  | 'Money & payments'
  | 'Links & impersonation'
  | 'Personal information'
  | 'Other signals'

const signalCategories: SignalCategory[] = [
  'Urgency & pressure',
  'Money & payments',
  'Links & impersonation',
  'Personal information',
  'Other signals',
]

function getSignalCategories(signal: string, evidence: string, explanation: string): SignalCategory[] {
  const text = `${signal} ${evidence} ${explanation}`.toLowerCase()
  const categories: SignalCategory[] = []

  if (/urgent|urgency|immediately|today|limited time|pressure|threat|act now|deadline|rush/.test(text)) {
    categories.push('Urgency & pressure')
  }
  if (/pay|payment|fee|money|cash|bank transfer|deposit|refund|prize|crypto|wallet|financial/.test(text)) {
    categories.push('Money & payments')
  }
  if (/link|url|website|domain|impersonat|pretend|spoof|sender|account alert|official account/.test(text)) {
    categories.push('Links & impersonation')
  }
  if (/password|otp|one.time password|pin|personal information|identity|credential|sensitive data|verification code/.test(text)) {
    categories.push('Personal information')
  }

  return categories.length ? categories : ['Other signals']
}

function findEvidenceParts(
  messageText: string,
  evidence: string,
): { before: string; match: string; after: string } | null {
  const quote = evidence.trim()
  if (!quote) return null

  const index = messageText.toLocaleLowerCase().indexOf(quote.toLocaleLowerCase())
  if (index < 0) return null

  return {
    before: messageText.slice(0, index),
    match: messageText.slice(index, index + quote.length),
    after: messageText.slice(index + quote.length),
  }
}

function App() {
  const [message, setMessage] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [selectedWarningIndex, setSelectedWarningIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleImage(file?: File) {
    if (!file) return

    setError('')
    setAnalysis(null)

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPG, or WEBP image.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('This image is too large. Please choose an image under 8 MB.')
      return
    }

    if (preview) URL.revokeObjectURL(preview)

    const nextPreview = URL.createObjectURL(file)
    setImage(file)
    setPreview(nextPreview)
    setMessage('')
    setOcrBusy(true)
    setOcrProgress(0)

    let worker: Awaited<ReturnType<typeof createWorker>> | undefined

    try {
      worker = await createWorker('eng+urd', 1, {
        logger: (status) => {
          if (status.status === 'recognizing text') {
            setOcrProgress(Math.round(status.progress * 100))
          }
        },
      })

      const result = await worker.recognize(file)
      const extracted = result.data.text.trim()

      if (!extracted) {
        setError(
          'No readable text was found. Try a clearer screenshot or enter the text manually.',
        )
      } else {
        setMessage(extracted.slice(0, MAX_LENGTH))
      }
    } catch (err) {
      console.error('OCR failed:', err)
      setError(
        'Text extraction failed. You can still type or paste the message manually.',
      )
    } finally {
      if (worker) {
        try {
          await worker.terminate()
        } catch (err) {
          console.error('OCR worker cleanup failed:', err)
        }
      }
      setOcrBusy(false)
    }
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview)
    setImage(null)
    setPreview('')
    if (fileInput.current) fileInput.current.value = ''
  }

  async function analyzeMessage() {
    const cleaned = message.trim()

    if (!cleaned) {
      setError('Paste a message or upload a screenshot to get started.')
      return
    }

    if (cleaned.length > MAX_LENGTH) {
      setError(
        `Please keep the message under ${MAX_LENGTH.toLocaleString()} characters.`,
      )
      return
    }

    setBusy(true)
    setError('')
    setAnalysis(null)

    
try {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: cleaned }),
  })

  const data: unknown = await response.json()

  if (!response.ok) {
    const detail =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : 'The analysis could not be completed.'

    throw new Error(detail)
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    !('riskLevel' in data) ||
    !('summary' in data) ||
    !('warningSigns' in data) ||
    !('reassuringSigns' in data) ||
    !('recommendedActions' in data) ||
    !('uncertainty' in data) ||
    !['low', 'medium', 'high', 'inconclusive'].includes(
      String(data.riskLevel),
    ) ||
    typeof data.summary !== 'string' ||
    !Array.isArray(data.warningSigns) ||
    !Array.isArray(data.reassuringSigns) ||
    !Array.isArray(data.recommendedActions) ||
    typeof data.uncertainty !== 'string'
  ) {
    throw new Error(
      'The analysis returned an invalid response. Please try again.',
    )
  }

  const nextAnalysis = data as Analysis
  setAnalysis(nextAnalysis)
  setSelectedWarningIndex(0)
} catch (err) {
  if (err instanceof TypeError) {
    setError(
      'Unable to connect to ScamLens. Check your internet connection and try again.',
    )
  } else {
    setError(
      err instanceof Error
        ? err.message
        : 'Something went wrong. Please try again.',
    )
  }
} finally {
  setBusy(false)
}

  }

  function resetAnalysis() {
    setAnalysis(null)
    setSelectedWarningIndex(0)
    setError('')
    setMessage('')
    removeImage()
  }

  const risk = analysis ? riskInfo[analysis.riskLevel] : null
  const selectedWarning = analysis?.warningSigns[selectedWarningIndex]
  const evidenceParts = selectedWarning
    ? findEvidenceParts(message, selectedWarning.evidence)
    : null
  const categoryCounts = analysis
    ? signalCategories.map((category) => ({
        category,
        count: analysis.warningSigns.filter((item) =>
          getSignalCategories(item.signal, item.evidence, item.explanation).includes(category),
        ).length,
      }))
    : []
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((item) => item.count))

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080d1b] text-slate-100">
      {/* Ambient electric-blue background */}
      <div
        aria-hidden="true"
        className="scamlens-glow-drift pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(40,107,255,0.17),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="scamlens-orb-drift pointer-events-none absolute -left-40 top-96 h-80 w-80 rounded-full bg-blue-600/[0.06] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="scamlens-orb-drift scamlens-orb-delay pointer-events-none absolute -right-40 top-[700px] h-96 w-96 rounded-full bg-indigo-500/[0.05] blur-3xl"
      />

      <header className="scamlens-header-enter relative border-b border-white/[0.07] bg-[#080d1b]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a
            href="/"
            className="group flex items-center gap-3 rounded-lg"
            aria-label="ScamLens home"
          >
            <img src="/scamlens-logo.png" alt="ScamLens logo" className="h-12 w-12 rounded-xl object-contain" />
            <span>
              <span className="block font-['Space_Grotesk'] text-xl font-bold tracking-tight text-white">
                Scam<span className="text-blue-400">Lens</span>
              </span>
              <span className="block text-xs tracking-wide text-slate-400">
                LOOK CLOSER. STAY SAFER.
              </span>
            </span>
          </a>

          <span className="hidden items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.07] px-3.5 py-2 text-xs font-medium text-blue-200 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
            </span>
            AI-powered protection
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
        <section className="scamlens-hero-enter mx-auto mb-9 grid max-w-6xl gap-7 sm:mb-11 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-12">
          <div className="scamlens-hero-copy text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/[0.07] px-4 py-2 text-xs font-semibold text-blue-200">
              <span className="text-blue-400" aria-hidden="true">✳</span>
              YOUR FIRST LINE OF DIGITAL DEFENCE
            </div>

            <h1 className="font-['Space_Grotesk'] text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Not sure it's safe?
              <span className="mt-2 block bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-400 bg-clip-text pb-1 text-transparent">
                Let's look closer.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300 sm:leading-8 lg:mx-0">
              Suspicious text? Unexpected job offer? Strange account alert?
              Understand the warning signs before you click, pay, or reply.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-slate-300 lg:justify-start">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/10 text-blue-300">✓</span>
                Evidence-based analysis
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/10 text-blue-300">✓</span>
                Screenshot text extraction
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/10 text-blue-300">✓</span>
                Clear next steps
              </span>
            </div>
          </div>

          <aside className="scamlens-workflow-float mx-auto w-full max-w-md rounded-2xl border border-blue-400/15 bg-gradient-to-br from-[#12213b] to-[#0c1425] p-5 shadow-xl shadow-blue-950/15 transition duration-300 hover:border-blue-400/30 hover:shadow-blue-950/30 lg:mx-0 lg:mb-1 lg:max-w-none sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pause before you act</p>
                <p className="mt-0.5 text-xs text-slate-400">A simple way to check suspicious messages</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="scamlens-workflow-step scamlens-step-one flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-xs font-bold text-blue-200">1</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">Add the message</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-300">Paste text or upload a screenshot.</p>
                </div>
              </div>
              <div className="scamlens-workflow-step scamlens-step-two flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-xs font-bold text-blue-200">2</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">Review the evidence</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-300">See potential warning signs and context.</p>
                </div>
              </div>
              <div className="scamlens-workflow-step scamlens-step-three flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-xs font-bold text-blue-200">3</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">Choose a safer next step</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-300">Verify important claims independently.</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <div className="mx-auto mb-4 flex max-w-6xl items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-400/20 to-blue-400/10" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your message check</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-400/20 to-blue-400/10" />
        </div>

        <div
          className={`mx-auto grid max-w-6xl items-start gap-5 sm:gap-6 ${
            analysis && risk ? "grid-cols-1" : "lg:grid-cols-[1.05fr_0.95fr]"
          }`}
        >
          {/* Input panel */}
          <section className="scamlens-panel-enter group/panel rounded-2xl border border-white/[0.09] bg-gradient-to-b from-[#111d34] to-[#0d1526] p-4 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/25 hover:shadow-blue-950/20 sm:p-6 lg:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-5 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                    Step 1 · Add a message
                  </span>
                </div>
                <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white">
                  Check a message
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-300">
                  Paste text or extract it from a screenshot.
                </p>
              </div>
              <span className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-300">
                Privacy first
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={ocrBusy || busy}
                className="group/upload flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-blue-400/35 bg-blue-500/[0.045] px-2.5 py-4 text-center transition-colors duration-200 hover:border-blue-400/70 hover:bg-blue-500/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a30] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-xl text-blue-300 transition duration-300 group-hover/upload:scale-110 group-hover/upload:bg-blue-500/20">
                  ↑
                </span>
                <span className="text-sm font-semibold text-slate-100">
                  Upload screenshot
                </span>
                <span className="text-xs text-slate-400 sm:text-xs">
                  PNG, JPG, WEBP · 8 MB max
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessage(sampleMessage)
                  setAnalysis(null)
                  setError('')
                  removeImage()
                }}
                disabled={busy || ocrBusy}
                className="group/example flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 py-4 text-center transition-colors duration-200 hover:border-blue-400/30 hover:bg-blue-500/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a30] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-xl text-slate-300 transition duration-300 group-hover/example:border-blue-400/25 group-hover/example:text-blue-300">
                  ↗
                </span>
                <span className="text-sm font-semibold text-slate-100">
                  Try an example
                </span>
                <span className="text-xs text-slate-400 sm:text-xs">
                  Sample job offer
                </span>
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleImage(file)
              }}
            />

            {preview && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-400/15 bg-blue-500/[0.035] p-3">
                <img
                  src={preview}
                  alt="Uploaded screenshot preview"
                  className="h-20 w-20 shrink-0 rounded-lg border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-200">
                    {image?.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {ocrBusy
                      ? `Extracting text… ${ocrProgress}%`
                      : 'Screenshot ready for review'}
                  </p>
                  {ocrBusy && (
                    <div
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
                      role="progressbar"
                      aria-label="Screenshot text extraction progress"
                      aria-valuenow={ocrProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-300 transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={ocrBusy}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  aria-label="Remove screenshot"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="message"
                className="text-sm font-semibold text-slate-200"
              >
                Message text
              </label>
              <span className="text-xs text-slate-300">Required</span>
            </div>

            <textarea
              id="message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value.slice(0, MAX_LENGTH))
                setAnalysis(null)
                setError('')
              }}
              maxLength={MAX_LENGTH}
              placeholder="Paste the suspicious message here..."
              rows={7}
              className="min-h-[180px] w-full resize-y rounded-xl border border-white/[0.10] bg-[#080f1e] px-4 py-3.5 text-sm leading-7 text-slate-100 outline-none transition-colors duration-200 placeholder:text-slate-400 hover:border-white/[0.18] focus:border-blue-400/70 focus:ring-4 focus:ring-blue-500/[0.10]"
            />

            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>English · اردو · Roman Urdu</span>
              <span className="tabular-nums">
                {message.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
              </span>
            </div>
            {preview && !ocrBusy && message && (
              <p className="mt-2 text-xs leading-5 text-blue-200/80">
                Review the extracted text and correct any OCR mistakes before analyzing.
              </p>
            )}

            <div className="mt-5 flex gap-3 rounded-xl border border-blue-400/15 bg-blue-500/[0.045] p-3.5">
              <span className="mt-0.5 shrink-0 text-blue-300" aria-hidden="true">
                !
              </span>
              <p className="text-xs leading-5 text-slate-300">
                <strong className="font-semibold text-blue-200">
                  Protect your privacy.
                </strong>{' '}
                Remove passwords, OTPs, banking details, and unnecessary
                personal information before submitting a message.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/[0.07] p-3.5 text-sm leading-6 text-rose-200"
              >
                <span className="mr-2 font-bold">!</span>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={analyzeMessage}
              disabled={busy || ocrBusy || !message.trim()}
              className="group/analyze relative mt-5 flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-950/35 transition duration-200 hover:shadow-xl hover:shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#101a30] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                aria-hidden="true"
                className="scamlens-sheen absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover/analyze:translate-x-full"
              />
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing message...
                </>
              ) : ocrBusy ? (
                'Extracting screenshot text...'
              ) : (
                <>
                  <span>Analyze message</span>
                  <span className="text-lg transition-transform duration-300 group-hover/analyze:translate-x-1">
                    →
                  </span>
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-400">
              AI can make mistakes. Independently verify important claims.
            </p>
          </section>

          {/* Analysis results */}
          <section
            className="scamlens-panel-enter scamlens-panel-delay min-w-0 rounded-2xl border border-white/[0.09] bg-[#0d1629]/95 p-4 shadow-xl shadow-black/20 transition duration-300 hover:border-blue-400/20 sm:p-6 lg:p-8"
            aria-busy={busy}
          >
            {!analysis && (
              <div className="flex min-h-[430px] flex-col items-center justify-center py-10 text-center">
                <div className="scamlens-search-float relative mb-6 flex h-20 w-20 items-center justify-center">
                  <span className="absolute inset-0 animate-pulse rounded-3xl bg-blue-500/[0.08] blur-xl" />
                  <span className="absolute inset-1 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.13] to-indigo-500/[0.04]" />
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="relative h-9 w-9 text-blue-300"
                    aria-hidden="true"
                  >
                    <circle cx="10.8" cy="10.8" r="6.8" />
                    <path d="m16 16 4.5 4.5M10.8 7.5v6.6M7.5 10.8h6.6" />
                  </svg>
                </div>

                <span className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                  Your safety dashboard
                </span>
                <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white">
                  Your analysis starts here
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">
                  Submit a message to uncover potential warning signs,
                  reassuring details, and practical next steps.
                </p>

                {busy ? (
                  <div className="mt-8 w-full max-w-sm rounded-xl border border-blue-400/15 bg-blue-500/[0.045] p-4">
                    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 text-sm text-blue-100">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-300" />
                      Reviewing the message for evidence...
                    </div>
                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-blue-300" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-2">
                    {[
                      { icon: '◈', label: 'Risk level' },
                      { icon: '⌕', label: 'Evidence' },
                      { icon: '✓', label: 'Safe actions' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-2 py-4 transition duration-300 hover:border-blue-400/20 hover:bg-blue-500/[0.04]"
                      >
                        <span className="mb-2 block text-lg text-blue-400">
                          {item.icon}
                        </span>
                        <span className="text-xs text-slate-400 sm:text-xs">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {analysis && risk && (
              <div className="animate-[fadeIn_0.4s_ease-out] min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                      Your message review
                    </p>
                    <h2 aria-live="polite" className="mt-1 font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-white">
                      Analysis results
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={resetAnalysis}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-500/[0.07] hover:text-blue-200"
                  >
                    New check ↗
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#080f1e]/70 p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                          <path d="M7 4.75h7l4 4V19a1.25 1.25 0 0 1-1.25 1.25h-9.5A1.25 1.25 0 0 1 6 19V6a1.25 1.25 0 0 1 1-1.25Z" />
                          <path d="M14 4.75V9h4M9 13h6M9 16h6" />
                        </svg>
                      </span>
                      <h3 className="text-sm font-semibold text-slate-100">Message reviewed</h3>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {message.length.toLocaleString()} characters
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-white/[0.12] bg-[#0a1222] p-4 text-sm leading-7 text-slate-100 sm:text-base">
                    {evidenceParts ? (
                      <>
                        {evidenceParts.before}
                        <mark aria-label="Selected warning-sign evidence highlighted in the message" className="rounded bg-amber-300/30 px-0.5 font-semibold text-amber-50 ring-1 ring-amber-200/60">
                          {evidenceParts.match}
                        </mark>
                        {evidenceParts.after}
                      </>
                    ) : (
                      message
                    )}
                  </div>
                  {selectedWarning && (
                    <p className="mt-2 text-xs leading-5 text-amber-200/80">
                      {evidenceParts
                        ? `Highlighted evidence for: ${selectedWarning.signal}`
                        : `Selected signal: ${selectedWarning.signal}. Its evidence could not be matched exactly to the message text.`}
                    </p>
                  )}
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    Check that the text is accurate, especially if it came from a screenshot. The assessment is based on the text shown here.
                  </p>
                </div>

                <div
                  className={`mt-5 rounded-2xl border p-5 sm:p-6 ${
                    analysis.riskLevel === 'high'
                      ? 'border-rose-400/25 bg-rose-400/[0.06]'
                      : analysis.riskLevel === 'medium'
                        ? 'border-amber-300/25 bg-amber-300/[0.045]'
                        : analysis.riskLevel === 'low'
                          ? 'border-emerald-300/25 bg-emerald-300/[0.045]'
                          : 'border-blue-300/20 bg-blue-300/[0.035]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/20 text-2xl font-bold ${
                        analysis.riskLevel === 'high'
                          ? 'text-rose-300'
                          : analysis.riskLevel === 'medium'
                            ? 'text-amber-300'
                            : analysis.riskLevel === 'low'
                              ? 'text-emerald-300'
                              : 'text-blue-300'
                      }`}
                    >
                      {risk.symbol}
                    </span>
                    <div>
                      <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                        {risk.label}
                      </p>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-300">
                        {risk.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5" aria-label={`Risk level: ${risk.label}`}>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <span>Risk indicator</span>
                      <span>{analysis.riskLevel === 'inconclusive' ? 'Not enough evidence' : risk.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2" aria-hidden="true">
                      {[
                        { level: 'low', label: 'Low', active: analysis.riskLevel === 'low', color: 'bg-emerald-400' },
                        { level: 'medium', label: 'Medium', active: analysis.riskLevel === 'medium', color: 'bg-amber-300' },
                        { level: 'high', label: 'High', active: analysis.riskLevel === 'high', color: 'bg-rose-400' },
                      ].map((segment) => (
                        <div key={segment.level}>
                          <div className={`h-2 rounded-full transition-colors ${segment.active ? segment.color : 'bg-white/10'}`} />
                          <p className={`mt-1.5 text-xs font-semibold ${segment.active ? 'text-white' : 'text-slate-300'}`}>{segment.label}</p>
                        </div>
                      ))}
                    </div>
                    {analysis.riskLevel === 'inconclusive' && (
                      <p className="mt-2 text-xs leading-5 text-blue-200/80">
                        No risk category is selected because the available evidence is insufficient.
                      </p>
                    )}
                  </div>
                  <div className="mt-5 border-t border-white/[0.10] pt-4">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Why this assessment?
                    </p>
                    <p className="text-sm leading-7 text-slate-100 sm:text-base">
                      {analysis.summary}
                    </p>
                  </div>
                </div>

                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-400">
                  <span className="mt-0.5 text-blue-300" aria-hidden="true">ⓘ</span>
                  <span>This is a risk signal, not a verdict. A low-risk result does not prove a message is safe, and a high-risk result is not proof of fraud.</span>
                </p>

                <section className="mt-7 rounded-2xl border border-blue-400/15 bg-gradient-to-br from-blue-500/[0.055] to-transparent p-4 sm:p-5" aria-labelledby="signal-breakdown-title">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Signal overview</p>
                      <h3 id="signal-breakdown-title" className="mt-1 text-base font-bold text-white">Scam signal breakdown</h3>
                    </div>
                    <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300">
                      {analysis.warningSigns.length} signal{analysis.warningSigns.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Categories are grouped from the warning signs returned by the analysis; they are indicators, not proof of fraud.
                  </p>
                  <div className="mt-4 space-y-3">
                    {categoryCounts.map(({ category, count }) => (
                      <div key={category}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-200">{category}</span>
                          <span className="min-w-5 text-right text-xs font-semibold tabular-nums text-slate-400">{count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-label={category} aria-valuenow={count} aria-valuemin={0} aria-valuemax={maxCategoryCount}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-300 transition-all duration-500"
                            style={{ width: `${count === 0 ? 0 : Math.max(8, (count / maxCategoryCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="mt-7">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 text-amber-300">
                      !
                    </span>
                    Warning signs
                    <span className="ml-auto rounded-full bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-400">
                      {analysis.warningSigns.length} found
                    </span>
                  </h3>

                  {analysis.warningSigns.length ? (
                    <div className="mt-3 space-y-3">
                      {analysis.warningSigns.map((item, index) => (
                        <button
                          type="button"
                          key={`${item.signal}-${index}`}
                          onClick={() => setSelectedWarningIndex(index)}
                          aria-pressed={selectedWarningIndex === index}
                          className={`block w-full rounded-xl border border-l-2 p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1629] sm:p-5 ${
                            selectedWarningIndex === index
                              ? 'border-amber-200/60 border-l-amber-200 bg-amber-300/[0.09] ring-2 ring-amber-200/20'
                              : 'border-white/[0.12] border-l-amber-300/60 bg-white/[0.035] hover:border-amber-200/40 hover:bg-amber-300/[0.05]'
                          }`}
                        >
                          <h4 className="text-sm font-semibold text-slate-100">
                            {item.signal}
                          </h4>
                          {item.evidence && (
                            <div className="mt-3 rounded-lg border border-amber-300/10 bg-amber-300/[0.045] p-3">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200/75">
                                Evidence in the message
                              </p>
                              <blockquote className="text-sm italic leading-6 text-amber-100/90">
                                “{item.evidence}”
                              </blockquote>
                            </div>
                          )}
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            {item.explanation}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl border border-white/[0.06] p-4 text-sm leading-6 text-slate-400">
                      No specific warning signs were identified. This does not
                      guarantee the message is safe.
                    </p>
                  )}
                </div>

                {analysis.reassuringSigns.length > 0 && (
                  <div className="mt-7">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300">
                        ✓
                      </span>
                      Reassuring details
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {analysis.reassuringSigns.map((item, index) => (
                        <li
                          key={`${item}-${index}`}
                          className="flex gap-3 rounded-lg px-1 py-1 text-sm leading-6 text-slate-300"
                        >
                          <span className="mt-0.5 text-emerald-300">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-7 rounded-2xl border border-blue-400/25 bg-blue-500/[0.07] p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 text-base font-bold text-blue-100">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                      →
                    </span>
                    What you should do next
                  </h3>
                  <ol className="mt-4 space-y-4">
                    {analysis.recommendedActions.map((item, index) => (
                      <li
                        key={`${item}-${index}`}
                        className="flex gap-3 text-sm leading-6 text-slate-300"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-xs font-bold text-blue-200">
                          {index + 1}
                        </span>
                        <span className="pt-0.5">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-6 border-t border-white/[0.07] pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    What we cannot confirm
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {analysis.uncertainty}
                  </p>
                </div>

                <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-6 text-slate-400">
                  This assessment is AI-generated guidance, not proof of fraud
                  or a guarantee of safety. Verify important claims independently.
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="mx-auto mt-14 max-w-6xl border-t border-white/[0.07] pt-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <img src="/scamlens-logo.png" alt="ScamLens logo" className="h-10 w-10 rounded-xl object-contain" />
            <span className="font-['Space_Grotesk'] text-sm font-bold text-slate-300">
              Scam<span className="text-blue-400">Lens</span>
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-300">
            Look closer. Stay safer. Verify senders through official channels
            before acting.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Built to help people make safer digital decisions.
          </p>
        </footer>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scamlens-enter {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scamlens-drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -12px, 0); }
        }

        @keyframes scamlens-glow-breathe {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }

        @keyframes scamlens-sheen-pass {
          0%, 72%, 100% { transform: translateX(-120%); }
          86% { transform: translateX(120%); }
        }

        .scamlens-header-enter {
          animation: scamlens-enter 550ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        .scamlens-hero-enter {
          animation: scamlens-enter 700ms cubic-bezier(0.2, 0.7, 0.2, 1) 80ms both;
        }
        .scamlens-workflow-float {
          animation: scamlens-enter 750ms cubic-bezier(0.2, 0.7, 0.2, 1) 220ms both;
        }
        .scamlens-workflow-step {
          animation: scamlens-enter 500ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        .scamlens-step-one { animation-delay: 350ms; }
        .scamlens-step-two { animation-delay: 450ms; }
        .scamlens-step-three { animation-delay: 550ms; }
        .scamlens-panel-enter {
          animation: scamlens-enter 650ms cubic-bezier(0.2, 0.7, 0.2, 1) 180ms both;
        }
        .scamlens-panel-delay { animation-delay: 300ms; }
        .scamlens-orb-drift {
          animation: scamlens-drift 13s ease-in-out infinite;
        }
        .scamlens-orb-delay { animation-delay: -6s; }
        .scamlens-glow-drift {
          animation: scamlens-glow-breathe 8s ease-in-out infinite;
        }
        .scamlens-search-float {
          animation: scamlens-drift 5s ease-in-out infinite;
        }
        .scamlens-sheen {
          animation: scamlens-sheen-pass 7s ease-in-out infinite;
        }

        button:focus-visible,
        a:focus-visible,
        textarea:focus-visible,
        input:focus-visible {
          outline: 3px solid #7dd3fc;
          outline-offset: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .scamlens-header-enter,
          .scamlens-hero-enter,
          .scamlens-workflow-float,
          .scamlens-workflow-step,
          .scamlens-panel-enter,
          .scamlens-orb-drift,
          .scamlens-glow-drift,
          .scamlens-search-float,
          .scamlens-sheen {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default App
