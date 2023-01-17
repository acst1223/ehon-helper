const MOUSE_UP = 0,
  MOUSE_DOWN = 1,
  MOUSE_DRAGGING = 2;

let bgColor = "white";
let color = "rgb(99, 48, 238)";

let cnvs = document.getElementById("canvas");
let ctx = cnvs.getContext("2d");
let boldSelectorList = document.querySelector(
  "div#tools div#bold-selection ul"
);
let boldSelectors = boldSelectorList.querySelectorAll("li");
let clearHint = document.querySelector("div#tools div#clear-hint");
let saveHint = document.querySelector("div#tools div#save-hint");

let currentPage = 1;
let maxPage = 6;
let pageUpLabel = document.querySelector("#page-up");
let pageDownLabel = document.querySelector("#page-down");
let pageLabel = document.querySelector("#page");

let cnvWidth = cnvs.clientWidth,
  cnvHeight = cnvs.clientHeight;
let clickFlg = MOUSE_UP;
let cnvBold = 1;

let touchStartX, touchStartY; // the start position when touched

class CnvStroke {
  constructor(bold, color) {
    this.bold = bold;
    this.color = color;
    this.points = [];
  }

  push(x, y) {
    this.points.push([x, y]);
  }
}

class CnvRecord {
  constructor() {
    this.memory = [];
  }

  // start a new edge or point
  newEdge(x, y, bold, color) {
    this.memory.push(new CnvStroke(bold, color));
    this.memory[this.memory.length - 1].push(x, y);
  }

  continueEdge(x, y) {
    this.memory[this.memory.length - 1].push(x, y);
  }

  clear() {
    this.memory = [];
  }

  setBgColor(ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cnvWidth, cnvHeight);
  }

  restore(ctx) {
    self.setBgColor(ctx);
    for (const s of this.memory) {
      if (s.points.length == 0) {
        continue;
      } else if (s.points.length == 1) {
        let x = s.points[0][0],
          y = s.points[0][1];
        ctx.beginPath();
        let r = Math.floor((s.bold + 1) / 2);
        ctx.arc(x, y, r, 0, Math.PI * 2, true);
        ctx.fillStyle = s.color;
        ctx.fill();
      } else {
        ctx.lineWidth = s.bold;
        ctx.strokeStyle = s.color;
        ctx.beginPath();
        for (let i = 0; i < s.points.length; i++) {
          let x = s.points[i][0],
            y = s.points[i][1];
          if (i == 0) {
            ctx.lineCap = "round"; //　線を角丸にする
            ctx.lineJoin = "round";
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    }
  }
}

let cnvRecords = [];
for (let i = 0; i <= maxPage; i++) {
  cnvRecords.push(new CnvRecord());
}
let cnvRecord = cnvRecords[currentPage];

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
  ctx.strokeStyle = color;
  // 初回処理の判定
  if (clickFlg == MOUSE_DOWN) {
    clickFlg = MOUSE_DRAGGING;
    ctx.beginPath();
    ctx.lineCap = "round"; //　線を角丸にする
    ctx.lineJoin = "round";
    ctx.moveTo(x, y);
    cnvRecord.newEdge(x, y, cnvBold, color);
  } else {
    ctx.lineTo(x, y);
    cnvRecord.continueEdge(x, y);
  }
  ctx.stroke();
}

for (const ev of ["mousedown", "touchstart"]) {
  cnvs.addEventListener(ev, (e) => {
    e.preventDefault();
    clickFlg = MOUSE_DOWN;

    if (e.type === "touchstart") {
      touchStartX = e.touches[0].pageX - e.touches[0].target.offsetLeft;
      touchStartY = e.touches[0].pageY - e.touches[0].target.offsetTop;
    }
  });
}
for (const ev of ["mouseup", "touchend", "touchleave", "touchcancel"]) {
  cnvs.addEventListener(ev, (e) => {
    e.preventDefault();
    if (clickFlg == MOUSE_DOWN) {
      if (!("offsetX" in e)) {
        e.offsetX = touchStartX;
        e.offsetY = touchStartY;
      }
      ctx.beginPath();
      let r = Math.floor((cnvBold + 1) / 2);
      ctx.arc(e.offsetX, e.offsetY, r, 0, Math.PI * 2, true);
      ctx.fillStyle = color;
      ctx.fill();
      cnvRecord.newEdge(e.offsetX, e.offsetY, cnvBold, color);
    }
    clickFlg = MOUSE_UP;
  });
}
for (const ev of ["mousemove", "touchmove"]) {
  cnvs.addEventListener(ev, (e) => {
    e.preventDefault();
    if (!("offsetX" in e)) {
      e.offsetX = e.touches[0].pageX - e.touches[0].target.offsetLeft;
      e.offsetY = e.touches[0].pageY - e.touches[0].target.offsetTop;
    }
    if (clickFlg) {
      draw(e.offsetX, e.offsetY);
    }
  });
}

clearHint.addEventListener("click", (e) => {
  ctx.clearRect(0, 0, cnvWidth, cnvHeight);
  setBgColor();
  cnvRecord.clear();
});

saveHint.addEventListener("click", (e) => {
  const { jsPDF } = window.jspdf;
  let nowPage = currentPage;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    hotfixes: ["px_scaling"],
    format: [cnvWidth, cnvHeight],
  });
  flipPage(-999);
  for (let i = 1; i <= maxPage; i++) {
    let img = cnvs.toDataURL("image/png");
    doc.addImage(img, "PNG", 0, 0, cnvWidth, cnvHeight);
    if (i != maxPage) {
      doc.addPage([cnvWidth, cnvHeight], "landscape");
      flipPage(1);
    }
  }
  flipPage(nowPage - maxPage);
  doc.save("ehon.pdf");
});

function flipPage(offset) {
  let newPage = currentPage + offset;
  if (newPage <= 1) {
    newPage = 1;
    pageDownLabel.classList.add("disabled");
    pageUpLabel.classList.remove("disabled");
  } else if (newPage >= maxPage) {
    newPage = maxPage;
    pageUpLabel.classList.add("disabled");
    pageDownLabel.classList.remove("disabled");
  } else {
    pageUpLabel.classList.remove("disabled");
    pageDownLabel.classList.remove("disabled");
  }
  pageLabel.innerHTML = String(newPage);
  cnvRecord = cnvRecords[newPage];
  cnvRecord.restore(ctx);
  currentPage = newPage;
}

pageDownLabel.addEventListener("click", (e) => {
  if (pageDownLabel.classList.contains("disabled")) return;
  flipPage(-1);
});

pageUpLabel.addEventListener("click", (e) => {
  if (pageUpLabel.classList.contains("disabled")) return;
  flipPage(1);
});
