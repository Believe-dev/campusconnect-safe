const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build the project first
console.log('Building project...');
execSync('npm run build', { stdio: 'inherit' });

// Additional obfuscation steps
const distPath = path.join(__dirname, '..', 'dist');

// Remove source map files if any exist
const removeSourceMaps = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      removeSourceMaps(filePath);
    } else if (file.endsWith('.map')) {
      fs.unlinkSync(filePath);
      console.log(`Removed source map: ${file}`);
    }
  });
};

// Add anti-debugging code to main JS files
const addAntiDebug = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      addAntiDebug(filePath);
    } else if (file.endsWith('.js') && !file.includes('worker')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add anti-debugging code at the beginning
      const antiDebugCode = `
(function(){
  var devtools = {open: false, orientation: null};
  var threshold = 160;
  setInterval(function(){
    if(window.outerHeight - window.innerHeight > threshold || 
       window.outerWidth - window.innerWidth > threshold){
      if(!devtools.open){
        devtools.open = true;
        console.clear();
        console.log('%cDeveloper tools detected!', 'color: red; font-size: 20px;');
      }
    } else {
      devtools.open = false;
    }
  }, 500);
  
  // Disable right-click context menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
  
  // Disable F12, Ctrl+Shift+I, Ctrl+U
  document.addEventListener('keydown', function(e) {
    if(e.keyCode === 123 || 
       (e.ctrlKey && e.shiftKey && e.keyCode === 73) ||
       (e.ctrlKey && e.keyCode === 85)) {
      e.preventDefault();
    }
  });
})();
`;
      
      content = antiDebugCode + content;
      fs.writeFileSync(filePath, content);
      console.log(`Added anti-debug code to: ${file}`);
    }
  });
};

console.log('Removing source maps...');
removeSourceMaps(distPath);

console.log('Adding anti-debugging measures...');
addAntiDebug(path.join(distPath, 'assets'));

console.log('Build obfuscation complete!');