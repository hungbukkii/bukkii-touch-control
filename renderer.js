const btn = document.getElementById("assistive-touch");

let isDragging = false;
let startX, startY;
let ignoreLeave = false;

btn.addEventListener("mouseenter", () => {
  if (!ignoreLeave) {
    window.electronAPI.send("enable-interaction");
  }
});

btn.addEventListener("mouseleave", () => {
  if (!ignoreLeave) {
    window.electronAPI.send("disable-interaction");
  }
});

btn.addEventListener("mousedown", (e) => {
  isDragging = false;
  ignoreLeave = true; // Prevent disable during potential drag
  startX = e.screenX;
  startY = e.screenY;
  window.electronAPI.send("drag-start", { cursorX: startX, cursorY: startY });

  const onMouseMove = (e) => {
    if (Math.abs(e.screenX - startX) > 5 || Math.abs(e.screenY - startY) > 5) {
      isDragging = true;
    }
    window.electronAPI.send("dragging", { cursorX: e.screenX, cursorY: e.screenY });
  };

  const onMouseUp = (e) => {
    window.electronAPI.send("drag-end");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    ignoreLeave = false;
    // Disable interaction after mouse up
    window.electronAPI.send("disable-interaction");

    // If mouse is still over the button, re-enable
    const rect = btn.getBoundingClientRect();
    const mouseInBtn = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (mouseInBtn) {
      window.electronAPI.send("enable-interaction");
    }

    // If not dragging, it's a click -> toggle switch
    if (!isDragging) {
      window.electronAPI.send("simulate-switch");
    }
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
});

  // --- Update UI handling ---
  function showUpdateToast(message, withAction) {
    let toast = document.getElementById('update-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'update-toast';
      toast.style.position = 'fixed';
      toast.style.right = '20px';
      toast.style.bottom = '20px';
      toast.style.background = 'rgba(0,0,0,0.8)';
      toast.style.color = 'white';
      toast.style.padding = '10px 14px';
      toast.style.borderRadius = '6px';
      toast.style.zIndex = 99999;
      toast.style.fontSize = '13px';
      document.body.appendChild(toast);
    }
    toast.innerText = message;

    if (withAction) {
      const btn = document.createElement('button');
      btn.style.marginLeft = '8px';
      btn.style.padding = '4px 8px';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.innerText = withAction.label || 'Install';
      btn.onclick = () => {
        window.electronAPI.send('install-update');
      };
      toast.appendChild(btn);
    }

    // auto hide after 10s if no action
    if (!withAction) setTimeout(() => {
      const t = document.getElementById('update-toast');
      if (t) t.remove();
    }, 10000);
  }

  // Helper to show loading spinner and percent on the floating button
  function showLoadingPercent(percent) {
    const btn = document.getElementById('assistive-touch');
    if (!btn) return;

    // hide main svg icon visually
    const svg = btn.querySelector('svg');
    if (svg) svg.style.opacity = '0';

    // spinner
    let spinner = btn.querySelector('.spinner');
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.className = 'spinner';
      btn.appendChild(spinner);
    }

    // percentage text
    let ptext = btn.querySelector('.progress-text');
    if (!ptext) {
      ptext = document.createElement('div');
      ptext.className = 'progress-text';
      btn.appendChild(ptext);
    }

    // center text position
    ptext.style.width = '100%';
    ptext.style.left = '0';
    ptext.style.top = '50%';
    ptext.style.transform = 'translateY(-50%)';

    ptext.innerText = Math.max(0, Math.min(100, Math.floor(percent))) + '%';
    btn.classList.add('loading');
  }

  function clearLoadingIndicator(showBrief) {
    const btn = document.getElementById('assistive-touch');
    if (!btn) return;
    const svg = btn.querySelector('svg');
    if (svg) svg.style.opacity = '';
    const spinner = btn.querySelector('.spinner');
    const ptext = btn.querySelector('.progress-text');
    if (spinner) spinner.remove();
    if (ptext) ptext.remove();
    btn.classList.remove('loading');

    if (showBrief) {
      // flash a brief success ring for 1s
      btn.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.12)';
      setTimeout(() => { btn.style.boxShadow = ''; }, 800);
    }
  }

  // Wire update events from main
  if (window.electronAPI && window.electronAPI.onUpdate) {
    window.electronAPI.onUpdate('checking-for-update', () => {
      // show spinner at 0%
      showLoadingPercent(0);
    });
    window.electronAPI.onUpdate('update-available', (info) => {
      // keep spinner visible; show 0% when available
      showLoadingPercent(0);
    });
    window.electronAPI.onUpdate('download-progress', (p) => {
      const percent = p && p.percent ? Math.floor(p.percent) : 0;
      showLoadingPercent(percent);
    });
    window.electronAPI.onUpdate('update-downloaded', (info) => {
      // show 100% then clear and prompt install via toast/button
      showLoadingPercent(100);
      setTimeout(() => {
        clearLoadingIndicator(true);
        showUpdateToast('Update downloaded. Click to install now.', { label: 'Install' });
      }, 700);
    });
    window.electronAPI.onUpdate('update-error', (err) => {
      const msg = err && err.message ? err.message : (typeof err === 'string' ? err : 'Unknown error');
      // clear loading and show error toast
      clearLoadingIndicator();
      showUpdateToast('Update error: ' + msg);
    });
  }