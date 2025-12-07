import ChatWidget from './ChatWidget';
import Header from './Header';
import Footer from './Footer';
import DIDTokenVisualization from './DIDTokenVisualization';
import DIDManager from './DIDManager';

export default function Testing() {


  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="AI Therapy Chat" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4 fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold stagger-item">
                  Chat with Dr. Safe
                </span>
              </h1>
            </div>

            {/* DID Token Visualization */}
            <div className="mb-8 sm:mb-12 fade-in">
              <DIDTokenVisualization />
            </div>

            {/* DID Manager */}
            <div className="mb-8 sm:mb-12 fade-in">
              <DIDManager />
            </div>

            {/* Chat Widget Section */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 fade-in card-hover">
              <ChatWidget />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

