const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM(`<!DOCTYPE html><body><div id="root"></div></body>`, { runScripts: "dangerously" });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
const code = fs.readFileSync("dist/assets/index-Bbn2fXBX.js", "utf-8"); // Replace with unminified path
try {
  dom.window.eval(code);
  console.log("No error!");
} catch(e) {
  console.error(e.stack);
}
