import { access,api,dbError,json,workout } from '@/lib/api/fitness'
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return api(async()=>{
  const a=await access(request,true),{id}=await context.params;await workout(a,id)
  const {data:created,error}=await a.db.rpc('duplicar_ficha_atomica',{p_ficha_id:id});dbError(error)
  return json({data:await workout(a,created)},201,{Location:`/api/treinos/${created}`})
})}
