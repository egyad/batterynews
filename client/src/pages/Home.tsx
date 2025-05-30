import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import ArticleCard from '@/components/ArticleCard';
import SubscriptionCTA from '@/components/SubscriptionCTA';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/articles', currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/articles?page=${currentPage}&limit=5`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      return response.json();
    }
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Failed to load articles</h2>
            <p className="text-gray-600">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Stay Charged with Latest Battery Technology
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Get the latest news, research, and insights from the world of battery technology and energy storage.
            </p>
          </div>
        </section>

        <div className="flex gap-8">
          {/* Main Articles Section */}
          <section className="flex-1 max-w-2xl mb-16">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-semibold text-gray-900">Latest Articles</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="flex items-center">
                <Unlock className="w-4 h-4 text-amber-600 mr-1" />
                Free
              </span>
              <span className="flex items-center ml-4">
                <Lock className="w-4 h-4 text-emerald-600 mr-1" />
                Premium
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4 mb-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="w-20 h-20 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                {data?.articles?.map((article: any) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {data && data.total > 5 && (
                <div className="flex justify-center items-center space-x-4 mb-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {Math.ceil(data.total / 5)}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!data.hasMore}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}

          {data?.articles && data.articles.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles available</h3>
              <p className="text-gray-600">Check back later for new content.</p>
            </div>
          )}
          
          {/* Subscription CTA - positioned after articles */}
          <SubscriptionCTA />
          </section>
          
          {/* Sidebar with suggested articles */}
          <aside className="w-80 hidden lg:block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Trending Topics</h4>
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h5 className="font-medium text-gray-900 text-sm mb-1">Solid-State Batteries</h5>
                  <p className="text-xs text-gray-600">Latest breakthroughs in energy density</p>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <h5 className="font-medium text-gray-900 text-sm mb-1">Fast Charging</h5>
                  <p className="text-xs text-gray-600">Sub-minute charging technologies</p>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <h5 className="font-medium text-gray-900 text-sm mb-1">Grid Storage</h5>
                  <p className="text-xs text-gray-600">Large-scale energy solutions</p>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <h5 className="font-medium text-gray-900 text-sm mb-1">Battery Recycling</h5>
                  <p className="text-xs text-gray-600">Sustainable material recovery</p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 text-sm mb-1">Alternative Chemistry</h5>
                  <p className="text-xs text-gray-600">Sodium-ion, aluminum-ion innovations</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
