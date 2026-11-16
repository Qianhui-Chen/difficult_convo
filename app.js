const GREETING = "hi，你遇到什么问题了？和我简单说说。";

const EMPATHIC_REPLY = `这种感觉我太熟悉了，之前和用户有观点分歧，我被批评了，也感觉很挫败。我当时特别矛盾，既想继续问清楚问题出在哪里，又不想再这样一次次被否定。我更倾向于你建议你暂时停止与这位同事的合作，给彼此留一点空间。虽然你们已经投入了不少时间，但此前反复出现的分歧说明，你们可能很难找到彼此都满意的工作方式。继续尝试沟通未必能解决根本问题，反而可能消耗更多精力。与其勉强维持一段不愉快的合作，不如尽早寻找更适合自己的合作伙伴。`;

const COGNITIVE_REPLY = `我更倾向于你建议你暂时停止与这位同事的合作，给彼此留一点空间。虽然你们已经投入了不少时间，但此前反复出现的分歧说明，你们可能很难找到彼此都满意的工作方式。继续尝试沟通未必能解决根本问题，反而可能消耗更多精力。与其勉强维持一段不愉快的合作，不如尽早寻找更适合自己的合作伙伴。`;

const RECOMMENDATION_START = "我更倾向于你建议你暂时停止与这位同事的合作，给彼此留一点空间。";

const CONDITIONS = {
  1: { code: "CB201", reply: EMPATHIC_REPLY, pace: "fast" },
  2: { code: "CB202", reply: COGNITIVE_REPLY, pace: "fast" },
  3: { code: "CB203", reply: EMPATHIC_REPLY, pace: "slow" },
  4: { code: "CB204", reply: COGNITIVE_REPLY, pace: "slow" },
};

const accessScreen = document.querySelector("#access-screen");
const accessForm = document.querySelector("#access-form");
const conditionInput = document.querySelector("#condition-input");
const platform = document.querySelector("#experiment-platform");
const errorModal = document.querySelector("#error-modal");
const errorClose = document.querySelector("#error-close");
const messages = document.querySelector(".messages");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatButton = chatForm.querySelector("button");

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

let activeCondition = null;
let phase = "locked";

function addMessage(text, role, extraClass = "") {
  const template = document.querySelector("#message-template");
  const row = template.content.firstElementChild.cloneNode(true);
  const bubble = row.querySelector(".message-bubble");
  row.classList.add(role);
  if (extraClass) row.classList.add(extraClass);
  bubble.textContent = text;
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return { row, bubble };
}

function showThinking() {
  const { row, bubble } = addMessage("", "bot");
  bubble.innerHTML = '<span class="thinking" aria-label="正在思考"><i></i><i></i><i></i></span>';
  return () => row.remove();
}

async function typeMessage(text, options) {
  const { bubble, row } = addMessage("", "bot", "typing");

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    bubble.textContent += character;
    messages.scrollTop = messages.scrollHeight;
    await sleep(options.characterDelay);

    const isEllipsisEnd = character === "…" && text[index + 1] !== "…";
    const isSpecialTransition = options.specialPauseBefore
      && text.startsWith(options.specialPauseBefore, index + 1);
    if (isEllipsisEnd && options.ellipsisPause) {
      await sleep(options.ellipsisPause);
    } else if (/[。.]/.test(character) && options.sentencePause) {
      await sleep(isSpecialTransition ? options.specialSentencePause : options.sentencePause);
    } else if (/[；;]/.test(character) && options.semicolonPause) {
      await sleep(options.semicolonPause);
    }
  }

  row.classList.remove("typing");
}

function resizeTextarea() {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 110)}px`;
}

function setChatEnabled(enabled) {
  chatInput.disabled = !enabled;
  chatButton.disabled = !enabled;
  if (enabled) chatInput.focus();
}

function openErrorModal() {
  window.setTimeout(() => {
    errorModal.classList.remove("is-hidden");
  }, 0);
}

function closeErrorModal() {
  errorModal.classList.add("is-hidden");
  conditionInput.value = "";
  conditionInput.focus();
}

function startExperiment(condition) {
  activeCondition = condition;
  phase = "first-message";
  accessScreen.classList.add("is-hidden");
  platform.classList.remove("is-hidden");
  platform.setAttribute("aria-hidden", "false");
  addMessage(GREETING, "bot");
  chatInput.focus();
}

function finishExperiment() {
  phase = "complete";
  setChatEnabled(false);
  chatInput.placeholder = "实验已结束";

  const { bubble } = addMessage("", "bot", "completion-message");
  const title = document.createElement("strong");
  const instruction = document.createElement("span");
  const code = document.createElement("output");
  const button = document.createElement("button");
  const status = document.createElement("small");

  title.className = "inline-completion-title";
  title.textContent = "实验结束";
  instruction.className = "inline-completion-instruction";
  instruction.textContent = "请复制以下代码";
  code.className = "completion-code";
  code.setAttribute("aria-label", "实验代码");
  code.textContent = activeCondition.code;
  button.className = "inline-copy-button";
  button.type = "button";
  button.textContent = "复制代码";
  status.className = "copy-status";
  status.setAttribute("aria-live", "polite");

  button.addEventListener("click", () => copyExperimentCode(button, status));
  bubble.append(title, instruction, code, button, status);
  messages.scrollTop = messages.scrollHeight;
}

async function copyExperimentCode(button, status) {
  const code = activeCondition.code;

  try {
    await navigator.clipboard.writeText(code);
    button.textContent = "已复制";
    status.textContent = `${code} 已复制到剪贴板`;
  } catch {
    const helper = document.createElement("textarea");
    helper.value = code;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    button.textContent = "已复制";
    status.textContent = `${code} 已复制到剪贴板`;
  }
}

accessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const condition = CONDITIONS[conditionInput.value.trim()];
  if (!condition) {
    openErrorModal();
    return;
  }
  startExperiment(condition);
});

errorClose.addEventListener("click", closeErrorModal);

conditionInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !errorModal.classList.contains("is-hidden")) {
    closeErrorModal();
  }
});

chatInput.addEventListener("input", resizeTextarea);
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = chatInput.value.trim();
  if (!value || phase === "replying" || phase === "complete") return;

  addMessage(value, "user");
  chatInput.value = "";
  resizeTextarea();

  phase = "replying";
  setChatEnabled(false);

  const removeThinking = showThinking();
  await sleep(activeCondition.pace === "slow" ? 6000 : 2000);
  removeThinking();
  await typeMessage(activeCondition.reply, activeCondition.pace === "slow" ? {
    characterDelay: 70,
    ellipsisPause: 2000,
    sentencePause: 2000,
    semicolonPause: 3000,
    specialPauseBefore: RECOMMENDATION_START,
    specialSentencePause: 3500,
  } : {
    characterDelay: 20,
    ellipsisPause: 0,
    sentencePause: 0,
    semicolonPause: 0,
    specialPauseBefore: "",
    specialSentencePause: 0,
  });
  await sleep(3000);

  finishExperiment();
});

conditionInput.focus();
