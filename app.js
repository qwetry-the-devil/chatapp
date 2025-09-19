// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAU1SHuBd24zNgP11D6aOPV3w0YFxz8bso",
  authDomain: "cchhatteerr.firebaseapp.com",
  projectId: "cchhatteerr",
  storageBucket: "cchhatteerr.firebasestorage.app",
  messagingSenderId: "462333840338",
  appId: "1:462333840338:web:81b2a196992783a7ea160b",
  measurementId: "G-H9M070PFZB"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const loginDiv = document.getElementById("loginDiv");
const chatDiv = document.getElementById("chatDiv");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const statusEl = document.getElementById("status");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatListEl = document.getElementById("chatList");

let currentUser;
let currentChatId = "global";

function usernameNormalize(u){ return u.trim().toLowerCase().replace(/\s+/g,'_'); }

signupBtn.addEventListener("click", async ()=>{
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if(!username || !password){ statusEl.textContent="Enter username & password"; return; }
  const uname = usernameNormalize(username);
  const email = `${uname}@chat.local`;

  try{
    const userCred = await auth.createUserWithEmailAndPassword(email,password);
    currentUser = userCred.user;

    await db.collection("users").doc(currentUser.uid).set({
      username, usernameLower:uname, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const globalRef = db.collection("chats").doc("global");
    const globalSnap = await globalRef.get();
    if(!globalSnap.exists()){
      await globalRef.set({name:"🌍 Global Chat", isGroup:true, members:[currentUser.uid], createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    } else if(!globalSnap.data().members.includes(currentUser.uid)){
      await globalRef.update({members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)});
    }

    loginDiv.style.display="none"; chatDiv.style.display="flex";
    loadChats(); subscribeMessages();
  } catch(err){ statusEl.textContent = err.message; }
});

loginBtn.addEventListener("click", async ()=>{
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if(!username || !password){ statusEl.textContent="Enter username & password"; return; }
  const uname = usernameNormalize(username);
  const email = `${uname}@chat.local`;

  try{
    const userCred = await auth.signInWithEmailAndPassword(email,password);
    currentUser = userCred.user;
    loginDiv.style.display="none"; chatDiv.style.display="flex";
    loadChats(); subscribeMessages();
  } catch(err){ statusEl.textContent = err.message; }
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e=>{ if(e.key==="Enter") sendMessage(); });

async function sendMessage(){
  const text = messageInput.value.trim(); if(!text) return;
  const chatRef = db.collection("chats").doc(currentChatId);
  const chatSnap = await chatRef.get();

  if(!chatSnap.data().members.includes(currentUser.uid)){
    await chatRef.update({members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)});
  }

  await chatRef.collection("messages").add({
    text,
    senderId: currentUser.uid,
    username: currentUser.email.split('@')[0],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  messageInput.value="";
}

function subscribeMessages(){
  const messagesQuery = db.collection("chats").doc(currentChatId).collection("messages").orderBy("createdAt");
  messagesQuery.onSnapshot(snapshot=>{
    messagesEl.innerHTML="";
    snapshot.forEach(doc=>{
      const m = doc.data();
      renderMessage(m);
    });
  });
}

function renderMessage(m){
  const mine = m.senderId===currentUser.uid;
  const div = document.createElement("div");
  div.className = "message " + (mine?"mine":"their");
  const user = m.username||"anon";
  const time = m.createdAt ? formatTimeWithSeconds(m.createdAt.toDate()) : "";
  div.innerHTML = `<div class="meta"><strong>${user}</strong> • <span>${time}</span></div><div class="body">${m.text}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatTimeWithSeconds(d){
  const h = d.getHours().toString().padStart(2,'0');
  const m = d.getMinutes().toString().padStart(2,'0');
  const s = d.getSeconds().toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

async function loadChats(){
  const globalSnap = await db.collection("chats").doc("global").get();
  if(globalSnap.exists()){
    chatListEl.innerHTML = `<li data-id="global">🌍 Global Chat</li>`;
  }
}
