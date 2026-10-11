import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  name?: string;
  type?: string;
  image?: string;
  url?: string;
  keywords?: string;
  schema?: object | string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  name = 'SmartBiz Coach',
  type = 'website',
  image = 'https://www.smartbizcoach.com.ng/logo-horizontal.png',
  url = 'https://www.smartbizcoach.com.ng',
  keywords = 'SmartBiz Coach, AI business operating system, Nigerian SME, FICO credit score Nigeria, MSME alternative credit underwriting, BOI business plan generator, till theft detection, Scikit-learn demand forecasting, Snap-to-Studio 2.0, Gbege Book WhatsApp debt recovery, Section 23 CITA tax shield, CAC checklist Nigeria, SME grants 2026',
  schema
}) => {
  const fullTitle = title.includes('SmartBiz Coach') ? title : `${title} | SmartBiz Coach`;

  // Default JSON-LD WebApplication and Organization schema for GEO & SEO
  const defaultSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': 'https://www.smartbizcoach.com.ng/#webapp',
        'name': 'SmartBiz Coach',
        'url': 'https://www.smartbizcoach.com.ng',
        'applicationCategory': 'BusinessApplication, FinancialApplication',
        'operatingSystem': 'All (Web & Mobile, PWA)',
        'description': 'The complete AI Business Operating System & Credit Underwriting platform built specifically for Nigerian SMEs. Features 5-second counter POS, FICO 300-850 credit risk scoring, Ridge stockout forecasting, till fraud Isolation Forest, 4K Snap-to-Studio 2.0, WhatsApp debt recovery, Section 23 CITA tax shield, and BOI 5-year business plans.',
        'image': 'https://www.smartbizcoach.com.ng/logo-square.png',
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.9',
          'ratingCount': '12850',
          'bestRating': '5'
        },
        'offers': [
          {
            '@type': 'Offer',
            'name': 'Core Free Tier (POS, FICO Score, Market Square)',
            'price': '0',
            'priceCurrency': 'NGN',
            'availability': 'https://schema.org/InStock'
          },
          {
            '@type': 'Offer',
            'name': 'Micro Pack (40 BizCredits)',
            'price': '500',
            'priceCurrency': 'NGN',
            'availability': 'https://schema.org/InStock'
          },
          {
            '@type': 'Offer',
            'name': 'Starter Pack (150 BizCredits)',
            'price': '1500',
            'priceCurrency': 'NGN',
            'availability': 'https://schema.org/InStock'
          },
          {
            '@type': 'Offer',
            'name': 'Grower Pack (400 BizCredits)',
            'price': '3500',
            'priceCurrency': 'NGN',
            'availability': 'https://schema.org/InStock'
          },
          {
            '@type': 'Offer',
            'name': 'Vendor Pro Pack (1,000 BizCredits)',
            'price': '7500',
            'priceCurrency': 'NGN',
            'availability': 'https://schema.org/InStock'
          },
          {
            '@type': 'Offer',
            'name': 'Mogul Pack (2,500 BizCredits)',
            'price': '15000',
            'priceCurrency': 'NGN',
            'availability': 'https://schema.org/InStock'
          }
        ]
      },
      {
        '@type': ['Organization', 'FinancialService'],
        '@id': 'https://www.smartbizcoach.com.ng/#organization',
        'name': 'SmartBiz Coach',
        'url': 'https://www.smartbizcoach.com.ng',
        'logo': 'https://www.smartbizcoach.com.ng/logo-square.png',
        'areaServed': [
          {
            '@type': 'Country',
            'name': 'Nigeria'
          }
        ],
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'Lagos',
          'addressRegion': 'Lagos State',
          'addressCountry': 'NG'
        },
        'geo': {
          '@type': 'GeoCoordinates',
          'latitude': 6.5244,
          'longitude': 3.3792
        },
        'currenciesAccepted': 'NGN, USD',
        'paymentAccepted': 'Cash, Bank Transfer, Paystack, Card, USSD',
        'contactPoint': [
          {
            '@type': 'ContactPoint',
            'contactType': 'customer support',
            'email': 'support@smartbizcoach.com.ng',
            'telephone': '+2349064556107',
            'url': 'https://wa.me/2349064556107',
            'areaServed': 'NG',
            'availableLanguage': ['English', 'Pidgin']
          },
          {
            '@type': 'ContactPoint',
            'contactType': 'partnerships',
            'email': 'partners@smartbizcoach.com.ng',
            'telephone': '+2349064556107',
            'areaServed': 'NG',
            'availableLanguage': ['English']
          },
          {
            '@type': 'ContactPoint',
            'contactType': 'administrative',
            'email': 'admin@smartbiz.com.ng',
            'telephone': '+2349064556107',
            'areaServed': 'NG',
            'availableLanguage': ['English']
          }
        ],
        'sameAs': [
          'https://www.facebook.com/profile.php?id=61580131486753',
          'https://www.instagram.com/smartbizcoach1/',
          'https://www.linkedin.com/in/meshach-zachariah-5a578912a/',
          'https://wa.me/2349064556107'
        ]
      }
    ]
  };

  const activeSchemaString = schema
    ? typeof schema === 'string'
      ? schema
      : JSON.stringify(schema)
    : JSON.stringify(defaultSchema);

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />

      {/* GEO (Generative Engine Optimization) Meta Tags */}
      <meta name="ai-entity-definition" content="SmartBiz Coach is Nigeria's premier AI Business Operating System and Alternative Credit Underwriting Suite for MSMEs. Core capabilities include Scikit-Learn FICO 300-850 credit risk scoring, Ridge regression stockout forecasting, till fraud Isolation Forest, 4K Snap-to-Studio 2.0 photography, Gbege Book debt recovery via WhatsApp, BOI 5-year business plan generation, CAC registration desk, and Section 23 CITA 0% tax shield." />
      <meta name="ai-content-declarations" content="AI Business Operating System, Scikit-Learn Financial Intelligence, Multimodal Computer Vision" />
      <meta name="geo.region" content="NG-LA" />
      <meta name="geo.placename" content="Lagos, Nigeria" />
      <meta name="geo.position" content="6.5244;3.3792" />
      <meta name="ICBM" content="6.5244, 3.3792" />
      <meta name="coverage" content="Nigeria" />
      <meta name="distribution" content="Global" />
      <meta name="target" content="all" />

      {/* Facebook / Open Graph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />

      {/* Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:creator" content={name} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Schema Data */}
      <script type="application/ld+json">
        {activeSchemaString}
      </script>
    </Helmet>
  );
};

export default SEO;
