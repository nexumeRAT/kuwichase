import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const WIDTH = 760;
const HEIGHT = 460;
const RAT_SIZE = 60;
const BUNNY_SIZE = 60;
const SAFE_DISTANCE = 52.5;
const BUNNY_AWARE_DISTANCE = 190;
const RAT_SPEED = 260;
const BUNNY_WANDER_SPEED = 285;
const BUNNY_AVOID_SPEED = 330;

// Images are intentionally swapped: player-controlled character uses bunny images,
// escaping character uses rat images.
const RAT_LEFT_IMAGE = "https://cdn.discordapp.com/emojis/1373223935994364026.webp?size=160&animated=true";
const RAT_RIGHT_IMAGE = "https://cdn.discordapp.com/emojis/1419041318365171923.webp?size=160&animated=true";
const BUNNY_LEFT_IMAGE = "https://cdn.discordapp.com/emojis/1424747035713732628.webp?size=160&animated=true";
const BUNNY_RIGHT_IMAGE = "https://cdn.discordapp.com/emojis/1505464938854879233.webp?size=160&animated=true";

const FLOATING_IMAGE = "https://cdn.discordapp.com/emojis/1414184681410400339.webp?size=160";
const SPECIAL_FLOATING_IMAGE = "https://cdn.discordapp.com/emojis/1504913391423197264.webp?size=160";
const PLAYER_NEAR_MISS_IMAGE = "https://cdn.discordapp.com/emojis/1421398979282735176.webp?size=160&animated=true";
const CARRAT_IMAGE = "https://cdn.discordapp.com/emojis/1505194496772669543.webp?size=160";
const ESCAPING_NEAR_MISS_IMAGE = "https://cdn.discordapp.com/emojis/1421177556542951425.webp?size=160";
const BACKGROUND_MUSIC_URL = `${import.meta.env.BASE_URL}sadge.wav`;
const FIFTH_NEAR_MISS_SOUND_URL = `${import.meta.env.BASE_URL}fifth-near-miss.wav`;
const NEAR_MISS_SOUND_URL = `${import.meta.env.BASE_URL}near-miss.wav`;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomDirection() {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function randomSafeSpot(avoidPoint) {
  let bestSpot = { x: WIDTH - 110, y: HEIGHT / 2 };
  let bestDistance = -1;

  for (let i = 0; i < 24; i += 1) {
    const spot = {
      x: BUNNY_SIZE / 2 + Math.random() * (WIDTH - BUNNY_SIZE),
      y: BUNNY_SIZE / 2 + Math.random() * (HEIGHT - BUNNY_SIZE),
    };
    const spotDistance = distance(spot, avoidPoint);

    if (spotDistance > bestDistance) {
      bestSpot = spot;
      bestDistance = spotDistance;
    }
  }

  return bestSpot;
}

export default function RatBunnyChaseGame() {
  const [rat, setRat] = useState({ x: 90, y: HEIGHT / 2 });
  const [bunny, setBunny] = useState({ x: WIDTH - 110, y: HEIGHT / 2 });
  const [nearMisses, setNearMisses] = useState(0);
  const [wiggle, setWiggle] = useState(false);
  const [ratFacing, setRatFacing] = useState("right");
  const [bunnyFacing, setBunnyFacing] = useState("left");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameStartedRef = useRef(false);
  const [nearMissTransfer, setNearMissTransfer] = useState(false);
  const [specialNearMissTransfer, setSpecialNearMissTransfer] = useState(false);
  const [escapingNearMiss, setEscapingNearMiss] = useState(false);
  const calculateGameScale = () => {
    if (typeof window === "undefined") return 1;

    const isMobile = window.matchMedia("(pointer: coarse)").matches;

    if (!isMobile) {
      const fullscreen = Boolean(document.fullscreenElement);

      // 24px padding on each side, matching p-6.
      const padding = 48;

      const availableWidth = window.innerWidth - padding;
      const availableHeight = window.innerHeight;

      const maxScale = fullscreen ? Infinity : 2.0;

      return Math.max(
        0.1,
        Math.min(maxScale, availableWidth / WIDTH, availableHeight / HEIGHT)
      );
    }

    const availableWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

    const isLandscape = availableWidth > viewportHeight;

    const availableHeight = viewportHeight;

    return Math.max(
      0.1,
      Math.min(
        availableWidth / WIDTH,
        availableHeight / HEIGHT
      )
    );
  };

  const [gameScale, setGameScale] = useState(calculateGameScale);

  useEffect(() => {
    const updateScale = () => {
      setGameScale(calculateGameScale());
    };

    updateScale();

    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    document.addEventListener("fullscreenchange", updateScale);
    window.visualViewport?.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
      document.removeEventListener("fullscreenchange", updateScale);
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, []);
  
  useEffect(() => {
  function updateJoystickPlacement() {
    if (!boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const size = 112;
    const gap = 12;
    const margin = 8;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const landscape = viewportWidth > viewportHeight;

    let left;
    let top;

    if (landscape && rect.left >= size + gap + margin) {
      left = (rect.left - size) / 2;
      top = rect.top + (rect.height - size) / 2;
    } else if (
      !landscape &&
      viewportHeight - rect.bottom >= size + gap + margin
    ) {
      // Center horizontally below the game
      left = (viewportWidth - size) / 2;

      // Center vertically in the remaining space
      top = rect.bottom + (viewportHeight - rect.bottom - size) / 2;
    } else {
      left = rect.left + gap;
      top = rect.bottom - size - gap;
    }

    setJoystickPlacement({
      left: Math.max(margin, Math.min(left, viewportWidth - size - margin)),
      top: Math.max(margin, Math.min(top, viewportHeight - size - margin)),
    });
  }

  const frame = requestAnimationFrame(updateJoystickPlacement);

  window.addEventListener("resize", updateJoystickPlacement);
  window.addEventListener("scroll", updateJoystickPlacement);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", updateJoystickPlacement);
    window.removeEventListener("scroll", updateJoystickPlacement);
  };
}, [gameScale]);

useEffect(() => {
  function updateDesktopControlsPosition() {
    if (!boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();

    setDesktopControlsPosition({
      top: rect.top + 8,
      right: window.innerWidth - rect.right + 8,
    });
  }

  const frame = requestAnimationFrame(updateDesktopControlsPosition);

  window.addEventListener("resize", updateDesktopControlsPosition);
  document.addEventListener("fullscreenchange", updateDesktopControlsPosition);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", updateDesktopControlsPosition);
    document.removeEventListener("fullscreenchange", updateDesktopControlsPosition);
  };
}, [gameScale]);

useEffect(() => {
  function updateMobileControls() {
    if (
      !boardRef.current ||
      !window.matchMedia("(pointer: coarse)").matches
    ) {
      setMobileControls(null);
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const landscape = width > height;

    if (landscape) {
      const panelWidth = 112;
      const panelHeight = 136;
      const gap = 8;

      const spaceRight = width - rect.right;
      const spaceLeft = rect.left;

      if (spaceRight >= panelWidth + gap) {
        setMobileControls({
          mode: "landscape",
          left: rect.right + (spaceRight - panelWidth) / 2,
          top: rect.top + (rect.height - panelHeight) / 2,
          overlay: false,
        });
      } else if (spaceLeft >= panelWidth + gap) {
        setMobileControls({
          mode: "landscape",
          left: (spaceLeft - panelWidth) / 2,
          top: rect.top + (rect.height - panelHeight) / 2,
          overlay: false,
        });
      } else {
        setMobileControls({
          mode: "landscape",
          left: Math.max(0, Math.min(rect.right - gap, width - gap)),
          top: Math.max(0, rect.top + gap),
          overlay: true,
        });
      }
    } else {
      const panelHeight = 44;

      if (rect.top >= panelHeight + 8) {
        setMobileControls({
          mode: "portrait",
          left: width / 2,
          top: rect.top - panelHeight - 8,
        });
      } else {
        setMobileControls(null);
      }
    }
  }

  const frame = requestAnimationFrame(updateMobileControls);

  window.addEventListener("resize", updateMobileControls);
  window.visualViewport?.addEventListener("resize", updateMobileControls);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", updateMobileControls);
    window.visualViewport?.removeEventListener("resize", updateMobileControls);
  };
}, [gameScale]);

  const boardRef = useRef(null);
  const [desktopControlsPosition, setDesktopControlsPosition] = useState(null);
  const [joystickPlacement, setJoystickPlacement] = useState(null);
  const [mobileControls, setMobileControls] = useState(null);
  const keysPressed = useRef(new Set());
  const joystick = useRef({ x: 0, y: 0 });
  const joystickPointer = useRef(null);
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });
  const audioRef = useRef(null);
  const musicManuallyPaused = useRef(false);
  const fifthNearMissAudioRef = useRef(null);
  const fifthNearMissSoundPool = useRef([]);
  const audioContextRef = useRef(null);
  const fifthNearMissBufferRef = useRef(null);
  const fifthNearMissLoadingRef = useRef(false);
  const nearMissBufferRef = useRef(null);
  const nearMissLoadingRef = useRef(false);
  const ratRef = useRef(rat);
  const bunnyRef = useRef(bunny);
  const nearMissesRef = useRef(nearMisses);
  const bunnyDirection = useRef(randomDirection());
  const bunnyDirectionTimer = useRef(0);
  const bunnyWallCooldown = useRef(0);
  const bunnyFacingLock = useRef(0);
  const nearMissTransferTimeout = useRef(null);
  const escapingNearMissTimeout = useRef(null);
  const escapingFrozenUntil = useRef(0);
  const nearMissInvulnerableUntil = useRef(0);
  const escapingNearMissToken = useRef(0);

  useEffect(() => {
    ratRef.current = rat;
  }, [rat]);

  useEffect(() => {
    bunnyRef.current = bunny;
  }, [bunny]);

  useEffect(() => {
    nearMissesRef.current = nearMisses;
  }, [nearMisses]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;

    function syncMusicState() {
      setMusicPlaying(!audio.paused);
    }

    audio.addEventListener("play", syncMusicState);
    audio.addEventListener("pause", syncMusicState);

    return () => {
      audio.removeEventListener("play", syncMusicState);
      audio.removeEventListener("pause", syncMusicState);
    };
  }, []);


  function canTriggerNearMiss() {
    return performance.now() >= nearMissInvulnerableUntil.current;
  }

  function showNearMissEffects() {
    const now = performance.now();
    if (!canTriggerNearMiss()) return;

    const nextNearMissCount = nearMissesRef.current + 1;
    const isSpecialNearMiss = nextNearMissCount % 5 === 0;

    if (isSpecialNearMiss) {
      playNearMissSound(0.35);
      playFifthNearMissSound();
    } else {
      playNearMissSound();
    }

    nearMissInvulnerableUntil.current = now + 3000;
    escapingFrozenUntil.current = now + 2000;

    const token = escapingNearMissToken.current + 1;
    escapingNearMissToken.current = token;
    setEscapingNearMiss(true);

    if (escapingNearMissTimeout.current) {
      clearTimeout(escapingNearMissTimeout.current);
    }

    escapingNearMissTimeout.current = setTimeout(() => {
      if (escapingNearMissToken.current !== token) return;

      const safeSpot = randomSafeSpot(ratRef.current);
      setBunny(safeSpot);
      bunnyRef.current = safeSpot;
      setBunnyFacing(safeSpot.x < ratRef.current.x ? "left" : "right");
      bunnyDirection.current = randomDirection();
      bunnyDirectionTimer.current = 0.5;
      setEscapingNearMiss(false);
    }, 2000);

    setSpecialNearMissTransfer(isSpecialNearMiss);
    setNearMissTransfer(true);
    if (nearMissTransferTimeout.current) {
      clearTimeout(nearMissTransferTimeout.current);
    }
    nearMissTransferTimeout.current = setTimeout(() => {
      setNearMissTransfer(false);
      setSpecialNearMissTransfer(false);
    }, 2000);

    nearMissesRef.current = nextNearMissCount;
    setNearMisses(nextNearMissCount);
    setWiggle(true);
    setTimeout(() => setWiggle(false), 260);
  }

  function moveRat(dx, dy) {
    if (dx < 0) setRatFacing("left");
    if (dx > 0) setRatFacing("right");

    setRat((currentRat) => {
      const nextRat = {
        x: clamp(currentRat.x + dx, RAT_SIZE / 2, WIDTH - RAT_SIZE / 2),
        y: clamp(currentRat.y + dy, RAT_SIZE / 2, HEIGHT - RAT_SIZE / 2),
      };

      ratRef.current = nextRat;

      if (distance(nextRat, bunnyRef.current) < SAFE_DISTANCE && canTriggerNearMiss()) {
        showNearMissEffects();
      }

      return nextRat;
    });
  }

  function moveBunny(deltaSeconds) {
    bunnyDirectionTimer.current -= deltaSeconds;
    bunnyWallCooldown.current = Math.max(0, bunnyWallCooldown.current - deltaSeconds);
    bunnyFacingLock.current = Math.max(0, bunnyFacingLock.current - deltaSeconds);

    if (bunnyDirectionTimer.current <= 0) {
      bunnyDirection.current = randomDirection();
      bunnyDirectionTimer.current = 0.7 + Math.random() * 1.1;
    }

    setBunny((currentBunny) => {
      if (performance.now() < escapingFrozenUntil.current) {
        return currentBunny;
      }

      const currentRat = ratRef.current;
      const d = distance(currentBunny, currentRat);
      let moveX = bunnyDirection.current.x;
      let moveY = bunnyDirection.current.y;
      let speed = BUNNY_WANDER_SPEED;

      if (d < BUNNY_AWARE_DISTANCE) {
        const awayX = currentBunny.x - currentRat.x;
        const awayY = currentBunny.y - currentRat.y;
        const length = Math.hypot(awayX, awayY) || 1;
        const panic = 1 - d / BUNNY_AWARE_DISTANCE;

        moveX = awayX / length + bunnyDirection.current.x * 0.25;
        moveY = awayY / length + bunnyDirection.current.y * 0.25;
        speed = BUNNY_WANDER_SPEED + (BUNNY_AVOID_SPEED - BUNNY_WANDER_SPEED) * panic;
      }

      const wallPadding = 95;
      const leftPressure = Math.max(0, wallPadding - currentBunny.x) / wallPadding;
      const rightPressure = Math.max(0, currentBunny.x - (WIDTH - wallPadding)) / wallPadding;
      const topPressure = Math.max(0, wallPadding - currentBunny.y) / wallPadding;
      const bottomPressure = Math.max(0, currentBunny.y - (HEIGHT - wallPadding)) / wallPadding;

      moveX += leftPressure * 1.2;
      moveX -= rightPressure * 1.2;
      moveY += topPressure * 1.2;
      moveY -= bottomPressure * 1.2;

      if (d < SAFE_DISTANCE) {
        const centerX = WIDTH / 2 - currentBunny.x;
        const centerY = HEIGHT / 2 - currentBunny.y;
        const centerLength = Math.hypot(centerX, centerY) || 1;
        moveX += (centerX / centerLength) * 1.1;
        moveY += (centerY / centerLength) * 1.1;
        speed = Math.max(speed, BUNNY_AVOID_SPEED + 80);
      }

      const length = Math.hypot(moveX, moveY) || 1;
      moveX /= length;
      moveY /= length;

      let nextBunny = {
        x: currentBunny.x + moveX * speed * deltaSeconds,
        y: currentBunny.y + moveY * speed * deltaSeconds,
      };

      const minX = BUNNY_SIZE / 2;
      const maxX = WIDTH - BUNNY_SIZE / 2;
      const minY = BUNNY_SIZE / 2;
      const maxY = HEIGHT - BUNNY_SIZE / 2;

      const hitLeft = nextBunny.x <= minX;
      const hitRight = nextBunny.x >= maxX;
      const hitTop = nextBunny.y <= minY;
      const hitBottom = nextBunny.y >= maxY;

      if ((hitLeft || hitRight || hitTop || hitBottom) && bunnyWallCooldown.current <= 0) {
        const inwardX = hitLeft ? 1 : hitRight ? -1 : 0;
        const inwardY = hitTop ? 1 : hitBottom ? -1 : 0;
        const drift = randomDirection();
        bunnyDirection.current = {
          x: inwardX * 1.4 + drift.x * 0.5,
          y: inwardY * 1.4 + drift.y * 0.5,
        };
        bunnyDirectionTimer.current = 0.65;
        bunnyWallCooldown.current = 0.5;
        bunnyFacingLock.current = 0.28;
      }

      nextBunny.x = clamp(nextBunny.x, minX, maxX);
      nextBunny.y = clamp(nextBunny.y, minY, maxY);

      if (bunnyFacingLock.current <= 0 && Math.abs(nextBunny.x - currentBunny.x) > 1.6) {
        if (nextBunny.x < currentBunny.x) setBunnyFacing("left");
        if (nextBunny.x > currentBunny.x) setBunnyFacing("right");
      }

      bunnyRef.current = nextBunny;

      if (distance(ratRef.current, nextBunny) < SAFE_DISTANCE && canTriggerNearMiss()) {
        showNearMissEffects();
      }

      return nextBunny;
    });
  }

  useEffect(() => {
    let animationFrame;
    let lastTime = performance.now();

    function getDirection() {
      const keys = keysPressed.current;
      let dx = 0;
      let dy = 0;

      if (keys.has("arrowup") || keys.has("w")) dy -= 1;
      if (keys.has("arrowdown") || keys.has("s")) dy += 1;
      if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
      if (keys.has("arrowright") || keys.has("d")) dx += 1;

      if (dx !== 0 && dy !== 0) {
        const diagonalSpeed = 1 / Math.sqrt(2);
        return { dx: dx * diagonalSpeed, dy: dy * diagonalSpeed };
      }

    if (dx === 0 && dy === 0) {
      return {
        dx: joystick.current.x,
        dy: joystick.current.y,
      };
    }

    return { dx, dy };
    }

    function gameLoop(now) {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (gameStartedRef.current) {
        const direction = getDirection();

        if (direction.dx !== 0 || direction.dy !== 0) {
          moveRat(
            direction.dx * RAT_SPEED * deltaSeconds,
            direction.dy * RAT_SPEED * deltaSeconds
          );
        }

        moveBunny(deltaSeconds);
      }

      animationFrame = requestAnimationFrame(gameLoop);
    }

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) return;
      event.preventDefault();
      if (!gameStartedRef.current) return;
      keysPressed.current.add(key);
      prepareNearMissSounds();
    }

    function onKeyUp(event) {
      keysPressed.current.delete(event.key.toLowerCase());
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    animationFrame = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  async function prepareSound(url, bufferRef, loadingRef) {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const context = audioContextRef.current;

    if (context.state === "suspended") {
      await context.resume().catch(() => {});
    }

    if (bufferRef.current || loadingRef.current) return;

    loadingRef.current = true;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      bufferRef.current = await context.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn("Could not prepare sound:", error);
    } finally {
      loadingRef.current = false;
    }
  }

  function playSoundBuffer(bufferRef, volume = 0.9) {
    const context = audioContextRef.current;
    const buffer = bufferRef.current;

    if (!context || !buffer) return false;

    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(0);
    return true;
  }

  async function prepareNearMissSounds() {
    await Promise.all([
      prepareSound(NEAR_MISS_SOUND_URL, nearMissBufferRef, nearMissLoadingRef),
      prepareSound(FIFTH_NEAR_MISS_SOUND_URL, fifthNearMissBufferRef, fifthNearMissLoadingRef),
    ]);
  }

  function playNearMissSound(volume = 0.75) {
    playSoundBuffer(nearMissBufferRef, volume);
  }

  function playFifthNearMissSound() {
    if (playSoundBuffer(fifthNearMissBufferRef, 0.9)) return;

    const fallbackSound = fifthNearMissSoundPool.current.find((audio) => audio.paused) || fifthNearMissAudioRef.current;
    if (fallbackSound) {
      fallbackSound.currentTime = 0;
      fallbackSound.play().catch(() => {});
    }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen unavailable:", error);
    }
  }

  useEffect(() => {
    function updateFullscreen() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", updateFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
    };
  }, []);

  function startGame() {
    if (gameStartedRef.current) return;

    gameStartedRef.current = true;
    setGameStarted(true);

    const audio = audioRef.current;

    if (audio) {
      audio.volume = 0.35;
      musicManuallyPaused.current = false;

      audio.play().catch((error) => {
        console.warn("Could not start background music:", error);
      });
    }

    prepareNearMissSounds();
  }

  async function toggleBackgroundMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      musicManuallyPaused.current = true;
      audio.pause();
      return;
    }

    musicManuallyPaused.current = false;
    audio.volume = 0.35;

    try {
      await audio.play();
    } catch (error) {
      console.warn("Could not play music:", error);
    }

    // Prepare sound effects without delaying the music.
    prepareNearMissSounds();
  }

  function resetGame() {
    gameStartedRef.current = false;
    setGameStarted(false);

    musicManuallyPaused.current = true;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setMusicPlaying(false);

    joystick.current = { x: 0, y: 0 };
    keysPressed.current.clear();
    setStickPosition({ x: 0, y: 0 });
    const startingRat = { x: 90, y: HEIGHT / 2 };
    const startingBunny = { x: WIDTH - 110, y: HEIGHT / 2 };

    setRat(startingRat);
    setBunny(startingBunny);
    ratRef.current = startingRat;
    bunnyRef.current = startingBunny;
    nearMissesRef.current = 0;
    bunnyDirection.current = randomDirection();
    bunnyDirectionTimer.current = 0;
    bunnyWallCooldown.current = 0;
    bunnyFacingLock.current = 0;
    escapingFrozenUntil.current = 0;
    nearMissInvulnerableUntil.current = 0;
    escapingNearMissToken.current += 1;

    setRatFacing("right");
    setBunnyFacing("left");
    setNearMisses(0);
    setNearMissTransfer(false);
    setSpecialNearMissTransfer(false);
    setEscapingNearMiss(false);

    if (nearMissTransferTimeout.current) clearTimeout(nearMissTransferTimeout.current);
    if (escapingNearMissTimeout.current) clearTimeout(escapingNearMissTimeout.current);

  }

  const escapingFloatingImage = nearMisses % 5 === 4 ? SPECIAL_FLOATING_IMAGE : FLOATING_IMAGE;
  const playerFloatingImage = specialNearMissTransfer ? SPECIAL_FLOATING_IMAGE : FLOATING_IMAGE;

    function moveJoystick(event) {
      if (joystickPointer.current !== event.pointerId) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;

      const maxDistance = (rect.width - 56) / 2;
      const distance = Math.hypot(dx, dy);
      const scale = distance > maxDistance ? maxDistance / distance : 1;

      const x = dx * scale;
      const y = dy * scale;

      const length = Math.hypot(x, y);

      if (length > 0) {
        joystick.current = {
          x: x / length,
          y: y / length,
        };
      } else {
        // Touching the exact center: move upward by default.
        joystick.current = { x: 0, y: -1 };
      }

      setStickPosition({ x, y });
    }

    function startMusicOnInteraction() {
      if (!gameStartedRef.current) return;

      const audio = audioRef.current;

      if (!audio || musicManuallyPaused.current || !audio.paused) {
        return;
      }

      audio.volume = 0.35;

      audio.play().catch((error) => {
        console.warn("Music playback failed:", error);
      });
    }

    function startJoystick(event) {
      if (!gameStartedRef.current) return;
      if (joystickPointer.current !== null) return;

      startMusicOnInteraction();

      joystickPointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);

      prepareNearMissSounds();
      moveJoystick(event);
    }

    function releaseJoystick(event) {
      // On touchscreens, audio playback may only be
      // permitted when the finger is released.
      startMusicOnInteraction();
      stopJoystick(event);
    }

    function stopJoystick(event) {
      if (joystickPointer.current !== event.pointerId) return;

      joystickPointer.current = null;
      joystick.current = { x: 0, y: 0 };
      setStickPosition({ x: 0, y: 0 });
    }

  return (
    <div className="min-h-screen bg-[#242424] p-6 text-zinc-100 desktop-game-page">
      <audio ref={audioRef} src={BACKGROUND_MUSIC_URL} loop preload="auto" />
      <audio ref={fifthNearMissAudioRef} src={FIFTH_NEAR_MISS_SOUND_URL} preload="auto" />

      <div className="mx-auto w-full max-w-none space-y-0">

        <div className="flex justify-center">
          <div
            style={{
              width: WIDTH * gameScale,
              height: HEIGHT * gameScale,
              position: "relative",
            }}
          >
            {gameStarted && (
              <div
                className="desktop-game-controls fixed z-40 flex gap-2"
                style={{
                  top: desktopControlsPosition?.top,
                  right: desktopControlsPosition?.right,
                }}
              >
                <Button
                  onClick={toggleBackgroundMusic}
                  className="h-9 rounded-xl border border-white/20 bg-zinc-900/60 px-3 text-xs text-white backdrop-blur-sm hover:bg-zinc-900/80"
                >
                  {musicPlaying ? "Pause music" : "Resume music"}
                </Button>

                <Button
                  onClick={resetGame}
                  className="h-9 rounded-xl border border-white/20 bg-zinc-900/60 px-3 text-xs text-white backdrop-blur-sm hover:bg-zinc-900/80"
                >
                  Reset chase
                </Button>

                <Button
                  onClick={toggleFullscreen}
                  className="h-9 rounded-xl border border-white/20 bg-zinc-900/60 px-3 text-xs text-white backdrop-blur-sm hover:bg-zinc-900/80"
                >
                  {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                </Button>
              </div>
            )}

            <div
              style={{
                width: WIDTH,
                height: HEIGHT,
                transform: `scale(${gameScale})`,
                transformOrigin: "top left",
              }}
            >
          <Card className="overflow-hidden !rounded-none !border-0 !bg-transparent !shadow-none !ring-0 !p-0 !gap-0">
            <CardContent className="p-0">
              <div
                ref={boardRef}
                className="relative overflow-hidden bg-emerald-50"
                style={{
                  width: WIDTH,
                  height: HEIGHT,
                  maxWidth: "100%",
                  backgroundImage: `url('${import.meta.env.BASE_URL}background.png')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >

                <div className="absolute inset-0 bg-black/85" />
                
                {!gameStarted && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/65 text-center">
                    <h1 className="text-5xl font-black text-white drop-shadow-lg">
                      Whack-a-Rat
                    </h1>

                    <p className="text-lg font-semibold text-white">
                      Squish the brat and chuw the carrats!
                    </p>

                    <Button
                      onClick={startGame}
                      className="h-16 rounded-2xl bg-white px-10 text-2xl font-black text-zinc-900 shadow-xl hover:bg-zinc-200"
                    >
                      ▶ Start Game
                    </Button>
                    
                    <Button
                      onClick={toggleFullscreen}
                      className="h-12 rounded-xl bg-zinc-700 px-6 text-lg font-semibold text-white hover:bg-zinc-600"
                    >
                      {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    </Button>

                    <p className="text-sm text-zinc-300">
                      WASD / Arrow keys / Mobile joystick
                    </p>
                  </div>
                )}

                <div className="absolute left-2 top-2 z-20 text-sm font-semibold text-white drop-shadow-lg">
                  <div>Carrats chuwed: {nearMisses}</div>
                  <img
                    src={CARRAT_IMAGE}
                    alt="carrat"
                    className="mt-1 h-14 w-14 select-none"
                    draggable={false}
                  />
                </div>

                <motion.div
                  className="absolute z-10"
                  animate={{
                    x: rat.x - RAT_SIZE / 2,
                    y: rat.y - RAT_SIZE / 2,
                    rotate: wiggle ? [-8, 8, -5, 0] : 0,
                  }}
                  transition={{ duration: 0.025, ease: "linear" }}
                >
                  {nearMissTransfer && (
                    <img
                      src={playerFloatingImage}
                      alt="floating reaction"
                      className="absolute h-12 w-12 select-none drop-shadow-sm"
                      style={{ left: 6, top: -40 }}
                      draggable={false}
                    />
                  )}
                  <img
                    src={nearMissTransfer ? PLAYER_NEAR_MISS_IMAGE : ratFacing === "left" ? RAT_LEFT_IMAGE : RAT_RIGHT_IMAGE}
                    alt="rat"
                    className="select-none drop-shadow-sm"
                    style={{ width: RAT_SIZE, height: RAT_SIZE }}
                    draggable={false}
                  />
                </motion.div>

                <motion.div
                  className="absolute z-10"
                  animate={{
                    x: bunny.x - BUNNY_SIZE / 2,
                    y: bunny.y - BUNNY_SIZE / 2,
                    scale: wiggle ? [1, 1.18, 1] : 1,
                  }}
                  transition={{ duration: 0.06, ease: "linear" }}
                >
                  {!nearMissTransfer && (
                    <img
                      src={escapingFloatingImage}
                      alt="floating reaction"
                      className="absolute h-12 w-12 select-none drop-shadow-sm"
                      style={{ left: 6, top: -34 }}
                      draggable={false}
                    />
                  )}
                  <img
                    src={escapingNearMiss ? ESCAPING_NEAR_MISS_IMAGE : bunnyFacing === "left" ? BUNNY_LEFT_IMAGE : BUNNY_RIGHT_IMAGE}
                    alt="bunny"
                    className="select-none drop-shadow-sm"
                    style={{ width: BUNNY_SIZE, height: BUNNY_SIZE }}
                    draggable={false}
                  />
                </motion.div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

{gameStarted && mobileControls?.mode === "portrait" && (
  <div
    className="fixed z-40 flex flex-col items-center gap-2 text-center"
    style={{
      left: mobileControls.left,
      top: mobileControls.top,
      transform: "translateX(-50%)",
      width: "min(95vw, 360px)",
    }}
  >

    <div className="flex flex-wrap justify-center gap-2">
    {gameStarted && (
      <Button onClick={toggleBackgroundMusic} className="h-9 rounded-xl px-3 text-xs">
        {musicPlaying ? "Pause music" : "Play music"}
      </Button>
      )}

      <Button onClick={resetGame} className="h-9 rounded-xl px-3 text-xs">
        Reset chase
      </Button>
      
      <Button
        onClick={toggleFullscreen}
        className="h-9 rounded-xl px-3 text-xs"
      >
        {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </Button>
    </div>
  </div>
)}

{gameStarted && mobileControls?.mode === "landscape" && (
  <div
    className={
      mobileControls.overlay
        ? "fixed z-40 flex w-max max-w-[calc(100vw-16px)] flex-row gap-1"
        : "fixed z-40 flex w-28 flex-col gap-2"
    }
    style={{
      left: mobileControls.left,
      top: mobileControls.top,
      ...(mobileControls.overlay && {
        transform: "translateX(-100%)",
      }),
    }}
  >
  {gameStarted && (
    <Button onClick={toggleBackgroundMusic} className={
      mobileControls.overlay
        ? "h-9 rounded-xl border border-white/20 bg-zinc-900/60 px-2 text-[11px] text-white backdrop-blur-sm hover:bg-zinc-900/80"
        : "h-10 rounded-xl px-2 text-xs"
    }>
      {musicPlaying ? "Pause music" : "Play music"}
    </Button>
    )}

    <Button onClick={resetGame} className={
      mobileControls.overlay
        ? "h-9 rounded-xl border border-white/20 bg-zinc-900/60 px-2 text-[11px] text-white backdrop-blur-sm hover:bg-zinc-900/80"
        : "h-10 rounded-xl px-2 text-xs"
    }>
      Reset chase
    </Button>
    
    <Button
      onClick={toggleFullscreen}
      className={
        mobileControls.overlay
          ? "h-9 rounded-xl border border-white/20 bg-zinc-900/60 px-2 text-[11px] text-white backdrop-blur-sm hover:bg-zinc-900/80"
          : "h-10 rounded-xl px-2 text-xs"
      }
    >
      {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    </Button>
  </div>
)}

    <div
      className="mobile-joystick fixed z-50 h-28 w-28
                 items-center justify-center rounded-full
                 border-2 border-white/20 bg-white/10 select-none"
      style={{
        touchAction: "none",
        left: joystickPlacement?.left ?? -200,
        top: joystickPlacement?.top ?? -200,
      }}
      onTouchStart={startMusicOnInteraction}
      onPointerDown={startJoystick}
      onPointerMove={moveJoystick}
      onPointerUp={releaseJoystick}
      onPointerCancel={stopJoystick}
      onLostPointerCapture={stopJoystick}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2
                   h-14 w-14 rounded-full border-2
                   border-white/30 bg-white/30"
        style={{
          transform: `translate(
            calc(-50% + ${stickPosition.x}px),
            calc(-50% + ${stickPosition.y}px)
          )`,
        }}
      />
    </div>
  </div>
</div>
  );
}
