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
    schema?: string;
}

const SEO: React.FC<SEOProps> = ({
    title,
    description,
    name = 'SmartBiz Coach',
    type = 'website',
    image = '/og-image.jpg', // Assuming we'll add an OG image later
    url = 'https://www.smartbizcoach.com.ng',
    keywords = 'SmartBiz Coach, business coach, Nigerian SME, AI business tools, entrepreneur, business growth',
    schema
}) => {
    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{title} | SmartBiz Coach</title>
            <meta name='description' content={description} />
            <meta name='keywords' content={keywords} />
            <link rel="canonical" href={url} />

            {/* Facebook tags */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter tags */}
            <meta name="twitter:creator" content={name} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />

            {/* Structured Schema Data */}
            {schema && (
                <script type="application/ld+json">
                    {schema}
                </script>
            )}
        </Helmet>
    );
}

export default SEO;
