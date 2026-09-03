const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            processDir(p);
        } else if (p.endsWith('.tsx')) {
            let content = fs.readFileSync(p, 'utf8');
            let orig = content;
            
            // Fix the toolbar overflow issue which clips the Dropdown
            const regex = /className="flex flex-nowrap items-center gap-2 px-3 py-2 border-b border-gray-300 overflow-x-auto hover-scrollbar"[^>]*>/g;
            content = content.replace(regex, 'className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-300">');
            
            if (content !== orig) {
                fs.writeFileSync(p, content, 'utf8');
                console.log('Fixed toolbar in:', p);
            }
        }
    });
}

processDir('src/pages');
console.log('Done.');
