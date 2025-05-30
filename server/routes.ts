import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertArticleSchema, insertCommentSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || "";
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

// Middleware to verify JWT token
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

// Middleware to check admin role
function requireAdmin(req: any, res: any, next: any) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Middleware to check subscription for premium content (but allow access for metadata)
function checkSubscription(req: any, res: any, next: any) {
  // Allow access to all articles, but we'll control content in the response
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isSubscribed: user.isSubscribed,
        },
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid data', error });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isSubscribed: user.isSubscribed,
        },
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid data' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      isSubscribed: req.user.isSubscribed,
    });
  });

  // Article routes
  app.get('/api/articles', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const result = await storage.getArticles(page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch articles' });
    }
  });

  app.get('/api/articles/:id', async (req: any, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticleWithAuthor(id);
      
      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }

      req.article = article;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch article' });
    }
  }, checkSubscription, async (req: any, res) => {
    const article = req.article;
    
    // If premium and user is not subscribed, return limited content
    if (article.isPremium && (!req.user || !req.user.isSubscribed)) {
      res.json({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        imageUrl: article.imageUrl,
        category: article.category,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        isPremium: true,
        published: article.published,
        author: article.author,
        content: null, // Don't send content for premium articles
        needsSubscription: true
      });
    } else {
      res.json({
        ...article,
        needsSubscription: false
      });
    }
  });

  app.post('/api/articles', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const validatedData = insertArticleSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });
      
      const article = await storage.createArticle(validatedData);
      res.json(article);
    } catch (error) {
      res.status(400).json({ message: 'Invalid data', error });
    }
  });

  app.put('/api/articles/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertArticleSchema.partial().parse(req.body);
      
      const article = await storage.updateArticle(id, validatedData);
      res.json(article);
    } catch (error) {
      res.status(400).json({ message: 'Invalid data', error });
    }
  });

  app.delete('/api/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteArticle(id);
      res.json({ message: 'Article deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete article' });
    }
  });

  // Comment routes
  app.get('/api/articles/:id/comments', async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const comments = await storage.getCommentsByArticle(articleId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  app.post('/api/articles/:id/comments', authenticateToken, async (req: any, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        articleId,
        authorId: req.user.id,
      });
      
      const comment = await storage.createComment(validatedData);
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: 'Invalid data', error });
    }
  });

  app.delete('/api/comments/:id', authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Only allow admins or comment authors to delete
      if (req.user.role !== 'admin') {
        // TODO: Check if user is the comment author
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      await storage.deleteComment(id);
      res.json({ message: 'Comment deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });

  // LemonSqueezy subscription routes
  app.post('/api/subscription/create-checkout', authenticateToken, async (req: any, res) => {
    try {
      // Create LemonSqueezy checkout session
      const checkoutData = {
        data: {
          type: 'checkouts',
          attributes: {
            product_options: {
              enabled_variants: [process.env.LEMONSQUEEZY_VARIANT_ID],
            },
            checkout_options: {
              embed: false,
              media: true,
              logo: true,
            },
            checkout_data: {
              email: req.user.email,
              custom: {
                user_id: req.user.id.toString(),
              },
            },
            expires_at: null,
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: LEMONSQUEEZY_STORE_ID,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: process.env.LEMONSQUEEZY_VARIANT_ID,
              },
            },
          },
        },
      };

      const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify(checkoutData),
      });

      const checkout = await response.json();
      
      if (!response.ok) {
        throw new Error(checkout.errors?.[0]?.detail || 'Failed to create checkout');
      }

      res.json({ checkoutUrl: checkout.data.attributes.url });
    } catch (error) {
      console.error('Checkout creation error:', error);
      res.status(500).json({ message: 'Failed to create checkout session' });
    }
  });

  // LemonSqueezy webhook
  app.post('/api/webhooks/lemonsqueezy', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const payload = req.body;
      const signature = req.headers['x-signature'] as string;
      
      // Verify webhook signature (implement according to LemonSqueezy docs)
      // const isValid = verifySignature(payload, signature, LEMONSQUEEZY_WEBHOOK_SECRET);
      // if (!isValid) {
      //   return res.status(400).json({ message: 'Invalid signature' });
      // }

      const event = JSON.parse(payload.toString());
      
      if (event.meta.event_name === 'subscription_created' || event.meta.event_name === 'subscription_updated') {
        const subscription = event.data;
        const customData = subscription.attributes.custom_data;
        
        if (customData?.user_id) {
          const userId = parseInt(customData.user_id);
          const isActive = subscription.attributes.status === 'active';
          
          await storage.updateUserSubscription(
            userId,
            isActive,
            subscription.attributes.customer_id.toString(),
            subscription.id,
            subscription.attributes.status
          );
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
