export async function createCheckoutSession() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch('/api/subscription/create-checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  const data = await response.json();
  return data.checkoutUrl;
}

export function redirectToCheckout(checkoutUrl: string) {
  window.open(checkoutUrl, '_blank');
}
