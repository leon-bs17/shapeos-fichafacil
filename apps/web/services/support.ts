import { createClient } from '@/lib/supabase/client'
export type AccessRole = 'ALUNO' | 'PERSONAL' | 'ADMIN'
export type SupportStatus = 'ABERTO' | 'EM_ATENDIMENTO' | 'RESOLVIDO'
export const supportStatusLabels: Record<SupportStatus,string> = { ABERTO: 'Aberto', EM_ATENDIMENTO: 'Em atendimento', RESOLVIDO: 'Resolvido' }
export interface SupportTicket { id: string; aluno_id: string; personal_id: string | null; destino: 'PERSONAL'|'SISTEMA'; assunto: string; mensagem: string; status: SupportStatus; solicitante_nome: string; solicitante_tipo: AccessRole; criado_em: string; atualizado_em: string }
export interface SupportMessage { id: string; autor_nome: string; autor_tipo: AccessRole; mensagem: string; status: SupportStatus | null; criado_em: string }
export interface StudentTrainer { id: string; nome: string; proxima_avaliacao_em: string | null }
function check(error: {code?:string;message?:string}|null) {
  if (!error) return
  throw new Error(error.code === '42501' ? 'Seu acesso a esta solicitação ou vínculo não está disponível.' : error.code === '22023' ? error.message : 'Não foi possível concluir a operação. Tente novamente.')
}
export async function studentTrainers(): Promise<StudentTrainer[]> {
  const {data,error} = await createClient().rpc('meus_personais'); check(error); return data ?? []
}
export async function supportProfile() {
  const db=createClient(); const {data:{user},error:authError}=await db.auth.getUser()
  if(authError||!user) throw new Error('Entre novamente para acessar o suporte.')
  const {data,error}=await db.from('usuarios').select('nome,tipo,status_conta').eq('id',user.id).single();check(error)
  if(!data || data.status_conta!=='ATIVO') throw new Error('Conta sem acesso ao suporte.')
  return {id:user.id,name:data.nome as string,role:data.tipo as AccessRole}
}
export async function supportTickets(user: {id:string;role:AccessRole}, status: string, scope: 'meus'|'recebidos', search: string, page: number, profileFilter: string) {
  let q=createClient().from('solicitacoes_suporte').select('*',{count:'exact'})
  if(user.role==='ADMIN') q=q.eq('destino','SISTEMA')
  else q=q.eq(user.role==='PERSONAL'&&scope==='recebidos'?'personal_id':'aluno_id',user.id)
  if(status) q=q.eq('status',status)
  if(profileFilter) q=q.eq('solicitante_tipo',profileFilter)
  if(search.trim()) q=q.ilike('assunto',`%${search.trim().replace(/[\\%_]/g,'\\$&')}%`)
  const {data,count,error}=await q.order('atualizado_em',{ascending:false}).order('id',{ascending:false}).range((page-1)*10,page*10-1);check(error)
  if(!data||count==null) throw new Error('Não foi possível carregar as solicitações.')
  return {items:data as SupportTicket[],total:count}
}
export async function supportMessages(id:string,page:number) {
  const {data,error}=await createClient().from('suporte_mensagens').select('*').eq('solicitacao_id',id).order('criado_em').order('id').range(page*20,page*20+20);check(error)
  const rows=(data??[]) as SupportMessage[];return {items:rows.slice(0,20),next:rows.length>20?page+1:undefined}
}
export async function openSupport(draft:{id:string;destino:string;personal:string|null;assunto:string;mensagem:string}) {
  const {data,error}=await createClient().rpc('abrir_suporte',{p_id:draft.id,p_destino:draft.destino,p_personal:draft.personal,p_assunto:draft.assunto,p_mensagem:draft.mensagem});check(error)
  if(data!==draft.id)throw new Error('Não foi possível confirmar o envio. Tente novamente.')
}
export async function replySupport(id:string,messageId:string,message:string,status:SupportStatus|null) {
  const {error}=await createClient().rpc('responder_suporte',{p_id:id,p_mensagem_id:messageId,p_mensagem:message,p_status:status});check(error)
}
