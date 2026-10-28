(function () {
    'use strict';
    // @siteid list start@
    const TASK_SITE_ID = 9664;
    const RECURRING_MASTER_SITE_ID = 9750;
    // @siteid list end@
    const BULK_COPY_CONTROL_ID = 'TaskBulkCopyCommand';
    const CREATE_RECURRING_CONTROL_ID = 'CreateRecurringTasksCommand';
    const MAX_COPY_COUNT = 50;
    const MAX_MASTER_COUNT = 50;
    const DEFAULT_DURATION_MINUTES = 60;

    if (context.ControlId === BULK_COPY_CONTROL_ID) {
        bulkCopySelectedTasks();
        return;
    }

    if (context.ControlId === CREATE_RECURRING_CONTROL_ID) {
        createTodayRecurringTasks();
    }

    function bulkCopySelectedTasks() {
        const selectedIds = [];
        for (const selectedId of grid.SelectedIds()) {
            selectedIds.push(Number(selectedId));
        }

        if (selectedIds.length === 0) {
            context.AddMessage('コピーするタスクを選択してください。', 'alert-error');
            return;
        }

        if (selectedIds.length > MAX_COPY_COUNT) {
            context.AddMessage(
                '一度にコピーできる件数は' + MAX_COPY_COUNT + '件までです。選択件数：' + selectedIds.length,
                'alert-error'
            );
            return;
        }

        let successCount = 0;
        const failedIds = [];
        const copyStartTime = new Date();
        const copyCompletionTime = new Date(
            copyStartTime.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000
        );

        for (const selectedId of selectedIds) {
            try {
                const source = firstOrNull(items.Get(selectedId));
                if (!source) {
                    failedIds.push(selectedId);
                    context.Log('一括コピー：元タスクを取得できません。ID=' + selectedId);
                    continue;
                }

                const target = items.NewIssue();
                target.Title = source.Title;
                target.StartTime = new Date(copyStartTime.getTime());
                target.CompletionTime = new Date(copyCompletionTime.getTime());
                target.Body = source.Body;
                target.ClassA = source.ClassA;
                target.CheckA = source.CheckA;
                if (Number(source.Owner) > 0) {
                    target.Owner = Number(source.Owner);
                }

                clearActualAndGenerationFields(target);
                target.Status = 100;

                if (items.Create(TASK_SITE_ID, target)) {
                    successCount += 1;
                    context.Log(
                        '一括コピー：作成成功。元ID=' + selectedId + ' 新ID=' + target.IssueId
                    );
                }
                else {
                    failedIds.push(selectedId);
                    context.Log('一括コピー：作成失敗。元ID=' + selectedId);
                }
            }
            catch (e) {
                failedIds.push(selectedId);
                context.Log(
                    '一括コピー：例外。元ID=' + selectedId + ' 詳細=' + String(e)
                );
                context.Log(e.stack || String(e));
            }
        }

        let message = 'タスクを' + successCount + '件コピーしました。';
        if (failedIds.length > 0) {
            message += ' 失敗ID：' + failedIds.join(', ');
        }
        context.AddMessage(
            message,
            failedIds.length > 0 ? 'alert-error' : 'alert-information'
        );
    }

    function createTodayRecurringTasks() {
        const activeView = {
            View: {
                ColumnFilterHash: {
                    CheckA: '1'
                },
                ColumnSorterHash: {
                    ClassB: 'asc',
                    ResultId: 'asc'
                }
            }
        };

        const activeCount = Number(
            items.Count(RECURRING_MASTER_SITE_ID, JSON.stringify(activeView))
        );
        if (activeCount > MAX_MASTER_COUNT) {
            context.AddMessage(
                '有効な定例タスクは' + MAX_MASTER_COUNT + '件以内にしてください。現在：' + activeCount + '件',
                'alert-error'
            );
            return;
        }

        activeView.PageSize = MAX_MASTER_COUNT;
        const masterRecords = items.Get(
            RECURRING_MASTER_SITE_ID,
            JSON.stringify(activeView)
        ) || [];

        const today = new Date(utilities.Today());
        const todayKey = formatDateKey(today);
        const weekday = String(today.getDay());
        const candidates = [];
        const validationErrors = [];
        let excludedCount = 0;

        for (const source of masterRecords) {
            const masterId = Number(source.ResultId);
            if (!isApplicableDate(source, todayKey) || !isApplicableWeekday(source.ClassC, weekday)) {
                excludedCount += 1;
                continue;
            }

            const title = String(source.Title || '').trim();
            const time = parseTime(source.ClassB);
            const duration = Number(source.NumA);

            if (!masterId) {
                validationErrors.push('マスタIDを取得できないレコードがあります。');
                continue;
            }
            if (!title) {
                validationErrors.push('ID ' + masterId + '：タスク名が空です。');
                continue;
            }
            if (!time) {
                validationErrors.push('ID ' + masterId + '：開始時刻はHH:mm形式で入力してください。');
                continue;
            }
            if (!isFinite(duration) || duration < 1 || Math.floor(duration) !== duration) {
                validationErrors.push('ID ' + masterId + '：所要時間は1以上の整数で入力してください。');
                continue;
            }

            candidates.push({
                source: source,
                masterId: masterId,
                title: title,
                hour: time.hour,
                minute: time.minute,
                duration: duration
            });
        }

        if (validationErrors.length > 0) {
            context.AddMessage(
                '定例タスクマスタに入力エラーがあります。タスクは作成していません。 ' +
                    validationErrors.join(' / '),
                'alert-error'
            );
            return;
        }

        let createdCount = 0;
        let skippedCount = 0;
        const failedIds = [];

        for (const candidate of candidates) {
            const generationKey = 'RECUR:' + todayKey + ':' + candidate.masterId;

            if (generationKeyExists(generationKey)) {
                skippedCount += 1;
                continue;
            }

            try {
                const source = candidate.source;
                const startTime = new Date(today.getTime());
                startTime.setHours(candidate.hour, candidate.minute, 0, 0);
                const completionTime = new Date(
                    startTime.getTime() + candidate.duration * 60 * 1000
                );

                const target = items.NewIssue();
                target.Title = candidate.title;
                target.StartTime = startTime;
                target.CompletionTime = completionTime;
                target.Body = source.Body;
                target.ClassA = source.ClassA;
                target.CheckA = String(source.ClassA || '').trim() !== '';
                if (Number(source.Owner) > 0) {
                    target.Owner = Number(source.Owner);
                }

                clearActualAndGenerationFields(target);
                target.ClassB = generationKey;
                target.ClassC = String(candidate.masterId);
                target.CheckB = true;
                target.Status = 100;

                if (items.Create(TASK_SITE_ID, target)) {
                    createdCount += 1;
                    context.Log(
                        '定例タスク生成：作成成功。マスタID=' +
                            candidate.masterId +
                            ' 新ID=' +
                            target.IssueId +
                            ' 生成キー=' +
                            generationKey
                    );
                }
                else {
                    failedIds.push(candidate.masterId);
                    context.Log(
                        '定例タスク生成：作成失敗。マスタID=' + candidate.masterId
                    );
                }
            }
            catch (e) {
                failedIds.push(candidate.masterId);
                context.Log(
                    '定例タスク生成：例外。マスタID=' +
                        candidate.masterId +
                        ' 詳細=' +
                        String(e)
                );
                context.Log(e.stack || String(e));
            }
        }

        let message =
            '本日の定例タスク：作成' +
            createdCount +
            '件、作成済みのためスキップ' +
            skippedCount +
            '件、曜日・期間対象外' +
            excludedCount +
            '件。';
        if (failedIds.length > 0) {
            message += ' 作成失敗マスタID：' + failedIds.join(', ');
        }
        context.AddMessage(
            message,
            failedIds.length > 0 ? 'alert-error' : 'alert-information'
        );
    }

    function clearActualAndGenerationFields(target) {
        target.DateA = null;
        target.DateB = null;
        target.DateC = null;
        target.DateD = null;
        target.NumA = null;
        target.NumB = null;
        target.ClassB = '';
        target.ClassC = '';
        target.CheckB = false;
    }

    function generationKeyExists(generationKey) {
        const request = {
            PageSize: 1,
            View: {
                ColumnFilterHash: {
                    ClassB: generationKey
                },
                ColumnFilterSearchTypes: {
                    ClassB: 'ExactMatch'
                }
            }
        };
        const records = items.Get(TASK_SITE_ID, JSON.stringify(request));
        return records && records.length > 0;
    }

    function isApplicableDate(source, todayKey) {
        if (utilities.InRange(source.DateA)) {
            const fromKey = formatDateKey(new Date(source.DateA));
            if (fromKey > todayKey) {
                return false;
            }
        }
        if (utilities.InRange(source.DateB)) {
            const toKey = formatDateKey(new Date(source.DateB));
            if (toKey < todayKey) {
                return false;
            }
        }
        return true;
    }

    function isApplicableWeekday(value, weekday) {
        const selected = parseMultipleSelections(value);
        return selected.length === 0 || selected.indexOf(weekday) >= 0;
    }

    function parseMultipleSelections(value) {
        const text = String(value || '').trim();
        if (!text) {
            return [];
        }
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return parsed.map(function (item) {
                    return String(item);
                });
            }
        }
        catch (e) {
            context.Log('実行曜日のJSON解析に失敗しました。値=' + text);
        }
        return text.split(',').map(function (item) {
            return item.trim();
        }).filter(function (item) {
            return item !== '';
        });
    }

    function parseTime(value) {
        const match = String(value || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (!match) {
            return null;
        }
        return {
            hour: Number(match[1]),
            minute: Number(match[2])
        };
    }

    function formatDateKey(date) {
        return (
            String(date.getFullYear()) +
            pad(date.getMonth() + 1) +
            pad(date.getDate())
        );
    }

    function pad(value) {
        return String(value).padStart(2, '0');
    }

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