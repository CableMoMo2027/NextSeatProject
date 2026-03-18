const fs = require('fs');
const path = require('path');

function ensurePaymentFolders() {
  const uploadDir = path.join(process.cwd(), 'uploads/slips');
  const cacheDir = path.join(process.cwd(), 'cache/receipt');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

module.exports = { ensurePaymentFolders };
