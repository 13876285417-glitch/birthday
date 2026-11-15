(() => {
  const STORAGE_KEY = "birthdayTreasureV1";
  const content = window.BIRTHDAY_CONTENT || {};
  const defaultState = {
    page: "home", letterOpened: false, memories: [false, false, false],
    puzzlePassed: false, selectedAnswer: null, stars: [false, false, false], giftOpened: false
  };
  const cloneDefault = () => JSON.parse(JSON.stringify(defaultState));
  let state = loadState();
  let modalCallback = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const backgroundMusic = $("#backgroundMusic");
  const giftBell = $("#giftBell");

  // 在首页“开始冒险”的用户点击中启动；音频节点常驻页面，切页时不会重置。
  function startBackgroundMusic() {
    if (!backgroundMusic) return;
    backgroundMusic.volume = 0.25;
    backgroundMusic.loop = true;
    if (backgroundMusic.paused) {
      const playRequest = backgroundMusic.play();
      if (playRequest && typeof playRequest.catch === "function") {
        playRequest.catch(() => {});
      }
    }
  }

  // 礼物首次打开时播放一次轻柔铃声。
  function playGiftBell() {
    if (!giftBell) return;
    giftBell.volume = 0.55;
    giftBell.currentTime = 0;
    const playRequest = giftBell.play();
    if (playRequest && typeof playRequest.catch === "function") {
      playRequest.catch(() => {});
    }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? { ...cloneDefault(), ...saved } : cloneDefault();
    } catch { return cloneDefault(); }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function showPage(page) {
    const target = $(`.scene[data-page="${page}"]`);
    if (!target) return;
    $$(".scene").forEach(scene => {
      const active = scene === target;
      scene.classList.toggle("active", active);
      scene.setAttribute("aria-hidden", String(!active));
    });
    state.page = page;
    saveState();
    window.scrollTo(0, 0);
    render();
  }
  function openModal(title, body, callback) {
    $("#modalTitle").textContent = title;
    $("#modalBody").textContent = body;
    modalCallback = callback || null;
    $("#modal").classList.remove("hidden");
  }
  function closeModal() {
    $("#modal").classList.add("hidden");
    if (modalCallback) modalCallback();
    modalCallback = null;
  }
  function applyContent() {
    if (content.memories) {
      content.memories.forEach((item, i) => {
        const label = $(`[data-memory-label="${i}"]`);
        if (label) label.textContent = item.label;
      });
    }
    if (content.question) $("#quizQuestion").textContent = content.question;
    if (content.options) {
      content.options.forEach(option => {
        const label = $(`[data-option-label="${option.key}"]`);
        if (label) label.textContent = option.text;
      });
    }
    if (content.birthdayTitle) $("#birthdayTitle").textContent = content.birthdayTitle;
    if (content.birthdayParagraphs) {
      const wrap = $("#birthdayParagraphs");
      wrap.replaceChildren();
      content.birthdayParagraphs.forEach(line => {
        const p = document.createElement("p");
        p.textContent = line;
        wrap.appendChild(p);
      });
    }
    if (content.signature) $("#birthdaySignature").textContent = content.signature;
  }

  function render() {
    $("#memoryCount").textContent = state.memories.filter(Boolean).length;
    $("#starCount").textContent = state.stars.filter(Boolean).length;

    $$(".memory-item").forEach((item, i) => {
      item.classList.toggle("found", !!state.memories[i]);
      item.setAttribute("aria-pressed", String(!!state.memories[i]));
    });
    $("#toPuzzleBtn").disabled = !state.memories.every(Boolean);

    $$(".wish-star").forEach((button, i) => {
      const on = !!state.stars[i];
      button.querySelector("img").src = on ? "assets/props/star-on.png" : "assets/props/star-off.png";
      button.setAttribute("aria-pressed", String(on));
    });
    $("#toTreasureBtn").disabled = !state.stars.every(Boolean);

    if (state.letterOpened) {
      $("#envelopeArt").src = "assets/props/envelope-open.png";
      $("#letterText").classList.remove("hidden");
      $("#openLetterBtn").classList.add("hidden");
      $("#toMemoryBtn").classList.remove("hidden");
    }
    if (state.puzzlePassed) {
      $("#puzzleFeedback").textContent = "暗号正确！小锁打开啦。";
      $("#submitAnswerBtn").classList.add("hidden");
      $("#toWishesBtn").classList.remove("hidden");
      $$('.answer[data-answer="B"]').forEach(el => el.classList.add("correct"));
    }
    if (state.giftOpened) {
      $("#giftArt").src = "assets/photos/treasure-necklace.jpg";
      $("#giftArt").alt = "送给你的项链礼物";
      $("#giftArt").classList.add("revealed-art");
      $("#giftHint").textContent = "这条项链，送给特别的你";
      $("#birthdayLetter").classList.remove("hidden");
      $("#restartBtn").classList.remove("hidden");
    }
  }

  $$("[data-go]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.go === "letter" && state.page === "home") {
      startBackgroundMusic();
    }
    showPage(button.dataset.go);
  }));
  $$("[data-back]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.back)));

  $("#openLetterBtn").addEventListener("click", () => {
    state.letterOpened = true; saveState(); render();
  });
  $("#toPuzzleBtn").addEventListener("click", () => {
    if (state.memories.every(Boolean)) showPage("puzzle");
  });
  $("#toWishesBtn").addEventListener("click", () => {
    if (state.puzzlePassed) showPage("wishes");
  });
  $("#toTreasureBtn").addEventListener("click", () => {
    if (state.stars.every(Boolean)) showPage("treasure");
  });

  $$(".memory-item").forEach((item, i) => {
    item.addEventListener("click", () => {
      if (state.memories[i]) {
        openModal("这枚回忆已经收好啦", content.memories[i].detail);
        return;
      }
      state.memories[i] = true;
      saveState(); render();
      openModal("找到一枚记忆碎片", content.memories[i].detail);
    });
  });

  $$(".answer").forEach(button => button.addEventListener("click", () => {
    if (state.puzzlePassed) return;
    state.selectedAnswer = button.dataset.answer;
    $$(".answer").forEach(item => item.classList.toggle("selected", item === button));
    saveState();
  }));
  $("#submitAnswerBtn").addEventListener("click", () => {
    if (!state.selectedAnswer) {
      $("#puzzleFeedback").textContent = "先选一个你觉得正确的答案吧。";
      return;
    }
    if (state.selectedAnswer === content.correctAnswer) {
      state.puzzlePassed = true; saveState(); render();
    } else {
      $("#puzzleFeedback").textContent = "差一点点，再想想你们之间的小默契。";
    }
  });

  $$(".wish-star").forEach((button, i) => button.addEventListener("click", () => {
    if (state.stars[i]) {
      openModal("这颗星星已经亮起来啦", content.wishes[i]);
      return;
    }
    state.stars[i] = true; saveState(); render();
    openModal("一份星星里的祝福", content.wishes[i]);
  }));

  $("#giftBtn").addEventListener("click", () => {
    if (state.giftOpened) return;
    playGiftBell();
    state.giftOpened = true; saveState(); render();
  });
  $("#restartBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = cloneDefault();
    showPage("home");
    $("#envelopeArt").src = "assets/props/envelope-closed.png";
    $("#letterText").classList.add("hidden");
    $("#openLetterBtn").classList.remove("hidden");
    $("#toMemoryBtn").classList.add("hidden");
    $("#puzzleFeedback").textContent = "";
    $$(".answer").forEach(el => el.classList.remove("selected", "correct"));
    $("#submitAnswerBtn").classList.remove("hidden");
    $("#toWishesBtn").classList.add("hidden");
    $("#birthdayLetter").classList.add("hidden");
    $("#restartBtn").classList.add("hidden");
    $("#giftArt").src = "assets/props/gift-closed.png";
    $("#giftArt").alt = "还未打开的生日礼物盒";
    $("#giftArt").classList.remove("revealed-art");
    $("#giftHint").textContent = "点击礼物盒，看看里面藏着什么";
    render();
  });

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalOk").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", event => {
    if (event.target === $("#modal")) closeModal();
  });

  applyContent();

  // Resume the last unlocked scene after refresh.
  const validPages = ["home", "letter", "memory", "puzzle", "wishes", "treasure"];
  showPage(validPages.includes(state.page) ? state.page : "home");
  render();
})();