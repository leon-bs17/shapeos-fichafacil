# ShapeOS: equivalência visual entre modos

Padrão de produto para todos os tipos de acesso: Admin, Personal, Aluno e páginas públicas.

Todo tratamento visual do modo escuro precisa de uma versão equivalente no modo claro, usando a paleta do respectivo modo. Isso inclui degradês, bordas, estados selecionados, hover e foco. Geometria, hierarquia, dimensões e comportamento responsivo permanecem equivalentes. Conteúdo e permissões continuam específicos de cada perfil.

## Referência obrigatória entre contas

A conta Admin é a referência primordial de interface. Personal, Aluno e os demais acessos devem espelhar seus componentes, medidas, tipografia, espaçamentos e estados nos dois modos. Adapte apenas o conteúdo e a identidade visual de cada área; compactação deve seguir os componentes compactos já definidos no Admin. Não invente variações locais de tamanho ou apresentação. Compare sempre com o componente correspondente do Admin antes de concluir.

## Banners

O arquivo `apps/web/app/shapeos-banner-theme.css`, importado no layout raiz, define o padrão global de banner com base em **Admin → Aprovações**. Vale para os banners existentes e os próximos banners, em todos os tipos de acesso. Os banners legados do Admin e os dois banners do Personal estão mapeados nessa folha.

Novos banners devem usar `ShapeosBanner`, de `apps/web/components/layout/shapeos-banner.tsx`. Para marcação externa ou legada, use `data-shapeos-banner` (ou `shapeos-banner`), um `h1`/`h2`, a descrição logo após o título e `data-shapeos-banner-art` para a ilustração. O componente não implementa consultas, controles, navegação ou permissões.

| Propriedade | Claro | Escuro |
| --- | --- | --- |
| Cor inicial | #E4F3EB | #073A30 |
| Cor intermediária | #F2F8F1 | #071B17 |
| Cor final | #FCFDF9 | #041512 |
| Forma e posição | Elipse em 80% 65% | Elipse em 80% 65% |
| Paradas | 0%, 48%, 100% | 0%, 48%, 100% |

Use `var(--shapeos-banner-gradient)` para consultar o tratamento compartilhado. Não duplique cores locais por perfil. A camada de banner prevalece sobre as antigas regras de fundo das páginas, inclusive aquelas com `!important`. Ela centraliza também dimensões, tipografia, borda e posicionamento das ilustrações. Não crie exceções locais para compactar ou ampliar o banner de um perfil.

| Propriedade | Desktop, a partir de 768 px | Celular, até 767 px |
| --- | --- | --- |
| Largura | 100% do espaço disponível | 100% do espaço disponível |
| Altura mínima | 130 px | 150 px |
| Espaçamento vertical / lateral | 24 / 28 px | 22 / 18 px |
| Borda / raio | 1 / 13 px | 1 / 13 px |
| Título | 28 px, peso 700, entrelinha 1,2 | 26 px, peso 700, entrelinha 1,2 |
| Rótulo acima do título | 9 px, peso 650, entrelinha 1,4, espaçamento entre letras 0,1 em, maiúsculas, margem inferior 8 px, cor primária do modo | Mesmo padrão |
| Descrição | 13 px, entrelinha 1,6, margem superior 8 px | Mesmo padrão |
| Ilustração | 300 px, opacidade 35%, direita 8 px | 300 px, opacidade 16%, direita −150 px, centralizada verticalmente |

No celular, centralize a ilustração **verticalmente**, mantendo o lado direito já definido: `top:50%`, `right:-150px`, `left:auto` e `transform:translateY(-50%)`. Não centralize horizontalmente no banner. Use largura de 300 px, opacidade de 16% e nenhuma máscara de desvanecimento. Ela permanece decorativa, atrás do texto e sem eventos de ponteiro. Essa adaptação é exclusiva de até 767 px; a ilustração de desktop conserva largura, posição e opacidade.

A altura é mínima, não fixa: texto longo ou zoom podem aumentar o banner sem cortar conteúdo. Preserve títulos, descrições, ilustrações e funções de cada página. A paleta muda conforme o modo; as medidas permanecem as mesmas.

```tsx
<ShapeosBanner
  title={<>Visão geral dos <span>seus alunos</span></>}
  description="Alunos, fichas e evolução. Tudo em um só lugar."
  titleId="overview-banner-title"
  art={<PersonalOverviewWireframe />}
/>
```

## Demais componentes

Use os tokens de tema para superfícies, texto e cor primária. O hover estabelecido usa 7% da cor primária no fundo, 40% na borda, borda de 1px e transição de 150ms ease. Preserve foco visível, o estado desabilitado e a preferência por movimento reduzido.

Antes de concluir uma alteração visual, confira claro e escuro nas larguras de desktop e celular, com os mesmos dados, estados e nível de zoom.

## Campos de texto com várias linhas

Descrições, mensagens e observações começam compactas e aumentam a altura conforme o conteúdo digitado ou colado. Ao apagar texto, a altura acompanha o conteúdo até o mínimo inicial. Não habilite alça de redimensionamento manual (`resize:vertical` ou `resize:both`) e não acrescente altura fixa ou limite local que corte o texto. Quando o formulário estiver em um modal, a janela deve respeitar a tela e permitir rolagem do conteúdo completo.

Use `AutoResizeTextarea`, em `apps/web/components/ui/auto-resize-textarea.tsx`, nos novos campos e ao adaptar campos existentes. O componente ajusta conteúdo previamente salvo e recalcula a altura quando a largura muda no celular ou no desktop, mantendo os eventos, limites de caracteres e estilos do formulário. Esse é o padrão para Admin, Personal, Aluno e demais acessos nos dois modos.
