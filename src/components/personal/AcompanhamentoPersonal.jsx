import MensagemTemporaria from '../MensagemTemporaria';
import MonitoramentoPersonal from './MonitoramentoPersonal';
/* eslint-disable react/prop-types */
import {usePersonal} from './comum';
import AvaliacaoPersonal from './AvaliacaoPersonal';
import PrescricaoPersonal from './PrescricaoPersonal';
export default function AcompanhamentoPersonal({alunoId}){
 const {dados,erro,carregando,carregar}=usePersonal(`/alunos/${alunoId}/avaliacao`);
 return <div className="space-y-6 my-6">{erro?<MensagemTemporaria as="p" role="alert">{erro} <button className="acao-secundaria" onClick={carregar}>Recarregar avaliação</button></MensagemTemporaria>:carregando?<p role="status">Carregando avaliação...</p>:<><MonitoramentoPersonal alunoId={alunoId}/><AvaliacaoPersonal alunoId={alunoId} avaliacao={dados} onSalvar={carregar}/><PrescricaoPersonal alunoId={alunoId} avaliacao={dados} onAtualizarAvaliacao={carregar}/></>}</div>;
}
