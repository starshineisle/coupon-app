// ===== Replace with your Firebase config from the Firebase console =====
const firebaseConfig = {
  apiKey: "AIzaSyCk7hbRyj2M2VFRg-cO_8K-EFVZmU4T8kE",
  authDomain: "pocketful-of-weixin-wishes.firebaseapp.com",
  projectId: "pocketful-of-weixin-wishes",
  storageBucket: "pocketful-of-weixin-wishes.firebasestorage.app",
  messagingSenderId: "504118079306",
  appId: "1:504118079306:web:115efa05de6d54b15d5bb3",
  measurementId: "G-MJ1N6WCDVF"
};
// =====================================================================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const signInBtn = document.getElementById('signInBtn');
const registerBtn = document.getElementById('registerBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authMsg = document.getElementById('auth-msg');

const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');

const appArea = document.getElementById('app-area');
const couponListEl = document.getElementById('coupon-list');
const addCouponBtn = document.getElementById('addCouponBtn');
const titleInput = document.getElementById('coupon-title');
const descInput = document.getElementById('coupon-desc');
const expiryInput = document.getElementById('coupon-expiry');

let couponsUnsub = null;

// Auth handlers
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

signOutBtn.onclick = async () => {
  await auth.signOut();
};

// Listen for auth state
auth.onAuthStateChanged(user => {
  if(user){
    document.getElementById('auth-area').style.display = 'none';
    appArea.style.display = 'block';
    signOutBtn.style.display = 'inline-block';
    startListeningCoupons();
  } else {
    document.getElementById('auth-area').style.display = 'block';
    appArea.style.display = 'none';
    signOutBtn.style.display = 'none';
    if(couponsUnsub) couponsUnsub();
  }
});

// Add coupon
addCouponBtn.onclick = async () => {
  const user = auth.currentUser;
  if(!user){ alert('Sign in first'); return; }
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();
  const expiry = expiryInput.value ? new Date(expiryInput.value) : null;
  if(!title) { alert('Give it a title'); return; }
  try{
    await db.collection('coupons').add({
      title,
      desc,
      expiry: expiry ? firebase.firestore.Timestamp.fromDate(expiry) : null,
      redeemed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid
    });
    titleInput.value = ''; descInput.value = ''; expiryInput.value = '';
  }catch(e){
    alert('Error adding: ' + e.message);
  }
};

// --- TAB SWITCHING ---
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanels = document.querySelectorAll(".tab-panel");

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
});


// Real-time listener for coupons (ordered by createdAt)
function startListeningCoupons() {
  couponsUnsub = db.collection('coupons')
    .orderBy('createdAt','asc')
    .onSnapshot(snapshot => {
      const availableEl = document.getElementById('available-coupons');
      const redeemedEl = document.getElementById('redeemed-coupons');
      availableEl.innerHTML = '';
      redeemedEl.innerHTML = '';

      snapshot.forEach(doc => {
        const data = doc.data();

        const tile = document.createElement('div');
        tile.className = 'coupon-tile';

        const expiryText = data.expiry ? 'Expires: ' + data.expiry.toDate().toLocaleDateString() : '';

        // Redeemed date
        const redeemedText = data.redeemedAt ? 'Used on: ' + data.redeemedAt.toDate().toLocaleDateString() : '';

        tile.innerHTML = `
          <h3>${data.title}</h3>
          <p>${data.desc || ''}</p>
          <p class="expiry-text">${expiryText}</p>
          ${data.redeemed ? `<p class="redeemed-text">${redeemedText}</p>` : ''}
          <button class="${data.redeemed ? 'redeemed' : ''}">
            ${data.redeemed ? 'Redeemed' : 'Redeem'}
          </button>
        `;

        const btn = tile.querySelector('button');

        // Only clickable if not redeemed
        if (!data.redeemed) {
          btn.addEventListener('click', async () => {
            try {
              await db.collection('coupons').doc(doc.id).update({
                redeemed: true,
                redeemedBy: auth.currentUser.uid,
                redeemedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            } catch(e) {
              alert('Error updating: ' + e.message);
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
    }, err => console.error('listen error', err));
}
