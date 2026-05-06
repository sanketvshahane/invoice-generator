const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('app.js', 'utf8');

const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/" });

try {
  dom.window.eval(script);
  dom.window.eval('updatePreview()');
  console.log("Success, preview innerHTML length: ", dom.window.document.getElementById('invoicePreview').innerHTML.length);
} catch (e) {
  console.error("Error: ", e.message, e.stack);
}
