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
            
            // Replace any class containing both overflow-x-auto and hover-scrollbar with flex-wrap instead of flex-nowrap
            content = content.replace(/className="([^"]*overflow-x-auto[^"]*hover-scrollbar[^"]*)"/g, (match, classes) => {
                // If it's a toolbar, remove the overflow properties and add flex-wrap
                let newClasses = classes.replace('overflow-x-auto', '').replace('hover-scrollbar', '').replace('flex-nowrap', 'flex-wrap');
                return `className="${newClasses.replace(/\s+/g, ' ').trim()}"`;
            });
            // Also remove the onWheel event that was used for scrolling the toolbar
            content = content.replace(/onWheel=\{\(e\) => \{\s*e\.currentTarget\.scrollLeft \+= e\.deltaY;\s*\}\}/g, '');
            
            if (content !== orig) {
                fs.writeFileSync(p, content, 'utf8');
                console.log('Fixed missed toolbar in:', p);
            }
        }
    });
}

processDir('src/pages');
console.log('Done.');
