import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ConcorrenteForm from '@/components/concorrentes/ConcorrenteForm'
import { Concorrente } from '@/lib/concorrentes'

interface EditarConcorrentePageProps {
  params: { id: string }
}

async function getConcorrente(id: string): Promise<Concorrente | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase
      .from('concorrentes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !data) return null
    return data as Concorrente
  } catch {
    return null
  }
}

export default async function EditarConcorrentePage({ params }: EditarConcorrentePageProps) {
  const concorrente = await getConcorrente(params.id)

  if (!concorrente) {
    notFound()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Produto</h1>
        <p className="text-gray-600 mt-1">Atualize as informações do produto concorrente</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <ConcorrenteForm concorrente={concorrente} isEditing />
      </div>
    </div>
  )
}
