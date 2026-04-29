export default function PaperPreview({ paper }) {
  if (!paper) return null

  const meta = paper.metadata || {}
  const sections = paper.sections || []
  const instructions = paper.instructions || []

  const collegeName = meta.exam || 'GL Bajaj Institute of Technology and Management'
  const examTitle = meta.exam || 'Examination'
  const subjectName = meta.subject || paper.subject || 'N/A'
  const subjectCode = meta.subject_code || ''
  const duration = meta.duration || '3 Hours'
  const maxMarks = meta.max_marks || paper.totalMarks || 0

  const renderQuestionRows = (q) => {
    const rows = []

    if (q.type === 'single' && q.subquestions?.length > 0) {
      const sq = q.subquestions[0]
      rows.push(
        <tr key={`q-${q.question_id}`}>
          <td className="col-qno">{q.question_id}</td>
          <td className="col-question">{sq.text}</td>
          <td className="col-marks">{q.marks}</td>
          <td className="col-co">{sq.co ? `CO${sq.co}` : '-'}</td>
        </tr>
      )
    } else if (q.type === 'subparts' && q.subquestions?.length > 0) {
      q.subquestions.forEach((sq, idx) => {
        rows.push(
          <tr key={`q-${q.question_id}-${sq.label || idx}`}>
            <td className="col-qno">{idx === 0 ? q.question_id : ''}</td>
            <td className="col-question">
              <span className="sub-label">({sq.label || String.fromCharCode(97 + idx)})</span> {sq.text}
            </td>
            <td className="col-marks">{sq.marks}</td>
            <td className="col-co">{sq.co ? `CO${sq.co}` : '-'}</td>
          </tr>
        )
      })
    } else if (q.type === 'choice_group') {
      // Use options as primary source; fall back to subquestions
      const items = (q.options?.length > 0) ? q.options : (q.subquestions || [])
      items.forEach((opt, idx) => {
        // Add OR divider between options
        if (idx > 0) {
          rows.push(
            <tr key={`q-${q.question_id}-or-${idx}`} className="or-row">
              <td className="col-qno"></td>
              <td colSpan={3} className="or-cell"><strong>OR</strong></td>
            </tr>
          )
        }
        rows.push(
          <tr key={`q-${q.question_id}-opt-${opt.label || idx}`}>
            <td className="col-qno">{idx === 0 ? q.question_id : ''}</td>
            <td className="col-question">
              <span className="sub-label">({opt.label || String.fromCharCode(97 + idx)})</span> {opt.text}
            </td>
            <td className="col-marks">{opt.marks || q.marks}</td>
            <td className="col-co">{opt.co ? `CO${opt.co}` : '-'}</td>
          </tr>
        )
      })
    }

    return rows
  }

  return (
    <div className="paper-preview animate-slide-up">
      {/* Header */}
      <div className="paper-header">
        <h1>{collegeName}</h1>
        <h2>{examTitle}</h2>
        <h3 style={{ fontWeight: 600 }}>{subjectName}{subjectCode ? ` (${subjectCode})` : ''}</h3>
      </div>

      {/* Roll Number */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <div style={{
          border: '1px solid #000',
          padding: '4px 40px 4px 8px',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          Roll No. ______________
        </div>
      </div>

      {/* Meta */}
      <div className="paper-meta">
        <div>
          <p><strong>Subject:</strong> {subjectName}</p>
          {subjectCode && <p><strong>Code:</strong> {subjectCode}</p>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p><strong>Time:</strong> {duration}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><strong>Max. Marks:</strong> {maxMarks}</p>
        </div>
      </div>

      {/* Instructions */}
      {instructions.length > 0 && (
        <div className="paper-instructions">
          <strong>General Instructions:</strong>
          <ol>
            {instructions.map((inst, i) => <li key={i}>{inst}</li>)}
          </ol>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.section_id} className="paper-section">
          {/* Section Header */}
          <div className="section-title-bar">
            <strong>SECTION {section.section_id}</strong>
            {section.title && ` — ${section.title}`}
          </div>

          {/* Custom Header Notes */}
          {(section.header_notes || section.description) && (
            <div className="section-notes-preview">
              {(section.header_notes || section.description).split('\n').map((line, i) => (
                <span key={i}>{line}{i < (section.header_notes || section.description).split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          )}

          {/* Marks scheme / attempt rule */}
          {(section.marks_scheme || section.attempt_rule) && (
            <div className="section-info">
              {section.marks_scheme}
              {section.marks_scheme && section.attempt_rule && ' | '}
              {section.attempt_rule}
            </div>
          )}

          {/* Question Table */}
          <table className="paper-table">
            <thead>
              <tr>
                <th className="col-qno">Q.No.</th>
                <th className="col-question">Question</th>
                <th className="col-marks">Marks</th>
                <th className="col-co">CO</th>
              </tr>
            </thead>
            <tbody>
              {section.questions?.map(renderQuestionRows)}
            </tbody>
          </table>
        </div>
      ))}

      {/* Footer */}
      <div className="paper-footer">
        Generated by SmartPaper •{' '}
        {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      </div>
    </div>
  )
}
