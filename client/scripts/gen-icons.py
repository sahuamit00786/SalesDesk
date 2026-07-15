import re, os, sys

SRC = r'd:\Connexify\client\src'
OUT = os.path.join(SRC, 'components', 'ui', 'icons.jsx')

names = set()
for root, d, fs in os.walk(SRC):
    for f in fs:
        if not f.endswith(('.js', '.jsx')):
            continue
        p = os.path.join(root, f)
        if os.path.abspath(p) == os.path.abspath(OUT):
            continue
        s = open(p, encoding='utf8', errors='ignore').read()
        for blk in re.findall(r'import\s*\{([^}]*)\}\s*from\s*[\'"]lucide-react[\'"]', s, re.S):
            for n in blk.split(','):
                n = n.strip().split(' as ')[0].strip()
                if n:
                    names.add(n)

names = sorted(names)

imports = ',\n'.join('  %s as _%s' % (n, n) for n in names)
exports = '\n'.join(
    'export const %s = /*#__PURE__*/ withTone(_%s, %r)' % (n, n, n) for n in names
)

body = '''/**
 * Tone-aware re-export of every lucide icon used in this app.
 *
 * GENERATED — do not hand-edit. Regenerate after adding a new lucide icon:
 *   python scripts/gen-icons.py
 *
 * Import icons from here, never from 'lucide-react' directly, so that an icon
 * picks up its semantic tone (see @/utils/iconTones) on every surface.
 *
 * The tone is only a class tag; its colour is a zero-specificity :where() rule in
 * index.css. So <Trash2 className="text-white" /> stays white, and any
 * `cx-icon-inherit` surface (primary buttons) reverts its icons to currentColor.
 * Nothing here needs to know about those overrides — the cascade settles it.
 *
 * Icons are wrapped, not re-styled, so `import { X } from '@/components/ui/icons'`
 * keeps lucide's API: same props, same ref forwarding. Untoned icons (chrome,
 * editor toolbars) are re-exported as-is, with no wrapper at all.
 */
import { forwardRef } from 'react'
import {
%s,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { toneClassFor } from '@/utils/iconTones'

function withTone(Base, name) {
  const tone = toneClassFor(name)
  if (!tone) return Base
  const Toned = forwardRef(function Toned({ className, ...props }, ref) {
    return <Base ref={ref} className={cn(tone, className)} {...props} />
  })
  Toned.displayName = name
  return Toned
}

%s
''' % (imports, exports)

open(OUT, 'w', encoding='utf8', newline='\n').write(body)
print('wrote', OUT, 'with', len(names), 'icons')
