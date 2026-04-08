import { onCLS, onINP, onLCP } from 'web-vitals/attribution';

function report(metric) {
  const payload = {
    name: metric.name,
    value: Number(metric.value.toFixed(2)),
    rating: metric.rating,
    navigationType: metric.navigationType,
    delta: Number(metric.delta.toFixed(2))
  };

  window.dispatchEvent(new CustomEvent('app:web-vital', { detail: payload }));
  console.info('[web-vitals]', payload);
}

export function reportWebVitals() {
  onCLS(report);
  onINP(report);
  onLCP(report);
}
