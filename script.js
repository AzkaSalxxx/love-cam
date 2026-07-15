const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const startBtn = document.getElementById("startBtn");

// Array partikel dan variasi emoji love
let particles = [];
const loveEmojis = ['❤️', '💖', '💗', '💓', '💕', '💘', '💝', '✨'];

function getDistance(lm1, lm2) {
  return Math.sqrt(Math.pow(lm1.x - lm2.x, 2) + Math.pow(lm1.y - lm2.y, 2));
}

// Deteksi Love Sign Dua Tangan (seperti di referensi gambar)
function isTwoHandHeart(multiHandLandmarks) {
  // Wajib ada 2 tangan terdeteksi di kamera
  if (multiHandLandmarks.length !== 2) return false;

  const hand1 = multiHandLandmarks[0];
  const hand2 = multiHandLandmarks[1];

  // 1. Ujung jempol (titik 4) kedua tangan harus saling bersentuhan / sangat dekat
  const thumbsDistance = getDistance(hand1[4], hand2[4]);
  
  // 2. Ujung telunjuk (titik 8) atau jari tengah (titik 12) saling bersentuhan melengkung
  const indexDistance = getDistance(hand1[8], hand2[8]);
  const middleDistance = getDistance(hand1[12], hand2[12]);

  // Jika jarak jempol dekat, DAN (jarak telunjuk ATAU jari tengah dekat)
  // Angka 0.15 adalah toleransi jarak (karena koordinat MediaPipe dari 0.0 - 1.0)
  return thumbsDistance < 0.15 && (indexDistance < 0.15 || middleDistance < 0.15);
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 2, // DIUBAH: Mengizinkan deteksi 2 tangan
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});

hands.onResults((results) => {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Gambar video seperti cermin
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  let loveDetected = false;

  if (results.multiHandLandmarks) {
    loveDetected = isTwoHandHeart(results.multiHandLandmarks);

    if (loveDetected) {
      const hand1 = results.multiHandLandmarks[0];
      const hand2 = results.multiHandLandmarks[1];

      // Titik tengah efek muncul di antara kedua jempol
      const midX = (hand1[4].x + hand2[4].x) / 2;
      const midY = (hand1[4].y + hand2[4].y) / 2;
      
      const spawnX = (1 - midX) * canvas.width;
      const spawnY = midY * canvas.height;

      // Batasi jumlah partikel agar tidak lag (spawn sekitar 40% dari frame)
      if (Math.random() > 0.6) {
        const emoji = loveEmojis[Math.floor(Math.random() * loveEmojis.length)];
        const isZooming = Math.random() > 0.6; // 40% kemungkinan efeknya membesar ke depan

        particles.push({
          x: spawnX + (Math.random() - 0.5) * 60, // Sebaran X acak
          y: spawnY + (Math.random() - 0.5) * 40, // Sebaran Y acak
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() * -4) - 1, // Melayang ke atas
          alpha: 1,
          size: Math.random() * 20 + 30, // Ukuran dasar 30-50px
          emoji: emoji,
          isZooming: isZooming,
          scale: 1,
          scaleRate: isZooming ? (Math.random() * 0.04 + 0.02) : 0 // Kecepatan membesar
        });
      }
    }
  }

  // Render dan animasikan partikel
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    p.x += p.vx;
    p.y += p.vy;
    
    // Logika memudar (jika membesar/maju, memudarnya lebih lambat agar terasa nyata)
    p.alpha -= p.isZooming ? 0.01 : 0.02; 
    
    if (p.isZooming) {
      p.scale += p.scaleRate; // Efek membesar (maju ke kamera)
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    
    // Pindahkan titik pusat rotasi/scale ke tengah partikel
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);
    
    ctx.font = `${p.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.emoji, 0, 0); // Gambar di 0,0 karena sudah di-translate
    
    ctx.restore();

    // Hapus jika sudah tak terlihat
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
  
  statusText.style.background = loveDetected ? "#22c55e" : "#ef4444";
});

startBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 1280,
        height: 720,
        facingMode: "user",
      },
      audio: false,
    });

    video.srcObject = stream;

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 1280,
      height: 720,
    });

    camera.start();
    startBtn.style.display = "none";
    statusText.style.background = "#ef4444";
  } catch (error) {
    statusText.style.background = "#f59e0b";
    console.error(error);
  }
});
