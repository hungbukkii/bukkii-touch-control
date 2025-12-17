const btn = document.getElementById("assistive-touch");

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

    // // If not dragging, it's a click -> toggle switch
    // if (!isDragging) {
    //   window.electronAPI.send("simulate-switch");
    // }
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
});