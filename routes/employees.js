const express = require('express');
const oracledb = require('oracledb');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const { getConnection } = require('../config/db');

const upload = multer({ dest: 'uploads/' });
// ---------------- Employees CRUD ----------------
// Helper function to convert Oracle BLOB to Base64
async function lobToBase64(lob) {
  if (!lob) return null;
  return new Promise((resolve, reject) => {
    const chunks = [];
    lob.on("data", (chunk) => chunks.push(chunk));
    lob.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    lob.on("error", (err) => reject(err));
  });
}

// GET all employees (with small photo preview)
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT e.EmployeeID, e.EmployeeName, e.Gender, e.BirthDate, e.Job_ID, e.Address, e.Phone, e.Salary, e.Remarks, e.Working_Site,
              ep.Photo
       FROM Employees e
       LEFT JOIN EmployeePhotos ep ON e.EmployeeID = ep.EmployeeID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Convert BLOBs to base64 previews
    const employees = await Promise.all(
      result.rows.map(async (emp) => {
        if (emp.PHOTO) {
          emp.Photo = await lobToBase64(emp.PHOTO);
        } else {
          emp.Photo = null;
        }
        return emp;
      })
    );

    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET employee with photo
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const empResult = await conn.execute(
      'SELECT * FROM Employees WHERE EmployeeID = :id',
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (empResult.rows.length === 0)
      return res.status(404).json({ error: 'Employee not found' });

    const employee = empResult.rows[0];

    const photoResult = await conn.execute(
      'SELECT PHOTO FROM EMPLOYEEPHOTOS WHERE EMPLOYEEID = :id',
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (photoResult.rows.length > 0 && photoResult.rows[0].PHOTO) {
      // Convert LOB to base64 first
      employee.Photo = await lobToBase64(photoResult.rows[0].PHOTO);
    } else {
      employee.Photo = null;
    }

    res.json(employee); // ✅ now safe
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});


// CREATE employee with optional photo
router.post('/', upload.single('Photo'), async (req, res) => {
  let conn;
  try {
    const { EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site } = req.body;
    conn = await getConnection();

    const result = await conn.execute(
      `INSERT INTO Employees
        (EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Created_At, Working_Site)
       VALUES
        (:EmployeeName, :Gender, TO_DATE(:BirthDate,'YYYY-MM-DD'), :Job_ID, :Address, :Phone, :Salary, :Remarks, SYSDATE, :Working_Site)
       RETURNING EmployeeID INTO :id`,
      {
        EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      },
      { autoCommit: true }
    );

    const newEmployeeID = result.outBinds.id[0];

    if (req.file) {
      const photoBuffer = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);

      await conn.execute(
        `INSERT INTO EmployeePhotos (EmployeeID, Photo, Created_At) VALUES (:id, :Photo, SYSDATE)`,
        { id: newEmployeeID, Photo: photoBuffer },
        { autoCommit: true }
      );
    }

    res.json({ message: 'Employee added successfully', EmployeeID: newEmployeeID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// UPDATE employee info and optional photo
router.put('/:id', upload.single('Photo'), async (req, res) => {
  let conn;
  try {
    const { EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site } = req.body;
    const employeeID = req.params.id;
    conn = await getConnection();

    await conn.execute(
      `UPDATE Employees SET
          EmployeeName = :EmployeeName,
          Gender = :Gender,
          BirthDate = TO_DATE(:BirthDate,'YYYY-MM-DD'),
          Job_ID = :Job_ID,
          Address = :Address,
          Phone = :Phone,
          Salary = :Salary,
          Remarks = :Remarks,
          Working_Site = :Working_Site
       WHERE EmployeeID = :id`,
      { EmployeeName, Gender, BirthDate, Job_ID, Address, Phone, Salary, Remarks, Working_Site, id: employeeID },
      { autoCommit: true }
    );

    if (req.file) {
      const photoBuffer = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);

      const existingPhoto = await conn.execute(
        'SELECT EmployeeID FROM EmployeePhotos WHERE EmployeeID = :id',
        [employeeID],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (existingPhoto.rows.length > 0) {
        await conn.execute(
          'UPDATE EmployeePhotos SET Photo = :Photo, Created_At = SYSDATE WHERE EmployeeID = :id',
          { Photo: photoBuffer, id: employeeID },
          { autoCommit: true }
        );
      } else {
        await conn.execute(
          'INSERT INTO EmployeePhotos (EmployeeID, Photo, Created_At) VALUES (:id, :Photo, SYSDATE)',
          { id: employeeID, Photo: photoBuffer },
          { autoCommit: true }
        );
      }
    }

    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE employee and photo
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute('DELETE FROM EmployeePhotos WHERE EmployeeID = :id', [req.params.id], { autoCommit: true });
    await conn.execute('DELETE FROM Employees WHERE EmployeeID = :id', [req.params.id], { autoCommit: true });
    res.json({ message: 'Employee and photo deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
