(function () {
    'use strict';
    if (!columns.ClassD) return;
    const id = Number(model.IssueId);
    const status = Number(model.Status);
    const started = utilities.InRange(model.DateA);
    const ended = utilities.InRange(model.DateB);
    let html;
    if (!(id > 0)) {
        html = '<span class="task-timer-label">—</span>';
    } else if (status === 900) {
        html = '<span class="task-timer-label task-timer-done">済</span>';
    } else if (status === 910) {
        html = '<span class="task-timer-label" title="レコードを開いて再開・完了を操作してください">詳細で操作</span>';
    } else if ((status === 100 && !started && !ended) ||
               (status === 200 && started && !ended)) {
        const processId = status === 100 ? 1 : 4;
        const label = processId === 1 ? '開始' : '完了';
        const icon = processId === 1 ? '▶' : '■';
        const stamp = new Date(model.UpdatedTime).getTime();
        if (!isFinite(stamp)) {
            html = '<span class="task-timer-label">要確認</span>';
        } else {
            html = '<button type="button" class="task-timer-button task-timer-' +
                (processId === 1 ? 'start' : 'finish') + '" data-record-id="' + id +
                '" data-site-id="' + Number(context.SiteId) +
                '" data-process-id="' + processId + '" data-stamp="' + stamp +
                '" title="' + (processId === 1 ? '計測を開始します' : '計測を終了し、タスクを完了にします') +
                '"><span aria-hidden="true">' + icon + '</span> ' + label + '</button>';
        }
    } else {
        html = '<span class="task-timer-label" title="レコードを開いて状況・実績日時を確認してください">要確認</span>';
    }
    columns.ClassD.RawText = html;
})();
