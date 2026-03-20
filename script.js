const enter = document.getElementById("enter");
const app = document.getElementById("app");
const card = document.querySelector(".profile-card");

/* REVEAL */
if (enter && app) {
  let revealed = false;

  enter.addEventListener("click", () => {
    if (revealed) return;
    revealed = true;

    enter.classList.add("revealing");
    app.classList.remove("hidden");
    app.classList.remove("app-pre-enter");
    app.classList.add("app-entered");

    setTimeout(() => {
      enter.classList.add("hidden-enter");
    }, 380);
  });
}

const DISCORD_USER_ID = "1184191270248251512";

/* DISCORD + SPOTIFY */
async function getDiscordPresence() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
    const json = await res.json();

    if (!json.success) return;

    const data = json.data;

    updateDiscordStatus(data.discord_status);
    updateSpotifyBox(data);
    renderDiscordBadges();
  } catch (err) {
    console.error("Erro Lanyard:", err);
  }
}

/* SPOTIFY INLINE PLAYER HELPERS */
let spotifyInlineInterval = null;

function formatSpotifyTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function hideSpotifyInlinePlayer() {
  const inlinePlayer = document.getElementById("spotifyInlinePlayer");
  const inlineFill = document.getElementById("spotifyInlineFill");
  const inlineCurrent = document.getElementById("spotifyInlineCurrent");
  const inlineDuration = document.getElementById("spotifyInlineDuration");

  if (spotifyInlineInterval) {
    clearInterval(spotifyInlineInterval);
    spotifyInlineInterval = null;
  }

  if (inlinePlayer) inlinePlayer.style.display = "none";
  if (inlineFill) inlineFill.style.width = "0%";
  if (inlineCurrent) inlineCurrent.textContent = "0:00";
  if (inlineDuration) inlineDuration.textContent = "0:00";
}

function showSpotifyInlinePlayer(start, end) {
  const inlinePlayer = document.getElementById("spotifyInlinePlayer");
  const inlineFill = document.getElementById("spotifyInlineFill");
  const inlineCurrent = document.getElementById("spotifyInlineCurrent");
  const inlineDuration = document.getElementById("spotifyInlineDuration");

  if (!inlinePlayer || !inlineFill || !inlineCurrent || !inlineDuration) return;

  const total = end - start;
  if (total <= 0) {
    hideSpotifyInlinePlayer();
    return;
  }

  inlinePlayer.style.display = "block";

  function update() {
    const now = Date.now();
    const elapsed = Math.min(Math.max(now - start, 0), total);
    const percent = (elapsed / total) * 100;

    inlineFill.style.width = `${percent}%`;
    inlineCurrent.textContent = formatSpotifyTime(elapsed);
    inlineDuration.textContent = formatSpotifyTime(total);

    if (elapsed >= total && spotifyInlineInterval) {
      clearInterval(spotifyInlineInterval);
      spotifyInlineInterval = null;
    }
  }

  update();

  if (spotifyInlineInterval) {
    clearInterval(spotifyInlineInterval);
  }

  spotifyInlineInterval = setInterval(update, 250);
}

/* STATUS */
function updateDiscordStatus(status) {
  const dot = document.getElementById("discordStatus");
  if (!dot) return;

  dot.classList.remove(
    "status-online",
    "status-idle",
    "status-dnd",
    "status-offline"
  );

  dot.classList.add(`status-${status || "offline"}`);
}

/* BADGES */
function renderDiscordBadges() {
  const el = document.getElementById("discordBadges");
  if (!el) return;

  el.innerHTML = `
    <img class="discord-badge" src="assets/badges/Brilliance.png" alt="">
    <img class="discord-badge" src="assets/badges/Quests.png" alt="">
    <img class="discord-badge" src="assets/badges/Orbs.png" alt="">
  `;
}

/* SPOTIFY */
function updateSpotifyBox(data) {
  const song = document.getElementById("songName");
  const artist = document.getElementById("artistName");
  const cover = document.getElementById("albumCover");
  const desc = document.getElementById("musicDesc");
  const livePlayer = document.getElementById("spotifyLivePlayer");
  const headerText = document.getElementById("activityHeaderText");
  const spotifyOpenBtn = document.getElementById("spotifyOpenBtn");

  if (!song || !artist || !cover) return;

  const isPlaying = data && data.listening_to_spotify && data.spotify;

  if (isPlaying) {
    const spotify = data.spotify;

    song.textContent = spotify.song || "Tocando agora";
    artist.textContent = spotify.artist || "";

    if (desc) {
      desc.textContent = "";
    }

    if (headerText) {
      headerText.textContent = "OUVINDO NO SPOTIFY";
    }

    if (spotify.album_art_url) {
      cover.src = spotify.album_art_url;
      cover.style.display = "block";
    } else {
      cover.removeAttribute("src");
      cover.style.display = "none";
    }

    if (livePlayer) {
      livePlayer.style.display = "none";
    }

    if (spotifyOpenBtn) {
      spotifyOpenBtn.style.display = "inline-flex";
      if (spotify.track_id) {
        spotifyOpenBtn.href = `https://open.spotify.com/track/${spotify.track_id}`;
      } else {
        spotifyOpenBtn.href = "https://open.spotify.com/";
      }
    }

    localStorage.setItem("lastSong", JSON.stringify({
      name: spotify.song || "Tocando agora",
      artist: spotify.artist || "",
      cover: spotify.album_art_url || ""
    }));

    const start = spotify.timestamps?.start;
    const end = spotify.timestamps?.end;

    if (start && end) {
      showSpotifyInlinePlayer(start, end);
    } else {
      hideSpotifyInlinePlayer();
    }
  } else {
    hideSpotifyInlinePlayer();

    if (livePlayer) {
      livePlayer.style.display = "none";
    }

    if (headerText) {
      headerText.textContent = "ÚLTIMA ATIVIDADE";
    }

    if (spotifyOpenBtn) {
      spotifyOpenBtn.style.display = "none";
      spotifyOpenBtn.href = "#";
    }

    let lastSong = null;

    try {
      lastSong = JSON.parse(localStorage.getItem("lastSong") || "null");
    } catch (e) {
      lastSong = null;
    }

    if (lastSong) {
      song.textContent = lastSong.name || "Nada tocando";
      artist.textContent = lastSong.artist || "";

      if (desc) {
        desc.textContent = "Última música ouvida";
      }

      if (lastSong.cover) {
        cover.src = lastSong.cover;
        cover.style.display = "block";
      } else {
        cover.removeAttribute("src");
        cover.style.display = "none";
      }
    } else {
      song.textContent = "Nada tocando";
      artist.textContent = "";

      if (desc) {
        desc.textContent = "Última música ouvida";
      }

      cover.removeAttribute("src");
      cover.style.display = "none";
    }
  }
}

/* LOOP */
getDiscordPresence();
setInterval(getDiscordPresence, 15000);

/* TILT 3D */
if (card) {
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let currentScale = 1;
  let targetScale = 1;

  const maxRotate = 9;
  const lerp = 0.18;

  const controls = document.querySelectorAll(".links-row, .social-btn, .more-link");

  function animateTilt() {
    currentX += (targetX - currentX) * lerp;
    currentY += (targetY - currentY) * lerp;
    currentScale += (targetScale - currentScale) * lerp;

    card.style.transform = `
      translate3d(-50%, -50%, 0)
      perspective(1400px)
      rotateX(${currentX}deg)
      rotateY(${currentY}deg)
      scale3d(${currentScale}, ${currentScale}, ${currentScale})
    `;

    requestAnimationFrame(animateTilt);
  }

  function resetTilt() {
    targetX = 0;
    targetY = 0;
    targetScale = 1;
  }

  animateTilt();

  card.addEventListener("mouseenter", () => {
    card.classList.add("card-hovered");
  });

  card.addEventListener("mousemove", (e) => {
    const hoveringControls = e.target.closest(".links-row, .social-btn, .more-link, .links-divider");

    if (hoveringControls) {
      resetTilt();
      card.classList.remove("card-hovered");
      return;
    }

    card.classList.add("card-hovered");

    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const percentX = (x - centerX) / centerX;
    const percentY = (y - centerY) / centerY;

    targetY = percentX * maxRotate;
    targetX = -percentY * maxRotate;
    targetScale = 1.012;
  });

  card.addEventListener("mouseleave", () => {
    resetTilt();
    card.classList.remove("card-hovered");
  });

  controls.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      resetTilt();
      card.classList.remove("card-hovered");
    });

    el.addEventListener("mousemove", () => {
      resetTilt();
      card.classList.remove("card-hovered");
    });
  });
}

/* BACKGROUND SYMBOLS */
function createFloatingSymbols() {
  const container = document.getElementById("symbolBg");
  if (!container) return;

  container.innerHTML = "";

  const symbols = ["@", "#", "$", "%", "&", "*", "€", "¥", "₪", "₿", "+", "=", "~"];
  const amount = 99;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  for (let i = 0; i < amount; i++) {
    const el = document.createElement("span");
    el.className = `symbol ${Math.random() > 0.45 ? "layer-1" : "layer-2"}`;
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    let size;
    const rand = Math.random();

    if (rand < 0.65) {
      size = Math.random() * 20 + 18;
    } else if (rand < 0.9) {
      size = Math.random() * 28 + 32;
    } else {
      size = Math.random() * 30 + 40;
    }

    const x = Math.random() * vw;
    const y = Math.random() * vh;
    const duration = Math.random() * 18 + 26;
    const delay = Math.random() * -duration;
    const driftX = (Math.random() * 90 - 45).toFixed(1) + "px";
    const driftY = (Math.random() * 120 - 60).toFixed(1) + "px";
    const rotate = (Math.random() * 40 - 20).toFixed(1) + "deg";

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = `${size}px`;
    el.style.animation = `floatSymbol ${duration}s ease-in-out infinite`;
    el.style.animationDelay = `${delay}s`;
    el.style.setProperty("--drift-x", driftX);
    el.style.setProperty("--drift-y", driftY);
    el.style.setProperty("--rotate", rotate);

    container.appendChild(el);
  }
}

createFloatingSymbols();
window.addEventListener("resize", createFloatingSymbols);