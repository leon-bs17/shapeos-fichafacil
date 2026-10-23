import { access,api,ApiError,body,dbError,json,uuid } from '@/lib/api/fitness'
import { parseReminderFields,type PersonalReminder } from '@/lib/fitness/personal-reminders'
import { weekWindow } from '@/lib/fitness/personal-agenda'
const fields='id,titulo,descricao,data,concluido,concluido_em'
export async function GET(request:Request){return api(async()=>{
  const a=await access(request)
  if(a.role!=='PERSONAL')throw new ApiError(403,'Agenda privada do Personal.')
  let week
  try{week=weekWindow(new URL(request.url).searchParams.get('semana')??'')}catch{throw new ApiError(400,'Informe uma semana válida.')}
  const rows:PersonalReminder[]=[]
  for(;;){
    const {data,error}=await a.db.from('personal_lembretes').select(fields).eq('personal_id',a.id).gte('data',week.start).lte('data',week.end).order('data').order('id').range(rows.length,rows.length+199)
    dbError(error);if(!data)throw new ApiError(500,'Não foi possível carregar os lembretes.');if(!data.length)break;rows.push(...data)
  }
  return json({data:rows})
})}
export async function POST(request:Request){return api(async()=>{
  const a=await access(request,true),raw=await body(request)
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!('id'in raw)||typeof raw.id!=='string')throw new ApiError(400,'Identificação de lembrete inválida.')
  const {id,...input}=raw,idValue=uuid(id)
  let value
  try{value=parseReminderFields(input)}catch(error){throw new ApiError(400,error instanceof Error?error.message:'Revise o lembrete.')}
  const {error}=await a.db.from('personal_lembretes').upsert({id:idValue,personal_id:a.id,...value},{onConflict:'id',ignoreDuplicates:true})
  dbError(error)
  const {data,error:readError}=await a.db.from('personal_lembretes').select(fields).eq('id',idValue).eq('personal_id',a.id).maybeSingle()
  dbError(readError)
  if(!data||data.titulo!==value.titulo||data.descricao!==value.descricao||data.data!==value.data)throw new ApiError(409,'Este lembrete mudou. Revise os campos antes de salvar.')
  return json({data},201)
})}
