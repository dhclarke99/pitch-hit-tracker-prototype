// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add path alias resolution for @/ imports
const projectRoot = __dirname;
const appRoot = path.resolve(projectRoot, 'app');

// Custom resolver to handle @/ aliases
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Handle @/ path aliases - @/ maps to project root
    if (moduleName.startsWith('@/')) {
      const aliasPath = moduleName.replace('@/', '');
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      
      // Try project root first (for constants, hooks, components)
      let resolvedPath = path.resolve(projectRoot, aliasPath);
      for (const ext of extensions) {
        const fullPath = resolvedPath + ext;
        try {
          const fs = require('fs');
          if (fs.existsSync(fullPath)) {
            console.log(`[Metro Resolver] ✓ Resolved ${moduleName} -> ${fullPath}`);
            return {
              filePath: fullPath,
              type: 'sourceFile',
            };
          }
        } catch (e) {
          // Continue to next extension
        }
      }
      
      // If not found in project root, try app/ directory (for data, ml, ui)
      resolvedPath = path.resolve(appRoot, aliasPath);
      for (const ext of extensions) {
        const fullPath = resolvedPath + ext;
        try {
          const fs = require('fs');
          if (fs.existsSync(fullPath)) {
            console.log(`[Metro Resolver] ✓ Resolved ${moduleName} -> ${fullPath}`);
            return {
              filePath: fullPath,
              type: 'sourceFile',
            };
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Try as directory with index (project root)
      resolvedPath = path.resolve(projectRoot, aliasPath);
      const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      for (const ext of indexExtensions) {
        const fullPath = resolvedPath + ext;
        try {
          const fs = require('fs');
          if (fs.existsSync(fullPath)) {
            console.log(`[Metro Resolver] ✓ Resolved ${moduleName} -> ${fullPath}`);
            return {
              filePath: fullPath,
              type: 'sourceFile',
            };
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Try as directory with index (app/)
      resolvedPath = path.resolve(appRoot, aliasPath);
      for (const ext of indexExtensions) {
        const fullPath = resolvedPath + ext;
        try {
          const fs = require('fs');
          if (fs.existsSync(fullPath)) {
            console.log(`[Metro Resolver] ✓ Resolved ${moduleName} -> ${fullPath}`);
            return {
              filePath: fullPath,
              type: 'sourceFile',
            };
          }
        } catch (e) {
          // Continue
        }
      }
      
      console.error(`[Metro Resolver] ✗ Failed to resolve ${moduleName}`);
      console.error(`  Tried project root: ${path.resolve(projectRoot, aliasPath)}`);
      console.error(`  Tried app root: ${path.resolve(appRoot, aliasPath)}`);
    }
    
    // Fall back to default resolver
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
  sourceExts: [...config.resolver.sourceExts, 'ts', 'tsx'],
};

module.exports = config;

