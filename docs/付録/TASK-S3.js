(function () {
    'use strict';
    // Only requests from the new grid controls. Existing editor operations are unchanged.
    const raw = String(context.ApiRequestBody || '');
    if (!raw) return;
    let request;
    try { request = JSON.parse(raw); } catch (e) { return; }
    const timer = request.TaskGridTimer;
    if (!timer) return;
    function reject(message) { context.Error(message); }
    const processId = Number(request.ProcessId);
    if (request.ProcessIds || (processId !== 1 && processId !== 4) ||
        Number(timer.SiteId) !== Number(context.SiteId)) {
        reject('一覧の計測操作が不正です。一覧を再読み込みしてください。');
        return;
    }
    const stamp = new Date(saved.UpdatedTime).getTime();
    if (!isFinite(stamp) || Number(timer.Stamp) !== stamp) {
        reject('このタスクは別の操作で更新されています。一覧を再読み込みしてください。');
        return;
    }
    const started = utilities.InRange(saved.DateA);
    const ended = utilities.InRange(saved.DateB);
    const pauseStart = utilities.InRange(saved.DateC);
    const pauseEnd = utilities.InRange(saved.DateD);
    if (processId === 1) {
        if (Number(saved.Status) !== 100 || started || ended || pauseStart || pauseEnd ||
            Number(model.Status) !== 200 || !utilities.InRange(model.DateA)) {
            reject('開始できません。レコードを開いて状況・実績日時を確認してください。');
        }
        return;
    }
    if (Number(saved.Status) !== 200 || !started || ended ||
        Number(model.Status) !== 900 || !utilities.InRange(model.DateB)) {
        reject('終了できません。レコードを開いて状況・実績日時を確認してください。');
        return;
    }
    if (pauseStart !== pauseEnd) {
        reject('中断日時が未確定です。レコードを開いて操作してください。');
        return;
    }
    const start = new Date(saved.DateA).getTime();
    const end = new Date(model.DateB).getTime();
    const from = pauseStart ? new Date(saved.DateC).getTime() : 0;
    const to = pauseEnd ? new Date(saved.DateD).getTime() : 0;
    const rest = Number(saved.NumB || 0);
    if (!isFinite(start) || !isFinite(end) || !isFinite(rest) || rest < 0 || end < start ||
        (pauseStart && (!isFinite(from) || !isFinite(to) || from < start || to < from || to > end)) ||
        end - start - (to - from) - rest * 60000 < 0) {
        reject('実績日時・休憩時間が整合しません。レコードを開いて確認してください。');
    }
})();
