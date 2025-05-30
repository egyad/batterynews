import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function SubscriptionCTA() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubscribe = async () => {
    if (!user) {
      setLocation('/login');
      return;
    }
    
    try {
      const { createCheckoutSession, redirectToCheckout } = await import('@/lib/lemonsqueezy');
      const checkoutUrl = await createCheckoutSession();
      redirectToCheckout(checkoutUrl);
    } catch (error) {
      console.error('Failed to create checkout:', error);
    }
  };

  if (user?.isSubscribed) {
    return null; // Don't show CTA to existing subscribers
  }

  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white mb-16">
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-2xl md:text-3xl font-bold mb-4">
          Unlock Premium Battery Industry Insights
        </h3>
        <p className="text-blue-100 text-lg mb-6">
          Get exclusive access to in-depth analysis, market reports, and expert interviews from leading battery technology researchers.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <div className="flex items-center space-x-6 text-blue-100">
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              Weekly market reports
            </span>
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              Expert interviews
            </span>
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              Ad-free reading
            </span>
          </div>
        </div>
        
        <div className="space-x-4">
          <Button onClick={handleSubscribe} className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
            Subscribe for $9/month
          </Button>
          <Button variant="ghost" className="text-blue-100 hover:text-white">
            Learn more about Premium →
          </Button>
        </div>
      </div>
    </section>
  );
}
