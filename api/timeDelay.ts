import express from "express";
import Mysql from "mysql";
import { queryAsync } from "../connection";

// export ให้ router สามารถไปใช้งานในไฟล์อื่นได้
// สร้าง object ของ Router ที่อยู่ใน expresss
// express.Router คือ สร้างเส้นทางต่างๆ หรือ api ต่างๆ สำหรับ get, post, put, delete
export const router = express.Router();



//=========================================================================================================== api สุ่มรูปภาพที่่อยูใน Database ไปแสดงเพื่อ vote --> http://127.0.0.1:3000/time/
router.get('/', (request, response) => {
    response.send({ 'text': 'hi i am timeDelay.ts' })
});

//=========================================================================================================== api สำหรับ set time delay for vote (admin จะสามารถ set ได้เท่านั้น)
router.post('/setTimeDelayForVote', async (request, response) => {
    try {
        // ดึงตัวแปลจาก body
        let time : number = request.body["time"];
        // sql สำหรับ update table timeDelay_Facemash
        let sql = Mysql.format('UPDATE TimeDelay_Facemash SET timeDelay = ? WHERE TID = 1', [time]);
        await queryAsync(sql);
        response.status(200).json({ text: "set time delay for vote เสร็จสิ้น" });
    } catch (error) {
        response.status(200).json({ text: "set time delay for vote ไม่ได้" });
    }
});


