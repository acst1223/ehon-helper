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

cnvs.addEventListener("touchstart", function (e) {
  e.preventDefault();
});
cnvs.addEventListener("touchmove", function (e) {
  e.preventDefault();
});
cnvs.addEventListener("touchend", function (e) {
  e.preventDefault();
});
cnvs.addEventListener("touchcancel", function (e) {
  e.preventDefault();
});
cnvs.addEventListener("mousedown", (e) => {
  clickFlg = MOUSE_DOWN;
});
cnvs.addEventListener("mouseup", (e) => {
  clickFlg = MOUSE_UP;
});
cnvs.addEventListener("mousemove", (e) => {
  if (clickFlg) {
    draw(e.offsetX, e.offsetY);
  }
});

clearHint.addEventListener("click", (e) => {
  ctx.clearRect(0, 0, cnvWidth, cnvHeight);
  setBgColor();
});
