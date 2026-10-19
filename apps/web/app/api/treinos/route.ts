import { access,api,body,createSchema,dbError,json,normalizeWorkout,validate,workout,workoutQuery } from '@/lib/api/fitness'

export async function GET(request:Request){return api(async()=>{
  const a=await access(request)
  const {data,error}=await workoutQuery(a).order('criado_em',{ascending:false})
  dbError(error);return json({data:(data??[]).map(normalizeWorkout)})
})}
export async function POST(request:Request){return api(async()=>{
  const a=await access(request,true),input=validate(createSchema,await body(request))
  const {data:id,error}=await a.db.rpc('criar_ficha_atomica',{p_aluno_id:input.aluno_id,p_titulo:input.titulo.trim(),p_itens:input.itens})
  dbError(error)
  return json({data:await workout(a,id)},201,{Location:`/api/treinos/${id}`})
})}
