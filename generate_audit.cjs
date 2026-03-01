const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'AI_AUDIT_DUMP.md');
let content = '# Full Application Audit Dump\n\n';

content += '## 1. Architecture & Documentation\n\n';
const docFiles = ['GLOBAL_BLUEPRINT.md', 'FLOWCHART.md', 'FEATURES_LIST.md', 'README.md'];
for (const f of docFiles) {
    const fullP = path.join(__dirname, f);
    if (fs.existsSync(fullP)) {
        content += `### ${f}\n\`\`\`markdown\n${fs.readFileSync(fullP, 'utf8')}\n\`\`\`\n\n`;
    }
}

content += '## 2. Configuration Files\n\n';
const configFiles = ['package.json', 'vite.config.ts', 'tsconfig.json', 'backend/package.json', 'backend/tsconfig.json'];
for (const f of configFiles) {
    const fullP = path.join(__dirname, f);
    if (fs.existsSync(fullP)) {
        const ext = path.extname(f).slice(1) || 'json';
        content += `### ${f}\n\`\`\`${ext}\n${fs.readFileSync(fullP, 'utf8')}\n\`\`\`\n\n`;
    }
}

content += '## 3. Source Code\n\n';

const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html'];

function walkDir(dir, baseDir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (['node_modules', 'dist', '.git', 'public', 'sessions'].includes(file)) continue;
            walkDir(fullPath, baseDir);
        } else {
            const ext = path.extname(fullPath);
            if (!allowedExtensions.includes(ext)) continue;
            // Skip package-lock
            if (file.includes('package-lock')) continue;
            
            const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            content += `### ${relPath}\n\`\`\`${ext.slice(1) || 'text'}\n${fileContent}\n\`\`\`\n\n`;
        }
    }
}

walkDir(path.join(__dirname, 'src'), __dirname);
walkDir(path.join(__dirname, 'backend', 'src'), __dirname);

fs.writeFileSync(outputFile, content);
console.log('✅ Generated ' + outputFile);
