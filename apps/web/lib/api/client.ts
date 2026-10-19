export async function fitnessRequest<T>(url:string,method='GET',body?:unknown):Promise<T>{
  const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})
  if(response.redirected || (response.status!==204&&!response.headers.get('content-type')?.includes('application/json')))throw new Error('Sua sessão expirou. Entre novamente.')
  if(response.status===204)return undefined as T
  const result=await response.json()
  if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Não foi possível concluir a operação.')
  return result.data as T
}
