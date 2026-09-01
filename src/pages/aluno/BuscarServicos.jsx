import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Dumbbell, 
  Utensils, 
  Building2, 
  UserCheck, 
  Star, 
  Home, 
  Compass, 
  User, 
  Sun, 
  Moon, 
  LogOut,
  FilterX,
  CreditCard,
  Calendar,
  Navigation,
  Menu,
  X,
  Link
} from 'lucide-react';
import { API_URL } from '../../config/api';

export default function BuscarServicos() {
  const navigate = useNavigate();

  // RECUPERA DADOS DO USUÁRIO LOGADO
  const [usuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || { 
        nome: 'Aluno', 
        email: '', 
        cidade: '', 
        tipo_usuario: 'aluno' 
      };
    } catch {
      return { nome: 'Aluno', email: '', cidade: '', tipo_usuario: 'aluno' };
    }
  });

  // PERSISTÊNCIA DO TEMA
  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('temaEscuro');
    return temaSalvo !== null ? JSON.parse(temaSalvo) : true;
  });

  const [sidebarAberta, setSidebarAberta] = useState(false);

  // ESTADOS DA BUSCA
  const [cidade, setCidade] = useState(usuario.cidade || '');
  const [categoria, setCategoria] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [buscaRealizada, setBuscaRealizada] = useState(Boolean(usuario.cidade));

  // ESTADOS DE LOCALIZAÇÃO VIA GPS
  const [coordsUsuario, setCoordsUsuario] = useState(null);
  const [solicitandoGps, setSolicitandoGps] = useState(false);
  const [mensagemConexao, setMensagemConexao] = useState('');
  const [perfilAberto,setPerfilAberto]=useState(null);
  const abrirPerfil=async item=>{try{const r=await fetch(`${API_URL}/servicos/${item.tipo}/${item.id}`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});const d=await r.json();if(!r.ok)throw new Error(d.message);setPerfilAberto({...d,tipo:item.tipo})}catch(e){setMensagemConexao(e.message)}};

  // MOCK DE SERVIÇOS
  const [servicos, setServicos] = useState([]);
  const servicosExemplo = [
    {
      id: '1',
      nome: 'FitZone Academia',
      tipo: 'academia',
      cidade: 'Curitiba',
      avaliacao: 4.8,
      lat: -25.4284,
      lng: -49.2733,
      foto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&auto=format&fit=crop',
      descricao: 'Estrutura completa com equipamentos modernos, musculação e aulas em grupo.',
      precoDiaria: '25,00',
      precoMensal: '119,90'
    },
    {
      id: '2',
      nome: 'Carlos Silva - Personal Trainer',
      tipo: 'personal',
      cidade: 'Curitiba',
      avaliacao: 4.9,
      lat: -25.4350,
      lng: -49.2700,
      foto: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&auto=format&fit=crop',
      descricao: 'Especialista em hipertrofia e emagrecimento com acompanhamento personalizado.'
    },
    {
      id: '3',
      nome: 'Dra. Patricia Lima',
      tipo: 'nutricionista',
      cidade: 'Curitiba',
      avaliacao: 5.0,
      lat: -25.4400,
      lng: -49.2800,
      foto: 'https://images.unsplash.com/photo-1594824813566-87981b29a27f?w=300&auto=format&fit=crop',
      descricao: 'Nutrição esportiva e reeducação alimentar adaptada à sua rotina.'
    },
    {
      id: '4',
      nome: 'Studio Power Fitness',
      tipo: 'academia',
      cidade: 'São Paulo',
      avaliacao: 4.7,
      lat: -23.5505,
      lng: -46.6333,
      foto: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=300&auto=format&fit=crop',
      descricao: 'Treinamento funcional e crossfit no centro da cidade.',
      precoDiaria: '30,00',
      precoMensal: '149,00'
    }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/servicos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((dados) => setServicos(dados.map((item) => ({
        ...item,
        cidade: item.cidade || '',
        descricao: item.descricao || ''
      }))))
      .catch((error) => console.error('Erro ao buscar serviços:', error));
  }, []);

  // SALVAR PREFERÊNCIA DE TEMA
  useEffect(() => {
    localStorage.setItem('temaEscuro', JSON.stringify(temaEscuro));
  }, [temaEscuro]);

  // FECHAR SIDEBAR COM A TECLA ESC
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setSidebarAberta(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // SOLICITAÇÃO DO GPS
  const obterLocalizacao = () => {
    if ("geolocation" in navigator) {
      setSolicitandoGps(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordsUsuario({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setSolicitandoGps(false);
        },
        (error) => {
          console.warn("Erro ao acessar GPS:", error);
          setSolicitandoGps(false);
        }
      );
    }
  };

  useEffect(() => {
    obterLocalizacao();
  }, []);

  // CÁLCULO DE DISTÂNCIA HAVERSINE
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleTema = () => setTemaEscuro((prev) => !prev);

  const solicitarConexao = async (item) => {
    setMensagemConexao('');
    try {
      const response = await fetch(`${API_URL}/conexoes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ tipo: item.tipo, profissional_id: item.id }) });
      const dados = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(dados.message || 'Não foi possível enviar a solicitação.');
      setMensagemConexao(`Solicitação enviada para ${item.nome}.`);
    } catch (error) { setMensagemConexao(error.message); }
  };

  const handleBuscar = (e) => {
    if (e) e.preventDefault();
    if (cidade.trim() !== '') {
      setBuscaRealizada(true);
    }
  };

  const servicosFiltrados = cidade.trim() === '' ? [] : servicos.filter(item => {
    const bateCidade = !item.cidade || item.cidade.toLowerCase().includes(cidade.trim().toLowerCase());
    const bateCategoria = categoria === 'todos' || item.tipo === categoria;
    const bateBusca = item.nome.toLowerCase().includes(termoBusca.toLowerCase()) || 
                      (item.descricao || '').toLowerCase().includes(termoBusca.toLowerCase());
    return bateCidade && bateCategoria && bateBusca;
  });

  const getIconeCategoria = (tipo) => {
    switch(tipo) {
      case 'academia': return <Building2 className="w-4 h-4 text-amber-500" />;
      case 'personal': return <Dumbbell className="w-4 h-4 text-[#00AEFF]" />;
      case 'nutricionista': return <Utensils className="w-4 h-4 text-emerald-500" />;
      default: return null;
    }
  };

  const getLabelCategoria = (tipo) => {
    switch(tipo) {
      case 'academia': return 'Academia';
      case 'personal': return 'Personal Trainer';
      case 'nutricionista': return 'Nutricionista';
      default: return tipo;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased pb-28 ${
      temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      
      {/* OVERLAY DA SIDEBAR LATERAL */}
      {sidebarAberta && (
        <div 
          onClick={() => setSidebarAberta(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* SIDEBAR LATERAL */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between border-r ${
        sidebarAberta ? 'translate-x-0' : '-translate-x-full'
      } ${
        temaEscuro ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <div>
          {/* TOPO DA SIDEBAR */}
          <div className={`p-5 flex items-center justify-between border-b ${
            temaEscuro ? 'border-neutral-800' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-xl flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold">{usuario.nome}</p>
                <p className={`text-[10px] ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>Aluno</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarAberta(false)}
              className={`p-2 rounded-xl border transition-colors ${
                temaEscuro ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400' : 'border-gray-200 hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MENU DE NAVEGAÇÃO DA SIDEBAR */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setSidebarAberta(false); navigate('/aluno/perfil'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#00AEFF]" />
              <span>Gerenciar Perfil</span>
            </button>

            <button
              onClick={() => { setSidebarAberta(false); navigate('/aluno/treinos'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Dumbbell className="w-4 h-4 text-blue-400" />
              <span>Gerenciar Treinos</span>
            </button>

            <button
              onClick={() => { setSidebarAberta(false); navigate('/aluno/dietas'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Utensils className="w-4 h-4 text-emerald-400" />
              <span>Gerenciar Dietas</span>
            </button>

            <button
              onClick={() => { setSidebarAberta(false); navigate('/aluno/conexoes'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Link className="w-4 h-4 text-purple-400" />
              <span>Gerenciar Conexões</span>
            </button>

            <div className={`my-2 border-t ${temaEscuro ? 'border-neutral-800' : 'border-gray-200'}`} />

            <button
              onClick={() => { setSidebarAberta(false); navigate('/aluno/servicos'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span>Buscar Serviços</span>
            </button>

            {/* BOTÃO DE TEMA */}
            <button
              onClick={toggleTema}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {temaEscuro ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                <span>{temaEscuro ? 'Modo Claro' : 'Modo Escuro'}</span>
              </div>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                temaEscuro ? 'bg-neutral-800/50 border-neutral-700 text-neutral-400' : 'bg-gray-200 border-gray-300 text-gray-600'
              }`}>
                {temaEscuro ? 'ESC' : 'CLA'}
              </span>
            </button>
          </nav>
        </div>

        {/* RODAPÉ DA SIDEBAR */}
        <div className={`p-4 border-t ${temaEscuro ? 'border-neutral-800' : 'border-gray-200'}`}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* CABEÇALHO */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${
        temaEscuro ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/90 border-gray-200'
      }`}>
        <div className="w-full max-w-none px-5 lg:px-10 py-4 flex justify-between items-center">
          
          <button
            type="button"
            onClick={() => setSidebarAberta(true)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
              temaEscuro
                ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
            title="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={() => navigate('/aluno/perfil')}
            className={`flex items-center gap-3 text-right cursor-pointer group p-1.5 rounded-2xl transition-all ${
              temaEscuro ? 'hover:bg-neutral-800/40' : 'hover:bg-gray-200/50'
            }`}
            title="Clique para gerenciar perfil"
          >
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight group-hover:text-[#00AEFF] transition-colors">
                Olá, <span className="text-[#00AEFF]">{usuario.nome}</span>!
              </h1>
              <p className={`text-[10px] sm:text-xs font-medium ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                Painel do Aluno
              </p>
            </div>
            <div className="w-10 h-10 bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-2xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <User className="w-5 h-5" />
            </div>
          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full max-w-none px-5 lg:px-10 pt-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Buscar Serviços</h1>
            <p className={`text-xs mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-600'}`}>
              Encontre academias, personais e nutricionistas próximos de você.
            </p>
          </div>

          <button
            type="button"
            onClick={obterLocalizacao}
            disabled={solicitandoGps}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              coordsUsuario 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                : temaEscuro 
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
          >
            <Navigation className={`w-4 h-4 ${coordsUsuario ? 'text-emerald-500' : 'text-[#00AEFF]'}`} />
            <span>
              {solicitandoGps 
                ? 'Obtendo GPS...' 
                : coordsUsuario 
                  ? 'GPS Ativo (Distância em tempo real)' 
                  : 'Ativar GPS para ver distâncias'}
            </span>
          </button>
        </div>
        {mensagemConexao && <p className="rounded-xl border border-[#00AEFF]/30 bg-[#00AEFF]/10 px-4 py-3 text-sm text-[#00AEFF]">{mensagemConexao}</p>}

        {/* FORMULÁRIO DE BUSCA */}
        <form onSubmit={handleBuscar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            
            <div className={`sm:col-span-5 p-3 rounded-2xl border flex items-center gap-3 ${
              temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <MapPin className="w-5 h-5 text-[#00AEFF] shrink-0" />
              <div className="w-full">
                <label className={`block text-[10px] font-bold uppercase ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                  Cidade *
                </label>
                <input
                  type="text"
                  required
                  value={cidade}
                  onChange={(e) => {
                    setCidade(e.target.value);
                    if (e.target.value.trim() === '') setBuscaRealizada(false);
                  }}
                  placeholder="Digite a cidade (ex: Curitiba)..."
                  className={`w-full bg-transparent text-sm font-semibold outline-none ${
                    temaEscuro ? 'text-white placeholder:text-neutral-500' : 'text-gray-900 placeholder:text-gray-400'
                  }`}
                />
              </div>
            </div>

            <div className={`sm:col-span-5 p-3 rounded-2xl border flex items-center gap-3 ${
              temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <Search className={`w-5 h-5 shrink-0 ${temaEscuro ? 'text-neutral-400' : 'text-gray-400'}`} />
              <div className="w-full">
                <label className={`block text-[10px] font-bold uppercase ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                  Nome ou Especialidade
                </label>
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Ex: FitZone, Musculação..."
                  className={`w-full bg-transparent text-sm font-semibold outline-none ${
                    temaEscuro ? 'text-white placeholder:text-neutral-500' : 'text-gray-900 placeholder:text-gray-400'
                  }`}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full h-full min-h-[52px] bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-[#00AEFF]/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>

          </div>

          {/* FILTROS DE CATEGORIA */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoria('todos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                categoria === 'todos' 
                  ? 'bg-[#00AEFF] text-white border-[#00AEFF]' 
                  : temaEscuro 
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700' 
                    : 'bg-white border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              Todos
            </button>

            <button
              type="button"
              onClick={() => setCategoria('academia')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all whitespace-nowrap ${
                categoria === 'academia' 
                  ? 'bg-amber-500 text-white border-amber-500' 
                  : temaEscuro 
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700' 
                    : 'bg-white border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Academias</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoria('personal')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all whitespace-nowrap ${
                categoria === 'personal' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : temaEscuro 
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700' 
                    : 'bg-white border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Personal Trainers</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoria('nutricionista')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all whitespace-nowrap ${
                categoria === 'nutricionista' 
                  ? 'bg-emerald-500 text-white border-emerald-500' 
                  : temaEscuro 
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700' 
                    : 'bg-white border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Nutricionistas</span>
            </button>
          </div>
        </form>

        {/* RESULTADOS */}
        {!buscaRealizada ? (
          <div className={`border rounded-3xl p-12 text-center my-8 flex flex-col items-center justify-center space-y-3 transition-colors ${
            temaEscuro ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="w-14 h-14 bg-[#00AEFF]/10 text-[#00AEFF] rounded-full flex items-center justify-center">
              <MapPin className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold">Digite sua cidade para pesquisar</h3>
              <p className={`text-xs ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                Informe o nome do município no campo acima para carregar as opções disponíveis.
              </p>
            </div>
          </div>
        ) : servicosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pt-2">
            {servicosFiltrados.map((item) => {
              const dist = coordsUsuario 
                ? calcularDistancia(coordsUsuario.lat, coordsUsuario.lng, item.lat, item.lng) 
                : null;

              return (
                <div 
                  key={item.id}
                  className={`border rounded-3xl overflow-hidden transition-all flex flex-col justify-between group hover:border-[#00AEFF]/50 ${
                    temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="h-40 relative overflow-hidden bg-neutral-800">
                      <img 
                        src={item.foto || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="100%25" height="100%25" fill="%23262626"/%3E%3C/svg%3E'} 
                        alt={item.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-bold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{Number(item.avaliacao || 0).toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`p-1.5 rounded-lg border flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                          temaEscuro ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}>
                          {getIconeCategoria(item.tipo)}
                          <span>{getLabelCategoria(item.tipo)}</span>
                        </span>

                        {dist && (
                          <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#00AEFF] bg-[#00AEFF]/10 px-2.5 py-1 rounded-full">
                            <Navigation className="w-3 h-3" />
                            <span>a {dist} km</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold tracking-tight leading-snug">{item.nome}</h3>
                      
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                        temaEscuro ? 'text-neutral-400' : 'text-gray-500'
                      }`}>
                        <MapPin className="w-3.5 h-3.5 text-[#00AEFF]" />
                        <span>{item.cidade || 'Localização não informada'}</span>
                      </div>

                      <p className={`text-xs leading-relaxed line-clamp-2 ${
                        temaEscuro ? 'text-neutral-400' : 'text-gray-600'
                      }`}>
                        {item.descricao}
                      </p>

                      {item.tipo === 'academia' && (
                        <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${
                          temaEscuro ? 'border-neutral-800' : 'border-gray-100'
                        }`}>
                          <div className={`p-2.5 rounded-xl border ${
                            temaEscuro ? 'bg-neutral-950/60 border-neutral-800/80' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                              temaEscuro ? 'text-neutral-400' : 'text-gray-500'
                            }`}>
                              <Calendar className="w-3 h-3 text-[#00AEFF]" />
                              <span>Diária</span>
                            </div>
                            <p className="text-sm font-extrabold text-amber-500 mt-0.5">
                              R$ {item.precoDiaria || '--'}
                            </p>
                          </div>

                          <div className={`p-2.5 rounded-xl border ${
                            temaEscuro ? 'bg-neutral-950/60 border-neutral-800/80' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                              temaEscuro ? 'text-neutral-400' : 'text-gray-500'
                            }`}>
                              <CreditCard className="w-3 h-3 text-emerald-500" />
                              <span>Plano Mensal</span>
                            </div>
                            <p className="text-sm font-extrabold text-emerald-500 mt-0.5">
                              R$ {item.precoMensal || '--'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    {item.tipo === 'academia' ? (
                      <button
                        type="button"
                        onClick={() => abrirPerfil(item)}
                        className={`w-full py-3 font-bold text-xs rounded-xl transition-all border ${
                          temaEscuro 
                            ? 'bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border-neutral-800' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                        }`}
                      >
                        Ver Informações
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirPerfil(item)}
                        className="w-full py-3 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00AEFF]/20"
                      >
                        Ver Perfil & Conectar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`border rounded-3xl p-12 text-center my-8 flex flex-col items-center justify-center space-y-4 ${
            temaEscuro ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              temaEscuro ? 'bg-neutral-800/50 text-neutral-500' : 'bg-gray-100 text-gray-400'
            }`}>
              <FilterX className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-bold">Nenhum resultado encontrado</h3>
              <p className={`text-xs ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                Não encontramos cadastros para <strong className={temaEscuro ? 'text-white' : 'text-gray-900'}>"{cidade}"</strong>. Tente ajustar o nome da cidade ou os filtros.
              </p>
            </div>
          </div>
        )}

      </main>

      {perfilAberto&&<div className="fixed inset-0 z-[70] bg-black/80 p-4 flex items-center justify-center" onClick={()=>setPerfilAberto(null)}><article onClick={e=>e.stopPropagation()} className="bg-neutral-900 text-white border border-neutral-700 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"><button onClick={()=>setPerfilAberto(null)} className="float-right"><X/></button><h2 className="text-2xl font-black pr-8">{perfilAberto.nome}</h2><p className="text-neutral-400">{perfilAberto.cidade||'Cidade não informada'}</p><p className="my-5 text-sm">{perfilAberto.sobre_mim||perfilAberto.bio||'Perfil em atualização.'}</p>{perfilAberto.formacao&&<p className="text-sm mb-3"><b>Formação:</b> {perfilAberto.formacao}</p>}{perfilAberto.modalidades?.length>0&&<div className="mb-5"><h3 className="font-bold">Modalidades</h3><div className="flex flex-wrap gap-2 mt-2">{perfilAberto.modalidades.map(x=><span className="bg-orange-500/15 text-orange-300 px-3 py-1 rounded-full text-xs" key={x}>{x}</span>)}</div></div>}<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">{[['preco_diaria','Diária'],['preco_semanal','Semanal'],['preco_mensal','Mensal'],['preco_anual','Anual']].filter(([k])=>perfilAberto[k]).map(([k,l])=><div className="bg-neutral-950 rounded-xl p-3" key={k}><p className="text-xs text-neutral-500">{l}</p><b>R$ {perfilAberto[k]}</b></div>)}</div>{perfilAberto.fotos?.length>0&&<div className="grid grid-cols-2 gap-3 mb-5">{perfilAberto.fotos.map((f,i)=><img key={i} src={f} className="rounded-xl aspect-video object-cover" alt="Espaço da academia"/>)}</div>}{perfilAberto.tipo!=='academia'&&<button onClick={()=>{solicitarConexao({id:perfilAberto.id,tipo:perfilAberto.tipo});setPerfilAberto(null)}} className="w-full bg-[#00AEFF] py-3 rounded-xl font-bold">Solicitar conexão</button>}</article></div>}

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 p-4">
        <div className={`max-w-lg mx-auto rounded-full border backdrop-blur-xl shadow-2xl p-2 px-6 flex justify-between items-center transition-colors duration-300 ${
          temaEscuro 
            ? 'bg-neutral-900/90 border-neutral-800/80 text-neutral-400' 
            : 'bg-white/90 border-gray-200/80 text-gray-500'
        }`}>
          <button
            type="button"
            onClick={() => navigate('/aluno/dashboard')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Início</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/aluno/treinos')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-[10px] font-bold">Treinos</span>
          </button>

          {/* CIRCULO DA BÚSSOLA */}
          <div className="relative -mt-8">
            <button
              type="button"
              onClick={() => navigate('/aluno/servicos')}
              className={`w-14 h-14 bg-[#00AEFF] hover:bg-[#0096dc] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#00AEFF]/40 border-4 transition-all hover:scale-105 active:scale-95 ${
                temaEscuro ? 'border-black' : 'border-gray-100'
              }`}
              title="Buscar Serviços"
            >
              <Compass className="w-7 h-7" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/aluno/dietas')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-bold">Dietas</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/aluno/perfil')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Perfil</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
