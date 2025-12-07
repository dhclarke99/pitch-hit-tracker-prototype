const path = require('path');
const fs = require('fs');

module.exports = function (api) {
  api.cache(true);
  const projectRoot = __dirname;
  const appRoot = path.resolve(projectRoot, 'app');
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': projectRoot,
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          resolvePath(sourcePath, currentFile, opts) {
            // Only handle @/ aliases with custom logic
            if (sourcePath.startsWith('@/')) {
              const aliasPath = sourcePath.replace('@/', '');
              const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
              
              // Try project root first (for constants, hooks, components)
              let resolvedPath = path.resolve(projectRoot, aliasPath);
              for (const ext of extensions) {
                const fullPath = resolvedPath + ext;
                if (fs.existsSync(fullPath)) {
                  return fullPath;
                }
              }
              
              // If not found, try app/ directory (for data, ml, ui)
              resolvedPath = path.resolve(appRoot, aliasPath);
              for (const ext of extensions) {
                const fullPath = resolvedPath + ext;
                if (fs.existsSync(fullPath)) {
                  return fullPath;
                }
              }
              
              // Try as directory with index (project root)
              resolvedPath = path.resolve(projectRoot, aliasPath);
              const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
              for (const ext of indexExtensions) {
                const fullPath = resolvedPath + ext;
                if (fs.existsSync(fullPath)) {
                  return fullPath;
                }
              }
              
              // Try as directory with index (app/)
              resolvedPath = path.resolve(appRoot, aliasPath);
              for (const ext of indexExtensions) {
                const fullPath = resolvedPath + ext;
                if (fs.existsSync(fullPath)) {
                  return fullPath;
                }
              }
            }
            
            // Return undefined to use default module-resolver behavior for non-@/ paths
            return undefined;
          },
        },
      ],
    ],
  };
};

