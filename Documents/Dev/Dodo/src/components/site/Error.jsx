import { Link, useRouteError } from 'react-router-dom'

export default function Error() {
  const error = useRouteError()

  return (
    <div className="error-page">
      <div className="error-code">500</div>
      <h1 className="error-title">Oups ! Une erreur est survenue</h1>
      <p className="error-text">
        {error?.statusText || error?.message || 'Désolé, une erreur inattendue s\'est produite.'}
      </p>
      <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
    </div>
  )
}