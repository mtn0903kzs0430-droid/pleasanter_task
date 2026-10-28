(function () {
    'use strict';
    if (window.taskGridTimerInstalled) return;
    window.taskGridTimerInstalled = true;
    const refreshId = 'TaskGridTimerRefreshCommand';
    let busy = false;
    function message(text, error) {
        let box = document.getElementById('TaskGridTimerMessage');
        if (!box) {
            box = document.createElement('div');
            box.id = 'TaskGridTimerMessage';
            box.setAttribute('role', 'status');
            box.setAttribute('aria-live', 'polite');
            const grid = document.getElementById('Grid');
            if (grid) grid.parentNode.insertBefore(box, grid);
            else document.getElementById('MainForm').prepend(box);
        }
        box.className = error ? 'task-timer-message task-timer-error' : 'task-timer-message';
        box.textContent = text;
    }
    function lock(value) {
        busy = value;
        document.querySelectorAll('.task-timer-button').forEach(function (button) {
            button.disabled = value;
        });
    }
    function refresh(text, error) {
        message(text, error);
        let control = $('#' + refreshId);
        if (!control.length) {
            control = $('<button/>', { id: refreshId, type: 'button' })
                .attr('data-action', 'GridRows').attr('data-method', 'post').hide()
                .appendTo('#MainForm');
        }
        const scroll = { x: window.scrollX, y: window.scrollY };
        let settled = false;
        const watchdog = window.setTimeout(function () {
            if (!settled) {
                message(text + ' 一覧の再取得が完了しません。再読み込みして結果を確認してください。', true);
                // Keep controls locked: never blindly repeat a possibly successful update.
            }
        }, 30000);
        $p.events['ajax_after_done_' + refreshId] = function (args) {
            if (args.ret !== 0) return;
            settled = true;
            window.clearTimeout(watchdog);
            lock(false);
            message(text, error);
            window.scrollTo(scroll.x, scroll.y);
        };
        $p.events['ajax_after_always_' + refreshId] = function (args) {
            if (args.ret !== 0 && !settled) {
                settled = true;
                window.clearTimeout(watchdog);
                message(text + ' 一覧を再読み込みして結果を確認してください。', true);
            }
        };
        if ($p.send(control, 'MainForm', true, false) === false) {
            settled = true;
            window.clearTimeout(watchdog);
            message(text + ' 一覧を再読み込みして結果を確認してください。', true);
        }
    }
    // Capture phase prevents the normal row-click navigation before it reaches jQuery.
    document.addEventListener('click', function (event) {
        const button = event.target.closest && event.target.closest('.task-timer-button');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (busy || button.disabled) return;
        if ($p.formChanged || String($('#EditOnGrid').val() || '0') !== '0') {
            message('編集内容を保存し、一覧の編集モードを終了してから操作してください。', true);
            return;
        }
        const id = Number(button.dataset.recordId);
        const siteId = Number(button.dataset.siteId);
        const processId = Number(button.dataset.processId);
        const stamp = Number(button.dataset.stamp);
        if (!(id > 0) || !(siteId > 0) || !isFinite(stamp) ||
            (processId !== 1 && processId !== 4)) return;
        const row = button.closest('tr');
        const title = row && row.querySelector('[data-name="Title"], .grid-title');
        const name = title ? title.textContent.trim() : 'ID ' + id;
        if (processId === 4 && !window.confirm('「' + name + '」の計測を終了し、タスクを完了にしますか？')) return;
        lock(true);
        button.textContent = '処理中…';
        message('ID ' + id + ' を更新しています。');
        let completed = false;
        const watchdog = window.setTimeout(function () {
            if (!completed) message('応答を確認できません。連続操作せず、一覧を再読み込みして結果を確認してください。', true);
        }, 30000);
        function finish(text, error) {
            if (completed) return;
            completed = true;
            window.clearTimeout(watchdog);
            refresh(text, error);
        }
        try {
            $p.apiUpdate({
                id: id,
                data: {
                    ApiVersion: 1.1,
                    ProcessId: processId,
                    TaskGridTimer: { SiteId: siteId, Stamp: stamp }
                },
                done: function (result) {
                    if (result && Number(result.StatusCode) === 200) {
                        finish('ID ' + id + (processId === 1 ? ' の計測を開始しました。' : ' を終了し、完了にしました。') +
                            ' 現在の絞り込み条件によっては一覧から非表示になります。', false);
                    } else {
                        finish('更新できませんでした。' + ((result && result.Message) || '最新の状態と権限を確認してください。'), true);
                    }
                },
                fail: function (xhr) {
                    const detail = xhr && xhr.responseJSON && xhr.responseJSON.Message;
                    finish(detail || '更新結果を確認できません。一覧の最新状態を確認してください（自動再送はしません）。', true);
                }
            });
        } catch (e) {
            finish('計測操作でエラーが発生しました。一覧の最新状態を確認してください。', true);
        }
    }, true);
})();
