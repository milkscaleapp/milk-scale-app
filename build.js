const fs = require('fs');
const path = require('path');

const root = __dirname;
const www = path.join(root, 'www');

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(www, 'index.html'));

const fontAwesome = path.join(root, 'node_modules', '@fortawesome', 'fontawesome-free');
copyDirectory(path.join(fontAwesome, 'css'), path.join(www, 'vendor', 'fontawesome', 'css'));
copyDirectory(path.join(fontAwesome, 'webfonts'), path.join(www, 'vendor', 'fontawesome', 'webfonts'));

const filesystemPlugin = path.join(root, 'node_modules', '@capacitor', 'filesystem', 'dist', 'plugin.js');
if (!fs.existsSync(filesystemPlugin)) {
  throw new Error('Capacitor Filesystem plugin bundle was not found. Check npm dependencies.');
}
fs.mkdirSync(path.join(www, 'vendor'), { recursive: true });
fs.copyFileSync(filesystemPlugin, path.join(www, 'vendor', 'capacitor-filesystem.js'));

console.log('Built local Milk Scale web assets in www/.');
