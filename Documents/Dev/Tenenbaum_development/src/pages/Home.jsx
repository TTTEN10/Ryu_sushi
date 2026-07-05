import Seo from "../components/layout/Seo";
import Hero from "../components/sections/Hero";
import Services from "../components/sections/Services";
import WhyChooseUs from "../components/sections/WhyChooseUs";
import Methodology from "../components/sections/Methodology";
import CaseStudies from "../components/sections/CaseStudies";
import Testimonials from "../components/sections/Testimonials";
import ContactCta from "../components/sections/ContactCta";
import { SITE } from "../constants/site";

/** Marketing home page — composes every section in the prescribed order. */
export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE.legalName,
    description: SITE.description,
    url: SITE.url,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.line1,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.zip,
      addressCountry: SITE.address.country,
    },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  };

  return (
    <>
      <Seo path="/" jsonLd={jsonLd} />
      <Hero />
      <Services />
      <WhyChooseUs />
      <Methodology />
      <CaseStudies />
      <Testimonials />
      <ContactCta />
    </>
  );
}
