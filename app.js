const { jsPDF } = window.jspdf;

const MOUSE_UP = 0,
  MOUSE_DOWN = 1,
  MOUSE_DRAGGING = 2;

let bgColor = "white";
let color = "rgb(99, 48, 238)";

let cnvs = document.getElementById("canvas");
let scriptTextArea = document.getElementById("script");
let ctx = cnvs.getContext("2d");

let tools = document.querySelector("div#tools");
let boldSelectorList = document.querySelector(
  "div#tools div#bold-selection ul"
);
let boldSelectors = boldSelectorList.querySelectorAll("li");
let clearHint = document.querySelector("div#tools div#clear-hint");
let saveHint = document.querySelector("div#tools div#save-hint");
let nextHint = document.querySelector("div#tools div#next-hint");

let currentPage = 1;
let maxPage = 6;
let pages = document.querySelector("#pages");
let pageUpLabel = document.querySelector("#page-up");
let pageDownLabel = document.querySelector("#page-down");
let pageLabel = document.querySelector("#page");

let cover = document.querySelector("#cover");
let coverText = document.querySelector("#cover-text");

let cnvWidth = cnvs.clientWidth,
  cnvHeight = cnvs.clientHeight;
let clickFlg = MOUSE_UP;
let cnvBold = 1;

let touchStartX, touchStartY; // the start position when touched
let locked = false; // global canvas lock

// https://stackoverflow.com/questions/6902334/how-to-let-javascript-wait-until-certain-event-happens
function getPromiseFromEvent(item, event) {
  return new Promise((resolve) => {
    const listener = (e) => {
      e.stopPropagation();
      item.removeEventListener(event, listener);
      resolve();
    };
    item.addEventListener(event, listener);
  });
}

function getTimeoutPromiseFromEvent(item, event, timeLimit) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const listener = (e) => {
      e.stopPropagation();
      item.removeEventListener(event, listener);
      resolve(Date.now() - startTime);
    };
    item.addEventListener(event, listener);
    setTimeout(() => {
      item.removeEventListener(event, listener);
      resolve(Date.now() - startTime);
    }, timeLimit);
  });
}

class CnvStroke {
  constructor(bold, color) {
    this.bold = bold;
    this.color = color;
    this.points = [];
  }

  push(x, y) {
    this.points.push([x, y]);
  }

  copy() {
    const other = new CnvStroke(this.bold, this.color);
    for (const p of this.points) {
      other.push(p[0], p[1]);
    }
    return other;
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

  copy() {
    const other = new CnvRecord();
    for (const s of this.memory) {
      other.memory.push(s.copy());
    }
    return other;
  }
}

class Banners {
  constructor(bannerArray) {
    this.bannerArray = [...bannerArray];
  }

  async showOneBanner(idx) {
    coverText.innerHTML = this.bannerArray[idx];
    coverText.classList.add("show");
    await getPromiseFromEvent(coverText, "animationend");
    await getTimeoutPromiseFromEvent(cover, "click", 3000);
    coverText.classList.add("hide");
    coverText.classList.remove("show");
    await getPromiseFromEvent(coverText, "animationend");
    coverText.classList.remove("hide");
  }

  async showBanners() {
    if (
      cover.classList.contains("hide") ||
      cover.classList.contains("hidden") ||
      cover.classList.contains("none")
    ) {
      cover.classList.add("hidden");
      cover.classList.remove("none");
      cover.classList.add("show");
      cover.classList.remove("hidden");
      cover.classList.remove("hide");
      await getPromiseFromEvent(cover, "animationend");
    }
    for (let i = 0; i < this.bannerArray.length; i++) {
      await this.showOneBanner(i);
    }
    cover.classList.add("hide");
    await getPromiseFromEvent(cover, "animationend");
    cover.classList.remove("show");
    cover.classList.add("none");
    cover.classList.remove("hide");
  }
}

let cnvRecords = [],
  cnvBackups = [];
for (let i = 0; i <= maxPage; i++) {
  cnvRecords.push(new CnvRecord());
  cnvBackups.push(new CnvRecord());
}
let cnvRecord = cnvRecords[currentPage];

let ehonScripts = Array(maxPage + 1).fill("");

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
    if (locked) return;
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
    if (locked) return;
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
    if (locked) return;
    if (!("offsetX" in e)) {
      e.offsetX = e.touches[0].pageX - e.touches[0].target.offsetLeft;
      e.offsetY = e.touches[0].pageY - e.touches[0].target.offsetTop;
    }
    if (clickFlg) {
      draw(e.offsetX, e.offsetY);
    }
  });
}

scriptTextArea.addEventListener("change", (e) => {
  ehonScripts[currentPage] = scriptTextArea.value;
});

clearHint.addEventListener("click", (e) => {
  if (locked) return;
  // ctx.clearRect(0, 0, cnvWidth, cnvHeight);
  cnvRecords[currentPage] = cnvBackups[currentPage].copy();
  cnvRecord = cnvRecords[currentPage];
  cnvRecord.restore();
});

async function initFont() {
  let docHeight = cnvHeight + 30;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    hotfixes: ["px_scaling"],
    format: [cnvWidth, docHeight],
  });
  doc.addFont("SourceHanSansSC-VF.ttf", "HanSans", "normal");
  doc.setFont("HanSans", "normal");
}
initFont();

saveHint.addEventListener("click", (e) => {
  let nowPage = currentPage;
  let docHeight = cnvHeight + 30;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    hotfixes: ["px_scaling"],
    format: [cnvWidth, docHeight],
  });
  doc.addFont("SourceHanSansSC-VF.ttf", "HanSans", "normal");
  doc.setFont("HanSans", "normal");
  doc.setFontSize(15);
  flipPage(-999);
  for (let i = 1; i <= maxPage; i++) {
    let img = cnvs.toDataURL("image/png");
    doc.addImage(img, "PNG", 0, 0, cnvWidth, cnvHeight);
    doc.text(ehonScripts[i], 10, cnvHeight + 22);
    if (i != maxPage) {
      doc.addPage([cnvWidth, docHeight], "landscape");
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
  scriptTextArea.value = ehonScripts[newPage];
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
 * Random circle logic starts
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

/**
 * Random circle logic ends
 */

/*
async function waitForButtonClick() {
  const label = document.querySelector("#cover-text");
  label.innerText = "Waiting for you to press the button";
  let t = await getTimeoutPromiseFromEvent(label, "click", 3000);
  label.innerText = `The button was pressed after ${t} ms!`;
}
waitForButtonClick();
*/

function sleep(interval) {
  return new Promise((resolve) => setTimeout(resolve, interval));
}

// Array shuffle:　https://stackfame.com/5-ways-to-shuffle-an-array-using-moder-javascript-es6
// using Array sort and Math.random
const shuffleArr = (array) => array.sort(() => 0.5 - Math.random());

class MainController {
  constructor() {
    let magic = prompt("请输入魔法咒语！");
    if (magic === null) magic = "";
    this.magic = magic;
  }

  tutorialIntro() {
    scriptTextArea.classList.add("hidden");
    tools.classList.add("hidden");
    pages.classList.add("hidden");
    locked = true;
    const circleRecord = singleCircleLeft();
    circleRecord.restore(ctx);
    saveHint.classList.add("hidden");
    nextHint.classList.remove("hidden");
  }

  async birthdayIntro() {
    const banners = new Banners([
      "banner test 1",
      // "banner test 2",
      // "banner test 3",
    ]);
    await banners.showBanners();
  }

  async tutorialNormalIntro() {
    const banners = new Banners([
      "normal test 1",
      // "banner test 2",
      // "banner test 3",
    ]);
    await banners.showBanners();
  }

  async tutorialDrawingIntro() {
    const banners = new Banners(["drawing test 1"]);
    await banners.showBanners();
  }

  tutorialDrawing() {
    maxPage = 3;
    tools.classList.remove("hidden");
    pages.classList.remove("hidden");
    cnvRecord.restore(ctx);
    locked = false;
  }

  async tutorialFixingIntro() {
    const banners = new Banners(["fixing test 1"]);
    await banners.showBanners();
  }

  tutorialFixing() {
    maxPage = 6;
    let userRecords = cnvRecords.slice(1, 4);
    shuffleArr(userRecords).pop();
    for (let i = 0; i < 3; i++) userRecords.push(randomCircle());
    shuffleArr(userRecords);
    for (let i = 0; i < 5; i++) {
      userRecords[i].randomReflect();
    }
    userRecords.unshift(singleCircleLeft());
    userRecords.unshift(new CnvRecord());
    cnvBackups = userRecords;
    for (let i = 1; i <= 6; i++) {
      cnvRecords[i] = cnvBackups[i].copy();
    }
    flipPage(-999);
  }

  async tutorialScriptingIntro() {
    const banners = new Banners(["scripting test 1"]);
    await banners.showBanners();
  }

  tutorialScripting() {
    clearHint.classList.add("hidden");
    nextHint.classList.add("hidden");
    saveHint.classList.remove("hidden");
    scriptTextArea.classList.remove("hidden");
    locked = true;
    flipPage(-999);
  }

  async startBirthday() {
    this.tutorialIntro();
    await this.birthdayIntro();
    await sleep(1000);
    this.tutorialDrawingIntro();
    setTimeout(() => {
      this.tutorialDrawing();
    }, 1100);
    await getPromiseFromEvent(nextHint, "click");
    this.tutorialFixingIntro();
    setTimeout(() => {
      this.tutorialFixing();
    }, 1100);
    await getPromiseFromEvent(nextHint, "click");
    this.tutorialScriptingIntro();
    setTimeout(() => {
      this.tutorialScripting();
    }, 1100);
  }

  async startTutorial() {
    this.tutorialIntro();
    await this.tutorialNormalIntro();
    await sleep(1000);
    this.tutorialDrawingIntro();
    setTimeout(() => {
      this.tutorialDrawing();
    }, 1100);
    await getPromiseFromEvent(nextHint, "click");
    this.tutorialFixingIntro();
    setTimeout(() => {
      this.tutorialFixing();
    }, 1100);
    await getPromiseFromEvent(nextHint, "click");
    this.tutorialScriptingIntro();
    setTimeout(() => {
      this.tutorialScripting();
    }, 1100);
  }

  async free() {
    const banners = new Banners(["开始随心所欲地画画吧！"]);
    await banners.showBanners();
  }

  async start() {
    if (this.magic === "20230114") {
      this.startBirthday();
    } else if (this.magic === "helper") {
      this.startTutorial();
    } else {
      this.free();
    }
  }
}
const mainController = new MainController();
mainController.start();
