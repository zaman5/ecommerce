export const environment = {
  production: true,
  // The API runs on its own subdomain; wondercart.pk itself only serves the
  // Angular build. Uploaded media ("/uploads/…") resolves against this origin too.
  apiUrl: 'https://api.wondercart.pk/api',
};
