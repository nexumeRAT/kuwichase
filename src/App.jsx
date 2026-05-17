import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const WIDTH = 760;
const HEIGHT = 460;
const RAT_SIZE = 60;
const BUNNY_SIZE = 60;
const SAFE_DISTANCE = 105;
const ESCAPE_DISTANCE = 150;
const RAT_SPEED = 260;

const RAT_LEFT_IMAGE = "https://cdn.discordapp.com/emojis/1424747035713732628.webp?size=160&animated=true";
const RAT_RIGHT_IMAGE = "https://cdn.discordapp.com/emojis/1505464938854879233.webp?size=160&animated=true";
const BUNNY_LEFT_IMAGE = "https://cdn.discordapp.com/emojis/1373223935994364026.webp?size=160&animated=true";
const BUNNY_RIGHT_IMAGE = "https://cdn.discordapp.com/emojis/1419041318365171923.webp?size=160&animated=true";
const RAT_REACTION_IMAGE = "https://cdn.discordapp.com/emojis/1417199232904859748.webp?size=160";
const BACKGROUND_MUSIC_URL = "/sadge.wav";
const BUNNY_MESSAGES = [
  "Sorry, good night!",
  "I won't be free soon sorry.",
  "sorry I couldn't playy",
  "bit distracted sorry",
  "sorry!",
  "I'm busy a bit sorry!",
  "Sorry for being so absent.",
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomSpot() {
  return {
    x: 80 + Math.random() * (WIDTH - 160),
    y: 80 + Math.random() * (HEIGHT - 160),
  };
}

export default function RatBunnyChaseGame() {
  const [rat, setRat] = useState({ x: 90, y: HEIGHT / 2 });
  const [bunny, setBunny] = useState({ x: WIDTH - 110, y: HEIGHT / 2 });
  const [nearMisses, setNearMisses] = useState(0);
  const [message, setMessage] = useState("Use WASD or arrow keys. Catch the bunny... supposedly.");
  const [wiggle, setWiggle] = useState(false);
  const [ratFacing, setRatFacing] = useState("right");
  const [bunnyFacing, setBunnyFacing] = useState("left");
  const [bunnyMessage, setBunnyMessage] = useState("");
  const [showRatReaction, setShowRatReaction] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const boardRef = useRef(null);
  const keysPressed = useRef(new Set());
  const ratReactionTimeout = useRef(null);
  const bunnyMessageTimeout = useRef(null);
  const audioRef = useRef(null);

  function moveRat(dx, dy) {
    if (dx < 0) setRatFacing("left");
    if (dx > 0) setRatFacing("right");

    setRat((currentRat) => {
      const nextRat = {
        x: clamp(currentRat.x + dx, RAT_SIZE / 2, WIDTH - RAT_SIZE / 2),
        y: clamp(currentRat.y + dy, RAT_SIZE / 2, HEIGHT - RAT_SIZE / 2),
      };

      setBunny((currentBunny) => {
        const d = distance(nextRat, currentBunny);

        if (d < SAFE_DISTANCE) {
          setShowRatReaction(true);
          if (ratReactionTimeout.current) clearTimeout(ratReactionTimeout.current);
          ratReactionTimeout.current = setTimeout(() => setShowRatReaction(false), 500);

          setNearMisses((n) => {
            const next = n + 1;
            if (next % 5 === 0) {
              const randomMessage = BUNNY_MESSAGES[Math.floor(Math.random() * BUNNY_MESSAGES.length)];
              setBunnyMessage(randomMessage);
              if (bunnyMessageTimeout.current) clearTimeout(bunnyMessageTimeout.current);
              bunnyMessageTimeout.current = setTimeout(() => setBunnyMessage(""), 2000);
            }
            return next;
          });
          setMessage("Almost! The bunny performs a suspiciously perfect dodge.");
          setWiggle(true);
          setTimeout(() => setWiggle(false), 260);

          const awayX = currentBunny.x - nextRat.x;
          const awayY = currentBunny.y - nextRat.y;
          const length = Math.hypot(awayX, awayY) || 1;
          const sideways = Math.random() > 0.5 ? 1 : -1;

          let escaped = {
            x:
              currentBunny.x +
              (awayX / length) * ESCAPE_DISTANCE +
              (-awayY / length) * sideways * 64,
            y:
              currentBunny.y +
              (awayY / length) * ESCAPE_DISTANCE +
              (awayX / length) * sideways * 64,
          };

          escaped.x = clamp(escaped.x, BUNNY_SIZE / 2, WIDTH - BUNNY_SIZE / 2);
          escaped.y = clamp(escaped.y, BUNNY_SIZE / 2, HEIGHT - BUNNY_SIZE / 2);

          if (distance(nextRat, escaped) < SAFE_DISTANCE) {
            escaped = randomSpot();
          }

          if (escaped.x < currentBunny.x) setBunnyFacing("left");
          if (escaped.x > currentBunny.x) setBunnyFacing("right");

          return escaped;
        }

        if (d < 170) {
          setMessage("The bunny watches you with deeply unfair confidence.");
        } else {
          setMessage("Use WASD or arrow keys. Surely this time will work.");
        }

        return currentBunny;
      });

      return nextRat;
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

      animationFrame = requestAnimationFrame(gameLoop);
    }

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) return;
      event.preventDefault();
      keysPressed.current.add(key);
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


  async function toggleBackgroundMusic() {
    const audio = audioRef.current;
    if (!audio) return;

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
    setRat({ x: 90, y: HEIGHT / 2 });
    setBunny({ x: WIDTH - 110, y: HEIGHT / 2 });
    setRatFacing("right");
    setBunnyFacing("left");
    setNearMisses(0);
    setBunnyMessage("");
    setShowRatReaction(false);
    if (ratReactionTimeout.current) clearTimeout(ratReactionTimeout.current);
    if (bunnyMessageTimeout.current) clearTimeout(bunnyMessageTimeout.current);
    setMessage("Use WASD or arrow keys. Catch the bunny... supposedly.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-stone-100 to-amber-50 p-6 text-zinc-900">
      <audio ref={audioRef} src={BACKGROUND_MUSIC_URL} loop preload="auto" />

      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Catch the buny!</h1>
            <p className="mt-2 text-base text-zinc-600">
              A tiny tragedy about a rat desperately trying to catch up.
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
          <Card className="overflow-hidden rounded-3xl border-zinc-200 shadow-xl">
            <CardContent className="p-0">
              <div
                ref={boardRef}
                className="relative overflow-hidden bg-emerald-50"
                style={{ width: WIDTH, height: HEIGHT, maxWidth: "100%", backgroundImage: "url('/background.png')", backgroundSize: "cover", backgroundPosition: "center",}}
              >

                <div className="absolute left-5 top-5 rounded-full bg-white/75 px-4 py-2 text-sm font-semibold shadow-sm">
                  Near misses: {nearMisses}
                </div>

                {showRatReaction && (
                  <img
                    src={RAT_REACTION_IMAGE}
                    alt="rat reaction"
                    className="absolute z-10 h-14 w-14 select-none drop-shadow-sm"
                    style={{
                      left: clamp(rat.x - 28, 8, WIDTH - 64),
                      top: clamp(rat.y - RAT_SIZE / 2 - 56, 8, HEIGHT - 64),
                    }}
                    draggable={false}
                  />
                )}

                <motion.img
                  src={ratFacing === "left" ? RAT_LEFT_IMAGE : RAT_RIGHT_IMAGE}
                  alt="rat"
                  className="absolute select-none drop-shadow-sm"
                  style={{ width: RAT_SIZE, height: RAT_SIZE }}
                  draggable={false}
                  animate={{
                    x: rat.x - RAT_SIZE / 2,
                    y: rat.y - RAT_SIZE / 2,
                    rotate: wiggle ? [-8, 8, -5, 0] : 0,
                  }}
                  transition={{ duration: 0.025, ease: "linear" }}
                />

                {bunnyMessage && (
                  <div
                    className="absolute z-10 max-w-56 rounded-2xl bg-white/90 px-4 py-2 text-center text-sm font-bold text-zinc-800 shadow-lg"
                    style={{
                      left: clamp(bunny.x - 96, 8, WIDTH - 232),
                      top: clamp(bunny.y - BUNNY_SIZE / 2 - 54, 8, HEIGHT - 60),
                    }}
                  >
                    {bunnyMessage}
                  </div>
                )}

                <motion.img
                  src={bunnyFacing === "left" ? BUNNY_LEFT_IMAGE : BUNNY_RIGHT_IMAGE}
                  alt="bunny"
                  className="absolute select-none drop-shadow-sm"
                  style={{ width: BUNNY_SIZE, height: BUNNY_SIZE }}
                  draggable={false}
                  animate={{
                    x: bunny.x - BUNNY_SIZE / 2,
                    y: bunny.y - BUNNY_SIZE / 2,
                    scale: wiggle ? [1, 1.18, 1] : 1,
                  }}
                  transition={{ type: "spring", stiffness: 360, damping: 18 }}
                />

                <motion.div
                  className="absolute rounded-full border-2 border-dashed border-pink-300/70"
                  animate={{
                    x: bunny.x - SAFE_DISTANCE,
                    y: bunny.y - SAFE_DISTANCE,
                    width: SAFE_DISTANCE * 2,
                    height: SAFE_DISTANCE * 2,
                    opacity: wiggle ? 0.4 : 0.13,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
