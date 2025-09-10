const express = require('express');
const oracledb = require('oracledb');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const { getConnection } = require('../config/db');

// Ensure uploads folder exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const upload = multer({ dest: uploadDir });

// Helper: convert BLOB to base64
  async function blobToBase64(blob) {
  if (!blob) return null;
  const chunks = [];
  for await (const chunk of blob) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('base64');
}

// ---------------- Employees CRUD ----------------

// GET all employees
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT EmployeeID, EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site, Photo
       FROM Employees`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const products = await Promise.all(result.rows.map(async (row) => {
      row.PHOTO = await blobToBase64(row.PHOTO);
      return row;
    }));

    await conn.close();
    res.json(products);
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
    }
});

// GET single employee
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT EmployeeID, EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site, Photo
       FROM Employees WHERE EmployeeID = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Employee not found" });

    const employee = result.rows[0];
    if (employee.PHOTO) employee.PHOTO = `data:image/jpeg;base64,${await lobToBase64(employee.PHOTO)}`;

    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// CREATE employee
router.post('/', upload.single('Photo'), async (req, res) => {
  let conn;
  try {
    const { EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site } = req.body;
    let photoBuffer = req.file ? fs.readFileSync(req.file.path) : null;
    if (req.file) fs.unlinkSync(req.file.path);

    conn = await getConnection();
    const result = await conn.execute(
      `INSERT INTO Employees
       (EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Created_At, Working_Site, Photo)
       VALUES
       (:EmployeeName, :Gender, TO_DATE(:BirthDate,'YYYY-MM-DD'), :Job_ID, :Address, :Phone, :Salary, :Remarks, SYSDATE, :Working_Site, :Photo)
       RETURNING EmployeeID INTO :id`,
      {
        EmployeeName,
        Gender,
        BirthDate,
        Job_ID,
        Address,
        Phone,
        Salary,
        Remarks,
        Working_Site,
        Photo: photoBuffer,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      },
      { autoCommit: true }
    );

    res.json({ message: "Employee added successfully", EmployeeID: result.outBinds.id[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// UPDATE employee
router.put('/:id', upload.single('Photo'), async (req, res) => {
  let conn;
  try {
    const { EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site } = req.body;
    const employeeID = req.params.id;

    let photoBuffer = req.file ? fs.readFileSync(req.file.path) : null;
    if (req.file) fs.unlinkSync(req.file.path);

    conn = await getConnection();
    const bindParams = {
      EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site, id: employeeID
    };

    let sql = `UPDATE Employees SET
                 EmployeeName = :EmployeeName,
                 Gender = :Gender,
                 BirthDate = TO_DATE(:BirthDate,'YYYY-MM-DD'),
                 Job_ID = :Job_ID,
                 Address = :Address,
                 Phone = :Phone,
                 Salary = :Salary,
                 Remarks = :Remarks,
                 Working_Site = :Working_Site`;

    if (photoBuffer) {
      sql += `, Photo = :Photo`;
      bindParams.Photo = photoBuffer;
    }

    sql += ` WHERE EmployeeID = :id`;

    await conn.execute(sql, bindParams, { autoCommit: true });

    res.json({ message: "Employee updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute('DELETE FROM Employees WHERE EmployeeID = :id', [req.params.id], { autoCommit: true });
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
