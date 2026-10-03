#!/usr/bin/env python3
"""Converte tools/laudos/mascaras_us.txt (máscaras de laudo de US) em
js/laudos-us-mascaras.js. Remove os campos de identificação (paciente,
datas, liberado por, CRM). Estrutura de cada linha:
  item  : "- Rótulo: texto" (dash) ou "Rótulo: texto" (sem hífen)
  cont  : linha que continua o item anterior
  opt   : linha opcional da máscara ("XXX ...") — vira caixa de seleção
  line  : linha fixa; blank: linha em branco
"""
import json, re, unicodedata, os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'mascaras_us.txt')
OUT = os.path.join(HERE, '..', '..', 'js', 'laudos-us-mascaras.js')

DROP = re.compile(r'^(Nome do Paciente|Data de Nascimento|Data do Exame|Liberado por|CRM)\s*:', re.I)
GROUPS = {'B':'Medicina interna','C':'Cabeça e pescoço','D':'Musculoesquelético','E':'Vascular','F':'Obstétrico','G':'Vascular','H':'Mama','M':'Mamografia','O':'Densitometria'}
EXTRA = os.path.join(HERE, 'mascaras_klugrads.txt')   # máscaras escritas pelo KlugRads
EXTRA_NOMES = {'MAMAS':'Mamas', 'OCT DE MÁCULA (OFTALMOLOGIA)':'OCT Oftalmologia — mácula'}
MMG = os.path.join(HERE, 'mascaras_mmg.txt')          # mamografia (KlugRads)
DMO = os.path.join(HERE, 'mascaras_dmo.txt')          # densitometria (KlugRads)
TC = os.path.join(HERE, 'mascaras_tc.txt')            # tomografia / OCT (KlugRads)
LABEL_DASH = re.compile(r'^-\s+([^:]{1,120}?):\s*(.*)$')
LABEL_NODASH = re.compile(r'^([A-ZÀ-Ú][^:]{1,45}?):\s+(\S.*)$')
TRAILER = re.compile(r'^(Obs\b|Obs\.|Valores de refer|Refer[eê]ncias|•|\*|Nota\b)', re.I)

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-', s).strip('-')

txt = open(SRC, encoding='utf-8').read().replace(' ',' ').replace('\r','')
# variante de marcador usada em algumas máscaras: [<>] / [< >] = campo; [<texto>] = frase opcional
txt = re.sub(r'^\[<(.+)>\]\.?\s*$', lambda m: 'XXX '+m.group(1).strip()+'.', txt, flags=re.M)
txt = re.sub(r'\[<\s*>\]\s*(?=[a-zA-Z])', 'XXX ', txt)
txt = re.sub(r'\[<\s*>\]', 'XXX', txt)
lines = txt.split('\n')
# índice (nomes bonitos)
idx_names = []
i = 1
while not lines[i].startswith('====='):
    if lines[i].strip(): idx_names.append(lines[i].strip())
    i += 1

models = []
def read_models(lns, extra=False, metodo='us'):
    group = None; cur = None
    for ln in lns:
        m = re.match(r'^([B-HMO])\.\s+[A-ZÀ-Ú][A-ZÀ-Ú ]+:\s*$', ln)   # cabeçalho de grupo (ex.: "D. MUSCULOESQUELÉTICO:")
        if m: group = GROUPS[m.group(1)]; continue
        m = re.match(r'^(\d+)\.\s+(.+)$', ln)
        if m and group:
            cur = {'n':int(m.group(1)), 'grupo':group, 'raw':[], 'metodo':metodo}
            if extra:
                h = m.group(2).strip()
                cur['nome'] = EXTRA_NOMES.get(h, h.capitalize() if h.isupper() else h)   # nome em caixa mista fica como está
            models.append(cur); continue
        if ln.startswith('-----') or ln.startswith('====='): cur = None; continue
        if cur is not None: cur['raw'].append(ln.rstrip())
read_models(lines[i:])
if os.path.exists(EXTRA):
    read_models(open(EXTRA, encoding='utf-8').read().split('\n'), extra=True)
if os.path.exists(MMG):
    read_models(open(MMG, encoding='utf-8').read().split('\n'), extra=True, metodo='mmg')
if os.path.exists(DMO):
    read_models(open(DMO, encoding='utf-8').read().split('\n'), extra=True, metodo='dmo')
if os.path.exists(TC):
    read_models(open(TC, encoding='utf-8').read().split('\n'), extra=True, metodo='tc')

out = []
for md in models:
    # marcadores de modelo: linhas "[oct]" etc. (saem do texto)
    flags = [l.strip()[1:-1] for l in md['raw'] if re.match(r'^\[[a-z-]+\]$', l.strip())]
    md['raw'] = [l for l in md['raw'] if not re.match(r'^\[[a-z-]+\]$', l.strip())]
    raw = md['raw']
    # título: linhas até a 1ª linha em branco / campo de identificação
    title = []
    k = 0
    while k < len(raw) and raw[k].strip() and not DROP.match(raw[k].strip()):
        title.append(raw[k].strip()); k += 1
    body = [l for l in raw[k:] if not DROP.match(l.strip())]
    # separa conclusão
    ci = next((j for j,l in enumerate(body) if re.match(r'^\s*(Conclus|Hip[óo]tese diagn)', l, re.I)), None)
    conc_title = None; conc = []; trailer = []
    if ci is not None:
        conc_title = body[ci].strip()
        rest = body[ci+1:]; body = body[:ci]
        tr = False
        for l in rest:
            s = l.strip()
            if not s: 
                if conc: tr = True
                continue
            if tr or TRAILER.match(s): tr = True; trailer.append(s); continue
            if s.startswith('XXX'):
                t = re.sub(r'^XXX\s*-?\s*','', s); conc.append({'opt':True,'text':t}); continue
            dash = s.startswith('-')
            conc.append({'text':re.sub(r'^-\s*','', s), 'dash':dash})
    # corpo
    items = []; seq = []; used = {}; last = None; grp = ''; ctx = {'dash':''}
    def key_for(label):
        b = slug(re.sub(r'\s+X{2,3}\s+.*$','',label))[:40].strip('-') or 'item'
        used[b] = used.get(b,0)+1
        return b if used[b]==1 else f'{b}-{used[b]}'
    def add(label, text, dash):
        it = {'k':key_for(label or text[:30]), 'label':label, 'text':text, 'dash':dash, 'opts':[], 'grp': grp if dash else ctx['dash']}
        items.append(it); seq.append({'t':'item','k':it['k']}); return it
    for bi, l in enumerate(body):
        s = l.strip()
        # bloco: "Rótulo:" seguido de linhas recuadas → um único item (cada linha recuada numa linha do laudo)
        if l.startswith(('  ','\t')) and s and last is not None and last.get('bloco'):
            last['text'] += '\n' + s; continue
        if s.endswith(':') and bi+1 < len(body) and body[bi+1].startswith(('  ','\t')) and body[bi+1].strip():
            last = add(s[:-1].strip(), '', False); last['bloco'] = True; continue
        if not s:
            if seq and seq[-1]['t']!='blank': seq.append({'t':'blank'})
            last = None; continue
        if s.startswith('XXX ') or s=='XXX':
            t = re.sub(r'^XXX\s*-?\s*','', s)
            if last: last['opts'].append(t)
            else: last = add('', t, False)
            continue
        m = LABEL_DASH.match(s); dash = True
        if not m:
            m = LABEL_NODASH.match(s); dash = False
            if m and not m.group(2).strip(): m = None
        if m:
            last = add(m.group(1).strip(), m.group(2).strip(), dash)
            if dash: ctx['dash'] = re.sub(r'\s+X{2,3}\s+.*$','',last['label'])
            continue
        if s.endswith(':') or s.isupper():          # cabeçalho de bloco (ex.: "Membro inferior direito:")
            grp = s.rstrip(':').strip().capitalize() if s.isupper() else s.rstrip(':').strip()
            seq.append({'t':'line','text':s}); last = None; continue
        if last and last['label']:
            last['text'] += '\n' + s; continue
        last = add('', s, s.startswith('-'))
    while seq and seq[0]['t']=='blank': seq.pop(0)
    while seq and seq[-1]['t']=='blank': seq.pop()
    # alternativas do item: "texto padrão || variação 2 || variação 3"
    for it in items:
        if ' || ' in it['text']:
            alts = [x.strip() for x in it['text'].split(' || ')]
            it['text'] = alts[0]; it['alts'] = alts
    for it in items: it.pop('bloco', None)
    labs = {}
    for it in items: labs[it['label']] = labs.get(it['label'],0)+1
    for it in items:
        if not it['label'] or labs[it['label']]<2: it['grp'] = ''
    nome = md.get('nome') or (idx_names[md['n']-1] if md['n']-1 < len(idx_names) else md['raw'][0])
    out.append({'id':md['metodo']+'-'+slug(nome), 'metodo':md['metodo'], 'nome':nome, 'grupo':md['grupo'], 'titulo':title,
                'items':items, 'seq':seq, 'concTitulo':conc_title, 'conc':conc, 'trailer':trailer, 'flags':flags})

ids = [o['id'] for o in out]
assert len(ids)==len(set(ids)), 'ids repetidos'
js = ('/* Gerado por tools/laudos/parse_mascaras.py — não editar à mão. */\n'
      'const LAU_US_MASKS = ' + json.dumps([o for o in out if o['metodo']=='us'], ensure_ascii=False, indent=0) + ';\n'
      'const LAU_MMG_MASKS = ' + json.dumps([o for o in out if o['metodo']=='mmg'], ensure_ascii=False, indent=0) + ';\n'
      'const LAU_DMO_MASKS = ' + json.dumps([o for o in out if o['metodo']=='dmo'], ensure_ascii=False, indent=0) + ';\n'
      'const LAU_TC_MASKS = ' + json.dumps([o for o in out if o['metodo']=='tc'], ensure_ascii=False, indent=0) + ';\n')
open(OUT,'w',encoding='utf-8').write(js)
print(len(out),'máscaras')
for o in out: print(o['id'], '|', len(o['items']),'itens |', len(o['conc']),'conc |', o['concTitulo'])
