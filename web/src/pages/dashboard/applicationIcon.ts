import { SyntheticEvent } from 'react';
import { DashboardApplication } from './dashboard.types';

const embeddedFallbackIcon = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <rect width="48" height="48" rx="8" fill="#202629"/>
    <path d="M15 15h18v18H15z" fill="none" stroke="#899397" stroke-width="2"/>
    <circle cx="20" cy="20" r="2" fill="#c97941"/>
    <path d="m17 30 6-6 4 4 3-3 3 3" fill="none" stroke="#899397" stroke-width="2"/>
  </svg>
`)}`;

export function getApplicationIconUrl(application: DashboardApplication) {
  if (application.icon?.startsWith('http') || application.icon?.startsWith('/')) {
    return application.icon;
  }

  try {
    return `${new URL(application.url).origin}/favicon.ico`;
  } catch {
    return embeddedFallbackIcon;
  }
}

export function useEmbeddedIconFallback(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = embeddedFallbackIcon;
}
