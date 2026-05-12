const STORAGE_KEY = 'apikey_manager_data';
const THEME_KEY = 'apikey_manager_theme';
let editingId = null;
let logViewingId = null;
let testChatEntryId = null;

const PRESETS = [
    { name: 'OpenAI', url: 'https://api.openai.com' },
    { name: 'DeepSeek', url: 'https://api.deepseek.com' },
    { name: 'Anthropic Claude', url: 'https://api.anthropic.com' },
    { name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com' },
    { name: 'Moonshot (Kimi)', url: 'https://api.moonshot.cn' },
    { name: 'ZhiPu GLM', url: 'https://open.bigmodel.cn/api/paas/v4' },
    { name: 'Alibaba Tongyi', url: 'https://dashscope.aliyuncs.com' },
    { name: 'Baidu Qianfan', url: 'https://aip.baidubce.com' },
    { name: 'ByteDance ARK', url: 'https://ark.cn-beijing.volces.com' },
    { name: 'xAI Grok', url: 'https://api.x.ai' },
    { name: 'Perplexity', url: 'https://api.perplexity.ai' },
    { name: 'Groq', url: 'https://api.groq.com/openai' },
    { name: 'Together AI', url: 'https://api.together.xyz' },
    { name: 'Fireworks AI', url: 'https://api.fireworks.ai' },
    { name: 'Mistral AI', url: 'https://api.mistral.ai' },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api' },
    { name: 'SiliconFlow', url: 'https://api.siliconflow.cn' },
];

function getData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && parsed.v) {
                localStorage.removeItem(STORAGE_KEY);
                return [];
            }
        } catch {}
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + '分钟前';
    if (mins < 1440) return Math.floor(mins / 60) + '小时前';
    return formatTime(ts);
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

async function copyText(text, label) {
    try {
        await navigator.clipboard.writeText(text);
        showToast((label || '已复制') + ' ✓', 'success');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        showToast((label || '已复制') + ' ✓', 'success');
    }
}

function maskKey(key) {
    if (!key) return '';
    if (key.length <= 8) return key.slice(0, 4) + '****';
    return key.slice(0, 6) + '****' + key.slice(-4);
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(t) {
    localStorage.setItem(THEME_KEY, t);
    document.body.className = t + '-theme';
    const moon = document.querySelector('.moon-icon');
    const sun = document.querySelector('.sun-icon');
    if (moon) moon.style.display = t === 'dark' ? 'none' : 'block';
    if (sun) sun.style.display = t === 'dark' ? 'block' : 'none';
}

function toggleTheme() {
    const current = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
}

function isPywebview() {
    return typeof pywebview !== 'undefined' && pywebview !== null && pywebview.api;
}


function renderCards() {
    const data = getData();
    const grid = document.getElementById('cardsGrid');
    const empty = document.getElementById('emptyState');
    const searchTerm = (document.getElementById('globalSearch').value || '').toLowerCase().trim();

    let filtered = data;
    if (searchTerm) {
        filtered = data.filter(e =>
            (e.name || '').toLowerCase().includes(searchTerm) ||
            (e.baseUrl || '').toLowerCase().includes(searchTerm) ||
            (e.models || []).some(m => m.toLowerCase().includes(searchTerm)) ||
            (e.apiKey || '').toLowerCase().includes(searchTerm)
        );
    }

    document.getElementById('totalCount').textContent = data.length;
    document.getElementById('modelCount').textContent = data.reduce((s, e) => s + (e.models ? e.models.length : 0), 0);

    if (data.length === 0) {
        empty.style.display = 'flex';
        grid.querySelectorAll('.api-card').forEach(el => el.remove());
        return;
    }
    empty.style.display = 'none';

    grid.querySelectorAll('.api-card').forEach(el => {
        if (!filtered.some(e => e.id === el.dataset.id)) el.remove();
    });

    filtered.forEach(entry => {
        let card = grid.querySelector(`.api-card[data-id="${entry.id}"]`);
        if (card) { updateCardElement(card, entry); }
        else { card = createCardElement(entry); grid.appendChild(card); }
    });
}

function createCardElement(entry) {
    const card = document.createElement('div');
    card.className = 'api-card';
    card.dataset.id = entry.id;
    updateCardElement(card, entry);
    return card;
}

function updateCardElement(card, entry) {
    const models = entry.models || [];
    const logs = entry.logs || [];
    const modelTags = models.length
        ? models.map(m => `<span class="model-tag" onclick="copyText('${escapeHtml(m)}', '模型名已复制')" title="点击复制 ${escapeHtml(m)}">${escapeHtml(m)}</span>`).join('')
        : '<span class="field-value" style="color:var(--text-muted);font-size:12px">未配置模型</span>';
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

    card.innerHTML = [
        '<div class="card-header">',
            '<div class="card-title">',
                '<span>' + escapeHtml(entry.name) + '</span>',
                '<button class="edit-btn" onclick="editEntry(\'' + entry.id + '\')" title="编辑">',
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
                '</button>',
            '</div>',
            '<span class="card-time">' + timeAgo(entry.createdAt) + '</span>',
        '</div>',
        '<div class="card-body">',
            '<div class="field-row">',
                '<span class="field-label">基础 URL</span>',
                '<div class="field-value">',
                    '<span class="key-value">' + escapeHtml(entry.baseUrl || '-') + '</span>',
                    '<button class="copy-btn" onclick="copyText(\'' + escapeHtml(entry.baseUrl || '') + '\', \'URL 已复制\')" title="复制 URL">',
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
                    '</button>',
                '</div>',
            '</div>',
            '<div class="field-row">',
                '<span class="field-label">API 密钥</span>',
                '<div class="field-value">',
                    '<span class="key-value">' + maskKey(entry.apiKey || '') + '</span>',
                    '<button class="copy-btn" onclick="copyText(\'' + escapeHtml(entry.apiKey || '') + '\', \'API Key 已复制\')" title="复制 API Key">',
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
                    '</button>',
                '</div>',
            '</div>',
            '<div class="field-row">',
                '<span class="field-label">模型列表 <span style="font-weight:400;color:var(--text-muted)">(点击单个模型名复制)</span></span>',
                '<div class="field-value">',
                    '<span class="models-list" style="flex:1">' + modelTags + '</span>',
                '</div>',
            '</div>',
        '</div>',
        '<div class="card-actions">',
            '<button class="btn btn-sm" onclick="editEntry(\'' + entry.id + '\')" title="编辑"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 编辑</button>',
            '<button class="btn btn-sm btn-success" onclick="testModelsForEntry(\'' + entry.id + '\')" title="测试连接并导入模型"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> 测试模型</button>',
            (models.length ? '<button class="btn btn-sm btn-warning" onclick="showTestChatModal(\'' + entry.id + '\')" title="发送对话测试模型"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> 测试对话</button>' : ''),
            '<button class="btn btn-sm" onclick="showLogModal(\'' + entry.id + '\')" title="操作日志"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> 日志' + (logs.length ? ' (' + logs.length + ')' : '') + '</button>',
            '<button class="btn btn-sm btn-danger" onclick="deleteEntry(\'' + entry.id + '\')" title="删除"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> 删除</button>',
        '</div>',
        (lastLog ? '<div style="margin-top:6px;display:flex;justify-content:flex-end"><span style="font-size:11px;color:var(--text-muted)">最近: ' + timeAgo(lastLog.timestamp) + '</span></div>' : '')
    ].join('');
}

function showAddDialog() {
    editingId = null;
    document.getElementById('modalTitle').textContent = '新增 API Key';
    document.getElementById('saveBtn').textContent = '保存';
    document.getElementById('editName').value = '';
    document.getElementById('editBaseUrl').value = '';
    document.getElementById('editApiKey').value = '';
    document.getElementById('testResult').textContent = '';
    document.getElementById('testResult').className = 'test-result';
    document.getElementById('modelsTagsEdit').innerHTML = '';
    document.getElementById('modelsTagsEdit').dataset.models = '[]';
    document.getElementById('presetSelect').value = '';
    document.getElementById('modalOverlay').classList.add('active');
}

function editEntry(id) {
    const data = getData();
    const entry = data.find(e => e.id === id);
    if (!entry) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = '编辑 API Key';
    document.getElementById('saveBtn').textContent = '更新';
    document.getElementById('editName').value = entry.name || '';
    document.getElementById('editBaseUrl').value = entry.baseUrl || '';
    document.getElementById('editApiKey').value = entry.apiKey || '';
    document.getElementById('testResult').textContent = '';
    document.getElementById('testResult').className = 'test-result';
    renderEditModels(entry.models || []);
    document.getElementById('presetSelect').value = '';
    document.getElementById('modalOverlay').classList.add('active');
}

function initPresets() {
    const sel = document.getElementById('presetSelect');
    if (!sel) return;
    PRESETS.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.name;
        sel.appendChild(opt);
    });
}

function applyPreset() {
    const sel = document.getElementById('presetSelect');
    const idx = parseInt(sel.value);
    if (isNaN(idx)) return;
    const preset = PRESETS[idx];
    if (!preset) return;
    document.getElementById('editName').value = preset.name;
    document.getElementById('editBaseUrl').value = preset.url;
}

function renderEditModels(models) {
    const container = document.getElementById('modelsTagsEdit');
    container.dataset.models = JSON.stringify(models);
    if (models.length === 0) {
        container.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">暂无模型</span>';
        return;
    }
    container.innerHTML = models.map((m, i) =>
        '<span class="model-tag">' + escapeHtml(m) + '<button class="remove-model" onclick="removeEditModel(' + i + ')" title="移除">×</button></span>'
    ).join('');
}

function addEditModel() {
    const input = document.getElementById('editModelInput');
    const val = input.value.trim();
    if (!val) return;
    const models = JSON.parse(document.getElementById('modelsTagsEdit').dataset.models || '[]');
    if (models.includes(val)) { showToast('模型已存在', 'warning'); return; }
    models.push(val);
    renderEditModels(models);
    input.value = '';
    input.focus();
}

function removeEditModel(index) {
    const models = JSON.parse(document.getElementById('modelsTagsEdit').dataset.models || '[]');
    models.splice(index, 1);
    renderEditModels(models);
}

function getEditModels() {
    try { return JSON.parse(document.getElementById('modelsTagsEdit').dataset.models || '[]'); }
    catch { return []; }
}

function hideModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function saveEntry() {
    const name = document.getElementById('editName').value.trim();
    const baseUrl = document.getElementById('editBaseUrl').value.trim();
    const apiKey = document.getElementById('editApiKey').value.trim();
    const models = getEditModels();
    if (!name) { showToast('请输入显示名称', 'error'); return; }
    if (!baseUrl) { showToast('请输入基础 URL', 'error'); return; }
    if (!apiKey) { showToast('请输入 API 密钥', 'error'); return; }
    let data = getData();
    if (editingId) {
        const idx = data.findIndex(e => e.id === editingId);
        if (idx !== -1) {
            data[idx].name = name; data[idx].baseUrl = baseUrl; data[idx].apiKey = apiKey;
            data[idx].models = models; data[idx].updatedAt = new Date().toISOString();
        }
    } else {
        data.push({ id: generateId(), name, baseUrl, apiKey, models, logs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    saveData(data);
    hideModal();
    renderCards();
    showToast(editingId ? '已更新' : '已添加', 'success');
}

function deleteEntry(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    let data = getData();
    data = data.filter(e => e.id !== id);
    saveData(data);
    renderCards();
    showToast('已删除', 'success');
}

async function testModelsForEntry(id) {
    const data = getData();
    const entry = data.find(e => e.id === id);
    if (!entry) return;
    try { await testConnection(entry.baseUrl, entry.apiKey, entry.id); }
    catch (e) { showToast('测试失败: ' + e.message, 'error'); }
}

async function testAndImportModels() {
    const baseUrl = document.getElementById('editBaseUrl').value.trim();
    const apiKey = document.getElementById('editApiKey').value.trim();
    const resultEl = document.getElementById('testResult');
    if (!baseUrl || !apiKey) {
        resultEl.textContent = '请先填写 URL 和 API Key';
        resultEl.className = 'test-result error'; return;
    }
    const btn = document.getElementById('testModelsBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 测试中...';
    resultEl.textContent = ''; resultEl.className = 'test-result';
    try {
        const models = await doTestConnection(baseUrl, apiKey);
        const existing = getEditModels();
        const merged = [...new Set([...existing, ...models])];
        renderEditModels(merged);
        resultEl.textContent = '成功导入 ' + models.length + ' 个模型';
        resultEl.className = 'test-result success';
        showToast('测试成功，导入 ' + models.length + ' 个模型', 'success');
    } catch (e) {
        resultEl.textContent = '测试失败: ' + e.message;
        resultEl.className = 'test-result error';
        showToast('测试失败: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> 测试连接并导入模型';
    }
}

async function doTestConnection(baseUrl, apiKey) {
    const url = baseUrl.replace(/\/+$/, '') + '/v1/models';
    const resp = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
    const json = await resp.json();
    const models = (json.data || []).map(m => m.id || m).filter(Boolean);
    if (models.length === 0) throw new Error('未找到模型');
    return models;
}

async function testConnection(baseUrl, apiKey, entryId) {
    const btn = document.querySelector('.api-card[data-id="' + entryId + '"] .btn-success');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 测试中'; }
    try {
        const models = await doTestConnection(baseUrl, apiKey);
        let data = getData();
        const entry = data.find(e => e.id === entryId);
        if (entry) {
            entry.models = [...new Set([...(entry.models || []), ...models])];
            if (!entry.logs) entry.logs = [];
            entry.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'test', detail: '测试成功，导入 ' + models.length + ' 个模型: ' + models.join(', '), status: 'success' });
            saveData(data); renderCards(); showToast('测试成功，导入 ' + models.length + ' 个模型', 'success');
        }
    } catch (e) {
        let data = getData();
        const entry = data.find(e => e.id === entryId);
        if (entry) {
            if (!entry.logs) entry.logs = [];
            entry.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'test', detail: '测试失败: ' + e.message, status: 'error' });
            saveData(data); renderCards();
        }
        showToast('测试失败: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> 测试模型'; }
    }
}

function showLogModal(id) {
    logViewingId = id;
    const data = getData();
    const entry = data.find(e => e.id === id);
    if (!entry) return;
    document.getElementById('logModalTitle').textContent = '操作日志 - ' + (entry.name || '');
    renderLogs(entry.logs || []);
    document.getElementById('logModalOverlay').classList.add('active');
}

function hideLogModal() {
    document.getElementById('logModalOverlay').classList.remove('active');
    logViewingId = null;
}

function renderLogs(logs) {
    const list = document.getElementById('logList');
    if (!list) return;
    if (logs.length === 0) { list.innerHTML = '<div class="empty-state small"><p>暂无日志</p></div>'; return; }
    const icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    list.innerHTML = [...logs].reverse().map(log =>
        '<div class="log-entry">' +
            '<div class="log-icon">' + (icons[log.status] || icons.info) + '</div>' +
            '<div class="log-content">' +
                '<div class="log-text">' + escapeHtml(log.detail || log.action || '') + '</div>' +
                '<div class="log-time">' + formatTime(log.timestamp) + '</div>' +
            '</div>' +
            '<button class="log-del" onclick="deleteLog(\'' + log.id + '\')" title="删除此日志">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
        '</div>'
    ).join('');
}

function deleteLog(logId) {
    if (!logViewingId) return;
    let data = getData();
    const entry = data.find(e => e.id === logViewingId);
    if (!entry) return;
    entry.logs = (entry.logs || []).filter(l => l.id !== logId);
    saveData(data);
    renderLogs(entry.logs);
    renderCards();
}

function clearLogs() {
    if (!logViewingId) return;
    if (!confirm('确定清空所有日志？')) return;
    let data = getData();
    const entry = data.find(e => e.id === logViewingId);
    if (!entry) return;
    entry.logs = [];
    saveData(data);
    renderLogs([]);
    renderCards();
}

function addLogEntry() {
    if (!logViewingId) return;
    document.getElementById('logContentInput').value = '';
    document.getElementById('logStatusInput').value = 'info';
    document.getElementById('addLogModalOverlay').classList.add('active');
}

function hideAddLogModal() { document.getElementById('addLogModalOverlay').classList.remove('active'); }

function confirmAddLog() {
    if (!logViewingId) return;
    const content = document.getElementById('logContentInput').value.trim();
    const status = document.getElementById('logStatusInput').value;
    if (!content) { showToast('请输入日志内容', 'error'); return; }
    let data = getData();
    const entry = data.find(e => e.id === logViewingId);
    if (!entry) return;
    if (!entry.logs) entry.logs = [];
    entry.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'manual', detail: content, status: status });
    saveData(data);
    renderLogs(entry.logs);
    renderCards();
    hideAddLogModal();
    showToast('日志已添加', 'success');
}


function toggleKeyVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '隐藏'; }
    else { input.type = 'password'; btn.textContent = '显示'; }
}

function showTestChatModal(id) {
    testChatEntryId = id;
    const data = getData();
    const entry = data.find(e => e.id === id);
    if (!entry || !entry.models || entry.models.length === 0) return;
    const sel = document.getElementById('testModelSelect');
    sel.innerHTML = entry.models.map(m => '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>').join('');
    document.getElementById('testPromptInput').value = '用中文回复：Hello, who are you?';
    document.getElementById('testChatResult').innerHTML = '<div class="empty-state small" style="padding:20px">点击"发送测试"开始</div>';
    document.getElementById('testChatModalOverlay').classList.add('active');
}

function hideTestChatModal() {
    document.getElementById('testChatModalOverlay').classList.remove('active');
    testChatEntryId = null;
}

async function runModelTest() {
    const id = testChatEntryId;
    if (!id) return;
    const data = getData();
    const entry = data.find(e => e.id === id);
    if (!entry) return;
    const model = document.getElementById('testModelSelect').value;
    const prompt = document.getElementById('testPromptInput').value.trim() || 'Hello';
    const resultDiv = document.getElementById('testChatResult');
    const btn = document.getElementById('runTestBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 测试中...';
    resultDiv.innerHTML = '<div class="test-msg test-msg-user"><div class="msg-label">请求</div><div class="msg-content">' + escapeHtml(prompt) + '</div></div>';
    try {
        const baseUrl = entry.baseUrl.replace(/\/+$/, '');
        const resp = await fetch(baseUrl + '/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + entry.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 200 })
        });
        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            throw new Error('HTTP ' + resp.status + ': ' + (errText || resp.statusText));
        }
        const json = await resp.json();
        const reply = json.choices && json.choices[0] && json.choices[0].message
            ? json.choices[0].message.content : JSON.stringify(json);
        if (!entry.logs) entry.logs = [];
        entry.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'chat_test', detail: '模型 ' + model + ' 对话测试成功', status: 'success' });
        saveData(data);
        renderCards();
        resultDiv.innerHTML += '<div class="test-msg test-msg-assistant"><div class="msg-label">响应</div><div class="msg-content">' + escapeHtml(reply) + '</div></div>';
        showToast('模型测试成功 ✓', 'success');
    } catch (e) {
        let d = getData();
        const en = d.find(x => x.id === id);
        if (en) {
            if (!en.logs) en.logs = [];
            en.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'chat_test', detail: '模型 ' + model + ' 对话测试失败: ' + e.message, status: 'error' });
            saveData(d);
            renderCards();
        }
        resultDiv.innerHTML += '<div class="test-msg test-msg-error"><div class="msg-label">错误</div><div class="msg-content">' + escapeHtml(e.message) + '</div></div>';
        showToast('测试失败: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> 发送测试';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTheme(getTheme());
    initPresets();
    renderCards();

    var el = document.getElementById('globalSearch');
    if (el) el.addEventListener('input', renderCards);

    var modelInput = document.getElementById('editModelInput');
    if (modelInput) {
        modelInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); addEditModel(); }
        });
    }

    var overlays = ['modalOverlay', 'logModalOverlay', 'addLogModalOverlay', 'testChatModalOverlay'];
    overlays.forEach(function(id) {
        var o = document.getElementById(id);
        if (o) {
            o.addEventListener('click', function(e) {
                if (e.target === e.currentTarget) {
                    if (id === 'modalOverlay') hideModal();
                    else if (id === 'logModalOverlay') hideLogModal();
                    else if (id === 'addLogModalOverlay') hideAddLogModal();
                    else if (id === 'testChatModalOverlay') hideTestChatModal();
                }
            });
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideModal(); hideLogModal(); hideAddLogModal(); hideTestChatModal();
        }
    });

    var bar = document.getElementById('appBar');
    if (bar) initTitleBarDrag();
});

var dragState = null;

function initTitleBarDrag() {
    var bar = document.getElementById('appBar');
    if (!bar) return;
    bar.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.search-box') || e.target.closest('.icon-btn')) return;
        if (isPywebview() && pywebview.api && pywebview.api.drag_win) {
            dragState = { lastX: e.screenX, lastY: e.screenY };
            e.preventDefault();
        }
    });
    document.addEventListener('mousemove', function(e) {
        if (!dragState) return;
        var dx = e.screenX - dragState.lastX;
        var dy = e.screenY - dragState.lastY;
        if (dx === 0 && dy === 0) return;
        dragState.lastX = e.screenX;
        dragState.lastY = e.screenY;
        if (isPywebview() && pywebview.api && pywebview.api.drag_win) {
            pywebview.api.drag_win(dx, dy);
        }
    });
    document.addEventListener('mouseup', function() {
        dragState = null;
    });
}
