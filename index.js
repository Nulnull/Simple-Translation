// ==UserScript==
// @name        简单翻译
// @namespace   http://tampermonkey.net/
// @version      3.6.4
// @description [更新] 修复变形提示定位，增加自动消失
// @author      ZYFriedC
// @match       *://*/*
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @connect     siliconflow.cn
// ==/UserScript==

(function() {
    'use strict';
    // 创建文本元素
    const usageInstruction = document.createElement('div');
    usageInstruction.className = 'usage-instruction';
    usageInstruction.innerHTML = `
        <div class="line1">Bitter</div>
        <div class="line2">#Call APIs</div>
        <div class="line3">Sunflower</div>
        <div class="line4">#Cache hit</div>
        <div class="line5">Ctrl+B:Word inflections</div>
    `;

    // 将说明文本添加到页面
    document.body.appendChild(usageInstruction);

    // 配置参数
    const CONFIG = {
        API_ENDPOINT: "https://api.siliconflow.cn/v1/chat/completions",
        MODEL_NAME: "THUDM/GLM-4-32B-0414",
        API_KEY: "sk-iotrfgupnowtoiudsklsycnsmmunlurejccjxhtmrkvmqdas",
        WORD_FORMS_API_ENDPOINT: "https://api.siliconflow.cn/v1/chat/completions",
        WORD_FORMS_MODEL_NAME: "THUDM/GLM-4-32B-0414",
        WORD_FORMS_API_KEY: "sk-ujtgmcpdhogihgpbpmwnaxadxokjbphbfsurikipkjjfbuan",
        MAX_TEXT_LENGTH: 500,
        REQUEST_INTERVAL: 1000,
        FONT_SCALE_FACTOR: 0.65,
        MIN_FONT_SIZE: 8,
        MAX_FONT_SIZE: 24,
        LINE_SPACING_SENSITIVITY: 0.25,
        MAX_SCALE_MULTIPLIER: 1.8,
        MIN_SCALE_MULTIPLIER: 0.8,
        MAX_CACHE_ITEMS: 1000,
        AUTO_SCAN_INTERVAL: 500,
        CACHE_OFFSET_Y: 4.5,
        TOOLTIP_TIMEOUT: 5000  // 新增提示框消失时间
    };

    // 样式定义
    GM_addStyle(`
        .usage-instruction {
        position: fixed;
        top: 5px;
        left: 10px;
        z-index: 2147483647;
        font-family: Arial, sans-serif;
        font-size: 8px;

    }

        .usage-instruction .line1 {

            color:rgb(0, 0, 0);  /* 第一行文本为蓝色 */
            border-bottom: 2px double #1E90FF !important;
            background: rgba(30, 144, 255, 0.06) !important;
            width:19px;
        }

        .usage-instruction .line2 {

            color: #FF8C00;  /* 第二行文本为橙色 */

        }

        .usage-instruction .line3 {
            color:rgb(0, 0, 0);  
            border-bottom: 2px double #1E90FF !important;
            width:37px;
        }
        .usage-instruction .line4 {

            color: #FF8C00;  /* 第二行文本为橙色 */

        }

        .usage-instruction .line5 {
            color: #32CD32;  /* 第三行文本为绿色 */
                     font-style: italic;
        }
        .translation-bubble {
            position: absolute;
            background: rgba(255, 255, 255, 0.0);
            padding: 0px 0px;
            color: #1E90FF;
            z-index: 2147483647;
            max-width: 400px;
            word-break: break-word;
            cursor: pointer;
            transform: translateY(-100%);
            line-height: 1 !important;
            font-family: inherit !important;
            transition: font-size 0.2s ease;
        }

        .highlight-original {
            position: absolute;
            background: rgba(30, 144, 255, 0.06) !important;
            pointer-events: none;
            z-index: 2147483646;

        }

        .auto-highlight {
            position: absolute;
            border-bottom: 2px double #1E90FF !important;
            pointer-events: none;
            z-index: 2147483646;
        }

        .translation-bubble.loading {
            color: #666 !important;
            font-style: italic;
        }

        .translation-bubble.error {
            color: #ff4444 !important;
            font-size: 12px !important;
        }

        .cache-manager {
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 360px;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            border-radius: 8px;
            z-index: 2147483647;
            display: none;
            font-family: Arial, sans-serif;
        }

        .cache-header {
            padding: 12px;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cache-body {
            max-height: 400px;
            overflow-y: auto;
            padding: 8px;
        }

        .cache-item {
            padding: 8px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
        }

        .cache-item:hover {
            background: #f9f9f9;
        }

        .cache-controls {
            display: flex;
            gap: 8px;
        }

        .cache-btn {
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .cache-delete {
            background: #ff4444;
            color: white;
        }

        .cache-search {
            width: 100%;
            padding: 8px;
            margin-bottom: 8px;
            box-sizing: border-box;
        }

        .toggle-manager-btn {
            position: fixed;
            right: 20px;
            bottom: 20px;
            padding: 10px 20px;
            background: #1E90FF;
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            z-index: 2147483647;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .word-forms-tooltip {
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            padding: 3px;
            border-radius: 1px;
            z-index: 2147483647;
            max-width: 300px;
            font-size: 12px;
            line-height: 1.2;
        }

        .word-form-item {
            color: #666;
            margin: 2px 0;
        }
    `);

    const state = {
        translationMap: new WeakMap(),
        lastRequestTime: 0,
        cacheUIInitialized: false,
        autoHighlightMap: new WeakMap(),
        activeTooltips: new Set()
    };

    // 防抖函数
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // 初始化观察者
    const initObservers = () => {
        new ResizeObserver(() => updateAllPositions()).observe(document.body);
        const mutationObserver = new MutationObserver(debounce(() => {
            updateAllPositions();
            autoDisplayCachedTranslations();
        }, CONFIG.AUTO_SCAN_INTERVAL));
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    };

    // 自动显示缓存翻译
    const autoDisplayCachedTranslations = () => {
        cleanAutoHighlights();
        const cacheKeys = GM_listValues();
        cacheKeys.forEach(key => {
            const translation = GM_getValue(key);
            findAndHighlightText(key, translation);
        });
    };

    // 清理自动生成的高亮
    const cleanAutoHighlights = () => {
        document.querySelectorAll('.auto-highlight').forEach(el => el.remove());
        document.querySelectorAll('.translation-bubble.auto-generated').forEach(el => el.remove());
    };

    // 转义正则特殊字符
    const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // 查找并高亮文本
    const findAndHighlightText = (text, translation) => {
        if (!text || text.length > CONFIG.MAX_TEXT_LENGTH) return;

        const wordPattern = new RegExp(`\\b${escapeRegExp(text)}\\b`, 'gi');
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.parentElement || node.parentElement.style.display === 'none' ||
                    node.nodeValue.trim() === '') return NodeFilter.FILTER_SKIP;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let node;
        while ((node = walker.nextNode())) {
            const nodeText = node.nodeValue;
            let match;
            while ((match = wordPattern.exec(nodeText)) !== null) {
                try {
                    const range = document.createRange();
                    range.setStart(node, match.index);
                    range.setEnd(node, match.index + text.length);
                    createAutoHighlightAndBubble(range, translation);
                } catch (e) {
                    console.warn('Range creation failed:', e);
                }
            }
        }
    };

    // 创建自动高亮和气泡
    const createAutoHighlightAndBubble = (range, translation) => {
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const docPos = getDocumentPosition(rect);
        const highlight = document.createElement('div');
        highlight.className = 'auto-highlight';
        highlight.style.cssText = `
            left: ${docPos.left}px;
            top: ${docPos.top + rect.height - 2}px;
            width: ${rect.width}px;
            height: 2px;
        `;
        document.body.appendChild(highlight);

        const fontSize = calculateFontSize(rect, range);
        const bubble = document.createElement('div');
        bubble.className = 'translation-bubble auto-generated';
        bubble.textContent = translation;
        bubble.style.left = `${docPos.left}px`;
        bubble.style.top = `${docPos.top + CONFIG.CACHE_OFFSET_Y}px`;
        bubble.style.fontSize = `${fontSize}px`;
        bubble.ondblclick = () => {
            bubble.remove();
            highlight.remove();
        };

        state.translationMap.set(bubble, { originalRange: range, originalText: translation });
        document.body.appendChild(bubble);
    };

    // 获取文档绝对位置
    const getDocumentPosition = (clientRect) => ({
        left: clientRect.left + window.scrollX,
        top: clientRect.top + window.scrollY,
        width: clientRect.width,
        height: clientRect.height
    });

    // 更新所有元素位置
    const updateAllPositions = () => {
        document.querySelectorAll('.translation-bubble').forEach(bubble => {
            const data = state.translationMap.get(bubble);
            if (data) updateElementPosition(bubble, data);
        });
    };

    // 更新单个元素位置
    const updateElementPosition = (bubble, { originalRange }) => {
        try {
            const rect = originalRange.getBoundingClientRect();
            const docPos = getDocumentPosition(rect);

            const isCached = bubble.classList.contains('auto-generated') ||
                           !bubble.classList.contains('loading');
            const offsetY = isCached ? CONFIG.CACHE_OFFSET_Y : 0;

            bubble.style.left = `${docPos.left}px`;
            bubble.style.top = `${docPos.top + offsetY}px`;

            const highlight = bubble.nextElementSibling;
            if (highlight?.classList.contains('highlight-original')) {
                highlight.style.cssText = `
                    left: ${docPos.left}px;
                    top: ${docPos.top}px;
                    width: ${docPos.width}px;
                    height: ${docPos.height}px;
                `;
            }
        } catch (error) {
            bubble.remove();
            bubble.nextElementSibling?.remove();
        }
    };

    // 创建高亮元素
    const createHighlight = (position) => {
        const highlight = document.createElement('div');
        highlight.className = 'highlight-original';
        highlight.style.cssText = `
            left: ${position.left}px;
            top: ${position.top}px;
            width: ${position.width}px;
            height: ${position.height}px;
        `;
        return highlight;
    };

    // API请求翻译
    const fetchTranslation = async (text) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: CONFIG.API_ENDPOINT,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CONFIG.API_KEY}`
                },
                data: JSON.stringify({
                    model: CONFIG.MODEL_NAME,
                    messages: [{
                        role: "user",
                        content: `严格作为翻译工具，请将以下内容翻译成中文，只需要给出翻译结果，不需要额外说明：\n\n${text}`
                    }],
                    temperature: 0.2,
                    max_tokens: 1000
                }),
                onload: (res) => {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (res.status === 200) {
                            resolve(data.choices[0].message.content.trim());
                        } else {
                            reject(data.error?.message || 'API错误');
                        }
                    } catch (e) {
                        reject('响应解析失败');
                    }
                },
                onerror: (err) => reject(`请求失败: ${err.statusText}`),
                timeout: 10000
            });
        });
    };

    // 智能字体计算
    const calculateFontSize = (lineRect, range) => {
        const currentHeight = lineRect.height;
        let scaleFactor = CONFIG.FONT_SCALE_FACTOR;

        try {
            const parentElement = range.commonAncestorContainer.nodeType === 3
                ? range.commonAncestorContainer.parentElement
                : range.commonAncestorContainer;

            const siblings = Array.from(parentElement.children || [])
                .map(el => {
                    const rect = el.getBoundingClientRect();
                    return { top: rect.top, bottom: rect.bottom, height: rect.height };
                });

            const currentTop = lineRect.top;
            const previousLines = siblings.filter(r => r.bottom <= currentTop);
            if (previousLines.length > 0) {
                const closestLine = previousLines.reduce((prev, current) =>
                    (current.bottom > prev.bottom) ? current : prev
                );

                const spacing = currentTop - closestLine.bottom;
                const avgHeight = (currentHeight + closestLine.height) / 2;
                const spacingRatio = spacing / avgHeight;
                const sensitivity = CONFIG.LINE_SPACING_SENSITIVITY;

                if (spacingRatio > 0.8) {
                    scaleFactor *= Math.min(
                        1 + (spacingRatio - 0.8) * sensitivity * 4,
                        CONFIG.MAX_SCALE_MULTIPLIER
                    );
                } else if (spacingRatio < 0.4) {
                    scaleFactor *= Math.max(
                        1 - (0.4 - spacingRatio) * sensitivity * 3,
                        CONFIG.MIN_SCALE_MULTIPLIER
                    );
                }
            }

            return Math.min(
                Math.max(currentHeight * scaleFactor, CONFIG.MIN_FONT_SIZE),
                CONFIG.MAX_FONT_SIZE
            );
        } catch (error) {
            console.error('字体计算异常:', error);
            return Math.max(currentHeight * CONFIG.FONT_SCALE_FACTOR, CONFIG.MIN_FONT_SIZE);
        }
    };

    // 缓存管理
    const cacheTranslation = (text, translation) => {
        const keys = GM_listValues();
        if (keys.length >= CONFIG.MAX_CACHE_ITEMS) {
            keys.slice(0, 20).forEach(key => GM_deleteValue(key));
        }
        GM_setValue(text, translation);
    };

    // 创建翻译元素
    const createTranslationElement = async (text, range) => {
        const cached = GM_getValue(text);
        if (cached) {
            const docPos = getDocumentPosition(range.getBoundingClientRect());
            const fontSize = calculateFontSize(range.getBoundingClientRect(), range);

            const bubble = document.createElement('div');
            bubble.className = 'translation-bubble';
            bubble.textContent = cached;
            bubble.style.left = `${docPos.left}px`;
            bubble.style.top = `${docPos.top + CONFIG.CACHE_OFFSET_Y}px`;
            bubble.style.fontSize = `${fontSize}px`;
            bubble.ondblclick = () => bubble.remove();

            state.translationMap.set(bubble, { originalRange: range, originalText: text });
            document.body.appendChild(bubble);
            return bubble;
        }

        const rects = range.getClientRects();
        if (rects.length === 0) return null;

        const lineRect = rects[0];
        const fontSize = calculateFontSize(lineRect, range);
        const fontSizePx = `${fontSize}px`;
        const docPos = getDocumentPosition(range.getBoundingClientRect());

        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'translation-bubble loading';
        loadingBubble.textContent = '翻译中...';
        loadingBubble.style.left = `${docPos.left}px`;
        loadingBubble.style.top = `${docPos.top}px`;
        loadingBubble.style.fontSize = fontSizePx;

        const highlight = createHighlight(docPos);
        document.body.append(loadingBubble, highlight);

        try {
            const now = Date.now();
            const delay = Math.max(CONFIG.REQUEST_INTERVAL - (now - state.lastRequestTime), 0);
            await new Promise(resolve => setTimeout(resolve, delay));

            const translation = await fetchTranslation(text.substring(0, CONFIG.MAX_TEXT_LENGTH));
            cacheTranslation(text, translation);

            const bubble = document.createElement('div');
            bubble.className = 'translation-bubble';
            bubble.textContent = translation;
            bubble.style.left = `${docPos.left}px`;
            bubble.style.top = `${docPos.top + CONFIG.CACHE_OFFSET_Y}px`;
            bubble.style.fontSize = fontSizePx;
            bubble.ondblclick = () => {
                bubble.remove();
                highlight.remove();
            };

            state.translationMap.set(bubble, { originalRange: range, originalText: text });
            document.body.replaceChild(bubble, loadingBubble);
            return bubble;
        } catch (error) {
            loadingBubble.remove();
            highlight.remove();
            const errorBubble = document.createElement('div');
            errorBubble.className = 'translation-bubble error';
            errorBubble.textContent = `错误: ${error}`;
            errorBubble.style.left = `${docPos.left}px`;
            errorBubble.style.top = `${docPos.top}px`;
            document.body.appendChild(errorBubble);
            setTimeout(() => errorBubble.remove(), 3000);
            return null;
        } finally {
            state.lastRequestTime = Date.now();
        }
    };

    // 初始化缓存管理界面
    const initCacheUI = () => {
        if (state.cacheUIInitialized) return;
        state.cacheUIInitialized = true;

        const manager = document.createElement('div');
        manager.className = 'cache-manager';
        manager.innerHTML = `
            <div class="cache-header">
                <h3 style="margin:0;">翻译缓存管理 (0)</h3>
                <button class="cache-btn" onclick="this.parentElement.parentElement.style.display='none'">关闭</button>
            </div>
            <input type="text" class="cache-search" placeholder="搜索缓存...">
            <div class="cache-body"></div>
        `;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-manager-btn';
        toggleBtn.textContent = '管理翻译缓存';
        toggleBtn.onclick = () => {
            manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
            if (manager.style.display === 'block') refreshCacheList();
        };

        document.body.appendChild(manager);
        document.body.appendChild(toggleBtn);

        manager.querySelector('.cache-search').addEventListener('input', () => {
            refreshCacheList();
        });
    };

    // 刷新缓存列表
    const refreshCacheList = () => {
        const manager = document.querySelector('.cache-manager');
        const body = manager.querySelector('.cache-body');
        const searchTerm = manager.querySelector('.cache-search').value.toLowerCase();

        body.innerHTML = '';
        const values = GM_listValues();
        let count = 0;

        values.forEach(key => {
            const translation = GM_getValue(key);
            if (!key.toLowerCase().includes(searchTerm) && !translation.toLowerCase().includes(searchTerm)) return;

            const item = document.createElement('div');
            item.className = 'cache-item';
            item.innerHTML = `
                <div style="flex:1; margin-right: 10px;">
                    <div style="color:#666; font-size:0.9em;">${key}</div>
                    <div style="color:#333;">${translation}</div>
                </div>
                <div class="cache-controls">
                    <button class="cache-btn cache-delete" data-key="${key}">删除</button>
                </div>
            `;
            item.querySelector('button').onclick = () => {
                GM_deleteValue(key);
                item.remove();
                updateCacheCount();
            };
            body.appendChild(item);
            count++;
        });

        updateCacheCount(count);
    };

    // 更新缓存计数
    const updateCacheCount = (count) => {
        const header = document.querySelector('.cache-header h3');
        if (count === undefined) count = GM_listValues().length;
        header.textContent = `翻译缓存管理 (${count})`;
    };

    // 获取单词变形
    const fetchWordForms = async (text) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: CONFIG.WORD_FORMS_API_ENDPOINT,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CONFIG.WORD_FORMS_API_KEY}`
                },
                data: JSON.stringify({
                    model: CONFIG.WORD_FORMS_MODEL_NAME,
                    messages: [{
                        role: "user",
                        content: `严格按以下格式返回英语单词的所有词性变形，用中文说明词性：\n单词 "${text}" 的变形：\n名词: \n动词: \n形容词: \n副词: \n其他: `
                    }],
                    temperature: 0.1,
                    max_tokens: 500
                }),
                onload: (res) => {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (res.status === 200) {
                            resolve(data.choices[0].message.content.trim());
                        } else {
                            reject(data.error?.message || '单词变形API错误');
                        }
                    } catch (e) {
                        reject('响应解析失败');
                    }
                },
                onerror: (err) => reject(`请求失败: ${err.statusText}`),
                timeout: 10000
            });
        });
    };

    // 显示单词变形工具提示
    const showWordFormsTooltip = (originalRange, formsText) => {
        const rect = originalRange.getBoundingClientRect();
        if (rect.width === 0) return;

        const docPos = {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY + rect.height + 2
        };

        const tooltip = document.createElement('div');
        tooltip.className = 'word-forms-tooltip';
        tooltip.innerHTML = formsText.split('\n')
            .map(line => `<div class="word-form-item">${line}</div>`)
            .join('');
        tooltip.style.left = `${docPos.left}px`;
        tooltip.style.top = `${docPos.top}px`;

        const removeTooltip = () => {
            tooltip.remove();
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
            state.activeTooltips.delete(tooltip);
        };

        // 更新工具提示位置
        const updatePosition = () => {
            const newRect = originalRange.getBoundingClientRect();
            tooltip.style.left = `${newRect.left + window.scrollX}px`;
            tooltip.style.top = `${newRect.top + window.scrollY + newRect.height + 2}px`;
        };

        const timer = setTimeout(removeTooltip, CONFIG.TOOLTIP_TIMEOUT);

        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);

        tooltip.addEventListener('mouseenter', () => clearTimeout(timer));
        tooltip.addEventListener('mouseleave', removeTooltip);

        document.body.appendChild(tooltip);
        state.activeTooltips.add(tooltip);
    };


    // 主事件监听
    document.addEventListener('keydown', async (e) => {
        // 原有Ctrl+I翻译功能
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            const selection = window.getSelection();
            const text = selection.toString().trim();
            if (!text || text.length > CONFIG.MAX_TEXT_LENGTH) return;
            e.preventDefault();

            try {
                const range = selection.getRangeAt(0).cloneRange();
                await createTranslationElement(text, range);
                autoDisplayCachedTranslations();
            } catch (error) {
                console.error('翻译流程异常:', error);
            }
        }

        // 新增Command+B单词变形功能
        if (e.metaKey && e.key.toLowerCase() === 'b') {
            const selection = window.getSelection();
            const text = selection.toString().trim();
            if (!text || text.length > 50) return;
            e.preventDefault();

            try {
                const originalRange = selection.getRangeAt(0).cloneRange();
                const cachedForms = GM_getValue(`word_forms:${text}`);
                if (cachedForms) {
                    showWordFormsTooltip(originalRange, cachedForms);
                    return;
                }

                const formsText = await fetchWordForms(text);
                GM_setValue(`word_forms:${text}`, formsText);
                showWordFormsTooltip(originalRange, formsText);
            } catch (error) {
                console.error('单词变形获取失败:', error);
            }
        }
    });

    // 初始化
    initObservers();
    initCacheUI();
    autoDisplayCachedTranslations();
    window.addEventListener('resize', updateAllPositions);
})();