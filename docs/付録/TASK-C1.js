(function () {
    'use strict';

    const ADD_MINUTES = 60;

    $p.on('change', 'StartTime', function () {
        const startControl = $p.getControl('StartTime');
        const completionControl =
            $p.getControl('CompletionTime');

        const startTime =
            parseDateTime(startControl.val());

        // 開始予定日時が空欄または不正なら何もしない
        if (!startTime) {
            return;
        }

        const completionValue =
            completionControl.val();

        const completionTime =
            parseDateTime(completionValue);

        // 終了予定日時が入力済みで、
        // 開始予定日時より早くなければ上書きしない
        if (
            completionValue &&
            completionTime &&
            completionTime >= startTime
        ) {
            return;
        }

        // 空欄または開始予定日時より早い場合
        const newCompletionTime = new Date(
            startTime.getTime() +
                ADD_MINUTES * 60 * 1000
        );

        $p.set(
            completionControl,
            formatDateTime(newCompletionTime)
        );
    });

    function parseDateTime(value) {
        const match = String(value || '')
            .trim()
            .match(
                /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
            );

        if (!match) {
            return null;
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const hour = Number(match[4] || 0);
        const minute = Number(match[5] || 0);
        const second = Number(match[6] || 0);

        const date = new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            second
        );

        // 2月30日などの不正な日時を除外
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day ||
            date.getHours() !== hour ||
            date.getMinutes() !== minute ||
            date.getSeconds() !== second
        ) {
            return null;
        }

        return date;
    }

    function formatDateTime(date) {
        return (
            date.getFullYear() +
            '/' +
            pad(date.getMonth() + 1) +
            '/' +
            pad(date.getDate()) +
            ' ' +
            pad(date.getHours()) +
            ':' +
            pad(date.getMinutes())
        );
    }

    function pad(value) {
        return String(value).padStart(2, '0');
    }
})();