import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import AnalysisCharts from '../components/AnalysisCharts'
import { useAuth } from '../context/AuthContext'

export default function AnalysisPage() {
  const { api } = useAuth()
  const fileInputRef = useRef(null)

  // Source mode: 'select' (from DB) or 'upload' (PDF)
  const [sourceMode, setSourceMode] = useState('select')

  // Paper selection state (existing papers from DB)
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [fetchingPaper, setFetchingPaper] = useState(false)

  // PDF upload state
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadSubject, setUploadSubject] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Active mode: null | 'charts' | 'validate'
  const [activeMode, setActiveMode] = useState(null)

  // Validation state
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [validationError, setValidationError] = useState('')

  // Fetch papers list on mount
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const { data } = await api.get('/papers')
        if (data.success) {
          setPapers(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch papers:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPapers()
  }, [api])

  // Fetch full paper data when a paper is selected
  const fetchFullPaper = async (paperId) => {
    if (!paperId) {
      setSelectedPaper(null)
      return
    }
    setFetchingPaper(true)
    setValidationResult(null)
    setValidationError('')
    try {
      const { data } = await api.get(`/papers/${paperId}`)
      if (data.success) {
        setSelectedPaper(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch paper:', err)
    } finally {
      setFetchingPaper(false)
    }
  }

  const handlePaperChange = (e) => {
    const id = e.target.value
    setSelectedPaperId(id)
    setActiveMode(null)
    setValidationResult(null)
    fetchFullPaper(id)
  }

  // Switch source mode
  const handleSourceSwitch = (mode) => {
    setSourceMode(mode)
    setActiveMode(null)
    setValidationResult(null)
    setValidationError('')
    setAnalyzeError('')
    if (mode === 'select') {
      setUploadedFile(null)
    } else {
      setSelectedPaperId('')
      setSelectedPaper(null)
    }
  }

  // Handle PDF file selection
  const handleFileSelect = (file) => {
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file)
      setAnalyzeError('')
    } else if (file) {
      setAnalyzeError('Please upload a PDF file only.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  // Analyze uploaded PDF
  const handleAnalyzePDF = async () => {
    if (!uploadedFile) return
    setAnalyzing(true)
    setAnalyzeError('')
    setActiveMode(null)
    setValidationResult(null)
    setSelectedPaper(null)

    try {
      const formData = new FormData()
      formData.append('subject', uploadSubject || 'Unknown')
      formData.append('syllabus_pdf', uploadedFile)

      const { data } = await api.post('/papers/analyze-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })

      if (data.success) {
        setSelectedPaper(data.data)
      } else {
        setAnalyzeError(data.error || 'Failed to analyze PDF.')
      }
    } catch (err) {
      setAnalyzeError(
        err.response?.data?.error || err.message || 'Failed to analyze the question paper PDF.'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  // Run AI validation
  const handleValidate = async () => {
    if (!selectedPaper) return
    setValidating(true)
    setValidationError('')
    setValidationResult(null)
    try {
      // For uploaded PDFs, we need to send the paper data directly to the AI service
      // For DB papers, we use the existing endpoint
      if (sourceMode === 'upload') {
        // Send sections directly to the validate-analysis AI endpoint
        const { data } = await api.post('/papers/validate-uploaded', {
          subject: selectedPaper.metadata?.subject || uploadSubject || 'Unknown',
          sections: selectedPaper.sections || [],
        })
        if (data.success) {
          setValidationResult(data.data)
        } else {
          setValidationError(data.error || 'Validation failed.')
        }
      } else {
        const { data } = await api.post(`/papers/${selectedPaper._id}/validate`)
        if (data.success) {
          setValidationResult(data.data)
        } else {
          setValidationError(data.error || 'Validation failed.')
        }
      }
    } catch (err) {
      setValidationError(
        err.response?.data?.error || err.message || 'Validation failed. Please try again.'
      )
    } finally {
      setValidating(false)
    }
  }

  // Determine if we have a paper to work with
  const hasPaper = selectedPaper && !fetchingPaper && !analyzing

  return (
    <div style={{ minHeight: '100vh' }} className="bg-grid">
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Page Header */}
        <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.03em' }}>
            <span className="gradient-text">📊 Analysis Tools</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Generate distribution charts or validate Bloom's & CO assignments with AI
          </p>
        </div>

        {/* Source Mode Toggle */}
        <div className="glass-card animate-slide-up" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => handleSourceSwitch('select')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: sourceMode === 'select' ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: sourceMode === 'select' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                fontWeight: sourceMode === 'select' ? 700 : 500,
                color: sourceMode === 'select' ? 'var(--accent-hover)' : 'var(--text-primary)',
                marginBottom: '4px',
                fontSize: '0.95rem',
              }}>
                📋 Select Generated Paper
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Choose from your previously generated papers
              </div>
            </button>

            <button
              onClick={() => handleSourceSwitch('upload')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: sourceMode === 'upload' ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: sourceMode === 'upload' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                fontWeight: sourceMode === 'upload' ? 700 : 500,
                color: sourceMode === 'upload' ? 'var(--accent-hover)' : 'var(--text-primary)',
                marginBottom: '4px',
                fontSize: '0.95rem',
              }}>
                📄 Upload Question Paper PDF
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Upload any question paper PDF for AI analysis
              </div>
            </button>
          </div>

          {/* ── Source: Select from DB ──────────────────────────── */}
          {sourceMode === 'select' && (
            <>
              <label className="form-label" style={{ marginBottom: '8px' }}>Select a Generated Paper</label>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
                  Loading papers...
                </div>
              ) : papers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No papers found. Generate a question paper first from the Dashboard.
                </p>
              ) : (
                <select
                  className="input-field"
                  value={selectedPaperId}
                  onChange={handlePaperChange}
                  disabled={fetchingPaper}
                >
                  <option value="">— Choose a paper —</option>
                  {papers.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name || p.metadata?.subject || 'Untitled'} — {p.metadata?.max_marks || '?'}m
                      ({new Date(p.createdAt).toLocaleDateString('en-IN')})
                    </option>
                  ))}
                </select>
              )}

              {fetchingPaper && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
                  Fetching paper data...
                </div>
              )}
            </>
          )}

          {/* ── Source: Upload PDF ──────────────────────────────── */}
          {sourceMode === 'upload' && (
            <>
              {/* Subject Input */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Subject Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Data Structures"
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  disabled={analyzing}
                />
              </div>

              {/* Drop Zone */}
              <div
                className={`drop-zone ${dragOver ? 'drag-over' : ''} ${uploadedFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ marginBottom: '16px' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                {uploadedFile ? (
                  <div>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                    <p style={{ marginTop: '8px', fontWeight: 500, color: 'var(--success)' }}>
                      {uploadedFile.name}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Click to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '2rem', opacity: 0.5 }}>📄</span>
                    <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
                      Drag & drop a question paper PDF here, or click to browse
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      The AI will parse the paper and extract questions with Bloom's levels & COs
                    </p>
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              <button
                className="btn-primary"
                onClick={handleAnalyzePDF}
                disabled={!uploadedFile || analyzing}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '0.95rem',
                }}
              >
                {analyzing ? (
                  <><div className="spinner"></div> Analyzing Paper...</>
                ) : selectedPaper && sourceMode === 'upload' ? (
                  '🔄 Re-analyze Paper'
                ) : (
                  '⚡ Analyze Question Paper'
                )}
              </button>

              {analyzing && (
                <p style={{
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginTop: '12px',
                }}>
                  AI is reading the PDF and extracting questions with Bloom's levels & COs...
                </p>
              )}

              {analyzeError && (
                <div className="alert alert-error" style={{ marginTop: '12px' }}>
                  <span>⚠️</span> {analyzeError}
                </div>
              )}

              {/* Success indicator */}
              {selectedPaper && !analyzing && (
                <div className="alert alert-success" style={{ marginTop: '12px' }}>
                  <span>✅</span> Paper analyzed successfully — {selectedPaper.sections?.length || 0} sections, {selectedPaper.metadata?.max_marks || '?'} marks detected. Choose an analysis tool below.
                </div>
              )}
            </>
          )}
        </div>

        {/* Mode Cards — show after paper is available */}
        {hasPaper && (
          <div className="animate-slide-up" style={{ marginBottom: '28px' }}>
            <div className="analysis-tools-grid">
              {/* Card 1: Generate Charts */}
              <button
                className={`analysis-tool-card glass-card ${activeMode === 'charts' ? 'active' : ''}`}
                onClick={() => { setActiveMode('charts'); setValidationResult(null); setValidationError(''); }}
              >
                <div className="tool-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>📈</div>
                <h3>Generate Charts</h3>
                <p>View Bloom's Taxonomy distribution (K1–K6) and Course Outcome distribution as interactive charts</p>
                <span className="tool-tag">Instant • No AI needed</span>
              </button>

              {/* Card 2: Validate CO & Bloom's */}
              <button
                className={`analysis-tool-card glass-card ${activeMode === 'validate' ? 'active' : ''}`}
                onClick={() => { setActiveMode('validate'); }}
              >
                <div className="tool-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>🤖</div>
                <h3>Validate CO & Bloom's</h3>
                <p>Use AI to check if each question's Bloom level and Course Outcome are correctly assigned</p>
                <span className="tool-tag">AI-Powered • Uses Gemini</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Mode: Generate Charts ──────────────────────────────── */}
        {activeMode === 'charts' && selectedPaper && (
          <div className="animate-slide-up">
            <AnalysisCharts paper={selectedPaper} />
          </div>
        )}

        {/* ── Mode: Validate CO & Bloom's ────────────────────────── */}
        {activeMode === 'validate' && selectedPaper && (
          <div className="animate-slide-up">
            <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>
                    <span className="gradient-text">🤖 AI Validation</span>
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Gemini will analyze each question and verify Bloom level + CO correctness
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleValidate}
                  disabled={validating}
                  style={{ padding: '12px 28px', whiteSpace: 'nowrap' }}
                >
                  {validating ? (
                    <><div className="spinner"></div> Validating...</>
                  ) : validationResult ? (
                    '🔄 Re-validate'
                  ) : (
                    '⚡ Run Validation'
                  )}
                </button>
              </div>

              {validating && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}>
                  <div className="spinner-lg" style={{ borderTopColor: 'var(--accent)', margin: '0 auto 16px' }}></div>
                  <p>AI is analyzing each question's Bloom level and CO assignment...</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>This may take 15-30 seconds</p>
                </div>
              )}

              {validationError && (
                <div className="alert alert-error" style={{ marginTop: '12px' }}>
                  <span>⚠️</span> {validationError}
                </div>
              )}
            </div>

            {/* Validation Results */}
            {validationResult && !validating && (
              <div className="animate-slide-up">
                {/* Summary Bar */}
                <div className="glass-card" style={{
                  padding: '20px 24px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderLeft: `4px solid ${validationResult.overall_valid ? 'var(--success)' : 'var(--warning)'}`,
                }}>
                  <div>
                    <p style={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: validationResult.overall_valid ? 'var(--success)' : '#d97706',
                    }}>
                      {validationResult.overall_valid ? '✅ All assignments look correct!' : `⚠️ ${validationResult.issues_found} issue${validationResult.issues_found !== 1 ? 's' : ''} found`}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {validationResult.total_questions} questions analyzed
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'var(--success-bg)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                        {validationResult.total_questions - validationResult.issues_found}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Correct</div>
                    </div>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: validationResult.issues_found > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-input)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: validationResult.issues_found > 0 ? '#d97706' : 'var(--text-muted)' }}>
                        {validationResult.issues_found}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Issues</div>
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                {validationResult.summary && (
                  <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      AI Summary
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {validationResult.summary}
                    </p>
                  </div>
                )}

                {/* Corrections Table */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Detailed Question Analysis
                    </h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-input)' }}>
                          <th style={thStyle}>Q#</th>
                          <th style={{ ...thStyle, textAlign: 'left', minWidth: '200px' }}>Question</th>
                          <th style={thStyle}>Bloom</th>
                          <th style={thStyle}>Suggested</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}>CO</th>
                          <th style={thStyle}>Suggested</th>
                          <th style={thStyle}>Status</th>
                          <th style={{ ...thStyle, textAlign: 'left', minWidth: '150px' }}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.corrections.map((c, idx) => {
                          const hasIssue = !c.bloom_correct || !c.co_correct
                          return (
                            <tr key={idx} style={{
                              background: hasIssue ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                              borderBottom: '1px solid var(--border)',
                            }}>
                              <td style={tdStyle}>Q{c.question_id}-{c.sub_label}</td>
                              <td style={{ ...tdStyle, textAlign: 'left', maxWidth: '280px' }}>
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.question_text}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                <span className="validation-tag" style={{ background: c.bloom_correct ? '#e0f2fe' : '#fef3c7', color: c.bloom_correct ? '#0284c7' : '#92400e' }}>
                                  {c.current_bloom || '—'}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                {!c.bloom_correct ? (
                                  <span className="validation-tag" style={{ background: '#dcfce7', color: '#166534' }}>
                                    {c.suggested_bloom}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={tdStyle}>
                                {c.bloom_correct
                                  ? <span style={{ color: 'var(--success)' }}>✓</span>
                                  : <span style={{ color: '#d97706' }}>✗</span>
                                }
                              </td>
                              <td style={tdStyle}>
                                <span className="validation-tag" style={{ background: c.co_correct ? '#e0f2fe' : '#fef3c7', color: c.co_correct ? '#0284c7' : '#92400e' }}>
                                  CO{c.current_co || '?'}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                {!c.co_correct ? (
                                  <span className="validation-tag" style={{ background: '#dcfce7', color: '#166534' }}>
                                    CO{c.suggested_co}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={tdStyle}>
                                {c.co_correct
                                  ? <span style={{ color: 'var(--success)' }}>✓</span>
                                  : <span style={{ color: '#d97706' }}>✗</span>
                                }
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {c.bloom_reason || c.co_reason || '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Table cell styles ────────────────────────────────────────────
const thStyle = {
  padding: '10px 12px',
  textAlign: 'center',
  fontWeight: 600,
  color: '#475569',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 12px',
  textAlign: 'center',
  verticalAlign: 'middle',
}
