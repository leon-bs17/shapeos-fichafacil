import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'treinos',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'titulo', type: 'string' },
        { name: 'ativo', type: 'boolean' },
        { name: 'criado_em', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'itens_treino',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'treino_remote_id', type: 'string', isIndexed: true },
        { name: 'exercicio_nome', type: 'string' },
        { name: 'exercicio_grupo_muscular', type: 'string' },
        { name: 'exercicio_video_url', type: 'string', isOptional: true },
        { name: 'series', type: 'number' },
        { name: 'repeticoes', type: 'string' },
        { name: 'descanso_segundos', type: 'number' },
        { name: 'ordem', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'registros_execucao',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'item_treino_remote_id', type: 'string', isIndexed: true },
        { name: 'carga_utilizada', type: 'number', isOptional: true },
        { name: 'repeticoes_feitas', type: 'number', isOptional: true },
        { name: 'data_registro', type: 'number' },
        { name: 'sincronizado', type: 'boolean' },
      ],
    }),
  ],
})
