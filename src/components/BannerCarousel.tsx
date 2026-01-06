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
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Embla Carousel setup with Autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'center',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
  }, [Autoplay({ delay: 7000, stopOnInteraction: false, playOnInit: true })]);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGlobalBanners();
      // Ensure we have enough banners for the visual effect (at least 7, though loop helps)
      if (data.length === 0) {
        setBanners([]);
        return;
      }
      setBanners(data.sort((a, b) => a.display_order - b.display_order));
    } catch (error: any) {
      console.error('Error fetching global banners:', error);
      showError('Erro ao carregar banners: ' + error.message);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null; // Do not render if no banners exist
  }

  // Helper function to determine the visual size class based on index relative to the center
  const getSlideClasses = (index: number) => {
    if (!emblaApi) return 'w-1/7';

    // Calculate the distance from the selected (center) index, considering loop
    const selectedSnapIndex = emblaApi.selectedScrollSnap();
    let relativeIndex = index - selectedSnapIndex;

    // Handle loop wrapping
    if (relativeIndex > banners.length / 2) {
        relativeIndex -= banners.length;
    } else if (relativeIndex < -banners.length / 2) {
        relativeIndex += banners.length;
    }

    const absIndex = Math.abs(relativeIndex);

    // Apply classes based on distance from center (0)
    if (absIndex === 0) {
      return 'w-[40%] md:w-[30%] lg:w-[25%] xl:w-[20%] h-96 transition-all duration-500 z-10 shadow-xl'; // Center (Large)
    } else if (absIndex === 1) {
      return 'w-[20%] md:w-[15%] lg:w-[12%] xl:w-[10%] h-80 transition-all duration-500 z-5 shadow-lg opacity-80'; // 1st Flank (Medium)
    } else if (absIndex === 2) {
      return 'w-[10%] md:w-[8%] lg:w-[6%] xl:w-[5%] h-64 transition-all duration-500 z-2 shadow-md opacity-60'; // 2nd Flank (Small)
    } else {
      return 'w-[5%] md:w-[4%] lg:w-[3%] xl:w-[2%] h-48 transition-all duration-500 z-0 opacity-40'; // 3rd Flank (Tiny/Hidden)
    }
  };

  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Destaques e Promoções</h2>
        
        <div className="relative">
          <div className="embla overflow-hidden" ref={emblaRef}>
            <div className="embla__container flex items-center justify-center h-[400px]">
              {banners.map((banner, index) => (
                <div 
                  className={`embla__slide flex-shrink-0 mx-2 rounded-xl overflow-hidden cursor-pointer relative ${getSlideClasses(index)}`}
                  key={banner.id}
                  onClick={() => {
                    if (banner.link_url) window.open(banner.link_url, '_blank');
                  }}
                >
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-end p-4 transition-opacity duration-300 hover:opacity-0">
                    <div className="text-white">
                      <h3 className="text-xl font-bold">{banner.title}</h3>
                      {banner.description && <p className="text-sm">{banner.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollPrev}
            className="absolute top-1/2 left-4 transform -translate-y-1/2 z-20 bg-white/70 hover:bg-white rounded-full shadow-lg"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollNext}
            className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20 bg-white/70 hover:bg-white rounded-full shadow-lg"
          >
            <ArrowRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;