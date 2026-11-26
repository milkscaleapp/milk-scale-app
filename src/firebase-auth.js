import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, runTransaction, orderBy, limit } from 'firebase/firestore';
const firebaseConfig = { apiKey:'AIzaSyC0ppOgik5r-4dO66DH1VOn-748iErjxS8', authDomain:'milk-scale-b4ec4.firebaseapp.com', projectId:'milk-scale-b4ec4', storageBucket:'milk-scale-b4ec4.firebasestorage.app', messagingSenderId:'919647485111', appId:'1:919647485111:web:74dceafb3d44d5bb536132' };
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
setPersistence(auth,browserLocalPersistence).catch(e=>console.warn('Auth persistence:',e?.code||e));
function getCurrentUser(){if(auth.currentUser)return Promise.resolve(auth.currentUser);return new Promise(resolve=>{const unsub=onAuthStateChanged(auth,u=>{unsub();resolve(u||null)},()=>{unsub();resolve(null)})})}
function validateCredentials(email,password){if(!email||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('सही ईमेल पता दर्ज करें।');if(typeof password!=='string'||password.length<6)throw new Error('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')}
async function createAccount(email,password){email=String(email||'').trim();validateCredentials(email,password);return(await createUserWithEmailAndPassword(auth,email,password)).user}
async function signIn(email,password){email=String(email||'').trim();validateCredentials(email,password);return(await signInWithEmailAndPassword(auth,email,password)).user}
async function sendPasswordReset(email){email=String(email||'').trim();if(!email||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('सही ईमेल पता दर्ज करें।');return sendPasswordResetEmail(auth,email)}
async function signOut(){await firebaseSignOut(auth)}
async function getProfile(){const u=await getCurrentUser();if(!u)return null;const s=await getDoc(doc(db,'profiles',u.uid));return s.exists()?s.data():null}
async function ensureProfile(role){const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');if(!['owner','customer'].includes(role))throw new Error('भूमिका सही नहीं है।');const ref=doc(db,'profiles',u.uid),snap=await getDoc(ref);if(snap.exists()){if(snap.data().role!==role)throw new Error('इस अकाउंट की भूमिका पहले से तय है।');return snap.data()}const profile={uid:u.uid,email:u.email||'',role,createdAt:serverTimestamp()};await setDoc(ref,profile);return profile}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(8);crypto.getRandomValues(bytes);return Array.from(bytes,b=>chars[b%chars.length]).join('')}
async function createInvitation(customerName,customerPhone){const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');const p=await getProfile();if(!p||p.role!=='owner')throw new Error('केवल Dairy Owner रिक्वेस्ट भेज सकता है।');customerName=String(customerName||'').trim();customerPhone=String(customerPhone||'').replace(/[^0-9+]/g,'');if(!customerName)throw new Error('ग्राहक का नाम दर्ज करें।');if(!/^\+?[0-9]{8,15}$/.test(customerPhone))throw new Error('ग्राहक का मोबाइल नंबर सही दर्ज करें।');let code=randomCode();for(let n=0;n<5;n++){const ref=doc(db,'invitations',code);try{await runTransaction(db,async tx=>{const old=await tx.get(ref);if(old.exists())throw new Error('CODE_COLLISION');tx.set(ref,{ownerUid:u.uid,customerName,customerPhone,status:'pending',createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+7*86400000)})});return code}catch(e){if(e.message!=='CODE_COLLISION')throw e;code=randomCode()}}throw new Error('Invitation Code नहीं बन पाया।')}
async function getMyInvitations(){const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');const s=await getDocs(query(collection(db,'invitations'),where('ownerUid','==',u.uid)));return s.docs.map(d=>({code:d.id,...d.data()}))}
async function respondToInvitation(code,accept){const u=await getCurrentUser();if(!u)throw new Error('पहले Customer अकाउंट से लॉगिन करें।');code=String(code||'').trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code))throw new Error('Invitation Code सही नहीं है।');const ref=doc(db,'invitations',code);await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('Invitation Code नहीं मिला।');const d=snap.data();if(d.status!=='pending'||d.expiresAt.toMillis()<Date.now())throw new Error('रिक्वेस्ट समाप्त या पहले ही इस्तेमाल हो चुकी है।');tx.update(ref,{status:accept?'accepted':'rejected',customerUid:u.uid,respondedAt:serverTimestamp()});if(accept)tx.set(doc(db,'connections',d.ownerUid+'_'+u.uid),{ownerUid:d.ownerUid,customerUid:u.uid,invitationCode:code,status:'active',createdAt:serverTimestamp()})})}
async function getMyConnections(){const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');const [a,b]=await Promise.all([getDocs(query(collection(db,'connections'),where('ownerUid','==',u.uid))),getDocs(query(collection(db,'connections'),where('customerUid','==',u.uid)))]);return [...a.docs,...b.docs].map(d=>d.data())}
window.MilkScaleAuth={getCurrentUser,createAccount,signIn,sendPasswordReset,signOut,getProfile,ensureProfile,createInvitation,getMyInvitations,respondToInvitation,getMyConnections};

async function createConnectionRequest(displayName=''){
 const u=await getCurrentUser(); if(!u) throw new Error('पहले लॉगिन करें।');
 const p=await getProfile(); if(!p) throw new Error('पहले भूमिका चुनें।');
 const code=randomCode(); await setDoc(doc(db,'connectionRequests',code),{requesterUid:u.uid,requesterEmail:u.email||'',requesterRole:p.role,requesterName:String(displayName||u.email||'').slice(0,80),status:'pending',createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+7*86400000)});
 return code;
}
async function respondToConnectionRequest(code,accept){
 const u=await getCurrentUser(); if(!u) throw new Error('लॉगिन आवश्यक है।');
 const p=await getProfile(); if(!p) throw new Error('पहले भूमिका सेव करें।');
 code=String(code||'').trim().toUpperCase(); const ref=doc(db,'connectionRequests',code);
 await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('रिक्वेस्ट कोड नहीं मिला।');const d=snap.data();if(d.status!=='pending'||d.expiresAt.toMillis()<Date.now())throw new Error('रिक्वेस्ट समाप्त या पहले इस्तेमाल हो चुकी है।');if(d.requesterUid===u.uid)throw new Error('अपनी ही रिक्वेस्ट स्वीकार नहीं कर सकते।');if(d.requesterRole===p.role)throw new Error('Owner और Customer की अलग-अलग भूमिकाएँ होनी चाहिए।');tx.update(ref,{status:accept?'accepted':'rejected',targetUid:u.uid,targetEmail:u.email||'',targetRole:p.role,respondedAt:serverTimestamp()});if(accept){const ownerUid=p.role==='owner'?u.uid:d.requesterUid;const customerUid=p.role==='customer'?u.uid:d.requesterUid;tx.set(doc(db,'connections',ownerUid+'_'+customerUid),{ownerUid,customerUid,status:'active',requestCode:code,createdAt:serverTimestamp()});}});
}
async function getMyConnectionRequests(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const [a,b]=await Promise.all([getDocs(query(collection(db,'connectionRequests'),where('requesterUid','==',u.uid))),getDocs(query(collection(db,'connectionRequests'),where('targetUid','==',u.uid)))]);
 return [...a.docs,...b.docs].map(d=>({code:d.id,...d.data()}));
}
async function syncMilkEntry(entry,customerUid){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const p=await getProfile();if(!p||p.role!=='owner')throw new Error('केवल Owner दूध की एंट्री भेज सकता है।');
 if(!customerUid)throw new Error('पहले ग्राहक अकाउंट जोड़ें।');
 const id=String(entry.id||Date.now()); const ref=doc(db,'dairyEntries',u.uid+'_'+customerUid+'_'+id); const old=await getDoc(ref); if(old.exists()) return id;
 await setDoc(ref,{ownerUid:u.uid,customerUid,entryId:id,customer:String(entry.customer||''),date:String(entry.date||''),shift:String(entry.shift||''),kg:Number(entry.kg),sample:Number(entry.sample||0),rate:Number(entry.rate),total:Number(entry.total),createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:false});
 return id;
}
async function getMyMilkEntries(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है。');
 const p=await getProfile();const field=p?.role==='owner'?'ownerUid':'customerUid';
 const snap=await getDocs(query(collection(db,'dairyEntries'),where(field,'==',u.uid)));
 return snap.docs.map(d=>({cloudId:d.id,...d.data()})).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,500);
}
async function addPayment(customerUid,amount,note='',date=new Date().toISOString().slice(0,10)){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');const p=await getProfile();
 if(!p||p.role!=='owner')throw new Error('भुगतान केवल Owner दर्ज कर सकता है।');
 amount=Number(amount);if(!customerUid||!Number.isFinite(amount)||amount<=0)throw new Error('रकम सही दर्ज करें।');
 const ref=await addDoc(collection(db,'dairyPayments'),{ownerUid:u.uid,customerUid,amount,note:String(note||'').slice(0,200),date,status:'saved',createdAt:serverTimestamp()});return ref.id;
}
async function getMyPayments(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');const p=await getProfile();const field=p?.role==='owner'?'ownerUid':'customerUid';
 const snap=await getDocs(query(collection(db,'dairyPayments'),where(field,'==',u.uid)));
 return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,500);
}
async function removeConnection(connectionId){throw new Error('कनेक्शन हटाने की सुविधा अगले सुरक्षा अपडेट में जोड़ी जाएगी।');}
window.MilkScaleAuth={...window.MilkScaleAuth,createConnectionRequest,respondToConnectionRequest,getMyConnectionRequests,syncMilkEntry,getMyMilkEntries,addPayment,getMyPayments,removeConnection};
