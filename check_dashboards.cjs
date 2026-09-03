const fs = require('fs');

function check() {
    fs.readdirSync('src/pages/dashboard').forEach(f => {
        if(f.endsWith('.tsx')) {
            const m = fs.readFileSync('src/pages/dashboard/' + f, 'utf8').match(/return\s*\(\s*<div\s*className="([^"]+)"/);
            if(m) console.log(f, '=>', m[1]);
        }
    });
}
check();
