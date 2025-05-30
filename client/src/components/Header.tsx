import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Battery, User, Settings, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <h1 className="text-xl font-bold text-gray-900 cursor-pointer">
                <Battery className="inline w-5 h-5 text-blue-600 mr-2" />
                Battery News
              </h1>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                Latest
              </Link>
              <span className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                Technology
              </span>
              <span className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                Research
              </span>
              <span className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                Industry
              </span>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4 mr-1" />
                      Admin
                    </Button>
                  </Link>
                )}
                
                {!user.isSubscribed && (
                  <Button onClick={handleSubscribe} className="bg-blue-600 hover:bg-blue-700">
                    Subscribe
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="w-4 h-4 mr-1" />
                      {user.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-1" />
                    Login
                  </Button>
                </Link>
                <Button onClick={handleSubscribe} className="bg-blue-600 hover:bg-blue-700">
                  Subscribe
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
