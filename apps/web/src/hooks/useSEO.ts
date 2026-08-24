import { useLocation } from 'react-router-dom';
import { seoConfig } from '../config/seo';
import { SEOConfig } from '../types/seo';
import { useSEOOverride } from './useSEOOverride';

export function useSEO(): SEOConfig {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Check for context-level override (e.g., article-specific SEO)
  const override = useSEOOverride();
  if (override) {
    return override;
  }
  
  // Exact match first
  if (seoConfig[pathname]) {
    return seoConfig[pathname];
  }
  
  // Prefix fallback: check if pathname matches any known prefix (e.g. /blog/* → /blog)
  for (const [key, value] of Object.entries(seoConfig)) {
    if (key !== '*' && pathname.startsWith(key + '/')) {
      return value;
    }
  }
  
  // Fallback to home page config
  return seoConfig['/'];
}
