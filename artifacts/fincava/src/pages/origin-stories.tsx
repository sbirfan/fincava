import { useListOriginStories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OriginStories() {
  const { t } = useLanguage();
  const os = t.originStories;
  const { data: stories, isLoading } = useListOriginStories();

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-secondary text-secondary-foreground py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{os.heading}</h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">{os.description}</p>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))
          ) : stories?.length ? (
            stories.map((story) => (
              <Link key={story.id} href={`/supplier/${story.supplierId}?from=origin-stories`} className="group">
                <div className="flex flex-col h-full bg-card rounded-lg overflow-hidden border transition-all hover:shadow-md">
                  <div className="h-64 bg-muted relative overflow-hidden">
                    <img 
                      src={story.imageUrl || "/images/farmer.png"} 
                      alt={story.farmerName} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center text-white/90 text-sm">
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {story.region}{story.elevation ? ` • ${story.elevation}` : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <div className="text-xs font-bold tracking-wider text-primary uppercase mb-2">{story.product}</div>
                    <h3 className="text-xl font-serif font-bold mb-1">{story.farmerName}</h3>
                    <p className="text-sm font-medium text-muted-foreground mb-4">{story.supplierName}</p>
                    
                    <p className="text-muted-foreground text-sm line-clamp-4 leading-relaxed mb-6">
                      {story.story}
                    </p>
                    
                    <div className="mt-auto flex items-center text-sm font-medium text-primary group-hover:underline">
                      {os.readMore}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              {os.noStories}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
