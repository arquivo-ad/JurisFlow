# JurisFlow Certificate Bridge

Ponte local para certificados ICP-Brasil. O processo escuta somente em `127.0.0.1:43119`.

## Princípios de segurança

- A chave privada nunca é enviada ao backend/Vercel.
- A senha do A1 é enviada somente do navegador para localhost e passa ao OpenSSL por stdin.
- O arquivo PKCS#12 é temporário, com permissão `0600`, e removido após a inspeção.
- Origens web são allowlisted por CORS.
- Sessões da ponte são efêmeras.
- A3 permanece fail-closed quando OpenSC/PKCS#11 não está disponível.

## Desenvolvimento

```bash
npm run certificate:bridge:check
npm run certificate:bridge
```

## Serviço de usuário

```bash
chmod +x scripts/certificate-bridge/*.sh
./scripts/certificate-bridge/install-user-service.sh
```

Para permitir uma origem web adicional, defina `JURISFLOW_ALLOWED_ORIGINS` com origens exatas separadas por vírgula antes de iniciar a ponte.

## A3

Em Ubuntu/Debian, OpenSC normalmente fornece `pkcs11-tool` e `opensc-tool`; `pcscd` fornece acesso PC/SC ao token/leitor. A instalação deve seguir a política da máquina:

```bash
sudo apt install opensc pcscd pcsc-tools
```

A enumeração/assinatura A3 ainda não é habilitada nesta versão da ponte.
