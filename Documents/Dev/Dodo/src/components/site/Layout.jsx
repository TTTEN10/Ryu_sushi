import Header from './Header'
import Footer from './Footer'

export default function Layout({ children }) {
  return (
    <>
      <a href="#main-content" className="skip-link">Aller au contenu principal</a>
      <Header />
      <main id="main-content" role="main">
        {children}
      </main>
      <Footer />
    </>
  )
}