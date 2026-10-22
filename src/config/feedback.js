export function deveNotificar(path, metodo) {
  return ['POST','PUT','PATCH','DELETE'].includes(metodo) && !/^\/(login|logout|academias\/distancias)(?:\/|\?|$)/.test(path)
    && !/\/(preview|prever|validar|simular)(?:\/|\?|$)/.test(path);
}

export function mensagemOperacao(path, metodo, ok, dados = {}) {
  const mensagem = typeof dados.message === 'string' ? dados.message.trim().slice(0, 500) : '';
  if (!ok || dados.success === false || dados.sucesso === false || dados.honeypot)
    return { tipo: 'erro', texto: `A ação não foi concluída.${mensagem ? ` ${mensagem}` : ' Revise os dados e tente novamente.'}` };
  if (mensagem) return { tipo: 'sucesso', texto: mensagem };
  if (/\/perfil(?:\/|\?|$)/.test(path)) return { tipo: 'sucesso', texto: 'Perfil atualizado com sucesso.' };
  return { tipo: 'sucesso', texto: metodo === 'DELETE' ? 'Exclusão concluída com sucesso.' : ['PUT','PATCH'].includes(metodo) ? 'Alterações salvas com sucesso.' : 'Operação concluída com sucesso.' };
}

export function emitirFeedback(detalhe) {
  window.dispatchEvent(new CustomEvent('conectafit-feedback', { detail: detalhe }));
}
