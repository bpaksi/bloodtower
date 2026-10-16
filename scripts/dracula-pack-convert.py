import re,json,glob,os,collections
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
SD='assets/stories/dracula/scripts/'
files=sorted(f for f in glob.glob(SD+'*.md') if os.path.basename(f) not in('README.md','cast.md','props.md'))
LABEL={'the count':'count','mother ursula':'ursula','sergeant dorn':'dorn','jozef kessel':'jozef'}
SHIFT={'whisper'}
hdr=re.compile(r'^\*\*([a-z0-9][a-z0-9.~<>_-]*\.[a-z0-9.~<>_-]+)\*\*(.*)$')
ln=re.compile(r'^> \*\*([^*:]+?)(?: \(([^)]*)\))?:\*\*\s*(.*)$')
src=re.compile(r'\s*\*\((Stoker|after Stoker|adapted from Stoker)[^)]*\)\*')
moments=collections.OrderedDict();flags=[];speakers=collections.Counter()
def words(t): return len(re.sub(r'\[pause [\d.]+\]','',t).split())
def secs(t): return words(t)/2.5+sum(float(x) for x in re.findall(r'\[pause ([\d.]+)\]',t))
for f in files:
  cur=None;tgt=None
  for i,l in enumerate(open(f),1):
    m=hdr.match(l.strip())
    if m:
      cur=m.group(1);t=re.search(r'`(ipad:[a-z]+)`',m.group(2));tgt=t.group(1) if t else None
      if '.private.' in cur and not tgt: tgt='ipad:'+re.search(r'\.private\.([a-z]+)',cur).group(1)
      if '<' in cur: flags.append(f'{os.path.basename(f)}:{i} moment id has placeholder: {cur}')
      continue
    m=ln.match(l.rstrip('\n'))
    if not m: continue
    if not cur: flags.append(f'{os.path.basename(f)}:{i} line outside a moment');continue
    lab,style,text=m.group(1).strip(),m.group(2),m.group(3).strip()
    sp=LABEL.get(lab.lower(),lab.split()[-1].lower() if lab.lower() not in LABEL else None)
    notes=[]
    if style:
      if style=='private': pass
      elif style in SHIFT: sp=sp+'-whisper'
      else: notes.append(style)
    s=src.search(text)
    if s: notes.append('source: '+s.group(1)); text=src.sub('',text)
    if '—' in text: flags.append(f'{os.path.basename(f)}:{i} em dash replaced in {cur}'); text=re.sub(r'\s*—\s*','... ',text).strip()
    text=text.replace('*','').strip()
    d=re.match(r'^\(([^)]*)\)\s*',text)
    if d: notes.append(d.group(1)); text=text[d.end():]
    text=re.sub(r'\s*\(beat\)\s*',' [pause 1] ',text).strip()
    if re.search(r'\(([^)]*[.!?])\)\s*$',text):
      flags.append(f'{os.path.basename(f)}:{i} {cur} italic aside kept as spoken text (parentheses dropped)')
      text=re.sub(r'\(([^)]*[.!?])\)\s*$',lambda m: m.group(1)[0].upper()+m.group(1)[1:],text)
    for d in re.findall(r'\(([^)]*)\)',text):
      notes.append('direction: '+d); flags.append(f'{os.path.basename(f)}:{i} {cur} inline stage direction moved to note: ({d})')
    text=re.sub(r'\s*\([^)]*\)\s*',' ',text).strip()
    speakers[sp]+=1
    mo=moments.setdefault(cur,{'file':os.path.basename(f),'target':tgt,'lines':[]})
    # split if >20s
    chunks=[text]
    if secs(text)>20:
      sents=re.split(r'(?<=[.!?"])\s+',text);chunks=[];c=''
      for s_ in sents:
        if c and secs(c+' '+s_)>20: chunks.append(c);c=s_
        else: c=(c+' '+s_).strip()
      chunks.append(c)
      flags.append(f'{os.path.basename(f)}:{i} {cur} line ~{secs(text):.0f}s split into {len(chunks)} lines'+(' (a chunk still >20s)' if any(secs(x)>20 for x in chunks) else ''))
    for c in chunks: mo['lines'].append({'speaker':sp,'note':'; '.join(notes) or None,'text':c})
out=['# Dracula pack: talking-avatar script (story-pack-format 2.1).','# Generated from assets/stories/dracula/scripts/*.md. Line ids are stable: never renumber; retire, do not reuse.','# target is added for private moments (ipad:<hunter>); untagged moments play on storyboard.','']
tot=0
for mid,mo in moments.items():
  ns=set(x['speaker'].replace('-whisper','') for x in mo['lines'])-{'narrator'}
  if len(ns)>2: flags.append(f"{mo['file']} {mid}: {len(ns)} speakers ({', '.join(sorted(ns))}) > 2")
  out.append(f'- id: {json.dumps(mid)}');out.append(f"  source: {mo['file']}")
  if mo['target']: out.append(f"  target: {mo['target']}")
  out.append('  lines:')
  for n,x in enumerate(mo['lines'],1):
    tot+=1
    e=f"    - {{id: {json.dumps(mid+'.vo-%02d'%n)}, speaker: {x['speaker']}, "
    if x['note']: e+=f"note: {json.dumps(x['note'])}, "
    e+=f"text: {json.dumps(x['text'],ensure_ascii=False)}}}"
    out.append(e)
open('packs/dracula/script.yaml','w').write('\n'.join(out)+'\n')
print('moments',len(moments),'lines',tot);print(dict(speakers));print('\n'.join(flags))

