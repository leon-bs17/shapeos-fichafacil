import { access,api,ApiError,body,dbError,json,uuid } from '@/lib/api/fitness'
import { parseReminderFields } from '@/lib/fitness/personal-reminders'
type Context={params:Promise<{id:string}>}
export async function PATCH(request:Request,context:Context){return api(async()=>{
  const a=await access(request,true),id=uuid((await context.params).id),raw=await body(request)
  let value
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.keys(raw).length===1&&'concluido'in raw&&typeof raw.concluido==='boolean')value={concluido:raw.concluido}
  else try{value=parseReminderFields(raw)}catch(error){throw new ApiError(400,error instanceof Error?error.message:'Revise o lembrete.')}
  const {data,error}=await a.db.from('personal_lembretes').update(value).eq('id',id).eq('personal_id',a.id).select('id,titulo,descricao,data,concluido,concluido_em').maybeSingle()
  dbError(error);if(!data)throw new ApiError(404,'Lembrete não encontrado.');return json({data})
})}
export async function DELETE(request:Request,context:Context){return api(async()=>{
  const a=await access(request,true),id=uuid((await context.params).id)
  const {error}=await a.db.from('personal_lembretes').delete().eq('id',id).eq('personal_id',a.id)
  dbError(error);return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}})
})}
