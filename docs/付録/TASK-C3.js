(function () {
    'use strict';

    const targetViewId = '2';
    let handledCalendar = null;

    function moveToTodayOnce() {
        const viewSelector =
            document.getElementById('ViewSelector');

        if (
            !viewSelector ||
            String(viewSelector.value) !== targetViewId
        ) {
            handledCalendar = null;
            return;
        }

        const calendar =
            document.getElementById('FullCalendar');

        const todayButton =
            calendar &&
            calendar.querySelector('.fc-today-button');

        if (
            !calendar ||
            !todayButton ||
            handledCalendar === calendar
        ) {
            return;
        }

        // このカレンダーでは一度だけ実行
        handledCalendar = calendar;

        if (!todayButton.disabled) {
            todayButton.click();
        }
    }

    document.addEventListener('change', function (event) {
        if (event.target.id === 'ViewSelector') {
            handledCalendar = null;
            window.setTimeout(moveToTodayOnce, 0);
        }
    });

    const observer = new MutationObserver(function () {
        moveToTodayOnce();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    window.setTimeout(moveToTodayOnce, 0);
})();