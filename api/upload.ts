import express from "express"; //สำหรับสร้างเว็บเซิร์ฟเวอร์
import multer from "multer"; //สำหรับการอัปโหลดไฟล์
import {  ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"; //สำหรับการจัดการกับ Firebase Storage
import { storage } from "../filebaseconnect"; //ทำการนำเข้าออบเจกต์ของ Firebase Storage จากไฟล์ชื่อ filebaseconnect

export const router = express.Router(); //สร้างตัวเเปร router เพื่อกำหนดเส้นทาง

//ทำการสร้าง Middleware สำหรับการอัปโหลดไฟล์
class FileMiddleware {
  //Attribute of class
  filename = "";
  //Attribute diskloader for saving file to disk
  public readonly diskLoader = multer({
    // storage = saving file to memory
    storage: multer.memoryStorage(),
    // limit file size
    limits: {
      fileSize: 67108864, // จำกัดขนาดไฟล์ที่ 64 MByte
    },
  });
}

const fileUpload = new FileMiddleware(); //สร้างอินสแตนซ์ของ FileMiddleware

router.get("/",(req, res)=>{
  res.send("api upload OK")
})

//เส้นทางสำหรับการอัปโหลดไฟล์
//เมื่อมีการอัปโหลดไฟล์ฟังก์ชั่น diskLoader.single("file") จะประมวลผลไฟล์
//แล้วเรียกใช้ฟังก์ชัน firebaseUpload เพื่ออัปโหลดไฟล์ไปยัง Firebase Storage
//หากสำเร็จจะส่ง URL ของไฟล์ที่อัปโหลดกลับไปยังผู้ใช้
router.post("/",fileUpload.diskLoader.single("file"),async (req, res) => {
    console.log("File "+req.file);
    try {
      // upload รูปภาพลง firebase โดยใช้ parameter ที่ส่งมาใน URL path
      const url = await firebaseUpload(req.file!);
      res.send(url); //ทำการส่ง url ของรูปภาพกลับไปยัง
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(555).send("Failed to upload image");
    }
    
  }
);

//function สำหรับอัปโหลดไฟล์ไปยัง Firebase Storage
async function firebaseUpload(file: Express.Multer.File) {
    // Upload to firebase storage
    const filename = Date.now() + "-" + Math.round(Math.random() * 1000) + ".png";
    // Define locations to be saved on storag
    const storageRef = ref(storage, "/imagesvs/" + filename);
    // define file detail
    const metaData = { contentType: file.mimetype }; 
    // Start upload
    const snapshost = await uploadBytesResumable(
      storageRef,
      file.buffer,
      metaData
    );
    // Get url image from storage
    const url = await getDownloadURL(snapshost.ref);
  
    return url;
  }

//เส้นทางสำหรับลบไฟล์ เส้นทางนี้รับพารามิเตอร์ผ่าน query string เเละเรียกฟังก์ชั่น firebaseDelete เพื่อลบไฟล์
router.delete("/deleadimageFirebase",async (req, res) => {
  const path = req.query.path as string; //รับพารามิเตอร์ชื่อ path เเบบ query string
  if (!path) { //ตรวจสอบว่ามีการส่งพารามิเตอร์มาหรือไม่
    return res.status(400).send("Path query parameter is required");
  }
  console.log("In delete func: " + path);

  try {
    await firebaseDelete(path); //เรียกใช้ฟังก์ชั่น firebaseDelete เพื่อลบรูปภาพที่อยู่ใน Firebase Storage
    res.status(200).send("Delete image successfully");
  } catch (error) {
    res.status(500).send("Failed to delete image"); //กรณีลบรูปภาพไม่สำเร็จ
  }
});

//function สำหรับลบไฟล์จาก Firebase Storage
async function firebaseDelete(path: string) {
  console.log("In firebase Delete: " + path);
  try {
    //เเยกพาธจาก URL
    const urlPath = new URL(path).pathname; //ทำการตัด https://firebasestorage.googleapis.com เเละ alt=media ออกไป
    console.log(urlPath); //คำตอบจะเหลือ /v0/b/facemash-app-3ca96.appspot.com/o/imagesvs/1717396288555-226.png
    const filePath = decodeURIComponent(urlPath.split("/o/")[1].split("?")[0]);
    console.log(filePath); //คำตอบจะเหลือ imagesvs/1717396288555-226.png
    const fileRef = ref(storage, filePath); //ทำการสร้าง reference

    await deleteObject(fileRef); //ลบรูปภาพใน Firebase Storage
    console.log("ลบรูปภาพสำเร็จ:", path);

  } catch (error) {
    console.log("เกิดข้อผิดพลาดในการลบรูปภาพใน Firebase:", error);
    throw error;
  }
}