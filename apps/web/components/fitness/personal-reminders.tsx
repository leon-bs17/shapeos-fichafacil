'use client'
import { useRef,useState } from 'react'
import { useMutation,useQueryClient } from '@tanstack/react-query'
import { Pencil,Check,RotateCcw,Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { fitnessRequest } from '@/lib/api/client'
import { parseReminderFields,type PersonalReminder } from '@/lib/fitness/personal-reminders'
import styles from './personal-reminders.module.css'

export function ReminderActions({reminder,onEdit}:{reminder:PersonalReminder;onEdit:()=>void}){
  const client=useQueryClient()
  const mutation=useMutation({mutationFn:()=>fitnessRequest(`/api/lembretes/${reminder.id}`,'PATCH',{concluido:!reminder.concluido}),onSuccess:()=>client.invalidateQueries({queryKey:['personal-reminders']})})
  return <div className={styles.rowActions}><div>
    <Button variant="outline" disabled={mutation.isPending} onClick={()=>mutation.mutate()} aria-label={`${reminder.concluido?'Reabrir':'Concluir'} ${reminder.titulo}`}>{reminder.concluido?<RotateCcw size={14} aria-hidden="true"/>:<Check size={14} aria-hidden="true"/>}{reminder.concluido?'Reabrir':'Concluir'}</Button>
    <Button variant="outline" disabled={mutation.isPending} onClick={onEdit} aria-label={`Editar ${reminder.titulo}`}><Pencil size={14} aria-hidden="true"/>Editar</Button>
  </div>{mutation.isError&&<p role="alert">{mutation.error.message}</p>}</div>
}
export function ReminderEditor({reminder,defaultDate,onClose,onSaved}:{reminder?:PersonalReminder;defaultDate:string;onClose:()=>void;onSaved:(date:string)=>void}){
  const client=useQueryClient(),busy=useRef(false),requestId=useRef<string|null>(null)
  const [titulo,setTitulo]=useState(reminder?.titulo??''),[descricao,setDescricao]=useState(reminder?.descricao??''),[data,setData]=useState(reminder?.data??defaultDate)
  const [error,setError]=useState(''),[confirmDelete,setConfirmDelete]=useState(false)
  const mutation=useMutation({mutationFn:async(action:'save'|'delete')=>{
    if(action==='delete')return fitnessRequest(`/api/lembretes/${reminder!.id}`,'DELETE')
    const fields=parseReminderFields({titulo,descricao,data})
    if(reminder)return fitnessRequest(`/api/lembretes/${reminder.id}`,'PATCH',fields)
    requestId.current??=crypto.randomUUID()
    return fitnessRequest('/api/lembretes','POST',{id:requestId.current,...fields})
  }})
  function changed(){requestId.current=null;setError('');mutation.reset();setConfirmDelete(false)}
  async function run(action:'save'|'delete'){
    if(busy.current)return
    busy.current=true;setError('')
    try{await mutation.mutateAsync(action);await client.invalidateQueries({queryKey:['personal-reminders']});if(action==='save')onSaved(data);else onClose()}
    catch(error){setError(error instanceof Error?error.message:'Não foi possível salvar o lembrete.')}
    finally{busy.current=false}
  }
  return <Modal personal open onClose={()=>{if(!busy.current)onClose()}} titulo={reminder?'Editar lembrete':'Novo lembrete'}><div className={styles.editor}>
    <p className={styles.note}>Lembrete privado da sua Agenda.</p>
    <div><label htmlFor="reminder-title">Título</label><Input id="reminder-title" maxLength={120} value={titulo} disabled={mutation.isPending} onChange={event=>{changed();setTitulo(event.target.value)}}/></div>
    <div><label htmlFor="reminder-date">Data</label><Input id="reminder-date" type="date" min="0001-01-01" max="9999-12-31" value={data} disabled={mutation.isPending} onChange={event=>{changed();setData(event.target.value)}}/></div>
    <div><label htmlFor="reminder-description">Descrição (opcional)</label><textarea id="reminder-description" rows={3} maxLength={1000} value={descricao} disabled={mutation.isPending} onChange={event=>{changed();setDescricao(event.target.value)}}/><p className={styles.note}>{descricao.length}/1.000 caracteres</p></div>
    {reminder?.concluido_em&&<p className={styles.note}>Concluído em {new Date(reminder.concluido_em).toLocaleString('pt-BR')}.</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {confirmDelete&&<div className={styles.confirm}><p>Excluir este lembrete?</p><Button variant="outline" className="personal-danger" disabled={mutation.isPending} onClick={()=>void run('delete')}>Confirmar exclusão</Button><Button variant="outline" disabled={mutation.isPending} onClick={()=>setConfirmDelete(false)}>Manter lembrete</Button></div>}
    <div className={styles.actions}>{reminder&&<Button variant="outline" className="personal-danger" disabled={mutation.isPending} onClick={()=>setConfirmDelete(true)}><Trash2 size={15} aria-hidden="true"/>Excluir lembrete</Button>}<Button variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancelar</Button><Button disabled={mutation.isPending||titulo.trim().length<3||!data} onClick={()=>void run('save')}>{mutation.isPending?'Salvando…':'Salvar lembrete'}</Button></div>
  </div></Modal>
}
