/**
 * Utility functions for image optimization
 */

/**
 * Lazy load images using Intersection Observer
 * Usage: Add data-src to img tags and call lazyLoadImages() on component mount
 */
export function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target as HTMLImageElement;
                img.src = img.dataset.src || '';
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

/**
 * Compress image before upload
 * @param file - Image file to compress
 * @param maxWidth - Maximum width (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed blob
 */
export async function compressImage(
    file: File,
    maxWidth: number = 1920,
    quality: number = 0.8
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Compression failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => reject(new Error('Image load failed'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}

/**
 * Convert file to WebP format (better compression)
 * @param file - Image file
 * @param quality - WebP quality 0-1
 * @returns WebP blob
 */
export async function convertToWebP(
    file: File,
    quality: number = 0.85
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('WebP conversion failed'));
                        }
                    },
                    'image/webp',
                    quality
                );
            };

            img.onerror = () => reject(new Error('Image load failed'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}

/**
 * Get optimized image dimensions while maintaining aspect ratio
 */
export function getOptimizedDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }

    if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Preload critical images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
    return Promise.all(
        urls.map(url => {
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(`Failed to load: ${url}`));
                img.src = url;
            });
        })
    );
}
