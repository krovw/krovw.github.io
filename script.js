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

let lanyardSocket = null;
let lanyardHeartbeat = null;

function applyPresenceData(data) {
  if (!data) return;

  updateDiscordStatus(data.discord_status);
  updateSpotifyBox(data);
  renderDiscordBadges();
}

function connectLanyardSocket() {
  if (lanyardSocket && lanyardSocket.readyState === WebSocket.OPEN) return;

  lanyardSocket = new WebSocket("wss://api.lanyard.rest/socket");

  lanyardSocket.onmessage = (event) => {
    const payload = JSON.parse(event.data);

    // Hello
    if (payload.op === 1) {
      const interval = payload.d.heartbeat_interval;

      if (lanyardHeartbeat) {
        clearInterval(lanyardHeartbeat);
      }

      lanyardHeartbeat = setInterval(() => {
        if (lanyardSocket && lanyardSocket.readyState === WebSocket.OPEN) {
          lanyardSocket.send(JSON.stringify({ op: 3 }));
        }
      }, interval);

      lanyardSocket.send(JSON.stringify({
        op: 2,
        d: {
          subscribe_to_id: DISCORD_USER_ID
        }
      }));

      return;
    }

    if (payload.t === "INIT_STATE" || payload.t === "PRESENCE_UPDATE") {
      applyPresenceData(payload.d);
    }
  };

  lanyardSocket.onclose = () => {
    if (lanyardHeartbeat) {
      clearInterval(lanyardHeartbeat);
      lanyardHeartbeat = null;
    }

    setTimeout(connectLanyardSocket, 3000);
  };

  lanyardSocket.onerror = () => {
    console.log("Lanyard socket error");
  };
}

/* DISCORD + SPOTIFY */
async function getDiscordPresence() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
    const json = await res.json();

    if (!json.success) return;

    applyPresenceData(json.data);
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
  const coverEq = document.getElementById("coverEq");

  if (!song || !artist || !cover) return;

  const isPlaying = !!data?.spotify;

  if (isPlaying) {
    const spotify = data.spotify;

    if (coverEq) {
      coverEq.style.display = "flex";
    }

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
    if (coverEq) {
      coverEq.style.display = "none";
    }

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
connectLanyardSocket();

/* TILT 3D */
if (card) {
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let currentScale = 1;
  let targetScale = 1;
  let isHoveringCard = false;
  let isHoveringControls = false;

  const maxRotate = 12;
  const lerp = 0.1;

  const controls = document.querySelectorAll(
    ".links-row, .social-row, .social-btn, .more-link, .links-divider"
  );

  function animateTilt() {
    currentX += (targetX - currentX) * lerp;
    currentY += (targetY - currentY) * lerp;
    currentScale += (targetScale - currentScale) * lerp;

    card.style.transform =
      `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg) scale3d(${currentScale}, ${currentScale}, ${currentScale})`;

    requestAnimationFrame(animateTilt);
  }

  function resetTilt(removeAura = true) {
    targetX = 0;
    targetY = 0;
    targetScale = 1;

    if (removeAura) {
      card.classList.remove("card-hovered");
    }
  }

  card.addEventListener("mouseenter", () => {
    isHoveringCard = true;

    if (!isHoveringControls) {
      card.classList.add("card-hovered");
    }
  });

  card.addEventListener("mousemove", (e) => {
    if (!isHoveringCard || isHoveringControls) return;

    const blocked = e.target.closest(
      ".links-row, .social-row, .social-btn, .more-link, .links-divider"
    );

    if (blocked) {
      resetTilt(true);
      return;
    }

    card.classList.add("card-hovered");

    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    targetY = (px - 0.5) * (maxRotate * 2);
    targetX = (0.5 - py) * (maxRotate * 2);
    targetScale = 1.044;
  });

  card.addEventListener("mouseleave", () => {
    isHoveringCard = false;
    resetTilt(true);
  });

  controls.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      isHoveringControls = true;
      resetTilt(true);
    });

    el.addEventListener("mousemove", () => {
      isHoveringControls = true;
      resetTilt(true);
    });

    el.addEventListener("mouseleave", () => {
      isHoveringControls = false;

      if (isHoveringCard) {
        card.classList.add("card-hovered");
      }
    });
  });

  animateTilt();
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

/* NAV PAGES */
const navItems = document.querySelectorAll(".top-nav-item[data-page]");
const pageViews = document.querySelectorAll(".page-view");
const topNav = document.querySelector(".top-nav");
const transitionShade = document.getElementById("pageTransitionShade");

let currentPage = "home";
let isSwitchingPage = false;

function setActiveNav(page) {
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });
}

function resetAnimIn(pageEl) {
  const animated = pageEl.querySelectorAll(".anim-in");

  animated.forEach((el) => {
    el.style.transition = "none";
    el.style.opacity = "";

    if (!el.classList.contains("profile-card")) {
      el.style.transform = "";
    }

    void el.offsetWidth;
    el.style.transition = "";
  });
}

function animateTopNav() {
  if (!topNav) return;

  topNav.classList.remove("nav-entered");
  topNav.classList.add("nav-pre-enter");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      topNav.classList.remove("nav-pre-enter");
      topNav.classList.add("nav-entered");
    });
  });
}

function clearInactivePages(activePage) {
  pageViews.forEach((view) => {
    if (view !== activePage) {
      view.classList.remove("active", "entering", "exiting");
      view.style.visibility = "";
    }
  });
}

function setActivePage(page) {
  const nextPage = document.querySelector(`.page-view[data-page="${page}"]`);
  const currentActive = document.querySelector(".page-view.active");

  if (!nextPage || isSwitchingPage || page === currentPage) return;

  isSwitchingPage = true;
  setActiveNav(page);
  window.location.hash = page;

  if (transitionShade) {
    transitionShade.classList.add("active");
  }

  if (currentActive) {
    currentActive.classList.remove("active");
    currentActive.classList.add("exiting");
  }

  nextPage.classList.add("entering");
  nextPage.style.visibility = "visible";

  setTimeout(() => {
    pageViews.forEach((view) => {
      if (view !== currentActive && view !== nextPage) {
        view.classList.remove("active", "entering", "exiting");
        view.style.visibility = "";
      }
    });

    resetAnimIn(nextPage);

    nextPage.classList.remove("entering");
    nextPage.classList.add("active");

    animateTopNav();
    currentPage = page;
  }, 170);

  setTimeout(() => {
    if (transitionShade) {
      transitionShade.classList.remove("active");
    }
  }, 220);

  setTimeout(() => {
    clearInactivePages(nextPage);
    isSwitchingPage = false;
  }, 900);
}

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    setActivePage(item.dataset.page);
  });
});

const moreLink = document.querySelector(".more-link");
if (moreLink) {
  moreLink.addEventListener("click", (e) => {
    e.preventDefault();
    setActivePage("sobre");
  });
}

window.addEventListener("load", () => {
  const hashPage = window.location.hash.replace("#", "").trim();
  const validPages = ["home", "sobre", "lazer", "amigos"];
  const initialName = validPages.includes(hashPage) ? hashPage : "home";
  const initialPage = document.querySelector(`.page-view[data-page="${initialName}"]`);

  pageViews.forEach((view) => {
    view.classList.remove("active", "entering", "exiting");
    view.style.visibility = "";
  });

  if (initialPage) {
    initialPage.classList.add("active");
    currentPage = initialName;
    setActiveNav(initialName);
  }

  animateTopNav();
});
