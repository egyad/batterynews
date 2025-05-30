import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import Header from '@/components/Header';
import CommentSection from '@/components/CommentSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Lock, Unlock, ArrowLeft, Crown, Share2, Twitter, Facebook, Linkedin, Copy, Trophy, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createCheckoutSession } from '@/lib/lemonsqueezy';
import { useState, useEffect } from 'react';

interface Author {
  email: string;
}

interface Article {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  imageUrl?: string;
  createdAt: string;
  author: Author;
  needsSubscription: boolean;
}


export default function Article() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [readingProgress, setReadingProgress] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Reading progress tracking - moved to top level
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = (scrollTop / docHeight) * 100;
      setReadingProgress(Math.min(Math.max(scrollProgress, 0), 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: article, isLoading, error } = useQuery<Article>({
    queryKey: ['/api/articles', parseInt(id!)],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Article not found</h1>
            <Button onClick={() => setLocation('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to articles
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const timeAgo = article?.createdAt 
    ? formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })
    : 'Recently';
  const authorName = article?.author?.email ? article.author.email.split('@')[0] : 'Unknown';
  
  // Check if user can access premium content
  const canAccessContent = !article?.isPremium || (user?.isSubscribed === true);
  const needsSubscription = article?.isPremium && !canAccessContent;

  const handleSubscribe = async () => {
    try {
      const checkoutUrl = await createCheckoutSession();
      window.open(checkoutUrl, '_blank');
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = article?.title || 'Battery Technology Article';
    const text = article?.excerpt || 'Check out this article about battery technology';

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        setShowShareMenu(false);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={readingProgress} className="h-1 bg-gray-200" />
      </div>

      {/* Gamified Progress Tracker */}
      {readingProgress > 10 && (
        <div className="fixed bottom-4 right-4 z-40">
          <Card className="p-4 w-64 shadow-lg border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50">
            <CardContent className="p-0">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-900">Reading Progress</span>
              </div>
              <Progress value={readingProgress} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>{Math.round(readingProgress)}% complete</span>
                {readingProgress >= 100 && (
                  <div className="flex items-center text-emerald-600">
                    <Star className="w-3 h-3 mr-1" />
                    <span>Article completed!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          onClick={() => setLocation('/')}
          variant="ghost" 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Articles
        </Button>

        {/* Show subscription gate for premium articles when user cannot access content */}
        {needsSubscription ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <Badge variant="default" className="bg-emerald-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
                <span className="text-sm text-gray-500">{article.category}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>

              <div className="flex items-center text-sm text-gray-500 mb-8">
                {article.imageUrl && (
                  <div className="mr-4">
                    <img src={article.imageUrl} alt={article.title} className="w-20 h-20 rounded-lg object-cover" />
                  </div>
                )}
                <div>
                  <p>By {authorName}</p>
                  <p>{timeAgo}</p>
                </div>
              </div>

              {/* Article preview/excerpt */}
              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700">{article.excerpt}</p>
              </div>

              {/* Subscription required alert */}
              <Alert className="mb-6 border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50">
                <Crown className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-gray-800">
                  <strong>Premium Article:</strong> This content is available to subscribers only. 
                  Subscribe now to access this article and all premium content.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-4">
                <Button onClick={handleSubscribe} className="bg-emerald-600 hover:bg-emerald-700">
                  <Crown className="w-4 h-4 mr-2" />
                  Subscribe Now
                </Button>
                <Button variant="outline" onClick={() => setLocation('/')}>
                  Back to Articles
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <article className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center space-x-4 mb-6">
                  {article.isPremium ? (
                    <Badge variant="default" className="bg-emerald-600">
                      <Lock className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Unlock className="w-3 h-3 mr-1" />
                      Free
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">{article.category}</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {article.title}
                </h1>

                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center text-sm text-gray-500">
                    {article.imageUrl && (
                      <div className="mr-4">
                        <img src={article.imageUrl} alt={article.title} className="w-20 h-20 rounded-lg object-cover" />
                      </div>
                    )}
                    <div>
                      <p>By {authorName}</p>
                      <p>{timeAgo}</p>
                    </div>
                  </div>
                  
                  {/* Share Button */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShareMenu(!showShareMenu)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    
                    {showShareMenu && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10">
                        <div className="flex flex-col space-y-2 min-w-[120px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare('twitter')}
                            className="justify-start"
                          >
                            <Twitter className="w-4 h-4 mr-2" />
                            Twitter
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare('facebook')}
                            className="justify-start"
                          >
                            <Facebook className="w-4 h-4 mr-2" />
                            Facebook
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare('linkedin')}
                            className="justify-start"
                          >
                            <Linkedin className="w-4 h-4 mr-2" />
                            LinkedIn
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare('copy')}
                            className="justify-start"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Only show content if user can access it */}
                {canAccessContent && article.content ? (
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                ) : (
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700">{article.excerpt}</p>
                    
                    {/* Show subscription prompt for premium articles */}
                    {article.isPremium && (
                      <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Crown className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Premium Content
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Subscribe to access the full article and unlock all premium content.
                          </p>
                          <Button onClick={handleSubscribe} className="bg-emerald-600 hover:bg-emerald-700">
                            <Crown className="w-4 h-4 mr-2" />
                            Subscribe Now
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>

            <CommentSection articleId={parseInt(id!)} />
          </>
        )}
      </main>
    </div>
  );
}