const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all product types
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      'SELECT ProductType_ID, PRODUCTTYPE_NAME, REMARKS, MANUFACTURER FROM Product_Type',
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET product type by ID
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      'SELECT PRODUCTTYPE_ID, PRODUCTTYPE_NAME, REMARKS, MANUFACTURER FROM PRODUCT_TYPE WHERE PRODUCTTYPE_ID = :id',
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Product type not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// CREATE new product type
router.post('/', async (req, res) => {
  const { PRODUCTTYPE_NAME, REMARKS, MANUFACTURER } = req.body;
  if (!PRODUCTTYPE_NAME) return res.status(400).json({ message: 'PRODUCTTYPE_NAME is required' });

  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO PRODUCT_TYPE (PRODUCTTYPE_NAME, REMARKS, MANUFACTURER)
       VALUES (:PRODUCTTYPE_NAME, :REMARKS, :MANUFACTURER)`,
      { PRODUCTTYPE_NAME, REMARKS, MANUFACTURER },
      { autoCommit: true }
    );
    res.json({ message: 'Product type added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// UPDATE product type by ID
router.put('/:id', async (req, res) => {
  const { PRODUCTTYPE_NAME, REMARKS, MANUFACTURER } = req.body;
  if (!PRODUCTTYPE_NAME) return res.status(400).json({ message: 'PRODUCTTYPE_NAME is required' });

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE PRODUCT_TYPE
       SET PRODUCTTYPE_NAME = :PRODUCTTYPE_NAME,
           REMARKS = :REMARKS,
           MANUFACTURER = :MANUFACTURER
       WHERE PRODUCTTYPE_ID = :id`,
      { PRODUCTTYPE_NAME, REMARKS, MANUFACTURER, id: req.params.id },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) return res.status(404).json({ message: 'Product type not found' });
    res.json({ message: 'Product type updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE product type by ID
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      'DELETE FROM PRODUCT_TYPE WHERE PRODUCTTYPE_ID = :id',
      [req.params.id],
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) return res.status(404).json({ message: 'Product type not found' });
    res.json({ message: 'Product type deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
