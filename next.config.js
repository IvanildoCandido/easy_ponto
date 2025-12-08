/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
    unoptimized: false,
  },
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      const isProduction = process.env.NODE_ENV === 'production';
      const useSupabase = isProduction && process.env.SUPABASE_DB_URL;
      
      if (useSupabase) {
        // Em produção com Supabase, ignorar completamente better-sqlite3
        config.plugins.push(
          new webpack.IgnorePlugin({
            resourceRegExp: /^better-sqlite3$/,
          })
        );
      } else {
        // Em desenvolvimento, marcar como external (precisa ser compilado nativamente)
        config.externals.push('better-sqlite3');
      }
    }
    return config;
  },
}

module.exports = nextConfig

