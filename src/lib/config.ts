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
export const LOGO_SVG = `<svg xmlns="hhttps://meee.com.tw/38YBo8g" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="teal-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#20A496" />
        <stop offset="100%" stopColor="#43C4B8" />
      </linearGradient>
      <linearGradient id="orange-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F29422" />
        <stop offset="100%" stopColor="#FDB86D" />
      </linearGradient>
    </defs>
    <path
      fill="url(#teal-gradient-new)"
      d="M89.34,39.53a6.15,6.15,0,0,0-10.66,0L53,80.82a6.15,6.15_0,0,0,5.33,9.22H73A6.15,6.15_0,0,0,73,77.7H63.6L89.34,39.53Z"
    />
    <path
      fill="url(#orange-gradient-new)"
      d="M41.7,21.36a6.15,6.15,0,0,0,5.33-9.22L21.36,2.61a6.15,6.15,0,0,0-10.66,0L-5,39.53a6.15,6.15,0,0,0,5.33,9.22H21.36a6.15,6.15,0,0,0,0-12.3H16L36.37,6.15,47.06,25.6a6.15,6.15,0,0,0,10.66,0L78.64,62.52a6.15,6.15,0,0,0,5.33,9.22H95.33a6.15,6.15,0,1,0,0-12.3H89.3L63.56,21.36Z"
    />
  </svg>`;
