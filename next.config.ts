import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "img.clerk.com",
			},
			{
				protocol: "https",
				hostname: "colorless-buzzard-523.convex.cloud",
			},
			{
				protocol: "https",
				hostname: "artful-gnat-800.convex.cloud",
			},
		],
	},
}

export default nextConfig
