import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import LoadingScreen from '../components/ui/LoadingScreen';
import KoiPond from '../components/ui/KoiPond';
import WaveDivider from '../components/ui/WaveDivider';

const HeroSection = lazy(() => import('../sections/HeroSection'));
const MenuSection = lazy(() => import('../sections/MenuSection'));
const AboutSection = lazy(() => import('../sections/AboutSection'));
const FoodTruckSection = lazy(() => import('../sections/FoodTruckSection'));
const GallerySection = lazy(() => import('../sections/GallerySection'));
const ContactSection = lazy(() => import('../sections/ContactSection'));
const SEO = lazy(() => import('../components/layout/SEO'));

function SectionFallback() {
  return <div style={{ minHeight: '200px' }} aria-hidden="true" />;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  const handleLoadComplete = useCallback(() => setLoading(false), []);

  useEffect(() => {
    if (loading) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, [loading]);

  if (loading) {
    return <LoadingScreen onComplete={handleLoadComplete} />;
  }

  return (
    <>
      <Suspense fallback={null}>
        <SEO />
      </Suspense>

      <KoiPond />

      <div className="site-content">
        <Navbar />

        <main id="main-content">
          <Suspense fallback={<SectionFallback />}>
            <HeroSection />
          </Suspense>

          <WaveDivider flip color="var(--black)" />

          <Suspense fallback={<SectionFallback />}>
            <AboutSection />
          </Suspense>

          <WaveDivider color="var(--cream)" />

          <Suspense fallback={<SectionFallback />}>
            <GallerySection />
          </Suspense>

          <WaveDivider flip color="var(--black)" />

          <Suspense fallback={<SectionFallback />}>
            <FoodTruckSection />
          </Suspense>

          <WaveDivider color="var(--cream)" />

          <Suspense fallback={<SectionFallback />}>
            <MenuSection />
          </Suspense>

          <Suspense fallback={<SectionFallback />}>
            <ContactSection />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
}
