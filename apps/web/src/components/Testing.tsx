import ChatWidget from './ChatWidget';
import Header from './Header';
import Footer from './Footer';

export default function Testing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="AI chat" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            <div className="text-center mb-8 sm:mb-10 px-4 fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold stagger-item">
                  Chat with Dr. Safe
                </span>
              </h1>
            </div>

            {/* Chat */}
            <div className="bg-white/80 dark:bg-neutral-950/40 backdrop-blur rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-neutral-200 dark:border-white/10 mb-8 sm:mb-10 fade-in">
              <ChatWidget />
            </div>

            {/* Steps (below chat) */}
            <div className="max-w-3xl mx-auto px-4 mb-10 sm:mb-14 fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl border border-primary-300 dark:border-primary-700 bg-primary-50/70 dark:bg-primary-900/20">
                  <p className="text-heading font-semibold">Step 1</p>
                  <p className="text-body">Start chatting</p>
                </div>
                <div className="p-4 rounded-2xl border border-secondary-300 dark:border-secondary-700 bg-secondary-50/70 dark:bg-secondary-900/20">
                  <p className="text-heading font-semibold">Step 2</p>
                  <p className="text-body">Connect wallet</p>
                </div>
                <div className="p-4 rounded-2xl border border-accent-300 dark:border-accent-700 bg-accent-50/70 dark:bg-accent-900/20">
                  <p className="text-heading font-semibold">Step 3</p>
                  <p className="text-body">Keep sessions securely</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

