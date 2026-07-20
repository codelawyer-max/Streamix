import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyD2MaFVQ5QLS0iPyoF_Fc1-WHuFt-pmr-Y",
  authDomain: "streamix-95524.firebaseapp.com",
  projectId: "streamix-95524",
  storageBucket: "streamix-95524.firebasestorage.app",
  messagingSenderId: "11227441489",
  appId: "1:11227441489:web:880dfe369a0a6bbb4e8b70"
};


// Prevent duplicate firebase initialization
const app = getApps().length 
    ? getApps()[0] 
    : initializeApp(firebaseConfig);


const auth = getAuth(app);

const provider = new GoogleAuthProvider();


export { auth, provider };
