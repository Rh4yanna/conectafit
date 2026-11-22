import MensagemTemporaria from '../MensagemTemporaria';
import MonitoramentoPersonal from './MonitoramentoPersonal';
/* eslint-disable react/prop-types */
import {usePersonal} from './comum';
import AvaliacaoPersonal from './AvaliacaoPersonal';
import PrescricaoPersonal from './PrescricaoPersonal';
export default function AcompanhamentoPersonal({alunoId}){
 const {dados,erro,carregando,carregar}=usePersonal(`/alunos/${alunoId}/avaliacao`);
 return <div className="space-y-6 my-6">{erro?<MensagemTemporaria as="p" role="alert">{erro} <button className="acao-secundaria" onClick={carregar}>Recarregar avaliação</button></MensagemTemporaria>:carregando?<p role="status">Carregando avaliação...</p>:<><details className="border rounded-xl p-4"><summary className="font-bold cursor-pointer">Acompanhamento dos treinos</summary><MonitoramentoPersonal alunoId={alunoId}/></details><details className="border rounded-xl p-4"><summary className="font-bold cursor-pointer">Avaliação inicial e acompanhamento</summary><AvaliacaoPersonal alunoId={alunoId} avaliacao={dados} onSalvar={carregar} ocultarTitulo/></details><details className="border rounded-xl p-4"><summary className="font-bold cursor-pointer">Prescrição de treinos</summary><PrescricaoPersonal alunoId={alunoId} avaliacao={dados} onAtualizarAvaliacao={carregar}/></details></>}</div>;
}
