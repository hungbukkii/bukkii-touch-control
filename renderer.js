const btn = document.getElementById("assistive-touch");
const menu = document.getElementById("menu");
const btnSwitch = document.getElementById("btn-switch");
const btnClose = document.getElementById("btn-close");

let isOpen = false;
let isDragging = false;
let startX, startY;

btn.addEventListener("mousedown", (e) => {
  isDragging = false;
  startX = e.screenX;
  startY = e.screenY;
  window.electronAPI.send("drag-start", { cursorX: startX, cursorY: startY });

  const onMouseMove = (e) => {
    if (Math.abs(e.screenX - startX) > 5 || Math.abs(e.screenY - startY) > 5) {
      isDragging = true;
    }
    window.electronAPI.send("dragging", { cursorX: e.screenX, cursorY: e.screenY });
  };

  const onMouseUp = () => {
    window.electronAPI.send("drag-end");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    if (!isDragging) {
      toggleMenu();
    }
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
});

// Toggle interactions
btnSwitch.addEventListener("click", () => {
  window.electronAPI.send("simulate-switch");
  // Don't toggle menu immediately, let user see the Alt+Tab list
});

btnClose.addEventListener("click", () => {
  // Ensure we release Alt if we close the menu
  window.electronAPI.send("switch-hold-end");
  toggleMenu();
});

menu.addEventListener("click", (e) => {
  if (e.target === menu) {
    // Background click closes menu and releases Alt
    window.electronAPI.send("switch-hold-end");
    toggleMenu();
  }
});

function toggleMenu() {
  isOpen = !isOpen;
  if (isOpen) {
    btn.classList.add("hidden");
    menu.classList.remove("hidden");
    window.electronAPI.send("resize-window", { width: 220, height: 220 });
  } else {
    btn.classList.remove("hidden");
    menu.classList.add("hidden");
    window.electronAPI.send("resize-window", { width: 60, height: 60 });
  }
}