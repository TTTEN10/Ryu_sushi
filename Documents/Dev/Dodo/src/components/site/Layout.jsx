import Header from './Header'
import Footer from './Footer'
import ScrollToTop from '../ScrollToTop'

export default function Layout({ children }) {
  return (
    <>
      <ScrollToTop />
      <Header />
      {children}
      <Footer />
    </>
  )
}