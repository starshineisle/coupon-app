// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCk7hbRyj2M2VFRg-cO_8K-EFVZmU4T8kE",
  authDomain: "pocketful-of-weixin-wishes.firebaseapp.com",
  projectId: "pocketful-of-weixin-wishes",
  storageBucket: "pocketful-of-weixin-wishes.firebasestorage.app",
  messagingSenderId: "504118079306",
  appId: "1:504118079306:web:115efa05de6d54b15d5bb3",
  measurementId: "G-MJ1N6WCDVF"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM
const signInBtn = document.getElementById("signInBtn");
const authMsg = document.getElementById("auth-msg");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");

const authArea = document.getElementById("auth-area");
const appArea = document.getElementById("app-area");

const addCouponBtn = document.getElementById("addCouponBtn");
const titleInput = document.getElementById("coupon-title");
const descInput = document.getElementById("coupon-desc");
const expiryInput = document.getElementById("coupon-expiry");

let couponsUnsub = null;

// Format timestamp
const formatTimestamp = (ts) => {
  if (!ts || typeof ts.toDate !== "function") return "";
  const d = ts.toDate();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// --- SIGN IN ---
signInBtn.addEventListener("click", signIn);

function signIn() {
  const email = emailInput.value.trim();
  const password = passInput.value.trim();

  auth.signInWithEmailAndPassword(email, password)
    .catch((error) => {
      authMsg.textContent = error.message;
    });
}

// AUTH STATE LISTENER
auth.onAuthStateChanged(user => {
  if (user) {
    const allowedEmails = ["dtly@wd40.com", "lwx@wd40.com"];

    if (!allowedEmails.includes(user.email)) {
      authMsg.textContent = "Access denied. This account is not allowed.";
      auth.signOut();
      return;
    }

    authArea.style.display = "none";
    appArea.style.display = "block";
    startListeningCoupons();

  } else {
    authArea.style.display = "block";
    appArea.style.display = "none";

    if (couponsUnsub) {
      couponsUnsub();
      couponsUnsub = null;
    }
  }
});

// --- ADD COUPON ---
addCouponBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();
  const expiry = expiryInput.value;

  if (!title) return alert("Title required!");

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in!");

  try {
    await db.collection("coupons").add({
      title,
      desc,
      expiry: expiry ? new Date(expiry) : null,
      redeemed: false,
      creator: user.uid,
      creatorEmail: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    titleInput.value = "";
    descInput.value = "";
    expiryInput.value = "";

  } catch (e) {
    console.error(e.message);
  }
});

// --- UI: TABS + COLLAPSE ---
document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      tabPanels.forEach(panel => {
        panel.classList.remove("active");
        if (panel.id === "tab-" + target) panel.classList.add("active");
      });
    });
  });

  // Collapsible add wish
  const collapseToggle = document.getElementById("collapseToggle");
  const collapseContent = document.getElementById("collapseContent");
  const collapseIcon = document.getElementById("collapseIcon");

  let collapsed = true;
  collapseContent.style.display = "none";

  collapseToggle.onclick = () => {
    collapsed = !collapsed;
    collapseContent.style.display = collapsed ? "none" : "block";
    collapseIcon.textContent = collapsed ? "＋" : "✦";
  };
});

// --- REAL-TIME LISTENER ---
function startListeningCoupons() {
  if (couponsUnsub) couponsUnsub();

  couponsUnsub = db.collection("coupons")
    .orderBy("createdAt", "asc")
    .onSnapshot(snapshot => {
      const availableEl = document.getElementById("available-coupons");
      const redeemedEl = document.getElementById("redeemed-coupons");

      availableEl.innerHTML = "";
      redeemedEl.innerHTML = "";

      snapshot.forEach(doc => {
        const data = doc.data();

        const expiryText = formatTimestamp(data.expiry)
          ? `Expires: ${formatTimestamp(data.expiry)}`
          : "";

        const redeemedText = formatTimestamp(data.redeemedAt)
          ? `Used on: ${formatTimestamp(data.redeemedAt)}`
          : "";

        const creatorName = data.creatorEmail
          ? data.creatorEmail.split("@")[0]
          : "";

        const tile = document.createElement("div");
        tile.className = data.redeemed ? "coupon-tile redeemed" : "coupon-tile";

        tile.innerHTML = `
          <h3>${data.title}</h3>
          <p>${data.desc || "No description provided."}</p>
          <p class="expiry-text">${expiryText}</p>
          <p class="creator-text">${creatorName}</p>
          ${data.redeemed ? `<p class="redeemed-text">${redeemedText}</p>` : ""}
          <button class="${data.redeemed ? "redeemed" : ""}">
            ${data.redeemed ? "Redeemed" : "Redeem"}
          </button>
        `;

        const btn = tile.querySelector("button");

        if (!data.redeemed) {
          btn.addEventListener("click", async () => {
            await db.collection("coupons").doc(doc.id).update({
              redeemed: true,
              redeemedBy: auth.currentUser.uid,
              redeemedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        }

        if (data.redeemed) redeemedEl.appendChild(tile);
        else availableEl.appendChild(tile);
      });
    });
}
