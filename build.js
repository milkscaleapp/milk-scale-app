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

const filesystemPackagePath = path.join(root, 'node_modules', '@capacitor', 'filesystem', 'package.json');
const filesystemPackage = JSON.parse(fs.readFileSync(filesystemPackagePath, 'utf8'));
const filesystemBrowserEntry = filesystemPackage.unpkg || 'dist/plugin.js';
const filesystemPlugin = path.resolve(root, 'node_modules', '@capacitor', 'filesystem', filesystemBrowserEntry);
if (!fs.existsSync(filesystemPlugin)) {
  throw new Error('Capacitor Filesystem plugin bundle was not found. Check npm dependencies.');
}
fs.mkdirSync(path.join(www, 'vendor'), { recursive: true });
fs.copyFileSync(filesystemPlugin, path.join(www, 'vendor', 'capacitor-filesystem.js'));

const nativeAppEntry = path.join(root, 'src', 'native-app.js');
if (!fs.existsSync(nativeAppEntry)) throw new Error('Native App bridge entry was not found.');
esbuild.buildSync({
  entryPoints: [nativeAppEntry],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: path.join(www, 'vendor', 'native-app.js'),
  target: ['es2020']
});

console.log('Built local Milk Scale web assets in www/.');

// Bundle the native Firebase Authentication bridge for the WebView.
const esbuild = require('esbuild');
esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'firebase-auth.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: path.join(www, 'vendor', 'firebase-auth.js'),
  target: ['es2020']
});
