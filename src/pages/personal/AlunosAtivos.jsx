import MensagemTemporaria from '../../components/MensagemTemporaria';
/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { Search, Dumbbell, Mail, Phone, Calendar, AlertCircle, ChevronRight, UserX } from 'lucide-react';
import { apiFetch } from '../../config/api';
import DetalhesAluno from '../profissional/DetalhesAluno';

export default function AlunosAtivos({nutri=false}) {
  const [alunos, setAlunos] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [alunoAberto,setAlunoAberto]=useState(null);

  const [incluirInativos, setIncluirInativos] = useState(false);
  const [alterando, setAlterando] = useState(null);
  useEffect(() => {
    carregarAlunos();
  }, []);

  const carregarAlunos = async () => {
    try {
      setLoading(true);
      setErro(null);

      const res = await apiFetch('/profissional/alunos?incluir_inativos=true');

      if (!res.ok) {
        throw new Error('Não foi possível carregar a lista de alunos.');
      }

      const data = await res.json();
      setAlunos(data);
    } catch (err) {
      setErro(err.message);

      setAlunos([]);
    } finally {
      setLoading(false);
    }
  };

  const alterarAtivo = async aluno => {
    setAlterando(aluno.id);
    try {
      const res=await apiFetch(`/profissional/alunos/${aluno.id}/ativo`, {method:'PATCH',body:JSON.stringify({ativo:!aluno.ativo})});
      if(!res.ok) throw new Error('Não foi possível atualizar o vínculo.');
      await carregarAlunos();
    } catch(err) {setErro(err.message);}
    finally {setAlterando(null);}
  };

  // Filtragem e ordenação de A a Z
  const alunosFiltrados = alunos
    .filter(aluno => incluirInativos || aluno.ativo)
    .filter((aluno) =>
      aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.email.toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome));

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl text-center text-neutral-400">
        Carregando lista de alunos ativos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{nutri?'Meus pacientes':'Meus alunos'}</h2>
            <p className="text-xs text-neutral-400">
              Total de {alunosFiltrados.length} aluno(s). O status vale apenas para o seu acompanhamento.
            </p>
          </div>

          {/* CAMPO DE BUSCA */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00AEFF]"
            />
          </div>
        </div>

        <label className="flex gap-2 text-sm text-neutral-300 mb-4"><input type="checkbox" checked={incluirInativos} onChange={e=>setIncluirInativos(e.target.checked)}/>Mostrar também alunos inativos</label>
        {erro && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <MensagemTemporaria as="span">{erro}</MensagemTemporaria>
          </div>
        )}

        {alunosFiltrados.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <UserX className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-bold text-neutral-400">Nenhum aluno encontrado</p>
            <p className="text-xs text-neutral-600">Tente buscar por outro termo ou adicione novos alunos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alunosFiltrados.map((aluno) => (
              <div
                key={aluno.id}
                className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00AEFF]/10 text-[#00AEFF] border border-[#00AEFF]/20 rounded-xl flex items-center justify-center font-black text-sm">
                        {aluno.nome.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{aluno.nome}</h3>
                        <span className="inline-block bg-neutral-900 border border-neutral-800 text-[#00AEFF] text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5">
                          {aluno.objetivo || 'Objetivo não definido'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-400 border-t border-neutral-900 pt-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{aluno.email}</span>
                    </div>
                    {aluno.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{aluno.telefone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{aluno.ativo ? 'Ativo com você' : 'Inativo com você'}</span>
                    </div>
                  </div>
                </div>

                <button disabled={alterando===aluno.id} onClick={()=>alterarAtivo(aluno)} className="text-xs text-amber-400 py-2">{aluno.ativo ? 'Inativar acompanhamento' : 'Reativar acompanhamento'}</button>
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                  <button
                    disabled={!aluno.ativo} onClick={() => setAlunoAberto(aluno.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#00AEFF] hover:bg-[#0092d6] text-black py-2 rounded-xl font-bold text-xs transition-colors"
                  >
                    <Dumbbell className="w-3.5 h-3.5" /> {nutri?'Ver Dieta':'Ver Fichas'}
                  </button>
                  <button
                    disabled={!aluno.ativo} onClick={() => setAlunoAberto(aluno.id)}
                    className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white rounded-xl transition-colors"
                    title="Montar Ficha"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {alunoAberto&&<DetalhesAluno alunoId={alunoAberto} tipo={nutri?'nutri':'personal'} onClose={()=>{setAlunoAberto(null);carregarAlunos();}}/>}
    </div>
  );
}
