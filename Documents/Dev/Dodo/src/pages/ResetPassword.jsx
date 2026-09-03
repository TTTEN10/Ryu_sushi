import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../lib/AuthContext'
import Alert from '../components/ui/Alert'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e) => {
    setEmail(e.target.value)
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('L\'email est requis')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('L\'email n\'est pas valide')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await resetPassword(email)
      setIsSubmitted(true)
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Réinitialiser le mot de passe"
      subtitle="Entrez votre email pour recevoir un lien de réinitialisation"
    >
      {isSubmitted ? (
        <div className="auth-success">
          <Alert variant="success">
            Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
            Veuillez vérifier votre boîte de réception.
          </Alert>
          <button
            onClick={() => {
              setIsSubmitted(false)
              setEmail('')
            }}
            className="btn btn-secondary btn-full"
          >
            Envoyer un autre email
          </button>
        </div>
      ) : (
        <>
          {error && (
            <Alert variant="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleChange}
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="votre@email.com"
                autoComplete="email"
                autoFocus
              />
              {error && <span className="form-error">{error}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>
          </form>

          <p className="auth-footer">
            Vous vous souvenez de votre mot de passe ?{' '}
            <Link to="/login" className="auth-link">
              Se connecter
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}