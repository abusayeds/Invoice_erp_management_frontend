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
            
            // The bad replacement string was:
            // <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-300"> { e.currentTarget.scrollLeft += e.deltaY; }}>
            
            content = content.replace(/className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-300">\s*\{\s*e\.currentTarget\.scrollLeft \+= e\.deltaY;\s*\}\}>/g, 
                'className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-300">');
                
            if (content !== orig) {
                fs.writeFileSync(p, content, 'utf8');
                console.log('Fixed syntax error in:', p);
            }
        }
    });
}

processDir('src/pages');
