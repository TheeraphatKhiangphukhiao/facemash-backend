// สำหรับสร้าง api
import express from "express";

// export ให้ router สามารถไปใช้งานในไฟล์อื่นได้
// สร้าง object ของ Router ที่อยู่ใน expresss
// express.Router คือ สร้างเส้นทางต่างๆ หรือ api ต่างๆ สำหรับ get, post, put, delete
export const router = express.Router();

router.get('/', (request, response)=>{
    response.send({
        "text": "Hi I am is Get in index.tsx"
    });
});