const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all invoices with their details
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const invoicesRes = await conn.execute(
      'SELECT * FROM INVOICES',
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const invoicesWithDetails = await Promise.all(
      invoicesRes.rows.map(async (inv) => {
        const detailsRes = await conn.execute(
          'SELECT * FROM INVOICE_DETAILS WHERE INVOICENO = :id',
          [inv.INVOICENO],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return { ...inv, details: detailsRes.rows };
      })
    );

    res.json(invoicesWithDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET invoice by ID with details
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const invoiceRes = await conn.execute(
      'SELECT * FROM INVOICES WHERE INVOICENO = :id',
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (invoiceRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

    const detailsRes = await conn.execute(
      'SELECT * FROM INVOICE_DETAILS WHERE INVOICENO = :id',
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ ...invoiceRes.rows[0], details: detailsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// CREATE invoice with details
router.post('/', async (req, res) => {
  const { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo, details } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `INSERT INTO INVOICES (INVOICE_DATE, CLIENT_NO, EMPLOYEEID, INVOICE_STATUS, INVOICEMEMO)
       VALUES (TO_DATE(:Invoice_date,'YYYY-MM-DD'), :Client_no, :EmployeeID, :Invoice_status, :InvoiceMemo)
       RETURNING INVOICENO INTO :id`,
      { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
      { autoCommit: true }
    );

    const invoiceNo = result.outBinds.id[0];

    if (details && details.length > 0) {
      const detailSql = `INSERT INTO INVOICE_DETAILS (INVOICENO, PRODUCT_NO, QTY, PRICE) VALUES (:InvoiceNo, :ProductNo, :Qty, :Price)`;
      for (const d of details) {
        await conn.execute(detailSql, { InvoiceNo: invoiceNo, ProductNo: d.PRODUCT_NO, Qty: d.QTY, Price: d.PRICE });
      }
      await conn.commit();
    }

    res.json({ message: 'Invoice added successfully', INVOICENO: invoiceNo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// UPDATE invoice and its details
router.put('/:id', async (req, res) => {
  const { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo, details } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE INVOICES
       SET INVOICE_DATE = TO_DATE(:Invoice_date,'YYYY-MM-DD'),
           CLIENT_NO = :Client_no,
           EMPLOYEEID = :EmployeeID,
           INVOICE_STATUS = :Invoice_status,
           INVOICEMEMO = :InvoiceMemo
       WHERE INVOICENO = :id`,
      { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo, id: req.params.id },
      { autoCommit: true }
    );

    // Delete old details
    await conn.execute('DELETE FROM INVOICE_DETAILS WHERE INVOICENO = :id', [req.params.id], { autoCommit: true });

    // Insert new details
    if (details && details.length > 0) {
      const detailSql = `INSERT INTO INVOICE_DETAILS (INVOICENO, PRODUCT_NO, QTY, PRICE) VALUES (:InvoiceNo, :ProductNo, :Qty, :Price)`;
      for (const d of details) {
        await conn.execute(detailSql, { InvoiceNo: req.params.id, ProductNo: d.PRODUCT_NO, Qty: d.QTY, Price: d.PRICE });
      }
      await conn.commit();
    }

    res.json({ message: 'Invoice updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE invoice (details cascade if FK)
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute('DELETE FROM INVOICES WHERE INVOICENO = :id', [req.params.id], { autoCommit: true });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
