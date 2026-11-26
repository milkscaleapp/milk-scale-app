import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, updateProfile, getIdToken, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, runTransaction, orderBy, limit } from 'firebase/firestore';
const firebaseConfig = { apiKey:'AIzaSyC0ppOgik5r-4dO66DH1VOn-748iErjxS8', authDomain:'milk-scale-b4ec4.firebaseapp.com', projectId:'milk-scale-b4ec4', storageBucket:'milk-scale-b4ec4.firebasestorage.app', messagingSenderId:'919647485111', appId:'1:919647485111:web:74dceafb3d44d5bb536132' };
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
setPersistence(auth,browserLocalPersistence).catch(e=>console.warn('Auth persistence:',e?.code||e));
async function getCurrentUser(){let u=auth.currentUser;if(!u)u=await new Promise(resolve=>{const unsub=onAuthStateChanged(auth,user=>{unsub();resolve(user||null)},()=>{unsub();resolve(null)})});if(!u)return null;try{await u.reload();u=auth.currentUser||u;if(u.emailVerified)await getIdToken(u,true);}catch(e){console.warn('Auth refresh:',e?.code||e)}return u.emailVerified?u:null}
function validateCredentials(email,password){if(!email||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('सही ईमेल पता दर्ज करें।');if(typeof password!=='string'||password.length<6)throw new Error('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')}
async function createAccount(displayName,username,email,password){
 displayName=String(displayName||'').trim().slice(0,60);username=String(username||'').trim().toLowerCase();email=String(email||'').trim();validateCredentials(email,password);
 if(displayName.length<2)throw new Error('पूरा नाम दर्ज करें।');
 if(!/^[a-z0-9._]{3,24}$/.test(username))throw new Error('Username 3–24 अक्षरों का हो और बिना Space के लिखें। केवल a-z, 0-9, dot और underscore मान्य हैं।');
 const credential=await createUserWithEmailAndPassword(auth,email,password),u=credential.user;
 await updateProfile(u,{displayName});
 const dairyId='MS'+u.uid.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase();
 await setDoc(doc(db,'profiles',u.uid),{uid:u.uid,email:u.email||email,displayName,username,dairyId,role:'customer',createdAt:serverTimestamp(),avatarData:''});
 await sendEmailVerification(u);
 await firebaseSignOut(auth);
 return {email:u.email,displayName,username,dairyId,verificationSent:true};
}
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
 const profile={uid:u.uid,email:u.email||'',displayName:name,username,dairyId,role,createdAt:snap.exists()?snap.data().createdAt:serverTimestamp(),avatarData:snap.exists()?(snap.data().avatarData||''):''};
 if(snap.exists()){if(!snap.data().dairyId||!snap.data().username)await updateDoc(ref,{displayName:name,username,dairyId});}
 else await setDoc(ref,profile);
 if(role==='owner'){
  const directoryRef=doc(db,'dairyDirectory',dairyId);
  const directorySnap=await getDoc(directoryRef);
  if(!directorySnap.exists()){
   await setDoc(directoryRef,{ownerUid:u.uid,displayName:name,username,dairyId,avatarData:snap.exists()?(snap.data().avatarData||''):'',active:true,createdAt:serverTimestamp()});
  }else if(directorySnap.data().ownerUid!==u.uid){
   throw new Error('इस Dairy ID का रिकॉर्ड किसी दूसरे Owner से जुड़ा है। सहायता के बिना इसे न बदलें।');
  }else{
   await updateDoc(directoryRef,{displayName:name,active:true,avatarData:snap.exists()?(snap.data().avatarData||''):''});
  }
 }
 return profile;
}
async function updateProfileDetails(displayName,role,username){
 const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');
 displayName=String(displayName||'').trim().slice(0,60);if(displayName.length<2)throw new Error('नाम कम से कम 2 अक्षर का लिखें।');
 if(!['owner','customer'].includes(role))throw new Error('अकाउंट का प्रकार चुनें।');
 const ref=doc(db,'profiles',u.uid),snap=await getDoc(ref);if(!snap.exists())throw new Error('प्रोफाइल उपलब्ध नहीं है।');
 const old=snap.data();if(!old.dairyId)throw new Error('Account ID उपलब्ध नहीं है। सहायता से संपर्क करें।');
 username=String(username||old.username||'').trim().toLowerCase().replace(/^@/,'');
 if(!/^[a-z0-9._]{3,24}$/.test(username))throw new Error('Username 3–24 अक्षरों का हो और बिना Space के लिखें।');
 if(role==='owner'){
  const matches=await getDocs(query(collection(db,'dairyDirectory'),where('username','==',username),limit(2)));
  if(matches.docs.some(d=>d.data().ownerUid!==u.uid))throw new Error('यह Username पहले से किसी दूसरे दूधिया ने लिया हुआ है।');
 }
 if(old.role!==role){const connections=await getMyConnections();if(connections.length)throw new Error('Role बदलने से पहले सक्रिय Dairy कनेक्शन हटाने होंगे।');}
 await updateDoc(ref,{displayName,role,username});
 if(old.dairyId){
  const directoryRef=doc(db,'dairyDirectory',old.dairyId),directorySnap=await getDoc(directoryRef);
  if(role==='owner'){
   if(directorySnap.exists())await updateDoc(directoryRef,{displayName,username,active:true});
   else await setDoc(directoryRef,{ownerUid:u.uid,displayName,username,dairyId:old.dairyId,avatarData:old.avatarData||'',active:true,createdAt:old.createdAt||serverTimestamp()});
  }else if(old.role==='owner'&&directorySnap.exists())await updateDoc(directoryRef,{displayName,username,active:false});
 }
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
async function getMyConnections(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const [a,b]=await Promise.all([getDocs(query(collection(db,'connections'),where('ownerUid','==',u.uid))),getDocs(query(collection(db,'connections'),where('customerUid','==',u.uid)))]);
 return await Promise.all([...a.docs,...b.docs].map(async snap=>{
  const connection={id:snap.id,...snap.data()};
  if(connection.ownerUid===u.uid){connection.customerProfile={displayName:connection.customerName||''};}
  else{const directory=await getDocs(query(collection(db,'dairyDirectory'),where('ownerUid','==',connection.ownerUid),limit(1)));connection.dairyProfile=directory.empty?null:directory.docs[0].data();}
  return connection;
 }));
}
window.MilkScaleAuth={getCurrentUser,createAccount,signIn,sendPasswordReset,signOut,getProfile,ensureProfile,getMyConnections,updateProfilePhoto,updateProfileDetails};

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
 if(!snap.exists()) {const q=await getDocs(query(collection(db,'dairyDirectory'),where('username','==',key.toLowerCase())));const found=q.docs.find(d=>d.data().active!==false);if(!found)throw new Error('इस ID या Username का दूधिया नहीं मिला या वह सक्रिय नहीं है।');snap=found;}
 const dairy={id:snap.id,...snap.data()};if(dairy.active===false)throw new Error('यह Dairy ID अभी सक्रिय नहीं है।');
 if(!dairy.ownerUid||!dairy.dairyId)throw new Error('यह Dairy अकाउंट अब सक्रिय नहीं है।');
 return dairy;
}
async function sendDairyConnectionRequest(identifier){
 const u=await getCurrentUser();if(!u)throw new Error('पहले लॉगिन करें।');
 const p=await getProfile();if(!p||p.role!=='customer')throw new Error('यह सुविधा Customer अकाउंट के लिए है।');
 const dairy=await findDairy(identifier);if(dairy.ownerUid===u.uid)throw new Error('आप अपने ही अकाउंट को Request नहीं भेज सकते।');
 const [connections,requests]=await Promise.all([getMyConnections(),getMyConnectionRequests()]);
 if(connections.some(x=>x.ownerUid===dairy.ownerUid&&x.customerUid===u.uid&&x.status==='active'))throw new Error('आप पहले से इस दूधिया से जुड़े हुए हैं।');
 if(requests.some(x=>x.requesterUid===u.uid&&x.targetUid===dairy.ownerUid&&x.status==='pending'))throw new Error('आपकी Request पहले से Pending है।');
 const ref=doc(collection(db,'connectionRequests')),id=ref.id;
 await setDoc(ref,{requesterUid:u.uid,requesterEmail:u.email||'',requesterName:p.displayName||u.displayName||'',requesterRole:'customer',targetUid:dairy.ownerUid,targetName:dairy.displayName||'',targetDairyId:dairy.dairyId,status:'pending',createdAt:serverTimestamp()});
 return {id,dairy};
}
async function getMyConnectionRequests(){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const p=await getProfile();if(!p)throw new Error('प्रोफाइल उपलब्ध नहीं है।');
 const field=p.role==='owner'?'targetUid':'requesterUid';
 const snap=await getDocs(query(collection(db,'connectionRequests'),where(field,'==',u.uid)));
 return snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function decideDairyRequest(requestId,accept){
 const u=await getCurrentUser();if(!u)throw new Error('लॉगिन आवश्यक है।');
 const p=await getProfile();if(!p||p.role!=='owner')throw new Error('केवल दूधिया आई हुई Customer Request स्वीकार या अस्वीकार कर सकता है।');
 const ref=doc(db,'connectionRequests',requestId);
 await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('रिक्वेस्ट नहीं मिली।');const d=snap.data();if(d.targetUid!==u.uid||d.status!=='pending')throw new Error('यह रिक्वेस्ट अब उपलब्ध नहीं है।');tx.update(ref,{status:accept?'accepted':'rejected',respondedAt:serverTimestamp()});if(accept)tx.set(doc(db,'connections',u.uid+'_'+d.requesterUid),{ownerUid:u.uid,customerUid:d.requesterUid,customerName:d.requesterName||'Customer',status:'active',requestId:requestId,createdAt:serverTimestamp()});});
}
window.MilkScaleAuth={...window.MilkScaleAuth,updateProfilePhoto,addLedgerAdjustment,getMyAdjustments,getMyConnectionRequests,syncMilkEntry,getMyMilkEntries,addPayment,getMyPayments,removeConnection,findDairy,sendDairyConnectionRequest,decideDairyRequest};
