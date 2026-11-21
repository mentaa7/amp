# Arquivo — Mesa Paranormal | v1.1.0

## Nesta versão
- Mantido o login/cadastro Supabase confirmado na v1.0.0.
- Adicionada seção de campanhas online separada dos registros locais anteriores.
- Criação de campanha remota por RPC `create_campaign_with_owner`, com criação atômica da campanha e vínculo do criador como GM.
- Listagem de campanhas às quais o usuário autenticado tem acesso, respeitando RLS.
- Diário/notas da campanha armazenado na tabela `campaigns`.
- Atualização manual da lista e estados de carregamento/erro.
- Migração incremental `202611210002_cloud_campaigns.sql`; não é necessário repetir a migração inicial.

## Configuração
1. O usuário já deve ter o Supabase configurado e conseguir entrar no Arquivo.
2. Executar `supabase/migrations/202611210002_cloud_campaigns.sql` no SQL Editor.
3. Reiniciar `npm run dev` se necessário.
4. Abrir Campanha, seção Campanhas online.

## Limitações
- Campanhas locais antigas não são enviadas automaticamente ao banco.
- Convites reais e ingresso de outros usuários ainda não estão implementados.
- Gerenciamento de participantes, permissões avançadas e sincronização em tempo real ainda não estão implementados.
- Diário compartilhado nesta etapa pode ser editado pelo criador/mestre; não há colaboração simultânea.
- Build e integração remota precisam ser testados no computador do usuário com seu projeto Supabase.

## Próxima etapa
- Criar convites reais com códigos aleatórios, expiração e limite de uso.
- Permitir que outro usuário autenticado entre em uma campanha pelo código.
- Implementar validação transacional do convite e papéis de participante.
