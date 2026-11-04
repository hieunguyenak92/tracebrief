# Tracebrief

**HAR 캡처를 공유 전에 검토할 수 있는 네트워크 보고서로 만드세요.**

요청 순서, HTTP 오류, 느린 요청, 반복되는 경로를 확인하세요. 캡처의 원본 URL, 헤더, 쿠키, 페이로드는 보고서에 복사되지 않습니다. 브라우저나 터미널에서 로컬로 실행되며 계정, API 키, 백엔드, 외부 패키지가 필요하지 않습니다.

[English](README.md) · [Tiếng Việt](README.vi.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [ไทย](README.th.md) · [Français](README.fr.md)

[개인정보 처리 범위](docs/PRIVACY.md) · [대안 비교](docs/COMPARISON.md) · [기여 안내](CONTRIBUTING.md)

![가상의 네트워크 캡처를 표시하는 Tracebrief](docs/demo.jpg)

## 시작하기

**Node.js 22 이상**이 필요합니다. 저장소를 내려받은 디렉터리에서 실행하세요.

```sh
npm run dev
```

[http://localhost:4173](http://localhost:4173)을 열고 가상 데모를 선택하거나 `.har` 파일을 페이지에 놓으세요. 워터폴을 확인한 뒤 보고서를 내보낼 수 있습니다. 별도로 설치할 의존성은 없습니다.

서버 없이 열 수 있는 단일 HTML 파일을 만들려면 다음을 실행하세요.

```sh
npm run build
```

브라우저에서 `dist/index.html`을 여세요. 비공개 캡처를 다룰 때는 신뢰할 수 있는 로컬 사본을 사용하세요. 원본 HAR는 기기에 남으며 앱은 파일을 업로드하거나 페이지를 다시 불러온 뒤에도 유지되도록 저장하지 않습니다.

## 제공하는 기능

- HTTP·네트워크 오류, 1초 이상 걸린 요청, 반복 요청으로 필터링할 수 있는 요청 워터폴.
- 내보내기에서 제외하는 데이터 범주별 개수.
- 이슈나 AI 코딩 도우미에 사용할 Markdown, 독립적으로 열 수 있는 HTML 보고서, HAR 1.2 지원 도구를 위한 재구성 HAR. CLI는 JSON 메타데이터도 지원합니다.
- 브라우저와 CLI가 공유하는 분석 코어. 알 수 없는 측정값을 임의로 채우지 않습니다.

‘반복’은 같은 메서드·오리진·경로가 처음 등장한 이후 다시 나타나는 요청을 뜻합니다. 그룹화할 때 쿼리 문자열은 무시합니다. 반복 요청은 의도된 동작일 수 있습니다. 느린 요청이라는 관찰만으로 근본 원인을 진단할 수는 없습니다.

## 공유되는 정보

Tracebrief는 **허용된 메타데이터로 새 보고서를 만듭니다**. 원본 파일을 수정하면서 어떤 문자열이 비밀인지 추측하는 방식이 아닙니다.

| 유지하는 정보 | 제외하거나 바꾸는 정보 |
| --- | --- |
| 요청 순서, 상대 시작 시점, 소요·대기·수신 시간 | 절대 시각은 상대 오프셋으로 바뀌며, 재구성 HAR의 날짜는 1970-01-01을 기준으로 합니다 |
| 유효한 상태 코드, 바이트 크기, 표준 메서드, 고정된 콘텐츠 분류 | 원본 URL·호스트·경로·쿼리·프래그먼트는 실제 이름을 드러내지 않는 오리진·경로 별칭으로 대체합니다 |
| 오리진과 경로에 따른 그룹화 | 헤더, 쿠키, 요청·응답 본문, 사용자 정의 필드는 제외합니다 |

예를 들어 URL은 `https://origin-1.invalid/route-2`로 내보냅니다. 별칭은 해당 분석 안에서 요청 간 관계를 나타낼 뿐, 실제 엔드포인트 이름이 아닙니다. 원본 URL은 사용자가 명시적으로 **로컬 보기**를 켠 경우에만 표시할 수 있으며 내보내기에는 포함되지 않습니다.

**모든 내보내기 결과를 검토하세요.** 시간, 크기, 상태 코드, 요청 패턴도 민감한 정보일 수 있습니다. Tracebrief는 개인정보가 없음을 보장하거나 캡처의 익명성을 보장하지 않습니다. 재구성 HAR로 세션을 재현하거나 페이로드·인증 문제를 진단할 수는 없습니다. 자세한 내용은 [개인정보 처리 범위](docs/PRIVACY.md)를 참고하세요.

## CLI

서버나 네트워크 접속 없이 실행합니다.

```sh
node bin/tracebrief.js public/samples/demo.har --format markdown
node bin/tracebrief.js capture.har --format html --output report.html
node bin/tracebrief.js capture.har --format har --output reconstructed.har
node bin/tracebrief.js capture.har --format json --output metadata.json
```

기본 형식은 Markdown이며 표준 출력으로 내보냅니다. 옵션은 `--help`로 확인하세요. 기존 출력 파일은 덮어쓰지 않으므로 새 경로를 선택하세요. 비공개 캡처는 저장소 디렉터리 밖에 보관하세요.

## HAR 캡처하기

1. 브라우저 개발자 도구에서 Network 패널을 여세요.
2. 문제를 재현한 뒤 패널의 HAR 내보내기 명령을 사용하세요.
3. 저장한 캡처를 신뢰할 수 있는 로컬 Tracebrief 사본에서 여세요.
4. 보고서와 제외된 항목을 확인하고, 다른 사람에게 보내기 전에 내보낸 파일을 검토하세요.

Chrome에도 일부 민감한 헤더를 제외하는 HAR 내보내기 기능이 있습니다. Tracebrief는 원본 엔드포인트와 본문까지 제외하여 공유 범위를 더 좁힙니다. 전체 캡처에는 인증 정보와 개인정보가 들어 있을 수 있습니다. [Chrome Network 문서](https://developer.chrome.com/docs/devtools/network/reference)와 [대안 비교](docs/COMPARISON.md)를 참고하세요.

## 제한 사항

- 캡처당 HAR JSON **50 MiB**, 항목 **20,000개**까지 지원합니다.
- 유효하고 정해진 범위 안에 있는 숫자 메타데이터만 유지합니다. 누락되거나 잘못된 필드는 안내하거나 알 수 없는 값으로 표시합니다.
- 실시간 캡처, 재현, 서로 다른 캡처 간 별칭 매핑, 요청 실패 이유의 자동 설명은 지원하지 않습니다.
- 엔드포인트와 본문을 제외하면 디버깅 정보도 줄어듭니다. 그 정보가 필요하면 DevTools나 신뢰할 수 있는 비공개 디버깅 채널을 사용하세요.
- 버전 0.1은 초기 릴리스입니다. 기록된 검증 범위를 벗어나는 브라우저·운영체제 조합에 대한 피드백이 필요합니다.

## 개발

```sh
npm test
npm run lint
npm run build
```

`public/core.js`는 분석과 내보내기, `public/app.js`는 브라우저 상호작용, `bin/tracebrief.js`는 CLI를 담당합니다. 빌드와 개발 스크립트는 Node 표준 라이브러리를 사용합니다.

버그를 제보할 때는 최소한의 **가상 데이터**로 재현해 주세요. 실제 서비스의 HAR, 액세스 토큰, 고객 페이로드, 비공개 엔드포인트를 공개 이슈에 첨부하지 마세요. [기여 안내](CONTRIBUTING.md) · [보안 정책](SECURITY.md).

## 라이선스

[MIT](LICENSE).
