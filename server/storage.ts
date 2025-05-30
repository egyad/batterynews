import { users, articles, comments, type User, type InsertUser, type Article, type InsertArticle, type Comment, type InsertComment } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(id: number, isSubscribed: boolean, customerId?: string, subscriptionId?: string, status?: string): Promise<void>;

  // Article methods
  getArticles(page?: number, limit?: number): Promise<{ articles: Article[]; total: number; hasMore: boolean }>;
  getArticle(id: number): Promise<Article | undefined>;
  getArticleWithAuthor(id: number): Promise<(Article & { author: User }) | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: number, article: Partial<InsertArticle>): Promise<Article>;
  deleteArticle(id: number): Promise<void>;

  // Comment methods
  getCommentsByArticle(articleId: number): Promise<(Comment & { author: User, replies?: (Comment & { author: User })[] })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserSubscription(id: number, isSubscribed: boolean, customerId?: string, subscriptionId?: string, status?: string): Promise<void> {
    await db
      .update(users)
      .set({
        isSubscribed,
        lemonsqueezyCustomerId: customerId,
        subscriptionId,
        subscriptionStatus: status,
      })
      .where(eq(users.id, id));
  }

  async getArticles(page = 1, limit = 5): Promise<{ articles: Article[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.published, true));
    
    const total = Number(totalResult[0].count);
    
    // Get paginated articles
    const articleList = await db
      .select()
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      articles: articleList,
      total,
      hasMore: offset + articleList.length < total
    };
  }

  async getArticle(id: number): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || undefined;
  }

  async getArticleWithAuthor(id: number): Promise<(Article & { author: User }) | undefined> {
    const [result] = await db
      .select()
      .from(articles)
      .innerJoin(users, eq(articles.authorId, users.id))
      .where(eq(articles.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.articles,
      author: result.users,
    };
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    const [newArticle] = await db
      .insert(articles)
      .values({
        ...article,
        updatedAt: new Date(),
      })
      .returning();
    return newArticle;
  }

  async updateArticle(id: number, article: Partial<InsertArticle>): Promise<Article> {
    const [updatedArticle] = await db
      .update(articles)
      .set({
        ...article,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();
    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }

  async getCommentsByArticle(articleId: number): Promise<(Comment & { author: User, replies?: (Comment & { author: User })[] })[]> {
    // Get top-level comments (no parent)
    const topLevelComments = await db
      .select()
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.articleId, articleId), isNull(comments.parentId)))
      .orderBy(desc(comments.createdAt));

    // Get all replies
    const replies = await db
      .select()
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.articleId, articleId), sql`${comments.parentId} IS NOT NULL`))
      .orderBy(comments.createdAt);

    // Group replies by parent ID
    const repliesByParent = replies.reduce((acc, reply) => {
      const parentId = reply.comments.parentId!;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push({
        ...reply.comments,
        author: reply.users,
      });
      return acc;
    }, {} as Record<number, (Comment & { author: User })[]>);

    // Attach replies to top-level comments
    return topLevelComments.map(comment => ({
      ...comment.comments,
      author: comment.users,
      replies: repliesByParent[comment.comments.id] || [],
    }));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }
}

export const storage = new DatabaseStorage();
