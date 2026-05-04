// Debug script to check environment variables
console.log('=== Environment Variables Debug ===');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log('All env vars starting with VITE_:');
Object.keys(import.meta.env).forEach(key => {
  if (key.startsWith('VITE_')) {
    console.log(`${key}:`, import.meta.env[key]);
  }
});
