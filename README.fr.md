# Tracebrief

**Transformez une capture HAR en un rapport réseau à vérifier avant de le partager.**

Ordre des requêtes, erreurs HTTP, requêtes lentes et routes répétées, sans recopier les URL, en-têtes, cookies ni corps de la capture dans le rapport. Fonctionne localement dans votre navigateur ou votre terminal. Sans compte, clé API, backend ni paquet tiers.

[English](README.md) · [Tiếng Việt](README.vi.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [ไทย](README.th.md) · [**Français**](README.fr.md)

[Confidentialité](docs/PRIVACY.md) · [Alternatives](docs/COMPARISON.md) · [Contribuer](CONTRIBUTING.md)

**[Essayer la démo en ligne](https://hieunguyenak92.github.io/tracebrief/)**

![Tracebrief affichant une capture réseau fictive](docs/demo.jpg)

## Essayer

Nécessite **Node.js 22 ou une version ultérieure**. Depuis une copie du dépôt :

```sh
git clone https://github.com/hieunguyenak92/tracebrief.git
cd tracebrief
npm run dev
```

Ouvrez **http://localhost:4173**, chargez la démonstration fictive ou déposez un fichier `.har` sur la page. Examinez la cascade des requêtes, puis exportez un rapport. Aucune dépendance à installer.

Pour obtenir un fichier unique utilisable sans serveur :

```sh
npm run build
```

Ouvrez `dist/index.html` dans votre navigateur. Utilisez une copie locale de confiance pour les captures privées. Le HAR d'origine reste sur votre appareil : l'application ne le téléverse pas et ne le conserve pas après le rechargement de la page.

## Ce que vous obtenez

- Une cascade des requêtes, avec des filtres pour les erreurs HTTP ou réseau, les requêtes d'au moins une seconde et les requêtes répétées.
- Le nombre d'occurrences des catégories de données écartées, pour comprendre ce que l'export laisse de côté.
- Du Markdown pour une issue ou un assistant de programmation par IA, un rapport HTML autonome, des métadonnées JSON (via la CLI) et un HAR reconstruit pour les outils compatibles avec HAR 1.2.
- Le même moteur d'analyse dans le navigateur et la CLI. Les mesures inconnues restent signalées comme telles.

Une requête est considérée comme répétée lorsqu'elle reprend, après la première occurrence, la même méthode, la même origine et le même chemin. Les paramètres de requête sont ignorés pour le regroupement. Une répétition peut être voulue. Une requête lente est une observation, pas un diagnostic de sa cause.

## Ce qui est partagé

Tracebrief **construit un nouveau rapport à partir des seules métadonnées autorisées**. Il ne modifie pas le fichier d'origine en essayant de deviner quelles chaînes contiennent des secrets.

| Conservé | Omis ou remplacé |
| --- | --- |
| Ordre, début relatif, durée et temps d'attente et de réception | Les dates absolues deviennent des décalages ; les dates du HAR reconstruit partent du 1er janvier 1970 |
| Codes de statut valides, tailles en octets, méthodes standard et catégories de contenu fixes | URL, hôte, chemin, paramètres et fragment d'origine sont remplacés par des alias opaques d'origine et de route |
| Regroupement par origine et route | En-têtes, cookies, corps des requêtes et réponses et champs personnalisés sont omis |

Par exemple, une URL est exportée sous la forme `https://origin-1.invalid/route-2`. Les alias servent uniquement à relier les requêtes d'une même analyse ; ils ne désignent pas les véritables endpoints. Une option explicite de **consultation locale** permet d'afficher les URL d'origine. Elles ne sont jamais incluses dans un export.

**Vérifiez chaque fichier exporté.** Les durées, tailles, codes de statut et schémas de requêtes peuvent encore être sensibles. Tracebrief ne garantit pas l'absence de données personnelles et ne rend pas une capture anonyme. Un HAR reconstruit ne permet ni de rejouer la session ni de diagnostiquer des problèmes de contenu ou d'authentification. Consultez le [contrat de confidentialité](docs/PRIVACY.md).

## CLI

Sans serveur ni accès réseau :

```sh
node bin/tracebrief.js public/samples/demo.har --format markdown
node bin/tracebrief.js capture.har --format html --output report.html
node bin/tracebrief.js capture.har --format har --output reconstructed.har
node bin/tracebrief.js capture.har --format json --output metadata.json
```

Le format par défaut est Markdown, envoyé vers la sortie standard. Utilisez `--help` pour consulter les options. Les fichiers existants ne sont jamais écrasés : choisissez un nouveau chemin. Conservez les captures privées hors de votre copie du dépôt.

## Capturer un HAR

1. Ouvrez les outils de développement du navigateur, puis le panneau réseau, généralement nommé **Network**.
2. Reproduisez le problème, puis utilisez la commande d'export HAR du panneau.
3. Ouvrez le fichier enregistré dans une copie locale de confiance de Tracebrief.
4. Examinez le rapport et les catégories écartées. Vérifiez le fichier exporté avant de l'envoyer.

Chrome propose déjà un export HAR expurgé qui exclut certains en-têtes sensibles. Tracebrief ajoute une vue de partage volontairement limitée, qui écarte également les endpoints et corps d'origine. Une capture complète peut contenir des identifiants et des données personnelles. Consultez la [référence du panneau Network de Chrome](https://developer.chrome.com/docs/devtools/network/reference) et la [comparaison](docs/COMPARISON.md).

## Limites

- Jusqu'à **50 Mio** de JSON HAR et **20 000 entrées** par capture.
- Seules les métadonnées numériques valides et comprises dans les limites acceptées sont conservées. Les champs absents ou invalides sont signalés ou marqués comme inconnus.
- Aucune capture en direct, relecture de session, correspondance des alias entre captures ou explication automatique de la cause d'un échec.
- Supprimer les endpoints et les corps réduit les informations disponibles pour le débogage. Utilisez DevTools ou un canal privé de confiance lorsque ces détails sont nécessaires.
- La version 0.1 est une première publication. Les retours sur les combinaisons de navigateur et de système d'exploitation non encore vérifiées sont les bienvenus.

## Développement

```sh
npm test
npm run lint
npm run build
```

Organisation du code : `public/core.js` contient l'analyse et les exportateurs ; `public/app.js`, les interactions du navigateur ; et `bin/tracebrief.js`, la CLI. Les scripts de développement et de build utilisent la bibliothèque standard de Node.js.

Pour signaler un bug, fournissez une reproduction minimale avec des données **fictives**. Ne joignez jamais de HAR de production, jeton d'accès, contenu client ou endpoint privé à une issue publique. [Guide de contribution](CONTRIBUTING.md) · [Politique de sécurité](SECURITY.md).

## Licence

[MIT](LICENSE).
