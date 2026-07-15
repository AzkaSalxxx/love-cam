const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const startBtn = document.getElementById("startBtn");

// Array untuk menampung partikel efek love
let particles = [];

// Menghitung jarak antara dua titik (digunakan untuk jempol dan telunjuk)
function getDistance(lm1, lm2) {
  return Math.sqrt(Math.pow(lm1.x - lm2.x, 2) + Math.pow(lm1.y - lm2.y, 2));
}

// Deteksi "Finger Heart" (Love sign Korea)
function isLoveSign(landmarks) {
  // 1. Jarak jempol (titik 4) dan telunjuk (titik 8) sangat dekat
  const dist = getDistance(landmarks[4], landmarks[8]);
  
  // 2. Jari tengah (12), manis (16), dan kelingking (20) ditekuk (ujung lebih bawah dari sendinya)
  const middleFolded = landmarks[12].y > landmarks[10].y;
  const ringFolded = landmarks[16].y > landmarks[14].y;
  const pinkyFolded = landmarks[20].y > landmarks[18].y;

  return dist < 0.08 && middleFolded && ringFolded && pinkyFolded;
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});

hands.onResults((results) => {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Gambar video seperti cermin
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore(); // Kembalikan ke koordinat normal agar efek love tidak terbalik

  let loveDetected = false;

  // 2. Deteksi jari dan munculkan partikel
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    loveDetected = isLoveSign(landmarks);

    if (loveDetected) {
      // Ambil titik tengah antara jempol dan telunjuk
      const midX = (landmarks[4].x + landmarks[8].x) / 2;
      const midY = (landmarks[4].y + landmarks[8].y) / 2;
      
      // Hitung koordinat (dikurangi 1 agar posisinya akurat setelah video di-mirror)
      const spawnX = (1 - midX) * canvas.width;
      const spawnY = midY * canvas.height;

      // Tambahkan partikel baru ke array setiap kali frame mendeteksi love
      particles.push({
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 4, // Gerak acak ke kiri/kanan
        vy: (Math.random() * -3) - 2,  // Gerak ke atas
        alpha: 1,                      // Transparansi awal penuh
        size: Math.random() * 20 + 25  // Ukuran acak
      });
    }
  }

  // 3. Render dan animasikan partikel
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    // Update posisi dan memudarkan efek
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025; 

    // Gambar emoji love
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.font = `${p.size}px Arial`;
    ctx.fillText("❤️", p.x, p.y);

    // Hapus partikel jika sudah hilang sepenuhnya
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
  
  // Reset alpha canvas
  ctx.globalAlpha = 1.0;
  
  // Update status indikator lampu di pojok kanan
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

    // Sembunyikan tombol setelah mulai
    startBtn.style.display = "none";
    statusText.style.background = "#ef4444";
  } catch (error) {
    statusText.style.background = "#f59e0b";
    console.error(error);
  }
});
