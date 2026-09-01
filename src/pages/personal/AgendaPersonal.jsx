import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Trash2, 
  User, 
  Video, 
  Dumbbell,
  X
} from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function AgendaPersonal() {
  const getUsuarioSalvo = () => {
    try {
      const item = localStorage.getItem("usuario") || localStorage.getItem("usuarioLogado");
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  };

  const usuarioSalvo = getUsuarioSalvo();
  const usuarioId = usuarioSalvo?.id || null;

  // ESTADOS DO CALENDÁRIO
  const [dataAtual, setDataAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(new Date());
  
  // ESTADOS DE AGENDAMENTOS
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // FORMULÁRIO DE NOVO HORÁRIO
  const [novoTreino, setNovoTreino] = useState({
    aluno_nome: '',
    data: '',
    hora_inicio: '08:00',
    hora_fim: '09:00',
    tipo: 'Presencial',
    observacao: ''
  });

  // FUNÇÃO AUXILIAR PARA FORMATAR YYYY-MM-DD
  const formatarDataChave = (date) => {
    if (!date) return '';
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // ABRIR MODAL LIMPANDO O FORMULÁRIO E DEFININDO A DATA SELECIONADA
  const handleAbrirModal = () => {
    setNovoTreino({
      aluno_nome: '',
      data: formatarDataChave(diaSelecionado),
      hora_inicio: '08:00',
      hora_fim: '09:00',
      tipo: 'Presencial',
      observacao: ''
    });
    setModalAberto(true);
  };

  // CARREGAR AGENDAMENTOS DO BANCO
  useEffect(() => {
    if (!usuarioId) return;

    setCarregando(true);
    apiFetch('/profissional/agenda')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setAgendamentos(data);
        }
      })
      .catch(err => console.error("Erro ao carregar agenda:", err))
      .finally(() => setCarregando(false));
  }, [usuarioId]);

  // FUNÇÕES AUXILIARES DE DATA
  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getDiasDoMes = (date) => {
    const ano = date.getFullYear();
    const mes = date.getMonth();

    const primeiroDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes = new Date(ano, mes + 1, 0);

    const inicioSemana = primeiroDiaMes.getDay();
    const totalDias = ultimoDiaMes.getDate();

    const dias = [];

    for (let i = 0; i < inicioSemana; i++) {
      dias.push(null);
    }

    for (let i = 1; i <= totalDias; i++) {
      dias.push(new Date(ano, mes, i));
    }

    return dias;
  };

  const mudarMes = (delta) => {
    setDataAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const ehMesmoDia = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const selecionarDia = (dia) => {
    if (dia) setDiaSelecionado(dia);
  };

  const chaveDiaSelecionado = formatarDataChave(diaSelecionado);
  const compromissosDoDia = agendamentos.filter(a => a.data === chaveDiaSelecionado);

  // ADICIONAR COMPROMISSO
  const handleSalvarAgendamento = (e) => {
    e.preventDefault();

    if (!novoTreino.aluno_nome.trim()) {
      alert("Informe o nome do aluno!");
      return;
    }

    if (!novoTreino.data) {
      alert("Selecione uma data válida!");
      return;
    }

    const novoItem = {
      id: Date.now().toString(),
      usuario_id: usuarioId,
      aluno_nome: novoTreino.aluno_nome,
      data: novoTreino.data,
      hora_inicio: novoTreino.hora_inicio,
      hora_fim: novoTreino.hora_fim,
      tipo: novoTreino.tipo,
      observacao: novoTreino.observacao
    };

    // 1. Atualiza lista local
    setAgendamentos(prev => [...prev, novoItem]);

    // 2. Limpa form e fecha modal imediatamente
    setNovoTreino({
      aluno_nome: '',
      data: '',
      hora_inicio: '08:00',
      hora_fim: '09:00',
      tipo: 'Presencial',
      observacao: ''
    });
    setModalAberto(false);

    // 3. Envia para o servidor em segundo plano
    apiFetch('/profissional/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoItem)
    }).catch(err => console.error("Erro ao salvar no banco:", err));
  };

  // DELETAR AGENDAMENTO
  const handleDeletarAgendamento = async (id) => {
    if (!window.confirm("Deseja remover este agendamento?")) return;

    setAgendamentos(prev => prev.filter(item => item.id !== id));

    try {
      await apiFetch(`/profissional/agenda/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  const diasDoMes = getDiasDoMes(dataAtual);

  return (
    <div className="w-full max-w-none px-5 lg:px-10 py-6 text-white font-sans">
      
      {/* CABEÇALHO */}
      <div className="mb-6 border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#00AEFF]" /> Agenda de Treinos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Gerencie seus horários, aulas presenciais e atendimentos online.
          </p>
        </div>

        <button
          onClick={handleAbrirModal}
          className="bg-[#00AEFF] hover:bg-blue-600 text-black font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#00AEFF]/20 flex items-center justify-center gap-2 active:scale-95 text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" /> Novo Horário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: CALENDÁRIO MENSAL */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">
              {nomesMeses[dataAtual.getMonth()]} <span className="text-neutral-500">{dataAtual.getFullYear()}</span>
            </h2>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => mudarMes(-1)}
                className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => mudarMes(1)}
                className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-bold text-neutral-500 py-1">
            {diasDaSemana.map((dia, idx) => (
              <div key={idx}>{dia}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {diasDoMes.map((dia, idx) => {
              if (!dia) {
                return <div key={`empty-${idx}`} className="h-12" />;
              }

              const ehHoje = ehMesmoDia(dia, new Date());
              const ehSelecionado = ehMesmoDia(dia, diaSelecionado);
              const chaveDia = formatarDataChave(dia);
              const temAgendamento = agendamentos.some(a => a.data === chaveDia);

              return (
                <button
                  key={idx}
                  onClick={() => selecionarDia(dia)}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-bold ${
                    ehSelecionado
                      ? 'bg-[#00AEFF] text-black shadow-md shadow-[#00AEFF]/20 scale-105 z-10'
                      : ehHoje
                      ? 'bg-neutral-800 text-[#00AEFF] border border-[#00AEFF]/40'
                      : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span>{dia.getDate()}</span>
                  
                  {temAgendamento && (
                    <span 
                      className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${
                        ehSelecionado ? 'bg-black' : 'bg-[#00AEFF]'
                      }`} 
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUNA DIREITA: HORÁRIOS DO DIA SELECIONADO */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
                Compromissos do Dia
              </h2>
              <p className="text-xs text-[#00AEFF] font-bold mt-0.5">
                {diaSelecionado.getDate()} de {nomesMeses[diaSelecionado.getMonth()]} de {diaSelecionado.getFullYear()}
              </p>
            </div>
            
            <span className="text-xs font-bold px-2.5 py-1 bg-neutral-800 text-neutral-400 rounded-lg">
              {compromissosDoDia.length} horários
            </span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {compromissosDoDia.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto stroke-1 text-neutral-600" />
                <p className="text-xs">Nenhum treino agendado para este dia.</p>
              </div>
            ) : (
              compromissosDoDia.map((item) => (
                <div 
                  key={item.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex items-start justify-between gap-3 hover:border-neutral-700 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#00AEFF] bg-[#00AEFF]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.hora_inicio} - {item.hora_fim}
                      </span>
                      
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        item.tipo === 'Online' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {item.tipo === 'Online' ? <Video className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />}
                        {item.tipo}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pt-1">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      {item.aluno_nome}
                    </h3>

                    {item.observacao && (
                      <p className="text-xs text-neutral-400 pl-5 italic">
                        "{item.observacao}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeletarAgendamento(item.id)}
                    className="text-neutral-500 hover:text-red-400 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                    title="Remover horários"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE NOVO AGENDAMENTO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 relative shadow-2xl">
            
            <button 
              onClick={() => setModalAberto(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
              <CalendarIcon className="w-5 h-5 text-[#00AEFF]" /> Agendar Treino
            </h2>

            <form onSubmit={handleSalvarAgendamento} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Data Selecionada
                </label>
                <input 
                  type="date"
                  value={novoTreino.data}
                  onChange={e => setNovoTreino(prev => ({ ...prev, data: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#00AEFF] transition-colors scheme-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Nome do Aluno / Cliente *
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={novoTreino.aluno_nome}
                  onChange={e => setNovoTreino(prev => ({ ...prev, aluno_nome: e.target.value }))}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00AEFF] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">
                    Início
                  </label>
                  <input 
                    type="time"
                    value={novoTreino.hora_inicio}
                    onChange={e => setNovoTreino(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00AEFF] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">
                    Término
                  </label>
                  <input 
                    type="time"
                    value={novoTreino.hora_fim}
                    onChange={e => setNovoTreino(prev => ({ ...prev, hora_fim: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00AEFF] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Modalidade
                </label>
                <select
                  value={novoTreino.tipo}
                  onChange={e => setNovoTreino(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00AEFF] transition-colors"
                >
                  <option value="Presencial">Presencial (Academia/Personal)</option>
                  <option value="Online">Online (Consultoria/Videochamada)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Ex: Treino de Perna / Foco em Hipertrofia"
                  value={novoTreino.observacao}
                  onChange={e => setNovoTreino(prev => ({ ...prev, observacao: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00AEFF] transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="w-1/2 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#00AEFF] hover:bg-blue-600 text-black font-extrabold rounded-xl transition-colors shadow-lg shadow-[#00AEFF]/20 text-sm"
                >
                  Confirmar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
