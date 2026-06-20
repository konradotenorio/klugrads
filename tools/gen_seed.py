#!/usr/bin/env python3
"""Gera os itens do UltraRef a partir dos recursos exatos extraídos do MedUltra.
Lê: tools/medultra_data/{pt.json, blueprint.json, charts/*.xml}
Monta cada item no modelo do PWA (group/region/name/abbr/table|meas/note/exam/refs/calc).
Saída: tools/medultra_data/items.generated.json  (para inspeção antes de virar seed.js)
"""
import json, re, os, unicodedata, glob
BASE = os.path.join(os.path.dirname(__file__), 'medultra_data')
pt = json.load(open(os.path.join(BASE, 'pt.json')))
blueprint = json.load(open(os.path.join(BASE, 'blueprint.json')))

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return s

def get(*names):
    """Primeiro valor de recurso não-vazio dentre os nomes dados."""
    for n in names:
        if n in pt and pt[n].strip():
            return pt[n].strip()
    return None

def core_of(token):
    return re.sub(r'(Adulto|Pediatrico)$', '', token)

def pop_ok(pop, k):
    if pop == 'Adultos':
        return 'Pediatrico' not in k and 'Fetal' not in k
    if pop == 'Pediatria':
        return 'Pediatrico' in k
    return True

def grid_from_cells(cells):
    maxr = max(r for r, c in cells); maxc = max(c for r, c in cells)
    return [[cells.get((r, c), '') for c in range(1, maxc + 1)] for r in range(1, maxr + 1)]

def collect_tables(token, pop):
    """Todas as tabelas do item: qualquer chave tabela...L#C# que contenha o core
    do órgão, agrupadas por prefixo (= uma tabela cada), filtrando por população."""
    core = core_of(token)
    groups = {}
    for k, v in pt.items():
        m = re.match(r'^(tabela.*?)L(\d+)C(\d+)$', k)
        if not m:
            continue
        prefix = m.group(1)
        if core not in prefix:
            continue
        if 'Pratico' in prefix:           # tabela "Apenas medidas" (modo rápido) — pula
            continue
        if not pop_ok(pop, prefix):
            continue
        groups.setdefault(prefix, {})[(int(m.group(2)), int(m.group(3)))] = v
    tables = []
    for prefix in sorted(groups):
        rows = grid_from_cells(groups[prefix])
        title = get(re.sub(r'^tabela', 'headerTabela', prefix), 'header' + prefix[6:])
        tables.append({'title': title, 'rows': rows})
    return tables

def collect_list(prefix, token):
    """Junta prefix{token}1..N (ou sem número) em ordem."""
    out = []
    # com número
    pat = re.compile(r'^' + re.escape(prefix) + re.escape(token) + r'(\d+)$')
    numbered = []
    for k, v in pt.items():
        m = pat.match(k)
        if m:
            numbered.append((int(m.group(1)), v.strip()))
    numbered.sort()
    out = [v for _, v in numbered]
    # sem número (singular)
    base = prefix + token
    if base in pt and pt[base].strip():
        out.insert(0, pt[base].strip())
    return out

def collect_refs(token):
    """Referências: refTabela{token}*, referencia{token}*, referenciaTabela{token}*, ref{token}*."""
    refs = []
    seen = set()
    pats = [r'^refTabela'+re.escape(token)+r'\d*$', r'^referenciaTabela'+re.escape(token)+r'\d*$',
            r'^referencia'+re.escape(token)+r'\d*$', r'^ref'+re.escape(token)+r'\d*$',
            r'^referencia'+re.escape(token)+r'$']
    items = []
    for k, v in pt.items():
        for p in pats:
            if re.match(p, k):
                num = re.search(r'(\d+)$', k)
                items.append((int(num.group(1)) if num else 0, v.strip(), k))
                break
    items.sort()
    for _, v, k in items:
        if v and v not in seen:
            seen.add(v); refs.append(v)
    return refs

def collect_asts(token):
    out = []
    for k in sorted(pt):
        if re.match(r'^ast\d*Tabela'+re.escape(token)+r'\d*$', k) or re.match(r'^astTabela'+re.escape(token)+r'\d*$', k) or re.match(r'^ast\d*'+re.escape(token)+r'$', k):
            v = pt[k].strip()
            if v and v not in out:
                out.append(v)
    return out

GROUP_MAP = {'Fetal': 'Fetal', 'Pediatria': 'Pediatria', 'Adultos': 'Adultos'}
items = []
report = {'ok': [], 'sem_tabela': [], 'sem_conteudo': []}

for pop, sections in blueprint.items():
    if pop.startswith('_'):
        continue
    for region, lst in sections.items():
        for it in lst:
            token = it['token']
            name = get(it.get('token','').lower()) or it['name']  # nome de exibição
            name = it['name']
            abbr = it.get('sigla', '') or (get(slugkey(token)) if False else '')
            entry = {
                'id': slug(pop + '-' + token),
                'group': GROUP_MAP[pop],
                'region': region,
                'name': name,
                'abbr': it.get('sigla', ''),
                'iconKey': 'organ',
            }
            tables = collect_tables(token, pop)
            prep = get('preparo'+token)
            pos = get('posicionamento'+token, 'posicao'+token)
            tec = get('tecnica'+token)
            refs = collect_refs(token)
            asts = collect_asts(token)
            points = collect_list('pontosChave'+token, '') or collect_list(token.lower()+'PontosChave', '')

            if tables:
                entry['tables'] = tables
            if asts:
                entry['footnotes'] = asts
            exam = {}
            if prep: exam['prep'] = prep
            if pos: exam['position'] = pos
            if tec: exam['technique'] = tec
            if points: exam['points'] = points
            if exam:
                entry['exam'] = exam
            if refs:
                entry['refs'] = refs

            items.append(entry)
            if tables:
                report['ok'].append(entry['id'])
            elif prep or tec or refs or points:
                report['sem_tabela'].append(entry['id'])
            else:
                report['sem_conteudo'].append(entry['id'])

def slugkey(s): return s  # placeholder

# ---- charts de percentil (XML) -> tabela exibível anexada ao item ----
import xml.etree.ElementTree as ET
CHART_DIR = os.path.join(BASE, 'charts')
FIELD_LABEL = {
    'CCN': 'CCN (mm)', 'IGSemanas': 'IG (sem)', 'IGDias': 'IG (dias)', 'DP': 'DP (dias)',
    'Idade': 'Idade', 'IdadeStr': 'Idade', 'Media': 'Média', 'Medida': 'Medida',
    'LimiteSuperior': 'Limite superior', 'LimiteInferior': 'Limite inferior',
    'Percentil5': 'P5', 'Percentil50': 'P50', 'Percentil95': 'P95',
    'Semana': 'Semana', 'Valor': 'Valor', 'Minimo': 'Mín', 'Maximo': 'Máx',
    'Peso': 'Peso (g)', 'IG': 'IG',
}
def parse_chart(chart_name):
    path = None
    for p in glob.glob(os.path.join(CHART_DIR, '*'+chart_name+'.xml')):
        path = p; break
    if not path:
        return None
    try:
        root = ET.parse(path).getroot()
    except Exception:
        return None
    rows = []
    fields = []
    for child in root:               # cada <CriancaX>
        rec = []
        for f in child:
            tag = f.tag
            if tag not in fields:
                fields.append(tag)
            rec.append((tag, (f.text or '').strip()))
        rows.append(dict(rec))
    if not rows:
        return None
    header = [FIELD_LABEL.get(f, f) for f in fields]
    body = [[r.get(f, '') for f in fields] for r in rows]
    return {'fields': fields, 'header': header, 'rows': body}

# anexa charts aos itens conforme blueprint
by_id = {it['id']: it for it in items}
chart_attached = 0
for pop, sections in blueprint.items():
    if pop.startswith('_'): continue
    for region, lst in sections.items():
        for it in lst:
            if not it.get('chart'): continue
            iid = slug(pop + '-' + it['token'])
            entry = by_id.get(iid)
            if not entry: continue
            ch = parse_chart(it['chart'])
            if ch:
                entry['chart'] = ch        # dados numéricos exatos (para tabela/calculadora)
                chart_attached += 1

json.dump(items, open(os.path.join(BASE, 'items.generated.json'), 'w'), ensure_ascii=False, indent=1)

# ---- emite js/seed.js (window.SEED_DATA) ----
SEED_PATH = os.path.join(os.path.dirname(__file__), '..', 'js', 'seed.js')
header_comment = (
"/* =========================================================================\n"
"   UltraRef — SEED de dados (fonte da verdade + fallback OFFLINE)\n"
"   GERADO automaticamente por tools/gen_seed.py a partir do conteúdo exato\n"
"   do app MedUltra (propriedade do usuário). NÃO editar à mão: editar os\n"
"   recursos/gerador e rodar `python3 tools/gen_seed.py`.\n"
"   ========================================================================= */\n"
)
body = json.dumps(items, ensure_ascii=False, separators=(',', ':'))
with open(SEED_PATH, 'w') as f:
    f.write(header_comment)
    f.write(';(function (root) {\n  root.SEED_DATA = ')
    f.write(body)
    f.write(';\n})(typeof globalThis !== \'undefined\' ? globalThis : this);\n')

print('charts anexados:', chart_attached)
print('itens gerados:', len(items))
print('seed.js escrito em:', os.path.normpath(SEED_PATH), '(%d bytes)' % os.path.getsize(SEED_PATH))
print('com tabela:', len(report['ok']))
print('sem tabela (mas com exame/refs):', len(report['sem_tabela']), report['sem_tabela'][:20])
print('SEM conteúdo (revisar):', len(report['sem_conteudo']), report['sem_conteudo'])
