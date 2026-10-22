import { access,api,ApiError,body,dbError,editSchema,json,validate,workout } from '@/lib/api/fitness'
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context){return api(async()=>json({data:await workout(await access(request),(await context.params).id)}))}
export async function PATCH(request:Request,context:Context){return api(async()=>{
  const a=await access(request,true),{id}=await context.params
  await workout(a,id)
  const input=await body(request)
  if(input && typeof input==='object' && !Array.isArray(input) && Object.keys(input).length===1 && 'ativo' in input){
    if(typeof input.ativo!=='boolean')throw new ApiError(400,'Status inválido.')
    const {error}=await a.db.from('treinos').update({ativo:input.ativo}).eq('id',id).eq('personal_id',a.id);dbError(error)
  }else{
    const parsed=validate(editSchema,input)
    const {error}=await a.db.rpc('editar_ficha_com_validade',{p_ficha_id:id,p_titulo:parsed.titulo.trim(),p_itens:parsed.itens,p_valida_ate:parsed.valida_ate??null,p_alterar_validade:parsed.valida_ate!==undefined});dbError(error)
  }
  return json({data:await workout(a,id)})
})}
export async function DELETE(request:Request,context:Context){return api(async()=>{
  const a=await access(request,true),{id}=await context.params;await workout(a,id)
  const {error}=await a.db.from('treinos').delete().eq('id',id).eq('personal_id',a.id);dbError(error)
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}})
})}

