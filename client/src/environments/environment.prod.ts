export const environment = {
  production: true,
  // Relative on purpose: the API is served by the Vercel function on the same
  // domain as the site, so there is no cross-origin host to hardcode and no
  // CORS to configure. angular.json swaps this file in for production builds.
  apiUrl: '/api',
};
