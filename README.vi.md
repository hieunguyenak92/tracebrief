# Tracebrief

### Bằng chứng mạng rõ ràng cho lần trao đổi debug tiếp theo.

Biến bản ghi HAR của trình duyệt thành báo cáo ngắn gọn cho đồng nghiệp, GitHub issue hoặc trợ lý lập trình AI. Tracebrief giữ thứ tự request, lỗi, timing và quan hệ giữa các route, rồi dựng báo cáo mới bằng mã endpoint thay thế. URL gốc, header, cookie và payload được bỏ khỏi bản xuất.

**App trình duyệt cục bộ + CLI · không dependency bên thứ ba · không tài khoản hay API key · MIT**

**Ngôn ngữ:** [English](README.md) · [Tiếng Việt](README.vi.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [ไทย](README.th.md) · [Français](README.fr.md)

[Cam kết xử lý dữ liệu — tiếng Anh](docs/PRIVACY.md) · [So sánh công cụ — tiếng Anh](docs/COMPARISON.md)

**[Dùng thử demo trực tiếp](https://hieunguyenak92.github.io/tracebrief/)**

![Tracebrief với bản ghi mạng hư cấu](docs/demo.jpg)

## Dành cho lúc cần bàn giao thông tin lỗi

- **Lập trình cùng AI:** gửi bản Markdown gọn để trợ lý xem lỗi HTTP và timing. Kiểm tra nội dung trước khi gửi tới bất kỳ dịch vụ nào.
- **Debug frontend:** xem request chậm, route lặp trong waterfall cục bộ, rồi chuyển cùng bộ số liệu cho đồng nghiệp.
- **Hỗ trợ tái hiện lỗi:** gửi báo cáo HTML mở được trực tiếp, không cần người nhận cài Tracebrief. Dùng dữ liệu hư cấu khi báo lỗi công khai.

HAR là file nhật ký mạng xuất từ DevTools của trình duyệt. Bạn có thể thử ngay bản ghi giả lập đi kèm mà chưa cần file riêng.

## Dùng thử

Cần **Node.js 22 trở lên**. Trong thư mục mã nguồn:

```sh
git clone https://github.com/hieunguyenak92/tracebrief.git
cd tracebrief
npm run dev
```

Mở **http://localhost:4173**, chọn demo hư cấu hoặc kéo file `.har` vào trang. Xem waterfall, lọc request và tải báo cáo. Không cần cài dependency.

Để tạo một file mở được khi không có server:

```sh
npm run build
```

Mở `dist/index.html` bằng trình duyệt. Dùng bản cục bộ đáng tin cậy khi làm việc với bản ghi riêng tư. App không upload file HAR hoặc lưu file qua lần tải trang tiếp theo.

## Chức năng

- Waterfall và bộ lọc lỗi HTTP/lỗi mạng, request từ một giây trở lên, request lặp lại.
- Thống kê số trường bị bỏ theo từng loại dữ liệu.
- Xuất Markdown cho issue hoặc coding assistant, HTML độc lập và HAR metadata được dựng lại. CLI có thêm JSON metadata.
- Trình duyệt và CLI dùng chung logic phân tích. Dữ liệu chưa biết không bị coi là bằng không.

Request lặp lại là request sau lần đầu có cùng method, origin và path; query không được dùng để phân nhóm. Việc lặp có thể là chủ ý. Request chậm là số đo quan sát được, chưa phải kết luận nguyên nhân.

## Báo cáo giữ gì, bỏ gì?

Tracebrief **dựng báo cáo mới từ metadata được cho phép**. Công cụ không dò xem chuỗi nào có vẻ là bí mật rồi che riêng chuỗi đó.

| Giữ | Bỏ hoặc thay thế |
| --- | --- |
| Thứ tự, thời điểm tương đối, duration, thời gian chờ và nhận dữ liệu | Bỏ ngày giờ thực; HAR dựng lại neo thời gian vào 01/01/1970 |
| Status code hợp lệ, dung lượng, method chuẩn, nhóm nội dung cố định | URL, host, path, query, fragment gốc được thay bằng mã origin/route |
| Quan hệ các request dùng chung origin/route | Bỏ header, cookie, request/response body và trường tùy biến |

URL xuất ra có dạng `https://origin-1.invalid/route-2`. Mã này chỉ thể hiện quan hệ trong lần phân tích hiện tại. Bạn có thể bật hiển thị URL thật để xem **cục bộ**; URL đó không được đưa vào file xuất.

**Luôn kiểm tra file trước khi gửi.** Timing, dung lượng, status và mẫu request vẫn có thể nhạy cảm. Tracebrief không bảo đảm loại bỏ mọi dữ liệu cá nhân hoặc làm bản ghi trở nên ẩn danh. HAR dựng lại không dùng để replay; báo cáo thiếu dữ liệu để điều tra payload hoặc xác thực. Xem [giới hạn xử lý dữ liệu](docs/PRIVACY.md).

## CLI

```sh
node bin/tracebrief.js public/samples/demo.har --format markdown
node bin/tracebrief.js capture.har --format html --output report.html
node bin/tracebrief.js capture.har --format har --output reconstructed.har
node bin/tracebrief.js capture.har --format json --output metadata.json
```

Mặc định xuất Markdown ra standard output. Dùng `--help` để xem tùy chọn. Công cụ không ghi đè file output đã tồn tại; hãy chọn đường dẫn mới. Giữ bản ghi riêng tư ngoài thư mục mã nguồn.

## Tạo HAR

1. Mở developer tools và thẻ Network của trình duyệt.
2. Tái hiện vấn đề rồi dùng lệnh xuất HAR của thẻ Network.
3. Mở file bằng bản Tracebrief cục bộ đáng tin cậy.
4. Xem báo cáo, loại dữ liệu bị bỏ và file xuất trước khi chia sẻ.

Chrome đã có tùy chọn xuất HAR sanitized để bỏ một số header nhạy cảm. Tracebrief bổ sung góc nhìn giới hạn thông tin bằng cách bỏ cả endpoint và body gốc. [Tài liệu Chrome](https://developer.chrome.com/docs/devtools/network/reference) · [So sánh](docs/COMPARISON.md).

## Giới hạn

- Tối đa **50 MiB** JSON và **20.000 entry** mỗi file.
- Chỉ giữ metadata số hợp lệ trong giới hạn; trường thiếu hoặc sai được đánh dấu hoặc để chưa biết.
- Không capture trực tiếp, replay, nối mã định danh giữa nhiều bản ghi hoặc tự chẩn đoán nguyên nhân.
- Bỏ endpoint/body làm mất thông tin debug. Dùng DevTools hoặc kênh riêng đáng tin cậy khi cần thông tin đầy đủ.
- Bản 0.1 là bản đầu tiên; những tổ hợp trình duyệt/hệ điều hành ngoài phạm vi đã kiểm tra vẫn cần phản hồi thực tế.

## Phát triển

```sh
npm test
npm run lint
npm run build
```

`public/core.js` chứa phân tích và export; `public/app.js` xử lý giao diện; `bin/tracebrief.js` là CLI. Khi báo lỗi, hãy tạo ví dụ **hư cấu tối thiểu**. Không đính HAR production, token, payload khách hàng hoặc endpoint nội bộ lên issue công khai.

[Hướng dẫn đóng góp](CONTRIBUTING.md) · [Báo cáo bảo mật](SECURITY.md) · [Giấy phép MIT](LICENSE).
