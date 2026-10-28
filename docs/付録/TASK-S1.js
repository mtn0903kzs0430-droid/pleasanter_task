(function () {
    'use strict';

    // 設計書 01_サイト構成から設定
    const TASK_SITE_ID = 9664;
    // 一覧画面の一括処理コマンドと、対象のプロセスID
    const CONTROL_ID = 'BulkProcessCommand';
    const PROCESS_ID = '6';
    const MAX_COPY_COUNT = 50;

    // 通常の一覧表示では何もせず終了する
    if (context.ControlId !== CONTROL_ID) {
        return;
    }

    let bulkProcessingItems;
    try {
        bulkProcessingItems = context.Forms.Item.get('BulkProcessingItems');
    } catch (e) {
        context.AddMessage('一括コピーのプロセスIDを取得できません。', 'alert-error');
        context.Log(e.stack || String(e));
        return;
    }

    // 一覧画面で「一括コピー」（プロセスID 6）が実行された場合だけ処理する
    if (String(bulkProcessingItems) !== PROCESS_ID) {
        return;
    }

    const selectedIds = [];
    for (const selectedId of grid.SelectedIds()) {
        selectedIds.push(Number(selectedId));
    }

    if (selectedIds.length === 0) {
        context.AddMessage('コピーするタスクを選択してください。');
        return;
    }

    if (selectedIds.length > MAX_COPY_COUNT) {
        context.Error(
            '一度にコピーできる件数は' + MAX_COPY_COUNT + '件までです。選択件数：' + selectedIds.length
        );
        return;
    }

    let successCount = 0;
    const failedIds = [];
    const copyStartTime = new Date();
    const copyCompletionTime = new Date(copyStartTime.getTime() + 60 * 60 * 1000);

    for (const selectedId of selectedIds) {
        try {
            const source = firstOrNull(items.Get(selectedId));
            if (!source) {
                failedIds.push(selectedId);
                context.Log('一括コピー：元タスクを取得できません。ID=' + selectedId);
                continue;
            }

            const target = items.NewIssue();

            // タスクの定義情報だけを引き継ぐ。「- コピー」は付与しない
            target.Title = source.Title;
            target.StartTime = new Date(copyStartTime.getTime());
            target.CompletionTime = new Date(copyCompletionTime.getTime());
            target.Body = source.Body;
            target.ClassA = source.ClassA;
            target.CheckA = source.CheckA;
            target.Owner = source.Owner;

            // 実績・自動生成情報は必ず初期化する
            target.DateA = null;
            target.DateB = null;
            target.DateC = null;
            target.DateD = null;
            target.NumA = null;
            target.NumB = null;
            target.ClassB = '';
            target.ClassC = '';
            target.CheckB = false;

            // 新規タスクの状況は必ず「開始前」にする
            target.Status = 100;

            if (items.Create(TASK_SITE_ID, target)) {
                successCount += 1;
                context.Log(
                    '一括コピー：作成成功。元ID=' + selectedId + ' 新ID=' + target.IssueId
                );
            } else {
                failedIds.push(selectedId);
                context.Log('一括コピー：作成失敗。元ID=' + selectedId);
            }
        } catch (e) {
            failedIds.push(selectedId);
            context.AddMessage(
                '一括コピーでエラーが発生しました。元ID=' + selectedId,
                'alert-error'
            );
            context.Log('一括コピー：例外。元ID=' + selectedId + ' 詳細=' + String(e));
            context.Log(e.stack || String(e));
        }
    }

    let message = 'タスクを' + successCount + '件コピーしました。';
    if (failedIds.length > 0) {
        message += ' 失敗ID：' + failedIds.join(', ');
    }
    context.AddMessage(message);

    function firstOrNull(sequence) {
        if (!sequence) {
            return null;
        }
        for (const value of sequence) {
            return value;
        }
        return null;
    }
})();