# Story: UI-6 - Refinamento de Layout e Responsividade da Agenda

**Status:** Ready for Dev
**Agent Responsável:** @dev (Dex)

## Contexto
O usuário solicitou melhorias no layout da página de Agenda (`/agenda`). A página atual sofre com problemas de espaço em dispositivos móveis devido ao uso de paddings fixos muito grandes (`p-8`, `p-10`), o que espreme o conteúdo dos cards. Além disso, o scroll final da página não possui respiro suficiente, correndo o risco de sobreposição pela `BottomNav`.

## Objetivos
1.  **Responsividade Geral:** Ajustar os paddings do container principal e dos cards para se adaptarem a telas menores.
2.  **Otimização de Espaço nos Cards:** Reduzir a largura do indicador de horário no mobile e ajustar o espaçamento interno do conteúdo.
3.  **Tipografia Adaptável:** Ajustar os tamanhos de fonte dos nomes dos clientes para evitar quebra de linha excessiva em mobile.
4.  **Respiro de Navegação:** Garantir que o scroll final da página ultrapasse a `BottomNav` confortavelmente.

## Critérios de Aceitação

### 1. Espaçamento Global (app/agenda/page.tsx)
- [ ] Alterar o container principal `flex-1 p-8 space-y-10 pb-32` para usar paddings responsivos (ex: `sm:p-8 p-6`) e aumentar o padding inferior (ex: `pb-44`) para não colidir com a `BottomNav`.

### 2. Cards de Compromisso
- [ ] **Indicador de Horário:** Alterar de `w-20` para `sm:w-20 w-16` (ou `w-[4.5rem]`) para liberar espaço horizontal.
- [ ] **Conteúdo Principal:** Reduzir o `p-8` interno para `sm:p-8 p-5`.
- [ ] **Títulos:** Alterar o tamanho da fonte do nome do cliente (`text-2xl`) para `sm:text-2xl text-xl`.
- [ ] **Botões de Ação:** Garantir que os botões do rodapé do card caibam em telas menores. Se necessário, ajustar o botão "Concluir" para usar padding menor em mobile.

### 3. Card de Otimização (Empty State / Productivity)
- [ ] Reduzir o padding de `p-10` para `sm:p-10 p-6`.

## Instruções Técnicas
- Utilize as variantes do Tailwind (`sm:`, `md:`) para garantir que o visual luxuoso se mantenha no desktop, enquanto o mobile fica mais denso e utilizável.
- Verifique a legibilidade dos textos e o espaçamento vertical entre os elementos.

## Próximos Passos
- @dev deve editar `appdevendas/src/app/agenda/page.tsx`.
