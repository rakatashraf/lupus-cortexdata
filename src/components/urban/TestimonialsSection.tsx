import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "This platform has revolutionized how we approach urban sustainability planning. The real-time data integration saves us weeks of analysis.",
    name: "Dr. Sarah Chen",
    title: "Senior Urban Planner",
    organization: "Metropolitan Planning Commission",
    rating: 5,
    initials: "SC",
    avatarColor: "bg-gradient-to-br from-primary to-primary-light"
  },
  {
    quote: "The AI-powered insights help us identify environmental justice issues we might have missed. It's an invaluable tool for equitable city development.",
    name: "Marcus Rodriguez",
    title: "Director of Sustainable Development",
    organization: "City of Phoenix",
    rating: 5,
    initials: "MR",
    avatarColor: "bg-gradient-to-br from-chart-gea to-success"
  },
  {
    quote: "Having all urban health indices in one dashboard makes policy decisions so much more informed. The disaster preparedness insights are particularly valuable.",
    name: "Dr. Amelia Thompson",
    title: "Climate Resilience Coordinator",
    organization: "Regional Development Authority",
    rating: 5,
    initials: "AT",
    avatarColor: "bg-gradient-to-br from-info to-chart-tas"
  },
  {
    quote: "The satellite data integration is seamless and the visualizations help communicate complex urban issues to city council members effectively.",
    name: "James Park",
    title: "Chief Planning Officer",
    organization: "Vancouver City Planning",
    rating: 5,
    initials: "JP",
    avatarColor: "bg-gradient-to-br from-chart-aqhi to-accent"
  },
  {
    quote: "This tool has transformed our community engagement process. Residents can now see real-time environmental data that affects their neighborhoods directly.",
    name: "Dr. Fatima Al-Zahra",
    title: "Community Development Manager",
    organization: "Dubai Smart City Initiative",
    rating: 5,
    initials: "FA",
    avatarColor: "bg-gradient-to-br from-warning to-chart-uhvi"
  },
  {
    quote: "The predictive analytics for urban heat islands has been crucial for our climate adaptation strategies. The data accuracy is outstanding.",
    name: "Michael O'Brien",
    title: "Environmental Policy Analyst",
    organization: "Toronto Public Health",
    rating: 5,
    initials: "MO",
    avatarColor: "bg-gradient-to-br from-chart-ejt to-destructive"
  }
];

export function TestimonialsSection() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          What Urban Planners Say
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Trusted by planning professionals worldwide for data-driven urban development
        </p>
      </div>

      {/* Testimonials Carousel */}
      <div className="relative px-4 sm:px-8 lg:px-12">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {TESTIMONIALS.map((testimonial, index) => (
              <CarouselItem key={index} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                <Card className="h-full bg-gradient-card shadow-card hover:shadow-interactive transition-all duration-300 hover:scale-105">
                  <CardContent className="p-6 space-y-4 h-full flex flex-col">
                    {/* Quote Icon */}
                    <div className="flex justify-between items-start">
                      <Quote className="w-6 h-6 text-primary/40 flex-shrink-0" />
                      <div className="flex gap-1">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-primary text-primary"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Quote Text */}
                    <blockquote className="text-sm sm:text-base text-foreground leading-relaxed flex-grow">
                      "{testimonial.quote}"
                    </blockquote>

                    {/* Author Info */}
                    <div className="flex items-center gap-4 pt-2 mt-auto">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`${testimonial.avatarColor} text-white font-semibold`}>
                          {testimonial.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground text-sm">
                          {testimonial.name}
                        </div>
                        <div className="text-xs text-primary font-medium">
                          {testimonial.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {testimonial.organization}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Navigation - Hidden on mobile, visible on larger screens */}
          <div className="hidden md:block">
            <CarouselPrevious className="-left-12 bg-card border-border hover:bg-accent" />
            <CarouselNext className="-right-12 bg-card border-border hover:bg-accent" />
          </div>
        </Carousel>

        {/* Mobile indicators */}
        <div className="flex justify-center mt-6 gap-2 md:hidden">
          {TESTIMONIALS.map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-muted-foreground/30"
            />
          ))}
        </div>
      </div>
    </div>
  );
}