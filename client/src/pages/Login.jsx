import LoginForm from '../components/LoginForm'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <main className="bg-grid" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
    }}>
      <LoginForm />
    </main>
  )
}