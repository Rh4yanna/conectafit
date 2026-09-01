import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, AlertCircle, Apple } from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function SolicitacoesConexaoNutri() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const usuarioLogado = JSON.parse(
    localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario') || '{}'
  );

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      setErro(null);

      const res = await apiFetch('/profissional/solicitacoes');
      
      if (!res.ok) {
        throw new Error('Não foi possível carregar as solicitações.');
      }

      const data = await res.json();
      setSolicitacoes(data);
    } catch (err) {
      setErro(err.message);
      setSolicitacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const responderSolicitacao = async (id, acao) => {
    try {
      await apiFetch(`/profissional/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: acao }),
      });

      setSolicitacoes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(`Erro ao ${acao} solicitação.`);
    }
  };

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl text-center text-neutral-400">
        Carregando solicitações de acompanhamento nutricional...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Apple className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Solicitações de Acompanhamento</h2>
            <p className="text-xs text-neutral-400">Pacientes buscando consulta ou plano alimentar</p>
          </div>
        </div>

        {erro && (
          <div className="mt-4 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Servidor offline no momento. Exibindo dados demonstrativos.</span>
          </div>
        )}

        {solicitacoes.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">
            Nenhuma solicitação pendente no momento.
          </p>
        ) : (
          <div className="space-y-3 mt-6">
            {solicitacoes.map((item) => (
              <div
                key={item.id}
                className="bg-neutral-950 border border-neutral-800/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center font-black">
                    {item.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{item.nome}</h3>
                    <p className="text-xs text-neutral-400">{item.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-neutral-900 border border-neutral-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {item.objetivo}
                      </span>
                      <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.data}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => responderSolicitacao(item.id, 'aceito')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl font-bold text-xs transition-colors"
                  >
                    <UserCheck className="w-4 h-4" /> Aceitar
                  </button>
                  <button
                    onClick={() => responderSolicitacao(item.id, 'recusado')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl font-bold text-xs transition-colors"
                  >
                    <UserX className="w-4 h-4" /> Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
