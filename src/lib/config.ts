/**
 * This file contains configurable settings for the application.
 *
 * It is the ideal place to store values that you might want to change later,
 * such as the application's logo.
 */

/**
 * The SVG code for the application's logo.
 * 
 * To change the logo, simply replace the content of this string
 * with your new SVG code.
 * 
 * Make sure the SVG code includes a `viewBox` attribute and does not have fixed
 * `width` or `height` attributes, so it can be resized correctly.
 * The `fill` attributes can be set to "currentColor" to inherit the primary
 * color from the application's theme.
 */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100.66 90.04">
    <defs>
      <linearGradient id="teal-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(var(--primary))" />
        <stop offset="100%" stop-color="hsl(var(--primary) / 0.8)" />
      </linearGradient>
      <linearGradient id="orange-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(var(--accent))" />
        <stop offset="100%" stop-color="hsl(var(--accent) / 0.8)" />
      </linearGradient>
    </defs>
    <path
      fill="url(#teal-gradient-new)"
      d="M89.34,39.53a6.15,6.15,0,0,0-10.66,0L53,80.82a6.15,6.15,0,0,0,5.33,9.22H73a6.15,6.15,0,0,0,0-12.3H63.6L89.34,39.53Z"
    />
    <path
      fill="url(#orange-gradient-new)"
      d="m41.7,21.36c1.61-2.79.4-6.3-2.39-7.91L21.36,2.61a6.15,6.15,0,0,0-10.66,0L-5,39.53a6.15,6.15,0,0,0,5.33,9.22H21.36a6.15,6.15,0,0,0,0-12.3H16L36.37,6.15l10.69,19.45a6.15,6.15,0,0,0,10.66,0L78.64,62.52a6.15,6.15,0,0,0,5.33,9.22h11.36a6.15,6.15,0,1,0,0-12.3H89.3L63.56,21.36l-16.53-30.09a6.15,6.15,0,0,0-5.33-3.08Z"
      transform="translate(5.33)"
    />
  </svg>`;
