import { createClient as createPublicClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { criarTreinoSchema } from '@shapeos/shared'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function json(data: unknown, status = 200, headers: Record<string,string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}
export async function api(action: () => Promise<Response>) {
  try { return await action() } catch (error) {
    return json({ error: error instanceof ApiError ? error.message : 'Não foi possível concluir a operação. Tente novamente.' }, error instanceof ApiError ? error.status : 500)
  }
}
export async function access(request: Request, write = false) {
  const authorization = request.headers.get('authorization')
  const bearer = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (authorization && !bearer) throw new ApiError(401,'Token de acesso inválido.')
  if (write && !bearer && request.headers.get('origin') !== new URL(request.url).origin) throw new ApiError(403,'Origem inválida.')
  const db = bearer ? createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    global:{headers:{Authorization:`Bearer ${bearer}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  }) : await createClient()
  const {data:{user},error} = bearer ? await db.auth.getUser(bearer) : await db.auth.getUser()
  if(error || !user) throw new ApiError(401,'Entre na sua conta para continuar.')
  const {data:profile,error:profileError}=await db.from('usuarios').select('tipo,status_conta').eq('id',user.id).single()
  if(profileError || !profile || profile.status_conta!=='ATIVO' || !['ADMIN','PERSONAL','ALUNO'].includes(profile.tipo)) throw new ApiError(403,'Conta sem permissão para esta operação.')
  if(write && profile.tipo!=='PERSONAL') throw new ApiError(403,'Somente o personal pode gerenciar suas fichas.')
  return {db,id:user.id,role:profile.tipo as 'ADMIN'|'PERSONAL'|'ALUNO'}
}
export function uuid(id:string) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new ApiError(400,'Identificador inválido.')
  return id
}
export async function body(request:Request): Promise<unknown> {
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new ApiError(415,'Envie os dados em JSON.')
  const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Corpo da requisição vazio.')
  let text='',size=0;const decoder=new TextDecoder()
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw new ApiError(413,'Requisição muito grande.')}text+=decoder.decode(value,{stream:true})}
    text+=decoder.decode();try{return JSON.parse(text)}catch{throw new ApiError(400,'JSON inválido.')}
  }finally{reader.releaseLock()}
}
export const createSchema=criarTreinoSchema.extend({itens:criarTreinoSchema.shape.itens.max(50)}).strict()
export const editSchema=createSchema.omit({aluno_id:true}).strict()
export function validate<T>(schema:{safeParse:(input:unknown)=>{success:true;data:T}|{success:false;error:{issues:{message:string}[]}}},input:unknown):T {
  const result=schema.safeParse(input)
  if(!result.success)throw new ApiError(400,result.error.issues[0]?.message||'Dados inválidos.')
  return result.data
}
export function dbError(error:{code?:string;message?:string}|null) {
  if(!error)return
  if(error.code==='42501')throw new ApiError(403,'Você não tem permissão para alterar esta ficha ou o vínculo está inativo.')
  if(error.code==='PGRST202')throw new ApiError(503,'O banco precisa da migração de fichas da Sprint 3.')
  if(error.code==='23503')throw new ApiError(409,'Um dos registros relacionados não existe ou está em uso.')
  if(error.code==='23505')throw new ApiError(409,'Há itens com a mesma posição na ficha.')
  if(error.code?.startsWith('22') || error.code==='23514')throw new ApiError(400,'Revise o título, os exercícios e os valores da ficha.')
  throw new ApiError(500,'Não foi possível salvar ou consultar os dados.')
}
const select='id,titulo,ativo,criado_em,valida_ate,aluno_id,aluno:usuarios!treinos_aluno_id_fkey(nome),itens_treino(id,ordem,series,repeticoes,descanso_segundos,exercicio:exercicios(id,nome,grupo_muscular,video_url))'
export function workoutQuery(a:{db:SupabaseClient;id:string;role:string}) {
  let query=a.db.from('treinos').select(select)
  if(a.role==='PERSONAL')query=query.eq('personal_id',a.id)
  if(a.role==='ALUNO')query=query.eq('aluno_id',a.id)
  return query
}
export function normalizeWorkout(row:any) {
  return {id:row.id,titulo:row.titulo,ativo:row.ativo,criado_em:row.criado_em,valida_ate:row.valida_ate??null,aluno_id:row.aluno_id,aluno_nome:row.aluno?.nome??'—',itens:[...(row.itens_treino??[])].sort((a,b)=>a.ordem-b.ordem)}
}
export async function workout(a:Awaited<ReturnType<typeof access>>,id:string) {
  const {data,error}=await workoutQuery(a).eq('id',uuid(id)).maybeSingle();dbError(error)
  if(!data)throw new ApiError(404,'Ficha não encontrada.')
  return normalizeWorkout(data)
}

