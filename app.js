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

// Real-time listener for coupons (ordered by createdAt)
function startListeningCoupons(){
  couponsUnsub = db.collection('coupons').orderBy('createdAt','asc')
    .onSnapshot(snapshot => {
      couponListEl.innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement('li');
        li.className = 'coupon';
        const left = document.createElement('div'); left.className = 'left';
        const title = document.createElement('div'); title.className = 'title'; title.textContent = data.title;
        const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = data.desc || '';
        const meta = document.createElement('div'); meta.className = 'meta';
        const expiryText = data.expiry ? ('Expires: ' + data.expiry.toDate().toLocaleDateString()) : '';
        meta.textContent = expiryText;
        left.appendChild(title); left.appendChild(desc); left.appendChild(meta);

        const right = document.createElement('div');
        const badge = document.createElement('span');
        badge.className = 'badge ' + (data.redeemed ? 'redeemed' : 'available');
        badge.textContent = data.redeemed ? 'Redeemed' : 'Available';

        const btn = document.createElement('button');
        btn.className = 'small-btn';
        btn.textContent = data.redeemed ? 'Undo' : 'Redeem';
        btn.onclick = async () => {
          try{
            await db.collection('coupons').doc(doc.id).update({
              redeemed: !data.redeemed,
              redeemedBy: !data.redeemed ? auth.currentUser.uid : null,
              redeemedAt: !data.redeemed ? firebase.firestore.FieldValue.serverTimestamp() : null
            });
          }catch(e){
            alert('Error updating: ' + e.message);
          }
        };

        right.appendChild(badge);
        right.appendChild(document.createTextNode(' '));
        right.appendChild(btn);

        li.appendChild(left);
        li.appendChild(right);
        couponListEl.appendChild(li);
      });
    }, err => {
      console.error('listen error', err);
    });
}
