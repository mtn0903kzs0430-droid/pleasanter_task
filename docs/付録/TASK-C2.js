(function () {
    'use strict';

    const BULK_COPY_CONTROL_ID = 'TaskBulkCopyCommand';
    const CREATE_RECURRING_CONTROL_ID = 'CreateRecurringTasksCommand';
    const REFRESH_CONTROL_ID = 'TaskCommandsRefreshCommand';

    // ボタン色
    if ($('#TaskCommandButtonStyles').length === 0) {
        $('<style/>', {
            id: 'TaskCommandButtonStyles',
            text: `
                /* 選択タスクを一括コピー：オレンジ */
                #TaskBulkCopyCommand {
                    background: #ef6c00 !important;
                    border-color: #e65100 !important;
                    color: #ffffff !important;
                }
                
                #TaskBulkCopyCommand:hover {
                    background: #e65100 !important;
                    border-color: #bf360c !important;
                }

                /* 本日の定例タスクを作成：緑 */
                #CreateRecurringTasksCommand {
                    background: #2e7d32 !important;
                    border-color: #1b5e20 !important;
                    color: #ffffff !important;
                }

                #CreateRecurringTasksCommand:hover {
                    background: #1b5e20 !important;
                    border-color: #124116 !important;
                }
            `
        }).appendTo('head');
    }

    const $commands = $('#MainCommands');
    if ($commands.length === 0) {
        return;
    }

    let running = false;

    const $bulkCopyButton = createCommandButton(
        BULK_COPY_CONTROL_ID,
        '選択タスクを一括コピー',
        '選択したタスクを、新しいタスクとして一括コピーします。よろしいですか？'
    );

    const $createRecurringButton = createCommandButton(
        CREATE_RECURRING_CONTROL_ID,
        '本日の定例タスクを作成',
        '定例タスクマスタから、本日のタスクを一括作成します。よろしいですか？'
    );

    const $refreshButton = $('<button/>', {
        id: REFRESH_CONTROL_ID,
        type: 'button'
    })
        .attr('data-action', 'GridRows')
        .attr('data-method', 'post')
        .addClass('hidden')
        .hide();

    $commands.append($bulkCopyButton, $createRecurringButton, $refreshButton);

    $p.events['ajax_after_done_' + BULK_COPY_CONTROL_ID] = refreshGrid;
    $p.events['ajax_after_done_' + CREATE_RECURRING_CONTROL_ID] = refreshGrid;
    $p.events['ajax_after_always_' + BULK_COPY_CONTROL_ID] = resetOnFailure;
    $p.events['ajax_after_always_' + CREATE_RECURRING_CONTROL_ID] = resetOnFailure;
    $p.events['ajax_after_always_' + REFRESH_CONTROL_ID] = function () {
        running = false;
    };

    function createCommandButton(id, text, confirmationMessage) {
        return $('<button/>', {
            id: id,
            type: 'button',
            text: text,
            title: text
        })
            .attr('data-action', 'GridRows')
            .attr('data-method', 'post')
            .addClass('button button-icon button-positive')
            .on('click', function () {
                if (running) {
                    return;
                }
                if (!window.confirm(confirmationMessage)) {
                    return;
                }
                running = true;
                const result = $p.send($(this));
                if (result === false) {
                    running = false;
                }
            });
    }

    function refreshGrid() {
        window.setTimeout(function () {
            $p.send($refreshButton, undefined, true, false);
        }, 0);
    }

    function resetOnFailure(args) {
        if (args.ret !== 0) {
            running = false;
        }
    }
})();