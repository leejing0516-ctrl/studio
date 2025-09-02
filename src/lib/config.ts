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
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125">
    <defs>
      <linearGradient id="bank-roof-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(var(--accent))" />
        <stop offset="100%" stop-color="hsl(var(--accent) / 0.7)" />
      </linearGradient>
      <linearGradient id="bank-base-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="hsl(var(--primary) / 0.8)" />
        <stop offset="100%" stop-color="hsl(var(--primary))" />
      </linearGradient>
    </defs>
    <g transform="translate(0, 17.5)">
      <polygon fill="url(#bank-roof-gradient)" points="50,0 100,25 0,25" />
      <rect fill="url(#bank-base-gradient)" y="25" width="100" height="15" />
      <rect fill="hsl(var(--primary))" x="10" y="40" width="15" height="50" rx="2"/>
      <rect fill="hsl(var(--primary))" x="32.5" y="40" width="15" height="50" rx="2"/>
      <rect fill="hsl(var(--primary))" x="55" y="40" width="15" height="50" rx="2"/>
      <rect fill="hsl(var(--primary))" x="77.5" y="40" width="15" height="50" rx="2"/>
    </g>
  </svg>`;
