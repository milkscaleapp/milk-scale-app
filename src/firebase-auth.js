import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, updateProfile, getIdToken, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, runTransaction, orderBy, limit } from 'firebase/firestore';
const firebaseConfig = { apiKey:'AIzaSyC0ppOgik5r-4dO66DH1VOn-748iErjxS8', authDomain:'milk-scale-b4ec4.firebaseapp.com', projectId:'milk-scale-b4ec4', storageBucket:'milk-scale-b4ec4.firebasestorage.app', messagingSenderId:'919647485111', appId:'1:919647485111:web:74dceafb3d44d5bb536132' };
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
setPersistence(auth,browserLocalPersistence).catch(e=>console.warn('Auth persistence:',e?.code||e));
async function getCurrentUser(){let u=auth.currentUser;if(!u)u=await new Promise(resolve=>{const unsub=onAuthStateChanged(auth,user=>{unsub();resolve(user||null)},()=>{unsub();resolve(null)})});if(!u)return null;try{await u.reload();u=auth.currentUser||u;if(u.emailVerified)await getIdToken(u,true);}catch(e){console.warn('Auth refresh:',e?.code||e)}return u.emailVerified?u:null}
function validateCredentials(email,password){if(!email||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('सही ईमेल पता दर्ज करें।');if(typeof password!=='string'||password.length<6)throw new Error('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')}
async function createAccount(displayName,email,password){displayName=String(displayName||'').trim().slice(0,60);email=String(email||'').trim();validateCredentials(email,password);if(!displayName)throw new Error('अपना नाम दर्ज करें।');const credential=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(credential.user,{displayName});await sendEmailVerification(credential.user);await firebaseSignOut(auth);return {email:credential.user.email,displayName,verificationSent:true}}
async function signIn(email,password){email=String(email||'').trim();validateCredentials(email,password);const credential=await signInWithEmailAndPassword(auth,email,password);await credential.user.reload();if(!credential.user.emailVerified){await sendEmailVerification(credential.user);await firebaseSignOut(auth);const e=new Error('ईमेल अभी सत्यापित नहीं है। आपके ईमेल पर नया Verification Link भेजा गया है। Inbox/Spam में लिंक खोलकर फिर लॉगिन करें।');e.code='auth/email-not-verified';throw e;}return credential.user}
async function sendPasswordReset(email){email=String(email||'').trim();if(!email||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('सही ईमेल पता दर्ज करें।');return sendPasswordResetEmail(auth,email)}
async function signOut(){await firebaseSignOut(auth)}
async function getProfile(){const u=await getCurrentUser();if(!u)return null;const s=await getDoc(doc(db,'profiles',u.uid));return s.exists()?s.data():null}
async function ensureProfile(role,displayName=''){
 const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');
 if(!['owner','customer'].includes(role))throw new Error('भूमिका सही नहीं है।');
 const ref=doc(db,'profiles',u.uid),snap=await getDoc(ref);
 const name=String(displayName||u.displayName||u.email?.split('@')[0]||'Milk Scale User').trim().slice(0,60);
 const dairyId=snap.exists()?(snap.data().dairyId||'MS'+u.uid.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase()):'MS'+u.uid.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase();
 const username=snap.exists()?(snap.data().username||((name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,14)||'dairy')+dairyId.slice(-4).toLowerCase())):((name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,14)||'dairy')+dairyId.slice(-4).toLowerCase());
 if(snap.exists()&&snap.data().role!==role)throw new Error('इस अकाउंट की भूमिका पहले से तय है।');
 const profile={uid:u.uid,email:u.email||'',displayName:name,username,dairyId,role,createdAt:snap.exists()?snap.data().createdAt:serverTimestamp()};
 if(snap.exists()){if(!snap.data().dairyId)await updateDoc(ref,{displayName:name,username,dairyId});}
 else await setDoc(ref,profile);
 if(role==='owner')await setDoc(doc(db,'dairyDirectory',dairyId),{ownerUid:u.uid,displayName:name,username,dairyId,avatarData:snap.exists()?(snap.data().avatarData||''):'',active:true,createdAt:snap.exists()?(snap.data().createdAt||serverTimestamp()):serverTimestamp()},{merge:true});
 return profile;
}
async function updateProfileDetails(displayName,role){
 const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');
 displayName=String(displayName||'').trim().slice(0,60);if(displayName.length<2)throw new Error('नाम कम से कम 2 अक्षर का लिखें।');
 if(!['owner','customer'].includes(role))throw new Error('अकाउंट का प्रकार चुनें।');
 const ref=doc(db,'profiles',u.uid),snap=await getDoc(ref);if(!snap.exists())throw new Error('प्रोफाइल उपलब्ध नहीं है।');
 const old=snap.data();if(old.role!==role){const connections=await getMyConnections();if(connections.length)throw new Error('अकाउंट का प्रकार बदलने से पहले सभी सक्रिय Dairy कनेक्शन हटाने होंगे।');}
 await updateDoc(ref,{displayName,role});
 if(old.role==='owner'&&role!=='owner'&&old.dairyId)await updateDoc(doc(db,'dairyDirectory',old.dairyId),{active:false,displayName});
 if(role==='owner')await setDoc(doc(db,'dairyDirectory',old.dairyId),{ownerUid:u.uid,displayName,username:old.username,dairyId:old.dairyId,avatarData:old.avatarData||'',active:true,createdAt:old.createdAt||serverTimestamp()},{merge:true});
 return true;
}
async function updateProfilePhoto(avatarData){
 const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');
 if(typeof avatarData!=='string'||!avatarData.startsWith('data:image/jpeg;base64,')||avatarData.length>450000)throw new Error('फोटो का आकार बहुत बड़ा है। दूसरी फोटो चुनें।');
 const ref=doc(db,'profiles',u.uid),snap=await getDoc(ref);if(!snap.exists())throw new Error('पहले अपनी भूमिका सेव करें।');
 await updateDoc(ref,{avatarData});
 const p=snap.data();if(p.role==='owner'&&p.dairyId)await updateDoc(doc(db,'dairyDirectory',p.dairyId),{avatarData});
 return true;
}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(8);crypto.getRandomValues(bytes);return Array.from(bytes,b=>chars[b%chars.length]).join('')}
async function createInvitation(customerName,customerPhone){const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');const p=await getProfile();if(!p||p.role!=='owner')throw new Error('केवल Dairy Owner रिक्वेस्ट भेज सकता है।');customerName=String(customerName||'').trim();customerPhone=String(customerPhone||'').replace(/[^0-9+]/g,'');if(!customerName)throw new Error('ग्राहक का नाम दर्ज करें।');if(!/^\+?[0-9]{8,15}$/.test(customerPhone))throw new Error('ग्राहक का मोबाइल नंबर सही दर्ज करें।');let code=randomCode();for(let n=0;n<5;n++){const ref=doc(db,'invitations',code);try{await runTransaction(db,async tx=>{const old=await tx.get(ref);if(old.exists())throw new Error('CODE_COLLISION');tx.set(ref,{ownerUid:u.uid,customerName,customerPhone,status:'pending',createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+7*86400000)})});return code}catch(e){if(e.message!=='CODE_COLLISION')throw e;code=randomCode()}}throw new Error('Invitation Code नहीं बन पाया।')}
async function getMyInvitations(){const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');const s=await getDocs(query(collection(db,'invitations'),where('ownerUid','==',u.uid)));return s.docs.map(d=>({code:d.id,...d.data()}))}
async function respondToInvitation(code,accept){const u=await getCurrentUser();if(!u)throw new Error('पहले Customer अकाउंट से लॉगिन करें।');code=String(code||'').trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code))throw new Error('Invitation Code सही नहीं है।');const ref=doc(db,'invitations',code);await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('Invitation Code नहीं मिला।');const d=snap.data();if(d.status!=='pending'||d.expiresAt.toMillis()<Date.now())throw new Error('रिक्वेस्ट समाप्त या पहले ही इस्तेमाल हो चुकी है।');tx.update(ref,{status:accept?'accepted':'rejected',customerUid:u.uid,respondedAt:serverTimestamp()});if(accept)tx.set(doc(db,'connections',d.ownerUid+'_'+u.uid),{ownerUid:d.ownerUid,customerUid:u.uid,invitationCode:code,status:'active',createdAt:serverTimestamp()})})}
async function getMyConnections(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const [a,b]=await Promise.all([getDocs(query(collection(db,'connections'),where('ownerUid','==',u.uid))),getDocs(query(collection(db,'connections'),where('customerUid','==',u.uid)))]);
 return await Promise.all([...a.docs,...b.docs].map(async snap=>{
  const connection={id:snap.id,...snap.data()};
  if(connection.ownerUid!==u.uid){const directory=await getDocs(query(collection(db,'dairyDirectory'),where('ownerUid','==',connection.ownerUid),limit(1)));connection.dairyProfile=directory.empty?null:directory.docs[0].data();}
  return connection;
 }));
}
window.MilkScaleAuth={getCurrentUser,createAccount,signIn,sendPasswordReset,signOut,getProfile,ensureProfile,createInvitation,getMyInvitations,respondToInvitation,getMyConnections,updateProfilePhoto,updateProfileDetails};

async function createConnectionRequest(displayName=''){
 const u=await getCurrentUser(); if(!u) throw new Error('पहले लॉगिन करें।');
 const p=await getProfile(); if(!p) throw new Error('पहले भूमिका चुनें।');
 const data={requesterUid:u.uid,requesterEmail:u.email||'',requesterRole:p.role,requesterName:String(displayName||u.email||'').slice(0,80),status:'pending',createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+7*86400000)};
 for(let n=0;n<5;n++){
  const code=randomCode(), ref=doc(db,'connectionRequests',code);
  try{await runTransaction(db,async tx=>{const old=await tx.get(ref);if(old.exists())throw new Error('CODE_COLLISION');tx.set(ref,data);});return code;}
  catch(e){if(e.message!=='CODE_COLLISION')throw e;}
 }
 throw new Error('रिक्वेस्ट कोड नहीं बन पाया। दोबारा प्रयास करें।');
}
async function respondToConnectionRequest(code,accept){
 const u=await getCurrentUser(); if(!u) throw new Error('लॉगिन आवश्यक है।');
 const p=await getProfile(); if(!p) throw new Error('पहले भूमिका सेव करें।');
 code=String(code||'').trim().toUpperCase(); const ref=doc(db,'connectionRequests',code);
 await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('रिक्वेस्ट कोड नहीं मिला।');const d=snap.data();if(d.status!=='pending'||d.expiresAt.toMillis()<Date.now())throw new Error('रिक्वेस्ट समाप्त या पहले इस्तेमाल हो चुकी है।');if(d.requesterUid===u.uid)throw new Error('अपनी ही रिक्वेस्ट स्वीकार नहीं कर सकते।');if(d.requesterRole===p.role)throw new Error('Owner और Customer की अलग-अलग भूमिकाएँ होनी चाहिए।');tx.update(ref,{status:accept?'accepted':'rejected',targetUid:u.uid,targetEmail:u.email||'',targetRole:p.role,respondedAt:serverTimestamp()});if(accept){const ownerUid=p.role==='owner'?u.uid:d.requesterUid;const customerUid=p.role==='customer'?u.uid:d.requesterUid;tx.set(doc(db,'connections',ownerUid+'_'+customerUid),{ownerUid,customerUid,status:'active',requestCode:code,createdAt:serverTimestamp()});}});
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

async function addLedgerAdjustment(customerUid,kind,delta,note='',date=new Date().toISOString().slice(0,10)){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const p=await getProfile();if(!p||p.role!=='owner')throw new Error('सुधार केवल Owner दर्ज कर सकता है।');
 if(!customerUid||!['amount','kg'].includes(kind))throw new Error('ग्राहक और सुधार का प्रकार चुनें।');
 delta=Number(delta);if(!Number.isFinite(delta)||delta===0)throw new Error('सुधार की रकम/मात्रा शून्य नहीं हो सकती।');
 const ref=await addDoc(collection(db,'dairyAdjustments'),{ownerUid:u.uid,customerUid,kind,delta,note:String(note||'').slice(0,250),date,createdBy:u.uid,createdAt:serverTimestamp()});
 return ref.id;
}
async function getMyAdjustments(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');const p=await getProfile();const field=p?.role==='owner'?'ownerUid':'customerUid';
 const snap=await getDocs(query(collection(db,'dairyAdjustments'),where(field,'==',u.uid)));
 return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,500);
}

async function findDairy(identifier){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const key=String(identifier||'').trim();if(!key)throw new Error('दूधिया की ID या Username लिखें।');
 let snap=await getDoc(doc(db,'dairyDirectory',key.toUpperCase()));
 if(!snap.exists()) {const q=await getDocs(query(collection(db,'dairyDirectory'),where('username','==',key.toLowerCase()),where('active','==',true)));if(q.empty)throw new Error('इस ID या Username का दूधिया नहीं मिला।');snap=q.docs[0];}
 const dairy={id:snap.id,...snap.data()};if(dairy.active===false)throw new Error('यह Dairy ID अभी सक्रिय नहीं है।');
 const owner=await getDoc(doc(db,'profiles',dairy.ownerUid));if(!owner.exists()||owner.data().role!=='owner')throw new Error('यह Dairy अकाउंट अब सक्रिय नहीं है।');
 return dairy;
}
async function sendDairyConnectionRequest(identifier){
 const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');
 const p=await getProfile();if(!p||p.role!=='customer')throw new Error('यह सुविधा Customer अकाउंट के लिए है।');
 const dairy=await findDairy(identifier);if(dairy.ownerUid===u.uid)throw new Error('आप अपने ही अकाउंट को Request नहीं भेज सकते।');
 const id=randomCode(),ref=doc(db,'connectionRequests',id);
 await setDoc(ref,{requesterUid:u.uid,requesterEmail:u.email||'',requesterName:p.displayName||u.displayName||'',requesterRole:'customer',targetUid:dairy.ownerUid,targetName:dairy.displayName||'',targetDairyId:dairy.dairyId,status:'pending',createdAt:serverTimestamp()});
 return {id,dairy};
}
async function getMyConnectionRequests(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const [a,b]=await Promise.all([getDocs(query(collection(db,'connectionRequests'),where('requesterUid','==',u.uid))),getDocs(query(collection(db,'connectionRequests'),where('targetUid','==',u.uid)))]);
 return [...a.docs,...b.docs].map(d=>({id:d.id,...d.data()}));
}
async function decideDairyRequest(requestId,accept){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const ref=doc(db,'connectionRequests',requestId);
 await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('रिक्वेस्ट नहीं मिली।');const d=snap.data();if(d.targetUid!==u.uid||d.status!=='pending')throw new Error('यह रिक्वेस्ट अब उपलब्ध नहीं है।');tx.update(ref,{status:accept?'accepted':'rejected',respondedAt:serverTimestamp()});if(accept)tx.set(doc(db,'connections',u.uid+'_'+d.requesterUid),{ownerUid:u.uid,customerUid:d.requesterUid,status:'active',requestCode:requestId,createdAt:serverTimestamp()});});
}
window.MilkScaleAuth={...window.MilkScaleAuth,updateProfilePhoto,addLedgerAdjustment,getMyAdjustments,createConnectionRequest,respondToConnectionRequest,getMyConnectionRequests,syncMilkEntry,getMyMilkEntries,addPayment,getMyPayments,removeConnection,findDairy,sendDairyConnectionRequest,decideDairyRequest};
