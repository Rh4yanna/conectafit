import React, { useState, useEffect } from 'react';
import { Search, Utensils, Mail, Phone, Calendar, AlertCircle, ChevronRight, UserX } from 'lucide-react';
import { apiFetch } from '../../config/api';
import DetalhesAluno from '../profissional/DetalhesAluno';

export default function PacientesAtivos() {
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [alunoAberto,setAlunoAberto]=useState(null);

  const usuarioLogado = JSON.parse(
    localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario') || '{}'
  );

  useEffect(() => {
    carregarPacientes();
  }, []);

  const carregarPacientes = async () => {
    try {
      setLoading(true);
      setErro(null);

      const res = await apiFetch('/profissional/alunos');

      if (!res.ok) {
        throw new Error('Não foi possível carregar a lista de pacientes.');
      }

      const data = await res.json();
      setPacientes(data);
    } catch (err) {
      setErro(err.message);
      
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  };

  const pacientesFiltrados = pacientes
    .filter((p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.email.toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome));

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl text-center text-neutral-400">
        Carregando pacientes ativos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Pacientes Ativos</h2>
            <p className="text-xs text-neutral-400">
              Total de {pacientesFiltrados.length} paciente(s) acompanhado(s)
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Servidor offline. Exibindo lista de demonstração.</span>
          </div>
        )}

        {pacientesFiltrados.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <UserX className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-bold text-neutral-400">Nenhum paciente encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pacientesFiltrados.map((paciente) => (
              <div
                key={paciente.id}
                className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center font-black text-sm">
                        {paciente.nome.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{paciente.nome}</h3>
                        <span className="inline-block bg-neutral-900 border border-neutral-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5">
                          {paciente.meta || 'Meta não especificada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-400 border-t border-neutral-900 pt-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{paciente.email}</span>
                    </div>
                    {paciente.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{paciente.telefone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Último Plano: {paciente.ultimoDieta || 'Pendente'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                  <button
                    onClick={() => setAlunoAberto(paciente.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-black py-2 rounded-xl font-bold text-xs transition-colors"
                  >
                    <Utensils className="w-3.5 h-3.5" /> Ver Dieta
                  </button>
                  <button
                    onClick={() => alert(`Nova avaliação para ${paciente.nome}`)}
                    className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white rounded-xl transition-colors"
                    title="Avaliação Física/Nutricional"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {alunoAberto&&<DetalhesAluno alunoId={alunoAberto} tipo="nutri" onClose={()=>setAlunoAberto(null)}/>} 
    </div>
  );
}
