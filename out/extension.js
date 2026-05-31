"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
function activate(context) {
    const provider = new ApiStressViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('apiStressStudioView', provider));
    const disposable = vscode.commands.registerCommand('apiStressStudio.open', () => {
        vscode.commands.executeCommand('workbench.view.extension.apiStressStudioView');
    });
    context.subscriptions.push(disposable);
}
class ApiStressViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlContent();
        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'runTest') {
                const params = data.params;
                await this.executeStressTest(params);
            }
        });
    }
    async executeStressTest(params) {
        var _a;
        const { url, method, total, concurrency, body } = params;
        const results = [];
        const statusCount = {};
        let success = 0;
        let failure = 0;
        const doReq = () => {
            return new Promise((resolve) => {
                const start = Date.now();
                const lib = url.startsWith('https') ? https : http;
                try {
                    const urlObj = new URL(url);
                    const options = {
                        hostname: urlObj.hostname,
                        port: urlObj.port || (url.startsWith('https') ? 443 : 80),
                        path: urlObj.pathname + urlObj.search,
                        method: method || 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 10000
                    };
                    const req = lib.request(options, (res) => {
                        const duration = Date.now() - start;
                        results.push(duration);
                        const code = String(res.statusCode);
                        statusCount[code] = (statusCount[code] || 0) + 1;
                        if (res.statusCode >= 200 && res.statusCode < 300)
                            success++;
                        else
                            failure++;
                        res.resume();
                        resolve();
                    });
                    req.on('error', () => {
                        failure++;
                        resolve();
                    });
                    req.on('timeout', () => {
                        req.destroy();
                        failure++;
                        resolve();
                    });
                    if (body && method && method.toUpperCase() !== 'GET') {
                        try {
                            req.write(body);
                        }
                        catch { /* ignore */ }
                    }
                    req.end();
                }
                catch {
                    failure++;
                    resolve();
                }
            });
        };
        // Concurrency manager: garante EXACTAMENTE 'total' requests
        await new Promise((done) => {
            let launched = 0;
            let running = 0;
            const launchMore = () => {
                while (running < concurrency && launched < total) {
                    launched++;
                    running++;
                    doReq().then(() => {
                        running--;
                        if (launched < total) {
                            launchMore();
                        }
                        else if (running === 0) {
                            done();
                        }
                    });
                }
            };
            launchMore();
        });
        results.sort((a, b) => a - b);
        const sum = results.reduce((a, b) => a + b, 0);
        const avg = results.length ? Math.round(sum / results.length) : 0;
        const min = results.length ? results[0] : 0;
        const max = results.length ? results[results.length - 1] : 0;
        const p95 = results.length ? results[Math.floor(results.length * 0.95)] : 0;
        const p99 = results.length ? results[Math.floor(results.length * 0.99)] : 0;
        (_a = this._view) === null || _a === void 0 ? void 0 : _a.webview.postMessage({
            type: 'results',
            stats: {
                total: results.length,
                success,
                failure,
                avg,
                min,
                max,
                p95,
                p99,
                statusCount,
                results
            }
        });
    }
    _getHtmlContent() {
        // CSP abre script inline para desenvolvimento; em produção rever CSP e usar nonce
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:var(--vscode-font-family);padding:14px;color:var(--vscode-foreground);background:var(--vscode-sideBar-background);font-size:13px}
    h3{margin-bottom:10px}
    label{display:block;font-size:11px;margin-top:8px;opacity:0.85}
    input,select,textarea{width:100%;padding:8px;margin-top:6px;border-radius:4px;border:1px solid var(--vscode-input-border);background:var(--vscode-input-background);color:var(--vscode-input-foreground)}
    .row{display:flex;gap:8px}
    .row>div{flex:1}
    #runBtn{margin-top:12px;padding:10px;border:none;border-radius:4px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);font-weight:600;cursor:pointer}
    #runBtn:disabled{opacity:0.5;cursor:not-allowed}
    #loading{display:none;margin-top:10px;font-style:italic;opacity:0.8}
    #results{display:none;margin-top:14px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .box{background:var(--vscode-editor-inactiveSelectionBackground);padding:10px;border-radius:6px;text-align:center}
    .val{font-size:1.2em;font-weight:700;display:block}
    .label{font-size:11px;opacity:0.8;margin-top:4px}
    .bar-row{display:flex;align-items:center;gap:6px;margin-top:6px}
    .bar-label{width:90px;text-align:right;font-size:11px;opacity:0.8}
    .bar{height:10px;background:var(--vscode-button-background);border-radius:3px}
    .bar-count{font-size:11px;opacity:0.8;margin-left:6px}
  </style>
</head>
<body>
  <h3>⚡ API Stress Studio</h3>

  <label>Target URL</label>
  <input id="url" type="text" value="https://jsonplaceholder.typicode.com/posts" />

  <label>Method</label>
  <select id="method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select>

  <div class="row">
    <div>
      <label>Total Requests</label>
      <input id="total" type="number" value="20" min="1" />
    </div>
    <div>
      <label>Concurrency</label>
      <input id="concurrency" type="number" value="5" min="1" />
    </div>
  </div>

  <label>Body (JSON, optional)</label>
  <textarea id="body" placeholder='{"key":"value"}'></textarea>

  <button id="runBtn">▶ START STRESS TEST</button>
  <div id="loading">⏳ Testing in progress...</div>

  <div id="results">
    <div class="grid" style="margin-top:10px">
      <div class="box"><span class="val" id="r-total">-</span><span class="label">Total Sent</span></div>
      <div class="box"><span class="val" id="r-success">-</span><span class="label">Success</span></div>
      <div class="box"><span class="val" id="r-failure">-</span><span class="label">Failed</span></div>
      <div class="box"><span class="val" id="r-avg">-</span><span class="label">Avg (ms)</span></div>
    </div>

    <div style="margin-top:12px">
      <div id="statusCodes"></div>
      <div id="bar-chart"></div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const btn = document.getElementById('runBtn');
    const loading = document.getElementById('loading');

    btn.addEventListener('click', () => {
      const url = document.getElementById('url').value.trim();
      if (!url) { alert('Please enter a URL'); return; }

      btn.disabled = true;
      loading.style.display = 'block';
      document.getElementById('results').style.display = 'none';

      vscode.postMessage({
        type: 'runTest',
        params: {
          url,
          method: document.getElementById('method').value,
          total: parseInt(document.getElementById('total').value, 10),
          concurrency: parseInt(document.getElementById('concurrency').value, 10),
          body: document.getElementById('body').value
        }
      });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'results') {
        const s = msg.stats;
        btn.disabled = false;
        loading.style.display = 'none';
        document.getElementById('results').style.display = 'block';

        document.getElementById('r-total').textContent = s.total;
        document.getElementById('r-success').textContent = s.success;
        document.getElementById('r-failure').textContent = s.failure;
        document.getElementById('r-avg').textContent = s.avg;

        // Status codes
        const scHtml = Object.entries(s.statusCount || {}).map(([k, v]) => {
          return '<span style="margin-right:10px"><b>' + k + '</b>: ' + v + 'x</span>';
        }).join('');
        document.getElementById('statusCodes').innerHTML = scHtml;

        // Bar chart
        if (s.results && s.results.length) {
          const maxVal = Math.max(...s.results);
          const buckets = 8;
          const bucketSize = Math.max(1, Math.ceil(maxVal / buckets));
          const counts = Array.from({length: buckets}, () => 0);
          s.results.forEach(r => {
            const i = Math.min(Math.floor(r / bucketSize), buckets - 1);
            counts[i]++;
          });
          const maxCount = Math.max(...counts);
          const html = counts.map((c, i) => {
            const w = maxCount ? Math.round((c / maxCount) * 140) : 0;
            return '<div class="bar-row"><span class="bar-label">' + (i*bucketSize) + '-' + ((i+1)*bucketSize) + 'ms</span>' +
              '<div class="bar" style="width:' + w + 'px"></div>' +
              '<span class="bar-count">' + c + '</span></div>';
          }).join('');
          document.getElementById('bar-chart').innerHTML = html;
        }
      }
    });
  </script>
</body>
</html>`;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map