import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Reply, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAuthHeaders } from '@/lib/auth';

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    email: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  articleId: number;
}

export default function CommentSection({ articleId }: CommentSectionProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['/api/articles', articleId, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/articles/${articleId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: number }) => {
      const response = await fetch(`/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles', articleId, 'comments'] });
      setNewComment('');
      setReplyContent('');
      setReplyingTo(null);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles', articleId, 'comments'] });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    
    createCommentMutation.mutate({ content: newComment.trim() });
  };

  const handleSubmitReply = (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!user || !replyContent.trim()) return;
    
    createCommentMutation.mutate({ 
      content: replyContent.trim(),
      parentId 
    });
  };

  const canDeleteComment = (comment: Comment) => {
    return user && (user.role === 'admin' || user.id === comment.author.id);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading comments...</div>;
  }

  return (
    <div className="mt-12">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <MessageCircle className="w-5 h-5 mr-2" />
        Comments ({comments?.length || 0})
      </h3>

      {/* Add new comment */}
      {user ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmitComment}>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="mb-4"
                rows={3}
              />
              <Button 
                type="submit" 
                disabled={!newComment.trim() || createCommentMutation.isPending}
              >
                {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Please log in to post comments.</p>
          </CardContent>
        </Card>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments?.map((comment: Comment) => (
          <Card key={comment.id} className="border-l-4 border-l-blue-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium text-gray-900">
                    {comment.author.email.split('@')[0]}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      <Reply className="w-4 h-4" />
                    </Button>
                  )}
                  {canDeleteComment(comment) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="mt-4">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="mb-2"
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={!replyContent.trim() || createCommentMutation.isPending}
                    >
                      Reply
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 ml-6 space-y-3">
                  {comment.replies.map((reply: Comment) => (
                    <div key={reply.id} className="border-l-2 border-l-gray-200 pl-4">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-medium text-gray-900 text-sm">
                            {reply.author.email.split('@')[0]}
                          </span>
                          <span className="text-gray-500 text-xs ml-2">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {canDeleteComment(reply) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCommentMutation.mutate(reply.id)}
                            className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {comments && comments.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No comments yet. Be the first to share your thoughts!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
