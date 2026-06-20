#!/usr/bin/env python3
"""Extrai pares chave->valor (strings) de um .NET .resources embutido num
assembly-satélite (.resources.dll). Formato RuntimeResourceReader v2.
Uso: extract_resources.py <arquivo.dll> <saida.json>
"""
import sys, json, struct

def read_7bit(b, p):
    """LEB128 (7-bit encoded int). Retorna (valor, nova_posicao)."""
    val = 0; shift = 0
    while True:
        byte = b[p]; p += 1
        val |= (byte & 0x7F) << shift
        if (byte & 0x80) == 0:
            break
        shift += 7
    return val, p

def parse(path):
    data = open(path, 'rb').read()
    start = data.find(b'\xce\xca\xef\xbe')  # magic 0xBEEFCACE
    if start < 0:
        raise SystemExit('magic .resources não encontrado')
    b = data[start:]              # posição 0 = início do stream .resources
    p = 0
    magic = struct.unpack_from('<I', b, p)[0]; p += 4
    assert magic == 0xBEEFCACE
    res_mgr_ver = struct.unpack_from('<i', b, p)[0]; p += 4
    num_skip = struct.unpack_from('<i', b, p)[0]; p += 4
    p += num_skip                 # pula o resto do header do ResourceManager
    version = struct.unpack_from('<i', b, p)[0]; p += 4
    num_res = struct.unpack_from('<i', b, p)[0]; p += 4
    num_types = struct.unpack_from('<i', b, p)[0]; p += 4
    for _ in range(num_types):    # pula nomes de tipos
        ln, p = read_7bit(b, p)
        p += ln
    # alinhamento a 8 bytes (relativo ao início do stream)
    align = p & 7
    if align != 0:
        p += (8 - align)
    p += 4 * num_res              # name hashes (pula)
    name_positions = list(struct.unpack_from('<%di' % num_res, b, p)); p += 4 * num_res
    data_section_offset = struct.unpack_from('<i', b, p)[0]; p += 4
    name_section_offset = p

    out = {}
    for i in range(num_res):
        np = name_section_offset + name_positions[i]
        ln, np = read_7bit(b, np)              # tamanho do nome (bytes, UTF-16LE)
        name = b[np:np+ln].decode('utf-16-le'); np += ln
        data_off = struct.unpack_from('<i', b, np)[0]
        dp = data_section_offset + data_off
        type_code, dp = read_7bit(b, dp)
        if type_code == 1:                      # ResourceTypeCode.String
            slen, dp = read_7bit(b, dp)
            val = b[dp:dp+slen].decode('utf-8')
            out[name] = val
        # outros tipos (numéricos/streams) ignorados — queremos texto
    return out, {'version': version, 'num_res': num_res, 'num_types': num_types,
                 'strings': len(out)}

if __name__ == '__main__':
    res, meta = parse(sys.argv[1])
    json.dump(res, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
    print('meta:', meta)
