# Arquivo — Mesa Paranormal v1.0.0

Aplicação React + TypeScript + Vite.

## Executar localmente
```bash
npm install
npm run dev
```

## Habilitar contas Supabase
1. Crie um projeto Supabase.
2. Execute o SQL de `supabase/migrations/202611210001_initial_schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local`.
4. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados públicos do projeto.
5. Reinicie o servidor Vite.
6. Abra Infraestrutura > Conta do Arquivo para criar uma conta ou entrar.

Use somente a chave publicável/anon no frontend. Nunca exponha `service_role`.

## Estado atual
Cadastro/login e sessão são integrados ao Supabase quando configurado. Campanhas, fichas e rolagens ainda ficam locais no navegador; não há sincronização multiplayer nesta versão. Consulte `PROJECT_STATUS.md`.

## v1.1.0 — campanhas online
1. No Supabase, abra SQL Editor.
2. Execute o arquivo `supabase/migrations/202611210002_cloud_campaigns.sql` (não precisa executar novamente a migration inicial).
3. Reinicie o Vite se necessário (`npm run dev`).
4. Entre com sua conta e abra **Campanha**.
5. Crie uma campanha na seção **Campanhas online**. Ela será gravada no banco e o criador será adicionado como GM na mesma operação.
6. Teste o diário da campanha e atualize a lista.

As campanhas antigas permanecem no armazenamento local e não são migradas automaticamente. Convites reais, entrada de outros usuários e sincronização em tempo real ainda não fazem parte desta etapa.


## v1.2.0 — convites de campanhas online
1. No Supabase, abra **SQL Editor**.
2. Execute apenas a nova migration `supabase/migrations/202611210003_campaign_invites.sql`. Não é necessário repetir as migrations anteriores.
3. Atualize/reinicie o projeto (`npm run dev`).
4. Entre com sua conta e abra **Campanha > Campanhas online**.
5. Selecione uma campanha que você criou como mestre e gere um código de convite. A validade padrão é de 7 dias; o limite de usos é opcional.
6. O jogador precisa ter uma conta no Arquivo, entrar nela e informar o código na área **Entrar em uma campanha**.

Os convites concedem somente o papel de jogador. A validação de validade, limite de usos e permissão do mestre acontece no banco, não apenas na interface. A migration é incremental e não apaga campanhas ou participantes existentes.
