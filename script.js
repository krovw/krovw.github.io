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
let lanyardHasSpotify = false;

function applyPresenceData(data) {
  if (!data) return;

  lanyardHasSpotify = !!data?.spotify;

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

async function syncBackendNowPlaying() {
  if (lanyardHasSpotify) return;

  try {
    const res = await fetch("http://localhost:3000/api/now-playing");
    if (!res.ok) return;

    const backendData = await res.json();

    if (!backendData || !backendData.track) return;

    const trackId = backendData.spotifyUrl
      ? backendData.spotifyUrl.split("/track/")[1]?.split("?")[0] || null
      : null;

    updateSpotifyBox({
      spotify: {
        song: backendData.track,
        artist: backendData.artist,
        album_art_url: backendData.albumArt,
        track_id: trackId,
      },
    });
  } catch (err) {
    console.error("Erro ao buscar backend now-playing:", err);
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
syncBackendNowPlaying();
setInterval(syncBackendNowPlaying, 10000);

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

/* LAST.FM / LAZER */
const LASTFM_API_KEY = "2222055cf10f11baa9ee6d93b363659f";
const LASTFM_USER = "l9ve";

function getLastFmImage(images, preferred = "extralarge") {
  if (!Array.isArray(images)) return "";
  const exact = images.find((img) => img.size === preferred && img["#text"]);
  if (exact) return exact["#text"];
  const fallback = [...images].reverse().find((img) => img["#text"]);
  return fallback ? fallback["#text"] : "";
}

async function getSpotifyArtistImage(name) {
  try {
    const res = await fetch(
      `http://localhost:3001/api/spotify-artist-image?q=${encodeURIComponent(name)}`
    );

    const data = await res.json();
    return data.image || "";
  } catch {
    return "";
  }
}

function isInvalidLastFmImage(url = "") {
  if (!url) return true;

  return (
    url.includes("4128a6eb29f94943c9d206c08e625904.jpg") ||
    url.includes("/2a96cbd8b46e442fc41c2b86b821562f.png")
  );
}

function getArtistAlbumFallback(artistName, albums = []) {
  const match = albums.find((album) => {
    const albumArtist =
      typeof album?.artist === "string"
        ? album.artist
        : album?.artist?.name || "";

    return albumArtist.toLowerCase() === String(artistName || "").toLowerCase();
  });

  const albumImage = match ? getLastFmImage(match.image, "extralarge") : "";
  return isInvalidLastFmImage(albumImage) ? "" : albumImage;
}

async function getArtistBestImage(name, artistImages, albums = []) {
  const spotifyImg = await getSpotifyArtistImage(name);

  if (spotifyImg) return spotifyImg;

  const lastfm = getLastFmImage(artistImages, "extralarge");
  if (!isInvalidLastFmImage(lastfm)) return lastfm;

  const album = getArtistAlbumFallback(name, albums);
  if (!isInvalidLastFmImage(album)) return album;

  return "assets/fallback-artist.png";
}


function formatNumber(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("pt-BR").format(num);
}

function renderMusicLoading() {
  const musicSection = document.getElementById("musicSection");
  if (!musicSection) return;

  musicSection.innerHTML = `
    <div class="music-loading">
      <div class="music-loading-dot"></div>
      <p>Carregando dados do Last.fm...</p>
    </div>
  `;
}

function formatShortNumber(value) {
  const num = Number(value || 0);

  if (num >= 1000) {
    const short = (num / 1000).toFixed(1);
    return `${short}%`;
  }

  return `${num}%`;
}

function formatDateBR(date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function clampPercent(value) {
  return Math.max(8, Math.min(100, value));
}

function renderMusicError() {
  const musicSection = document.getElementById("musicSection");
  if (!musicSection) return;

  musicSection.innerHTML = `
    <div class="music-empty">
      Não consegui carregar os dados do Last.fm agora.
    </div>
  `;
}

async function fetchLastFmData() {
  const base = "https://ws.audioscrobbler.com/2.0/";

  const urls = [
    `${base}?method=user.getinfo&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json`,
    `${base}?method=user.gettopartists&user=${LASTFM_USER}&limit=5&period=overall&api_key=${LASTFM_API_KEY}&format=json`,
    `${base}?method=user.gettopalbums&user=${LASTFM_USER}&limit=10&period=overall&api_key=${LASTFM_API_KEY}&format=json`,
    `${base}?method=user.gettoptracks&user=${LASTFM_USER}&limit=10&period=overall&api_key=${LASTFM_API_KEY}&format=json`,
    `${base}?method=user.getrecenttracks&user=${LASTFM_USER}&limit=15&api_key=${LASTFM_API_KEY}&format=json`
  ];

  const responses = await Promise.all(urls.map((url) => fetch(url)));
  const jsons = await Promise.all(responses.map((res) => res.json()));

  const [userInfo, topArtists, topAlbums, topTracks, recentTracks] = jsons;

  return {
    profile: userInfo.user || null,
    topArtists: topArtists.topartists?.artist || [],
    topAlbums: topAlbums.topalbums?.album || [],
    topTracks: topTracks.toptracks?.track || [],
    recentTracks: recentTracks.recenttracks?.track || [],
    isNowPlaying: recentTracks.recenttracks?.track?.[0]?.["@attr"]?.nowplaying === "true"
  };
}

async function renderMusicSection(data) {
  const musicSection = document.getElementById("musicSection");
  if (!musicSection) return;

  const profile = data.profile;
  const topArtists = data.topArtists || [];
  const topTracks = data.topTracks || [];
  const topAlbums = data.topAlbums || [];

  const profileImage =
    getLastFmImage(profile?.image, "extralarge") ||
    "https://lastfm.freetls.fastly.net/i/u/300x300/4128a6eb29f94943c9d206c08e625904.jpg";

  const favArtist = topArtists[0];
  const otherArtists = topArtists.slice(1, 5);
  const favImage = favArtist
  ? await getArtistBestImage(
      favArtist.name,
      favArtist.image,
      topAlbums
    )
  : "assets/fallback-artist.png";

const otherImages = await Promise.all(
  otherArtists.map((artist) =>
    getArtistBestImage(artist.name, artist.image, topAlbums)
  )
);
  const favArtistPlaycount = Number(favArtist?.playcount || 0);
const totalPlaycount = Number(profile?.playcount || 0);
const favPercent = totalPlaycount > 0
  ? ((favArtistPlaycount / totalPlaycount) * 100).toFixed(1)
  : "0.0";

  musicSection.innerHTML = `
  <div class="music-dashboard">

    <!-- HEADER -->
<div class="music-header">
  <div class="music-header-avatar-wrap">
    <img src="${profileImage}" class="music-header-avatar" alt="${profile?.name || "Usuário"}">
  </div>

  <div class="music-header-info">
    <div class="music-header-top">
      <div class="music-header-name">
        ${profile?.name || "Usuário"}
        <span class="pro-badge">PRO</span>
      </div>
    </div>

    <div class="music-header-user">@${LASTFM_USER}</div>

    <div class="music-header-meta">
      <div class="music-header-date">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="music-header-date-icon">
          <path d="M8 2v4"></path>
          <path d="M16 2v4"></path>
          <rect width="18" height="18" x="3" y="4" rx="2"></rect>
          <path d="M3 10h18"></path>
        </svg>
        <span>Desde 2026</span>
      </div>

      <a class="music-header-link" href="https://www.last.fm/user/${LASTFM_USER}" target="_blank" rel="noopener noreferrer">
        <svg xmlns="http://www.w3.org/2000/svg" class="music-header-link-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 3h6v6"></path>
  <path d="M10 14 21 3"></path>
  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
</svg>
        <span>Ver Perfil</span>
      </a>
    </div>
  </div>
</div>

    <!-- STATS -->
<div class="music-main-stats">
  <div class="stat-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="stat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
    </svg>
    <div class="stat-value">${formatNumber(profile?.playcount)}</div>
    <div class="stat-label">Scrobbles</div>
  </div>

  <div class="stat-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="stat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
    <div class="stat-value">${formatNumber(profile?.artist_count)}</div>
    <div class="stat-label">Artistas</div>
  </div>

  <div class="stat-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="stat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m16 6 4 14"></path>
      <path d="M12 6v14"></path>
      <path d="M8 8v12"></path>
      <path d="M4 4v16"></path>
    </svg>
    <div class="stat-value">${formatNumber(profile?.album_count)}</div>
    <div class="stat-label">Álbuns</div>
  </div>

  <div class="stat-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="stat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15V6"></path>
      <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
      <path d="M12 12H3"></path>
      <path d="M16 6H3"></path>
      <path d="M12 18H3"></path>
    </svg>
    <div class="stat-value">${formatNumber(profile?.track_count)}</div>
    <div class="stat-label">Músicas</div>
  </div>
</div>
    <div class="music-divider"></div>

    <!-- GRID PRINCIPAL -->
    <div class="music-main-grid">

      <!-- ESQUERDA -->
      <div class="music-left">

        <div class="section-title">
  <svg xmlns="http://www.w3.org/2000/svg" class="section-title-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
    <polyline points="16 7 22 7 22 13"></polyline>
  </svg>
  <span>Estatísticas detalhadas</span>
</div>

        <div class="detail-grid">
  <div class="detail-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="detail-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
    </svg>
    <div class="detail-value">${formatNumber(profile?.playcount)}</div>
    <div class="detail-label">Scrobbles totais</div>
  </div>

  <div class="detail-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="detail-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
    <div class="detail-value">${formatNumber(profile?.artist_count)}</div>
    <div class="detail-label">Artistas únicos</div>
  </div>

  <div class="detail-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="detail-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m16 6 4 14"></path>
      <path d="M12 6v14"></path>
      <path d="M8 8v12"></path>
      <path d="M4 4v16"></path>
    </svg>
    <div class="detail-value">${formatNumber(profile?.album_count)}</div>
    <div class="detail-label">Álbuns diferentes</div>
  </div>

  <div class="detail-box">
    <svg xmlns="http://www.w3.org/2000/svg" class="detail-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15V6"></path>
      <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
      <path d="M12 12H3"></path>
      <path d="M16 6H3"></path>
      <path d="M12 18H3"></path>
    </svg>
    <div class="detail-value">${formatNumber(profile?.track_count)}</div>
    <div class="detail-label">Músicas catalogadas</div>
  </div>
</div>

        <div class="insights-box">
  <div class="insights-header">
    <svg xmlns="http://www.w3.org/2000/svg" class="insights-header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
      <circle cx="12" cy="12" r="2"></circle>
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path>
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path>
    </svg>
    <span>INSIGHTS DE ESCUTA</span>
  </div>

  <div class="insights-top">
    <div class="insight-stat">
      <div class="insight-stat-label">Média diária</div>
      <div class="insight-stat-value">${Math.max(1, Math.round((profile?.playcount || 0) / 365))}</div>
      <div class="insight-stat-sub">scrobbles/dia</div>
    </div>

    <div class="insight-stat">
      <div class="insight-stat-label">Variedade</div>
      <div class="insight-stat-value">${((profile?.artist_count || 0) / Math.max(profile?.playcount || 1, 1) * 100).toFixed(1)}%</div>
      <div class="insight-stat-sub">artistas/plays</div>
    </div>
  </div>

  <div class="insights-dist-title">Distribuição de conteúdo</div>

  <div class="insight-bar-row">
    <div class="insight-bar-head">
      <span>Artistas</span>
      <strong>${formatNumber(profile?.artist_count)}</strong>
    </div>
    <div class="insight-bar-track">
      <div class="insight-bar-fill" style="width: ${clampPercent(((profile?.artist_count || 0) / Math.max(profile?.track_count || 1, 1)) * 100)}%;"></div>
    </div>
  </div>

  <div class="insight-bar-row">
    <div class="insight-bar-head">
      <span>Álbuns</span>
      <strong>${formatNumber(profile?.album_count)}</strong>
    </div>
    <div class="insight-bar-track">
      <div class="insight-bar-fill" style="width: ${clampPercent(((profile?.album_count || 0) / Math.max(profile?.track_count || 1, 1)) * 100)}%;"></div>
    </div>
  </div>

  <div class="insight-bar-row">
    <div class="insight-bar-head">
      <span>Músicas</span>
      <strong>${formatNumber(profile?.track_count)}</strong>
    </div>
    <div class="insight-bar-track">
      <div class="insight-bar-fill" style="width: 100%;"></div>
    </div>
  </div>

  <div class="insights-footer">
    <div class="insights-date">
      <svg xmlns="http://www.w3.org/2000/svg" class="insights-date-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 2v4"></path>
        <path d="M16 2v4"></path>
        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
        <path d="M3 10h18"></path>
      </svg>
      <span>Desde ${
        profile?.registered?.unixtime
          ? formatDateBR(new Date(Number(profile.registered.unixtime) * 1000))
          : "2024"
      }</span>
    </div>

    <div class="insights-days">
      ${
        profile?.registered?.unixtime
          ? `${Math.max(1, Math.floor((Date.now() - Number(profile.registered.unixtime) * 1000) / 86400000))} dias`
          : ""
      }
    </div>
    </div>
</div>

      </div> <!-- music-left -->

            <!-- DIREITA -->
      <div class="music-right">

        ${
          favArtist
            ? `
          <div class="fav-card">
            <div class="fav-top">
              <div class="fav-top-left">
                <div class="fav-star">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fav-star-icon" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                  </svg>
                </div>

                <div class="fav-title-wrap">
                  <div class="fav-title">Artista favorito</div>
                  <div class="fav-subtitle">Mais ouvido</div>
                </div>
              </div>

              <div class="fav-rank">#1</div>
            </div>

            <div class="fav-main">
              <div class="fav-cover-wrap">
                <img src="${favImage}" class="fav-img" alt="${favArtist.name}">
                <div class="fav-crown">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fav-crown-icon" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path>
  <path d="M5 21h14"></path>
</svg>
                </div>
              </div>

              <div class="fav-info">
                <div class="fav-name">${favArtist.name}</div>

                <div class="fav-stats">
                  <div class="fav-stat">
                    <div class="fav-stat-label">Reproduções</div>
                    <div class="fav-stat-value">
                      <span class="fav-stat-play-icon">▶</span>
                      ${formatNumber(favArtist.playcount)}
                    </div>
                  </div>

                  <div class="fav-stat">
                    <div class="fav-stat-label">Do total</div>
                    <div class="fav-stat-value">${favPercent}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="fav-divider"></div>

            <div class="fav-footer">
              <div class="fav-footer-left">
                <svg xmlns="http://www.w3.org/2000/svg" class="fav-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                <span>Seu artista mais ouvido</span>
              </div>

              <a class="fav-footer-link" href="${favArtist.url || "#"}" target="_blank" rel="noopener noreferrer" aria-label="Abrir artista no Last.fm">
                <svg xmlns="http://www.w3.org/2000/svg" class="fav-footer-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 3h6v6"></path>
                  <path d="M10 14 21 3"></path>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                </svg>
              </a>
            </div>
          </div>
        `
            : ""
        }

        <div class="other-artists">
          <div class="other-artists-head">
            <div class="other-artists-title-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" class="other-artists-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <div class="other-artists-title">Outros artistas</div>
            </div>

            <div class="other-artists-range">#2 - #5</div>
          </div>

          ${otherArtists.map((artist, index) => `
  <a class="artist-row" href="${artist.url || "#"}" target="_blank" rel="noopener noreferrer">
  <div class="artist-cover-wrap">
    <img
      src="${otherImages[index] || "assets/fallback-artist.png"}"
      class="artist-avatar"
      alt="${artist.name}"
    >
    <div class="artist-rank">${index + 2}</div>
  </div>

  <div class="artist-main">
    <div class="artist-name">${artist.name}</div>
    <div class="artist-plays">${formatNumber(artist.playcount)} reproduções</div>
  </div>
</a>
`).join("")}
        </div>

      </div>

    </div>
  </div>
  `;
}

let musicLoaded = false;

async function loadLastFmSection() {
  if (musicLoaded) return;

  renderMusicLoading();

  try {
    const data = await fetchLastFmData();
    renderMusicSection(data);
    musicLoaded = true;
  } catch (error) {
    console.error("Erro ao buscar Last.fm:", error);
    renderMusicError();
  }
}

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

  if (page === "lazer") {
    loadLastFmSection();
  }

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
    if (initialName === "lazer") {
  loadLastFmSection();
}
  }

  animateTopNav();
});

const lazerTabs = document.querySelectorAll(".top-tabs .music-tab");
const musicSection = document.getElementById("musicSection");
const filmsSection = document.getElementById("filmsSection");

function switchLazerTab(tabName) {
  lazerTabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("active", isActive);
  });

  if (musicSection) {
    musicSection.classList.toggle("is-active", tabName === "music");
  }

  if (filmsSection) {
    filmsSection.classList.toggle("is-active", tabName === "films");
  }
}

lazerTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchLazerTab(tab.dataset.tab);
  });
});

switchLazerTab("music");
