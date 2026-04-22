export function trackPageView(pageType: string, restaurantId?: string) {
  // Generate or retrieve a simple visitor ID from sessionStorage
  let visitorId = '';
  try {
    visitorId = sessionStorage.getItem('lm_vid') || '';
    if (!visitorId) {
      visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('lm_vid', visitorId);
    }
  } catch {
    visitorId = Math.random().toString(36).substring(2);
  }

  // Fire and forget — don't await, don't block the page
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, pageType, visitorId }),
  }).catch(() => {}); // Silently fail
}
