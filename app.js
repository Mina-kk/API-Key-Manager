const STORAGE_KEY = 'apikey_manager_data';
const THEME_KEY = 'apikey_manager_theme';
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:8765' : '';
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

let _dataCache = null;

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function timeAgo(ts) {
    if (!ts) return '';
    var diff = Date.now() - new Date(ts).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + '分钟前';
    if (mins < 1440) return Math.floor(mins / 60) + '小时前';
    return formatTime(ts);
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function maskKey(key) {
    if (!key) return '';
    if (key.length <= 8) return key.slice(0, 4) + '****';
    return key.slice(0, 6) + '****' + key.slice(-4);
}

function showToast(msg, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.innerHTML = '<span>' + (icons[type] || 'ℹ') + '</span><span>' + msg + '</span>';
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2600);
}

function copyText(text, label) {
    try {
        navigator.clipboard.writeText(text).then(function() {
            showToast((label || '已复制') + ' ✓', 'success');
        }).catch(function() {
            fallbackCopy(text, label);
        });
    } catch (e) {
        fallbackCopy(text, label);
    }
}

function fallbackCopy(text, label) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast((label || '已复制') + ' ✓', 'success');
}

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(t) {
    localStorage.setItem(THEME_KEY, t);
    document.body.className = t + '-theme';
    var moon = document.querySelector('.moon-icon');
    var sun = document.querySelector('.sun-icon');
    if (moon) moon.style.display = t === 'dark' ? 'none' : 'block';
    if (sun) sun.style.display = t === 'dark' ? 'block' : 'none';
}

function toggleTheme() {
    var current = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
}

function isPywebview() {
    return typeof pywebview !== 'undefined' && pywebview !== null && pywebview.api;
}

function minimizeWindow() {
    if (isPywebview() && pywebview.api.minimize) pywebview.api.minimize();
}
function maximizeWindow() {
    if (isPywebview() && pywebview.api.maximize) pywebview.api.maximize();
}
function closeWindow() {
    if (isPywebview() && pywebview.api.close) pywebview.api.close();
    else window.close();
}

function getData() {
    return _getCachedData();
}

function saveData(data) {
    _dataCache = data;
    var json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
    try {
        fetch(API_BASE + '/api/persist-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: json })
        }).catch(function() {});
    } catch (e) {}
}

function _getCachedData() {
    if (_dataCache) return _dataCache;
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                _dataCache = parsed;
                return parsed;
            }
            if (parsed && parsed.v) localStorage.removeItem(STORAGE_KEY);
        }
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
    }
    _dataCache = [];
    return _dataCache;
}

async function _loadPersisted() {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, 3000);
    try {
        var r = await fetch(API_BASE + '/api/load-persisted-data', { method: 'POST', signal: ctrl.signal });
        clearTimeout(timer);
        var d = await r.json();
        if (d.ok && d.data) {
            var parsed = JSON.parse(d.data);
            if (Array.isArray(parsed)) {
                _dataCache = parsed;
                localStorage.setItem(STORAGE_KEY, d.data);
                return true;
            }
        }
    } catch (e) {
        if (timer) clearTimeout(timer);
    }
    return false;
}

function renderCards() {
    var data = getData();
    var grid = document.getElementById('cardsGrid');
    var empty = document.getElementById('emptyState');
    if (!grid) return;
    var searchTerm = (document.getElementById('globalSearch').value || '').toLowerCase().trim();
    var filtered = data;
    if (searchTerm) {
        filtered = data.filter(function(e) {
            return (e.name || '').toLowerCase().includes(searchTerm) ||
                (e.baseUrl || '').toLowerCase().includes(searchTerm) ||
                (e.models || []).some(function(m) { return m.toLowerCase().includes(searchTerm); }) ||
                (e.apiKey || '').toLowerCase().includes(searchTerm);
        });
    }
    var totalEl = document.getElementById('totalCount');
    var modelEl = document.getElementById('modelCount');
    if (totalEl) totalEl.textContent = data.length;
    if (modelEl) modelEl.textContent = data.reduce(function(s, e) { return s + (e.models ? e.models.length : 0); }, 0);
    if (data.length === 0) {
        if (empty) empty.style.display = 'flex';
        grid.querySelectorAll('.api-card').forEach(function(el) { el.remove(); });
        return;
    }
    if (empty) empty.style.display = 'none';
    grid.querySelectorAll('.api-card').forEach(function(el) {
        if (!filtered.some(function(e) { return e.id === el.dataset.id; })) el.remove();
    });
    filtered.forEach(function(entry) {
        var card = grid.querySelector('.api-card[data-id="' + entry.id + '"]');
        if (card) { updateCardElement(card, entry); } else {
            card = document.createElement('div');
            card.className = 'api-card';
            card.dataset.id = entry.id;
            updateCardElement(card, entry);
            grid.appendChild(card);
        }
    });
}

function updateCardElement(card, entry) {
    var models = entry.models || [];
    var logs = entry.logs || [];
    var modelTags = models.length ? models.map(function(m) {
        return '<span class="model-tag" onclick="copyText(\'' + escapeHtml(m) + '\', \'模型名已复制\')">' + escapeHtml(m) + '</span>';
    }).join('') : '<span style="color:var(--text-muted);font-size:12px">未配置模型</span>';
    var lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
    var html = '';
    html += '<div class="card-header"><div class="card-title"><span>' + escapeHtml(entry.name) + '</span>';
    html += '<button class="edit-btn" onclick="editEntry(\'' + entry.id + '\')" title="编辑">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
    html += '</div><span class="card-time">' + timeAgo(entry.createdAt) + '</span></div>';
    html += '<div class="card-body">';
    html += '<div class="field-row"><span class="field-label">基础 URL</span><div class="field-value">';
    html += '<span class="key-value">' + escapeHtml(entry.baseUrl || '-') + '</span>';
    html += '<button class="copy-btn" onclick="copyText(\'' + escapeHtml(entry.baseUrl || '') + '\',\'URL已复制\')" title="复制 URL">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button></div></div>';
    html += '<div class="field-row"><span class="field-label">API 密钥</span><div class="field-value">';
    html += '<span class="key-value">' + maskKey(entry.apiKey || '') + '</span>';
    html += '<button class="copy-btn" onclick="copyText(\'' + escapeHtml(entry.apiKey || '') + '\',\'API Key已复制\')" title="复制 API Key">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button></div></div>';
    html += '<div class="field-row"><span class="field-label">模型列表 <span style="font-weight:400;color:var(--text-muted)">(点击单个模型名复制)</span></span><div class="field-value">';
    html += '<span class="models-list" style="flex:1">' + modelTags + '</span></div></div></div>';
    html += '<div class="card-actions">';
    html += '<button class="btn btn-sm" onclick="editEntry(\'' + entry.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 编辑</button>';
    html += '<button class="btn btn-sm btn-success" onclick="testModelsForEntry(\'' + entry.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> 测试模型</button>';
    if (models.length) {
        html += '<button class="btn btn-sm btn-warning" onclick="showTestChatModal(\'' + entry.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> 测试对话</button>';
    }
    html += '<button class="btn btn-sm" onclick="showLogModal(\'' + entry.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> 日志' + (logs.length ? '(' + logs.length + ')' : '') + '</button>';
    html += '<button class="btn btn-sm btn-danger" onclick="deleteEntry(\'' + entry.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> 删除</button>';
    html += '</div>';
    if (lastLog) html += '<div style="margin-top:6px;display:flex;justify-content:flex-end"><span style="font-size:11px;color:var(--text-muted)">最近: ' + timeAgo(lastLog.timestamp) + '</span></div>';
    card.innerHTML = html;
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
    var sel = document.getElementById('presetSelect');
    if (sel) sel.value = '';
    document.getElementById('modalOverlay').classList.add('active');
}

function editEntry(id) {
    var data = getData();
    var entry = data.find(function(e) { return e.id === id; });
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
    var sel = document.getElementById('presetSelect');
    if (sel) sel.value = '';
    document.getElementById('modalOverlay').classList.add('active');
}

function initPresets() {
    var sel = document.getElementById('presetSelect');
    if (!sel) return;
    PRESETS.forEach(function(p, i) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.name;
        sel.appendChild(opt);
    });
}

function applyPreset() {
    var sel = document.getElementById('presetSelect');
    var idx = parseInt(sel.value);
    if (isNaN(idx)) return;
    var preset = PRESETS[idx];
    if (!preset) return;
    document.getElementById('editName').value = preset.name;
    document.getElementById('editBaseUrl').value = preset.url;
}

function renderEditModels(models) {
    var container = document.getElementById('modelsTagsEdit');
    container.dataset.models = JSON.stringify(models);
    if (models.length === 0) {
        container.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">暂无模型</span>';
        return;
    }
    container.innerHTML = models.map(function(m, i) {
        return '<span class="model-tag">' + escapeHtml(m) + '<button class="remove-model" onclick="removeEditModel(' + i + ')" title="移除">×</button></span>';
    }).join('');
}

function addEditModel() {
    var input = document.getElementById('editModelInput');
    var val = input.value.trim();
    if (!val) return;
    var models = JSON.parse(document.getElementById('modelsTagsEdit').dataset.models || '[]');
    if (models.indexOf(val) !== -1) { showToast('模型已存在', 'warning'); return; }
    models.push(val);
    renderEditModels(models);
    input.value = '';
    input.focus();
}

function removeEditModel(index) {
    var models = JSON.parse(document.getElementById('modelsTagsEdit').dataset.models || '[]');
    models.splice(index, 1);
    renderEditModels(models);
}

function getEditModels() {
    try { return JSON.parse(document.getElementById('modelsTagsEdit').dataset.models || '[]'); } catch (e) { return []; }
}

function hideModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function saveEntry() {
    var name = document.getElementById('editName').value.trim();
    var baseUrl = document.getElementById('editBaseUrl').value.trim();
    var apiKey = document.getElementById('editApiKey').value.trim();
    var models = getEditModels();
    if (!name) { showToast('请输入显示名称', 'error'); return; }
    if (!baseUrl) { showToast('请输入基础 URL', 'error'); return; }
    if (!apiKey) { showToast('请输入 API 密钥', 'error'); return; }
    var data = getData();
    if (editingId) {
        var idx = data.findIndex(function(e) { return e.id === editingId; });
        if (idx !== -1) {
            data[idx].name = name; data[idx].baseUrl = baseUrl; data[idx].apiKey = apiKey;
            data[idx].models = models; data[idx].updatedAt = new Date().toISOString();
        }
    } else {
        data.push({ id: generateId(), name: name, baseUrl: baseUrl, apiKey: apiKey, models: models, logs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    saveData(data);
    hideModal();
    renderCards();
    showToast(editingId ? '已更新' : '已添加', 'success');
}

function deleteEntry(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    var data = getData();
    data = data.filter(function(e) { return e.id !== id; });
    saveData(data);
    renderCards();
    showToast('已删除', 'success');
}

async function testModelsForEntry(id) {
    var data = getData();
    var entry = data.find(function(e) { return e.id === id; });
    if (!entry) return;
    try { await testConnection(entry.baseUrl, entry.apiKey, entry.id); } catch (e) { showToast('测试失败: ' + e.message, 'error'); }
}

async function testAndImportModels() {
    var baseUrl = document.getElementById('editBaseUrl').value.trim();
    var apiKey = document.getElementById('editApiKey').value.trim();
    var resultEl = document.getElementById('testResult');
    if (!baseUrl || !apiKey) {
        resultEl.textContent = '请先填写 URL 和 API Key';
        resultEl.className = 'test-result error'; return;
    }
    var btn = document.getElementById('testModelsBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 测试中...';
    resultEl.textContent = ''; resultEl.className = 'test-result';
    try {
        var models = await doTestConnection(baseUrl, apiKey);
        var existing = getEditModels();
        var merged = [];
        existing.concat(models).forEach(function(m) { if (merged.indexOf(m) === -1) merged.push(m); });
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
    var url = baseUrl.replace(/\/+$/, '') + '/v1/models';
    var resp = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
    var json = await resp.json();
    var models = (json.data || []).map(function(m) { return m.id || m; }).filter(Boolean);
    if (models.length === 0) throw new Error('未找到模型');
    return models;
}

async function testConnection(baseUrl, apiKey, entryId) {
    var btn = document.querySelector('.api-card[data-id="' + entryId + '"] .btn-success');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 测试中'; }
    try {
        var models = await doTestConnection(baseUrl, apiKey);
        var data = getData();
        var entry = data.find(function(e) { return e.id === entryId; });
        if (entry) {
            entry.models = entry.models || [];
            models.forEach(function(m) { if (entry.models.indexOf(m) === -1) entry.models.push(m); });
            if (!entry.logs) entry.logs = [];
            entry.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'test', detail: '测试成功，导入 ' + models.length + ' 个模型: ' + models.join(', '), status: 'success' });
            saveData(data); renderCards(); showToast('测试成功，导入 ' + models.length + ' 个模型', 'success');
        }
    } catch (e) {
        var data = getData();
        var entry = data.find(function(e) { return e.id === entryId; });
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
    var data = getData();
    var entry = data.find(function(e) { return e.id === id; });
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
    var list = document.getElementById('logList');
    if (!list) return;
    if (logs.length === 0) { list.innerHTML = '<div class="empty-state small"><p>暂无日志</p></div>'; return; }
    var icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    list.innerHTML = [].concat(logs).reverse().map(function(log) {
        return '<div class="log-entry"><div class="log-icon">' + (icons[log.status] || icons.info) + '</div>' +
            '<div class="log-content"><div class="log-text">' + escapeHtml(log.detail || log.action || '') + '</div>' +
            '<div class="log-time">' + formatTime(log.timestamp) + '</div></div>' +
            '<button class="log-del" onclick="deleteLog(\'' + log.id + '\')" title="删除此日志">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
    }).join('');
}

function deleteLog(logId) {
    if (!logViewingId) return;
    var data = getData();
    var entry = data.find(function(e) { return e.id === logViewingId; });
    if (!entry) return;
    entry.logs = (entry.logs || []).filter(function(l) { return l.id !== logId; });
    saveData(data);
    renderLogs(entry.logs);
    renderCards();
}

function clearLogs() {
    if (!logViewingId) return;
    if (!confirm('确定清空所有日志？')) return;
    var data = getData();
    var entry = data.find(function(e) { return e.id === logViewingId; });
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
    var content = document.getElementById('logContentInput').value.trim();
    var status = document.getElementById('logStatusInput').value;
    if (!content) { showToast('请输入日志内容', 'error'); return; }
    var data = getData();
    var entry = data.find(function(e) { return e.id === logViewingId; });
    if (!entry) return;
    if (!entry.logs) entry.logs = [];
    entry.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'manual', detail: content, status: status });
    saveData(data);
    renderLogs(entry.logs);
    renderCards();
    hideAddLogModal();
    showToast('日志已添加', 'success');
}

function showImportDialog() {
    document.getElementById('importJsonInput').value = '';
    document.getElementById('importModalOverlay').classList.add('active');
}

function hideImportModal() { document.getElementById('importModalOverlay').classList.remove('active'); }

function importFromClipboard() {
    navigator.clipboard.readText().then(function(text) {
        document.getElementById('importJsonInput').value = text;
        showToast('已从剪贴板读取', 'success');
    }).catch(function() { showToast('无法读取剪贴板，请手动粘贴', 'error'); });
}

function importFromJson() {
    var raw = document.getElementById('importJsonInput').value.trim();
    if (!raw) { showToast('请粘贴 JSON 数据', 'error'); return; }
    var items;
    try { items = JSON.parse(raw); if (!Array.isArray(items)) items = [items]; } catch (e) { showToast('JSON 格式错误', 'error'); return; }
    var data = getData();
    var count = 0;
    items.forEach(function(item) {
        if (!item.name || !item.baseUrl || !item.apiKey) return;
        var existing = data.find(function(e) { return e.baseUrl === item.baseUrl && e.apiKey === item.apiKey; });
        if (existing) {
            if (item.models && Array.isArray(item.models)) {
                item.models.forEach(function(m) { if (existing.models.indexOf(m) === -1) existing.models.push(m); });
            }
            existing.updatedAt = new Date().toISOString();
        } else {
            data.push({ id: generateId(), name: item.name, baseUrl: item.baseUrl, apiKey: item.apiKey, models: item.models || [], logs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }
        count++;
    });
    saveData(data);
    hideImportModal();
    renderCards();
    showToast('成功导入 ' + count + ' 条记录', 'success');
}

function exportData() {
    var data = getData();
    var arr = data.map(function(e) { return { name: e.name, baseUrl: e.baseUrl, apiKey: e.apiKey, models: e.models || [] }; });
    var json = JSON.stringify(arr, null, 2);
    if (isPywebview() && pywebview.api.save_file) {
        pywebview.api.save_file(json).then(function(r) { if (r) showToast('已导出', 'success'); }).catch(function() { downloadJson(json); });
    } else {
        var u = API_BASE || window.location.origin;
        fetch(u + '/api/save-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: json, default_name: 'apikey_backup_' + new Date().toISOString().slice(0, 10) + '.json' })
        }).then(function(r) { return r.json(); }).then(function(d) { if (d.ok) showToast('已导出', 'success'); else downloadJson(json); }).catch(function() { downloadJson(json); });
    }
}

function importFromFile() {
    if (isPywebview() && pywebview.api.open_file) {
        pywebview.api.open_file().then(function(content) {
            if (content) { document.getElementById('importJsonInput').value = content; showToast('已读取文件', 'success'); }
        }).catch(function() { fileInputFallback(); });
    } else {
        var u = API_BASE || window.location.origin;
        fetch(u + '/api/open-file').then(function(r) { return r.json(); }).then(function(d) {
            if (d.ok && d.content) { document.getElementById('importJsonInput').value = d.content; showToast('已读取文件', 'success'); } else fileInputFallback();
        }).catch(function() { fileInputFallback(); });
    }
}

function fileInputFallback() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) { document.getElementById('importJsonInput').value = ev.target.result; showToast('已读取文件', 'success'); };
        reader.readAsText(file);
    };
    input.click();
}

function downloadJson(json) {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'apikey_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出', 'success');
}

function toggleKeyVisibility(inputId, btn) {
    var input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '隐藏'; } else { input.type = 'password'; btn.textContent = '显示'; }
}

function showTestChatModal(id) {
    testChatEntryId = id;
    var data = getData();
    var entry = data.find(function(e) { return e.id === id; });
    if (!entry || !entry.models || entry.models.length === 0) return;
    var sel = document.getElementById('testModelSelect');
    sel.innerHTML = entry.models.map(function(m) { return '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>'; }).join('');
    document.getElementById('testPromptInput').value = '用中文回复：Hello, who are you?';
    document.getElementById('testChatResult').innerHTML = '<div class="empty-state small" style="padding:20px">点击"发送测试"开始</div>';
    document.getElementById('testChatModalOverlay').classList.add('active');
}

function hideTestChatModal() {
    document.getElementById('testChatModalOverlay').classList.remove('active');
    testChatEntryId = null;
}

async function runModelTest() {
    var id = testChatEntryId;
    if (!id) return;
    var data = getData();
    var entry = data.find(function(e) { return e.id === id; });
    if (!entry) return;
    var model = document.getElementById('testModelSelect').value;
    var prompt = document.getElementById('testPromptInput').value.trim() || 'Hello';
    var resultDiv = document.getElementById('testChatResult');
    var btn = document.getElementById('runTestBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 测试中...';
    resultDiv.innerHTML = '<div class="test-msg test-msg-user"><div class="msg-label">请求</div><div class="msg-content">' + escapeHtml(prompt) + '</div></div>';
    try {
        var baseUrl = entry.baseUrl.replace(/\/+$/, '');
        var resp = await fetch(baseUrl + '/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + entry.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], max_tokens: 200 })
        });
        if (!resp.ok) {
            var errText = await resp.text().catch(function() { return ''; });
            throw new Error('HTTP ' + resp.status + ': ' + (errText || resp.statusText));
        }
        var json = await resp.json();
        var reply = json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : JSON.stringify(json);
        if (!entry.logs) entry.logs = [];
        entry.logs.push({ id: generateId(), timestamp: new Date().toISOString(), action: 'chat_test', detail: '模型 ' + model + ' 对话测试成功', status: 'success' });
        saveData(data);
        renderCards();
        resultDiv.innerHTML += '<div class="test-msg test-msg-assistant"><div class="msg-label">响应</div><div class="msg-content">' + escapeHtml(reply) + '</div></div>';
        showToast('模型测试成功 ✓', 'success');
    } catch (e) {
        var d = getData();
        var en = d.find(function(x) { return x.id === id; });
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

function _attachEvents() {
    var el = document.getElementById('globalSearch');
    if (el) el.addEventListener('input', renderCards);
    var modelInput = document.getElementById('editModelInput');
    if (modelInput) {
        modelInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); addEditModel(); }
        });
    }
    var overlays = ['modalOverlay', 'logModalOverlay', 'importModalOverlay', 'addLogModalOverlay', 'testChatModalOverlay'];
    overlays.forEach(function(id) {
        var o = document.getElementById(id);
        if (o) {
            o.addEventListener('click', function(e) {
                if (e.target === e.currentTarget) {
                    if (id === 'modalOverlay') hideModal();
                    else if (id === 'logModalOverlay') hideLogModal();
                    else if (id === 'importModalOverlay') hideImportModal();
                    else if (id === 'addLogModalOverlay') hideAddLogModal();
                    else if (id === 'testChatModalOverlay') hideTestChatModal();
                }
            });
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideModal(); hideLogModal(); hideImportModal(); hideAddLogModal(); hideTestChatModal();
        }
    });
    var bar = document.getElementById('appBar');
    if (bar) initTitleBarDrag();
}

function _initApp() {
    setTheme(getTheme());
    initPresets();
    _attachEvents();
    _getCachedData();
    renderCards();
    _loadPersisted().then(function(loaded) {
        if (loaded) renderCards();
    });
}

document.addEventListener('DOMContentLoaded', _initApp);

var dragState = null;

function initTitleBarDrag() {
    var bar = document.getElementById('appBar');
    if (!bar) return;
    bar.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.search-box') || e.target.closest('.icon-btn') || e.target.closest('.ctrl-btn') || e.target.closest('.window-controls')) return;
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
