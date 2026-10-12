const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
const zip = path.join(out, 'whatsapp-smooth-scroll.zip');
execFileSync('python3', ['-c', `import pathlib,sys,zipfile
source=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(source.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(source))
`, path.join(root,'extension'),zip]);
console.log(zip);
