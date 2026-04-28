import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "finztericubblubyzkyh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'devunomieta.xyz',
          },
        ],
        destination: 'https://www.devunomieta.xyz/:path*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
