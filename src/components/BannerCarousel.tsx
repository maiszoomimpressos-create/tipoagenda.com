import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel, { EmblaCarouselType } from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { getGlobalBanners, type Banner } from '@/services/bannerService';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import Autoplay from 'embla-carousel-autoplay'; 

// Configuration for the carousel display
const BannerCarousel: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: false })]);
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGlobalBanners();
      // Filter only active banners and sort by display_order
      const activeBanners = data.filter(b => b.is_active).sort((a, b) => a.display_order - b.display_order);
      setBanners(activeBanners);
    } catch (error: any) {
      console.error('Error fetching global banners:', error);
      showError('Erro ao carregar banners: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-10 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null; // Don't render if no active banners
  }

  return (
    <section className="bg-gray-100">
      <div className="container mx-auto px-6">
        <div className="embla relative">
          <div className="embla__viewport overflow-hidden rounded-xl shadow-lg" ref={emblaRef}>
            <div className="embla__container flex touch-pan-y ml-[-1rem]">
              {banners.map((banner, index) => (
                <div className="embla__slide flex-shrink-0 w-full pl-4" key={banner.id}>
                  <a 
                    href={banner.link_url || '#'} 
                    target={banner.link_url ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="block relative h-64 bg-gray-200 overflow-hidden group"
                  >
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
                        <ImageIcon className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-6">
                      <h3 className="text-2xl font-bold text-white drop-shadow-md">{banner.title}</h3>
                      {banner.description && (
                        <p className="text-sm text-gray-200 drop-shadow-sm">{banner.description}</p>
                      )}
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          {banners.length > 1 && (
            <>
              <Button
                className="absolute top-1/2 left-0 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full shadow-md"
                onClick={scrollPrev}
                disabled={prevBtnDisabled && !emblaApi?.canScrollPrev()}
                size="icon"
              >
                <ArrowLeft className="h-5 w-5 text-gray-800" />
              </Button>
              <Button
                className="absolute top-1/2 right-0 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full shadow-md"
                onClick={scrollNext}
                disabled={nextBtnDisabled && !emblaApi?.canScrollNext()}
                size="icon"
              >
                <ArrowRight className="h-5 w-5 text-gray-800" />
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;