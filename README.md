# API Stress Studio

> A powerful API stress testing and performance profiler tool built directly into VS Code.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.74.0-007ACC?logo=visual-studio-code)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What is API Stress Studio?

**API Stress Studio** lets you stress test and measure response times of any API endpoint without leaving VS Code. No external tools, no browser tabs — everything runs inside a dedicated panel in your editor.

---

## Features

- **Stress Testing** — Fire multiple concurrent requests to any API endpoint and observe how it handles load
- **Response Time Profiling** — Measure latency on demand, per request and in aggregate
- **On-Demand Testing** — Run tests instantly whenever you need, directly from the VS Code sidebar
- **Built-in Webview UI** — Clean, integrated interface in the Activity Bar — no external apps needed

---

## Getting Started

### 1. Open the panel

Click the **API Stress Studio** icon in the Activity Bar (left sidebar), or run:

```
Ctrl+P → API Stress Studio: Open
```

### 2. Configure your request

- Enter the target **URL**
- Select the **HTTP method**
- Set the **number of requests** and **concurrency level**

### 3. Run & analyze

Hit **Run** and watch response times, success rates, and performance metrics update in real time.

---

## Requirements

- VS Code `^1.74.0`
- Internet access to reach the target API

---

## Extension Settings

No configuration required — everything is handled through the UI panel.

---

## Roadmap

- [ ] Export results to JSON/CSV
- [ ] Custom headers and authentication support
- [ ] Historical test comparison
- [ ] Save and reuse test configurations

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Publisher

**Tomascody-web333** · [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Tomascody-web333.api-stress-studio)
