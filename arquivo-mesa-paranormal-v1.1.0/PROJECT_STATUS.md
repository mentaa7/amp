# Arquivo — Mesa Paranormal | v1.2.0

## Implementado nesta etapa
- Login/cadastro Supabase mantido.
- Campanhas online e diário mantidos.
- Mestre pode gerar convite para sua campanha com código aleatório de alta entropia.
- Validade e limite de usos opcionais.
- Jogador autenticado pode entrar usando o código.
- Entrada e consumo do convite são validados de forma transacional no banco.
- Convites concedem somente o papel PLAYER.
- Lista de participantes disponível na interface.
- Migrations anteriores preservadas; nova migration incremental: `202611210003_campaign_invites.sql`.

## Configuração
1. Manter as credenciais públicas Supabase já configuradas no `.env.local`.
2. Executar no SQL Editor apenas `supabase/migrations/202611210003_campaign_invites.sql`.
3. Reiniciar o Vite se necessário.
4. Mestre cria/seleciona uma campanha online e gera convite.
5. Jogador cria/usa sua conta, informa o código e entra na campanha.

## Segurança
- RPCs exigem usuário autenticado.
- Criação de convite exige papel GM validado no banco.
- Códigos gerados com 16 bytes aleatórios criptograficamente seguros.
- Consumo bloqueia a linha do convite durante a transação para respeitar o limite de usos.
- Nenhuma chave service_role é usada no frontend.
- Convites não podem conceder papel GM.

## Testes ainda necessários
- Executar `npm run build`.
- Testar com duas contas Supabase distintas.
- Verificar convite válido, expirado, limite atingido, código inválido e tentativa de reutilização.
- Conferir comportamento no navegador e em dispositivos diferentes.

## Próximas etapas sugeridas
- Exibir nomes dos participantes usando perfis públicos controlados.
- Permitir revogar convites ativos pela interface.
- Sincronização em tempo real de diário e estado da campanha.
- Sincronização de fichas vinculadas às campanhas.
