// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"; //เพื่อเริ่มต้นใช้งาน firebase
import { getAnalytics } from "firebase/analytics"; //เพื่อใช้บริการวิเคราะห์ของ firebase
import { getStorage } from "firebase/storage"; //เพื่อใช้บริการจัดเก็บข้อมูลของ firebase โดยสามารถใช้ได้ทั้ง รูปภาพ เสียง เเละ วีดีโอ
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = { //เชื่อมต่อกับโปรเจค firebase
  apiKey: "AIzaSyAxuoWFfClv0n02Jkg2of6vCSIEWsFv3K0",
  authDomain: "facemash-app-3ca96.firebaseapp.com",
  projectId: "facemash-app-3ca96",
  storageBucket: "facemash-app-3ca96.appspot.com",
  messagingSenderId: "400708905061",
  appId: "1:400708905061:web:2dcd42c9e6b85ae6cefe8c",
  measurementId: "G-HZYRLBESMH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig); //ทำการเริ่มต้นใช้งาน firebase
// const analytics = getAnalytics(app);
export const storage = getStorage(app); //เริ่มต้นใช้งานบริการจัดเก็บข้อมูล เเละ export ออกไปเพื่อใช้ในไฟล์อื่นๆ