const form = document.getElementById('chatForm');
const chat = document.getElementById('chat');
const textarea = document.getElementById('user_input');
const micToggle = document.getElementById("micToggle");
const statusText = document.getElementById("statusText");
const voiceIndicator = document.getElementById("voiceIndicator");

let recognition = null;
let currentAudio = null;
let buffer = '';
let isListening = false;
let isResponding = false;

if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    isListening = true;
    statusText.textContent = "🎧 Listening...";
    micToggle.textContent = "⏹️ Stop Listening";
  };

  recognition.onend = () => {
    isListening = false;
    statusText.textContent = "⏹️ Mic stopped.";
    micToggle.textContent = "🎙️ Start Listening";
  };

  recognition.onerror = (e) => {
    statusText.textContent = "❌ " + e.error;
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        buffer = transcript.trim();
        submitMessage(buffer);
      } else {
        interimTranscript += transcript;
      }
    }
    textarea.value = buffer + interimTranscript;
  };
} else {
  statusText.textContent = "Speech recognition not supported!";
  micToggle.disabled = true;
}

micToggle.onclick = () => {
  if (isListening) {
    recognition?.stop();
  } else {
    recognition?.start();
  }
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  recognition?.stop();
  await submitMessage(textarea.value.trim());
  recognition?.start();
});

async function submitMessage(message) {
  if (!message) return;

  buffer = '';
  textarea.value = '';

  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.textContent = message;
  chat.appendChild(userDiv);
  chat.scrollTop = chat.scrollHeight;

  isResponding = true;

  const typingDiv = document.createElement("div");
  typingDiv.className = "message groq";
  typingDiv.textContent = "Typing...";
  chat.appendChild(typingDiv);
  chat.scrollTop = chat.scrollHeight;

  const response = await fetch("/", {
    method: "POST",
    body: new URLSearchParams({ user_input: message })
  });

  const data = await response.json();
  typingDiv.remove();

  const groqDiv = document.createElement("div");
  groqDiv.className = "message groq";
  groqDiv.textContent = data.reply;
  chat.appendChild(groqDiv);
  chat.scrollTop = chat.scrollHeight;

  if (data.audio) {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(data.audio);
    voiceIndicator.classList.remove("hidden");
    currentAudio.play().catch(err => console.warn("🔇 Audio error:", err));
    currentAudio.onended = () => {
      voiceIndicator.classList.add("hidden");
      isResponding = false;
    };
  } else {
    isResponding = false;
    voiceIndicator.classList.add("hidden");
  }
}
