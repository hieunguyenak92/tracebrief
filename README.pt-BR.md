# Tracebrief

**Transforme uma captura HAR em um relatório de rede para revisar antes de compartilhar.**

Veja a ordem das requisições, falhas HTTP, requisições lentas e rotas repetidas sem copiar as URLs, os cabeçalhos, os cookies ou os corpos da captura para o relatório. Funciona localmente no navegador ou no terminal. Sem conta, chave de API, backend ou pacotes de terceiros.

[English](README.md) · [Tiếng Việt](README.vi.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Español](README.es.md) · [**Português (Brasil)**](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [ไทย](README.th.md) · [Français](README.fr.md)

[Privacidade](docs/PRIVACY.md) · [Alternativas](docs/COMPARISON.md) · [Como contribuir](CONTRIBUTING.md)

![Tracebrief exibindo uma captura de rede fictícia](docs/demo.jpg)

## Experimente

Requer **Node.js 22 ou superior**. Na pasta de uma cópia do repositório:

```sh
npm run dev
```

Abra **http://localhost:4173**, carregue a demonstração fictícia ou arraste um arquivo `.har` para a página. Confira a linha do tempo das requisições e exporte um relatório. Não há dependências para instalar.

Para gerar um único arquivo que funciona sem servidor:

```sh
npm run build
```

Abra `dist/index.html` no navegador. Use uma cópia local de confiança ao trabalhar com capturas privadas. O HAR original permanece no seu dispositivo: o aplicativo não faz upload nem mantém a captura após recarregar a página.

## O que você recebe

- Uma visualização em cascata das requisições, com filtros para erros HTTP ou de rede, requisições de pelo menos um segundo e requisições repetidas.
- Contagens das categorias de dados descartadas, para entender o que fica de fora da exportação.
- Markdown para uma issue ou um assistente de programação com IA, um relatório HTML independente e metadados HAR reconstruídos. A CLI também exporta metadados JSON.
- O mesmo núcleo de análise no navegador e na CLI. Medições desconhecidas continuam marcadas como desconhecidas.

Uma requisição é considerada repetida quando, após a primeira ocorrência, tem o mesmo método, origem e caminho. Os parâmetros de consulta são ignorados no agrupamento. Repetições podem ser intencionais. Uma requisição lenta é uma observação, não um diagnóstico da causa.

## O que é compartilhado

O Tracebrief **monta um novo relatório a partir dos metadados permitidos**. Ele não altera o arquivo original nem tenta adivinhar quais textos são segredos.

| Mantido | Omitido ou substituído |
| --- | --- |
| Ordem, início relativo, duração e tempos de espera e recebimento | Datas absolutas viram deslocamentos; as datas do HAR reconstruído partem de 1º de janeiro de 1970 |
| Códigos de status válidos, tamanhos em bytes, métodos padrão e categorias fixas de conteúdo | URL, host, caminho, parâmetros e fragmento originais dão lugar a aliases opacos de origem e rota |
| Agrupamento por origem e rota | Cabeçalhos, cookies, corpos das requisições e respostas e campos personalizados são omitidos |

Por exemplo, uma URL é exportada como `https://origin-1.invalid/route-2`. Os aliases só relacionam requisições dentro daquela análise; não representam nomes reais de endpoints. Você pode ativar uma opção explícita de **visualização local** para ver as URLs originais. Elas nunca entram em uma exportação.

**Revise cada arquivo exportado.** Tempos, tamanhos, códigos de status e padrões de requisições ainda podem ser sensíveis. O Tracebrief não garante a remoção de todas as informações pessoais e não torna uma captura anônima. Um HAR reconstruído não reproduz a sessão nem permite investigar problemas de conteúdo ou autenticação. Leia o [contrato de privacidade](docs/PRIVACY.md).

## CLI

Sem servidor e sem acesso à rede:

```sh
node bin/tracebrief.js public/samples/demo.har --format markdown
node bin/tracebrief.js capture.har --format html --output report.html
node bin/tracebrief.js capture.har --format har --output reconstructed.har
node bin/tracebrief.js capture.har --format json --output metadata.json
```

O formato padrão é Markdown, escrito na saída padrão. Use `--help` para consultar as opções. Arquivos existentes não são sobrescritos: escolha um novo caminho. Guarde capturas privadas fora da cópia do repositório.

## Como capturar um HAR

1. Abra as ferramentas de desenvolvedor do navegador e o painel de rede, geralmente chamado **Network**.
2. Reproduza o problema e use a opção de exportação HAR do painel.
3. Abra o arquivo salvo em uma cópia local de confiança do Tracebrief.
4. Examine o relatório e as categorias descartadas. Revise o arquivo exportado antes de enviá-lo.

O Chrome já oferece uma exportação HAR sanitizada que exclui determinados cabeçalhos sensíveis. O Tracebrief acrescenta uma visão de compartilhamento intencionalmente limitada, descartando também os endpoints e corpos originais. Capturas completas podem conter credenciais e dados pessoais. Consulte a [referência do painel Network do Chrome](https://developer.chrome.com/docs/devtools/network/reference) e a [comparação](docs/COMPARISON.md).

## Limites

- Até **50 MiB** de JSON HAR e **20.000 entradas** por captura.
- Apenas metadados numéricos válidos dentro dos limites aceitos são mantidos. Campos ausentes ou inválidos são sinalizados ou marcados como desconhecidos.
- Sem captura ao vivo, reprodução de sessão, correspondência de aliases entre capturas ou explicação automática da causa de uma falha.
- Remover endpoints e corpos reduz os detalhes disponíveis para depuração. Use o DevTools ou um canal privado de confiança quando precisar dessas informações.
- A versão 0.1 é uma primeira entrega. Feedback sobre combinações de navegador e sistema operacional além das verificadas é bem-vindo.

## Desenvolvimento

```sh
npm test
npm run lint
npm run build
```

Estrutura do código: `public/core.js` contém a análise e os exportadores; `public/app.js`, as interações do navegador; e `bin/tracebrief.js`, a CLI. Os scripts de desenvolvimento e build usam a biblioteca padrão do Node.js.

Ao reportar um bug, forneça uma reprodução mínima com dados **fictícios**. Nunca anexe um HAR de produção, token de acesso, dados de clientes ou endpoint privado a uma issue pública. [Guia de contribuição](CONTRIBUTING.md) · [Política de segurança](SECURITY.md).

## Licença

[MIT](LICENSE).
