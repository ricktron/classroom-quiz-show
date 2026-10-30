import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QualityReportPanel } from './QualityReportPanel'
import type { ImportQualityReport, QualityFinding } from '../import/qualityReport'
import { renderGenerationFeedbackMarkdown } from '../import/generationFeedback'

const ORIGINAL_CREATE_OBJECT_URL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const ORIGINAL_REVOKE_OBJECT_URL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')

const LEAKAGE_MESSAGE =
  'The answer appears directly in the question text. Review whether this is intentional.'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  if (ORIGINAL_CREATE_OBJECT_URL) Object.defineProperty(URL, 'createObjectURL', ORIGINAL_CREATE_OBJECT_URL)
  else delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL
  if (ORIGINAL_REVOKE_OBJECT_URL) Object.defineProperty(URL, 'revokeObjectURL', ORIGINAL_REVOKE_OBJECT_URL)
  else delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL
})

function reportWith(findings: readonly QualityFinding[]): ImportQualityReport {
  return {
    title: 'Sixth Grade Showdown: Texas Core',
    gameId: 'sixth-grade-showdown-texas-core',
    acceptance: 'accepted',
    importSucceeded: true,
    findings,
    errorCount: findings.filter((finding) => finding.classification === 'ERROR').length,
    warningCount: findings.filter((finding) => finding.classification === 'WARNING').length,
    heuristicCount: findings.filter((finding) => finding.classification === 'HEURISTIC').length,
  }
}

describe('QualityReportPanel', () => {
  it('shows category, points, and question position for a tile notice', () => {
    render(
      <QualityReportPanel
        report={reportWith([
          {
            classification: 'HEURISTIC',
            code: 'possible-answer-leakage',
            message: LEAKAGE_MESSAGE,
            path: 'sixth-grade-showdown-texas-core-tile-1-4',
            source: 'heuristic',
            subject: {
              kind: 'tile',
              categoryTitle: 'Earth & Ecosystems',
              clueOrder: 4,
              pointValue: 400,
              tileCanonicalId: 'sixth-grade-showdown-texas-core-tile-1-4',
              prompt: 'The answer is nimbus clouds after rain',
              answer: 'nimbus',
            },
          },
        ])}
      />,
    )

    expect(screen.getByText('Quality notice')).toBeInTheDocument()
    expect(screen.getByTestId('quality-finding-location')).toHaveTextContent(
      'Earth & Ecosystems | 400 points | Question 4',
    )
    expect(screen.getByText('Possible answer giveaway')).toBeInTheDocument()
    expect(screen.getByText(LEAKAGE_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText('sixth-grade-showdown-texas-core-tile-1-4')).not.toBeInTheDocument()
  })

  it('identifies a Final notice without a category or point value', () => {
    render(
      <QualityReportPanel
        report={reportWith([
          {
            classification: 'HEURISTIC',
            code: 'possible-answer-leakage',
            message: LEAKAGE_MESSAGE,
            path: 'final',
            source: 'heuristic',
            subject: {
              kind: 'final',
              roundTitle: 'Final',
              prompt: 'The answer is nimbus clouds after rain',
              answer: 'nimbus',
            },
          },
        ])}
      />,
    )

    expect(screen.getByTestId('quality-finding-location')).toHaveTextContent('Final')
    expect(screen.getByTestId('quality-finding-location')).not.toHaveTextContent(/points|category/i)
  })

  it('falls back safely when a notice has no question location', () => {
    render(
      <QualityReportPanel
        report={reportWith([
          {
            classification: 'HEURISTIC',
            code: 'possible-answer-leakage',
            message: LEAKAGE_MESSAGE,
            path: 'not-a-real-tile',
            source: 'heuristic',
          },
        ])}
      />,
    )

    expect(screen.getByText('Possible answer giveaway')).toBeInTheDocument()
    expect(screen.getByText(LEAKAGE_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByTestId('quality-finding-location')).not.toBeInTheDocument()
    expect(screen.queryByText('not-a-real-tile')).not.toBeInTheDocument()
    expect(screen.queryByText(/untitled category/i)).not.toBeInTheDocument()
  })

  it('keeps warnings and quality notices distinct', () => {
    render(
      <QualityReportPanel
        report={reportWith([
          {
            classification: 'WARNING',
            code: 'long-prompt',
            message: 'This question is longer than the recommended length.',
            source: 'authoring-draft',
          },
          {
            classification: 'HEURISTIC',
            code: 'generic-team-name',
            message: '“Red” looks like a generic placeholder name, not a class-specific identity.',
            source: 'heuristic',
          },
        ])}
      />,
    )

    const warning = screen.getByText('Warning').closest('li')
    const notice = screen.getByText('Quality notice').closest('li')
    expect(warning).toHaveClass('quality-report__item--warning')
    expect(notice).toHaveClass('quality-report__item--heuristic')
    expect(warning).not.toHaveClass('quality-report__item--heuristic')
    expect(screen.queryByText('Possible answer giveaway')).not.toBeInTheDocument()
  })

  it('downloads the same local markdown the report renderer produces', () => {
    const report = reportWith([
      {
        classification: 'HEURISTIC',
        code: 'possible-answer-leakage',
        message: LEAKAGE_MESSAGE,
        path: 'tile',
        source: 'heuristic',
        subject: {
          kind: 'tile',
          categoryTitle: 'Matter & Forces',
          clueOrder: 1,
          pointValue: 100,
          tileCanonicalId: 'sixth-grade-showdown-texas-core-tile-3-1',
          prompt: 'Which state of matter keeps its own shape and volume: solid, liquid, or gas?',
          answer: 'solid',
        },
      },
    ])
    const partsSeen: string[] = []
    const RealBlob = globalThis.Blob
    class RecordingBlob extends RealBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        const first = parts?.[0]
        if (typeof first === 'string') partsSeen.push(first)
      }
    }
    vi.stubGlobal('Blob', RecordingBlob)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: () => 'blob:local-feedback',
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: () => {},
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<QualityReportPanel report={report} />)
    fireEvent.click(screen.getByTestId('generation-feedback'))

    expect(partsSeen[0]).toBe(renderGenerationFeedbackMarkdown(report))
    expect(partsSeen[0]).toContain('Matter & Forces | 100 points | Question 1')
    expect(partsSeen[0]).toContain('sixth-grade-showdown-texas-core-tile-3-1')
    expect(partsSeen[0]).not.toMatch(/https?:\/\//)
  })
})
