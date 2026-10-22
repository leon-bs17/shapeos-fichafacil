import { access,api,body,dbError,duplicateSchema,json,validate,workout } from '@/lib/api/fitness'
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return api(async()=>{
  const a=await access(request,true),{id}=await context.params;await workout(a,id)
  const input=request.body===null?null:validate(duplicateSchema,await body(request))
  const {data:created,error}=input
    ? await a.db.rpc('duplicar_ficha_para_aluno',{p_ficha_id:id,p_aluno_id:input.aluno_id,p_titulo:input.titulo?.trim()??null})
    : await a.db.rpc('duplicar_ficha_atomica',{p_ficha_id:id})
  dbError(error)
  return json({data:await workout(a,created)},201,{Location:`/api/treinos/${created}`})
})}

