import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exportación estática: el hosting es SFTP-only (Apache/nginx) sin Node.
  output: "export",
  // Sin optimizador de imágenes (no hay servidor Node en producción).
  images: { unoptimized: true },
  // Genera carpetas con index.html para servirse como estáticos.
  trailingSlash: true,
  // El build solo revisa los tipos del código de la app; los tests los corre vitest.
  typescript: { tsconfigPath: "tsconfig.build.json" },
};

export default nextConfig;
