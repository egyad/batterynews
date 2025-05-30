import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Article {
  id: number;
  title: string;
  excerpt: string;
  imageUrl?: string;
  isPremium: boolean;
  createdAt: string;
  author?: {
    email: string;
  };
}

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.createdAt), { addSuffix: true });
  const authorName = article.author?.email?.split('@')[0] || 'Unknown';

  return (
    <article className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {/* Small thumbnail */}
          <img 
            src={article.imageUrl || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"} 
            alt={article.title}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Badge 
                variant={article.isPremium ? "default" : "secondary"}
                className={article.isPremium ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}
              >
                {article.isPremium ? (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    Premium
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3 mr-1" />
                    Free
                  </>
                )}
              </Badge>
              <span className="text-gray-500 text-xs">{timeAgo}</span>
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
              {article.title}
            </h4>
            
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {article.excerpt}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">By {authorName}</span>
              <Link href={`/article/${article.id}`}>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  {article.isPremium ? 'Preview →' : 'Read more →'}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
