import { useState } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

export default function QuestionBankPage() {
  const { api } = useAuth()
  const [activeTab, setActiveTab] = useState('search') // 'search' or 'add'

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSubject, setSearchSubject] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Add State
  const [addForm, setAddForm] = useState({ text: '', subject: '', marks: 5, difficulty: 'medium', topic: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [addMessage, setAddMessage] = useState({ type: '', text: '' })

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchError('Please enter a search term')
      return
    }

    setIsSearching(true)
    setSearchError('')
    
    try {
      const params = new URLSearchParams({ query: searchQuery })
      if (searchSubject) params.append('subject', searchSubject)
      
      const { data } = await api.get(`/questions/search?${params.toString()}`)
      
      if (data.success) {
        setSearchResults(data.results || [])
      } else {
        throw new Error(data.error || 'Failed to search')
      }
    } catch (err) {
      setSearchError(err.response?.data?.error || err.message || 'An error occurred while searching')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddQuestion = async (e) => {
    e.preventDefault()
    
    if (!addForm.text.trim() || !addForm.subject.trim()) {
      setAddMessage({ type: 'error', text: 'Question text and subject are required.' })
      return
    }

    setIsAdding(true)
    setAddMessage({ type: '', text: '' })

    try {
      const { data } = await api.post('/questions/add', {
        questions: [addForm]
      })

      if (data.success) {
        setAddMessage({ type: 'success', text: `Successfully added question to the bank!` })
        setAddForm({ ...addForm, text: '', topic: '' }) // Keep subject/marks/diff for faster data entry
      } else {
        throw new Error(data.error || 'Failed to add question')
      }
    } catch (err) {
      setAddMessage({ type: 'error', text: err.response?.data?.error || err.message || 'An error occurred while adding the question' })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }} className="bg-grid">
      <Navbar />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.03em' }}>
            <span className="gradient-text">Question Bank</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Manage the vector store for RAG memory
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          backgroundColor: 'var(--bg-card)', 
          padding: '4px', 
          borderRadius: '12px', 
          marginBottom: '24px',
          border: '1px solid var(--border)' 
        }}>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '8px',
              backgroundColor: activeTab === 'search' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'search' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
            }}
          >
            🔍 Search Questions
          </button>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '8px',
              backgroundColor: activeTab === 'add' ? 'var(--success)' : 'transparent',
              color: activeTab === 'add' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
            }}
          >
            ➕ Add Question
          </button>
        </div>

        <div className="glass-card animate-slide-up" style={{ padding: '32px', minHeight: '400px' }}>
          
          {/* SEARCH TAB */}
          {activeTab === 'search' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
                Search Vector Store
              </h2>
              
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search queries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 2 }}
                />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Subject (optional)"
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary" disabled={isSearching} style={{ whiteSpace: 'nowrap' }}>
                  {isSearching ? <div className="spinner"></div> : 'Search'}
                </button>
              </form>

              {searchError && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  {searchError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {searchResults.length === 0 && !isSearching && !searchError && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                    Enter a query to search the AI question bank.
                  </p>
                )}
                
                {searchResults.map((result, idx) => (
                  <div key={idx} style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--bg-input)', 
                    border: '1px solid var(--border)' 
                  }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.5' }}>
                      {result.text}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {result.subject && <span className="badge">📘 {result.subject}</span>}
                      {result.topic && <span className="badge">📑 {result.topic}</span>}
                      {result.difficulty && <span className="badge">🎯 {result.difficulty}</span>}
                      {result.marks && <span className="badge">⭐ {result.marks} Marks</span>}
                      {result.score && <span className="badge" style={{ opacity: 0.7 }}>Dist: {result.score.toFixed(3)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD TAB */}
          {activeTab === 'add' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
                Add to Question Bank
              </h2>

              {addMessage.text && (
                <div className={`alert alert-${addMessage.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '20px' }}>
                  {addMessage.text}
                </div>
              )}

              <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Question Text *</label>
                  <textarea 
                    className="input-field" 
                    rows="4"
                    placeholder="E.g., Explain the difference between process and thread."
                    value={addForm.text}
                    onChange={(e) => setAddForm({...addForm, text: e.target.value})}
                    required
                  ></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                  <div>
                    <label className="form-label">Subject *</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g., Operating Systems"
                      value={addForm.subject}
                      onChange={(e) => setAddForm({...addForm, subject: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Topic <span style={{color: 'var(--text-muted)'}}>(Optional)</span></label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g., Concurrency"
                      value={addForm.topic}
                      onChange={(e) => setAddForm({...addForm, topic: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                  <div>
                    <label className="form-label">Difficulty</label>
                    <select 
                      className="input-field"
                      value={addForm.difficulty}
                      onChange={(e) => setAddForm({...addForm, difficulty: e.target.value})}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Marks Evaluated</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      min="1"
                      max="100"
                      value={addForm.marks}
                      onChange={(e) => setAddForm({...addForm, marks: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ marginTop: '16px', backgroundColor: 'var(--success)' }}
                  disabled={isAdding}
                >
                  {isAdding ? <><div className="spinner"></div> Saving...</> : 'Save to Vector Store'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
