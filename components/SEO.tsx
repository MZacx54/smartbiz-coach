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
  keywords = 'SmartBiz Coach, Nigerian MSME POS, offline day-book, apprentice shift lock, SmartScore readiness score, BOI business plan generator, Gbege Book debt recovery, Paystack storefront Nigeria, CAC checklist Nigeria, SME grants 2026',
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
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'All (Web & Mobile, PWA)',
        'description': 'The practical Business Operating System built for Nigerian MSMEs. Features offline-capable counter POS, SmartScore 300-850 readiness metrics, Product Catalog Studio, WhatsApp debt recovery, digital storefronts, tax & CAC guides, and 3-year business plans.',
        'image': 'https://www.smartbizcoach.com.ng/logo-square.png',
        'offers': [
          {
            '@type': 'Offer',
            'name': 'Core Free Tier (POS, Day-Book, Debt Ledger, Personal Storefront)',
            'price': '0',
            'priceCurrency': 'NGN',
            'availability': 'https://schema.org/InStock'
          },
          {
            '@type': 'Offer',
            'name': 'Micro Pack (50 BizCredits)',
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
        '@type': 'Organization',
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
            'url': 'https://www.smartbizcoach.com.ng/contact',
            'areaServed': 'NG',
            'availableLanguage': ['English', 'Pidgin']
          },
          {
            '@type': 'ContactPoint',
            'contactType': 'partnerships',
            'email': 'partners@smartbizcoach.com.ng',
            'url': 'https://www.smartbizcoach.com.ng/contact',
            'areaServed': 'NG',
            'availableLanguage': ['English']
          },
          {
            '@type': 'ContactPoint',
            'contactType': 'administrative',
            'email': 'admin@smartbizcoach.com.ng',
            'areaServed': 'NG',
            'availableLanguage': ['English']
          }
        ],
        'sameAs': [
          'https://www.facebook.com/profile.php?id=61580131486753',
          'https://www.instagram.com/smartbizcoach1/'
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
      <meta name="ai-entity-definition" content="SmartBiz Coach is a Business Operating System and Digital Storefront platform for Nigerian MSMEs. Core tools include an offline-capable Day-Book POS, staff shift lock, Product Catalog Studio, Gbege Book debt recovery via WhatsApp, BOI-ready 3-year business plans, CAC formalization guides, and SmartScore 300-850 readiness metrics." />
      <meta name="ai-content-declarations" content="MSME Business Operating System, POS & Inventory Management, Digital Commerce" />
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
