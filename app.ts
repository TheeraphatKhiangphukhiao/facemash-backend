import express from "express";
import { router as index } from "./api/index";
import { router as user } from "./api/user";
import { router as vote } from "./api/vote";
import { router as photo } from "./api/photo";
import { router as timeDelay } from "./api/timeDelay";
import { router as upload } from "./api/upload";
import bodyParser from "body-parser";
import cors from "cors";

export const app = express();

//********************************** CORS API ******************************/
// CORS คือ เมื่อเรานำ project fount-end และ back-end ขึ้นสู่ระบบ hosting ภายนอก แล้วเราต้องการให้ fount-end สามารถเรียก back-end ได้นั้น จึงต้องทำ cors
app.use(cors({
    origin: "*",
}));


//************************************** ตัวจัดการข้อมูลที่ส่งมาทาง body **************************************/
// ตัวจัดการ body ที่ส่งมาทาง url ถ้าส่งมาแบบ text หรือ ส่งมาแบบ json
app.use(bodyParser.text());
app.use(bodyParser.json());


//=================== เรียกชุดคำสั่ง api ทดสอบ
app.use("/", index);

//=================== เรียกชุดคำสั่ง api ของ user
app.use("/user", user);

//=================== เรียกชุดคำสั่ง api ของ photos
app.use('/photo', photo)

//=================== เรียกชุดคำสั่ง api ของการ vote
app.use('/vote', vote)

//=================== เรียกชุดคำสั่ง api ของการกำหนดเวลาของการกด vote รูป (admin สามารถ set ได้อย่างเดียว)
app.use('/time', timeDelay)

//================== เรียกชุดคำสั่ง api ของการ upload รูปภาพขึ้น firbase
app.use('/upload', upload)