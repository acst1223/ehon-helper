const MOUSE_UP = 0,
  MOUSE_DOWN = 1,
  MOUSE_DRAGGING = 2;

let bgColor = "white";

let cnvs = document.getElementById("canvas");
let ctx = cnvs.getContext("2d");
let boldSelectorList = document.querySelector(
  "div#tools div#bold-selection ul"
);
let boldSelectors = boldSelectorList.querySelectorAll("li");
let clearHint = document.querySelector("div#tools div#clear-hint");

let cnvWidth = cnvs.clientWidth,
  cnvHeight = cnvs.clientHeight;
let clickFlg = MOUSE_UP;
let cnvBold = 1;

function initBoldSelector() {
  boldSelectors.forEach((s, i) => {
    let b = Number(s.getAttribute("bold"));
    s.addEventListener("click", (e) => {
      s.classList.add("on");
      boldSelectors.forEach((other, j) => {
        if (i != j) {
          other.classList.remove("on");
        }
      });
      cnvBold = b;
    });
  });
}
initBoldSelector();

function setBgColor() {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cnvWidth, cnvHeight);
}

function draw(x, y) {
  ctx.lineWidth = cnvBold;
  ctx.strokeStyle = "rgb(99, 48, 238)";
  // 初回処理の判定
  if (clickFlg == MOUSE_DOWN) {
    clickFlg = MOUSE_DRAGGING;
    ctx.beginPath();
    ctx.lineCap = "round"; //　線を角丸にする
    ctx.moveTo(x, y);
  } else {
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

for (const ev of ["mousedown", "touchstart"]) {
  cnvs.addEventListener(ev, (e) => {
    e.preventDefault();
    clickFlg = MOUSE_DOWN;
    clearHint.innerHTML = clickFlg;
  });
}
for (const ev of ["mouseup", "touchend", "touchleave", "touchcancel"]) {
  cnvs.addEventListener(ev, (e) => {
    e.preventDefault();
    clickFlg = MOUSE_UP;
    clearHint.innerHTML = clickFlg;
  });
}
for (const ev of ["mousemove", "touchmove"]) {
  cnvs.addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === "touchmove") {
      e.offsetX = e.touches[0].pageX - e.touches[0].target.offsetLeft;
      e.offsetY = e.touches[0].pageY - e.touches[0].target.offsetTop;
    }
    if (clickFlg) {
      draw(e.offsetX, e.offsetY);
      clearHint.innerHTML = clickFlg + e.offsetX + "," + e.offsetY;
    }
  });
}

clearHint.addEventListener("click", (e) => {
  ctx.clearRect(0, 0, cnvWidth, cnvHeight);
  setBgColor();
});
