/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // SQLite precisa ser compilado nativamente
      config.externals.push('better-sqlite3');
    }
    return config;
  },
}

module.exports = nextConfig

