import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Tag } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { blogPosts, type BlogPost } from '../data/blogPosts'
import { SEOOverrideProvider } from '../hooks/useSEOOverride'
import { SEOConfig } from '../types/seo'

function getPostFromSlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}

function getArticleSEO(post: BlogPost): SEOConfig {
  return {
    title: `${post.title} – SafePsy Blog`,
    description: post.metaDescription,
    keywords: post.keywords,
    ogTitle: post.title,
    ogDescription: post.metaDescription,
    ogUrl: `/blog/${post.slug}`,
    twitterTitle: post.title,
    twitterDescription: post.metaDescription,
    twitterCard: 'summary_large_image',
    canonical: `/blog/${post.slug}`,
    type: 'article',
  }
}

/** Group consecutive table-line strings into rows. */
function parseTableLines(lines: string[]) {
  const rows: string[][] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('|')) break
    const cells = trimmed.split('|').filter((c) => c.trim())
    rows.push(cells)
  }
  return rows
}

function ArticleView({ post }: { post: BlogPost }) {
  const contentLines = post.content.split('\n')
  const paragraphs: React.ReactNode[] = []
  let i = 0

  while (i < contentLines.length) {
    const trimmed = contentLines[i].trim()

    // --- Tables: collect consecutive table lines, then render ---
    if (trimmed.startsWith('|') && trimmed.includes('|')) {
      const lines = [contentLines[i]]
      let j = i + 1
      while (j < contentLines.length && contentLines[j].trim().startsWith('|')) {
        lines.push(contentLines[j])
        j++
      }
      const rows = parseTableLines(lines)
      if (rows.length >= 2) {
        const headerCells = rows[0]
        const isSeparator = rows[1].every((c) => /^[-:\s]+$/.test(c))
        const dataRows = isSeparator ? rows.slice(2) : rows.slice(1)

        paragraphs.push(
          <div key={`table-${i}`} className="overflow-x-auto my-6 rounded-xl border border-border shadow-sm">
            <table className="min-w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="bg-gradient-to-r from-primary-600/10 to-secondary-600/10">
                  {headerCells.map((cell, ci) => (
                    <th
                      key={ci}
                      className="border-b border-border px-4 py-3 text-left font-bold text-heading whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl"
                    >
                      {cell.replace(/\*\*/g, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={ri % 2 === 0 ? 'bg-card' : 'bg-muted/30'}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`border-b border-border px-4 py-3 text-text-primary/90 ${
                          ci === 0 ? 'font-semibold text-heading whitespace-nowrap' : ''
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      i = j
      continue
    }

    // --- Headings ---
    if (trimmed.startsWith('## ')) {
      paragraphs.push(
        <h2 key={i} className="text-xl sm:text-2xl lg:text-3xl text-heading font-bold mt-10 mb-4">
          {trimmed.replace('## ', '')}
        </h2>
      )
      i++
      continue
    }
    if (trimmed.startsWith('### ')) {
      paragraphs.push(
        <h3 key={i} className="text-lg sm:text-xl text-heading font-semibold mt-8 mb-3">
          {trimmed.replace('### ', '')}
        </h3>
      )
      i++
      continue
    }

    // --- List items (group into <ul> or <ol>) ---
    if (trimmed.startsWith('- ')) {
      const listItems: React.ReactNode[] = []
      while (i < contentLines.length && contentLines[i].trim().startsWith('- ')) {
        listItems.push(
          <li key={i} className="ml-4 list-disc text-text-primary/90 leading-relaxed mb-1">
            {contentLines[i].trim().replace(/^- /, '')}
          </li>
        )
        i++
      }
      paragraphs.push(<ul key={`ul-${i}`} className="mb-6">{listItems}</ul>)
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: React.ReactNode[] = []
      while (i < contentLines.length && /^\d+\.\s/.test(contentLines[i].trim())) {
        listItems.push(
          <li key={i} className="ml-4 list-decimal text-text-primary/90 leading-relaxed mb-1">
            {contentLines[i].trim().replace(/^\d+\.\s/, '')}
          </li>
        )
        i++
      }
      paragraphs.push(<ol key={`ol-${i}`} className="mb-6">{listItems}</ol>)
      continue
    }

    // --- Code blocks (``` fenced) ---
    if (trimmed.startsWith('```')) {
      const lang = trimmed.replace('```', '').trim() || 'text'
      const codeLines: string[] = []
      let j = i + 1
      while (j < contentLines.length && !contentLines[j].trim().startsWith('```')) {
        codeLines.push(contentLines[j])
        j++
      }
      i = j + 1 // skip closing ```
      paragraphs.push(
        <div key={`code-${i}`} className="my-6 rounded-xl overflow-hidden border border-border shadow-sm">
          <div className="bg-muted/50 px-4 py-2 text-xs font-mono text-text-primary/50 border-b border-border">
            {lang}
          </div>
          <pre className="bg-[#0f172a] text-slate-200 p-4 sm:p-6 overflow-x-auto text-sm font-mono leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
      continue
    }

    // --- Paragraphs (group consecutive non-empty lines) ---
    if (trimmed) {
      const paraLines: string[] = []
      while (
        i < contentLines.length &&
        contentLines[i].trim() &&
        !contentLines[i].trim().startsWith('|') &&
        !contentLines[i].trim().startsWith('#') &&
        !contentLines[i].trim().startsWith('- ') &&
        !/^\d+\.\s/.test(contentLines[i].trim())
      ) {
        paraLines.push(contentLines[i].trim())
        i++
      }
      const paraText = paraLines.join(' ')
      paragraphs.push(
        <p key={i} className="text-text-primary/90 leading-relaxed mb-6">
          {paraText}
        </p>
      )
      continue
    }

    // --- Blank line ---
    i++
  }

  return (
    <article className="section-padding py-8 lg:py-12">
      <div className="container-max max-w-4xl">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-text-primary hover:text-primary-600 transition-colors mb-8 text-sm sm:text-base font-titillium"
          aria-label="Go back to blog list"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to all articles
        </button>

        <div className="text-center mb-8 sm:mb-12">
          <span
            className={`inline-block px-4 py-1.5 rounded-full text-xs sm:text-sm font-titillium font-semibold text-white mb-4 sm:mb-6 bg-gradient-to-r ${post.heroColor}`}
          >
            {post.category}
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-5xl text-heading leading-tight mb-4 sm:mb-6 font-bold px-2">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-text-primary/70 text-sm sm:text-base font-titillium">
            <span>{post.date}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>
        </div>

        <div className="space-y-2">{paragraphs}</div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {post.keywords.split(',').map((kw) => (
              <span
                key={kw.trim()}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm bg-muted text-text-primary/80 font-titillium"
              >
                <Tag className="w-3 h-3" />
                {kw.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function BlogListView() {
  const navigate = useNavigate()

  return (
    <div className="section-padding py-8 lg:py-12">
      <div className="container-max max-w-5xl">
        <div className="text-center mb-10 sm:mb-16 px-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-heading leading-tight mb-4">
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
              SafePsy Blog
            </span>
          </h1>
          <p className="text-base sm:text-lg text-text-primary/80 max-w-2xl mx-auto leading-relaxed">
            Expert articles on AI therapy, mental health data privacy, blockchain identity, and secure mental wellness tools.
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
          {blogPosts.map((post) => (
            <button
              key={post.slug}
              onClick={() => navigate(`/blog/${post.slug}`)}
              className="group text-left p-6 sm:p-8 rounded-2xl border border-border hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all duration-300 bg-card hover:scale-[1.02] active:scale-[0.98]"
              aria-label={`Read article: ${post.title}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-titillium font-semibold text-white bg-gradient-to-r ${post.heroColor}`}
                >
                  {post.category}
                </span>
                <span className="text-xs text-text-primary/60 font-titillium">{post.date}</span>
              </div>
              <h2 className="text-lg sm:text-xl text-heading font-bold leading-snug mb-3 group-hover:text-primary-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-sm sm:text-base text-text-primary/80 leading-relaxed mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-text-primary/60 font-titillium">
                <Clock className="w-3.5 h-3.5" />
                {post.readTime}
                <span className="text-primary-600 font-semibold ml-2 group-hover:translate-x-1 transition-transform">
                  Read more &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const Blog: React.FC = () => {
  const params = useParams()
  const slug = params.slug ?? null
  const post = slug ? getPostFromSlug(slug) : null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1" role="main" aria-label="Blog" tabIndex={-1}>
        {post ? (
          <SEOOverrideProvider config={getArticleSEO(post)}>
            <ArticleView post={post} />
          </SEOOverrideProvider>
        ) : (
          <BlogListView />
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Blog