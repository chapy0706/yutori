import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 採点エンジンとサンドボックスは TS ソースを直接 export する workspace パッケージ。
   * Next 側でトランスパイルするために transpilePackages に登録する。
   */
  transpilePackages: ["@yutori/contracts", "@yutori/grader", "@yutori/sandbox"],
};

export default nextConfig;
