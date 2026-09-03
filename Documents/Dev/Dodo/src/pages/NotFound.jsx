import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <h1 className="error-title">Page non trouvée</h1>
      <p className="error-text">
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
    </div>
  )
}