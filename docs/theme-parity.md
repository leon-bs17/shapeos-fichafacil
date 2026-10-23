# ShapeOS: equivalência visual entre modos

Padrão de produto para todos os tipos de acesso: Admin, Personal, Aluno e páginas públicas.

Todo tratamento visual do modo escuro precisa de uma versão equivalente no modo claro, usando a paleta do respectivo modo. Isso inclui degradês, bordas, estados selecionados, hover e foco. Geometria, hierarquia, dimensões e comportamento responsivo permanecem equivalentes. Conteúdo e permissões continuam específicos de cada perfil.

## Banners

O arquivo `apps/web/app/shapeos-banner-theme.css`, importado no layout raiz, define o degradê compartilhado. Novos banners devem usar `data-shapeos-banner` ou a classe `shapeos-banner`, em qualquer perfil ou página. Os banners existentes do Admin também estão mapeados nessa folha.

| Propriedade | Claro | Escuro |
| --- | --- | --- |
| Cor inicial | #E4F3EB | #073A30 |
| Cor intermediária | #F2F8F1 | #071B17 |
| Cor final | #FCFDF9 | #041512 |
| Forma e posição | Elipse em 80% 65% | Elipse em 80% 65% |
| Paradas | 0%, 48%, 100% | 0%, 48%, 100% |

Use `var(--shapeos-banner-gradient)` para consultar o tratamento compartilhado. Não duplique cores locais por perfil. A camada de banner prevalece sobre as antigas regras de fundo das páginas, inclusive aquelas com `!important`. Ela altera apenas o fundo: texto, wireframes, medidas e responsividade continuam sob responsabilidade do componente.

## Demais componentes

Use os tokens de tema para superfícies, texto e cor primária. O hover estabelecido usa 7% da cor primária no fundo, 40% na borda, borda de 1px e transição de 150ms ease. Preserve foco visível, o estado desabilitado e a preferência por movimento reduzido.

Antes de concluir uma alteração visual, confira claro e escuro nas larguras de desktop e celular, com os mesmos dados, estados e nível de zoom.
