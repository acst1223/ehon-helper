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

  reflectX() {
    for (const s of this.memory) {
      if (s.points.length == 0) continue;
      else {
        for (const p of s.points) {
          p[0] = cnvWidth - 1 - p[0];
        }
      }
    }
  }

  reflectY() {
    for (const s of this.memory) {
      if (s.points.length == 0) continue;
      else {
        for (const p of s.points) {
          p[1] = cnvHeight - 1 - p[1];
        }
      }
    }
  }

  randomReflectX() {
    const reflect = Math.floor(Math.random() * 2);
    if (reflect == 1) {
      this.reflectX();
    }
  }

  randomReflectY() {
    const reflect = Math.floor(Math.random() * 2);
    if (reflect == 1) {
      this.reflectY();
    }
  }

  randomReflect() {
    this.randomReflectX();
    this.randomReflectY();
  }

  duplicateX() {
    const l = this.memory.length;
    for (let i = 0; i < l; i++) {
      const s = this.memory[i];
      if (s.points.length == 0) continue;
      else {
        const newStroke = new CnvStroke(s.bold, s.color);
        for (const p of s.points) {
          newStroke.push(cnvWidth - 1 - p[0], p[1]);
        }
        this.memory.push(newStroke);
      }
    }
  }

  duplicateY() {
    const l = this.memory.length;
    for (let i = 0; i < l; i++) {
      const s = this.memory[i];
      if (s.points.length == 0) continue;
      else {
        const newStroke = new CnvStroke(s.bold, s.color);
        for (const p of s.points) {
          newStroke.push(p[0], cnvHeight - 1 - p[1]);
        }
        this.memory.push(newStroke);
      }
    }
  }

  randomDuplicateX() {
    const duplicate = Math.floor(Math.random() * 2);
    if (duplicate == 1) {
      this.duplicateX();
    }
  }

  randomDuplicateY() {
    const duplicate = Math.floor(Math.random() * 2);
    if (duplicate == 1) {
      this.duplicateY();
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

function d2r(d) {
  return Math.floor((d + 1) / 2);
}

function r2d(r) {
  return r * 2 - 1;
}

/**
 * Random circle logic
 */
const CIRCLE_MIN_R = 12,
  CIRCLE_STD_R = 63,
  CIRCLE_MAX_R = 126;
const CIRCLE_MIN_D = CIRCLE_MIN_R * 2 - 1,
  CIRCLE_STD_D = CIRCLE_STD_R * 2 - 1,
  CIRCLE_MAX_D = CIRCLE_MAX_R * 2 - 1;
let oneThirdX = Math.floor(cnvWidth / 3),
  twoThirdsX = cnvWidth - oneThirdX,
  centerY = Math.floor(cnvHeight / 2);

function randInt(minInt, maxInt) {
  return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
}

function randomD() {
  return randInt(CIRCLE_MIN_D, CIRCLE_MAX_D);
}

function overlap(circleStroke1, circleStroke2) {
  const c1 = circleStroke1.points[0],
    c2 = circleStroke2.points[0];
  const c1x = c1[0],
    c1y = c1[1],
    c2x = c2[0],
    c2y = c2[1];
  const r1 = d2r(circleStroke1.bold),
    r2 = d2r(circleStroke2.bold);
  return (c2x - c1x) ** 2 + (c2y - c1y) ** 2 < (r1 + r2) ** 2;
}

function getCircle(x, y, r) {
  const circle = new CnvRecord();
  circle.newEdge(x, y, r2d(r), color);
  return circle;
}

function randomInsideCircle(r) {
  if (r === undefined) r = randInt(CIRCLE_MIN_R, CIRCLE_MAX_R);
  const x = randInt(r, cnvWidth - r);
  const y = randInt(r, cnvHeight - r);
  const circle = new CnvRecord();
  circle.newEdge(x, y, r2d(r), color);
  return circle;
}

function randomFreeCircle(r) {
  if (r === undefined) r = randInt(CIRCLE_MIN_R, CIRCLE_MAX_R);
  const x = randInt(-r + 1, cnvWidth + r - 2);
  const y = randInt(-r + 1, cnvHeight + r - 2);
  const circle = new CnvRecord();
  circle.newEdge(x, y, r2d(r), color);
  return circle;
}

function randomInsideCircleNonOverlap(currentCircleRecord, newCircleRadius) {
  while (true) {
    const newCircle = randomInsideCircle(newCircleRadius);
    let overlapped = false;
    for (const s of currentCircleRecord.memory) {
      if (overlap(s, newCircle.memory[0])) {
        overlapped = true;
        break;
      }
    }
    if (!overlapped) return newCircle;
  }
}

function singleCircleLeft() {
  const circle = new CnvRecord();
  circle.newEdge(oneThirdX, centerY, CIRCLE_STD_D, color);
  return circle;
}

function singleCircleRight() {
  const circle = singleCircleLeft();
  circle.reflectX();
  return circle;
}

function doubleCircle() {
  const circle = singleCircleLeft();
  circle.duplicateX();
  return circle;
}

function singleRandomCircleLeftRight() {
  const circle = new CnvRecord();
  const d = randomD();
  circle.newEdge(oneThirdX, centerY, d, color);
  circle.randomReflectX();
  return circle;
}

function randomCircle() {
  p = Math.random();
  // p = 0.98; // for testing
  if (p >= 0 && p < 0.05) {
    return singleCircleLeft();
  } else if (p >= 0.05 && p < 0.1) {
    return singleCircleRight();
  } else if (p >= 0.1 && p < 0.15) {
    return doubleCircle();
  } else if (p >= 0.15 && p < 0.2) {
    return singleRandomCircleLeftRight();
  } else if (p >= 0.2 && p < 0.3) {
    if (p < 0.25) return randomInsideCircle();
    else return randomFreeCircle();
  } else if (p >= 0.3 && p < 0.4) {
    const c = singleCircleLeft();
    c.memory.push(randomInsideCircleNonOverlap(c, CIRCLE_STD_R).memory[0]);
    c.randomReflectX();
    return c;
  } else if (p >= 0.4 && p < 0.6) {
    if (p < 0.5) {
      const c = randomInsideCircle(CIRCLE_STD_R);
      c.memory.push(randomInsideCircle(CIRCLE_STD_R).memory[0]);
      return c;
    } else {
      const c = randomFreeCircle();
      c.memory.push(randomFreeCircle().memory[0]);
      return c;
    }
  } else if (p >= 0.6 && p < 0.9) {
    let circleNumber = 0;
    if (p < 0.8) {
      circleNumber = randInt(3, 5);
    } else {
      circleNumber = randInt(6, 10);
    }
    const c = new CnvRecord();
    for (let i = 0; i < circleNumber; i++)
      c.memory.push(randomInsideCircleNonOverlap(c).memory[0]);
    return c;
  } else if (p >= 0.9 && p < 0.95) {
    const r = randInt(CIRCLE_MIN_R, CIRCLE_MAX_R);
    const interval = Math.floor(r * 2.2);
    const centersX = [oneThirdX];
    let currentCenterX = oneThirdX + interval;
    while (currentCenterX - r < cnvWidth) {
      centersX.push(currentCenterX);
      currentCenterX += interval;
    }
    currentCenterX = oneThirdX - interval;
    while (currentCenterX + r >= 0) {
      centersX.push(currentCenterX);
      currentCenterX -= interval;
    }
    const c = new CnvRecord();
    for (const centerX of centersX)
      c.memory.push(getCircle(centerX, centerY, r).memory[0]);
    c.randomReflectX();
    return c;
  } else {
    const r = randInt(CIRCLE_MIN_R, CIRCLE_MAX_R);
    const c = getCircle(0, 0, r);
    c.randomDuplicateX();
    c.randomDuplicateY();
    c.randomReflectX();
    c.randomReflectY();
    return c;
  } // p >= 0.95 && p < 1
}
