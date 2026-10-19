// HTTP integration test. Use only dedicated demonstration accounts.
import assert from 'node:assert/strict'
const required=['BASE_URL','SUPABASE_URL','SUPABASE_ANON_KEY','PERSONAL_EMAIL','PERSONAL_PASSWORD','ALUNO_EMAIL','ALUNO_PASSWORD','ALUNO_ID']
for(const key of required)if(!process.env[key])throw new Error(`Configure ${key} no ambiente.`)
const e=process.env,base=e.BASE_URL.replace(/\/$/,''),cleanup=[]
async function login(email,password){
 const response=await fetch(e.SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:e.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})})
 assert.equal(response.status,200,'Login de demonstração falhou')
 return (await response.json()).access_token
}
async function call(path,token,method='GET',body){
 const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})
 const payload=response.status===204?null:await response.json()
 return {status:response.status,payload}
}
const personal=await login(e.PERSONAL_EMAIL,e.PERSONAL_PASSWORD),student=await login(e.ALUNO_EMAIL,e.ALUNO_PASSWORD)
try{
 assert.equal((await call('/api/treinos',null)).status,401)
 const catalog=await call('/api/exercicios',personal);assert.equal(catalog.status,200);assert.ok(catalog.payload.data.length)
 const input={aluno_id:e.ALUNO_ID,titulo:'Demonstração automática Sprint 3',itens:[{exercicio_id:catalog.payload.data[0].id,series:3,repeticoes:'10',descanso_segundos:60,ordem:0}]}
 assert.equal((await call('/api/treinos',student,'POST',input)).status,403)
 const created=await call('/api/treinos',personal,'POST',input);assert.equal(created.status,201,created.payload?.error);const id=created.payload.data.id;cleanup.push(id)
 assert.equal((await call('/api/treinos/'+id,personal)).status,200)
 assert.equal((await call('/api/treinos/'+id,student)).status,200)
 const changed=await call('/api/treinos/'+id,personal,'PATCH',{titulo:'Demonstração editada Sprint 3',itens:input.itens});assert.equal(changed.status,200)
 assert.equal((await call('/api/treinos/'+id,personal)).payload.data.titulo,'Demonstração editada Sprint 3')
 const copy=await call('/api/treinos/'+id+'/duplicar',personal,'POST');assert.equal(copy.status,201);cleanup.push(copy.payload.data.id);assert.equal(copy.payload.data.ativo,false)
 assert.equal((await call('/api/treinos/'+id,student,'DELETE')).status,403)
 assert.equal((await call('/api/treinos/'+id,personal,'PATCH',{ativo:false})).status,200)
 assert.equal((await call('/api/treinos/'+id,personal,'DELETE')).status,204)
 assert.equal((await call('/api/treinos/'+id,personal)).status,404)
 console.log('PASS: real login, seven HTTP operations, persisted edit, student permissions and deletion.')
}finally{
 for(const id of cleanup){const result=await call('/api/treinos/'+id,personal,'DELETE');if(![204,404].includes(result.status))console.error('Remova a ficha temporária:',id)}
}
