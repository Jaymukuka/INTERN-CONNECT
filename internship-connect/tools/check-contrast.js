const fs = require('fs');
const path = require('path');

function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const num = parseInt(hex,16);
  return { r: (num>>16)&255, g:(num>>8)&255, b:num&255 };
}

function srgbToLin(c){
  c = c/255;
  return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4);
}

function relLuminance(rgb){
  return 0.2126*srgbToLin(rgb.r) + 0.7152*srgbToLin(rgb.g) + 0.0722*srgbToLin(rgb.b);
}

function contrastRatio(hex1, hex2){
  const L1 = relLuminance(hexToRgb(hex1));
  const L2 = relLuminance(hexToRgb(hex2));
  const lighter = Math.max(L1,L2);
  const darker = Math.min(L1,L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function findVar(css, name){
  const re = new RegExp(name + "\s*:\s*([^;]+);", 'i');
  const m = css.match(re);
  return m ? m[1].trim() : null;
}

const cssPath = path.join(__dirname,'..','Frontend','src','App.css');
const css = fs.readFileSync(cssPath,'utf8');

function normalizeColor(val){
  if(!val) return null;
  val = val.trim();
  // if rgba(...), try to extract rgb and blend over white if alpha
  const rgba = val.match(/rgba?\(([^)]+)\)/i);
  if(rgba){
    const parts = rgba[1].split(',').map(s=>s.trim());
    let r = parseInt(parts[0]);
    let g = parseInt(parts[1]);
    let b = parseInt(parts[2]);
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    if(a < 1){
      // blend over white
      r = Math.round(r*a + 255*(1-a));
      g = Math.round(g*a + 255*(1-a));
      b = Math.round(b*a + 255*(1-a));
    }
    const hex = "#" + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
    return hex;
  }
  // hex
  const hex = val.match(/#([0-9a-fA-F]{3,6})/);
  if(hex) return '#' + hex[1];
  // fallback: named colors not supported
  return null;
}

const vars = ['--accent-dark','--accent','--text-primary','--light-bg','--white','--card-bg'];
const colors = {};
for(const v of vars){
  const raw = findVar(css, v);
  colors[v] = normalizeColor(raw);
}

console.log('Found variables:');
console.log(colors);

const checks = [
  {a:'--accent-dark', b:'--white', wcag:4.5},
  {a:'--accent', b:'--white', wcag:4.5},
  {a:'--text-primary', b:'--light-bg', wcag:4.5},
  {a:'--text-primary', b:'--white', wcag:4.5}
];

console.log('\nContrast results:');
for(const c of checks){
  const A = colors[c.a];
  const B = colors[c.b];
  if(!A || !B){
    console.log(`${c.a} or ${c.b} missing value, skipped`);
    continue;
  }
  const ratio = contrastRatio(A,B).toFixed(2);
  const pass = ratio >= c.wcag ? 'PASS' : 'FAIL';
  console.log(`${c.a} (${A}) vs ${c.b} (${B}) => ratio ${ratio} — ${pass}`);
}

// finish
process.exit(0);
