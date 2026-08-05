/* =========================================================================
   KlugRads — cadastro e login (/login).
   -------------------------------------------------------------------------
   Fala direto com a API REST do GoTrue (Supabase Auth). Sem SDK: o projeto
   não tem etapa de build, e puxar a biblioteca de um CDN esbarraria na CSP
   (script-src 'self').

   Regras herdadas do LaudoZ (src/lib/validations/auth.ts):
     - CPF obrigatório; CRM opcional, com UF à parte.
     - Senha mínima de 8, com confirmação.
     - Aceite de termos obrigatório.

   Diferença proposital: aqui o CPF é validado pelos dígitos
   verificadores, não só pelo comprimento. CPF é a chave única da conta —
   deixar entrar "111.111.111-11" cria um cadastro que nunca vai bater com
   uma cobrança.

   Fluxo do Google: o GoTrue devolve os tokens no fragmento da URL. Quem
   entra por lá não tem CPF nem CRM, então cai na mesma tela de cadastro
   em modo "completar", sem os campos de e-mail e senha.
   ========================================================================= */
(function () {
  'use strict';

  var CFG = window.CONFIG || {};
  var API = CFG.SUPABASE_URL + '/auth/v1';
  var CHAVE_SESSAO = 'klugrads_sessao';
  var DESTINO = '/app';

  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
             'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  /* ===================== utilidades ===================== */

  function $(id) { return document.getElementById(id); }

  function soDigitos(v) { return (v || '').replace(/\D/g, ''); }

  function mascaraCPF(v) {
    v = soDigitos(v).slice(0, 11);
    if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
    if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    if (v.length > 3) return v.replace(/(\d{3})(\d+)/, '$1.$2');
    return v;
  }

  function mascaraTelefone(v) {
    v = soDigitos(v).slice(0, 11);
    if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
    if (v.length > 6)  return v.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
    if (v.length > 2)  return v.replace(/(\d{2})(\d+)/, '($1) $2');
    if (v.length > 0)  return '(' + v;
    return v;
  }

  // Dígitos verificadores. Rejeita também os repetidos (000..., 111...),
  // que passam na conta mas não existem na Receita.
  function cpfValido(cpf) {
    cpf = soDigitos(cpf);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    var soma, resto, i;
    soma = 0;
    for (i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf[9], 10)) return false;
    soma = 0;
    for (i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === parseInt(cpf[10], 10);
  }

  function emailValido(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim()); }

  /* ===================== mensagens ===================== */

  function mostrarAviso(texto, tipo) {
    var el = $('aviso');
    el.className = tipo === 'ok' ? 'aviso-ok' : 'aviso-erro';
    el.textContent = texto;
    el.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function limparAviso() { $('aviso').hidden = true; }

  function erroCampo(id, msg) {
    var campo = $(id), box = $('err-' + id);
    if (box) { box.textContent = msg || ''; box.hidden = !msg; }
    if (campo) campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function limparErros(prefixo) {
    Array.prototype.forEach.call(
      document.querySelectorAll('[id^="err-' + prefixo + '"]'),
      function (b) { b.hidden = true; b.textContent = ''; }
    );
    Array.prototype.forEach.call(
      document.querySelectorAll('[id^="' + prefixo + '"]'),
      function (c) { c.setAttribute('aria-invalid', 'false'); }
    );
  }

  /* ===================== sessão ===================== */

  function salvarSessao(dados) {
    try {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
        access_token: dados.access_token,
        refresh_token: dados.refresh_token,
        expires_at: dados.expires_at || (Math.floor(Date.now() / 1000) + (dados.expires_in || 3600)),
        user: dados.user || null
      }));
    } catch (e) { /* modo privado: segue sem persistir */ }
  }

  function lerSessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null'); }
    catch (e) { return null; }
  }

  /* ===================== chamadas ===================== */

  function chamar(caminho, corpo, token) {
    var h = {
      'Content-Type': 'application/json',
      apikey: CFG.SUPABASE_ANON_KEY
    };
    if (token) h.Authorization = 'Bearer ' + token;
    return fetch(API + caminho, {
      method: 'POST', headers: h, body: JSON.stringify(corpo)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { ok: r.ok, status: r.status, corpo: j };
      });
    });
  }

  // O GoTrue devolve mensagens em inglês; traduz as que o usuário
  // realmente encontra, e mantém o resto legível em vez de "erro".
  function traduzErro(corpo, status) {
    var m = (corpo && (corpo.msg || corpo.error_description || corpo.message || corpo.error)) || '';
    var b = m.toLowerCase();
    if (b.indexOf('invalid login credentials') >= 0) return 'E-mail ou senha incorretos.';
    if (b.indexOf('email not confirmed') >= 0) return 'Confirme seu e-mail antes de entrar. Verifique a caixa de entrada.';
    if (b.indexOf('user already registered') >= 0 || b.indexOf('already been registered') >= 0)
      return 'Já existe uma conta com esse e-mail. Use "Entrar".';
    if (b.indexOf('password') >= 0 && b.indexOf('least') >= 0) return 'A senha é curta demais.';
    // O GoTrue tem a própria régua de e-mail e recusa domínios que o
    // nosso regex aceita (TLD inexistente, descartáveis, etc.).
    if (b.indexOf('email') >= 0 && b.indexOf('invalid') >= 0) return 'E-mail inválido ou não aceito. Confira o endereço.';
    if (b.indexOf('duplicate key') >= 0 && b.indexOf('cpf') >= 0) return 'Esse CPF já está cadastrado.';
    if (b.indexOf('rate limit') >= 0 || status === 429) return 'Muitas tentativas. Espere um instante e tente de novo.';
    return m || 'Não foi possível concluir. Tente de novo em instantes.';
  }

  /* ===================== abas ===================== */

  var modoCadastro = 'cadastro';   // 'cadastro' | 'completar'

  function trocarAba(qual) {
    var entrar = qual === 'entrar';
    $('aba-entrar').setAttribute('aria-selected', entrar ? 'true' : 'false');
    $('aba-criar').setAttribute('aria-selected', entrar ? 'false' : 'true');
    $('form-entrar').hidden = !entrar;
    $('form-criar').hidden = entrar;
    limparAviso();
  }

  /* ===================== olho mágico ===================== */

  var OLHO_ABERTO =
    '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OLHO_FECHADO =
    '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7c1.7 0 3.2.5 4.5 1.2M22 12s-3.6 7-10 7c-1.7 0-3.2-.5-4.5-1.2"/><path d="m3 3 18 18"/></svg>';

  Array.prototype.forEach.call(document.querySelectorAll('.olho'), function (b) {
    b.innerHTML = OLHO_ABERTO;
    b.addEventListener('click', function () {
      var alvo = $(b.dataset.alvo);
      var vaiMostrar = alvo.type === 'password';
      alvo.type = vaiMostrar ? 'text' : 'password';
      b.innerHTML = vaiMostrar ? OLHO_FECHADO : OLHO_ABERTO;
      b.setAttribute('aria-label', vaiMostrar ? 'Ocultar senha' : 'Mostrar senha');
      alvo.focus();
    });
  });

  /* ===================== montagem ===================== */

  var selUF = $('c-crm-uf');
  UFS.forEach(function (uf) {
    var o = document.createElement('option');
    o.value = uf; o.textContent = uf;
    selUF.appendChild(o);
  });

  $('c-cpf').addEventListener('input', function (e) { e.target.value = mascaraCPF(e.target.value); });
  $('c-telefone').addEventListener('input', function (e) { e.target.value = mascaraTelefone(e.target.value); });
  $('c-crm').addEventListener('input', function (e) { e.target.value = soDigitos(e.target.value).slice(0, 10); });

  $('aba-entrar').addEventListener('click', function () { trocarAba('entrar'); });
  $('aba-criar').addEventListener('click', function () { trocarAba('criar'); });

  var params = new URLSearchParams(location.search);
  if (params.get('modo') === 'cadastro') trocarAba('criar');

  // O /app manda de volta para cá com o motivo. Sem isso a pessoa é
  // deslogada sem explicação e acha que o app quebrou — em especial no
  // caso de assinatura vencida, que não é erro nenhum.
  var MOTIVOS = {
    sessao: 'Sua sessão expirou. Entre novamente para continuar.',
    assinatura: 'Seu acesso ao conteúdo terminou. Renove a assinatura para voltar a usar o KlugRads.',
    outro_dispositivo: 'Sua conta foi aberta em outro aparelho. Entre de novo para usar aqui.'
  };
  if (MOTIVOS[params.get('motivo')]) mostrarAviso(MOTIVOS[params.get('motivo')]);

  /* ===================== validação do cadastro ===================== */

  function validarCadastro() {
    limparErros('c-');
    var ok = true;

    var nome = $('c-nome').value.trim();
    if (nome.length < 3) ok = erroCampo('c-nome', 'Informe seu nome completo.') && ok;
    else if (nome.indexOf(' ') < 0) ok = erroCampo('c-nome', 'Informe nome e sobrenome.') && ok;

    if (!cpfValido($('c-cpf').value)) ok = erroCampo('c-cpf', 'CPF inválido.') && ok;

    // CRM é opcional, mas se veio o número precisa vir a UF: CRM sem
    // estado não identifica ninguém.
    var crm = soDigitos($('c-crm').value);
    if (crm && !selUF.value) ok = erroCampo('c-crm', 'Informe a UF do CRM.') && ok;
    if (!crm && selUF.value) ok = erroCampo('c-crm', 'Informe o número do CRM.') && ok;

    if (soDigitos($('c-telefone').value).length < 10)
      ok = erroCampo('c-telefone', 'Telefone incompleto.') && ok;

    if (modoCadastro === 'cadastro') {
      if (!emailValido($('c-email').value)) ok = erroCampo('c-email', 'E-mail inválido.') && ok;
      if ($('c-senha').value.length < 8) ok = erroCampo('c-senha', 'A senha precisa de pelo menos 8 caracteres.') && ok;
      if ($('c-senha2').value !== $('c-senha').value) ok = erroCampo('c-senha2', 'As senhas não coincidem.') && ok;
    }

    if (!$('c-termos').checked) ok = erroCampo('c-termos', 'É preciso aceitar os termos para continuar.') && ok;

    return ok;
  }

  function dadosPerfil() {
    return {
      nome: $('c-nome').value.trim(),
      cpf: soDigitos($('c-cpf').value),
      crm: soDigitos($('c-crm').value) || null,
      crm_uf: selUF.value || null,
      telefone: soDigitos($('c-telefone').value)
    };
  }

  function ocupado(btn, sim, textoOriginal) {
    btn.disabled = sim;
    btn.textContent = sim ? 'Aguarde…' : textoOriginal;
  }

  /* ===================== entrar ===================== */

  $('form-entrar').addEventListener('submit', function (ev) {
    ev.preventDefault();
    limparErros('e-'); limparAviso();

    var email = $('e-email').value.trim(), senha = $('e-senha').value;
    var ok = true;
    if (!emailValido(email)) ok = erroCampo('e-email', 'E-mail inválido.') && ok;
    if (!senha) ok = erroCampo('e-senha', 'Informe a senha.') && ok;
    if (!ok) return;

    var btn = $('btn-entrar');
    ocupado(btn, true);
    chamar('/token?grant_type=password', { email: email, password: senha })
      .then(function (r) {
        if (!r.ok) { mostrarAviso(traduzErro(r.corpo, r.status)); ocupado(btn, false, 'Entrar'); return; }
        salvarSessao(r.corpo);
        window.location.replace(DESTINO);
      })
      .catch(function () {
        mostrarAviso('Sem conexão com o servidor. Verifique a internet.');
        ocupado(btn, false, 'Entrar');
      });
  });

  /* ===================== criar conta ===================== */

  $('form-criar').addEventListener('submit', function (ev) {
    ev.preventDefault();
    limparAviso();
    if (!validarCadastro()) return;

    var btn = $('btn-criar');
    var perfil = dadosPerfil();

    if (modoCadastro === 'completar') {
      concluirPerfilGoogle(perfil, btn);
      return;
    }

    ocupado(btn, true);
    chamar('/signup', {
      email: $('c-email').value.trim(),
      password: $('c-senha').value,
      data: perfil                      // vira raw_user_meta_data; o trigger cria o perfil
    }).then(function (r) {
      if (!r.ok) { mostrarAviso(traduzErro(r.corpo, r.status)); ocupado(btn, false, 'Criar conta'); return; }

      // Com confirmação de e-mail ligada, o signup não devolve sessão.
      if (r.corpo && r.corpo.access_token) {
        salvarSessao(r.corpo);
        window.location.replace(DESTINO);
      } else {
        mostrarAviso('Conta criada. Confirme o e-mail que enviamos para ativar o acesso.', 'ok');
        $('form-criar').hidden = true;
      }
    }).catch(function () {
      mostrarAviso('Sem conexão com o servidor. Verifique a internet.');
      ocupado(btn, false, 'Criar conta');
    });
  });

  /* ===================== Google ===================== */

  $('btn-google').addEventListener('click', function () {
    // Volta para cá, e não direto para /app: quem entra pelo Google chega
    // sem CPF/CRM e precisa completar o perfil antes de entrar.
    var volta = encodeURIComponent(location.origin + '/login');
    window.location.href = CFG.SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + volta;
  });

  function entrarModoCompletar(sessao) {
    modoCadastro = 'completar';
    trocarAba('criar');
    $('aba-entrar').hidden = true;
    $('aba-criar').textContent = 'Complete seu cadastro';
    ['c-email', 'c-senha', 'c-senha2'].forEach(function (id) {
      $(id).closest('.campo').hidden = true;
    });
    $('btn-google').hidden = true;
    document.querySelector('.ou').hidden = true;
    $('btn-criar').textContent = 'Concluir cadastro';

    var nomeGoogle = sessao && sessao.user && sessao.user.user_metadata &&
      (sessao.user.user_metadata.full_name || sessao.user.user_metadata.name);
    if (nomeGoogle) $('c-nome').value = nomeGoogle;

    mostrarAviso('Falta pouco: precisamos de alguns dados para concluir seu cadastro.', 'ok');
  }

  function concluirPerfilGoogle(perfil, btn) {
    var sessao = lerSessao();
    if (!sessao || !sessao.access_token) { mostrarAviso('Sessão expirada. Entre de novo.'); return; }

    ocupado(btn, true);
    var linha = Object.assign({ id: sessao.user && sessao.user.id }, perfil);

    fetch(CFG.SUPABASE_URL + '/rest/v1/perfis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CFG.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + sessao.access_token,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(linha)
    }).then(function (r) {
      if (r.ok) { window.location.replace(DESTINO); return; }
      return r.json().catch(function () { return {}; }).then(function (j) {
        mostrarAviso(traduzErro(j, r.status));
        ocupado(btn, false, 'Concluir cadastro');
      });
    }).catch(function () {
      mostrarAviso('Sem conexão com o servidor. Verifique a internet.');
      ocupado(btn, false, 'Concluir cadastro');
    });
  }

  /* ===================== retorno do OAuth ===================== */

  (function tratarRetornoOAuth() {
    var hash = location.hash || '';
    if (hash.indexOf('access_token') < 0 && hash.indexOf('error') < 0) return;

    var p = new URLSearchParams(hash.replace(/^#/, ''));
    // Limpa o fragmento: token em barra de endereço vaza em screenshot,
    // histórico e no que a pessoa cola pedindo ajuda.
    history.replaceState(null, '', location.pathname + location.search);

    if (p.get('error')) {
      mostrarAviso(p.get('error_description') || 'Não foi possível entrar com o Google.');
      return;
    }

    var sessao = {
      access_token: p.get('access_token'),
      refresh_token: p.get('refresh_token'),
      expires_at: parseInt(p.get('expires_at') || '0', 10)
    };

    // Quem é essa pessoa e ela já tem perfil?
    fetch(API + '/user', {
      headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + sessao.access_token }
    }).then(function (r) { return r.json(); }).then(function (user) {
      sessao.user = user;
      salvarSessao(sessao);
      return fetch(CFG.SUPABASE_URL + '/rest/v1/perfis?select=id&limit=1', {
        headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + sessao.access_token }
      });
    }).then(function (r) { return r.json(); }).then(function (linhas) {
      if (Array.isArray(linhas) && linhas.length > 0) window.location.replace(DESTINO);
      else entrarModoCompletar(lerSessao());
    }).catch(function () {
      mostrarAviso('Entramos com o Google, mas não conseguimos carregar seu cadastro. Recarregue a página.');
    });
  })();
})();
