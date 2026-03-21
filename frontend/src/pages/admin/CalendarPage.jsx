import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { Modal, StatusBadge, useToast } from '../../components/ui'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const EC = { DELIVERY:'bg-primary-100 text-primary-700 border-primary-200', TODO:'bg-secondary-100 text-secondary-700 border-secondary-200', MEETING:'bg-orange-100 text-orange-700 border-orange-200', OTHER:'bg-surface-100 text-surface-600 border-surface-200' }
const emptyForm = { title:'', description:'', event_date:'', event_type:'TODO', reminder:false, reminder_days:1 }

export default function CalendarPage() {
  const toast = useToast()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const [cur, setCur] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [sel, setSel] = useState(null)

  const year=cur.getFullYear(), month=cur.getMonth()

  const load = useCallback(async () => {
    try { const r = await api.get('/calendar', { params: { year, month: month+1 } }); setEvents(r.data) } catch {}
  }, [year, month])

  useEffect(() => { load() }, [load])

  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const eventsOn = (day) => { const d=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; return events.filter(e=>e.event_date?.slice(0,10)===d) }

  const addEvent = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/calendar', form); toast('Event added'); setModal(false); setForm(emptyForm); load() }
    catch { toast('Failed','error') } finally { setSaving(false) }
  }

  const delEvent = async (id) => {
    try { await api.delete(`/calendar/${id}`); toast('Deleted'); load() } catch { toast('Failed','error') }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-title">Calendar</h1><p className="text-sm text-surface-400 mt-1">Events and delivery schedule</p></div>
        <button onClick={() => { setForm({...emptyForm, event_date:todayStr}); setModal(true) }} className="btn-primary">+ Add Event</button>
      </div>
      <div className="flex gap-3 flex-wrap text-xs">
        {[['DELIVERY','Delivery'],['TODO','To-Do'],['MEETING','Meeting']].map(([t,l]) => <span key={t} className={`badge border ${EC[t]}`}>{l}</span>)}
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <button onClick={() => setCur(new Date(year,month-1,1))} className="btn-secondary !px-3 !py-2">‹</button>
          <h2 className="font-bold text-surface-900">{MONTHS[month]} {year}</h2>
          <button onClick={() => setCur(new Date(year,month+1,1))} className="btn-secondary !px-3 !py-2">›</button>
        </div>
        <div className="grid grid-cols-7 border-b border-surface-100">
          {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-surface-400 uppercase py-3">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({length:firstDay}).map((_,i) => <div key={`e${i}`} className="min-h-[80px] border-b border-r border-surface-100 bg-surface-50/50" />)}
          {Array.from({length:daysInMonth}).map((_,i) => {
            const day=i+1, ds=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, isToday=ds===todayStr, dayEvs=eventsOn(day), isSel=sel===day
            return (
              <div key={day} onClick={() => setSel(isSel?null:day)}
                className={`min-h-[80px] border-b border-r border-surface-100 p-1 cursor-pointer transition-colors ${isToday?'bg-primary-50':isSel?'bg-secondary-50/30':'hover:bg-surface-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${isToday?'bg-primary-500 text-white':'text-surface-700'}`}>{day}</div>
                {dayEvs.slice(0,2).map(ev => <div key={ev.id} className={`text-xs px-1 py-0.5 rounded truncate border mb-0.5 ${EC[ev.event_type]||EC.OTHER}`}>{ev.title}</div>)}
                {dayEvs.length>2 && <div className="text-xs text-surface-400">+{dayEvs.length-2}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {sel && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">{sel} {MONTHS[month]} — {eventsOn(sel).length} event(s)</h3>
            <button onClick={() => { setForm({...emptyForm, event_date:`${year}-${String(month+1).padStart(2,'0')}-${String(sel).padStart(2,'0')}`}); setModal(true) }} className="btn-primary !py-1.5 !px-3 text-xs">+ Add</button>
          </div>
          {eventsOn(sel).length===0 ? <p className="text-sm text-surface-400">No events</p> : (
            <div className="space-y-2">
              {eventsOn(sel).map(ev => (
                <div key={ev.id} className={`flex items-start justify-between p-3 rounded-xl border ${EC[ev.event_type]||EC.OTHER}`}>
                  <div><div className="font-semibold text-sm">{ev.title}</div>{ev.description&&<div className="text-xs opacity-80 mt-0.5">{ev.description}</div>}<StatusBadge status={ev.event_type} /></div>
                  {ev.event_type!=='DELIVERY' && <button onClick={() => delEvent(ev.id)} className="text-red-400 hover:text-red-600 p-1 ml-2">✕</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add Event">
        <form onSubmit={addEvent} className="space-y-4">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input className="input" type="date" value={form.event_date} onChange={e=>setForm(p=>({...p,event_date:e.target.value}))} required /></div>
            <div><label className="label">Type</label><select className="input" value={form.event_type} onChange={e=>setForm(p=>({...p,event_type:e.target.value}))}><option value="TODO">To-Do</option><option value="MEETING">Meeting</option><option value="OTHER">Other</option></select></div>
          </div>
          <div><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving…':'Add Event'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
