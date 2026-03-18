const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const mainJsPath = path.join(distDir, 'main.js');
const shimPath = path.join(distDir, 'main');

try {
  if (!fs.existsSync(mainJsPath)) {
    process.exit(0);
  }

  const shimContent = "require('./main.js');\n";
  fs.writeFileSync(shimPath, shimContent, 'utf8');
} catch (err) {
  console.error('Failed to create dist/main shim:', err);
  process.exit(1);
}
