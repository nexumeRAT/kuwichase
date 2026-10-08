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
  const [nearMissTransfer, setNearMissTransfer] = useState(false);
  const [specialNearMissTransfer, setSpecialNearMissTransfer] = useState(false);
  const [escapingNearMiss, setEscapingNearMiss] = useState(false);

  const boardRef = useRef(null);
  const keysPressed = useRef(new Set());
  const audioRef = useRef(null);
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

      return { dx, dy };
    }

    function gameLoop(now) {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const direction = getDirection();
      if (direction.dx !== 0 || direction.dy !== 0) {
        moveRat(direction.dx * RAT_SPEED * deltaSeconds, direction.dy * RAT_SPEED * deltaSeconds);
      }

      moveBunny(deltaSeconds);
      animationFrame = requestAnimationFrame(gameLoop);
    }

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) return;
      event.preventDefault();
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

  async function toggleBackgroundMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (fifthNearMissSoundPool.current.length === 0) {
      fifthNearMissSoundPool.current = Array.from({ length: 4 }, () => {
        const sound = new Audio(FIFTH_NEAR_MISS_SOUND_URL);
        sound.preload = "auto";
        sound.volume = 0.9;
        sound.load();
        return sound;
      });
    }

    if (fifthNearMissAudioRef.current) {
      fifthNearMissAudioRef.current.volume = 0.9;
      fifthNearMissAudioRef.current.load();
    }

    await prepareNearMissSounds();

    if (audio.paused) {
      audio.volume = 0.35;
      await audio.play();
      setMusicPlaying(true);
    } else {
      audio.pause();
      setMusicPlaying(false);
    }
  }

  function resetGame() {
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

  return (
    <div className="min-h-screen bg-[#242424] p-6 text-zinc-100">
      <audio ref={audioRef} src={BACKGROUND_MUSIC_URL} loop preload="auto" />
      <audio ref={fifthNearMissAudioRef} src={FIFTH_NEAR_MISS_SOUND_URL} preload="auto" />

      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Whack-a-Rat</h1>
            <p className="mt-2 flex items-center gap-2 text-base text-zinc-400">
              <img
                src="https://cdn.discordapp.com/emojis/1493971581549019147.webp?size=160"
                alt="melee"
                className="h-6 w-6 select-none"
                draggable={false}
              />
              <span>Squish the brat and chuw the carrats! WASD or arrow keys to move.</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={toggleBackgroundMusic} className="rounded-2xl px-5 py-2 shadow-sm">
              {musicPlaying ? "Pause music" : "Play music"}
            </Button>
            <Button onClick={resetGame} className="rounded-2xl px-5 py-2 shadow-sm">
              Reset chase
            </Button>
          </div>
        </div>

        <div className="inline-grid gap-4">
	  <div
	    style={{
	      transform: "scale(1.5)",
	      transformOrigin: "top center",
	      marginBottom: "180px",
	    }}
	  >
          <Card className="overflow-hidden rounded-3xl !border-0 !bg-transparent !shadow-none !ring-0">
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
    </div>
  );
}
