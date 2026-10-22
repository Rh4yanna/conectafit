import PerfilAcademiaFormulario from '../../components/academia/PerfilAcademiaFormulario';
import { useState, useEffect } from 'react';
import {Loader2} from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function GerenciarPerfilAcademia() {
  const usuarioLogado = JSON.parse(
    localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario') || '{}'
  );

  const [form, setForm] = useState({
    foto_perfil:'',razao_social:'',
    nome: usuarioLogado?.nome || '',
    email: usuarioLogado?.email || '',
    cnpj: usuarioLogado?.cnpj || '',
    telefone: usuarioLogado?.telefone || '',
    cidade: usuarioLogado?.cidade || '',
    endereco: usuarioLogado?.endereco || '',
    whatsapp:'', instagram:'', bio: usuarioLogado?.bio || '', preco_diaria:'', preco_mensal:'', preco_anual:'', modalidades:[], videos:[]
  });

  const [fotos, setFotos] = useState([]);
  const [salvo, setSalvo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro,setErro]=useState(''),[pronto,setPronto]=useState(false),[tentativa,setTentativa]=useState(0);

  // Buscar dados no PostgreSQL
  useEffect(() => {
    async function carregarPerfil() {
      if (!usuarioLogado?.id) {
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        const res = await apiFetch(`/academia/perfil/${usuarioLogado.id}`);
        if (!res.ok)throw new Error('Não foi possível carregar o perfil.');
        setPronto(true);setErro('');
        if (res.ok) {
          const dados = await res.json();
          if (dados) {
            setForm({
              foto_perfil:dados.foto_perfil||'',razao_social:dados.razao_social||'',
              nome: dados.nome || '', whatsapp:dados.whatsapp||'', instagram:dados.instagram||'',
              email: dados.email || '',
              cnpj: dados.cnpj || '',
              telefone: dados.telefone || '',
              cidade: dados.cidade || '',
              endereco: dados.endereco || '',
              bio: dados.bio || '', preco_diaria:dados.preco_diaria||'', preco_mensal:dados.preco_mensal||'', preco_anual:dados.preco_anual||'', modalidades:dados.modalidades||[], videos:dados.videos||[]
            });
            setFotos(dados.fotos || []);
          }
        }
      } catch (err) {
        setErro(err.message);
      } finally {
        setCarregando(false);
      }
    }

    carregarPerfil();
  }, [usuarioLogado?.id,tentativa]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const [lendoFoto,setLendoFoto]=useState(false);
  const handleImageUpload=async(e,perfil=false)=>{
    const arquivos=Array.from(e.target.files||[]);if(!arquivos.length)return;
    const tamanhoAtual=fotos.reduce((s,f)=>s+f.length,0)+(perfil?0:(form.foto_perfil||'').length);
    if(arquivos.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type))||tamanhoAtual+arquivos.reduce((s,f)=>s+f.size*1.34,0)>850000){setErro('Use imagens PNG, JPEG ou WebP, com até 600 KB no total.');return;}
    setLendoFoto(true);setErro('');
    try{const imagens=await Promise.all(arquivos.map(f=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));reader.readAsDataURL(f);})));if(perfil)setForm(prev=>({...prev,foto_perfil:imagens[0]}));else setFotos(prev=>[...prev,...imagens]);}
    catch(err){setErro(err.message);}finally{setLendoFoto(false);e.target.value='';}
  };

  const handleRemoveFoto = (indexToRemove) => {
    setFotos(fotos.filter((_, index) => index !== indexToRemove));
  };

  // Salvar alterações no PostgreSQL
  const handleSubmit = async (e) => {
    e.preventDefault();
    if(salvando||!pronto)return;
    setSalvando(true);setErro('');setSalvo(false);

    const payload = {
      usuario_id: usuarioLogado.id,
      ...form,
      fotos
    };

    try {
      const res = await apiFetch('/academia/perfil', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSalvo(true);
        
      } else {
        setErro((await res.json()).message||'Não foi possível salvar o perfil.');
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-3xl w-full max-w-none text-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
        <p className="text-xs text-neutral-400 font-bold">Carregando perfil...</p>
      </div>
    );
  }

  return <PerfilAcademiaFormulario form={form} setForm={setForm} fotos={fotos} erro={erro} salvo={salvo} pronto={pronto} ocupado={salvando||lendoFoto} tentar={()=>setTentativa(n=>n+1)} alterar={handleChange} enviar={handleSubmit} enviarFoto={handleImageUpload} removerFoto={handleRemoveFoto}/>;
}
