const fs = require('fs');

const files = [
  'AccountDashboard.tsx', 'CRMDashboard.tsx', 'HRMDashboard.tsx',
  'POSDashboard.tsx', 'ProjectDashboard.tsx', 'RecruitmentDashboard.tsx',
  'SupportDashboard.tsx'
];

files.forEach(f => {
    let p = 'src/pages/dashboard/' + f;
    let content = fs.readFileSync(p, 'utf8');
    let orig = content;
    
    content = content.replace(/className="max-w-\[?[a-zA-Z0-9px]+\]?\s*mx-auto"/g, 'className="w-full"');
    
    if (content !== orig) {
        fs.writeFileSync(p, content, 'utf8');
        console.log('Fixed max-w in:', f);
    }
});
