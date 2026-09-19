/*
 * jaemzware
 *
 * Lets the Canvas/Camera nav links switch to an already-open tab instead of
 * reloading it. A named `target` on a plain <a> reuses an existing tab, but
 * the browser still navigates (reloads) it, which would wipe an in-progress
 * drawing or drop the camera stream.
 *
 * Fix: call window.open('', targetName) ourselves. Per spec, when a browsing
 * context with that name already exists and the url argument is the empty
 * string, no navigation happens at all - it just returns a reference to the
 * existing tab (which we then focus). Only a brand-new tab (still showing
 * about:blank) gets navigated to the real URL. This runs synchronously
 * inside the click handler, so it's a legitimate user-gesture popup and
 * won't be blocked by Safari (unlike a deferred/async open).
 */
(function () {
    function wireSmartLink(linkId) {
        const link = document.getElementById(linkId);
        if (!link) return;

        link.addEventListener('click', function (e) {
            const href = link.getAttribute('href');
            const targetName = link.getAttribute('target');
            // Disabled self-links have no href/target; let their no-op happen.
            if (!href || !targetName) return;

            e.preventDefault();
            const fullHref = link.href; // resolved absolute URL

            const win = window.open('', targetName);
            if (!win) return; // popup blocked; nothing more we can do

            if (win.location.href === 'about:blank') {
                win.location.href = fullHref;
            }
            win.focus();
        });
    }

    window.stuffedAnimalWarTabSync = {
        wireSmartLink: wireSmartLink
    };
})();
