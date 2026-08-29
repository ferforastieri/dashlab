# Site público do DashLab

Site estático preparado para Vercel. Não compartilha runtime, API ou dados com a instalação do homelab.

## Publicação

- Importe o repositório no Vercel.
- Mantenha a raiz do projeto em `/`.
- O `vercel.json` define `site` como diretório de saída e desativa etapas de build e instalação.

Depois de configurar o domínio definitivo, atualize as URLs em `robots.txt`, `sitemap.xml` e os metadados sociais de `index.html`.
