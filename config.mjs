import dotenv from 'dotenv';

export function config() {
  // Only load .env file in development
  if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
  }
  
  // Validate required environment variables
  const requiredVars = ['MONGODB_URI', 'SESSION_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const message = `Missing required environment variables: ${missingVars.join(', ')}`;
    if (process.env.VERCEL) {
      console.warn(message);
      return;
    }
    console.error(message);
    process.exit(1);
  }
}
