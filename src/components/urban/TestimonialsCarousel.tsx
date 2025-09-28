import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Quote, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import Autoplay from "embla-carousel-autoplay";

interface Testimonial {
  id: number;
  name: string;
  title: string;
  organization: string;
  location: string;
  content: string;
  rating: number;
  avatar: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Dr. Sarah Chen",
    title: "Urban Planning Director",
    organization: "Singapore Smart Nation Initiative",
    location: "Singapore",
    content: "This platform revolutionizes how we monitor urban health. The real-time satellite data integration with AI insights helps us make data-driven decisions for over 5 million residents.",
    rating: 5,
    avatar: "SC"
  },
  {
    id: 2,
    name: "Miguel Rodriguez",
    title: "Senior City Planner",
    organization: "Barcelona Urban Lab",
    location: "Barcelona, Spain",
    content: "The comprehensive environmental quality monitoring has been instrumental in our sustainability initiatives. We've reduced urban heat islands by 15% using these insights.",
    rating: 5,
    avatar: "MR"
  },
  {
    id: 3,
    name: "Prof. Amara Okafor",
    title: "Urban Sustainability Researcher",
    organization: "University of Cape Town",
    location: "Cape Town, South Africa",
    content: "Exceptional platform for academic research. The integration of multiple urban health indices provides unprecedented insights into city resilience and social well-being patterns.",
    rating: 5,
    avatar: "AO"
  },
  {
    id: 4,
    name: "David Kim",
    title: "Smart Cities Coordinator",
    organization: "Seoul Metropolitan Government",
    location: "Seoul, South Korea",
    content: "The disaster preparedness analytics have been game-changing. We can now predict and prepare for environmental risks with 85% accuracy, protecting millions of citizens.",
    rating: 5,
    avatar: "DK"
  },
  {
    id: 5,
    name: "Dr. Elena Petrov",
    title: "Climate Resilience Officer",
    organization: "Amsterdam Municipality",
    location: "Amsterdam, Netherlands",
    content: "Outstanding air quality monitoring capabilities. The AI-powered recommendations helped us implement targeted policies that improved air quality by 22% in key districts.",
    rating: 5,
    avatar: "EP"
  },
  {
    id: 6,
    name: "James Thompson",
    title: "Urban Analytics Manager",
    organization: "Transport for London",
    location: "London, UK",
    content: "The real-time urban mobility insights are invaluable. We've optimized traffic flow and reduced emissions by integrating this platform with our transportation planning.",
    rating: 5,
    avatar: "JT"
  },
  {
    id: 7,
    name: "Dr. Priya Sharma",
    title: "Environmental Planning Consultant",
    organization: "Mumbai Development Authority",
    location: "Mumbai, India",
    content: "Incredible social well-being metrics that help us understand community needs. The platform's accessibility and comprehensive data have transformed our urban planning approach.",
    rating: 5,
    avatar: "PS"
  },
  {
    id: 8,
    name: "Carlos Mendoza",
    title: "Disaster Risk Management",
    organization: "Mexico City Government",
    location: "Mexico City, Mexico",
    content: "The early warning systems powered by this platform have helped us evacuate communities ahead of environmental disasters, potentially saving thousands of lives.",
    rating: 5,
    avatar: "CM"
  }
];

export function TestimonialsCarousel() {
  const autoplayPlugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          What Urban Planners Say
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Trusted by leading urban planners, researchers, and city officials worldwide
        </p>
      </div>

      <div className="relative">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[autoplayPlugin.current]}
          className="w-full"
          onMouseEnter={() => autoplayPlugin.current.stop()}
          onMouseLeave={() => autoplayPlugin.current.play()}
        >
          <CarouselContent className="-ml-4">
            {TESTIMONIALS.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                <TestimonialCard testimonial={testimonial} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-12" />
          <CarouselNext className="hidden sm:flex -right-12" />
        </Carousel>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="bg-gradient-card shadow-card hover:shadow-interactive transition-all duration-300 hover:scale-[1.02] h-full">
      <CardContent className="p-6 h-full flex flex-col">
        <div className="flex items-start gap-3 mb-4">
          <Quote className="w-8 h-8 text-primary/60 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
          </div>
        </div>

        <blockquote className="text-muted-foreground leading-relaxed flex-1 mb-6">
          "{testimonial.content}"
        </blockquote>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <span className="text-sm font-semibold text-primary">
              {testimonial.avatar}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground text-sm">
              {testimonial.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {testimonial.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {testimonial.organization}
            </div>
            <div className="text-xs text-primary/80 font-medium">
              {testimonial.location}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}