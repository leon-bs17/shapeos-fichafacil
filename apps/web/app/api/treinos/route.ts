import { access,api,body,createSchema,dbError,json,normalizeWorkout,validate,workout,workoutQuery } from '@/lib/api/fitness'

export async function GET(request:Request){return api(async()=>{
  const a=await access(request)
  const rows: ReturnType<typeof normalizeWorkout>[] = []
  for (;;) {
    const {data,error}=await workoutQuery(a).order('criado_em',{ascending:false}).order('id')
      .range(rows.length,rows.length+199)
    dbError(error)
    if (!data) throw new Error('Consulta indisponível')
    if (!data.length) break
    rows.push(...data.map(normalizeWorkout))
  }
  return json({data:rows})
})}
export async function POST(request:Request){return api(async()=>{
  const a=await access(request,true),input=validate(createSchema,await body(request))
  const {data:id,error}=await a.db.rpc('criar_ficha_com_validade',{p_aluno_id:input.aluno_id,p_titulo:input.titulo.trim(),p_itens:input.itens,p_valida_ate:input.valida_ate??null})
  dbError(error)
  return json({data:await workout(a,id)},201,{Location:`/api/treinos/${id}`})
})}

