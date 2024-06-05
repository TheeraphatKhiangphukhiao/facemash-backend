// util
import util from "util";

import mysql from 'mysql';

// กำหนดค่าการเชื่อต่อ Database MySQL
export const connection = mysql.createPool({
  connectionLimit: 10,
  host: '202.28.34.197',
  user: 'web65_64011212185',
  password: '64011212185@csmsu',
  database: 'web65_64011212185'
});

//====================================================================== เชื่อต่อกับ MySQL
connection.getConnection((err) => {
  if (err) {
    console.error('เกิดข้อผิดพลาดในการเชื่อต่อกับ MySQL:', err);
    return;
  }
  console.log('เชื่อต่อกับ MySQL สำเร็จ');
});

//====================================================================== ตัวอย่างการ query ข้อมูล
// connection.query('SELECT * FROM User_Facemash', (err, results) => {
//   if (err) {
//     console.error('เกิดข้อผิดพลาดในการ query ข้อมูล:', err);
//     return;
//   }
//   console.log('ผลลัพธ์:', results);
// });



//========================================== (ถ้าสรา้ง connection แบบ Pool จะไม่ทำการ .end)
// ปิดการเชื่อต่อ MySQL เมื่อไม่ได้ใช้งาน
// connection.end();


// สำหรับทำ Dynamic fields update
// โดยตัวแปลนี้เป็นแบบ async
// คือ ส่งคำสั่ง sql ไป โดยรอการตอบกลับมาก่อน แล้วค่อยทำงานต่อ
export const queryAsync = util.promisify(connection.query).bind(connection);
