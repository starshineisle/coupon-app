// --- Configuration ---
// NOTE: These hardcoded values should be replaced by dynamic values from the environment 
// in a production setup, but are kept here for a runnable example.
const firebaseConfig = {
  apiKey: "AIzaSyCk7hbRyj2M2VFRg-cO_8K-EFVZmU4T8kE",
  authDomain: "pocketful-of-weixin-wishes.firebaseapp.com",
  projectId: "pocketful-of-weixin-wishes",
  storageBucket: "pocketful-of-weixin-wishes.firebasestorage.app",
  messagingSenderId: "504118079306",
  appId: "1:504118079306:web:115efa05de6d54b15d5bb3",
  measurementId: "G-MJ1N6WCDVF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM Elements ---
const signInBtn = document.getElementById('signInBtn');
const registerBtn = document.getElementById('registerBtn');
const authMsg = document.getElementById('auth-msg');

const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');

const authArea = document.getElementById('auth-area');
const appArea = document.getElementById('app-area');
const addCouponBtn = document.getElementById('addCouponBtn');
const titleInput = document.getElementById('coupon-title');
const descInput = document.getElementById('coupon-desc');
const expiryInput = document.getElementById('coupon-expiry');

let couponsUnsub = null;

// --- Utility Function for Timestamp Formatting ---
// Checks if the timestamp object has the toDate function (meaning it's a Firestore Timestamp)
const formatTimestamp = (ts) => ts && typeof ts.toDate === 'function' ? ts.toDate().toLocaleDateString() : '';

// --- Auth Handlers ---
registerBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const pass = passInput.value;
  if(!email || !pass){ authMsg.textContent = 'Provide email & password'; return;}
  try{
    await auth.createUserWithEmailAndPassword(email, pass);
    authMsg.textContent = 'Registered & signed in';
  }catch(e){
    authMsg.textContent = e.message;
  }
};

signInBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const pass = passInput.value;
  if(!email || !pass){ authMsg.textContent = 'Provide email & password'; return;}
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    authMsg.textContent = 'Signed in';
  }catch(e){
    authMsg.textContent = e.message;
  }
};

// --- Listen for Auth State ---
auth.onAuthStateChanged(user => {
  if(user){
    // --- ACCESS CONTROL START ---
    const allowedEmails = [
      "dtly@wd40.com",
      "lwx@wd40.com"
    ];

    if (!allowedEmails.includes(user.email)) {
      authMsg.textContent = "Access denied. This account is not allowed.";
      // Force sign out the unauthorized user 
      auth.signOut();
      return; // stop loading the app
    }
    // --- ACCESS CONTROL END ---

    // User is signed in and authorized
    authArea.style.display = 'none';
    appArea.style.display = 'block';
    startListeningCoupons();

  } else {
    // User is signed out
    authArea.style.display = 'block';
    appArea.style.display = 'none';
    // Stop listening for coupons when logged out
    if(couponsUnsub) {
      couponsUnsub();
      couponsUnsub = null;
    }
  }
});

// --- Add coupon ---
addCouponBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();
  const expiry = expiryInput.value;

  if (!title) return console.error("Title required!");

  const user = firebase.auth().currentUser;
  if (!user) return console.error("You must be logged in to add a coupon!");

  try {
    await db.collection("coupons").add({
      title,
      desc,
      expiry: expiry ? new Date(expiry) : null, 
      redeemed: false,
      creator: user.uid, 
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  
    // Clear form fields upon success
    titleInput.value = "";
    descInput.value = "";
    expiryInput.value = "";
  } catch (e) {
    console.error("Error adding coupon: ", e.message);
  }
});


// --- TAB SWITCHING and Collapsible ---
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // Tab switching logic
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      // Switch button style
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Switch content
      tabPanels.forEach(panel => {
        panel.classList.remove("active");
        if (panel.id === "tab-" + target) panel.classList.add("active");
      });
    });
  });

  // Collapsible Add Wish section logic
  const collapseToggle = document.getElementById("collapseToggle");
  const collapseContent = document.getElementById("collapseContent");
  const collapseIcon = document.getElementById("collapseIcon");

  let collapsed = true;

  collapseToggle.onclick = () => {
    collapsed = !collapsed;

    if (collapsed) {
      collapseContent.style.display = "none";
      collapseIcon.textContent = "＋";
    } else {
      collapseContent.style.display = "block";
      collapseIcon.textContent = "✦"; // cute sparkle when opened
    }
  };
});


// --- Real-time listener for coupons ---
function startListeningCoupons() {
  // Check if a listener is already running to avoid duplicates
  if (couponsUnsub) {
    couponsUnsub();
  }
  
  // Start new real-time listener
  couponsUnsub = db.collection('coupons')
    .orderBy('createdAt','asc')
    .onSnapshot(snapshot => {
      const availableEl = document.getElementById('available-coupons');
      const redeemedEl = document.getElementById('redeemed-coupons');
      availableEl.innerHTML = '';
      redeemedEl.innerHTML = '';

      snapshot.forEach(doc => {
        const data = doc.data();

        // Format display text
        const expiryText = formatTimestamp(data.expiry) ? 'Expires: ' + formatTimestamp(data.expiry) : '';
        const redeemedText = formatTimestamp(data.redeemedAt) ? 'Used on: ' + formatTimestamp(data.redeemedAt) : '';

        const tile = document.createElement('div');
        tile.className = data.redeemed ? 'coupon-tile redeemed' : 'coupon-tile';

        // Tile HTML structure
        tile.innerHTML = `
          <h3>${data.title}</h3>
          <p>${data.desc || 'No description provided.'}</p>
          <p class="expiry-text">${expiryText}</p>
          ${data.redeemed ? `<p class="redeemed-text">${redeemedText}</p>` : ''}
          <button class="${data.redeemed ? 'redeemed' : ''}">
            ${data.redeemed ? 'Redeemed' : 'Redeem'}
          </button>
        `;

        const btn = tile.querySelector('button');

        // Add click handler only for available (non-redeemed) coupons
        if (!data.redeemed) {
          btn.addEventListener('click', async () => {
            try {
              await db.collection('coupons').doc(doc.id).update({
                redeemed: true,
                redeemedBy: auth.currentUser.uid,
                redeemedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            } catch(e) {
              console.error('Error updating coupon:', e.message);
            }
          });
        }

        // Append to correct section
        if (data.redeemed) {
          redeemedEl.appendChild(tile);
        } else {
          availableEl.appendChild(tile);
        }
      });
    }, err => console.error('Firestore listen error:', err));
}