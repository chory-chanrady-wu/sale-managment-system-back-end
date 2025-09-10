const express = require('express');
const oracledb = require('oracledb');
const multer = require('multer');
const router = express.Router();
const { getConnection } = require('../config/db');

// Multer setup for memory storage (store photo in buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: convert BLOB to base64
async function blobToBase64(blob) {
  if (!blob) return null;
  const chunks = [];
  for await (const chunk of blob) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('base64');
}

// GET all products with ProductTypeName lookup
router.get('/', async (req, res) => {
  try {
    const conn = await getConnection();
    const result = await conn.execute(
            `SELECT p.PRODUCT_NO,
            p.PRODUCTNAME,
            pt.PRODUCTTYPE_NAME AS PRODUCTTYPE,
            p.REORDER_LEVEL,
            p.COST_PRICE,
            p.SELL_PRICE,
            p.PROFIT_PERCENT,
            p.QTY_ON_HAND,
            p.PHOTO
        FROM ADMIN.PRODUCTS p
        LEFT JOIN ADMIN.PRODUCT_TYPE pt
        ON p.PRODUCTTYPE = pt.PRODUCTTYPE_ID 
        ORDER BY p.PRODUCT_NO DESC`,
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

// GET product by Product_no
router.get('/:id', async (req, res) => {
  try {
    const conn = await getConnection();
    const result = await conn.execute(
      `SELECT p.PRODUCT_NO,
       p.PRODUCTNAME,
       pt.PRODUCTTYPE_NAME AS PRODUCTTYPE,
       p.UNIT_MEASURE,
       p.REORDER_LEVEL,
       p.COST_PRICE,
       p.SELL_PRICE,
       p.PROFIT_PERCENT,
       p.QTY_ON_HAND,
       p.PHOTO,
       p.CREATED_AT
       FROM PRODUCTS p
       LEFT JOIN PRODUCT_TYPE pt
         ON p.PRODUCTTYPE = pt.PRODUCTTYPE_ID
       WHERE p.PRODUCT_NO = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const product = result.rows[0];
    if (product?.PHOTO) {
      product.PHOTO = await blobToBase64(product.PHOTO);
    }

    await conn.close();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE product
router.post('/', upload.single('PHOTO'), async (req, res) => {
  try {
    const { PRODUCTNAME, PRODUCTTYPE, UNIT_MEASURE, REORDER_LEVEL, COST_PRICE, SELL_PRICE, QTY_ON_HAND } = req.body;
    const PHOTO = req.file ? req.file.buffer : null;

    // calculate profit %
    const PROFIT_PERCENT =
      COST_PRICE && SELL_PRICE
        ? (((Number(SELL_PRICE) - Number(COST_PRICE)) / Number(COST_PRICE)) * 100).toFixed(2)
        : null;

    const conn = await getConnection();
    await conn.execute(
      `INSERT INTO PRODUCTS
       (PRODUCT_NO, PRODUCTNAME, PRODUCTTYPE, PROFIT_PERCENT, UNIT_MEASURE, 
        REORDER_LEVEL, COST_PRICE, SELL_PRICE, QTY_ON_HAND, PHOTO, CREATED_AT)
       VALUES (PRODUCT_SEQ.NEXTVAL, :PRODUCTNAME, :PRODUCTTYPE, :PROFIT_PERCENT, 
               :UNIT_MEASURE, :REORDER_LEVEL, :COST_PRICE, :SELL_PRICE, 
               :QTY_ON_HAND, :PHOTO, SYSTIMESTAMP)`,
      {
        PRODUCTNAME,
        PRODUCTTYPE,
        PROFIT_PERCENT,
        UNIT_MEASURE,
        REORDER_LEVEL,
        COST_PRICE,
        SELL_PRICE,
        QTY_ON_HAND,
        PHOTO: PHOTO ? { val: PHOTO, type: oracledb.BLOB } : null,
      },
      { autoCommit: true }
    );

    await conn.close();
    res.json({ message: 'Product added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE product
router.put('/:id', upload.single('PHOTO'), async (req, res) => {
  try {
    const { PRODUCTNAME, PRODUCTTYPE, UNIT_MEASURE, REORDER_LEVEL, COST_PRICE, SELL_PRICE, QTY_ON_HAND } = req.body;
    const PHOTO = req.file ? req.file.buffer : null;

    const PROFIT_PERCENT =
      COST_PRICE && SELL_PRICE
        ? (((Number(SELL_PRICE) - Number(COST_PRICE)) / Number(COST_PRICE)) * 100).toFixed(2)
        : null;

    const conn = await getConnection();
    await conn.execute(
      `UPDATE PRODUCTS
       SET PRODUCTNAME   = :PRODUCTNAME,
           PRODUCTTYPE   = :PRODUCTTYPE,
           PROFIT_PERCENT= :PROFIT_PERCENT,
           UNIT_MEASURE  = :UNIT_MEASURE,
           REORDER_LEVEL = :REORDER_LEVEL,
           COST_PRICE    = :COST_PRICE,
           SELL_PRICE    = :SELL_PRICE,
           QTY_ON_HAND   = :QTY_ON_HAND,
           PHOTO         = CASE WHEN :PHOTO IS NOT NULL THEN :PHOTO ELSE PHOTO END
       WHERE PRODUCT_NO  = :id`,
      {
        PRODUCTNAME,
        PRODUCTTYPE,
        PROFIT_PERCENT,
        UNIT_MEASURE,
        REORDER_LEVEL,
        COST_PRICE,
        SELL_PRICE,
        QTY_ON_HAND,
        PHOTO: PHOTO ? { val: PHOTO, type: oracledb.BLOB } : null,
        id: req.params.id,
      },
      { autoCommit: true }
    );

    await conn.close();
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const conn = await getConnection();
    await conn.execute(
      'DELETE FROM PRODUCTS WHERE PRODUCT_NO = :id',
      [req.params.id],
      { autoCommit: true }
    );
    await conn.close();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
